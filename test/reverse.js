var test = require('./util');
var Store = require('..');

test('reverse', function (t, db) {
  t.plan(2);
  var store = Store(db);
  var ws = store.createWriteStream('reverse');
  ws.write('first');
  ws.write('last');
  ws.end();
  ws.on('close', function () {
    console.log('written')
    var i = 0;
    store.createReadStream('reverse', { reverse: true }).on('data', function (d) {
      console.log('d', d)
      t.equal(d, [ 'last', 'first' ][i++]);
    });
  });
});
