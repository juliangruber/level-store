var Store = require('..');
var levelup = require('level');
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
      
      store.createReadStream('file', { index: true })
      .pipe(through(function (chunk) {
        if (!index) index = chunk.index;
      }))
      .on('end', function () {
        store.createReadStream('file', { from: index, index: true })
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

test('chunks', function (t, db) {
  var store = Store(db, { index : 'chunks' });

  t.test('store', function (t) {
    var ws = store.createWriteStream('file');

    ws.on('close', function () {
      var i = 0;
      
      store.createReadStream('file', { index : true })
      .pipe(through(function (chunk) {
        if (i++ == 0) {
          t.equal(chunk.index, 0, 'first chunk');
        } else {
          t.equal(chunk.index, 1, 'second chunk');
          t.end();
        }
      }))
    });

    ws.write('foo');
    ws.write('bar');
    ws.end();
  });

  t.test('resume', function (t) {
    var ws = store.createWriteStream('file');

    ws.on('close', function () {
      var data = '';

      store.createReadStream('file', { from: 0, index: true })
      .pipe(through(function (chunk) {
        t.equal(chunk.index, 1, 'second chunk');
        t.end();
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

/*test('bytelength', function (t, db) {
  var store = Store(db, { index : 'bytelength' });

  t.test('store', function (t) {
    var ws = store.createWriteStream('file');

    ws.on('close', function () {
      var i = 0;
      
      store.createReadStream('file', { index : true })
      .pipe(through(function (chunk) {
        if (i++ == 0) {
          t.equal(chunk.index, 3, '3 bytes');
        } else {
          t.equal(chunk.index, 6, '6 bytes');
          t.end();
        }
      }))
    });

    ws.write('foo');
    ws.write('bar');
    ws.end();
  });

  '000000'.split('').forEach(function (_, i) {
    t.test('resume ' + i, function (t) {
      console.log('RESUME')
      var ws = store.createWriteStream('file');

      ws.on('close', function () {
        var data = '';

        store.createReadStream('file', { from : i })
        .pipe(through(function (chunk) {
          data += chunk.data;
        }))
        .on('end', function () {
          t.equal(data, 'foobar'.substr(i - 5));
          t.end();
        });
      });

      ws.write('foo');
      ws.write('bar');
      ws.end();
    });
  })

  t.test('resume', function (t) {
    var ws = store.createWriteStream('file');

    ws.on('close', function () {
      var data = '';

      store.createReadStream('file', { from : 1 })
      .pipe(through(function (chunk) {
        data += chunk.data;
      }))
      .on('end', function () {
        t.equal(data, 'obar');
        t.end();
      });
    });

    ws.write('foo');
    ws.write('bar');
    ws.end();
  });

  t.test('resume 2', function (t) {
    var ws = store.createWriteStream('file');

    ws.on('close', function () {
      var data = '';

      store.createReadStream('file', { from : 2 })
      .pipe(through(function (chunk) {
        data += chunk.data;
      }))
      .on('end', function () {
        t.equal(data, 'bar');
        t.end();
      });
    });

    ws.write('foo');
    ws.write('bar');
    ws.end();
  });
});*/
