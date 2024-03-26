FROM python:3 AS testing

RUN pip install flake8
COPY . .

RUN flake8 dbt-run.py

FROM ubuntu AS release

RUN apt-get update \
    && apt-get install -y git libpq-dev python3-dev python3-pip postgresql-client \
    && apt-get remove -y python3-cffi \
    && pip install --upgrade cffi \
    && pip install cryptography~=3.4 \
    && pip install dbt-core dbt-postgres

WORKDIR /dbt/
COPY dbt-run.py dbt-run.py
COPY .dbt .dbt
COPY dbt_project.yml dbt_project.yml

CMD ["python3", "/dbt/dbt-run.py"]
