FROM logstash:8.11.1

COPY ./pipeline /usr/share/logstash/pipeline
COPY ./logstash.yml /usr/share/logstash/config/logstash.yml
COPY ./entrypoint.sh /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/bin/bash", "/usr/local/bin/entrypoint.sh"]
