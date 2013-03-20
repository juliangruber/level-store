# level-stream

Persist streams in [LevelDB](https://github.com/rvagg/node-levelup).

[![Build Status](https://travis-ci.org/juliangruber/level-stream.png)](https://travis-ci.org/juliangruber/level-stream)

## Usage

Store a file in LevelDB under the key `file` and read it out again:

```js
var stream = require('level-stream');
var levelup = require('levelup');
var fs = require('fs');

var db = levelup('/tmp/level-stream');

fs.createReadStream(__dirname + '/file.txt')
  .pipe(stream(db, 'file'))
  .on('end', function () {
    // file.txt is stored in leveldb now
    stream(db, 'file').pipe(process.stdout);
  });
```

## Resuming

When reading fails you might not want to start over again completely but rather resume
after the last chunk you received. First, pass `ts : true` as an option so you don't only
get the stored chunks but also when they were written:

```js
stream(db, 'file', { ts : true }).on('data', console.log);
// => { ts : 1363783762087, data : <Buffer aa aa> }
```

Now you only need store the timestamp of the last read chunk in a variable and you can
resume reading after an error, passing `{ since : ts }`:

```js
stream(db, 'file', { since : 1363783762087 }).on('data', console.log);
// => { ts : 1363783876109, data : <Buffer bb bb> }
```

## API

### stream(db, key[, options])

Returns a Duplex Stream.

If you start reading from it it replays the stream stored at `key`.
If you write to it it persists written data at `key`.

Possible `options` are:

* `ts (Boolean)` : If true, don't emit raw chunks but rather objects having `ts` and `data` fields.
* `since (Number)`: When reading, only read data that has been stored after that date.
Automatically sets `ts` to `true`.

### stream(db)

Extend `db` with the `db#stream` so you can do

```js
db.stream('file')
```

## TODO

* live streams: `stream.live(...)` should stay open and emit new data.
* more node-core style API, like `stream(db).createReadStream(key[, opts])`

## Installation

With [npm](http://npmjs.org) do

```bash
$ npm install level-stream
```

## License

(MIT)
