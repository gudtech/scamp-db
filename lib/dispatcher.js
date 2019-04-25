'use strict';
var soa        = require('gt-soa'),
    soa_util   = soa.util(),
    ConfigDB   = require('./configdb'),
    DBR        = require('./DBR/index'),
    JobFactory = require('./job'),
    ControlAPI = require('./api'),
    Manager    = require('./manager');

var ap = require('argparser').vals('pidfile','id').nonvals('debug').parse();

if (ap.opt('pidfile'))
    require('fs').writeFileSync(ap.opt('pidfile'), process.pid);

soa.logger().configure({ tag: 'bgdispatcher', defname: 'bgdispatcher', debug: ap.opt('debug') });

DBR.create({ conf: '/etc/DBR_gt.conf' }, function (dbr) {
    var requester  = soa.requester({ ident: 'bg.dispatcher', sector: 'background' });
    var configdb   = new ConfigDB({ dbr: dbr, id: ap.opt('id') });
    var jobfactory = new JobFactory({ db: configdb, requester: requester });
    var manager    = new Manager({ db: configdb, factory: jobfactory });
    var api        = new ControlAPI({ manager: manager, db: configdb });

    soa.util().update_service_file(ap.opt('id'), true);

    function die() {
        if (manager.shutting_down) {
            soa.error('Received 2nd signal, shutting down dirtily');
            soa_util.update_service_file(ap.opt('id'), false);
            process.exit(51); // magic code which tells wrapper not to restart
        }
        manager.shutdown(function () {
            soa_util.update_service_file(ap.opt('id'), false);
            process.exit(51);
        });
    }

    process.on('SIGTERM', die);
    process.on('SIGINT', die);
    process.on('SIGQUIT', die);
    process.on('SIGHUP', die);
});
