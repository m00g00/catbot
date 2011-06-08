var log = require('./helper').log;

mod.on(['!quote', '.quote'], quote);
mod.on('!quoteall', quoteall);
mod.on('!qa', quoteall);
mod.on('!qsn', qsn);
mod.on('!qs', qs);

mod.on('!log', loginfo);

mod.on('!stats', stats);

mod.on('!talk', talk);
mod.on('PRIVMSG', talkaboutme);

mod.on('PRIVMSG', expireCache);
mod.on('RAW', irclog);

var db = com.db;
/*var temp = require('./lib/db').
		   use(mod.irc.conf.database.type);

temp.connect({ file: ':memory:' }, function() {
	temp.query('CREATE TABLE wtf (dude, man)');
	temp.query('INSERT INTO wtf VALUES ("BLARGH", "ASDJKASHKDJASH")');
	temp.query('select * from wtf', function(res) { print_r(res); });
});*/

var temptables = {};

var nmem = mod.irc.getId();

db.query("PRAGMA database_list", function(result) {

if (!result.some(function(d) { return d.name == nmem }))
	db.query("ATTACH DATABASE ':memory:' AS " + nmem);
else 
	db.query("SELECT name FROM "+nmem+".sqlite_master WHERE type = 'table' AND sql LIKE 'CREATE VIRTUAL TABLE%'", function(result) {
		result.forEach(function(row) {
			temptables[row.name] = true;
		});

		print_r(temptables);
	});

});

mod.on('JOIN', function(message) {
	if (message.direction == 'incoming' && message.fromMe()) { 
		db.query("PRAGMA table_info(%)".f(normalizeChan(message.channel)), function(result) {
		
		if (!result.length)
			createChanTable(message.channel, mod.irc.getServerName());
		
		});
	}
});

function normalizeChan(chan) {
	return typeof chan == 'string' ? chan.replace(/[^A-Za-z0-9_]/g, '') : false;
}



