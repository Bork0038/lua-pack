const AST = require('./AST');

const luamin = require('../../lua/luamin'); 
const util   = require('../../util');
const fs     = require('fs');

const output = new util.StdOut();
class Bundle {
    constructor(config) {
        this.config = config;

        if (this.config.options.enableRelativePaths == null) {
            this.config.options.enableRelativePaths = true;
        }
        
        this.source = `
        local moduleDictionary = {};
        ${(
            this.config.options.enableRelativePaths ?
            `
            local function split(path)
                local sections = {};
                for section in path:gmatch('[^/]+') do
                    table.insert(sections, section)
                end
                return sections
            end

            local pathCache = {};
            local function joinPath(start, path)
                local pathId = start .. "|" .. path;
                if pathCache[pathId] then
                    return pathCache[pathId];
                end

                local output = start;
                
                for token in path:gmatch('[^/]+') do
                    local sections = split(output);

                    if token == '.' then
                        if sections[#sections]:sub(-4, -1) == ".lua" then
                            table.remove(sections);
                        end
                    elseif token == '..' then
                        if sections[#sections]:sub(-4, -1) == ".lua" then
                            table.remove(sections);
                            table.remove(sections);
                        end
                    else 
                        table.insert(sections, token);
                    end

                    output = #sections > 0 and "/" .. table.concat(sections, '/') or '/';
                end

                pathCache[pathId] = output;
                return output;
            end
            `
            : ''
        )}

        local load = setmetatable({}, {
            __call = function(a, b)
                return a[b]
            end, 
            __index = function(a, b)
                ${(
                    this.config.options.enableRelativePaths ?
                    `
                    local moduleName =  moduleDictionary[joinPath(getfenv(2)._PATH, b)];
                    if moduleName then
                        return rawget(a, moduleName);
                    end

                    `
                    : ''
                )}
                error("Cannot find module. If the path is relative relative paths must be enabled in the config." .. b);
            end

        })

        local import = setmetatable({}, {
            __call = function(a,b)
                return a[b];
            end,
            __index = function(a, b)
                ${(
                    this.config.options.enableRelativePaths ?
                    `
                    local file = rawget(a, joinPath(getfenv(2)._PATH, b));
                    if file then
                        return file;
                    end
                    `
                    : ''
                )}
                error("Cannot load file. If the path is relative relative paths must be enabled in the config." .. b);
            end
        })
    `
        this.modules = [];
        this.files = [];
    }

    setPrelude(path) {
        this.prelude = path;
    }

    setEntry(path) {
        this.entry = path;
    }

    addModule(name, source, path) {
        if (this.modules.includes(name)) {
            output.warning(`There are more than one module with the name "${name}"`);
        }
        this.modules.push(name);

        name = name.split('"').join('\"');
        name = name.split('\\').join('\\\\');
        this.source += `
        do 
            load["${name}"] = (function()
                _NAME="${name}";
                ${
                    this.config.options.enableRelativePaths ?
                    `
                        _PATH="${path.replace(this.config.directory, '').split("\\").join("/")}";
                        moduleDictionary[_PATH] = _NAME;
                    `
                    : ''
                }
                ${source} 
            end)() 
        end\n`
    }

    async addFile(file) {
        if (this.files.includes(file.relative)) {
            output.warning(`There are more than one module with the path "${file.relative}"`);
        }
        this.files.push(file.relative);

        this.source += `import["${file.relative}"] = ${await file.toLua()};\n`
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
        this.source += `
        do
            ${
                this.config.options.enableRelativePaths ?
                `
                    _PATH="${this.entry.replace(this.config.directory, '').split("\\").join("/")}";
                ` 
                : ''
            }
            ${fs.readFileSync(this.entry, 'utf-8')}
        end`;

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
            this.source = `
            do 
                ${
                    this.config.options.enableRelativePaths ?
                    `
                        _PATH="${this.prelude.replace(this.config.directory, '').split("\\").join("/")}"
                    ` 
                    : ''
                }
                ${fs.readFileSync(this.prelude, 'utf-8')}
            end
            ${this.source}`;
        }

        let out = '';
        if (this.config.options.minifyOutput) {
            const { status, data } = await util.minify(this.source);
            if (!status) {
                output.error(`Failed to minify package\n\t${data}`);
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
