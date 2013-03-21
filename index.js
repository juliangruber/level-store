var through = require('through');
var duplexer = require('duplexer');
var timestamp = require('monotonic-timestamp');
var livefeed = require('level-livefeed');
var deleteRange = require('level-delete-range');

module.exports = stream;

function stream (db) {
  if (!(this instanceof stream)) return new stream(db);
  this.db = db;
}

// TODO: add end to ranges!

stream.prototype.createWriteStream = function (key, opts) {
  if (!opts) opts = {};

  var tr = through(function (chunk) {
    this.queue({
      key : key + '!' + timestamp(),
      value : chunk
    });
  });

  var ws = this.db.createWriteStream();

  var dpl = duplexer(tr, tr.pipe(ws));

  if (!opts.append) {
    tr.pause();
    deleteRange(this.db, {
      start : key + '!',
    }, function (err) {
      if (err) dpl.emit('error', err);
      tr.resume();
    });
  }

  return dpl;
}

stream.prototype.createReadStream = function (key, opts) {
  if (!opts) opts = {};

  var start = key + '!';
  if (opts.since) start += opts.since;

  var cfg = {
    start : start
  };

  var rs = opts.live
    ? livefeed(this.db, cfg)
    : this.db.createReadStream(cfg)

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
