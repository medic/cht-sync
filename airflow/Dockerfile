FROM apache/airflow:2.10.5

USER root
RUN apt update && apt install git -y
USER airflow

RUN pip install --upgrade cffi \
    && pip install cryptography~=3.4 \
    && pip install dbt-core dbt-postgres

WORKDIR /dbt/
COPY ./dbt/.dbt .dbt
COPY ./dbt/dbt_project.yml dbt_project.yml

RUN mkdir old_manifest

USER root
RUN chown -R airflow:50000 /dbt/
RUN chmod -R o+w /dbt/
USER airflow
