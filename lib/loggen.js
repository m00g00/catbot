var sqlite3 = require('sqlite3').verbose(),
	db = new sqlite3.Database('./lib/database/log.db');

require('./date');

exports.get = function(params) {

	var kord = ['from', 'to', 'channel', 'server', 'type'],
		keys = Object.keys(params),
		sql = "SELECT timestamp, channel, nick, type, content text " +
			  //"FROM loginfo i JOIN logtext t ON i.rowid = t.docid " +
			  "FROM loginfo i, logtext t " +
			  "WHERE " + kord.filter(function(k) { return keys.indexOf(k) != -1 }).map(function(k) {
							return k == 'from' 	  ? 'timestamp BETWEEN $from' :
								   k == 'to'      ? '$to' :
								   k == 'channel' ? '(channel = $channel OR type = "QUIT")' :
								   k + ' = $' + k;
						 }).join(' AND ') +
			  " AND i.rowid = t.docid ",
			  //"ORDER BY i.rowid ASC",
		values = {}, conds = [];
		
		keys.forEach(function(k) {
			values['$'+k] = params[k];
		});

		console.log(sql);
		console.log(values);

		var fchain = Object.create(null),
			exorder = ['dateformat', 'format'],
			exchain = function(row) {
				var res = row;
				exorder.forEach(function(f) {
					if (f in fchain) res = fchain[f](res);
				});
				return res;
			},
			oncomplete = null, onerror = null,
			chain = {
			format: function(format) {
				var fmt = typeof format == 'object' && format !== null ? format : {};
				fmt.PRIVMSG = typeof format == 'string' ? format : fmt.PRIVMSG || "{timestamp}\t{nick}\t{text}";
				fmt.JOIN = fmt.JOIN || "{timestamp}\t-->\t{nick} has joined {channel}";
				fmt.PART = fmt.PART || "{timestamp}\t<--\t{nick} has left {channel}";
				fmt.QUIT = fmt.QUIT || "{timestamp}\t<--\t{nick} has quit ({text})";
				fmt.NICK = fmt.NICK || "{timestamp}\t--\t{nick} is now know as {text}";
				fmt.DEFAULT = fmt.DEFAULT || "{timestamp}\t--\t{type} {text}";

				fchain.format = function (row) {
					var type = row.type.toUpperCase();
					return (type in fmt ? fmt[type] : fmt.DEFAULT).replace(/\{([^\}]+)\}/g, function(m, n) { return row[n] });
				};

				return this;
			},

			timestamp: function(format) {
				fchain.dateformat = function dateformat(row) {
					row.timestamp = new Date(row.timestamp).format(format);
					return row;
				};

				return this;
			},

			all: function(handle) {
				process.nextTick(function() { db.all(sql, values, function(e, r) { 
					if (e && typeof onerror == 'function') onerror(e);
					else {
						var lines = r.map(function(l) { return exchain(l) });
						handle(lines, e) 
						if (typeof oncomplete == 'function') oncomplete(lines.length);
					}
				}) });
				return this;
			},

			each: function(handle) {
				process.nextTick(function() {
					db.each(sql, values, 
						function(e, r) { 
							if (e && typeof onerror == 'function') onerror(e);
							else handle(exchain(r), e) 
						},
						(typeof oncomplete == 'function' ? 
							function(e, r) { oncomplete(r) } :
							undefined)
					);
				});

				return this;
			},

			complete: function(handle) {
				if (typeof handle == 'function') oncomplete = handle;
				return this;
			},

			error: function(handle) {
				if (typeof handle == 'function') onerror = handle;
				return this;
			}

		};

		return chain;

};

exports.getlog = function(params) {
	return exports.get(params).format();
};
