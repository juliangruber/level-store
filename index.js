var through = require('through');
var duplexer = require('duplexer');
var timestamp = require('monotonic-timestamp');
var levelUp = require('levelup');
var livefeed = require('level-livefeed');
var deleteRange = require('level-delete-range');
var peek = require('level-peek');
var padHex = require('./util').padHex;
var unpadHex = require('./util').unpadHex;

module.exports = store;

function noop () {}

function store (db, opts) {
  if (!(this instanceof store)) return new store(db, opts);

  this.db = typeof db == 'string'
    ? levelUp(db)
    : db;

  if (!opts) opts = {};

  this.index = opts.index || 'timestamp';
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

  var length = 0;

  var input = through();

  var addKey = through(self.index == 'length'
    ? function (chunk) {
        length += chunk.length;
        this.queue({
          key : key + ' ' + padHex(length),
          value : chunk
        });
      }
    : function (chunk) {
        this.queue({
          key : key + ' ' + timestamp(),
          value : chunk
        });
      }
  )

  var ws = self.db.createWriteStream();
  var dpl = duplexer(input, ws);

  input.pipe(addKey).pipe(ws);

  if (opts.append && self.index == 'length') {
    input.pause();
    peek.last(self.db, {
      reverse : true,
      start : key + ' ',
      end : key + '~'
    }, function (err, lastKey) {
      if (!err) length = unpadHex(lastKey.substr(key.length + 1));
      input.resume();
    });
  } else if (!opts.append) {
    input.pause();
    self.delete(key, function (err) {
      if (err) dpl.emit('error', err);
      input.resume();
    });
  }

  return dpl;
}

store.prototype.createReadStream = function (key, opts) {
  if (!opts) opts = {};

  var start = key + ' ';
  if (opts.from) start += opts.from;

  var cfg = {
    start : start,
    end : key + '~'
  };

  var rs = opts.live
    ? livefeed(this.db, cfg)
    : this.db.createReadStream(cfg)

  return rs.pipe(through(function (chunk) {
    chunk = {
      index : chunk.key.slice(key.length + 1),
      data : chunk.value
    };
    if (opts.from && chunk.index == opts.from) return;
    if (!opts.index && !opts.from) chunk = chunk.data;

    this.queue(chunk);
  }));
}
