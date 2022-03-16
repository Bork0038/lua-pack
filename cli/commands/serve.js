const LuaPack = require('../../src')
const express = require('express');
const path    = require('path');
const util    = require('../../util');
const fs      = require('fs');


const output = new util.StdOut();
module.exports = {
    name: "serve",
    async exec() {
        const directory = process.cwd();

        if (!fs.existsSync(path.join(directory, 'luapack.config.json'))) {
            return output.error('Invalid lua-pack project.'); 
        }

        output.info('Found lua-pack project.');
        async function build() {
            const packer = new LuaPack(directory);

            const start = Date.now();
            const scr = await packer.pack();
            const diff = (Date.now() - start) / 1000

            output.success(`Successfully packed project in ${diff} seconds, ${packer.compressionLevel}% compression.`);

            return scr;
        }

        const app = express();
        
        let building = false;
        let bundle = await build();
        app.get('/*', (req, res) => {
            res.send(building ? `print("Building in process, please wait.")` : bundle)
        })

        const port = await util.getPort();
        app.listen(port, () => {
            output.info(`Serving project on http://localhost:${port}`);
        })

        fs.watch(directory, async (event, file) => {
            if (event == "change" && !building) {
                building = true;
                bundle = await build();
                building = false;
            }
        })

    }
}