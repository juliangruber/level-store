var Store = require('..');
var os = require('os');
var level = require('level');

var store = Store(level(os.tmpDir() + '/level-store-capped'));

var ws = store.createWriteStream('updates', { capped : 2 });

ws.write('foo');
ws.write('bar');
ws.write('baz');
ws.end();

ws.on('close', function () {
  store.createReadStream('updates').on('data', console.log);
});
