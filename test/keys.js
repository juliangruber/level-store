var test = require('./util');
var Store = require('..');

test('keys', function (t, db) {
  t.plan(4);
  var store = Store(db);

  store.set('a', ' ', function (err) {
    t.error(err);
    store.set('b', ' ', function (err) {
      t.error(err);
      store.keys(function (err, keys) {
        t.error(err);
        t.deepEqual(keys, ['a', 'b']);
      });
    });
  });
});
