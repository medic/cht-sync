{{
  config(
    materialized = 'incremental',
    unique_key='uuid',
    on_schema_change='append_new_columns',
    post_hook='delete from {{this}} where _deleted=true',
    indexes=[
      {'columns': ['uuid'], 'type': 'hash'},
      {'columns': ['savedTimestamp']},
      {'columns': ['contact_type']},
    ]
  )
}}

SELECT
  _id as uuid,
  savedTimestamp,
  _deleted,
  to_timestamp((NULLIF(doc ->> 'reported_date'::text, ''::text)::bigint / 1000)::double precision) AS reported,
  doc->'parent'->>'_id' AS parent_uuid,
  doc->>'name' AS name,
  COALESCE(doc->>'contact_type', doc->>'type') as contact_type,
  doc->>'phone' AS phone,
  doc->>'alternative_phone' AS phone2,
  doc->>'is_active' AS active,
  doc->>'notes' AS notes,
  doc->>'contact_id' AS contact_id
FROM {{ env_var('ROOT_POSTGRES_SCHEMA') }}.{{ env_var('POSTGRES_TABLE') }}
WHERE
  (
    doc->>'type' IN ('contact', 'clinic', 'district_hospital', 'health_center', 'person')
    or _deleted = true
  )
{% if is_incremental() %}
  and savedTimestamp >= (select coalesce(max(savedTimestamp), '1900-01-01') from {{ this }})
{% endif %}
