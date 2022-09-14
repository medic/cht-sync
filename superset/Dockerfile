FROM apache/superset
# Switching to root to install the required packages
USER root

RUN pip install psycopg2

RUN pip install psycopg2-binary
# Switching back to using the `superset` user
USER superset
