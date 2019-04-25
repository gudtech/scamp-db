
let DBR = require('./DBR/index.js');
var scamp = require('scamp');

export default class DBProxy {

    constructor() {

        this.svc = scamp.service({
            tag: 'scamp-db',
        });

    }

    async start(params){
        this.dbr = new DBR({
            conf_file: params.db_conf_file
        });

        await dbr.ready;
    }

    _ready(){
        this.svc.registerAction( 'Transaction.begin', svc.cookedHandler(function (header, data) {
            return {transaction_id: "dummy_transaction_id"};
        }));
    }

}