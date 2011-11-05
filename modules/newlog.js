var on = mod.on.bind(mod);

var sqlite = require('sqlite3'), db = new sqlite.Database('./lib/database/lognew.db');

//on('RAW', irclog);
//on('!quote', quote);

function dbchan(message) {
	return mod.irc.getId() + '::' + (message.channel || message.from);
}

var prepare = (function() {
	var stmts = {};
	return function(stmt) {
		return stmt in stmts ? stmts[stmt] : (stmts[stmt] = db.prepare(stmt));
	}
}());

var Utils = {
	nick: {
		reg: /^([@\+%&~]*)(.*)/,
		nickId: function(nick) {
			return Utils.nick.reg.exec(''+nick)[2].toLowerCase();
		},
		id: function(nick) {
			return Utils.nick.nickId(this.name);
		},

		create: function(nick) {

			var p = Utils.nick.reg.exec(nick),
				nicko = Object.make(Utils.nick);
				
				nicko.name = p[2];

			({ op: '@', halfop: '%', voice: '+', admin: '&', owner: '~' }).forEach(function(v, k) {
				nicko[k] = p[1].indexOf(v) != -1 ? true : false;
			});

			return nicko;
		},

		toString: function() { return this.name },

		
	},

	channel: {
		addNick: function(nick) {
			var no = Utils.nick.create(nick);
			this.nicks[no.id()] = no;
			return no;
		}, 

		hasNick: function(nick) {
			return !!this.nicks[Utils.nick.nickId(nick)]
		},

		getNick: function(nick) {
			var id = Utils.nick.nickId(nick),
				no = this.nicks[id] || this.addNick(nick);

			return no;
		},

		remNick: function(nick) {
			delete this.nicks[Utils.nick.nickId(nick)];
			return true;
		},

		changeNick: function(nick, newname) {
			var no = this.getNick(nick);
			if (!no) return false;
			delete this.nicks[no.id()];
			no.name = newname;

			this.nicks[no.id()] = no;

			return true;
		},

		mode: function(nick, mode) {
			var mod = mode[0], type = mode[1],
				no = this.getNick(nick);
				no[{ o: 'op', h: 'halfop', v: 'voice', a: 'admin', q: 'owner' }[type]] = mod == '+' ? true : false;
		},

		toString: function() { return this.name }

	},

	channels: {
		get: function(name) {
			if (!name) return;
			var key = name.toLowerCase();
			if (!this.has(key)) this[key] = Object.make(Utils.channel, { name: name, nicks: {} });

			return this[name]
		},

		has: function(name) {
			return this.hasOwnProperty(name.toLowerCase());
		},

		rem: function(name) {
			delete this[name];
		},

		remNick: function(nick) {
			this.each(function(c) {
				c.remNick(nick);
			});
		},

		changeNick: function(nick, newnick) {
			this.each(function(c) {
				c.changeNick(nick, newnick);
			});
		},

		mode: function(nick, mode) {
			this.each(function(c) {
				c.mode(nick, mode);
			});
		},

		getChanTables: function() {
			if (!global.share.chanTables) {
				global.share.chanTables = {};
				db.all("SELECT name FROM sqlite_master WHERE type = 'table' AND sql LIKE 'CREATE VIRTUAL TABLE%'", function(err, result) {
					dump(result);
					result.forEach(function(row) {
						global.share.chanTables[row.name] = true;
					});
				});
			}

			return global.share.chanTables;
		}

		/*parseNickList: function(nicklist) { 
			var nlo = {};
			if (nicklist) nicklist.forEach(function(n) { 
				var no = chanutils.parseNick(n);
				nlo[no.name.toLowerCase()] = no;
			});
			return nlo;
		}*/
	}
}

var channels = Object.make(Utils.channels);

channels.getChanTables();

function logmessage(msg) {
	if (!mod.irc.state.logged_in || 
		msg.nick == 'NickServ' || 
		msg.to == 'NickServ' ||
		msg.user == 'services' || 
		(msg.direction == 'outgoing' && msg.command != 'PRIVMSG') ||
		!/PRIVMSG|JOIN|PART|QUIT|KICK|TOPIC|NICK|MODE/.test(msg.command)) return;

	
	if (msg.channel) {
		insert(msg.channel, msg);
	} else if (msg.toMe()) {
		insert(msg.from, msg)
	} else {
		channels.each(function(c) {
			if (c.hasNick(msg.from)) insert(c, msg);
		});
	}
}

function insert(chan, msg) {
	var tblname = mod.irc.getId() + '::' + chan,
		params = [
		(new Date).format('%Y-%m-%d %H:%M:%S'),
		msg.from,
		msg.text, 
		msg.command,
		msg.host,
		msg.direction == 'outgoing' ? 1 : 0
		],
		sqlins = prepare("INSERT INTO \"" + tblname + "\" VALUES (?, ?, ?, ?, ?, ?)");

	if (!share.chanTables[tblname]) {
		db.run('CREATE VIRTUAL TABLE IF NOT EXISTS "' + tblname + '" USING fts4(timestamp, nick, text, type, host, self)', function(err) {
			if (!err) sqlins.run(params);
		});
	} else {
		sqlins.run(params);
	}
}

