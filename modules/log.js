var log = require('./helper').log, meta = require('./lib/meta');

mod.on('!quote', quote);
mod.on('!quoteall', quoteall);
mod.on('!qa', quoteall);
mod.on('!qsn', qsn);
mod.on('!qs', qs);

mod.on('!log', loginfo);

mod.on('!stats', stats);
mod.on('!statsinfo', chanstats);

mod.on(['!talk', '!t'], talk);
mod.on(['!smart', '!s'], function(msg) { talk(msg, true) });
mod.on('PRIVMSG', talkaboutme);

mod.on('PRIVMSG', expireCache);
mod.on('RAW', irclog);

var db = com.db;
if (!global.share.temptables) global.share.temptables = {};
var temptables = global.share.temptables;

var nmem = 'cache';

function findTemptables() {
	db.query("SELECT name FROM "+nmem+".sqlite_master WHERE type = 'table' AND sql LIKE 'CREATE VIRTUAL TABLE%'", function(result) {
		result.forEach(function(row) {
			global.share.temptables[row.name] = true;
		});

		print_r(global.share.temptables);
	});
}

if (!global.share.dbattached && !global.share.dbattaching) {
	global.share.dbattaching = true;
	
	db.query("ATTACH DATABASE '" + constants.PATH_ROOT + "/lib/database/log.cache.db' AS " + nmem, 
	function() { 
		global.share.dbattached = true;
		global.share.dbattaching = false;
		
		findTemptables();
	});
}

function getMemTables(callback) {
	db.query("SELECT name FROM " + nmem + ".sqlite_master WHERE type = 'table' AND sql LIKE 'CREATE VIRTUAL TABLE%'", function(result) {
		callback(result.map(function(e) { return e.name }));
	});
}

/*function getMemTables(callback) {
	var memtables = [], done = {};
	db.query("PRAGMA database_list", function(result) {
		result.filter(function(e) { return !e.file }).map(function(e) { return e.name }).forEach(function(name) {
			done[name] = false;
			db.query("SELECT name FROM "+name+".sqlite_master WHERE type = 'table' AND sql LIKE 'CREATE VIRTUAL TABLE%'", function(result) {
				memtables = memtables.concat(result.map(function(e) { return name + '.' + e.name }));
				done[name] = true;

				if (Object.keys(done).every(function(k) { return done[k] == true })) callback(memtables);

			});
		});
	});
}*/


mod.on('JOIN', function(message) {
	if (message.direction == 'incoming' && message.fromMe()) { 
		db.query("PRAGMA table_info(\"%\")".f(normalizeChan(message.channel)), function(result) {
		
		if (!result.length)
			createChanTable(message.channel, mod.irc.getServerName());
		
		});
	}
});

var channels = {}, tmplst = {}, CHAN_NICK_ERROR = "Unable to update channel nick list";
exports.channels = channels;

var chanutils = {
	addChan: function(chan, nicklist) { nicklist = nicklist ? chanutils.parseNickList(nicklist) : []; channels[chan] = { nicks: nicklist } },
	remChan: function(chan) { delete channels(chan) },
	parseNickList: function(nicklist) { return nicklist.map(function(n) { return chanutils.parseNick(n) }) },
	/*parseNick: function(nick) { 
		var a = /^([@\+%]*)(.*)/.exec(nick).slice(1).reverse(); 
		Object.defineProperty(a, 'toString', { value: function() { return this[0] } });
		return a;
	},*/
	parseNick: function(nick) {
		var p = /^([@\+%&~]*)(.*)/.exec(nick),
			nicko = { name: p[2] };

		({ op: '@', halfop: '%', voice: '+', admin: '&', owner: '~' }).forEach(function(v, k) {
			nicko[k] = p[1].indexOf(v) != -1 ? true : false;
		});

		Object.defineProperty(nicko, 'toString', { value: function() { return this.name } });

		return nicko;
	},
	findNick: function(nick, chan) {
		if (!channels[chan]) return;

		var nicko, nicki;
		channels[chan].nicks.some(function(n, i) {
			if (n.name.toLowerCase() == nick.toLowerCase()) {
				nicko = n;
				nicki = i;
				return true;
			}
		});

		if (!nicko) return;

		return [nicko, nicki];
	},
	addNick: function(nick, chan) { 
		if (!channels[chan]) chanutils.addChan(chan); 
		var nicko = chanutils.parseNick(nick);
		if (channels[chan].nicks.some(function(n) {
			return n.name.toLowerCase() == nicko.name.toLowerCase() 
		}))
		channels[chan].nicks.push(chanutils.parseNick(nick))
	},
	remNick: function(nick, chan) { 
		var pos = chanutils.findNick(nick, chan);
		if (pos) channels[chan].nicks.splice(pos[1], 1);
	},
	addNicksFromNames: function(message) {
		var chan = message.params[2];
		var nicks = message.text.trim().split(/\s+/);
		if (!tmplst[chan]) tmplst[chan] = [];
		tmplst[chan].push.apply(tmplst[chan], nicks);
	},
	commitNicks: function(chan) {
		if (!tmplst[chan]) return;
		if (!channels[chan]) chanutils.addChan(chan, tmplst[chan]);
		else channels[chan].nicks = chanutils.parseNickList(tmplst[chan]);

		delete tmplst[chan];
	}
};

