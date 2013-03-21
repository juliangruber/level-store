# level-store

A streaming storage engine based on [LevelDB](https://github.com/rvagg/node-levelup).

![LevelDB Logo](https://twimg0-a.akamaihd.net/profile_images/3360574989/92fc472928b444980408147e5e5db2fa_bigger.png)

[![Build Status](https://travis-ci.org/juliangruber/level-store.png)](https://travis-ci.org/juliangruber/level-store)

## Usage

Store a file in LevelDB under the key `file` and read it out again:

```js
var Store = require('level-store');
var fs = require('fs');

var store = Store('/tmp/level-stream');

fs.createReadStream(__dirname + '/file.txt')
  .pipe(store.createWriteStream('file'))
  .on('close', function () {
    // file.txt is stored in leveldb now
    store.createReadStream('file').pipe(process.stdout);
  });
```

## Resuming

When reading fails you might not want to start over again completely but rather resume
after the last chunk you received. First, pass `ts : true` as an option so you don't only
get the stored chunks but also when they were written:

```js
store.createReadStream('file', { ts : true }).on('data', console.log);
// => { ts : 1363783762087, data : <Buffer aa aa> }
```

Now you only need store the timestamp of the last read chunk in a variable and you can
resume reading after an error, passing `{ since : ts }`:

```js
store.createReadStream('file', { since : 1363783762087 }).on('data', console.log);
// => { ts : 1363783876109, data : <Buffer bb bb> }
```

## API

### Store(db)

Returns a `level-store` instance.

`db` can either be **a path** under which the data should be stored or **an instance of LevelUp**.

### store#createReadStream(key[, opts])

A readable stream that replays the stream stored at `key`.

Possible `options` are:

* `ts (Boolean)`: If `true`, don't emit raw chunks but rather objects having `ts` and `data` fields.
* `since (Number)`: When reading, only read data that has been stored after that date.
Automatically sets `ts` to `true`.
* `live (Boolen)`: If `true`, the stream will stay open, emitting new data as it comes in.

### store#createWriteStream(key[, opts])

A writable stream that persists data written to it under `key`. If something exists under `key`
already it will be deleted.

Possible `options` are:

* `append (Boolean)`: If `true`, possibly already existing data stored under `key` will be appended
rather than replaced.

## Installation

With [npm](http://npmjs.org) do

```bash
$ npm install level-store
```

## License

(MIT)
