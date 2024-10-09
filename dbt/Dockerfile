FROM python:3 AS testing

RUN pip install flake8

RUN flake8 dbt_run.py

FROM python:3 AS release

RUN pip install --upgrade cffi \
    && pip install cryptography~=3.4 \
    && pip install dbt-core dbt-postgres

RUN adduser dbt
USER dbt

WORKDIR /dbt/
COPY dbt_run.py dbt_run.py
COPY .dbt .dbt
COPY dbt_project.yml dbt_project.yml

RUN mkdir old_manifest

CMD ["python3", "/dbt/dbt_run.py"]
