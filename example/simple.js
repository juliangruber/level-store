var Store = require('..');
var os = require('os');
var fs = require('fs');

var store = Store(os.tmpDir() + '/level-store-example');

fs.createReadStream(__dirname + '/file.txt')
  .pipe(store.createWriteStream('file'))
  .on('close', function () {
    store.createReadStream('file').pipe(process.stdout);
  });
