{{
  config(
    materialized = 'incremental',
    unique_key='_id',
    indexes=[
      {'columns': ['_id'], 'type': 'hash'},
      {'columns': ['"@timestamp"']},
    ]
  )
}}

SELECT
  contact._id,
  contact._deleted,
  contact."@timestamp",
  couchdb.doc->>'date_of_birth' as date_of_birth,
  couchdb.doc->>'sex' as sex
FROM {{ ref("contacts") }} contact
INNER JOIN {{ env_var('ROOT_POSTGRES_SCHEMA') }}.{{ env_var('POSTGRES_TABLE') }} couchdb ON couchdb._id = contact._id
WHERE
  contact.contact_type = 'person'
{% if is_incremental() %}
  and couchdb."@timestamp" >= (select coalesce(max("@timestamp"), '1900-01-01') from {{ this }})
{% endif %}
