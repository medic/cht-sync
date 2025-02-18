#!/bin/bash

# Source the migration template
SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
source "SCRIPT_DIR/lib/migration.sh"

ALTER_STATEMENT='ALTER TABLE v1.couchdb_progress ADD pending integer, ADD updated_at timestamptz';
execute_sql "$ALTER_STATEMENT"
