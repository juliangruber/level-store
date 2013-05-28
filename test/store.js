var test = require('./util');
var fs = require('fs');
var through = require('through');
var Store = require('..');

var fixture = fs.readFileSync(__dirname + '/fixtures/file.txt', 'utf8');

test('level-store', function (t, db) {
  var store = Store(db);
  fs.createReadStream(__dirname + '/fixtures/file.txt')
    .pipe(store.createWriteStream('file'))
    .on('close', function () {
      var data = '';
      store.createReadStream('file')
      .pipe(through(function (chunk) {
        data += chunk;
      }))
      .on('end', function () {
        t.equal(data, fixture);
        t.end();
      });
    });
});
