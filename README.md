# level-store

A streaming storage engine based on [LevelDB](https://github.com/rvagg/node-levelup). It is

* **faster** than the `fs` module
* **local** in contrast to Amazon S3
* **streaming** from the first byte in contrast to Amazon S3
* **appending** values when desired
* **resuming** reads when something failed
* **in-process**

![LevelDB Logo](https://twimg0-a.akamaihd.net/profile_images/3360574989/92fc472928b444980408147e5e5db2fa_bigger.png)

[![Build Status](https://travis-ci.org/juliangruber/level-store.png)](https://travis-ci.org/juliangruber/level-store)

Only need in-memory persistence and no resuming? Check out [enstore](https://github.com/juliangruber/enstore).

***

## Usage

Store a file in LevelDB under the key `file` and read it out again:

```js
var levelup = require('level');
var Store = require('level-store');
var fs = require('fs');

var store = Store(levelup('/tmp/level-store'));

fs.createReadStream(__dirname + '/file.txt')
  .pipe(store.createWriteStream('file'))
  .on('close', function () {
    // file.txt is stored in leveldb now
    store.createReadStream('file').pipe(process.stdout);
  });
```

## Live persistence

If you want to persist a stream and read from it at the same time, without reading what didn't get stored yet,
you can do it like this:

```js
// first start reading from the stored version
storage.createReadStream('stream', { live : true }).pipe(someWhere);
// then put your stream into the store
stream.pipe(storage.createWriteStream('stream'));
```

## Resuming

When reading fails you might not want to start over again completely but rather
resume after the last chunk you received. First, pass `index: true` as an
option so you don't only get the stored chunks but also their index in the
store:

```js
store.createReadStream('file', { index: true }).on('data', console.log);
// => { index: 1363783762087, data : <Buffer aa aa> }
```

Now you only need store the timestamp of the last read chunk in a variable and you can
resume reading after an error, passing `{ from: index }`:

```js
store.createReadStream('file', { from: 1363783762087 }).on('data', console.log);
// => { index: 1363783876109, data : <Buffer bb bb> }
```

## Capped streams

If you don't want your stream to grow infinitely and it's ok to cut old parts
off, use `{ capped : x }` to limit to stream to `x` chunks:

```js
store.createWriteStream('file', { capped : 3 }).write('...');
```

## API

### Store(db)

Returns a `level-store` instance.

`db` can either be **a path** under which the data should be stored or **an instance of LevelUp**.

### store#createReadStream(key[, opts])

A readable stream that replays the stream stored at `key`.

Possible `options` are:

* `index (Boolean)`: If `true`, don't emit raw chunks but rather objects having
`index` and `data` fields.
* `from (Number)`: When reading, only read data that has been stored after
position `from`. Automatically sets `ts` to `true`.
* `live (Boolean)`: If `true`, the stream will stay open, emitting new data as it comes in.

### store#createWriteStream(key[, opts])

A writable stream that persists data written to it under `key`. If something exists under `key`
already it will be deleted.

Possible `options` are:

* `append (Boolean)`: If `true`, possibly already existing data stored under `key` will be appended
rather than replaced.
* `capped (Number)`: If set, cap the stream to `x` chunks.

### store#delete(key[, cb])

Delete everything stored under `key`.

### store#exists(key, cb)

Check if `key` exists and call `cb` with `(err, exists)`.

### store#append(key, value[, cb])

Sugar for appending just one `value` to `key`.

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
