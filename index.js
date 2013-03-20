var through = require('through');
var duplexer = require('duplexer');
var timestamp = require('monotonic-timestamp');

module.exports = stream;

function stream (db, key) {
  if (typeof key == 'undefined') {
    return db.stream = stream.bind(null, db);
  }

  var writing = false;

  var input = through(function (chunk) {
    if (!writing) {
      writing = true;

      var ws = db.createWriteStream();
      ws.on('close', output.end.bind(output));

      input.pipe(ws);
    }

    this.queue({
      key : key + '!' + timestamp(),
      value : chunk
    });
  });

  var output = through();

  var dpl = duplexer(input, output);

  dpl.on('newListener', function onListener (type) {
    if (type != 'data') return;
    db.createValueStream({ start : key + '!' }).pipe(output);
    // maybe remove this line, prevents multiple listeners
    dpl.removeListener('newListener', onListener);
  });

  return dpl;
}
