SELECT couchdb.doc
FROM {{ ref("couchdb") }}
WHERE (couchdb.doc ->> 'type'::text) = ANY
      (ARRAY ['task'::text, 'form'::text])

{% if is_incremental() %}
    AND COALESCE("@timestamp" > (SELECT MAX("@timestamp") FROM {{ this }}), True)
{% endif %}
