var through = require('through');
var duplexer = require('duplexer');
var timestamp = require('monotonic-timestamp');
var livefeed = require('level-livefeed');
var deleteRange = require('level-delete-range');
var levelUp = require('levelup');
var cap = require('level-capped');

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
};

store.prototype.exists = function (key, cb) {
  this.db.get(key, function (err) {
    return cb( null, !!err )
  })
};

store.prototype.createWriteStream = function (key, opts) {
  if (!opts) opts = {};

  var input = through(function (chunk, cb) {
    this.queue({
      key : key + ' ' + timestamp(),
      value : chunk
    });
  });

  var ws = this.db.createWriteStream();
  var dpl = duplexer(input, input.pipe(ws));

  if (typeof opts.capped != 'undefined') {
    var capped = cap(this.db, key, opts.capped);
    ws.on('end', capped.end.bind(capped));
  }

  // append
  if (!opts.append) {
    input.pause();
    this.delete(key, function (err) {
      if (err) dpl.emit('error', err);
      input.resume();
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

store.prototype.append = function (key, value, cb) {
  if (!cb) cb = function () {};
  var ws = this.createWriteStream(key, { append : true });
  ws.on('close', cb);
  ws.on('error', cb);
  ws.write(value);
  ws.end();
}
