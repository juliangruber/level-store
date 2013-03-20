var through = require('through');
var duplexer = require('duplexer');
var timestamp = require('monotonic-timestamp');

module.exports = stream;

function stream (db, key, opts) {
  if (typeof key == 'undefined') {
    return db.stream = stream.bind(null, db);
  }

  if (!opts) opts = {};

  var writing = false;

  var output = through();
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

  var dpl = duplexer(input, output);

  dpl.on('newListener', function onListener (type) {
    if (type != 'data') return;
   
    var start = key + '!';
    if (opts.since) start += opts.since;

    db.createReadStream({ start : start })
    .pipe(through(function (chunk) {
      chunk = {
        ts : chunk.key.slice(key.length + 1),
        data : chunk.value
      };
      if (opts.since && chunk.ts == opts.since) return;
      if (!opts.ts && !opts.since) chunk = chunk.data;

      this.queue(chunk);
    }))
    .pipe(output);

    // maybe remove this line, prevents multiple listeners
    dpl.removeListener('newListener', onListener);
  });

  return dpl;
}
