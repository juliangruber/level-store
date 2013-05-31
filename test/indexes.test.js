var Store = require('..');
var test = require('./util');
var fs = require('fs');
var rimraf = require('rimraf');
var through = require('through');

test('indexes', function (t, db) {
  var store = Store(db);

  fs.createReadStream(__dirname + '/fixtures/file.txt')
    .pipe(store.createWriteStream('file'))
    .on('close', function () {
      store.createReadStream('file', { index: true })
      .pipe(through(function (chunk) {
        t.ok(chunk.index, 'chunk index');
        t.ok(chunk.data, 'chunk data');
      }))
      .on('end', t.end.bind(t));
    });
});

test('timestamp', function (t, db) {
  var store = Store(db);

	t.test('index value', function (t) {
		t.plan(2);
		var now = Date.now();

		store.append('foo', 'value', function (err) {
			t.error(err);
			
			store.createReadStream('foo', { index: true })
			.pipe(through(function (chunk) {
				t.assert(chunk.index >= now && chunk.index < now + 5000);
			}));
		});
	});

  t.test('store', function (t) {
    var ws = store.createWriteStream('file');

    ws.on('close', function () {
      var firstIndex;
      var i = 0;
 
      store.createReadStream('file', { index: true })
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
        store.createReadStream('file', { gt: index, index: true })
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

	t.test('index value', function (t) {
		t.plan(2);

		store.append('foo', 'value', function (err) {
			t.error(err);
			
			store.createReadStream('foo', { index: true })
			.pipe(through(function (chunk) {
				t.equal(chunk.index, 0);
			}));
		});
	});

  t.test('store', function (t) {
    var ws = store.createWriteStream('file');

    ws.on('close', function () {
      var i = 0;
      
      store.createReadStream('file', { index: true })
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

      store.createReadStream('file', { gt: 0, index: true })
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

