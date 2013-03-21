var through = require('through');
var duplexer = require('duplexer');
var timestamp = require('monotonic-timestamp');
var livefeed = require('level-livefeed');

module.exports = stream;

function stream (db) {
  if (!(this instanceof stream)) return new stream(db);
  this.db = db;
}

stream.prototype.createWriteStream = function (key, opts) {
  if (!opts) opts = {};

  var tr = through(function (chunk) {
    this.queue({
      key : key + '!' + timestamp(),
      value : chunk
    })
  })

  var ws = this.db.createWriteStream();

  return duplexer(tr, tr.pipe(ws));
}

stream.prototype.createReadStream = function (key, opts) {
  if (!opts) opts = {};

  var start = key + '!';
  if (opts.since) start += opts.since;

  var rs = opts.live
    ? livefeed(this.db, { start : start })
    : this.db.createReadStream({ start : start })

  return rs.pipe(through(function (chunk) {
    chunk = {
      ts : chunk.key.slice(key.length + 1),
      data : chunk.value
    };
    if (opts.since && chunk.ts == opts.since) return;
    if (!opts.ts && !opts.since) chunk = chunk.data;

    this.queue(chunk);
  }));
}
