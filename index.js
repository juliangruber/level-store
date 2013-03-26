var through = require('through');
var duplexer = require('duplexer');
var timestamp = require('monotonic-timestamp');
var livefeed = require('level-livefeed');
var deleteRange = require('level-delete-range');
var levelUp = require('levelup');
var peek = require('level-peek');

module.exports = store;

function store (db, opts) {
  if (!(this instanceof store)) return new store(db);
  this.db = typeof db == 'string'
    ? levelUp(db)
    : db;
  this._opts = opts || {}
}

var zeros = '00000000' //32 bit int
function padHex(num) {
  if(num !== ~~(num))
    throw new Error('must be whole number')
  var str = num.toString(16)
  return zeros.substring(str.length) + str
}

function unpadHex(numstr) {
  return parseInt(/0+([0-9a-f]+)/.exec(numstr)[1], 16)
}

store.prototype.createWriteStream = function (key, opts) {
  if (!opts) opts = {};
  var len = 0
  var tr = through(function (chunk) {
    this.queue({
      key : key,
      value : chunk
    });
  //can't change the key until AFTER we know
  //the last element.
  }).on('data', function (data) {
    len += data.value.length
    data.key = key + ' ' + padHex(len)
  })

  var ws = this.db.createWriteStream();

  var dpl = duplexer(tr, tr.pipe(ws));

  if (!opts.append) {
    tr.pause();
    deleteRange(this.db, {
      start : key + ' ',
      end : key + '~'
    }, function (err) {
      if (err) dpl.emit('error', err);
      tr.resume();
    });
  } else {
    tr.pause();
    peek.last(this.db, {
      reverse: true,
      start : key + ' ',
      end : key + '~'
    }, function (err, _key) {
      if(err)
        return tr.resume()
      len = unpadHex(_key.substring(key.length + 1))
      tr.resume()
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
