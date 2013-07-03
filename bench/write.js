var ben = require('ben');
var Store = require('..');
var level = require('level');
var fs = require('fs');
var rimraf = require('rimraf');

// ~1.32ms

rimraf.sync(__dirname + '/.db');
level(__dirname + '/.db', { valueEncoding: 'binary' }, function (err, db) {
  if (err) throw err;

  var store = Store(db);

  var test = function (done) {
    fs.createReadStream(__dirname + '/cat.jpg')
      .pipe(store.createWriteStream(Math.random()+''))
      .on('close', done);
  };

  ben.async(1000, test, function (ms) {
    console.log('%s milliseconds per iteration', ms);
  });
});
