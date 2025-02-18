#!/bin/bash

# Source the migration template
SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
source "$SCRIPT_DIR/lib/migration.sh"

# SQL statements to execute
SQL_STATEMENTS=(
    "ALTER TABLE _dataemon ADD COLUMN IF NOT EXISTS manifest jsonb;"
    "ALTER TABLE couchdb ADD COLUMN IF NOT EXISTS source varchar;"
    "CREATE INDEX IF NOT EXISTS source ON couchdb(source);"
)

# Execute each SQL statement
for sql in "${SQL_STATEMENTS[@]}"; do
    execute_sql "$sql"
done