mod.irc.state.channels.forEach(function(chan) {
	if (!channels[chan]) {
		com.echo('NAMES ' + chan);
	}
});

mod.on('MODE', function(message) {
	var chan = message.params[0], nick, nicko, mod, type;
	if (channels[chan]) {
		nick = message.params[2];
		nicko = chanutils.findNick(nick, chan);
		if (nicko) {
			mod = message.params[1][0];
			type = message.params[1][1];

			nicko[0][{ o: 'op', h: 'halfop', v: 'voice', a: 'admin', q: 'owner' }[type]] = mod == '+' ? true : false;
		}
	}
			/*.forEach(function(v, k) {
				if (k == type) { nicko[v] = mod == '+' ? true : false; return false }
			});
			nicko[(function() { switch(type) { case 'o': return 'op'; case 'h': return 'halfop' } })()] = mod*/
});


mod.on('JOIN', function(message) {
	if (message.direction == 'outgoing' && message.fromMe())
		chanutils.addChan(message.channel);
});

mod.on('JOIN', function(message) {
	if (!message.fromMe()) chanutils.addNick(message.nick, message.channel);
});


mod.on('PART', function(message) {
	if (message.direction == 'outgoing' && message.fromMe()) chanutils.remChan(message.channel);
});

mod.on('PART', function(message) {
	if (!message.fromMe()) chanutils.remNick(message.nick, message.channel);
});

mod.on('QUIT', function(message) {
	if (!message.fromMe()) channels.forEach(function(chan) {
		chanutils.remNick(message.nick, chan);
	});
});

mod.on('NICK', function(message) {
	channels.forEach(function(obj, chan) {
		var nicko = chanutils.findNick(message.nick, chan);

		if (nicko) nicko[0].name = message.params[0];
	});
});


mod.on(353, function(message) {
	chanutils.addNicksFromNames(message);
});

mod.on(366, function(message) {
	chanutils.commitNicks(message.params[1]);
});


mod.on('PRIVMSG', function beer(message) {
	var match = message.text.match(/^(.*?)(\+\+|--)$/);
	if (!match) return;

	var nick = chanutils.findNick(match[1], message.channel);

	if (nick) {
		var nickname = nick[0].name, ident = { type: 'nick', name: nickname, server: mod.irc.getServerName(), channel: message.channel, key: 'beers' }; 
		meta.get(ident, function(obj) {
			if (!('beers' in obj)) obj.beers = 0;
			obj.beers += (match[2] == '++' ? 1 : -1);
			meta.update(obj);

			message.respond(nickname + " now has " + obj.beers + " beer" + (obj.beers == 1 || obj.beers == -1 ? '' : 's'));
		});
	}
});

//setMeta('nick', nick, 'beers', '+1', server, channel)



function normalizeChan(chan) {
	return typeof chan == 'string' ? mod.irc.getId() + '::' + chan.toLowerCase() : false;
	//return typeof chan == 'string' ? /*mod.irc.getId() + '_' +*/ chan.replace(/[^A-Za-z0-9_]/g, '').toLowerCase() : false;
}



