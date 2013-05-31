var test = require('./util');
var fs = require('fs');
var through = require('through');
var Store = require('..');

var fixture = fs.readFileSync(__dirname + '/fixtures/file.txt', 'utf8');

test('end', function (t, db) {
  t.plan(3);

  var store = Store(db);
  var ws = store.createWriteStream('file');
  ws.write('foo');
  ws.write('bar');
  ws.write('baz');
  ws.end();

  var i = 0;

  ws.on('close', function () {
    store.createReadStream('file', { index: true })
    .on('data', function (chunk) {
      if (i++ != 2) return;
      store.createReadStream('file', { lte: chunk.index })
      .on('data', function (chunk) {
        t.ok(chunk, 'received data');
      });
    });
  });
});
