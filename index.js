var through = require('through');
var duplexer = require('duplexer');
var liveStream = require('level-live-stream');
var deleteRange = require('level-delete-range');
var cap = require('level-capped');
var peek = require('level-peek');
var fix = require('level-fix-range');
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

  var index = this._getIndex(opts.index, key);
  var input = through().pause();

  var ws = this.db.createWriteStream();
  var dpl = duplexer(input, ws);

  if (typeof opts.capped != 'undefined') {
    var capped = cap(this.db, key, opts.capped);
    ws.on('end', capped.end.bind(capped));
  }

  input
    .pipe(through(function (chunk) {
      this.queue({
        key: index.newKey(),
        value: chunk
      })  
    }))
    .pipe(ws);

  if (opts.append) {
    if (index.initialize) index.initialize(ready);
    else ready();
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

  // backwards compatibility
  if (opts.from) opts.gt = opts.from;
  if (opts.to) opts.lte = opts.to;

  // choose index
  var index = this._getIndex(opts.index, key);

  // set start
  var start = key + ' ';
  if (index.modKey && (opts.gt || opts.gte)) {
    start += index.modKey(opts.gt || opts.gte);
  } else {
    if (typeof opts.gt != 'undefined') start += opts.gt;
    else if (typeof opts.gte != 'undefined') start += opts.gte;
  }

  // set end
  var end = key;
  if (index.modKey && (opts.lt || opts.lte)) {
    end += ' ' + index.modKey(opts.lt || opts.lte);
  } else {
    if (typeof opts.lt != 'undefined') end += ' ' + opts.lt;
    else if (typeof opts.lte != 'undefined') end += ' ' + opts.lte;
    else end += '~';
  }

  var cfg = fix({
    start: start,
    end: end,
    reverse: opts.reverse
  });

  var rs = opts.live
    ? liveStream(this.db, cfg)
    : this.db.createReadStream(cfg)

  var filter = through(function (chunk) {
    if (typeof opts.lt != 'undefined' && chunk.index >= opts.lt) return;
    if (typeof opts.lte != 'undefined' && chunk.index > opts.lte) return;
    if (typeof opts.gt != 'undefined' && chunk.index <= opts.gt) return;
    if (typeof opts.gte != 'undefined' && chunk.index < opts.gte) return;
    this.queue(chunk);
  });

  var received = 0;
  var limit = through(function (chunk) {
    if (++received == limit) rs.destroy();
    else this.queue(chunk);
  });

  var removeIndex = through(function (chunk) {
    this.queue(chunk.data);
  });

  var res = rs.pipe(through(function (chunk) {
    this.queue(parseIndex(key, chunk));
  }));
  if (index.parseIndex) res = res.pipe(through(function (chunk) {
    this.queue(index.parseIndex(chunk));
  }));
  res = res.pipe(filter);
  if (!opts.index) res = res.pipe(removeIndex);
  return res;
}

function parseIndex (key, chunk) {
  return {
    index: chunk.key.slice(key.length + 1),
    data: chunk.value
  };
}

Store.prototype._getIndex = function (name, key) {
  var idx = typeof name == 'string'
    ? name
    : this.index;
  return indexes[idx](this.db, key);
}

Store.prototype.head = function (key, opts, cb) {
  var self = this;
  if (typeof opts == 'function') {
    cb = opts;
    opts = {};
  }
  var index = this._getIndex(opts.index);

  peek.last(self.db, {
    start: key + ' ',
    end: key + '~'
  }, function (err, _key, _value) {
    if (err) return cb(err);

    var chunk = parseIndex(key, { key: _key, value: _value });
    if (index.parseIndex) chunk = index.parseIndex(chunk);
    if (!opts.index) chunk = chunk.data;
    cb(null, chunk);
  });
};

Store.prototype.append = function (key, value, cb) {
  if (!cb) cb = function () {};
  var ws = this.createWriteStream(key, { append : true });
  ws.on('close', cb);
  ws.on('error', cb);
  ws.write(value);
  ws.end();
};

