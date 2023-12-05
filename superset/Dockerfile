FROM apache/superset:2.1.2

USER root

RUN pip install mysqlclient

COPY ./superset-init.sh /superset-init.sh

COPY superset_config.py /app/
ENV SUPERSET_CONFIG_PATH /app/superset_config.py

RUN ["chmod", "+x", "/superset-init.sh"]

USER superset
ENTRYPOINT [ "/superset-init.sh" ]
