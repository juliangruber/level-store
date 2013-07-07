var test = require('./util');
var Store = require('..');

test('set stream', function (t, db) {
  t.plan(6);
  var store = Store(db);

  store.set('foo', 'bar', function (err) {
    t.error(err);
    store.get('foo', function (err, data) {
      t.error(err);
      t.equal(data, 'bar');
      store.set('foo', 'baz', function (err) {
        t.error(err);
        store.get('foo', function (err, data) {
          t.error(err);
          t.equal(data, 'baz');
        });
      });
    })
  });
});
