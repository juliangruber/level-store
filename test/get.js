var test = require('./util');
var Store = require('..');

test('get existing stream', function (t, db) {
  t.plan(4);
  var store = Store(db);

  store.append('foo', 'bar', function (err) {
    t.error(err);
    store.append('foo', 'baz', function (err) {
      t.error(err);
      store.get('foo', function (err, data) {
        t.error(err);
        t.equal(data, 'barbaz');
      }); 
    });
  });
});

test('get non existing stream', function (t, db) {
  t.plan(1);
  Store(db).get('foo', function (err) {
    t.ok(err);
  });
});
