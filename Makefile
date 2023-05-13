down: clean
	docker-compose -f docker-compose.couchdb.yml -f docker-compose.postgres.yml -f docker-compose.yml \
		down -v --remove-orphans

build:
	docker-compose build && tar -xzvf ./data/json_docs.tar.gz -C ./data

clean:
	rm -rf ./data/json_docs
	
local: down build
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
