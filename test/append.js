var test = require('./util');
var Store = require('..');

test('append', function (t, db) {
  var store = Store(db);

  var first = store.createWriteStream('key');
  first.write('foo');
  first.on('close', function () {
    
    var second = store.createWriteStream('key', { append : true });
    second.write('bar');
    second.on('close', function () {
      
      var data = '';
      store.createReadStream('key')
      .on('data', function (d) { data += d })
      .on('end', function () {
        t.equal(data, 'foobar', 'appended values');
        t.end();
      })
    });
    second.end();
  });
  first.end();
});

test('sugar', function (t, db) {
  var store = Store(db);
  store.append('foo', 'bar', function (err) {
    t.error(err, 'no error');
    
    store.createReadStream('foo').on('data', function (d) {
      t.equal(d, 'bar', 'created');

      store.append('foo', 'baz', function (err) {
        t.error(err);

        var data = '';
        store.createReadStream('foo')
        .on('data', function (d) { data += d })
        .on('end', function () {
          t.equal(data, 'barbaz', 'appended');
          t.end();
        });
      });
    });
  });
});

