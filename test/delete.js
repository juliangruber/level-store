var test = require('./util');
var Store = require('..');

test('delete existing stream', function (t, db) {
  t.plan(4);
  var store = Store(db);

  store.append('foo', 'bar', function (err) {
    t.error(err);
    store.delete('foo', function (err) {
      t.error(err);
      store.exists('foo', function (err, exists) {
        t.error(err);
        t.notOk(exists);
      });
    });
  });
});

test('delete non existing stream', function (t, db) {
  t.plan(1);
  Store(db).delete('foo', function (err) {
    t.ok(err);
  });
});
