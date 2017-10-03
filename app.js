#!/usr/bin/env node

const mp3Split = require('./Libs/mp3-split.js');
const mp3Duration = require('mp3-duration');
const yargs = require('yargs');
const colors = require('colors');

const argv = yargs.usage('Usage: $0 <command> [options]')
    .command('split', 'Split the audiobook')
    .example('$0 split -i myaudiobook.mp3 -l 10 -o /home/Music -m title=Test')
    .alias('o', 'output')
    .alias('t', 'template')
    .alias('n', 'number')
    .alias('l', 'lenght')
    .alias('i', 'input')
    .alias('m', 'metadata')
    .alias('c', 'concurrency')
    .describe('o', 'Output path')
    .describe('t', 'Template text file')
    .describe('n', 'number of parts')
    .describe('l', 'part lenght, in minutes')
    .describe('i', 'Input audio file')
    .describe('m', 'Output file metadata with "key=value" format')
    .describe('c', 'Max concurrent tasks')
    .default('t', null)
    .default('n', null)
    .default('l', 1200)
    .default('i', null)
    .default('c', 3)
    .array('m')
    .default('m', [])
    .help('h')
    .alias('h', 'help').argv;

let content = '';
let audios = [''];
if (argv.template != null) {
    const stream = fs.createReadStream(argv.template, {
        encoding: 'utf-8',
        flags: 'r'
    });
    stream.on('data', (buf) => content += buf);
    stream.on('error', () => console.log(`Unable to open template file ${argv.template}`.red));
    stream.on('end', () => {    audios = content.trim().split('\n'); startSplitting() } );
} else if (argv.number != null) {
    mp3Duration(argv.input, function (err, duration) {
        if (err) return console.log(err.message);
        let numberOfParts = argv.number;
        let lenghtOfParts = (duration / argv.number);
        generateTemplate(numberOfParts, lenghtOfParts);
        startSplitting();
    });
} else {
    mp3Duration(argv.input, function (err, duration) {
        if (err) return console.log(err.message);
        let lenghtOfParts = argv.lenght;
        let numberOfParts = parseInt(duration / lenghtOfParts);
        generateTemplate(numberOfParts, lenghtOfParts);
        startSplitting();
    });
}


function startSplitting() {
    {
        const meta = [];
        for (const data of argv.metadata) {
            const split = data.split('=');
            if (!split || split.length !== 2) {
                console.log('Wrong metadata input!'.red);
                return;
            }
            meta.push({
                name: split[0],
                value: split[1]
            });
        }
        const split = new mp3Split({
            concurrency: argv.concurrency,
            input: argv.input,
            audios: audios,
            metadata: meta,
            output: argv.output || './outputs'
        });
        split.on('beforeSplit', info => {
            console.log(
                colors.green('Parsing ') + colors.cyan(info.name) + colors.green(' starting at ') + colors.cyan(info.start) + colors.green('...')
            );
        });
        split.on('afterSplit', info => {
            console.log(
                colors.green('Successfully parsed ') + colors.cyan(info.name) + colors.green('!')
            );
        });
        split.parse().then(() => console.log('Successfully parsed all files!'.green)).catch(err => console.log('stingy rogah' + err.red));
    }
}

function generateTemplate(numberOfParts, lenghtOfParts) {
    let audiosArr = [];
    for (var i = 0; i < numberOfParts; i++) {
        let audioElement = '';
        let currentTimeStamp = i * lenghtOfParts;
        if (currentTimeStamp < 60) {
            audioElement = `[00:${currentTimeStamp}] Chap${i}`;
        } else if (currentTimeStamp < 3600) {
            let currentTimeStampInMinutes = parseInt((i * lenghtOfParts) / 60);
            let restOfTimeStampInSeconds = currentTimeStamp - currentTimeStampInMinutes * 60;
            audioElement = `[${currentTimeStampInMinutes}:${restOfTimeStampInSeconds}] Chap${i}`;
        } else {
            let currentTimeStampInMinutes = parseInt((i * lenghtOfParts) / 60);
            let restOfTimeStampInSeconds = currentTimeStamp - currentTimeStampInMinutes * 60;
            let currentTimeStampInHours = parseInt(currentTimeStampInMinutes / 60);
            let restOfTimeStampInMinutes = currentTimeStampInMinutes - currentTimeStampInHours * 60;
            audioElement = `[${currentTimeStampInHours}:${restOfTimeStampInMinutes}:${restOfTimeStampInSeconds}] Chap${i}`;
        }
        audiosArr.push(audioElement);
    }
    audios = audiosArr;
}