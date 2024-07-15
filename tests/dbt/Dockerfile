FROM nginx:1.25.1-alpine as base_nginx

RUN apk add --update --no-cache \
    curl \
    socat \
    sed \
    bash \
    tar

WORKDIR /dbt

COPY nginx.conf /etc/nginx/nginx.conf
COPY package ./package
RUN tar -czvf ./package.tar.gz ./package

