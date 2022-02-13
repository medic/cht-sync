FROM logstash:7.14.1

COPY ./pipeline /usr/share/logstash/pipeline
COPY ./entrypoint.sh /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/bin/sh", "/usr/local/bin/entrypoint.sh"]
