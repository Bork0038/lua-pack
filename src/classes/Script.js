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

        const body = this.tokens.body;

        if (!isEntry) {
            if ((!body[0] || body[0].type != 'AssignmentStatement' || body[0].init[0].type != 'StringLiteral' || body[0].variables[0].name != '_NAME')) {
                output.error(`Invalid module signature for module ${this.path}`)
            } else {
                this.moduleName = body.shift().init[0].raw.slice(1, -1);
            }
            body[0] = null;
        }
    }

    async init() {
        if (!this.moduleName) return;

        if (!this.isEntry) {
            const sections = this.source.split("\n");
            sections.shift();
            this.source = sections.join("\n");
        }

        const body = this.tokens.body;
        const { status, data } =  await util.minify(this.source);
        if (!status) {
            output.error(`Failed to beautify script ${this.path}\n\t${data}`);
            return process.exit();
        } else {
            return {
                name: this.moduleName,
                source: data
            }   
        }
    }
}

module.exports = Script;