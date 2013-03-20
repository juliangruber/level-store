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

  var pipe = dpl.pipe;
  dpl.pipe = function (dest, opts) {
    pipe.apply(dpl, arguments);
    db.createValueStream({ start : key + '!' }).pipe(output);
    return dest;
  }

  return dpl;
}
