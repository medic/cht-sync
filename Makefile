down: clean
	docker-compose -f docker-compose.couchdb.yml -f docker-compose.postgres.yml -f docker-compose.yml \
		down -v --remove-orphans

extract-test-data:
	tar -xzvf ./data/json_docs.tar.gz -C ./data

build:
	docker-compose build 

clean:
	rm -rf ./data/json_docs

local: down extract-test-data build
	docker-compose -f docker-compose.couchdb.yml -f docker-compose.postgres.yml -f docker-compose.yml \
		up

prod: down build
	docker-compose -f docker-compose.couchdb.yml -f docker-compose.postgrest.yml -f docker-compose.yml \
		up logstash postgrest dbt

gamma: down build
	COUCHDB_HOST=adp-sandbox.dev.medicmobile.org COUCHDB_DB=medic COUCHDB_USER=medic \
	docker-compose -f docker-compose.couchdb.yml -f docker-compose.postgres.yml -f docker-compose.yml \
		up logstash postgres postgrest dbt
