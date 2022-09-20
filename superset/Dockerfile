FROM apache/superset:2.0.0
# Switching to root to install the required packages
USER root

RUN pip install psycopg2

RUN pip install psycopg2-binary
# Switching back to using the `superset` user
USER superset
