#!/bin/bash

# copy the logstash config template for each couchdb
# and replace references to COUCHDB_DB with the db name
# then remove the template config so it doesn't confuse logstash
TEMPLATE_FILE="pipeline/pipeline.conf.template"
read -ra DBS <<< "${COUCHDB_DBS}"
for db in "${DBS[@]}"; do
    FILENAME="pipeline/${db}.conf"
    cp "${TEMPLATE_FILE}" "${FILENAME}"
    sed -i "s/\${COUCHDB_DB}/${db}/g" "${FILENAME}"
done

rm "${TEMPLATE_FILE}"

if [[ -f "${COUCHDB_SEQ}" && -s "${COUCHDB_SEQ}" ]]; then
    echo "Using existing sequence file"
else
    mkdir -p `dirname ${COUCHDB_SEQ}` \
        && chown -R $USER.$USER `dirname ${COUCHDB_SEQ}` \
        && echo 0 > ${COUCHDB_SEQ}
fi \
    && /usr/local/bin/docker-entrypoint