function createChanTable(channel, server) {
		var cq,
			chan = normalizeChan(channel);
		cq = ("BEGIN TRANSACTION; DROP TABLE IF EXISTS {mem}.{chan}; " +
   			  "CREATE VIRTUAL TABLE {mem}.{chan} USING fts3(nick, content); " +
  			  "INSERT INTO {mem}.{chan} (docid, nick, content) " +
  			  "SELECT loginfo.rowid, nick, content FROM loginfo, logtext " +
  			  "WHERE channel = '{channel}' AND server = '{server}' AND type = 'PRIVMSG' " +
  			  "AND self = 0 AND SUBSTR(content, 1, 1) != '!' AND SUBSTR(content, 1, 1) != '.' AND loginfo.rowid = logtext.docid; COMMIT").fo({mem: nmem, chan: '"' + chan + '"', channel: channel, server: server});


		log.question('Creating temp table for ' + chan);
		db.exec(cq, function(res) {

			if (res !== null) throw res
			temptables[chan] = true;
			log.success('Temp table % created'.f(chan));
		});
}

exports.cchan = createChanTable;
							  	

function irclog(message) {
	if (!mod.irc.state.logged_in || 
		message.nick == 'NickServ' || 
		message.to == 'NickServ' ||
		message.user == 'services' || 
		(message.direction == 'outgoing' && message.command != 'PRIVMSG') ||
		!/PRIVMSG|JOIN|PART|QUIT|KICK|TOPIC|NICK|MODE/.test(message.command)) 
			return;

	var params = [
		(new Date).format('%Y-%m-%d %H:%M:%S'),
		message.command,
		message.from,
		message.host,
		message.channel,
		mod.irc.getServerName(),
		message.direction == 'outgoing' ? 1 : 0,
		//message.raw
	];

	var chan = normalizeChan(message.channel);

	var sqlinfo = "INSERT INTO loginfo VALUES (?, ?, ?, ?, ?, ?, ?)";
	var sqltext = "INSERT INTO logtext (docid, content) VALUES (LAST_INSERT_ROWID(), ?)";
	var sqlcache = "INSERT INTO % (docid, nick, content) VALUES (LAST_INSERT_ROWID(), ?, ?)";

	db.transaction(function(tx) {
		tx.executeSql(sqlinfo, params);
		tx.executeSql(sqltext, [message.text]);
		if (chan && temptables[chan] && message.direction == 'incoming' && message.text[0] != '!' && message.command == 'PRIVMSG') 
			tx.executeSql(sqlcache.f(nmem + '."' + chan + '"'), [message.from, message.text]);
	});
}

var queryCache = {
	add: function(hkey, lines) {
		hkey = this.makeKey(hkey);

		lines.shuffle();
		//lines.sort(function(a,b) { return Math.random() > .5; });
		lines.current = 0;
		lines.next = function() {
			var val = this[this.current++];
			if (this.current >= this.length) {
				this.shuffle();
				this.current = 0;
				console.log('LOOP');
			}
			return val;
		};

		return (this[hkey] = lines);
	},

	makeKey: function(p) {
		if (typeof p == 'object') {
			var key = p.server + ':' + p.channel + ':' + (p.nick || '') + ':';

			if (p.text) {
				print_r(p.text)
				key += p.text.replace(/\|/g, '')
							 .split(/\s+/)
							 .filter(function(w){ return !/^[A-Z]$/.test(w); })
							 //.map(function(w){ return w.toLowerCase(); })
							 .sort()
							 .join('|');
			}

			key = key.toLowerCase();

			return key;
		} else {
			return p;
		}
	},

	has: function(p) {
		return this.makeKey(p) in this;
	},

	get: function(p) {
		return this[this.makeKey(p)];
	},

	remove: function(key) {
		delete this[key];
	},
	
	forEach: function(block, thiz) {
		for (var i=0, keys = Object.keys(this), l=keys.length; i < l; i++) {
			if (typeof this[keys[i]] != 'function') block.call(thiz, this[keys[i]], keys[i]);
		}
	}
		
};

exports.queryCache = queryCache;

