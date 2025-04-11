from airflow import DAG
from airflow.providers.postgres.hooks.postgres import PostgresHook
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta
import os

def setup():
    # Use Airflow's PostgresHook to get the connection
    hook = PostgresHook(postgres_conn_id="dbt_conn")
    conn = hook.get_conn()
    
    schema = os.getenv('POSTGRES_SCHEMA', 'public')  # Default to 'public' if not set
    
    with conn:
        with conn.cursor() as cur:
            cur.execute(f"CREATE SCHEMA IF NOT EXISTS {schema};")
            cur.execute(f"""
                CREATE TABLE IF NOT EXISTS {schema}._dataemon (
                    inserted_on TIMESTAMP DEFAULT NOW(),
                    packages jsonb, manifest jsonb
                )
            """)
        conn.commit()

# Define the Airflow DAG
default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "start_date": datetime(2024, 2, 12),
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}

with DAG(
    "setup_postgres_schema",
    default_args=default_args,
    schedule_interval=None,  # Run manually or trigger via Airflow UI/API
    catchup=False,
) as dag:

    setup_task = PythonOperator(
        task_id="setup_database",
        python_callable=setup
    )

    setup_task  # Task execution order (only one task in this case)


