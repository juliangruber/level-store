var test = require('./util');
var Store = require('..');

test('exists', function (t, db) {
  var store = Store(db);

  store.exists('foo', function (err, exists) {
    t.error(err, 'no error');
    t.equal(exists, false, 'initially false');

    var ws = store.createWriteStream('foo');
    ws.write('bar');
    ws.write('baz');
    ws.end();
    ws.on('close', function () {
      store.exists('foo', function (err, exists) {
        t.error(err, 'no error');
        t.equal(exists, true, 'now exists');
        t.end();
      });
    });
  });
});
