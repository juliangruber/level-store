var test = require('./util');
var Store = require('..');

test('capped', function (t, db) {
  var store = Store(db);

  var ws = store.createWriteStream('key', { capped : 2 });
  ws.write('foo');
  ws.write('bar');
  ws.write('baz');
  ws.end();
  ws.on('close', function () {

    var data = [];

    store
      .createReadStream('key')
      .on('data', function (d) { data.push(d) })
      .on('end', function () {
        t.deepEqual(data, ['bar', 'baz'], 'deleted first');
        t.end();
      });
  });
});
