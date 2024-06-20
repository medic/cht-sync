{{
  config(
    materialized = 'incremental',
    unique_key='_id',
    post_hook='delete from {{this}} where _deleted=true',
    indexes=[
      {'columns': ['"_id"'], 'type': 'hash'},
      {'columns': ['"@timestamp"']},
      {'columns': ['contact_type']},
    ]
  )
}}

SELECT
  _id,
  "@timestamp",
  doc,
  _deleted,
  doc->'parent'->>'_id' AS parent_uuid,
  doc->>'name' AS name,
  COALESCE(doc->>'contact_type', doc->>'type') as contact_type,
  doc->>'phone' AS phone
FROM {{ env_var('ROOT_POSTGRES_SCHEMA') }}.{{ env_var('POSTGRES_TABLE') }}
WHERE
  (
    doc->>'type' IN ('contact', 'clinic', 'district_hospital', 'health_center', 'person')
{% if is_incremental() %}
    or _deleted = true
  )
  and "@timestamp" >= (select coalesce(max("@timestamp"), '1900-01-01') from {{ this }})
{% else %}
  )
{% endif %}
