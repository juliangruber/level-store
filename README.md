
# level-stream

Persist streams in [leveldb](https://github.com/rvagg/levelup).

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

## API

### stream(db, key)

Returns a Duplex Stream.

If you start reading from it it replays the stream stored at `key`.
If you write to it it persists written data at `key`.

### stream(db)

Extend `db` with the `db#stream` so you can do

```js
db.stream('file')
```

## TODO

* resuming logic: `stream(db, 'file', date)` should emit all data that
was written since `date`.
* live streams: `stream.live(...)` should stay open and emit new data.

## Installation

With [npm](http://npmjs.org) do

```bash
$ npm install level-stream
```

## License

(MIT)
