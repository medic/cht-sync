down: clean
	docker-compose -f docker-compose.couchdb.yml -f docker-compose.postgres.yml -f docker-compose.yml \
		down --remove-orphans

build:
	docker-compose build

clean:
	rm -rf ./data/json_docs

extract:
	tar -xzvf ./data/json_docs.tar.gz -C ./data

local: down build extract
	docker-compose -f docker-compose.couchdb.yml -f docker-compose.postgres.yml -f docker-compose.yml \
		up

gamma: down build
	COUCHDB_HOST=adp-sandbox.dev.medicmobile.org \
		COUCHDB_DB=medic \
		COUCHDB_USER=medic \
		COUCHDB_PASSWORD=$(shell pass medic/adp-sandbox.dev.medicmobile.org/medic) \
		docker-compose up \
			logstash \
			postgres \
			postgrest \
			postgrest-cluster \
			dbt
