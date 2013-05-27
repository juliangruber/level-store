var through = require('through');
var duplexer = require('duplexer');
var livefeed = require('level-livefeed');
var deleteRange = require('level-delete-range');
var cap = require('level-capped');
var indexes = require('./lib/indexes');

module.exports = Store;

function noop () {}

function Store (db, opts) {
  if (!(this instanceof Store)) return new Store(db, opts);
  this.db = db;
  this.index = (opts || {}).index || 'timestamp';
}

Store.prototype.delete = function (key, cb) {
  deleteRange(this.db, {
    start : key + ' ',
    end : key + '~'
  }, cb || noop);
};

Store.prototype.exists = function (key, cb) {
  var exists = false;
  var opts = {
    start : key + ' ',
    end : key + '~',
    limit : 1
  };

  var keys = this.db.createKeyStream(opts);

  keys.on('data', function () {
    exists = true;
    keys.destroy();
    cb(null, exists);
  });

  keys.on('end', function () {
    if (!exists) cb(null, false);
  });

  keys.on('error', cb);
};

Store.prototype.createWriteStream = function (key, opts) {
  if (!opts) opts = {};

  var index = indexes[opts.index || this.index](this.db, key);
  var input = through().pause();

  var ws = this.db.createWriteStream();
  var dpl = duplexer(input, ws);

  if (typeof opts.capped != 'undefined') {
    var capped = cap(this.db, key, opts.capped);
    ws.on('end', capped.end.bind(capped));
  }

  input
    .pipe(index.addKey)
    .pipe(ws);

  if (opts.append) {
    index.initialize(ready);
  } else {
    this.delete(key, ready);
  }

  function ready (err) {
    if (err) dpl.emit('error', err);
    input.resume();
  }

  return dpl;
}

Store.prototype.createReadStream = function (key, opts) {
  if (!opts) opts = {};

  var idx = typeof opts.index == 'string'
    ? opts.index
    : this.index;
  var index = indexes[idx](this.db, key);

  var start = key + ' ';
  if (typeof opts.from != 'undefined') start += index.from
    ? index.from(opts.from)
    : opts.from.toString(10);

  var end = typeof opts.to != 'undefined'
    ? key + ' ' + opts.to
    : key + '~'

  var cfg = { start: start, end: end };

  var rs = opts.live
    ? livefeed(this.db, cfg)
    : this.db.createReadStream(cfg)

  var addIndex = through(function (chunk) {
    this.queue({
      index: chunk.key.slice(key.length + 1),
      data: chunk.value
    });
  });

  var filter = index.filter
    ? index.filter(opts)
    : through(function (chunk) {
        if (typeof opts.from == 'undefined' || chunk.index > opts.from) {
          this.queue(chunk);
        }
      });

  var removeIndex = through(function (chunk) {
    this.queue(chunk.data);
  });

  var res = rs.pipe(addIndex).pipe(filter);

  return !opts.index && typeof opts.from == 'undefined'
    ? res.pipe(removeIndex)
    : res;
}

Store.prototype.append = function (key, value, cb) {
  if (!cb) cb = function () {};
  var ws = this.createWriteStream(key, { append : true });
  ws.on('close', cb);
  ws.on('error', cb);
  ws.write(value);
  ws.end();
}
