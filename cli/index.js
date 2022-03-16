const util = require('../util');
const path = require('path');
const fs   = require('fs');

const commands = {};
const commandsFile = path.join(__dirname, 'commands');
for (let file of fs.readdirSync(commandsFile)) {
    const command = require(path.join(commandsFile, file));

    commands[command.name] = command.exec;
}

{
    (async () => {
        const output = new util.StdOut();

        const args = process.argv.splice(2);
        
        const command = args.shift();
        const params  = args;

        if (!commands[command]) {
            output.error("Unknown command.");
        } else {
            commands[command](params);
        }
    })();
}