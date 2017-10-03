/**
 * A lighter version of the mp3-split module https://github.com/skiptirengu/mp3-split
 */
'use strict';
const fs = require('fs');
const path = require('path');
const sanitize = require('sanitize-filename');
const util = require('util');
const EventEmitter = require('events').EventEmitter;
const spawn = require('child_process').spawn;


function fileName(file) {
  return ''.concat(sanitize(file)).concat('.mp3');
}


function prepareInput(emitter, options) {
  return new Promise((resolve, reject) => {
    try {
      const stat = fs.statSync(options.output);
      if (!stat.isDirectory()) {
        reject('Output path is not a directory');
        return;
      }
    } catch (ex) {
      reject('Output path does not exist');
      return;
    }
    fs.access(options.input, fs.constants.R_OK, (err) => {
      if (err) {
        reject(`Path "${options.input}" does not exist or file is not readable.`);
      } else {
        resolve(options.input);
      }
    });
  });
}

function parseAudio(options) {
  return new Promise((resolve, reject) => {
    const periods = [];
    const split = options.audios;
    const thr = (line) => {
      throw new Error(`Unable to extract time info from ${line}`);
    };
    const removeBrackets = (str) => {
      return str ? str.toString().replace('[', '').replace(']', '') : str;
    };
    const extractTimeInfo = (str) => {
      const regex = /(^[\[]([\d]{1,2}[:])*[\d]{1,2}[:][\d]{1,2}([.][\d]{1,4})?[\]])+/g;
      const match = str.match(regex);
      return match === null ? match : match.pop();
    };
    try {
      split.forEach((startLine, idx) => {
        const start = extractTimeInfo(startLine);
        let end = null;
        if (start === null) thr(startLine);
        const nextIdx = idx + 1;
        if (nextIdx < split.length) {
          const endLine = split[nextIdx];
          end = extractTimeInfo(endLine);
          if (end === null) thr(endLine);
        }
        // remove time info from final filename
        const trackName = startLine.replace(start, '').trim();
        periods.push({
          name: fileName(trackName),
          start: removeBrackets(start),
          end: removeBrackets(end),
          trackName: trackName
        });
      });
    } catch (err) {
      reject(err.message);
      return;
    }
    periods.sort((a, b) => {
      if (a.start > b.start) return 1;
      if (a.start < b.start) return -1;
      return 0;
    });
    resolve(periods);
  });
}

function splitAudio(file, data, emitter, options) {
  let concurrentTasks = 0;
  return Promise.all(
    data.map(audio => {
      return new Promise((resolve, reject) => {
        const args = [
          '-hide_banner',
          '-loglevel', 'repeat+error',
          '-y',
          '-i', file,
          '-ss', audio.start,
        ];
        // default args
        if (audio.end !== null) args.push('-to', audio.end);
        for (const meta of options.metadata) args.push('-metadata', `${meta.name}=${meta.value}`);
        args.push('-metadata', `title=${audio.trackName}`);
        args.push(path.join(options.output, audio.name));
        // spawn async
        const interval = setInterval(() => {
          if (concurrentTasks >= options.concurrency) return;
          clearInterval(interval);
          concurrentTasks++;
          emitter.emit('beforeSplit', audio);
          spawn('ffmpeg', args, {
              stdio: ['ignore', process.stdout, process.stderr]
            })
            .on('error', (err) => {
              concurrentTasks--;
              reject(err);
            })
            .on('close', () => {
              emitter.emit('afterSplit', audio);
              concurrentTasks--;
              resolve(audio);
            });
        }, 1000);
      });
    })
  );
}

// TODO ffmpeg options
// default options
const defaults = {
  concurrency: 3,
  metadata: [],
  audios: [],
  output: '.',
  input: '',
};

/**
 * @param options
 * @return {Promise|Mp3Split}
 * @constructor
 */
function Mp3Split(options) {
  if (!(this instanceof Mp3Split)) return new Mp3Split(options);
  EventEmitter.call(this);
  const opts = Object.assign({}, defaults, options);
  let fname;
  const self = this;
  this.parse = function () {
    return prepareInput(self, opts)
      .then((file) => {
        fname = file;
        return parseAudio(opts);
      })
      .then((data) => {
        self.emit('data', data);
        return splitAudio(fname, data, self, opts);
      });
  };
}

util.inherits(Mp3Split, EventEmitter);
module.exports = Mp3Split;