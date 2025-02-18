#!/bin/bash

# Check for required arguments
if [ "$#" -lt 3 ] || { [ "$1" == "kubectl" ] && [ "$#" -ne 4 ]; }; then
    echo "Usage: $0 <kubectl|docker> <username> <dbname> [namespace]"
    exit 1
fi

# Assign arguments to variables
ENVIRONMENT=$1
USERNAME=$2
DBNAME=$3

# Function to execute SQL statement
execute_sql() {
    local sql_statement=$1
    
    if [ "$ENVIRONMENT" == "docker" ]; then
        # Find the container ID or name automatically
        CONTAINER_ID=$(docker ps --filter "name=postgres" --format "{{.ID}}" | head -n 1)

        if [ -z "$CONTAINER_ID" ]; then
            echo "No running Postgres container found."
            exit 1
        fi

        # Run the SQL statement using docker exec
        docker exec "$CONTAINER_ID" psql -U "$USERNAME" "$DBNAME" -c "$sql_statement"

    elif [ "$ENVIRONMENT" == "kubectl" ]; then
        # Assign namespace argument
        NAMESPACE=$4

        # Find the Postgres pod automatically
        POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l app.name=postgres -o jsonpath="{.items[0].metadata.name}")

        if [ -z "$POD_NAME" ]; then
            # Try alternative label
            POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l inner.service=postgres -o jsonpath="{.items[0].metadata.name}")
            if [ -z "$POD_NAME" ]; then
                echo "No running Postgres pod found in namespace $NAMESPACE."
                exit 1
            fi
        fi

        # Run the SQL statement using kubectl exec
        kubectl -n "$NAMESPACE" exec "$POD_NAME" -- psql -U "$USERNAME" "$DBNAME" -c "$sql_statement"

    else
        echo "Invalid environment specified. Use 'kubectl' or 'docker'."
        exit 1
    fi
}
