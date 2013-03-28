var through = require('through');
var duplexer = require('duplexer');
var timestamp = require('monotonic-timestamp');
var livefeed = require('level-livefeed');
var deleteRange = require('level-delete-range');
var levelUp = require('levelup');

module.exports = store;

function noop () {}

function store (db) {
  if (!(this instanceof store)) return new store(db);
  this.db = typeof db == 'string'
    ? levelUp(db)
    : db;
}

store.prototype.delete = function (key, cb) {
  deleteRange(this.db, {
    start : key + ' ',
    end : key + '~'
  }, cb || noop);
}

store.prototype.createWriteStream = function (key, opts) {
  var self = this;
  if (!opts) opts = {};

  var tr = through(function (chunk) {
    this.queue({
      key : key + ' ' + timestamp(),
      value : chunk
    });
  });

  var ws = self.db.createWriteStream();

  var dpl = duplexer(tr, tr.pipe(ws));

  if (!opts.append) {
    tr.pause();
    self.delete(key, function (err) {
      if (err) dpl.emit('error', err);
      tr.resume();
    });
  }

  return dpl;
}

store.prototype.createReadStream = function (key, opts) {
  if (!opts) opts = {};

  var start = key + ' ';
  if (opts.since) start += opts.since;

  var cfg = {
    start : start,
    end : key + '~'
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
