var test = require('./util');
var Store = require('..');

test('forward key-stream', function (t, db) {
  t.plan(3);
  var store = Store(db);

  store.set('a', ' ', function (err) {
    t.error(err);
    store.set('b', ' ', function (err) {
      t.error(err);
      var keys = [];
      store.createKeyStream()
        .on('data', function (key) {
          keys.push(key);
        })
        .on('end', function () {
          t.deepEqual(keys, ['a', 'b']);
        });
    });
  });
});

test('backward key-stream', function (t, db) {
  t.plan(3);
  var store = Store(db);

  store.set('a', ' ', function (err) {
    t.error(err);
    store.set('b', ' ', function (err) {
      t.error(err);
      var keys = [];
      store.createKeyStream({ reverse: true })
        .on('data', function (key) {
          keys.push(key);
        })
        .on('end', function () {
          t.deepEqual(keys, ['b', 'a']);
        });
    });
  });
});
