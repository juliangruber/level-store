var test = require('./util');
var fs = require('fs');
var through = require('through');
var Store = require('..');

var fixture = fs.readFileSync(__dirname + '/fixtures/file.txt', 'utf8');

test('resume', function (t, db) {
  t.plan(1);

  var store = Store(db);
  var ws = store.createWriteStream('file');
  ws.write('foo');
  ws.write('bar');
  ws.end();

  ws.on('close', function () {

    store.createReadStream('file', { index: true })
    .once('data', function (chunk) {

      store.createReadStream('file', { gt: chunk.index })
      .on('data', function (chunk) {

        t.ok(chunk, 'received data');
      });
    });
  });
});
