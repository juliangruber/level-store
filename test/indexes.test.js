var Store = require('..');
var levelup = require('levelup');
var os = require('os');
var fs = require('fs');
var rimraf = require('rimraf');
var through = require('through');
var tap = require('tap');

test('timestamp', function (t, db) {
  var store = Store(db);

  t.test('store', function (t) {
    var ws = store.createWriteStream('file');

    ws.on('close', function () {
      var firstIndex;
      var i = 0;
      
      store.createReadStream('file', { index : true })
      .pipe(through(function (chunk) {
        if (i++ == 0) {
          firstIndex = chunk.index;
        } else {
          t.ok(chunk.index > firstIndex, 'monotonically increasing');
          t.end();
        }
      }))
    });

    ws.write('foo');
    ws.write('bar');
    ws.end();
  });

  t.test('resume', function (t) {
    t.plan(2);
    var ws = store.createWriteStream('file');

    ws.on('close', function () {
      var index;
      
      store.createReadStream('file', { index : true })
      .pipe(through(function (chunk) {
        if (!index) index = chunk.index;
      }))
      .on('end', function () {
        store.createReadStream('file', { from : index })
        .pipe(through(function (chunk) {
          t.notEqual(chunk.index, index, 'skips given index');
          t.equal(chunk.data, 'bar');
        }));
      });
    });

    ws.write('foo');
    ws.write('bar');
    ws.end();
  });
});

test('bytelength', function (t, db) {
  var store = Store(db, { index : 'bytelength' });

  t.test('store', function (t) {
    var ws = store.createWriteStream('file');

    ws.on('close', function () {
      var i = 0;
      
      store.createReadStream('file', { index : true })
      .pipe(through(function (chunk) {
        if (i++ == 0) {
          t.equal(chunk.index, '00000003', '3 bytes');
        } else {
          t.equal(chunk.index, '00000006', '6 bytes');
          t.end();
        }
      }))
    });

    ws.write('foo');
    ws.write('bar');
    ws.end();
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
