var test = require('./util');
var Store = require('..');

test('head', function (t, db) {
	t.plan(2);

	var ws = Store(db).createWriteStream('times');
	ws.write('1 o clock');
	ws.write('2 o clock');
	ws.end();
	ws.on('close', function () {
		Store(db).head('times', function (err, head) {
			t.error(err);
			t.equal(head, '2 o clock');
		});
	});
});

test('head with index', function (t, db) {
	t.plan(3);

	var ws = Store(db).createWriteStream('times');
	ws.write('1 o clock');
	ws.write('2 o clock');
	ws.end();
	ws.on('close', function () {
		Store(db).head('times', { index: true }, function (err, head) {
			t.error(err);
			t.ok(head.index);
			t.equal(head.data, '2 o clock');
		});
	});
});
