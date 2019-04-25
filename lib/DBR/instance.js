
// "Index::Config::Instance"

export default class Instance {
    constructor(map, spec) {
        if (!spec) throw "spec ref is required";

        this.handle = spec.handle || spec.name;
        this.module = spec.module || spec.type;
        this.database = spec.dbname || spec.database;
        this.hostname = spec.hostname || spec.host;
        this.user = spec.username || spec.user;
        this.dbfile = spec.dbfile;
        this.tag = spec.tag || '';
        this.password = spec.password;
        this['class'] = spec['class'] || 'master';
        this.instance_id = spec.instance_id || '';
        this.schema_id = spec.schema_id || '';
        this.allowquery = spec.allowquery || false;
        this.readonly = spec.readonly || false;
        this.dbr_bootstrap = spec.dbr_bootstrap ? true : false;

        if (!this.module) throw "module/type parameter is required";
        if (!this.handle) throw "handle/name parameter is required";
        if (!Backends[this.module]) throw "module '" + this.module + "' is not a supported database type";
        this.connclass = Backends[this.module];

        this.connclass.required_config_fields.forEach(function (r) {e
            if (!this[r]) throw r + " parameter is required";
        }, this);

        this.pool = new this.connclass(this);

    }

    load_from_db (dbr, next) {

        return new Promise((resolve,reject) => {

            return this.pool.getConnection(function (err, conn) {
                if (err) throw err; // fatal during startup

                return conn.query('SELECT instance_id, schema_id, class, dbname, username, password, host, dbfile, module, handle, readonly, tag FROM dbr_instances', function (err, rows, fields) {
                    if (err) reject(err);

                    console.log("CONNECTED");

                    rows.forEach(function (spec) {
                        let instance = new Instance(spec);
                        dbr.register_instance(instance);
                    });

                    // this is not how enum handling is supposed to work, but it will do until we have schemata TODO
                    return conn.query('SELECT enum_id, handle FROM enum', function (err, rows) {
                        if (err) reject(err);

                        rows.forEach(function (r) {
                            dbr.register_enum( r.handle, r.enum_id );
                        });

                        conn.release();
                        resolve()
                    });

                });
            });

        });
    }

    // the mysql stuff is not how it's supposed to work, but it'll do for now
    connect(mode, callback) {
        if (typeof mode === 'function') {
            callback = mode;
            mode = '';
        }
        if (mode == 'mysql') {
            return this.pool.getConnection(callback);
        } else {
            throw "Unsupported connection mode " + mode;
        }
    }

    _sql (query, args, callback) {
        var me = this;
        return me.pool.getConnection(function (err, conn) {
            if (err) return callback(err);
            return conn.query(query, args, function () {
                conn.release();
                return callback.apply(this, arguments);
            });
        });
    }
}