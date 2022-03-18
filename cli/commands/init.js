const readline = require('readline');
const package  = require('../../package.json');
const util     = require('../../util');
const path     = require('path');
const fs       = require('fs');

const output = new util.StdOut(); 
module.exports = {
    name: 'init',
    async exec(params) {
        const directory = process.cwd();

        const interface = new readline.createInterface(process.stdin, process.stdout);
        const question = require('util').promisify(interface.question).bind(interface);

        const config = {};
        config.name = await question('Please enter a project name: ');
        config.entry = await question('Please enter the entry file: ');
        config.options = {};

        const minify = await question('Minify output? (Y/N): ');
        config.options.minifyOutput = minify.toLowerCase() == 'y';

        const literals = await question('Cache string literals? (Y/N): ');
        config.options.cacheStringLiterals = literals.toLowerCase() == 'y';

        const inst = await question('Optimize instructions? (Y/N): ');
        config.options.optimizeInstructions = inst.toLowerCase() == 'y';

        const relative = await question('Allow Relative Paths? (Y/N): ');
        config.options.enableRelativePaths = relative.toLowerCase() == 'y';

        fs.writeFileSync(path.join(directory, 'luapack.config.json'), JSON.stringify(config, null, 4));

        if (!fs.existsSync(path.join(directory, config.entry))) {
            fs.writeFileSync(path.join(directory, config.entry), `-- ${package.name} v${package.version}\nprint("Hello World!")`);
            output.warning("No entry point found, generated template entry point");
        }
        output.success('Successfully created project.')

        process.exit();
    }
}