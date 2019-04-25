'use strict';
var dbproxy = require('./dbproxy');

var dbp = new dbproxy();

dbp.start({
    db_conf_file: process.env.DB_CONF_FILE || '/service/scamp-db/db.conf'
}).then(() =>{

    console.log("DB PRoxy is Started");
})