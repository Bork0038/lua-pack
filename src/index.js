const Bundle = require('./classes/Bundle');
const Script = require('./classes/Script');
const File   = require('./classes/File');

const util = require('../util');
const path = require('path');
const fs   = require('fs');

class LuaPack {
    constructor(directory) {
        this.directory = directory;

        this.config = JSON.parse(fs.readFileSync(path.join(directory, 'luapack.config.json')));
        this.config.directory = directory;

        this.inputCharacters = 0;
        this.outputCharacters = 0;
    }

    get compressionLevel() {
        return util.calcCompression(this.inputCharacters, this.outputCharacters);
    }

    async loadFiles() {
        const files = {
            scripts: [],
            files: [],
        };

        function scanDirectory(directory, config, start) {
            for (let file of fs.readdirSync(directory)) {
                const currentFile = path.join(directory, file);
                const stats = fs.statSync(currentFile);

                if (stats.isFile()) {
                    const ext = file.split('.').pop();
                    
                    switch (ext) {
                        case 'lua':
                            const isEntry = currentFile == path.join(start, config.entry) || (config.prelude && currentFile == path.join(start, config.prelude));

                            files.scripts.push(new Script(currentFile, config, isEntry));
                            break;

                        default:
                            if (file != 'luapack.config.json' && !file.startsWith('.'))
                                files.files.push(new File(path.join(directory, file), config));
                            break;
                    }
                } else if (stats.isDirectory() && !(file == 'build' && directory == start) && !file.startsWith('.')) {
                    scanDirectory(currentFile, config, start);
                }
            }
        }
        scanDirectory(this.directory, this.config, this.directory);

        return files;
    }

    async pack() {
        const bundle = new Bundle(this.config);

        bundle.setEntry(path.join(this.config.directory, this.config.entry));
        if (this.config.prelude) {
            bundle.setPrelude(path.join(this.config.directory, this.config.prelude));
        }

        const { scripts, files } = await this.loadFiles();
        for (let file of files) {
            bundle.addFile(file);
        }

        for (let script of scripts) {
            if (!script.isEntry) {
                const { name, source } = await script.init();

                if (name && source)
                    bundle.addModule(name, source, script.path.replace(this.config.directory, ''));
            }
            
            this.inputCharacters += script.source.length;
        }
        
        const out = await bundle.assemble();
        this.outputCharacters = out.length;
    
        return out;
    }
}

module.exports = LuaPack;