function expireCache(message) {
	if (message.direction == 'outgoing' || message.text[0] == '!') return false;

	var p = {
		channel: message.channel,
		server: mod.irc.state.server,
	}

	var ckey = queryCache.makeKey(p);

	if (queryCache.has(ckey)) queryCache.remove(ckey);

	p.nick = message.nick;

	var ukey = queryCache.makeKey(p);

	if (queryCache.has(ukey)) queryCache.remove(ukey);

	var tokens = message.text.split(/\s+/);


	queryCache.forEach(function(v,k) {
		var cachetokens = k.substr(k.lastIndexOf(':')+1);
		if ((k.startsWith(ckey) || k.startsWith(ukey)) && tokens.some(function(e){return cachetokens.indexOf(e) != -1;}))
			queryCache.remove(k)
	});
}



function makeQuery(p) {
	print_r(p)

	var execute, result, ret = { all: false };
	var fields = p.fields || 'docid rowid, nick, content text';
	var where = [];
	var param = [];

	var cache = true;


	if (queryCache.has(p)){
		result = queryCache.get(p);
		ret.execute = function(callback) {
			console.log("HAS CACHE");
			//print_r(result.length);
			var line = p.fields && p.fields.match(/^count\(\*\)/) ? { count: result.length } : 
					   this.all ? result : 
					   result.length ? result.next() : null;

			callback(line);
		}
	} else {

			/*if (p.text) {
				where.push('content MATCH ?');
				param.push(p.text);
			}

			where.push("SUBSTR(content, 1, 1) != '!'");

			['nick', 'channel', 'server'].forEach(function(n) {
				if (p[n]) {
					where.push(n + ' = ?');
					param.push(
						n == 'server' ? /^(?:[^.]+\.)?([^.]+)/(p[n])[1] : p[n]
					);
				}
			});

			where.push("type = 'PRIVMSG'");

			if (!p.nick || p.nick.toLowerCase() != mod.irc.state.nick.toLowerCase()) 
				where.push("self = 0");*/

			var chan = normalizeChan(p.channel);

			sql = "SELECT % FROM \"%\"".f(
				fields.join ? fields.join(', ') : fields,
				chan
			);
			
			if (p.nick || p.text) {
				var match = '';
				if (p.nick) match += 'nick: ' + p.nick + ' ';
				if (p.text) match += 'content: ' + p.text;

				sql += ' WHERE "%" MATCH ?'.f(chan);
				param.push(match);
			} else {
				sql += " LIMIT 1 OFFSET (SELECT abs(random()) % count(*) FROM \"" + chan + "\")";
				//sql += " ORDER BY RANDOM() LIMIT 1";
				cache = false;
			}
			/*sql = "SELECT % FROM loginfo, logtext WHERE % AND loginfo.rowid = logtext.docid".f(
				fields.join ? fields.join(', ') : fields,
				where.join(' AND ')
			);*/


			ret.sql = sql;
			ret.param = param;
			ret.execute = function(callback) {
					var qstart = new Date;

					print_r(this.sql);
					print_r(this.param);

					var thiz = this;
					db.query(this.sql, this.param, function(result) {
						log.success('Query time: % ms'.f(new Date - qstart));

						var line;
						//print_r(result);
						if (cache) line = queryCache.add(p, result);
						else { line = result; line.next = function() { return this[0]; }; }

						//var line = thiz.all ? result : result.length > 1 ? result.getRandom() : result.length ? result[0] : null;

						callback.call(null, thiz.all? line : line.length > 1 ? line.next() : line.length ? line[0] : null);
					});
			};
	}

	return ret;

}

function qsn(message) {
	var qp = message.query.text.splitFirstWord();

	var nick = qp[0];
	var text = qp[1];

	var q = makeQuery({
		fields: 'count(*) count',
		nick: nick,
		channel: message.channel,
		server: mod.irc.state.server,
		text: text
	});

	q.execute(function(result) {
		var count = result.count;
		message.respond('% uttered "%" % time%'.f(nick, text, count, count != 1 ? 's' : ''));
	});
}

function qs(message) {
	var text = message.toMe() ? message.query.args.slice(1).join(' ') : message.query.text;

	var q = makeQuery({
		fields: 'count(*) count',
		channel: message.toMe() ? message.query.args[0] : message.channel,
		server: mod.irc.state.server,
		text: text
	});

	q.execute(function(result) {
		var count = result.count;
		message.respond('"%" uttered % time%'.f(text, count, count != 1 ? 's' : ''));
	});
}
	
var quotefmt = '{rowid} <{nick}> {text}';
var quotefail = 'I cants find :(';

