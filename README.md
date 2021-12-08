# CHT Pipeline (EXPERIMENTAL)

CHT Pipeline brings data from CouchDB to Postgres, with transformations to make the data efficient to query.

You can deploy this as is, or with a **subpackage** like https://github.com/medic/cht-bombilla.

### Deployment

```
# ONLY IF USING SUBPACKAGE
export CHT_PIPELINE_SUBPACKAGE=https://github.com/medic/cht-bombilla.git

export CHT_PIPELINE_STAGE=local # OR gamma/prod
make $STAGE
```

### Subpackage

Subpackages make use of https://docs.getdbt.com/docs/building-a-dbt-project/package-management to deploy a package that makes transformation in DBT
