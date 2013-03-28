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
resume reading after an error, passing `{ from : ts }`:

```js
store.createReadStream('file', { from : 1363783762087 }).on('data', console.log);
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
* `from (Number)`: When reading, only read data that has been stored after position `from`.
Automatically sets `ts` to `true`.
* `live (Boolen)`: If `true`, the stream will stay open, emitting new data as it comes in.

### store#createWriteStream(key[, opts])

A writable stream that persists data written to it under `key`. If something exists under `key`
already it will be deleted.

Possible `options` are:

* `append (Boolean)`: If `true`, possibly already existing data stored under `key` will be appended
rather than replaced.

### store#delete(key[, cb])

Delete everything stored under `key`.

## Installation

With [npm](http://npmjs.org) do

```bash
$ npm install level-store
```

## License

Copyright (c) 2013 Julian Gruber &lt;julian@juliangruber.com&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
