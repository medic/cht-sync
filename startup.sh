#!/bin/bash

# which dockerfiles are used will depend on the environment
if [ "$2" == "local" ]; then
  DOCKERFILES="-f docker-compose.couchdb.yml -f docker-compose.postgres.yml -f docker-compose.yml"
elif [ "$2" == "prod" ]; then
  DOCKERFILES="-f docker-compose.yml"
else
  echo "Invalid environment $2. Please choose 'prod' or 'local'"
fi

echo docker compose -p cht-sync $DOCKERFILES -d --build
if [ "$1" == "up" ]; then
  docker compose -p cht-sync $DOCKERFILES up -d
elif [ "$1" == "up-dev" ]; then
  docker compose -p cht-sync $DOCKERFILES up -d --build
elif [ "$1" == "down" ]; then
  docker compose -p cht-sync $DOCKERFILES stop
elif [ "$1" == "destroy" ]; then
  docker compose -p cht-sync $DOCKERFILES down -v
else
  echo "Invalid option $1

  Help:

  up        starts the docker containers
  up-dev    starts the docker containers with updated files.
  down      stops the docker containers
  destroy   shutdown the docker containers and deletes volumes
  "
fi
