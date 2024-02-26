{{
    config(
        materialized = 'incremental',
        indexes=[
            {'columns': ['"@timestamp"'], 'type': 'brin'},
            {'columns': ['"form"'], 'type': 'hash'},
        ]
    )
}}

SELECT
    doc->>'form' AS form,
    doc->>'reported_date' AS reported_date,
    doc->>'patient_id' AS patient_id,
    *
FROM {{ ref('couchdb') }}
WHERE
    doc->>'type' = 'data_record'

{% if is_incremental() %}
    AND COALESCE("@timestamp" > (SELECT MAX("@timestamp") FROM {{ this }}), True)
{% endif %}
