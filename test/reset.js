var test = require('./util');
var Store = require('..');

test('reset existing stream', function (t, db) {
  t.plan(4);
  var store = Store(db);

  store.append('foo', 'bar', function (err) {
    t.error(err);
    store.reset('foo', function (err) {
      t.error(err);
      store.exists('foo', function (err, exists) {
        t.error(err);
        t.notOk(exists);
      });
    });
  });
});

test('reset non existing stream', function (t, db) {
  t.plan(1);
  Store(db).reset('foo', function (err) {
    t.notOk(err);
  });
});
