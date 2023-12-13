#!/usr/bin/env bash

set -eo pipefail

REQUIREMENTS_LOCAL="/app/docker/requirements-local.txt"
# If Cypress run – overwrite the password for admin and export env variables
if [ "$CYPRESS_CONFIG" == "true" ]; then
    export SUPERSET_CONFIG=tests.integration_tests.superset_test_config
    export SUPERSET_TESTENV=true
    export SUPERSET__SQLALCHEMY_DATABASE_URI=postgresql+psycopg2://superset:superset@db:5432/superset
fi
#
# Make sure we have dev requirements installed
#
if [ -f "${REQUIREMENTS_LOCAL}" ]; then
  echo "Installing local overrides at ${REQUIREMENTS_LOCAL}"
  pip install --no-cache-dir -r "${REQUIREMENTS_LOCAL}"
else
  echo "Skipping local overrides"
fi

#
# playwright is an optional package - run only if it is installed
#
if command -v playwright > /dev/null 2>&1; then
  playwright install-deps
  playwright install chromium
fi

case "${1}" in
  worker)
    echo "Starting Celery worker..."
    celery --app=superset.tasks.celery_app:app worker -O fair -l INFO
    ;;
  beat)
    echo "Starting Celery beat..."
    rm -f /tmp/celerybeat.pid
    celery --app=superset.tasks.celery_app:app beat --pidfile /tmp/celerybeat.pid -l INFO -s "${SUPERSET_HOME}"/celerybeat-schedule
    ;;
  app)
    echo "Starting web app (using development server)..."
    flask run -p 8088 --with-threads --reload --debugger --host=0.0.0.0
    ;;
  app-gunicorn)
    echo "Starting web app..."
    /usr/bin/run-server.sh
    ;;
  *)
    echo "Unknown Operation!!!"
    ;;
esac
