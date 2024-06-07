import psycopg2
import os
import time
import json
import subprocess

from urllib.parse import urlparse


def connection():
    for attempt in range(5):
        time.sleep(3)
        try:
            return psycopg2.connect(
                f"dbname={os.getenv('POSTGRES_DB')} "
                f"user={os.getenv('POSTGRES_USER')} "
                f"password={os.getenv('POSTGRES_PASSWORD')} "
                f"host={os.getenv('POSTGRES_HOST') or 'postgres'} "
                f"port={os.getenv('POSTGRES_PORT') or '5432'} "
            )
        except psycopg2.OperationalError as e:
            print(f"Unable to connect! (Attempt {attempt})", e)
    raise psycopg2.OperationalError("Could not connect to postgres")


# Create schema
with connection() as conn:
    with conn.cursor() as cur:
        cur.execute(f"""
            CREATE SCHEMA IF NOT EXISTS {os.getenv('POSTGRES_SCHEMA')};
        """)
    conn.commit()

with connection() as conn:
    with conn.cursor() as cur:
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS
            {os.getenv('POSTGRES_SCHEMA')}._dataemon (
                inserted_on TIMESTAMP DEFAULT NOW(),
                packages jsonb, manifest jsonb
            )
        """)
    conn.commit()

package_json = '{}'

init_package = urlparse(os.getenv("CHT_PIPELINE_BRANCH_URL"))
if init_package.scheme in ["http", "https"]:
    package_json = json.dumps({"packages": [{
      "git": init_package._replace(fragment='').geturl(),
      "revision": init_package.fragment
    }]})

    with open("/dbt/packages.yml", "w") as f:
        f.write(package_json)

subprocess.run(["dbt", "deps", "--profiles-dir", ".dbt"])

# load old manifest from db
with connection() as conn:
    with conn.cursor() as cur:
        cur.execute(f"""
            SELECT manifest
            FROM {os.getenv('POSTGRES_SCHEMA')}._dataemon
            ORDER BY inserted_on DESC
        """)
        manifest = cur.fetchone()

        # save to file if found
        if manifest and len(manifest) > 0:
          with open("/dbt/old_manifest/manifest.json", "w") as f:
              f.write(json.dumps(manifest[0]));

        # run dbt ls to make sure current manifest is generated
        subprocess.run(["dbt", "ls",  "--profiles-dir", ".dbt"])

        new_manifest = '{}'
        with open("/dbt/target/manifest.json", "r") as f:
          new_manifest = f.read()

        cur.execute(
            f"INSERT INTO {os.getenv('POSTGRES_SCHEMA')}._dataemon "
            "(packages, manifest) VALUES (%s, %s);",
            [package_json, new_manifest]
        )
        conn.commit()

# anything that changed, run a full refresh
subprocess.run(["dbt", "run",
  "--profiles-dir",
   ".dbt",
   "--select",
   "state:modified",
    "--full-refresh",
    "--state",
    "./old_manifest"])

# run views (which may not have changed but need to be created)
subprocess.run(["dbt", "run",  "--profiles-dir", ".dbt", "--select", "config.materialized:view"])

while True:
    subprocess.run(["dbt", "run",  "--profiles-dir", ".dbt", "--exclude", "config.materialized:view"])
    time.sleep(int(os.getenv("DATAEMON_INTERVAL") or 5))
