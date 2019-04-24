FROM gudtech/scamp-js:latest

ENV SCAMP_SERVICE_NAME=scamp-db
ENV SCAMP_SERVICE_DB_VER=$(git rev-parse --short HEAD)

WORKDIR /service/
COPY service.js /service/scamp-db/
COPY lib /service/scamp-db/
COPY entrypoint.sh /service/scamp-db/entrypoint.sh

#TODO: Handle SCAMP params as envrionment variables
COPY scamp.conf /etc/scamp/scamp.conf

CMD ["/service/scamp-db/entrypoint.sh"]
