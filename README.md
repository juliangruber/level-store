# level-stream

Persist streams in [LevelDB](https://github.com/rvagg/node-levelup).

[![Build Status](https://travis-ci.org/juliangruber/level-stream.png)](https://travis-ci.org/juliangruber/level-stream)

## Usage

Store a file in LevelDB under the key `file` and read it out again:

```js
var levelup = require('levelup');
var fs = require('fs');

var db = levelup('/tmp/level-stream');
var streams = require('level-stream')(db);

fs.createReadStream(__dirname + '/file.txt')
  .pipe(streams.createWriteStream('file'))
  .on('end', function () {
    // file.txt is stored in leveldb now
    streams.createReadStream('file').pipe(process.stdout);
  });
```

## Resuming

When reading fails you might not want to start over again completely but rather resume
after the last chunk you received. First, pass `ts : true` as an option so you don't only
get the stored chunks but also when they were written:

```js
streams.createReadStream('file', { ts : true }).on('data', console.log);
// => { ts : 1363783762087, data : <Buffer aa aa> }
```

Now you only need store the timestamp of the last read chunk in a variable and you can
resume reading after an error, passing `{ since : ts }`:

```js
streams.createReadStream('file', { since : 1363783762087 }).on('data', console.log);
// => { ts : 1363783876109, data : <Buffer bb bb> }
```

## API

### stream(db)

Returns a `level-stream` instance.

### stream#createReadStream(key[, opts])

A readable stream that replays the stream stored at `key`.

Possible `options` are:

* `ts (Boolean)` : If true, don't emit raw chunks but rather objects having `ts` and `data` fields.
* `since (Number)`: When reading, only read data that has been stored after that date.
Automatically sets `ts` to `true`.
* `live (Boolen)`: If true, the stream will stay open, emitting new data as it comes in.

### stream#createWriteStream(key)

A writable stream that persists data written to it under `key`.

Returns a Duplex Stream.

If you start reading from it it replays the stream stored at `key`.
If you write to it it persists written data at `key`.

## TODO

* option to replace data instead of only appending

## Installation

With [npm](http://npmjs.org) do

```bash
$ npm install level-stream
```

## License

(MIT)
