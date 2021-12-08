down:
	docker-compose -f docker-compose.couchdb.yml -f docker-compose.yml \
		down --remove-orphans

local: down
	docker-compose -f docker-compose.couchdb.yml -f docker-compose.yml \
		up

gamma: down
	COUCHDB_HOST=adp-sandbox.dev.medicmobile.org \
		COUCHDB_DB=medic \
		COUCHDB_USER=medic \
		COUCHDB_PASSWORD=$(shell pass medic/adp-sandbox.dev.medicmobile.org/medic) \
		docker-compose up \
			elasticsearch \
			logstash \
			postgres \
			postgrest \
			postgrest-cluster \
			dbt
