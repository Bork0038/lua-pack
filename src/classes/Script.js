const AST = require('./AST');

const util = require('../../util');
const fs   = require('fs');

const output  = new util.StdOut();
class Script extends AST {
    constructor(path, config, isEntry) {
        const source = fs.readFileSync(path, 'utf-8');
        super(source);

        this.isEntry = isEntry;
        this.source  = source;
        this.config  = config;
        this.path    = path;
    }

    async init() {
        const body = this.tokens.body;

        if (!body[0] || body[0].type != 'AssignmentStatement' || body[0].init[0].type != 'StringLiteral' || body[0].variables[0].name != '_NAME') {
            output.error(`Invalid module signature for module ${this.path}`)
            return {};
        }
        const moduleName = body.shift().init[0].raw.slice(1, -1);

        const { status, data } =  await util.minify(this.source);
        if (!status) {
            output.error(`Failed to beautify script ${this.path}\n\t${data}`);
            return process.exit();
        } else {
            return {
                name: moduleName,
                source: data
            }   
        }
    }
}

module.exports = Script;