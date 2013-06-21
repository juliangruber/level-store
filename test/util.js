var tap = require('tap');
var os = require('os');
var levelup = require('level');

module.exports = test;

function test (name, cb) {
  if (!cb) return tap.test(name);
  tap.test(name, function (t) {
    var path = os.tmpDir() + '/'
    path += Math.random().toString(16).slice(2)
    path += '-level-store-test';

		levelup(path, function (err, db) {
			if (err) throw err;
			cb(t, db);
		});
  });
}
