var stream = require('..');
var levelup = require('levelup');
var os = require('os');
var fs = require('fs');
var rimraf = require('rimraf');

var path = os.tmpDir() + '/level-stream-example';

rimraf.sync(path);
var db = levelup(path);

fs.createReadStream(__dirname + '/file.txt')
  .pipe(stream(db, 'file'))
  .on('end', function () {
    stream(db, 'file').pipe(process.stdout);
  });
