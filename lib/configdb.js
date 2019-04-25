'use strict';
// The purpose of this module is to encapsulate the logic for reading and writing the database tables

var ConfigFile = require('./conffile');

function ConfigDB(params) {
    this.dbr = params.dbr;
    var config = new ConfigFile({ name: 'background' });
    this.id = params.id || config.get('dispatcher.id');
    this._eventIds = {};
}

ConfigDB.prototype.getIdAndJobs = function (callback) {
    var me = this;
    var dir = me.dbr.get_instance('directory')
    return dir._sql('SELECT `id`, `zone_id`, `type`, `status` FROM `service_node` WHERE `name` = ?', [me.id], function (err, rows) {
        if (err) return callback(err);
        if (rows.length != 1) return callback(new Error('nonexistant or multiply defined service node '+me.id));

        return dir._sql(
            'SELECT m.id map_id, m.status map_status, m.date_started map_date_started, '+
                'j.id job_id, j.client_id client_id, j.status job_status, '+
                'd.identifier definition, j.params_json params_json, j.identity_json identity_json '+
            'FROM service_job_node_map m, background_job j, constants.background_job_def d '+
            'WHERE m.node_id = ? AND m.status <> ? AND j.id = m.job_id AND d.id = j.definition_id',
            [rows[0].id, me.dbr.enumEnc('retired')], function (err, rows2) {
                if (err) return callback(err);

                rows[0].status = me.dbr.enumDec(rows[0].status);
                rows[0].type = me.dbr.enumDec(rows[0].type);
                rows2.forEach(function (m) {
                    m.map_status = me.dbr.enumDec(m.map_status);
                    m.job_status = me.dbr.enumDec(m.job_status);
                });
                return callback(null, rows[0], rows2);
            });
    });
};

// these are expressed as single statements to make them transactional without fuss
ConfigDB.prototype.recordStart = function (map_id, callback) {
    var me = this;
    return this.dbr.get_instance('directory')._sql(
            'UPDATE service_job_node_map SET date_started = COALESCE(date_started, ?) WHERE id = ?',
            [ Math.floor(Date.now() / 1000), map_id ], callback);
};

ConfigDB.prototype.recordStop = function (job_id, callback) {
    var me = this;
    var pstart = me.dbr.enumEnc('pending_start'),
        psurr  = me.dbr.enumEnc('pending_surrender'),
        pstop  = me.dbr.enumEnc('pending_stop'),
        retired= me.dbr.enumEnc('retired'),
        active = me.dbr.enumEnc('active'),
        now = Math.floor(Date.now() / 1000);

    return me.dbr.get_instance('directory')._sql(
            'UPDATE service_job_node_map '+
            'SET date_unmapped = CASE WHEN status IN (?, ?) THEN ? ELSE date_unmapped END, '+
            '    date_stopped  = CASE WHEN status IN (?, ?) THEN ? ELSE date_stopped END, '+
            '    status        = CASE WHEN status IN (?, ?) THEN ? ELSE ? END '+
            'WHERE job_id = ? AND status IN (?, ?, ?)',
            [ psurr,pstop,now,  psurr,pstop,now,  psurr,pstop,retired,active,  job_id,  psurr,pstart,pstop ],
            callback);
};

ConfigDB.prototype.recordEvent = function (job_id, name, args, callback) {
    var me = this;
    return me._assertEvent(name, function (err, code) {
        if (err) return callback(err);
        var dir = me.dbr.get_instance('directory');
        return dir._sql('INSERT INTO background_event SET job_id = ?, definition_id = ?, date_occurred = ?',
            [ job_id, code, Math.floor(Date.now() / 1000) ], function (err, result) {
                if (err) return callback(err);
                var keys = Object.keys(args);
                if (!keys.length) return callback(null);
                var insert = keys.map( function (k) {
                    return [ result.insertId, k, ""+args[k] ];
                } );

                return dir._sql('INSERT INTO background_event_value (`event_id`, `field`, `value`) VALUES ?', [insert], function (err, result) {
                    return callback(err);
                });
            });
    });
};

ConfigDB.prototype.lastEventTime = function (job_id, name, callback) {
    var me = this;
    return me._assertEvent(name, function (err, code) {
        if (err) return callback(err);
        var dir = me.dbr.get_instance('directory');
        return dir._sql('SELECT MAX(`date_occurred`) `last` FROM `background_event` WHERE `job_id` = ? AND `definition_id` = ?', [ job_id, code ], function (err, rows) {
            if (err) return callback(err);
            var last = rows[0].last;
            return callback(null, last ? new Date(last * 1000) : null);
        });
    });
};

ConfigDB.prototype._assertEvent = function (name, callback) {
    var me = this;
    if (me._eventIds[name] instanceof Array)
        return me._eventIds[name].push(callback); // lockout
    if (me._eventIds[name])
        return callback(null, me._eventIds[name]);
    me._eventIds[name] = [callback];
    function settle(err, result) {
        var l = me._eventIds[name];
        me._eventIds[name] = result;
        l.forEach(function (f) { f(err, result); });
    }
    var constants = me.dbr.get_instance('constants');
    return constants._sql('SELECT id FROM background_event_def WHERE identifier = ?', [name], function (err, rows) {
        if (err || rows[0]) return settle(err, err ? null : rows[0].id);
        return constants._sql('INSERT INTO background_event_def SET identifier = ?, name = ?', [name, name], function (err, result) {
            return settle(err, err ? null : result.insertId);
        });
    });
};

//////////

module.exports = ConfigDB;
