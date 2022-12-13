FROM apache/superset:2.0.0
# Switching to root to install the required packages
USER root

RUN pip install psycopg2

RUN pip install psycopg2-binary

RUN superset superset fab create-admin \
               --username admin \
               --firstname Superset \
               --lastname Admin \
               --email admin@superset.com \
               --password admin

RUN superset superset db upgrade
RUN superset superset init
# Switching back to using the `superset` user
USER superset
