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
            CREATE SCHEMA IF NOT EXISTS 
            {os.getenv('POSTGRES_SCHEMA')}
        """)
    conn.commit()

with connection() as conn:
    with conn.cursor() as cur:
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS
            {os.getenv('POSTGRES_SCHEMA')}._dataemon (
                inserted_on TIMESTAMP DEFAULT NOW(),
                packages jsonb
            )
        """)
    conn.commit()

init_package = urlparse(os.getenv("CHT_PIPELINE_BRANCH_URL"))
if init_package.scheme in ["http", "https"]:
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"INSERT INTO {os.getenv('POSTGRES_SCHEMA')}._dataemon "
                "(packages) VALUES (%s)",
                [json.dumps({
                    "packages": [
                        {
                            "git": init_package._replace(fragment='').geturl(),
                            "revision": init_package.fragment
                        }
                    ]
                })]
            )
            conn.commit()


while True:
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(f"""
                SELECT packages
                FROM {os.getenv('POSTGRES_SCHEMA')}._dataemon
                ORDER BY inserted_on DESC
            """)

            with open("/dbt/packages.yml", "w") as f:
                f.write(json.dumps(cur.fetchone()[0]))

    subprocess.run(["dbt", "deps", "--profiles-dir", ".dbt", "--force"])
    subprocess.run(["dbt", "run",  "--profiles-dir", ".dbt"])
    time.sleep(int(os.getenv("DATAEMON_INTERVAL") or 5))
