{{
  config(
    materialized = 'incremental',
    unique_key='_id',
    indexes=[
      {'columns': ['"_id"'], 'type': 'hash'},
      {'columns': ['"@timestamp"']},
      {'columns': ['"form"']},
      {'columns': ['"patient_id"']},
    ]
  )
}}

SELECT
  _id,
  "@timestamp",
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
{% if is_incremental() %}
    or _deleted = true
  )
  and "@timestamp" >= (select coalesce(max("@timestamp"), '1900-01-01') from {{ this }})
{% else %}
  )
{% endif %}
