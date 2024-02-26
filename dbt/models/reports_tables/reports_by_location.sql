{{
    config(
        materialized = 'table',
    )
}}

SELECT
    couchdb.doc ->> '_id'::text AS uuid,
    couchdb.doc ->> 'form'::text AS form,
    CAST (coalesce(couchdb.doc #>> '{geolocation,longitude}', '36.826275') AS NUMERIC) AS longitude,
    CAST (coalesce(couchdb.doc #>> '{geolocation,latitude}', '-1.1792353') AS NUMERIC) AS latitude,
    couchdb.doc ->> 'reported_date'::text AS reported_date,
    couchdb.doc #>> '{contact,_id}'::text[] AS contact_uuid
FROM {{ ref("couchdb") }}
WHERE (couchdb.doc ->> 'type'::text) = 'data_record'
