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

  return {
    addKey     : addKey,
    initialize : initialize,
  };
}
