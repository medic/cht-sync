{{
    config(
        materialized = 'view',
        indexes=[
            {'columns': ['"@timestamp"'], 'type': 'brin'},
        ]
    )
}}

SELECT
    doc->>'type' AS type,
    *
FROM v1.{{ env_var('POSTGRES_TABLE') }}
