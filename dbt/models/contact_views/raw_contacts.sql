SELECT couchdb.doc
FROM {{ ref("couchdb") }}
WHERE (couchdb.doc ->> 'type'::text) = ANY
      (ARRAY ['contact'::text, 'clinic'::text, 'district_hospital'::text, 'health_center'::text, 'person'::text])
