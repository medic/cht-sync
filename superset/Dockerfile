FROM apache/superset:2.0.0

USER root

ARG SUPERSET_PASSWORD=admin
ARG SUPERSET_ADMIN_EMAIL=admin@superset.com

RUN pip install psycopg2-binary

USER superset

RUN superset superset fab create-admin \
              --username admin \
              --firstname Superset \
              --lastname Admin \
              --email $SUPERSET_ADMIN_EMAIL \
              --password $SUPERSET_PASSWORD

RUN superset superset db upgrade
RUN superset superset init
