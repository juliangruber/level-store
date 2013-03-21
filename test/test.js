var stream = require('..');
var levelup = require('levelup');
var os = require('os');
var fs = require('fs');
var rimraf = require('rimraf');
var through = require('through');
var tap = require('tap');

var fixture = fs.readFileSync(__dirname + '/fixtures/file.txt').toString();

test('level-stream', function (t, db) {
  fs.createReadStream(__dirname + '/fixtures/file.txt')
    .pipe(stream(db).createWriteStream('file'))
    .on('close', function () {
      var data = '';
      stream(db).createReadStream('file')
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
    .pipe(stream(db).createWriteStream('file'))
    .on('close', function () {
      var data = '';
      stream(db).createReadStream('file2')
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
    .pipe(stream(db).createWriteStream('file'))
    .on('close', function () {
      stream(db).createReadStream('file', { ts : true })
      .pipe(through(function (chunk) {
        t.ok(chunk.ts);
        t.ok(chunk.data);
      }))
      .on('end', t.end.bind(t));
    });
});

test('resume', function (t, db) {
  t.plan(1);

  fs.createReadStream(__dirname + '/fixtures/file.txt')
    .pipe(stream(db).createWriteStream('file'))
    .on('close', function () {
      stream(db).createReadStream('file', { ts : true })
      .once('data', function (chunk) {
        stream(db).createReadStream('file', { since : chunk.ts })
        .on('data', function (chunk) {
          t.ok(chunk);
        });
      });
    });
});

test('live', function (t, db) {
  var data = '';

  var live = stream(db).createReadStream('file', { live : true });

  var data = '';
  live.pipe(through(function (chunk) {
    data += chunk;
    if (data == fixture) t.end();
  }));

  fs.createReadStream(__dirname + '/fixtures/file.txt')
  .pipe(stream(db).createWriteStream('file'));
});

test('append', function (t, db) {
  var first = stream(db).createWriteStream('key');
  first.write('foo');
  first.on('close', function () {
    var second = stream(db).createWriteStream('key', { append : true });
    second.write('bar');
    second.on('close', function () {
      var data = '';
      stream(db).createReadStream('key')
      .on('data', function (d) { data += d })
      .on('end', function () {
        t.equal(data, 'foobar');
        t.end();
      })
    });
    second.end();
  });
  first.end();
});

test('replace');

function test (name, cb) {
  if (!cb) return tap.test(name);
  tap.test(name, function (t) {
    var path = os.tmpDir() + '/'
    path += Math.random().toString(16).slice(2)
    path += '-level-stream-test';

    cb(t, levelup(path));
  });
}
