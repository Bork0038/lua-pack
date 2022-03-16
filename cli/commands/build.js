const LuaPack = require('../../src');

const util = require('../../util');
const path = require('path');
const fs   = require('fs');

const output = new util.StdOut();
module.exports = {
    name: "build",
    async exec() {
        const directory = process.cwd();

        if (!fs.existsSync(path.join(directory, 'luapack.config.json'))) {
            return output.error('Invalid lua-pack project.'); 
        }

        output.info('Found lua-pack project.');
        const packer = new LuaPack(directory);

        const start = Date.now();
        const scr = await packer.pack();
        const diff = (Date.now() - start) / 1000

        if (!fs.existsSync(path.join(directory, 'build'))) {
            fs.mkdirSync(path.join(directory, 'build'));
        }
        fs.writeFileSync(path.join(directory, 'build', 'build.lua'), scr);

        output.success(`Successfully packed project in ${diff} seconds, ${packer.compressionLevel}% compression.`);
    }
}