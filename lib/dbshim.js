var path = require('path');
exports.openDatabase = function(file) {
	var sqlite3 = require('sqlite3').verbose(),
	db = new sqlite3.Database(path.resolve(constants.PATH_ROOT, file));
	
	db.serialize();

	var queue = [];
	queue.wait = false;
	queue.push = function() {
		var args = Array.prototype.slice.call(arguments), func;
		if (!Array.isArray(args[0][1])) args[0][1] = Array.prototype.slice.call(args[0][1]);
		if (typeof args[0][1].last == 'function') {
			var callb = args[0][1].pop();
			func = function() {
				try { callb.apply(db, arguments); }
				finally {
					queue.wait = false;
					queue.step();
				}
			};
		} else {
			func = function() { queue.wait = false; queue.step() };
		}

		args[0][1].push(func);

		Array.prototype.push.apply(this, args);

		this.step();
	}
	queue.step = function() {

		if (queue.wait) return;

		var top = queue.shift(), args;

		if (!top) return;
		queue.wait = true;
	    
		//args = top[1];

		//print_r(args.last.toString());


		top[0].apply(db, top[1])
	};

	return {
		queue: queue,
		file: file,
		query: function(sql) {
			var args = arguments,
				params = typeof args[1] == 'object' && args[1] !== null ? args[1] : null,
				callback = typeof args[1] == 'function' ? args[1] : typeof args[2] == 'function' ? args[2] : null;

			var pargs = [sql];
			if (params) pargs.push(params);
			if (callback) pargs.push(function(err, res) { if (err) throw err; callback(res, err) });

			queue.push([db.all, pargs]);

			//db.all.apply(db, pargs);

			return this;
		}, 

		get: function() {
			var func = arguments[arguments.length-1];
			if (typeof func == 'function') {
				arguments[arguments.length-1] = function() {
					return func(arguments[1], arguments[0]);
				};
			}

			queue.push([db.get, arguments]);
			return this;
		},

		each: function() {
			queue.push([db.each, arguments]);
			return this;
		},

		run: function() {
			queue.push([db.run, arguments]);
			return this;
		},

		/*lastID: function() {
			return db;
		},*/

		exec: function(sql, callback) {
			queue.push([db.exec, [sql, callback]]);
			//db.exec(sql, callback);
			return this;
		},

		transaction: function(callback) {
			this.query('BEGIN TRANSACTION');
			callback({executeSql: this.query.bind(this)});
			this.query('COMMIT');
			return this;
		},

		close: function() {
			this.forEach(function(f,n,o) {
				o[n] = function() { throw "DB connection closed" };
			});
		}
	};
}
