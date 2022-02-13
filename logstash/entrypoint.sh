if [[ -f "${COUCHDB_SEQ}" && -s "${COUCHDB_SEQ}" ]]; then
    echo "Using existing sequence file"
else
    mkdir -p `dirname ${COUCHDB_SEQ}` \
        && chown -R $USER.$USER `dirname ${COUCHDB_SEQ}` \
        && echo 0 > ${COUCHDB_SEQ}
fi \
    && /usr/local/bin/docker-entrypoint
