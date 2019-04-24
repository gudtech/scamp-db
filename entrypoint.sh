#!/bin/sh
set -e

/scamp/script/provision-service scamp-db
exec node ./scamp-db/service.js
