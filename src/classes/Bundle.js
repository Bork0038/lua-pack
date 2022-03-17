const AST = require('./AST');

const luamin = require('../../lua/luamin'); 
const util   = require('../../util');
const fs     = require('fs');

const output = new util.StdOut();
class Bundle {
    constructor(config) {
        this.config = config;

        this.source =  this.source = `local load = setmetatable({}, {__call = function(a,b) return a[b] end, __index = function(a, b) error("Cannot find module " .. b) end})\n\n`;
    }

    setPrelude(path) {
        this.prelude = path;
    }

    setEntry(path) {
        this.entry = path;
    }

    addModule(name, source) {
        this.source += `do load["${name}"] = (function() ${source} end)() end\n`
    }

    countStringLiterals(token) {
        if (token == null)
            return;

        switch (typeof token) {
            case 'object':
                if (token.type === 'StringLiteral') {
                    this.literals[token.raw] = this.literals[token.raw] ? this.literals[token.raw] + 1 : 1;
                }

                for (let obj in token) {
                    this.countStringLiterals(token[obj]);
                }
        }
    }

    replaceLiteral(chunk, literal) {
        if (chunk == null)
            return;

        switch (typeof chunk) {
            case 'object':
                if (chunk.type === 'StringLiteral' && chunk.raw === literal) {
                    chunk.type = "Identifier";
                    chunk.name = `StringLiterals[${this.cacheLiterals.indexOf(literal) + 1}]`
                }

                for (let obj in chunk) {
                    this.replaceLiteral(chunk[obj], literal);
                }
        }
    }

    mergeChunks(chunk) {
        const tokens = [];
        const body = [];

        let pointer = 0;
        for (let token of chunk.body) {
            let hash = util.hash(JSON.stringify(token));
            if (!tokens[pointer]) {
                tokens[pointer] = {
                    hash,
                    token,
                    count: 1
                }
            } else {
                if (tokens[pointer].hash == hash) {
                    tokens[pointer].count++;
                } else {
                    pointer++;
                    tokens[pointer] = {
                        hash,
                        token,
                        count: 1
                    }
                }
            }
        }

        let initializer = 0;
        for (let token of tokens) {
            if (token.count < 3) {
                for (let i = 0; i < token.count; i++) 
                    body.push(token.token);
            } else {
                body.push({
                    type: 'ForNumericStatement',
                    variable: {
                        type: 'Identifier',
                        name: `ChunkMergeIndex${initializer}`,
                    },
                    start: {
                        type: "NumericLiteral",
                        raw: 1
                    },
                    end: {
                        type: "NumericLiteral",
                        raw: token.count
                    },
                    body: [token.token]
                })
                initializer++;
            }
        }

        for (let token of body) {
            if (token.body) {
                this.mergeChunks(token);
            } else if (token.clauses) {
                for (let clause of token.clauses) {
                    this.mergeChunks(clause);
                }
            }
        }
        chunk.body = body;
    }

    async assemble() {
        this.source += `\n${fs.readFileSync(this.entry, 'utf-8')}`;

        const ast = new AST(this.source);
        let str = '';
        if (this.config.options.cacheStringLiterals) {
            this.literals = {};
            this.countStringLiterals(ast.tokens);

            this.cacheLiterals = [];
            for (let literal in this.literals) {
                let count = this.literals[literal];
    
                if (2 + literal.length < literal.length * count) {
                    this.cacheLiterals.push(literal);
                }
            }
    
            for (let literal of this.cacheLiterals) {
                this.replaceLiteral(ast.tokens, literal);
            }

            str = 'local StringLiterals={';
            for (let i = 0; i < this.cacheLiterals.length; i++) {
                str += this.cacheLiterals[i] + (i < this.cacheLiterals.length - 1 ? ', ' : '}\n');
            }
        }

        if (this.config.options.optimizeInstructions) {
            this.mergeChunks(ast.tokens);
        }

        this.source = ((this.config.options.cacheStringLiterals && this.cacheLiterals.length != 0) ? str : '') + ast.compile();
        if (this.prelude) {
            this.source = `${fs.readFileSync(this.prelude, 'utf-8')}\n${this.source}`;
        }
        
        let out = '';
        if (this.config.options.minifyOutput) {
            const { status, data } = await util.minify(this.source);
            if (!status) {
                output.error(`Failed to beautify package\n\t${data}`);
                return process.exit();
            } else {
                out = data;
            }
        } else {
            out = luamin.Beautify(this.source, {
                renameVariables: false,
                renameGlobals: false,
                solveMath: false
            })
        }

        return out;
    }
}
module.exports = Bundle;
