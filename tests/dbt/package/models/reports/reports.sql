{{
  config(
    materialized = 'incremental',
    unique_key='uuid',
    post_hook='delete from {{this}} where _deleted=true',
    indexes=[
      {'columns': ['uuid'], 'type': 'hash'},
      {'columns': ['saved_timestamp']},
      {'columns': ['form']},
      {'columns': ['patient_id']},
    ]
  )
}}

SELECT
  _id as uuid,
  saved_timestamp,
  doc,
  doc->>'form' as form,
  _deleted,

  COALESCE(
      doc->>'patient_id',
      doc->'fields'->>'patient_id',
      doc->'fields'->>'patient_uuid'
  ) AS patient_id,

  COALESCE(
      doc->>'place_id',
      doc->'fields'->>'place_id'
  ) AS place_id,

  doc->'contact'->>'_id' as contact_id,
  doc->'fields' as fields

FROM {{ env_var('ROOT_POSTGRES_SCHEMA') }}.{{ env_var('POSTGRES_TABLE') }}
WHERE (
    doc->>'type' = 'data_record'
    or _deleted = true
  )
{% if is_incremental() %}
  and saved_timestamp >= (select coalesce(max(saved_timestamp), '1900-01-01') from {{ this }})
{% endif %}
