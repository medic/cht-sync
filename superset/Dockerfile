FROM apache/superset:2.0.0
# Switching to root to install the required packages
USER root

ARG SUPERSET_PASSWORD
ENV SUPERSET_PASSWORD $SUPERSET_PASSWORD
ARG SUPERSET_ADMIN_EMAIL
ENV SUPERSET_ADMIN_EMAIL $SUPERSET_ADMIN_EMAIL

RUN pip install psycopg2-binary

RUN superset superset fab create-admin \
               --username admin \
               --firstname Superset \
               --lastname Admin \
               --email SUPERSET_ADMIN_EMAIL \
               --password SUPERSET_PASSWORD

RUN superset superset db upgrade
RUN superset superset init
# Switching back to using the `superset` user
USER superset
