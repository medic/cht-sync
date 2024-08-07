#!/bin/bash

# Check for required arguments
if [ "$#" -lt 3 ] || { [ "$1" == "kubectl" ] && [ "$#" -ne 4 ]; }; then
	echo "Usage: $0 <kubectl|docker> <username> <dbname>  [namespace]"
	exit 1
fi

# Assign arguments to variables
ENVIRONMENT=$1
USERNAME=$2
DBNAME=$3
ALTER_STATEMENT='ALTER TABLE v1.couchdb_progress ADD pending integer, ADD updated_at timestamptz';

if [ "$ENVIRONMENT" == "docker" ]; then
	# Find the container ID or name automatically
	CONTAINER_ID=$(docker ps --filter "name=postgres" --format "{{.ID}}" | head -n 1)

	if [ -z "$CONTAINER_ID" ]; then
		echo "No running Postgres container found."
		exit 1
	fi

	# Run the ALTER TABLE statement using docker exec
	docker exec "$CONTAINER_ID" psql -U "$USERNAME" "$DBNAME" -c "$ALTER_STATEMENT"

elif [ "$ENVIRONMENT" == "kubectl" ]; then
	# Assign namespace argument
	NAMESPACE=$4

	# Find the Postgres pod automatically
	POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l app.name=postgres -o jsonpath="{.items[0].metadata.name}")

	if [ -z "$POD_NAME" ]; then
    # Find the Postgres pod automatically
    POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l inner.service=postgres -o jsonpath="{.items[0].metadata.name}")
    if [ -z "$POD_NAME" ]; then
      echo "No running Postgres pod found in namespace $NAMESPACE."
      exit 1
    fi
	fi

	# echo $POD_NAME
	# Run the ALTER TABLE statement using kubectl exec
	kubectl -n "$NAMESPACE" exec "$POD_NAME" -- psql -U "$USERNAME" "$DBNAME" -c "$ALTER_STATEMENT"

else
	echo "Invalid environment specified. Use 'kubectl' or 'docker'."
	exit 1
fi

