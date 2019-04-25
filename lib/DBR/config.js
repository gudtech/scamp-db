// "Index::Config"

export default class Config {
    constructor(file) {
        this.specs = [];
        let lines = [];
        var sectno = 0;

        var text = fs.readFileSync(file, 'utf8');

        text.split('\n').forEach(function (line) {
            line = line.replace(/#.*/, '').trim();
            if (line == '') return;

            lines[sectno] = lines[sectno] || {};
            if (/^---/.test(line)) {
                sectno++;
                return;
            }
            line.split(/\s*;\s*/).forEach(function (part) {
                var bits = /^(.*?)\s*=\s*(.*)$/.exec(part);
                lines[sectno][bits[1]] = bits[2];
            });
        });


        conf.forEach(function (spec) {
            if (!Object.keys(spec).length) return;
            this.specs.push(spec);
        });
    }
    apply(dbr){
        this.specs.forEach(function (spec) {

            var inst = new Instance(spec);

            dbr.register_instance(inst);

            if (inst.dbr_bootstrap) {
                return inst.load_from_db(dbr);
            }else{
                return Promise.resolve();
            }
        });
    }
}