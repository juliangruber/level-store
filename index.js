var through = require('through');
var duplexer = require('duplexer');
var timestamp = require('monotonic-timestamp');
var livefeed = require('level-livefeed');
var deleteRange = require('level-delete-range');
var levelUp = require('levelup');
var ordered = require('ordered-through');
var peek = require('level-peek');

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

  var input = through(function (chunk, cb) {
    this.queue({
      key : key + ' ' + timestamp(),
      value : chunk
    })
  });

  // capped streams
  var tr = opts.capped
    ? capped(self.db, key, opts)
    : through();

  var ws = self.db.createWriteStream();
  input.pipe(tr).pipe(ws);
  var dpl = duplexer(input, ws);

  // append
  if (!opts.append) {
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

function capped (db, key, opts) {
  var written = 0;

  tr = ordered(function (chunk, cb) {
    if (++written <= opts.capped) return cb(null, chunk);

    function deleteFirst () {
      // there is a race condition here where the chunks haven't been
      // written to the database yet but this already wants to delete
      // them => retry
 
      peek.first(db, { start : key + ' ' }, function (err, _key) {
        if (_key == key) return deleteFirst();
        db.del(_key, function (err) {
          if (err) return deleteFirst();
          cb(null, chunk);
        });
      });
    }

    deleteFirst();
  });

  if (opts.append) {
    tr.pause();
    var keys = [];

    var ks = db.createKeyStream({
      start : key + ' ',
      end   : key + '~'
    });
    
    ks
    .on('data', function (_key) { keys.push(_key) })
    .on('end', function () {
      deleteRange(db, {
        start : key + ' ',
        end   : keys.slice(keys.length - opts.capped)
      }, function (err) {
        written = opts.capped;
        if (err) tr.emit('error', err);
        tr.resume();
      })
    })
  }

  return tr;
}
