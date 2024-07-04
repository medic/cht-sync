{{
  config(
    materialized = 'incremental',
    unique_key='uuid',
    on_schema_change='append_new_columns',
    indexes=[
      {'columns': ['uuid'], 'type': 'hash'},
      {'columns': ['saved_timestamp']},
    ]
  )
}}

SELECT
  contact.uuid,
  contact.saved_timestamp,
  couchdb.doc->>'date_of_birth' as date_of_birth,
  couchdb.doc->>'sex' as sex
FROM {{ ref("contacts") }} contact
INNER JOIN {{ env_var('ROOT_POSTGRES_SCHEMA') }}.{{ env_var('POSTGRES_TABLE') }} couchdb ON couchdb._id = contact.uuid
WHERE
  contact.contact_type = 'person'
{% if is_incremental() %}
  and couchdb.saved_timestamp >= (select coalesce(max(saved_timestamp), '1900-01-01') from {{ this }})
{% endif %}
