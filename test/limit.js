var test = require('./util');
var Store = require('..');

test('limit', function (t, db) {
  t.plan(3);
  var store = Store(db);

  store.append('foo', 'bar', function (err) {
    t.error(err);
    store.append('foo', 'baz', function (err) {
      t.error(err);
      store.createReadStream('foo', { limit: 1 }).on('data', function (str) {
        t.equals(str, 'bar');
      });
    })
  });
});
