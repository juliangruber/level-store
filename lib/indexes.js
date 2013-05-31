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

	idx.parseIndex = function () {
		return through(function (chunk) {
			this.queue({
				index: unpadHex(chunk.index),
				data: chunk.data
			});
		});
	}

	return idx;
}

/*indexes.bytelength = function (db, key) {
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

      console.log('CHUNK', chunk)

      if (!hasFrom || !firstChunk && chunk.index > opts.from) {
        console.log('ABORT 1');
        return this.queue(chunk);
      }

      if (chunk.index == opts.from + 1 || firstChunk && chunk.index <= opts.from) {
        console.log('ABORT 2');
        return;
      };

      firstChunk = false;
      // first chunk that has been read and it doesn't start at the wanted
      // position. fetch the chunk before that and prepend necessary data
      this.pause();

      peek.last(db, {
        reverse : true,
        start : key + ' ',
        end : key + ' ' + padHex(chunk.index - 1)
      }, function (err, lastKey) {
        if (err) {
          console.log('NO KEY FOUND')
          chunk.data = opts.from >= chunk.index
            ? chunk.data.substr(0, chunk.index - opts.from + 1)
            : chunk.data.substr(opts.from + 1 - chunk.index);
          tr.queue(chunk);
          return tr.resume();
        };
        console.log('KEY FOUND');
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
}*/
