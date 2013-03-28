var through = require('through');
var timestamp = require('monotonic-timestamp');
var peek = require('level-peek');
var padHex = require('./util').padHex;
var unpadHex = require('./util').unpadHex;

var indexes = module.exports = {}

indexes.timestamp = function (db, key) {
  var addKey = through(function (chunk) {
    this.queue({
      key : key + ' ' + timestamp(),
      value : chunk
    });
  });

  function initialize (cb) { cb() }

  return {
    addKey : addKey,
    initialize : initialize
  };
}

indexes.chunks = function (db, key) {
  var chunks = 0;

  var addKey = through(function (chunk) {
    this.queue({
      key : key + ' ' + padHex(chunks),
      value : chunk
    });
    chunks++;
  });

  function initialize (cb) {
    peek.last(db, {
      reverse : true,
      start : key + ' ',
      end : key + '~'
    }, function (err, lastKey) {
      if (!err) chunks = unpadHex(lastKey.substr(key.length + 1));
      cb(null);
    });
  }

  function filter (opts) {
    return through(function (chunk) {
      chunk = {
        index : unpadHex(chunk.index.substr(key.length + 1)),
        data : chunk.data
      }
      if (typeof opts.from == 'undefined' || chunk.index > opts.from) {
        this.queue(chunk);
      }
    });
  }

  return {
    addKey     : addKey,
    initialize : initialize,
    filter     : filter
  };
}

indexes.bytelength = function (db, key) {
  var length = 0;

  var addKey = through(function (chunk) {
    length += chunk.length;
    this.queue({
      key : key + ' ' + padHex(length),
      value : chunk
    });
  });

  function initialize (cb) {
    peek.last(db, {
      reverse : true,
      start : key + ' ',
      end : key + '~'
    }, function (err, lastKey) {
      if (!err) length = unpadHex(lastKey.substr(key.length + 1));
      cb(null);
    });
  }

  function filter (opts) {
    var firstChunk = true;

    var tr = through(function (chunk) {
      var hasFrom = typeof opts.from != 'undefined'

      chunk = {
        index : unpadHex(chunk.index.substr(key.length + 1)),
        data : chunk.data
      }

      if (!firstChunk || !hasFrom || chunk.index == opts.from + 1) {
        return this.queue(chunk);
      }

      firstChunk = false;
      // first chunk that has been read and it doesn't start at the perfect
      // position. fetch the chunk before that and prepend necessary data
      this.pause();

      peek.last(db, {
        reverse : true,
        start : key + ' ',
        end : key + ' ' + padHex(chunk.index - 1)
      }, function (err, lastKey) {
        if (err) {
          chunk.data = chunk.data.substr(chunk.index - opts.from, chunk.data.length);
          tr.queue(chunk);
          return tr.resume();
        };
        db.get(lastKey, function (err, value) {
          chunk.data = value.substr(opts.from - chunk.index) + chunk.data;
          tr.queue(chunk);
          tr.resume();
        });
      })
    });

    return tr;
  }

  function from (val) {
    return padHex(val);
  }

  return {
    addKey     : addKey,
    initialize : initialize,
    filter     : filter,
    from       : from
  };
}
