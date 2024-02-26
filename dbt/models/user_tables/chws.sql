{{
    config(
        materialized = 'table',
        indexes=[
            {'columns': ['"@timestamp"'], 'type': 'brin'},
            {'columns': ['"patient_id"'], 'type': 'hash'},
        ]
    )
}}

SELECT
    doc->>'name' AS name,
    doc->>'date_of_birth' AS date_of_birth,
    doc->>'phone' AS phone,
    doc->>'sex' AS sex,
    doc->>'reported_date' AS reported_date,
    doc->>'patient_id' AS patient_id,
    *
FROM {{ ref('couchdb') }}
WHERE
    doc->>'type' = 'person'