/*mod.on('PRIVMSG', function(m) {
	print_r(m.query.text);
	print_r(m.query.text.splitFirstWord())
	//print_r(require('./helper').string.splitFirstWord(m.query.text))
});*/
function quoteparams(message) {
	var querytxt = message.query.text.trim(),
		chan, qp = querytxt.split(/<(.*?)>|\s+/).filter(function(e) { return e != '' && typeof e != 'undefined' });

	if (querytxt[0] == '"' || querytxt[0] == "'") {
		quoteall(message);
		return;
	} else if (querytxt[0] == '#') {
		chan = qp.shift();	
	} else if (message.channel) {
		chan = message.channel
	} else {
		throw Error("No channel specified");
		//message.respond("No channel specefied");
		//return;
	}

	//dump(temptables);

	if (temptables[normalizeChan(chan)] != true) {
		throw Error("Channel not found");
		/*message.respond("Channel not found");
		return;*/
	}

	//var qp = message.query.text.splitFirstWord();
	var fulltext = qp.join(' ');

	var nick = qp.shift();
	var text = qp.join(' ');

	return { nick: nick, channel: chan, server: mod.irc.getServerName(), text: text, fulltext: fulltext };
}


function quote(message) {
	try {
	var p = quoteparams(message);
	} catch(e) { 
	message.respond(e);
	return
	}

	var q = makeQuery({
		nick: p.nick,
		channel: p.channel,
		server: p.server,
		text: p.text
	});

	q.execute(function(result) {
		if (result) message.respond(quotefmt.fo(result));
		else quoteall(message);
	});
}

function quoteall(message) {
	try {
	var p = quoteparams(message);
	} catch(e) { 
	message.respond(e);
	return
	}
	var q = makeQuery({
		channel: p.channel,
		server: p.server,
		text: p.fulltext
	});

	q.execute(function(result) {
		message.respond(result  ? 
			quotefmt.fo(result) : 
			quotefail
		);
	});
}

function loginfo(message) {
	var query = message.query;

	var qparts = /^(\d*~)?(\d+)([+-]\d+)?$/.exec(query.text.trim());
	print_r(qparts);

	if (!qparts || 
		(qparts[1] && qparts[3]) || 
		(qparts[1] && +qparts[1].match(/^\d*/)[0] > 10) || 
		(qparts[3] && Math.abs(+qparts[3]) > 10)) { 
			message.respond("Usage: !log logid | [[n]~]logid | logid[(+|-)n(<=10)]"); 
			return; 
	}

	var find_rowid = "(SELECT min(rowid) FROM (SELECT rowid FROM loginfo WHERE rowid <= % ORDER BY rowid DESC LIMIT %))"

	var rmod, rowid, n, limit, offset, sid, rowid = qparts[2];
	if (rmod = qparts[1]) {
		if (rmod.length > 1) n = +rmod.substr(0, rmod.length-1);
		else n = 3;

		limit = n*2 + 1;
		sid = find_rowid.f(rowid, n);
	} else if (rmod = qparts[3]) {
		rmod = +rmod;

		limit = Math.abs(rmod) + 1;

		if (rmod > 0) sid = rowid;
		else sid = find_rowid.f(rowid, limit);
	} else {
		limit = 1;
		sid = rowid;
	}


	//var sql = "SELECT loginfo.rowid, timestamp, type, nick, content FROM loginfo, logtext WHERE loginfo.rowid >= % AND channel = ? AND server = ? AND loginfo.rowid = logtext.docid ORDER BY loginfo.rowid ASC LIMIT ?".f(sid);
	var sql = "SELECT loginfo.rowid, timestamp, type, nick, content FROM loginfo, logtext WHERE loginfo.rowid >= % AND server = ? AND loginfo.rowid = logtext.docid ORDER BY loginfo.rowid ASC LIMIT ?".f(sid);

	var params = [/*message.channel, */mod.irc.getServerName(), limit];

	print_r(sql); print_r(params);

	db.query(sql, params, function(result) {
		//print_r(result);

		if (!result.length) message.respond("Not found");
		else echoLines(result, message);
	});
}

