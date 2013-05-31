var through = require('through');
var timestamp = require('monotonic-timestamp');
var peek = require('level-peek');
var padHex = require('./util').padHex;
var unpadHex = require('./util').unpadHex;

var indexes = module.exports = {}

indexes.timestamp = function (db, key) {
	var idx = {};
  idx.addKey = function () {
		return through(function (chunk) {
			this.queue({
				key : key + ' ' + timestamp(),
				value : chunk
			});
		});
	};
	return idx;
}

indexes.chunks = function (db, key) {
	var idx = {};
  var chunks = 0;

  idx.addKey = function () {
		return through(function (chunk) {
			this.queue({
				key : key + ' ' + padHex(chunks),
				value : chunk
			});
			chunks++;
		});
	};

  idx.initialize = function (cb) {
    peek.last(db, {
      reverse : true,
      start : key + ' ',
      end : key + '~'
    }, function (err, lastKey) {
      if (!err) chunks = unpadHex(lastKey.substr(key.length + 1));
      cb(null);
    });
  }

	idx.parseIndex = function (chunk) {
		return {
			index: unpadHex(chunk.index),
			data: chunk.data
		};
	}

	return idx;
}

