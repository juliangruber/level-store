var through = require('through');
var duplexer = require('duplexer');
var levelUp = require('levelup');
var livefeed = require('level-livefeed');
var deleteRange = require('level-delete-range');
var indexes = require('./indexes');

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

  var index = indexes[self.index](self.db, key);

  var input = through().pause();

  var ws = self.db.createWriteStream();
  var dpl = duplexer(input, ws);

  input
    .pipe(index.addKey)
    .pipe(ws);

  if (opts.append) {
    index.initialize(onReady);
  } else {
    self.delete(key, onReady);
  }

  function onReady (err) {
    if (err) dpl.emit('error', err);
    input.resume();
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

  var index = indexes[this.index](this.db, key);

  var addIndex = through(function (chunk) {
    this.queue({
      index : chunk.key.slice(key.length + 1),
      data : chunk.value
    });
  });

  var removeIndex = through(function (chunk) {
    this.queue(chunk.data);
  });

  var res = rs.pipe(addIndex);
  if (index.filter) res = res.pipe(index.filter);
  if (!opts.index && !opts.from) res = res.pipe(removeIndex);
  return res;
}
