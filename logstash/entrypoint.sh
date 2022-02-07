mkdir -p `dirname ${COUCHDB_SEQ}` \
    && chown -R $USER.$USER `dirname ${COUCHDB_SEQ}` \
    && echo 0 > ${COUCHDB_SEQ} \
    && echo `dirname ${COUCHDB_SEQ}` \
    && ls -lth `dirname ${COUCHDB_SEQ}` \
    && /usr/local/bin/docker-entrypoint
