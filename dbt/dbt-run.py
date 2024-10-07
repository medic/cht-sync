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
                  packages jsonb, manifest jsonb
              )
          """)
      conn.commit()

  with connection() as conn:
      with conn.cursor() as cur:
          cur.execute(f"""
              CREATE TABLE IF NOT EXISTS
              {os.getenv('POSTGRES_SCHEMA')}.dbt_batch_status (
                  id SERIAL PRIMARY KEY,
                  timestamp TIMESTAMP,
                  status TEXT
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

          return new_manifest;

def save_package_manifest(package_json, manifest_json):
  with connection() as conn:
    with conn.cursor() as cur:
      # because manifest is large, delete old entries
      # we only want the current/latest data
      cur.execute(
        f"DELETE FROM {os.getenv('POSTGRES_SCHEMA')}._dataemon "
      )
      cur.execute(
        f"INSERT INTO {os.getenv('POSTGRES_SCHEMA')}._dataemon "
        "(packages, manifest) VALUES (%s, %s);",
        [package_json, manifest_json]
      )
      conn.commit()

def update_dbt_deps():
  # install the cht pipeline package
  package_json = get_package()
  subprocess.run(["dbt", "deps", "--profiles-dir", ".dbt", "--upgrade"])

  # check for new changes using the manifest
  manifest_json = get_manifest()

  # save the new manifest and package for the next run
  save_package_manifest(package_json, manifest_json)

def update_models():
  update_dbt_deps()
  # anything that changed, run a full refresh
  subprocess.run(["dbt", "run",
    "--profiles-dir",
     ".dbt",
     "--select",
     "state:modified",
      "--full-refresh",
      "--state",
      "./old_manifest"])

def run_incremental_models():
  # update incremental models (and tables if there are any)
  subprocess.run(["dbt", "run",  "--profiles-dir", ".dbt", "--exclude", "config.materialized:view"])

def get_pending_doc_count():
  with connection() as conn:
      with conn.cursor() as cur:
          cur.execute(f"""
              SELECT SUM(pending)
              FROM {os.getenv('POSTGRES_SCHEMA')}.couchdb_progress
          """)
          return cur.fetchone()[0]

def update_batch_status(timestamp, status):
  with connection() as conn:
    with conn.cursor() as cur:
      # insert new entry
      cur.execute(
        f"INSERT INTO {os.getenv('POSTGRES_SCHEMA')}.dbt_batch_status (timestamp, status) VALUES (%s, %s);", [timestamp, status]
      )
      conn.commit()

def get_last_processed_timestamp():
  with connection() as conn:
    with conn.cursor() as cur:
      cur.execute(f"""
          SELECT MAX(timestamp)
          FROM {os.getenv('POSTGRES_SCHEMA')}.dbt_batch_status
          WHERE status = 'success'
      """)
      result = cur.fetchone()
      if result and result[0]:
        return result[0]
      return '1970-01-01 00:00:00'
    
def get_max_timestamp():
  with connection() as conn:
    with conn.cursor() as cur:
      cur.execute(f"""
          SELECT MAX(saved_timestamp)
          FROM {os.getenv('POSTGRES_SCHEMA')}.document_metadata
      """)
      return cur.fetchone()[0]
    
def handle_batch_update_error(last_processed_timestamp, dataemon_interval):
   print(f"Error running dbt for batch {last_processed_timestamp}")
   update_batch_status(last_processed_timestamp, "error")
   time.sleep(dataemon_interval)

def handle_batch_update_success(last_processed_timestamp, dataemon_interval, max_timestamp):
  update_batch_status(last_processed_timestamp, "success")

  if max_timestamp == last_processed_timestamp:
     time.sleep(dataemon_interval)
   
def run_dbt_in_batches():
  last_processed_timestamp = get_last_processed_timestamp()
  batch_size = int(os.getenv("DBT_BATCH_SIZE") or 10000)
  dataemon_interval = int(os.getenv("DATAEMON_INTERVAL") or 5)

  while True:
     update_dbt_deps()
     result = subprocess.run([
        "dbt", "run",
        "--profiles-dir", ".dbt",
        "--vars", f'{{start_timestamp: "{last_processed_timestamp}", batch_size: {batch_size}}}',
        "--exclude", "config.materialized:view"
      ])
     
     if result.returncode != 0:
        handle_batch_update_error(last_processed_timestamp, dataemon_interval)
        continue
     
     max_timestamp = get_max_timestamp()
     handle_batch_update_success(last_processed_timestamp, dataemon_interval, max_timestamp)
     
     last_processed_timestamp = max_timestamp

def run_dbt():
  while True:
      update_models()
      run_incremental_models()
      time.sleep(int(os.getenv("DATAEMON_INTERVAL") or 5))

if __name__ == "__main__":
  print("Starting dbt run")
  setup()
  if os.getenv("RUN_DBT_IN_BATCHES"):
    run_dbt_in_batches()
  else:
    run_dbt()
