#!bin/bash

curl -X PUT http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@couchdb:5984/_users

for DB in $COUCHDB_DBS; do
  curl -X PUT http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@couchdb:5984/${DB}
done