function echoLines(lines, message) {
	var msg = [];

	msg.push(new Date(lines[0].timestamp).format('%Y/%m/%d %H:%M:%S'));

	lines.forEach(function(line) {
		var lmsg;
		switch(line.type) {
			case 'PRIVMSG':
				lmsg = "<{nick}> {content}";
				break;
			case 'JOIN':
				lmsg = "* {nick} has joined {channel}";
				break;
			case 'PART':
				lmsg = "* {nick} has left {channel}";
				break;
			case 'QUIT':
				lmsg = "* {nick} has quit ({content})";
				break;
			case 'KICK':
				lmsg = "* {nick} has been kicked by {content}";
				break;
			default:
				lmsg = "* {nick} {type} {content}";
				break;
		}

		line.channel = message.channel;
		lmsg = lmsg.fo(line);

		msg.push(lmsg);
	});

	if (lines.length == 1) msg[0] += ' ' + msg.pop();

	msg.forEach(function(m) {
		message.respond(m);
	});
}

function chanstats(message) {
	var linenum, timefirstline, from, to;

	

	db.query('SELECT count(*) c FROM loginfo WHERE channel = ? AND server = ?', [message.channel, mod.irc.getServerName()], function(res) {
		linenum = res[0].c;

		db.query('SELECT timestamp FROM loginfo WHERE channel = ? AND server = ? ORDER BY rowid LIMIT 1', [message.channel, mod.irc.getServerName()], function(res) {
			timefirstline = res[0].timestamp;

			message.respond(message.channel + ': logged ' + linenum + ' lines since ' + timefirstline);
		})
	});
}



function stats(message) {
	var query = message.qtxt.split(/\s+/);

	var nick, chan;

	if (query.length == 2) {
		if (!/^#[\w#]$/.test(query)) {
			message.respond("Invalid query");
			return;
		}

		chan = query[0].substr(1);

		nick = query[1];
	} else {
		chan = normalizeChan(message.channel);

		nick = query[0];
	}

	var qcount = 'SELECT count(*) c, min(docid) minid, max(docid) maxid FROM "%" WHERE nick MATCH ?'.f(chan);
	var qftime = 'SELECT timestamp FROM loginfo WHERE rowid = ? OR rowid = ? ORDER BY timestamp ASC';
	//var qltime = 'SELECT timestamp FROM loginfo WHERE rowid = ?';

	var count, frid, lrid, ftime, ltime;

	print_r(qcount);

	db.query(qcount, ['"'+nick+'"'], function(res) {
		console.log('hai');
		if (!res[0].c) {
			message.respond('Not found');
			return;
		}

		print_r(res);

		count = res[0].c;
		frid = res[0].minid;
		lrid = res[0].maxid;

		db.query(qftime, [frid, lrid], function(res) {
			print_r(res);
			ftime = new Date(res[0].timestamp);
			ltime = new Date(res[1].timestamp);

			var diff = ltime - ftime;

			var days = Math.ceil(diff / 1000 / 60 / 60 / 24);

			var linesper = count / days;

			message.respond('Stats for %: % lines, Average lines/day: % since %  -- DAYS: % COUNT: %'.f(nick, count.toCommaString(), linesper.toFixed(2), ftime, days, count));
		});
	});

}

mod.on('!markov', markov2);

var mark = null;
function markov2 (message) {

	if (!mark) { 
		mark = require('markov')(2)
		message.respond("I iz thinking...");
		db.query('SELECT content FROM "' + normalizeChan(message.channel) + '"', function(res) {
			var seed = res.map(function(l) { return l.content }).join('\n');
			mark.seed(seed, function() {
				message.respond(mark.respond(message.query.text).join(' '));
			});
		});
	} else {
		message.respond(mark.respond(message.query.text).join(' '));
	}
}


var dontspeak = false;
function talkaboutme(message) {
	if (!dontspeak && message.direction == 'incoming' && !/^[!\.]/.test(message.text) && RegExp(mod.irc.state.nick, 'i').test(message.text)) talk(message, message.toMe());
}

exports.chatPrependNick = false;

var timeout = null;
mod.on('!stfu', function() {
	if (!timeout) {
		dontspeak = true;
		timeout = setTimeout(function() { dontspeak = false; timeout = null }, 3000);
	}
});