mod.on('RAW', function(msg) {
		logmessage(msg);

		var chan = channels.get(msg.channel);
		switch(msg.command) {
			case 'JOIN':
				//if (msg.direction == 'outgoing' && msg.fromMe()) channels.get(msg.channel);
				if (!msg.fromMe()) chan.addNick(msg.nick);
				break;
			case 'PART':
				if (msg.direction == 'outgoing' && msg.fromMe()) channels.rem(msg.channel);
				else if (!msg.fromMe()) chan.remNick(msg.nick);
				break;
			case 'QUIT':
				channels.remNick(msg.nick);
				break;
			case 'NICK':
				channels.changeNick(msg.nick, msg.params[0]);
				break;
			case 'MODE':
				if (typeof msg.params[0] == 'string' && msg.params[0][0] == '#') {
					var chan = channels.get(msg.params[0]),
						nick = msg.params[2], mode = msg.params[1];
						chan.mode(nick, mode);
				}
				break;

		}

			/*.forEach(function(v, k) {
				if (k == type) { nicko[v] = mod == '+' ? true : false; return false }
			});
			nicko[(function() { switch(type) { case 'o': return 'op'; case 'h': return 'halfop' } })()] = mod*/
});

on(353, function(msg) {
	var chan = channels.get(msg.params[2]);
	if (!chan) return;
	msg.text.trim().split(/\s+/).forEach(function(n) { chan.addNick(n) });
});

mod.irc.state.channels.forEach(function(chan) {
	if (!channels[chan]) {
		com.echo('NAMES ' + chan);
	}
});
exports.channels = channels;


/*var channels {};
channels.__proto__ = Utils.channels.noenum();

var parseNick = function(nickname) {
	var p = /^([@\+%&~]*)(.*)/.exec(nickname),
		nicko = { name: p[2] };

	({ op: '@', halfop: '%', voice: '+', admin: '&', owner: '~' }).forEach(function(v, k) {
		nicko[k] = p[1].indexOf(v) != -1 ? true : false;
	});

	Object.defineProperty(nicko, 'toString', { value: function() { return this.name } });

	return nicko;


var chanUtils = { 

var chansUtils = {
}

var channels = Object.make(chansUtils);*/





/*var chanutils = {
	addChan: function(chan, nicklist) { 
		if (nicklist || !channels[chan]) channels[chan] = { nicks: chanutils.parseNickList(nicklist) };
	},


	parseNick: function(nick) {
		var p = /^([@\+%&~]*)(.*)/.exec(nick),
			nicko = { name: p[2] };

		({ op: '@', halfop: '%', voice: '+', admin: '&', owner: '~' }).forEach(function(v, k) {
			nicko[k] = p[1].indexOf(v) != -1 ? true : false;
		});

		Object.defineProperty(nicko, 'toString', { value: function() { return this.name } });

		return nicko;
	},

	hasNick: function(nick, chan) {
		return channels[chan] && channels[chan].nicklist[nick.toLowerCase()] ? true : false;
	},

	getNick: function(nick, chan) {
		return channels[chan] && channels[chan].nicklist[nick.toLowerCase()];
	},

	addNick: function(nick, chan) {
		if (!channels[chan]) chanutils.addChan(chan);

	state: function(msg) {
		switch(msg.command) {
			case 'JOIN':
				if (msg.direction == 'outgoing' && msg.fromMe()) chanutils.addChan(msg.channel);
				else if (!msg.fromMe()) chanutils.addNick(msg.nick, msg.channel);
				break;
			case 'PART':
				if (msg.direction == 'outgoing' && msg.fromMe()) chanutils.remChan(msg.channel);
				else if (!msg.fromMe()) chanutils.remNick(msg.nick, msg.channel);
				break;
			case 'QUIT':
				if (!msg.fromMe()) channels.forEach(function(chan) {
					chanutils.remNick(msg.nick, chan);
				});
				break;
			case 'NICK':
				channels.forEach(function(obj, chan) {
					var nicko = chanutils.findNick(msg.nick, chan);

					if (nicko) nicko[0].name = msg.params[0];
				});
				break;

				
				


on('JOIN', function(msg) {
});

mod.on('JOIN', function(msg) {
	if (!message.fromMe()) chanutils.addNick(message.nick, message.channel);
});
*/


/*function irclog(message) {
	if (!mod.irc.state.logged_in || 
		message.nick == 'NickServ' || 
		message.to == 'NickServ' ||
		message.user == 'services' || 
		(message.direction == 'outgoing' && message.command != 'PRIVMSG') ||
		!/PRIVMSG|JOIN|PART|QUIT|KICK|TOPIC|NICK|MODE/.test(message.command)) return;

	if (message.channel) {
		insert(message.channel, msg);
	} else {
		channels.each(function(c) {
			if (c.hasNick(message.from)) insert(c, msg);
		});
	}


	function insert(chan) {

		var params = [
			(new Date).format('%Y-%m-%d %H:%M:%S'),
			message.from,
			message.text, 
			message.command,
			message.host,
			message.direction == 'outgoing' ? 1 : 0
		];

		var sqlins = prepare("INSERT INTO " + dbchan(chan) + " VALUES (?, ?, ?, ?, ?, ?)");

		sqlins.run(params);

	}
}


//function quoteall(message) {

*/

