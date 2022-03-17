const crypto = require('crypto');
const chalk  = require('chalk');
const path   = require('path');
const exec   = require('child_process').exec;
const uuid   = require('uuid');
const net    = require('net');
const fs     = require('fs');
const os     = require('os');

async function portInUse(port) {
    return new Promise(resolve => {
        const server = net.createServer();

        server.once('error', err => {
            if (err.code == "EADDRINUSE") {
                resolve(true);
            }
        })

        server.once('listening', () => {
            server.close();
            resolve(false);
        })

        server.listen(port);
    })
}

async function getPort() {
    let port = 8080;

    while (await portInUse(port)) {
        port++;
    }

    return port;
}
module.exports.getPort = getPort;

function hash(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}
module.exports.hash = hash;

class StdOut {
    constructor() {}

    getDate() {
        const date = new Date();
        const minutes = date.getMinutes();

        return chalk.bold(`${date.getHours()}:${minutes < 10 ? `0${minutes}` : minutes} - `);
    }

    outputInternal(prefix, str) {
        console.log(this.getDate() + prefix + str);
    }

    error(str) {
        this.outputInternal(chalk.bold.red("[ERROR]: "), str);
    }

    output(str) {
        this.outputInternal(chalk.bold("[OUTPUT]: "), str);
    }

    info(str) {
        this.outputInternal(chalk.bold.blue("[INFO]: "), str);
    }

    success(str) {
        this.outputInternal(chalk.bold.green("[SUCCESS]: "), str);
    }

    warning(str) {
        this.outputInternal(chalk.bold.yellow("[WARNING]: "), str);
    }
}

module.exports.StdOut = StdOut;

function calcCompression(input, output) {
    return Math.round((1 - (output / input)) * 10000) / 100;
}
module.exports.calcCompression = calcCompression;

const temp = os.tmpdir();
let luaPath;
if (process.execPath.endsWith('node.exe')) {
    luaPath = path.join(__dirname, '../lua')
} else {
    luaPath = path.join(process.execPath, '../lua')
}

async function minify(source) {
    return new Promise(async resolve => {
        const fileId = uuid.v4();

        const filePath = path.join(temp, `${fileId}.lua`);
        const outPath  = path.join(temp, `${fileId}.out`);

        fs.writeFileSync(filePath, source);
        exec(`${luaPath}/lua53.exe "${luaPath}/luasrcdiet.lua" -o "${outPath}" --opt-srcequiv --opt-whitespace --opt-emptylines --opt-numbers --opt-locals --opt-strings  --opt-eols --opt-comments --opt-experimental "${filePath}"`, (err, stdout, stderr) => {
            if (!err) {
                const buf = fs.readFileSync(outPath, 'utf-8');
                fs.unlinkSync(filePath);
                fs.unlinkSync(outPath);

                return resolve({
                    status: true,
                    data: buf.split('\n').join(' ')
                })
            } else {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

                return resolve({
                    status: false,
                    data: stderr.split('\n')[0].replace(`${luaPath}/lua53.exe`,'')
                })
            }
        })
    })
}

module.exports.minify = minify;