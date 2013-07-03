var ben = require('ben');
var Store = require('..');
var level = require('level');
var fs = require('fs');
var rimraf = require('rimraf');

// ~0.11 ms

rimraf.sync(__dirname + '/.db');
level(__dirname + '/.db', { valueEncoding: 'binary' }, function (err, db) {
  if (err) throw err;

  var store = Store(db);
  fs.createReadStream(__dirname + '/cat.jpg')
    .pipe(store.createWriteStream('cat'))
    .on('close', function () {
      var test = function (done) {
        store.createReadStream('cat').on('close', done);
      };

      ben.async(10000, test, function (ms) {
        console.log('%s milliseconds per iteration', ms);
      });
    });
});
