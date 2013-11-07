var Store = require('..');
var os = require('os');
var fs = require('fs');
var level = require('level');

var store = Store(level(os.tmpDir() + '/level-store-example'));

fs.createReadStream(__dirname + '/file.txt')
  .pipe(store.createWriteStream('file'))
  .on('close', function () {
    store.createReadStream('file').pipe(process.stdout);
  });