function talk(message, useall) {
	var text = message.text[0] == '!' ? message.query.text : message.text,
		seeds = text.replace(/[^A-Za-z0-9' ]/g, '').split(' ').filter(function(w) { return w.toLowerCase() != mod.irc.state.nick.toLowerCase() }),
		order = 3,
		max = 20,
		tblquery = function(table) { return 'SELECT content FROM "' + table + '" WHERE content MATCH $term' };

	seeds.sort(function(a,b) { return b.length - a.length });

	if (useall) {
		var usechan;
		if (useall && message.query.args[0][0] == '#') {
			usechan = normalizeChan(message.query.args[0]);
			seeds = seeds.filter(function(s) { return s != usechan.toLowerCase() });
		}
		getMemTables(function(tables) {
			dump(tables);
			chain(tables.filter(function(t) {
				return !usechan || (usechan && usechan == t.split('.')[1]);
			}).map(tblquery).join(' UNION '));
		});
	} else {
		chain(tblquery(normalizeChan(message.channel)));
	}

    function getorder() {
        return Math.max(2,~~(Math.random()*4))
    }

    order = getorder()

    dump(order)


	function chain(query) {
		/*console.log(query);
		console.log(seeds);*/

	var sentance = [seeds.shift()];

	getNext(sentance[0], order, function(set) {
		if (!set) set = seeds.shift();

		sentance.push(set);

		if (/*sentance.length >= max || */!sentance.last || set.split(' ').length < order) {
			message.respond((exports.chatPrependNick ? message.from + ': ' : '') + sentance.join(' '));
		} else {
			getNext(set, order, arguments.callee);
		}
	});

	function getNext(term, order, callback) {
		term = term.replace(/["]/g, '');
		//console.log(term);
		db.query(query, { $term: '"' + term + '"' },
			function(result) {
				var next = [];
				result.forEach(function(i) {
					var after = i.content.substr(
						i.content.toLowerCase().indexOf(term.toLowerCase()) + term.length
					).trim().split(' ');

					var nset = after.slice(0, order).join(' ');

					if (/^[\w\d', ]+$/.test(nset)) next.push(nset);
				});

				callback(next.length ? next.getRandom() : null);
			}
		);
	}
	}

}

function markov(message) {
	var maxlen = 20;
	var minlen = 5;
	var order = 3;
	var sentance = [message.query.text];

	var chan = normalizeChan(message.channel);

	var dbfrom = nmem + '.' + chan;

	var term = message.query.text;

	getNWS(message.query.text, order, function(final) {
		var stop = false, word;
		//chose word
		word = final.length ? final[~~(Math.random()*final.length)].next : '\0';

		sentance.push(word);

		if (sentance.length < minlen || (sentance.length < maxlen && word.substr(-1) !== '\0')) {
			getNWS(word.replace(/\u0000/g, ''), order, arguments.callee);
		} else {
			message.respond(sentance.join(' '));
		}
	//	console.log(final[~~(Math.random()*final.length)][0]);
	});

	function getNWS(term, order, callback) {
		order = order || term.split(' ').length;

		var total = 0;
		var nws = {};

		print_r(term);
		db.query('SELECT content FROM % WHERE content MATCH ?'.f(dbfrom), ['"' + term + '"'], function(res) {
			res.forEach(function(i) {
				var tpos = i.content.toLowerCase().indexOf(term.toLowerCase());
				var words = i.content.substr(tpos+term.length).trim().split(' ');
				//var match = RegExp(term + ' (.*)', 'i').exec(i.content);
				//if (!match) return;
				//var words = match[1].split(' ');

				//add stop mark
				words[words.length-1] += '\0';

				var nextw = words.slice(0, order).join(' ').toLowerCase();

				//var nextw = match[1].toLowerCase();

				if (typeof nws[nextw] == 'undefined') nws[nextw] = [];

				nws[nextw].push(i.content);
				total++;

			});

			var final = [];

			//console.log("Occurances: " + total);


			for (var i in nws) {
				var per = (nws[i].length / total * 100);
				final.push({
					next: i,
					count: nws[i].length,
					percent: per,
					context: nws[i]
				});
				//final.push([i, nws[i].length, per + '%', nws[i]]);
			}

			final.sort(function(a, b) {
				return b[1] - a[1];
			});

			callback(final);

		//	console.log(final[~~(Math.random()*final.length)][0]);

			//console.log(final);

	});
	
}


}
	




