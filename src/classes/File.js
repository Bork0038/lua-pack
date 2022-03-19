const path = require('path');
const exec = require('child_process').exec;
const util = require('../../util');
const fs   = require('fs');

const output = new util.StdOut();
class File {
    constructor(filePath, config) {
        this.relative = filePath.replace(config.directory, '').split('\\').join('/');
        this.content  = fs.readFileSync(filePath, 'ascii');
        this.config   = config;
        this.path     = filePath;
        this.ext      = filePath.split('.').pop();
    }

    #serializeObj(object) {
        let str = '';

        switch (typeof object) {
            case 'object':
                if (Array.isArray(object)) {
                    str += '{ ';
                    for (let obj of object) {
                        str += `${this.#serializeObj(obj)},`
                    }
                    str += ' }';
                }  else {
                    str += '{ ';
                    for (let key in object) {
                        const obj = object[key];

                        str += `["${key.split('"').join('\\"')}"] = ${this.#serializeObj(obj)}, `;
                    }
                    str += ' }';
                }
                break;

            case 'string':
                str += `"${object.split('"').join('\\"')}"`;
                break;

            case 'boolean':
            case 'number':
                str += `${object}`;
                break;

            default:
                break;
        }

        return str;
    }

    #jsonToLua(str) {
        const json = JSON.parse(str);

        return this.#serializeObj(json);
    }

    async toLua() {
        return new Promise(async resolve => {
            switch (this.ext) {
                case 'json':
                    return resolve(this.#jsonToLua(this.content));
                default:
                    let luaPath;
                    if (process.execPath.endsWith('node.exe')) {
                        luaPath = path.join(__dirname, '../../lua');
                    } else {
                        luaPath = path.join(process.execPath, '../../lua');
                    }

                    exec(`"${luaPath}/lua53.exe" "${luaPath}/fileread.lua" ${this.path}`, (err, stdout, stderr) => {
                        if (err) {
                            output.warning(`Failed to serialize file ${this.relative}`);
                            resolve('""');
                        }
                        
                        resolve(`"${stdout.slice(0,-2)}"`);
                    })
            }
        })
    }
}
module.exports = File;