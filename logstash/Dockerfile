FROM logstash:8.11.1

COPY ./pipeline /usr/share/logstash/pipeline
COPY ./entrypoint.sh /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/bin/bash", "/usr/local/bin/entrypoint.sh"]
