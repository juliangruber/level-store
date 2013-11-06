var test = require('./util');
var fs = require('fs');
var through = require('through');
var Store = require('..');

var fixture = fs.readFileSync(__dirname + '/fixtures/file.txt', 'utf8');

test('opts', function (t, db) {
  var ws = db.createWriteStream;
  var rs = db.createReadStream;

  db.createWriteStream = db.writeStream = function(opts) {
    t.equal(opts.valueEncoding, 'binary');
    return ws.call(db, opts);
  };
  db.createReadStream = db.readStream = function(opts) {
    if (opts.values !== false) {
      t.equal(opts.valueEncoding, 'binary');
    }
    return rs.call(db, opts);
  };

  var store = Store(db);
  fs.createReadStream(__dirname + '/fixtures/file.txt')
    .pipe(store.createWriteStream('file', { valueEncoding: 'binary' }))
    .on('close', function () {
      var data = '';
      store.createReadStream('file', { valueEncoding: 'binary' })
      .pipe(through(function (chunk) {
        data += chunk;
      }))
      .on('end', function () {
        t.equal(data, fixture);
        t.end();
      });
    });
});

