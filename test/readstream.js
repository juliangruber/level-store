var test = require('./util');
var Store = require('..');

test('gt', function (t, db) {
	t.plan(2);

	db.batch()
		.put('o 0', '0')
		.put('o 1', '1')
		.write(function (err) {
			t.error(err);

			Store(db).createReadStream('o', { gt: 0 }).on('data', function (d) {
				t.equal(d, '1');
			});
		});
});

test('gte', function (t, db) {
	t.plan(3);

	db.batch()
		.put('o 0', '0')
		.put('o 1', '1')
		.write(function (err) {
			t.error(err);

			var i = 0;
			Store(db).createReadStream('o', { gte: 0 }).on('data', function (d) {
				t.equal(d, String(i++));
			});
		});
});

test('lt', function (t, db) {
	t.plan(2);

	db.batch()
		.put('o 0', '0')
		.put('o 1', '1')
		.write(function (err) {
			t.error(err);

			Store(db).createReadStream('o', { lt: 1 }).on('data', function (d) {
				t.equal(d, '0');
			});
		});
});

test('lte', function (t, db) {
	t.plan(3);

	db.batch()
		.put('o 0', '0')
		.put('o 1', '1')
		.write(function (err) {
			t.error(err);

			var i = 0;
			Store(db).createReadStream('o', { lte: 1 }).on('data', function (d) {
				t.equal(d, String(i++));
			});
		});
});

test('encoding', function (t, db) {
	t.plan(2);

	db.batch()
		.put('o 0', '0')
		.write(function (err) {
			t.error(err);

			Store(db).createReadStream('o', { valueEncoding: 'binary' }).on('data', function (d) {
				t.ok(Buffer.isBuffer(d));
			});
		});
});

test('integration', function (t, db) {
	t.plan(2);

	db.batch()
		.put('o 0', '0')
		.put('o 1', '1')
		.put('o 2', '2')
		.put('o 3', '3')
		.write(function (err) {
			t.error(err);

			var i = 0;
			Store(db).createReadStream('o', { gte: 2, lt: 3 }).on('data', function (d) {
				t.equal(d, '2');
			});
		});
});
