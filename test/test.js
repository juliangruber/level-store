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
    .pipe(stream(db, 'file'))
    .on('end', function () {
      var data = '';
      stream(db, 'file')
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
    .pipe(stream(db, 'file'))
    .on('end', function () {
      var data = '';
      stream(db, 'file2')
      .pipe(through(function (chunk) {
        data += chunk;
      }))
      .on('end', function () {
        t.equal(data, '');
        t.end();
      });
    });
});

test('extend', function (t, db) {
  stream(db);
  fs.createReadStream(__dirname + '/fixtures/file.txt')
    .pipe(stream(db, 'file'))
    .on('end', function () {
      var data = '';
      db.stream(db, 'file')
      .pipe(through(function (chunk) {
        data += chunk;
      }))
      .on('end', function () {
        t.equal(data, fixture);
        t.end();
      });
    });
});

test('event#data listeners', function (t, db) {
  fs.createReadStream(__dirname + '/fixtures/file.txt')
    .pipe(stream(db, 'file'))
    .on('end', function () {
      var data = '';
      stream(db, 'file')
      .on('data', function (chunk) {
        data += chunk;
      })
      .on('end', function () {
        t.equal(data, fixture);
        t.end();
      });
    });
});

test('timestamps', function (t, db) {
  fs.createReadStream(__dirname + '/fixtures/file.txt')
    .pipe(stream(db, 'file'))
    .on('end', function () {
      stream(db, 'file', { ts : true })
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
    .pipe(stream(db, 'file'))
    .on('end', function () {
      stream(db, 'file', { ts : true }).once('data', function (chunk) {
        stream(db, 'file', { since : chunk.ts }).on('data', function (chunk) {
          t.ok(chunk);
        });
      });
    });
});

test('live');

function test (name, cb) {
  if (!cb) return tap.test(name);
  tap.test(name, function (t) {
    var path = os.tmpDir() + '/'
    path += Math.random().toString(16).slice(2)
    path += '-level-stream-test';

    cb(t, levelup(path));
  });
}
