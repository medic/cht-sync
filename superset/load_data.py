import psycopg2
import os

DB_USER = os.environ.get("DATABASE_USER", "superset")
DB_PASSWORD = os.environ.get("DATABASE_PASSWORD", "superset")
DB_HOST = os.environ.get("DATABASE_HOST", "db")
DB_NAME = os.environ.get("DATABASE_DB","superset")
DB_PORT = os.environ.get("DATABASE_PORT","5432")

with open('/app/docker/data.sql', 'r') as sql_file:
    sql_as_string = sql_file.read()

    try:
        conn = psycopg2.connect(user=DB_USER,
                                password=DB_PASSWORD,
                                host=DB_HOST,
                                database=DB_NAME,
                                port=DB_PORT)        
        conn.autocommit = True
    except:
        print("Cannot connect to db")

    cursor = conn.cursor()
    cursor.execute(sql_as_string)

