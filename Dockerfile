FROM gudtech/scamp-js:latest

ARG SCAMPDB_VER
ENV SCAMPDB_VER=${SCAMPDB_VER}

ENV SCAMP_SERVICE_NAME=scamp-db

WORKDIR /service/
COPY lib /service/scamp-db/
COPY entrypoint.sh /service/scamp-db/entrypoint.sh

#TODO: Handle SCAMP params as envrionment variables
COPY scamp.conf /etc/scamp/scamp.conf

ENTRYPOINT ["/service/scamp-db/entrypoint.sh"]