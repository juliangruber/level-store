var test = require('./util');
var Store = require('..');

test('capped appending', function (t, db) {
  var store = Store(db);
  var ws = store.createWriteStream('key');
  ws.write('foo');
  ws.end();
  ws.on('close', function () {

    ws = store.createWriteStream('key', { capped : 1, append : true });
    ws.write('bar');
    ws.write('baz');
    ws.end();
    ws.on('close', function () {

      setTimeout(function () {
        var data = [];
        store.createReadStream('key')
        .on('data', function (d) { data.push(d) })
        .on('end', function () {
          t.deepEqual(data, ['baz'], 'capped to 1');
          t.end();
        });
      }, 500);
    });
  });
});
