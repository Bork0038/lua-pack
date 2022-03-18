const path = require('path');
const fs   = require('fs');

class File {
    constructor(filePath, config) {
        this.relative = filePath.replace(config.directory, '').split('\\').join('/');
        this.content  = fs.readFileSync(filePath, 'utf-8');
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

    toLua() {
        switch (this.ext) {
            case 'json':
                return this.#jsonToLua(this.content);
            default:
               return `"${this.content.split('"').join('\\"')}"`;
        }
    }
}
module.exports = File;