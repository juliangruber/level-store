var test = require('./util');
var Store = require('..');

test('replace', function (t, db) {
  var store = Store(db);

  var first = store.createWriteStream('key');
  first.write('foo');
  first.on('close', function () {
    
    var second = store.createWriteStream('key');
    second.write('bar');
    second.on('close', function () {
      
      var data = '';
      store.createReadStream('key')
      .on('data', function (d) { data += d })
      .on('end', function () {
        t.equal(data, 'bar', 'deleted');
        t.end();
      })
    });
    second.end();
  });
  first.end();
});
