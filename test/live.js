var test = require('./util');
var through = require('through');
var fs = require('fs');
var Store = require('..');

var fixture = fs.readFileSync(__dirname + '/fixtures/file.txt', 'utf8');

test('live', function (t, db) {
  var data = '';
  var store = Store(db);
  var live = store.createReadStream('file', { live : true });

  var data = '';
  live.pipe(through(function (chunk) {
    data += chunk;
    t.ok(true, 'chunk');
    if (data == fixture) t.end();
  }));

  fs.createReadStream(__dirname + '/fixtures/file.txt')
  .pipe(store.createWriteStream('file'));
});
