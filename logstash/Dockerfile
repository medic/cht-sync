FROM logstash:7.14.1

RUN mkdir -p /opt/logstash && touch /opt/logstash/sequence_path.txt
COPY ./pipeline /usr/share/logstash/pipeline
