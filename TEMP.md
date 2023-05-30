CHT Sync Documentation

## Architecture
CHT-Sync is a set of technology carefully combined together to help sync CHT couchdb data with PostgreSQL so that it can we used for analytics. CHT-Sync performs data transformation on the data synced to PostgreSQL through the help of DBT. This DBT model can be found on CHT-pipeline which is a repository dedicated to data transformation models for CHT documents stored in SQL. The transformed data can then be used to design dashboard that fits business requirements using Superset. To achieve syncing between CHT and PostgreSQL, cut uses Logstash and PostgREST.

### What’s in the Box!!!
Below are the list of technologies used in cht-sync:
- Superset
- Logstash
- PostgREST
- PostgreSQL
- DBT

To learn about this technologies, you can visit cht-sync study guide on these technologies.

Below is the cht-sync architecture diagram.



## Technology

CHT Sync is an easy-to-use data duplication and transformation toolchain for CHT analytics. It is a bundling of configurations for LogStash CouchDB sync with PostgREST and Superset dashboard configuration.

**WARNING!** The scheme differs from couch2pd. See init-db.sh.

## Getting Started

To get started with CHT Sync, follow these steps:

### Requirements:
- Docker

### Local Setup

```sh
# startups up couchdb 
make local
```

## Architecture

CHT Sync utilizes a combination of technologies to enable synchronization between CHT CouchDB and PostgreSQL for analytics purposes. The architecture dia gram below provides an overview of the components involved:

```
[CHT CouchDB] <-- Logstash --> [PostgreSQL] <-- PostgREST --> [CHT-Sync Application] <-- DBT --> [Transformed Data] <-- Superset --> [Dashboards]
```

The key technologies used in cht-sync are:

- **Superset**: A business intelligence tool used for designing and visualizing dashboards.
- **Logstash**: An open source data processing pipeline that facilitates data synchronization between CHT CouchDB and PostgreSQL.
- **PostgREST**: A RESTful API web server that enables communication between CHT and PostgreSQL.
- **PostgreSQL**: A powerful open source relational database management system used to store the synced data.
- **DBT**: A data transformation tool that performs transformations on the data synced to PostgreSQL. The DBT model for CHT documents can be found in the CHT-pipeline repository.

For more information on each technology, refer to the cht-sync study guide.

## Environment Variables

```env
 
```