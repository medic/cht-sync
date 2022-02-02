FROM logstash:7.14.1

RUN mkdir -p /tmp/logstash/ && touch /tmp/logstash/sequence_path.txt
COPY ./pipeline /usr/share/logstash/pipeline
COPY ./entrypoint.sh /usr/local/bin/entrypoint.sh

ENTRYPOINT ["bash", "/usr/local/bin/entrypoint.sh"]