function createChanTable(channel, server) {
		var cq,
			chan = normalizeChan(channel);
		cq = ("BEGIN TRANSACTION; DROP TABLE IF EXISTS {mem}.{chan}; " +
   			  "CREATE VIRTUAL TABLE {mem}.{chan} USING fts3(nick, content); " +
  			  "INSERT INTO {mem}.{chan} (docid, nick, content) " +
  			  "SELECT loginfo.rowid, nick, content FROM loginfo, logtext " +
  			  "WHERE channel = '{channel}' AND server = '{server}' AND type = 'PRIVMSG' " +
  			  "AND self = 0 AND SUBSTR(content, 1, 1) != '!' AND loginfo.rowid = logtext.docid; COMMIT").fo({mem: nmem, chan: chan, channel: channel, server: server});


		log.question('Creating temp table for ' + chan);
		db.query(cq, function(res) {
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
		!/PRIVMSG|JOIN|PART|QUIT|KICK|TOPIC|NICK/.test(message.command)) 
			return;

	var params = [
		(new Date).format('%Y-%m-%d %H:%M:%S'),
		message.command,
		message.from,
		message.host,
		message.channel,
		mod.irc.getServerName(),
		message.direction == 'outgoing' ? 1 : 0,
		message.raw
	];

	var chan = normalizeChan(message.channel);

	var sqlinfo = "INSERT INTO loginfo VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
	var sqltext = "INSERT INTO logtext (docid, content) VALUES (LAST_INSERT_ROWID(), ?)";
	var sqlcache = "INSERT INTO % (docid, nick, content) VALUES (LAST_INSERT_ROWID(), ?, ?)";

	db.transaction(function(tx) {
		tx.executeSql(sqlinfo, params);
		tx.executeSql(sqltext, [message.text]);
		if (chan && temptables[chan] && message.direction == 'incoming' && message.text[0] != '!' && message.command == 'PRIVMSG') 
			tx.executeSql(sqlcache.f(nmem + '.' + chan), [message.from, message.text]);
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

			sql = "SELECT % FROM %".f(
				fields.join ? fields.join(', ') : fields,
				chan
			);
			
			if (p.nick || p.text) {
				var match = '';
				if (p.nick) match += 'nick: ' + p.nick + ' ';
				if (p.text) match += 'content: ' + p.text;

				sql += ' WHERE % MATCH ?'.f(chan);
				param.push(match);
			} else {
				sql += " LIMIT 1 OFFSET (SELECT abs(random()) % count(*) FROM " + chan + ")";
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

						callback.call(null, thiz.all? line : this.length > 1 ? line.next() : this.length ? line[0] : null);
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
	var text = message.query.text;

	var q = makeQuery({
		fields: 'count(*) count',
		channel: message.channel,
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

function quote(message) {
	
	var querytxt = message.query.text.trim();

	if (querytxt[0] == '"' || querytxt[0] == "'") {
		quoteall(message);
		return;
	}

	var qp = message.query.text.splitFirstWord();

	var nick = qp[0];
	var text = qp[1];

	var q = makeQuery({
		nick: nick,
		channel: message.channel,
		server: mod.irc.state.server,
		text: text
	});

	q.execute(function(result) {
		if (result) message.respond(quotefmt.fo(result));
		else quoteall(message);
	});
}

function quoteall(message) {
	var q = makeQuery({
		channel: message.channel,
		server: mod.irc.state.server,
		text: message.query.text
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

	if (!qparts || (qparts[1] && qparts[3]) || (qparts[1] && +qparts[1].match(/^\d*/)[0] > 10)) { message.respond("Usage: !log logid | [[n]~]logid | logid[(+|-)n]"); return }

	var find_rowid = "(SELECT min(rowid) FROM (SELECT rowid FROM loginfo WHERE rowid < % ORDER BY rowid DESC LIMIT %))"

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

function stats(message) {
	var query = message.qtxt.split(/\s+/);

	var nick, chan;

	if (query.length == 2) {
		if (query[0][0] != '#') {
			message.respond("Invalid query");
			return;
		}

		chan = query[0].substr(1);

		nick = query[1];
	} else {
		chan = normalizeChan(message.channel.substr(1));

		nick = query[0];
	}

	var qcount = 'SELECT count(*) c, min(docid) minid, max(docid) maxid FROM % WHERE nick MATCH ?'.f(chan);
	var qftime = 'SELECT timestamp FROM loginfo WHERE rowid = ? OR rowid = ? ORDER BY timestamp ASC';
	//var qltime = 'SELECT timestamp FROM loginfo WHERE rowid = ?';

	var count, frid, lrid, ftime, ltime;

	print_r(qcount);

	db.query(qcount, [nick], function(res) {
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

			var days = diff / 1000 / 60 / 60 / 24;

			var linesper = count / days;

			message.respond('Stats for %: % lines, Average lines/day: %'.f(nick, count.toCommaString(), linesper.toFixed(2)));
		});
	});

}

function talkaboutme(message) {
	if (message.direction == 'incoming' && RegExp(mod.irc.state.nick, 'i').test(message.text)) talk(message);
}

function talk(message) {
	var text = message.text[0] == '!' ? message.query.text : message.text,
		seeds = text.replace(/[^A-Za-z0-9' ]/g, '').split(' ').filter(function(w) { return w.toLowerCase() != mod.irc.state.nick.toLowerCase() }),
		dbname = nmem + '.' + normalizeChan(message.channel),
		order = 2,
		max = 20;

	seeds.sort(function(a,b) { return b.length - a.length });

	var sentance = [seeds.shift()];

	getNext(sentance[0], order, function(set) {
		if (!set) set = seeds.shift();

		sentance.push(set);

		if (sentance.length >= max || !sentance.last || set.split(' ').length < order) {
			message.respond(sentance.join(' '));
		} else {
			getNext(set, order, arguments.callee);
		}
	});

	function getNext(term, order, callback) {
		term = term.replace(/["]/g, '');
		console.log(term);
		db.query('SELECT content FROM % WHERE content MATCH ?'.f(dbname), ['"' + term + '"'],
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
	




