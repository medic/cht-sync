{{
  config(
    materialized = 'incremental',
    unique_key='_id',
    indexes=[
      {'columns': ['_id'], 'type': 'hash'},
      {'columns': ['savedTimestamp']},
      {'columns': ['contact_type']},
    ]
  )
}}

SELECT
  _id,
  savedTimestamp,
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
    or _deleted = true
  )
{% if is_incremental() %}
  and savedTimestamp >= (select coalesce(max(savedTimestamp), '1900-01-01') from {{ this }})
{% endif %}
