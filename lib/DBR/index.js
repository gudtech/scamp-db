'use strict';

let config = require('./config');

export default class Index {
    constructor(params) {
        this.instances = {};
        this.conf_load_promises = [];
        this.configs = [];

        this._enumEnc = {};
        this._enumDec = {};

        var me = this;

        this._onReady = function () { return callback(me); };

        let initial_conf = new Config(params.conf_file);

        this.conf_load_promises.push( initial_conf.apply(this) );

    }
    async ready(){
        await Promise.all(this.conf_load_promises);
    }

    register_enum(handle,id){
        this._enumEnc[handle] = id;
        this._enumDec[id] = handle;
    }
    register_instance(instance){
        console.log('register_instance', instance);
        this.instances[_combine(instance.handle, instance.tag, instance['class'])] = instance;
    }

    enumEnc (e) { return this._enumEnc[e]; };
    enumDec (e) { return this._enumDec[e]; };

    get_instance(name, cls, tag) {
        cls = cls || 'master';
        tag = tag || '';

        var map = this.instances;
        var inst = map[ _combine(name,tag,cls) ] ||
            map[ _combine(name,tag,'*') ] ||
            map[ _combine(name,'',cls) ] ||
            map[ _combine(name,'','*') ];
        if (!inst) throw "No config found for db '"+name+"' class '"+cls+"'";
        return inst;
    }
}
var fs = require('fs'),
    mysql = require('mysql');

function _combine() {
    return Array.prototype.map.call(arguments, function(s) { return s.replace(/[,\\]/g,"\\$&") + ","; }).join('');
}



// TODO connection objects
//Index.prototype.connect = function () {
//    var as = Array.prototype.slice.call(arguments);
//    var cb = as.pop();
//    var inst = this.get_instance.apply(this, as);
//    return inst.pool.getConnection(cb); // TODO connection objects
//};

// "Index::Misc::Connection::Mysql"

function DBRMysql(inst) {
    this.realpool = mysql.createPool({
        database: inst.database,
        user: inst.user,
        password: inst.password,
        host: inst.hostname.match(/^\//) ? undefined : inst.hostname,
        socketPath: !inst.hostname.match(/^\//) ? undefined : inst.hostname,
        debug: process.env.JSDBR_DEBUG ? ['ComQueryPacket'] : undefined,
    });
    this.getConnection = this.realpool.getConnection.bind(this.realpool);
}
DBRMysql.required_config_fields = ['password', 'hostname', 'user', 'database'];
Backends.Mysql = DBRMysql;

///

exports.create = create;
