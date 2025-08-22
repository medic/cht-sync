from airflow import DAG
from airflow.providers.postgres.hooks.postgres import PostgresHook
from airflow.operators.python import PythonOperator, BranchPythonOperator
from airflow.operators.bash import BashOperator
from airflow.operators.dummy import DummyOperator
from airflow.utils.trigger_rule import TriggerRule
from datetime import datetime, timedelta
import os
import json
from urllib.parse import urlparse

def get_package():
    """Fetch package information and save it to a file."""
    package_json = '{}'

    if os.getenv("CHT_PIPELINE_BRANCH_URL"):
        init_package = urlparse(os.getenv("CHT_PIPELINE_BRANCH_URL"))
        if init_package.scheme in ["http", "https"]:
            package_json = json.dumps({
                "packages": [{
                    "git": init_package._replace(fragment='').geturl(),
                    "revision": init_package.fragment
                }]
            })

    with open("/dbt/packages.yml", "w") as f:
        f.write(package_json)

    return package_json

def branch_on_manifest():
    """Branch based on whether an old manifest exists."""
    hook = PostgresHook(postgres_conn_id="dbt_conn")
    conn = hook.get_conn()
    schema = os.getenv('POSTGRES_SCHEMA', 'public')

    with conn.cursor() as cur:
        cur.execute(f"SELECT manifest FROM {schema}._dataemon ORDER BY inserted_on DESC LIMIT 1")
        manifest = cur.fetchone()

        if manifest and manifest[0]:
            with open("/dbt/old_manifest/manifest.json", "w") as f:
                f.write(json.dumps(manifest[0]))
            return "auto_update_models"
        
        return "dbt_ls"

def get_new_manifest():
    with open("/dbt/target/manifest.json", "r") as f:
        new_manifest = f.read()
    return new_manifest

def save_package_manifest(ti):
    """Save the package JSON and new manifest into the database."""
    package_json = ti.xcom_pull(task_ids="get_package")
    manifest_json = ti.xcom_pull(task_ids="get_new_manifest")

    hook = PostgresHook(postgres_conn_id="dbt_conn")
    conn = hook.get_conn()
    schema = os.getenv('POSTGRES_SCHEMA', 'public')

    with conn.cursor() as cur:
        # Clear old data
        cur.execute(f"DELETE FROM {schema}._dataemon")

        # Insert new package & manifest
        cur.execute(
            f"INSERT INTO {schema}._dataemon (packages, manifest) VALUES (%s, %s)",
            (package_json, manifest_json)
        )
        conn.commit()

# Define DAG
default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "start_date": datetime(2024, 2, 12),
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}

with DAG(
    "dbt_setup_and_manifest",
    default_args=default_args,
    schedule_interval=None,  # Run manually or trigger via Airflow UI/API
    catchup=False,
) as dag:

    get_package_task = PythonOperator(
        task_id="get_package",
        python_callable=get_package
    )

    dbt_deps = BashOperator(
        task_id='dbt_deps',
        bash_command='cd /dbt && dbt deps',
    )

    check_manifest_task = BranchPythonOperator(
        task_id="check_manifest",
        python_callable=branch_on_manifest
    )

    auto_update_models = BashOperator(
        task_id='auto_update_models',
        bash_command='cd /dbt && dbt run --profiles-dir .dbt --select state:modified --full-refresh --state ./old_manifest'
    )

    dbt_ls = BashOperator(
        task_id='dbt_ls',
        bash_command='cd /dbt && dbt ls --profiles-dir .dbt',
		trigger_rule=TriggerRule.ONE_SUCCESS  # Ensures it runs if one branch succeeds
    )

    get_new_manifest_task = PythonOperator(
        task_id="get_new_manifest",
        python_callable=get_new_manifest
    )

    save_task = PythonOperator(
        task_id="save_package_manifest",
        python_callable=save_package_manifest
    )

    # DAG Dependencies
    get_package_task >> dbt_deps
    dbt_deps >> check_manifest_task

    # **Both branches must continue**
    check_manifest_task >> auto_update_models
    check_manifest_task >> dbt_ls

    # **Merge branches before continuing**
    auto_update_models >> dbt_ls

    # **Ensure all tasks after merge run**
    dbt_ls >> get_new_manifest_task >> save_task

