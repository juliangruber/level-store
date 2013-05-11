var store = require('..');
var levelup = require('levelup');
var os = require('os');
var fs = require('fs');
var rimraf = require('rimraf');
var through = require('through');
var tap = require('tap');

var fixture = fs.readFileSync(__dirname + '/fixtures/file.txt').toString();

test('level-store', function (t, db) {
  fs.createReadStream(__dirname + '/fixtures/file.txt')
    .pipe(store(db).createWriteStream('file'))
    .on('close', function () {
      var data = '';
      store(db).createReadStream('file')
      .pipe(through(function (chunk) {
        data += chunk;
      }))
      .on('end', function () {
        t.equal(data, fixture);
        t.end();
      });
    });
});

test('key collisions', function (t, db) {
  fs.createReadStream(__dirname + '/fixtures/file.txt')
    .pipe(store(db).createWriteStream('file'))
    .on('close', function () {
      var data = '';
      store(db).createReadStream('file2')
      .pipe(through(function (chunk) {
        data += chunk;
      }))
      .on('end', function () {
        t.equal(data, '');
        t.end();
      });
    });
});

test('timestamps', function (t, db) {
  fs.createReadStream(__dirname + '/fixtures/file.txt')
    .pipe(store(db).createWriteStream('file'))
    .on('close', function () {
      store(db).createReadStream('file', { ts : true })
      .pipe(through(function (chunk) {
        t.ok(chunk.ts, 'chunk timestamp');
        t.ok(chunk.data, 'chunk data');
      }))
      .on('end', t.end.bind(t));
    });
});

test('resume', function (t, db) {
  t.plan(1);

  fs.createReadStream(__dirname + '/fixtures/file.txt')
    .pipe(store(db).createWriteStream('file'))
    .on('close', function () {
      store(db).createReadStream('file', { ts : true })
      .once('data', function (chunk) {
        store(db).createReadStream('file', { since : chunk.ts })
        .on('data', function (chunk) {
          t.ok(chunk, 'received data');
        });
      });
    });
});

test('live', function (t, db) {
  var data = '';

  var live = store(db).createReadStream('file', { live : true });

  var data = '';
  live.pipe(through(function (chunk) {
    data += chunk;
    t.ok(true, 'chunk');
    if (data == fixture) t.end();
  }));

  fs.createReadStream(__dirname + '/fixtures/file.txt')
  .pipe(store(db).createWriteStream('file'));
});

test('append', function (t, db) {
  var first = store(db).createWriteStream('key');
  first.write('foo');
  first.on('close', function () {
    var second = store(db).createWriteStream('key', { append : true });
    second.write('bar');
    second.on('close', function () {
      var data = '';
      store(db).createReadStream('key')
      .on('data', function (d) { data += d })
      .on('end', function () {
        t.equal(data, 'foobar', 'appended values');
        t.end();
      })
    });
    second.end();
  });
  first.end();
});

test('replace', function (t, db) {
  var first = store(db).createWriteStream('key');
  first.write('foo');
  first.on('close', function () {
    var second = store(db).createWriteStream('key');
    second.write('bar');
    second.on('close', function () {
      var data = '';
      store(db).createReadStream('key')
      .on('data', function (d) { data += d })
      .on('end', function () {
        t.equal(data, 'bar', 'deleted');
        t.end();
      })
    });
    second.end();
  });
  first.end();
});

test('capped', function (t, db) {
  var ws = store(db).createWriteStream('key', { capped : 2 });
  ws.write('foo');
  ws.write('bar');
  ws.write('baz');
  ws.end();

  ws.on('close', function () {
    var data = [];
    store(db).createReadStream('key')
    .on('data', function (d) { data.push(d) })
    .on('end', function () {
      t.deepEqual(data, ['bar', 'baz'], 'deleted first');
      t.end();
    });
  });
});

test('capped appending', function (t, db) {
  var ws = store(db).createWriteStream('key');
  ws.write('foo');
  ws.end();

  ws.on('close', function () {
    ws = store(db).createWriteStream('key', { capped : 1, append : true });
    ws.write('bar');
    ws.write('baz');
    ws.end();

    ws.on('close', function () {
      setTimeout(function () {
        var data = [];
        store(db).createReadStream('key')
        .on('data', function (d) { data.push(d) })
        .on('end', function () {
          t.deepEqual(data, ['baz'], 'capped to 1');
          t.end();
        });
      }, 500);
    });
  });
});

test('exists', function (t, db) {
  store(db).exists('foo', function (err, exists) {
    t.error(err, 'no error');
    t.equal(exists, false, 'initially false');

    var ws = store(db).createWriteStream('foo');
    ws.on('close', function () {
      store(db).exists('foo', function (err, exists) {
        t.error(err, 'no error');
        t.equal(exists, true, 'now exists');
        t.end();
      });
    });
    ws.write('bar');
    ws.write('baz');
    ws.end();
  });
});

test('append(key, value, cb)', function (t, db) {
  store(db).append('foo', 'bar', function (err) {
    t.error(err, 'no error');
    
    store(db).createReadStream('foo').on('data', function (d) {
      t.equal(d, 'bar', 'created');

      store(db).append('foo', 'baz', function (err) {
        t.error(err);

        var data = '';
        store(db).createReadStream('foo')
        .on('data', function (d) { data += d })
        .on('end', function () {
          t.equal(data, 'barbaz', 'appended');
          t.end();
        });
      });
    });
  });
});

function test (name, cb) {
  if (!cb) return tap.test(name);
  tap.test(name, function (t) {
    var path = os.tmpDir() + '/'
    path += Math.random().toString(16).slice(2)
    path += '-level-store-test';

    cb(t, levelup(path));
  });
}
