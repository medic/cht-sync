import psycopg2
import os
import time
import json
import subprocess

from urllib.parse import urlparse

dbt_selector = os.getenv("DBT_SELECTOR")

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

def setup():
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
                  packages jsonb,
                  manifest jsonb,
                  dbt_selector text
              )
          """)
      conn.commit()

def get_package():
  package_json = '{}'

  if os.getenv("DBT_PACKAGE_TARBALL_URL"):
      print(os.getenv("DBT_PACKAGE_TARBALL_URL"))
      init_package = urlparse(os.getenv("DBT_PACKAGE_TARBALL_URL"))
      package_json = json.dumps({"packages": [{
            "tarball": init_package.geturl(),
            "name": "packages"
          }]})

  if os.getenv("CHT_PIPELINE_BRANCH_URL"):
      init_package = urlparse(os.getenv("CHT_PIPELINE_BRANCH_URL"))
      if init_package.scheme in ["http", "https"]:
          package_json = json.dumps({"packages": [{
              "git": init_package._replace(fragment='').geturl(),
              "revision": init_package.fragment
          }]})

  if os.getenv("DBT_LOCAL_PATH"):
      package_json = json.dumps({"packages": [{
          "local": '/dbt/package/'
      }]})

  with open("/dbt/packages.yml", "w") as f:
    f.write(package_json)

  return package_json


def get_manifest():
  # load old manifest from db
  with connection() as conn:
      with conn.cursor() as cur:
          cur.execute(f"""
              SELECT manifest
              FROM {os.getenv('POSTGRES_SCHEMA')}._dataemon
              WHERE dbt_selector = %s OR (dbt_selector IS NULL AND %s IS NULL)
              ORDER BY inserted_on DESC
          """, (dbt_selector,dbt_selector))
          manifest = cur.fetchone()

          # save to file if found
          if manifest and len(manifest) > 0:
            with open("/dbt/old_manifest/manifest.json", "w") as f:
                f.write(json.dumps(manifest[0]));

          # run dbt ls to make sure current manifest is generated
          args = ["dbt", "ls",  "--profiles-dir", ".dbt"]
          if dbt_selector:
            args.append('--select')
            args.append(dbt_selector)
          subprocess.run(args)

          new_manifest = '{}'
          with open("/dbt/target/manifest.json", "r") as f:
            new_manifest = f.read()

          return new_manifest;

def save_package_manifest(package_json, manifest_json):
  with connection() as conn:
    with conn.cursor() as cur:
      # because manifest is large, delete old entries
      # we only want the current/latest data
      cur.execute(f"""
          DELETE FROM {os.getenv('POSTGRES_SCHEMA')}._dataemon
          WHERE dbt_selector = %s OR (dbt_selector IS NULL AND %s IS NULL)
      """, (dbt_selector,dbt_selector))
      cur.execute(f"""
          INSERT INTO {os.getenv('POSTGRES_SCHEMA')}._dataemon
          (packages, manifest, dbt_selector) VALUES (%s, %s, %s);
      """, (package_json, manifest_json, dbt_selector))
      conn.commit()


def update_models():
  # install the cht pipeline package
  package_json = get_package()
  subprocess.run(["dbt", "deps", "--profiles-dir", ".dbt", "--upgrade"])

  # check for new changes using the manifest
  manifest_json = get_manifest()

  # save the new manifest and package for the next run
  save_package_manifest(package_json, manifest_json)

  args = ["dbt", "run",
    "--profiles-dir",
     ".dbt",
      "--full-refresh",
      "--state",
      "./old_manifest",
      "--select"]

  if dbt_selector:
    args.append(f"{dbt_selector},state:modified")
  else:
    args.append("state:modified")

  # anything that changed, run a full refresh
  subprocess.run(args)

def run_incremental_models():
  # update incremental models (and tables if there are any)
  args = ["dbt", "run", 
    "--profiles-dir",
    ".dbt",
    "--exclude", "config.materialized:view"]

  if dbt_selector:
    args.append('--select')
    args.append(dbt_selector)

  batch_size = int(os.getenv("DBT_BATCH_SIZE") or 0)
  if batch_size:
      args.append("--vars")
      args.append(f'{{batch_size: {batch_size}}}')

  subprocess.run(args)


if __name__ == "__main__":
  setup()
  while True:
    update_models()
    run_incremental_models()
    time.sleep(int(os.getenv("DATAEMON_INTERVAL") or 5))
