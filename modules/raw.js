var hlog = require('./helper').log,
	log = hlog.putIRC;
	getcolor = hlog.parseColor;
	color = hlog.colors;

/*irc.registerStreamEvents(mod);
mod.on('stream::data', onData);
mod.on('stream::connect', onConnect);
mod.on('PING', onPing);
mod.on(433, onInUseNick);
mod.on(376, onMotdEnd);*/

var irc = mod.irc;


var IRCMessage = {
	/*nick: null,
	user: null,
	host: null,

	command: null,

	params: [],
	trailing: null,

	direction: 'incoming',

	raw: '',*/

	paramsToString: function() {
		var params = this.params.slice();
		if (this.trailing) params.last = ':' + params.last;

		return params.join(' ');
	},

	toMe: function() {
		return this.to && this.to.toLowerCase() == irc.state.nick.toLowerCase();
	},

	fromMe: function() {
		return this.from && this.from.toLowerCase() == irc.state.nick.toLowerCase();
	},

	clone: function() {
		var clone = {}.meld(this);
		clone.params = this.params.slice();
		clone.inherits(IRCMessage);
		//print_r(this.text); print_r(clone.text);console.log('--');
		//clone.raw = clone.toString();

		return clone;
	},

	reverse: function() {
		var rev = {
			//nick: irc.state.nick,
			command: this.command,

			params: [this.toMe() ? this.from : this.to],

			direction: 'outgoing'
		}

		rev.inherits(IRCMessage);
		rev.raw = rev.toString();

		return rev;
	},

	respond: function(text) {
		if (this.command != 'PRIVMSG' && this.command != 'NOTICE' && this.command != 'JOIN' && this.command != 'CTCP') throw "Message not respondable";

		var response = this.reverse();

		if (response.command == 'JOIN') response.command = 'PRIVMSG';

		if (this.command == 'CTCP') { 
			response.command = 'NOTICE';
			text = '\x01' + this.args[0] + ' ' + text + '\x01';
		}

		txtSplit(text).forEach(function(l) {
			var clone = response.clone();
			clone.text = l;
			//dump(clone);
			//print_r(clone);
			echo(clone);
		});

		//response.text = text;

		/*var response = Object.newChild(IRCMessage).meld(this);

		response.nick = response.user = response.host = null;
		
		response.direction = 'outgoing';

		response.params[0] = this.toMe() ? this.from : this.to;

		response.text = text;*/

		//echo(response);

	},

	colors: {
		nick: color.bold.cyan,
		user: color.cyan,
		host: color.cyan,
		command: color.bold.green,
		params: color.bold.white,
		trailing: color.reset,
		pre: color.yellow,
		reset: color.reset
	},

	toString: function(colored) {
		
		var c, i;
		if (colored) {
			c = this.colors;
		} else {
			c = {};
			this.colors.forEach(function(v,n) {c[n] = '';});
		}

		var parts = [];

		var prefix = ':';

		if (this.nick) prefix += c.nick + this.nick;
		if (this.user) prefix += c.pre + '!' + c.user + this.user;
		if (this.host) prefix += (this.nick ? c.pre + '@' : '') + c.host + this.host;

		if (prefix.length > 1) parts.push(prefix);

		parts.push(c.command + this.command);

		if (this.params.length) {

			parts.push.apply(parts, this.params);

			if (colored) {
				i = parts.length - this.params.length;
				parts[i] = c.params + parts[i];
			}

			if (this.trailing) parts.last = c.trailing + ':' + parts.last.replace(/\u000e/g, '');

		}


		return parts.join(' ') + c.reset;
	},

	get text() {
		return this.params ? this.params.last : undefined;
		//return this.params.length ? this.params.last : null;
		//return this.trailing ? this.trailing : null;
	},

	set text(txt) {
		if (!this.trailing) this.params.push(txt);
		else this.params.last = txt;

		this.trailing = txt;
	},

	get args() {
		return typeof this.params == 'undefined' ? undefined : typeof this.params.last == 'string' ? this.params.last.split(' ') : [];
	},

	get from() {
		return this.direction == 'outgoing' ? mod.irc.state.nick : this.nick;
	},

	get to() {
		return this.params ? this.params[0] : undefined;
	},

	get query() {
		if (typeof this.text == 'undefined') return undefined;

		if (!this._query) {
				var qobj = {};
				var qparts = this.text.splitFirstWord();
				qobj.command = qparts[0];
				qobj.cmd = qobj.command;
				qobj.text = qparts[1] || '';
				qobj.args = qparts[1] ? qparts[1].split(' ') : [];
				this._query = qobj;
		}

		return this._query;
	},

	get qcmd() {
		return this.query ? this.query.command : undefined;
	},

	get qtxt() {
		return this.query ? this.query.text : undefined;
	},

	get qarg() {
		return this.query ? this.query.args : undefined;
	},

	get channel() {
		return typeof this.params == 'undefined' ? undefined : this.params[0] && this.params[0][0] == '#' ? this.params[0] : null;
	},

	toJSON: function() {
		var jobj = ({}).meld(this);
		['text', 'args', 'from', 'to', 'query', 'qcmd', 'qtxt', 'qarg']
			.forEach(function(e) {
				jobj[e] = this[e];
			}, this);
			print_r(jobj);


		return jobj;
	}

};

exports.IRCMessage = IRCMessage;

var parse = function(line, direction) {
	var message = {
		nick: null,
		user: null,
		host: null,

		command: null,

		params: [],
		trailing: null,

		direction: direction || 'incoming'
	};

	message.inherits(IRCMessage);

	var precompar = /^(?::([^ ]+) )?([A-Za-z]+|\d{3})(?: (.*))?/;

	var mparts = precompar.exec(line);

	if (!mparts) return false;


	var prefix = mparts[1];
	var command = mparts[2];
	var params = mparts[3];

	if (prefix) {
		var nickuserhost = /^([^!@. ]+)(?:!([^!@ ]+))?(?:@([^!@ ]+))?$/
		var nuhmatch = nickuserhost.exec(prefix);
		if (nuhmatch) {
			message.nick = nuhmatch[1];
			message.user = nuhmatch[2] || null;
			message.host = nuhmatch[3] || null;
		} else {
			message.host = prefix;
		}
	}

	message.command = command;

	if (params) {
		var cpos = params.indexOf(':'), sparams;

		if (cpos == 0) {
			sparams = [(message.trailing = params.substr(1))]
		} else if (cpos > 0) {
			sparams = params.substr(0, cpos-1).split(' ');
			sparams.push(message.trailing = params.substr(cpos+1));
		} else {
			sparams = params.split(' ');
		}

		message.params = sparams;
	}

	message.raw = line;

	return message;
};


//IRC helper functions
var queue = [];
exports.queue = queue;
queue.add = function(message) {
	queue.push(message);

	queue.run();
}

queue.run = function(slow) {
	if (queue.wait) return;

	var now = +new Date, 
		max = slow ? 1 : irc.conf.flood_max_lines, 
		interval = irc.conf.flood_interval;
	if (!queue.start || now - queue.start > interval) {
		queue.start = now;
		queue.count = 0;
	}

	//[queue, now, max, interval, queue.start, queue.count].forEach(function(e){ print_r(e) });

	var line;
	while (now - queue.start < interval && ++queue.count <= max && (line = queue.shift())) {
		put(line);
	}

	if (queue.length) {
		console.log("THROTTLE");
		queue.wait = true;
		setTimeout(function() {
			queue.wait = false;
			queue.start = null;
			queue.run(true);
		}, 500);
	}

	/*if (!this.active && this.length) {
		put(this.shift());
		this.active = true;
		setTimeout(function() {
			queue.active = false;
			queue.run();
		}, 100);
	}*/
}


function put(message) {
	irc.write(message.toString().replace(/[\r\n]/g, '') + '\r\n');
	emitLine(message);
}

function echo(line) {
	var message;
	if (line.__proto__ != IRCMessage) {
		message = parse(line, 'outgoing');
	} else {
		message = line;
		message.direction = 'outgoing';
		//line = message.toString();
	}

	if (irc.conf.flood_throttle) queue.add(message);
	else put(message);


	//log(color.red + '< ' + color.reset + message.toString(true));

	//irc.write(line+'\r\n');

	//emitLine(message);
}

com.echo = echo;

function txtSplit(text) {
	var lines = [], maxlen = 425;
	(''+text).split('\n').forEach(function(l) {
		lines = lines.concat(l.length > maxlen ? l.match(RegExp('.{1,'+maxlen+'}', 'g')) : l)
	});

	return lines;
}

function makeCommand() {
	var parts = [];
	parts.push((''+arguments[0]).toUpperCase());

	for (var i=1, l=arguments.length, arg; i<l; ++i) {
		if (arguments[i][0] == ':' || (''+arguments[i]).indexOf(' ') != -1) {
			parts.push(
				arguments[i][0] != ':' ? ':' : '' +
				Array.prototype.splice.call(arguments, i).join(' ')
			);
			break;
		} else {
			parts.push(arguments[i]);
		}
	}

	return parts.join(' ');
}

function command() {
	echo(makeCommand.apply(null, arguments));
}

exports.echo = echo;
exports.makeCommand = makeCommand;
exports.command = command;
exports.cmd = command;

//var transmorgrify = function(obj, numparams, textpos, list) {
var transmorgrify = function(params) {
	var obj = params.obj,
	    textpos = params.textpos, 
		list = params.list;

	list.forEach(function(i) {
		var func = function() {

			if (typeof textpos == 'number')
			    arguments[textpos] = ':' + arguments[textpos];

			Array.prototype.unshift.call(arguments, i);

			var message = makeCommand.apply(null, arguments);

			echo(message);

		};

		obj[i.toLowerCase()] = func;
	});
};

			
transmorgrify({
	obj: exports,
	textpos: 1,
	list: ['PRIVMSG', 'NOTICE', 'SQUERY', 'PART']
});


transmorgrify({
	obj: exports,
	textpos: null,
	list: ['JOIN', 'NICK']
});

transmorgrify({
	obj: exports,
	textpos: 0,
	list: ['QUIT']
});

//Transform exported functions to irc common
com.meld(exports);

irc.quit = function(msg) {
	com.quit(msg || irc.conf.quit_msg);
}

irc.privmsg = com.privmsg;


var privmsg = exports.privmsg;

exports.ctcp = com.ctcp = function(to, msg) {
	com.notice(to, '\x01' + msg + '\x01');
}
		
/*function privmsg(to, text) {
	echo('PRIVMSG '+to+' :'+text);
}*/
	


//var lineformat = '{:}{nick}{!}{ident}{@}{host} {type} {to} {:}{text}';
//var lineformat = '{#}{:}{nick}{!}{user}{@}{host}{command} {params}{trailing}';

//Capitalize == bold
/*var linecolors = {
	'#': 'res',
	':': 'res',
	'nick': 'Cyan',
	'user': 'cyan',
	'host': 'cyan',
	'command': 'Green',
	'params': 'White',
	'trailing': 'res',
	'!': 'yellow',
	'@': 'yellow',
};*/


/*linecolors.iterate(function(v,n) {
	linecolors[n] = getcolor(v);
});

var logRawFormat = function(tl) {
	var nl = ({}).meld(tl);

	if (tl.nick || tl.user || tl.host) {
		nl[':'] = ':';
		//nl[':'] = tl.nick || tl.user || tl.host ? ':' : '';
		nl['!'] = tl.nick && tl.user ? '!' : '';
		nl['@'] = tl.nick && (tl.user || tl.host) ? '@' : '';
		nl.command = ' '+nl.command;
	} else {
		nl[':'] = nl['!'] = nl['@'] = '';
	}

	nl['#'] = tl.direction == 'outgoing' ? '#' : '';

	nl.params = tl.params.slice();

	if (tl.trailing) {
		nl.params.pop();
		nl.trailing = (nl.params.length ? ' ' : '') + ':'+tl.trailing;
	}

	nl.params = nl.params.join(' ');

	log(
		lineformat, 
		nl, 
		mod.conf['format_messages_'+tl.direction] ? 
			linecolors : null
	);
}*/


//Override default echo
var parseEvent = function(event) {
	var parsedEvent = null, match;

	typeof event == 'number' && (event = event.toString());

	if (typeof event == 'string') {
		
		//Simple IRC command
		if (/^[A-Z0-9]+/.test(event)) {

			parsedEvent = event;

		//Simple IRC text command
		} else if (/^([A-Z0-9]+)\s([^\s]+)$/.test(event)) {

			parsedEvent = event;

		//Simple IRC text
		} else if (/^[^\s]+$/.test(event)) {
			
			parsedEvent = 'PRIVMSG ' + event;

		}
	}

	return parsedEvent;
}

//Hook filter into module events
com.eventFilter = parseEvent;

//Expose helper functions to other modules

/*mod.constructor.addPrototype({
	echo: echo,
	privmsg: privmsg
});*/


//Read raw stream buffer
var buffer = '';
function ondata(data) {
	var lines = (buffer + data).split('\r\n');

	for (var i=0,l=lines.length-1; i<l; i++) {
		emitLine(lines[i]);
	}

	buffer = lines[i];
};

irc.on('data', ondata);


function cutelog(msg) {
	p = [ color.bold.green + msg.command ];

	if (msg.command == 'QUIT' || msg.command == 'NICK') p.push(mod.irc.getServerName());
	else if (msg.toMe()) p.push(color.bold.white + mod.irc.state.nick);
	else if (msg.channel) p.push(color.white + msg.channel.replace(/^#+/, color.yellow + '$&' + color.reset + color.cyan));

	if (msg.nick) p.push(color.bold.white + msg.nick + color.yellow + ':');
	else if (msg.direction == 'outgoing')
		p.push(color.bold.white + mod.irc.state.nick + color.red + ':');

	p.push(msg.text + color.reset);

	return p.join(color.reset + ' ');
}


function emitLine(line) {

	var message = typeof line == 'string' ? parse(line) : line;

	if (message.command == 'PRIVMSG' && message.toMe() && message.text[0] == '\x01' && message.text[message.text.length-1] == '\x01') {
		message.command = 'CTCP'; message.text = message.text.slice(1, message.text.length - 1);
	}

	if ((message.command != "PING" && message.command != "PONG") || global.share.log_pingpong == true) 
		if (share.log_short && /PRIVMSG|QUIT|JOIN|PART/.test(message.command)) 
			log(cutelog(message));
			/*log(('{g}{channel}{r} ' + 
			(message.direction == 'outgoing' ? '{Y}<{w}{self}{Y}>{r} ' : message.nick ? '{y}<{c}{nick}{y}>{r} ' : '') +
			'{text}{r}').fo(
						{ y: color.yellow, Y: color.bold.red, g: color.bold.green, w: color.bold.white, self: mod.irc.state.nick,
						  c: color.bold.cyan, r: color.reset, b: color.blue,
						  channel: message.channel, nick: message.nick, 
						  text: message.text }));*/
		else 
			log(
				(servers.numProperties() > 1 ? color.grey + mod.irc.getId()[0] + color.reset + '': '') +
				(message.direction == 'outgoing' ? 
					color.red + '< ' : color.yellow + '> ') + 
				color.reset + 
				message.toString(true)
			);

	mod.emitAll('RAW', message);


	var caseCmd = message.command.toUpperCase();


	mod.emitAll(caseCmd, message);

	if (message.direction != 'outgoing' && message.trailing) 
		mod.emitAll(caseCmd + ' ' + message.args[0].toLowerCase(), message);

};

function onconnect() {
	irc.state.connect_time = new Date;

	irc.state.nick = irc.conf.nick;

	echo('NICK {nick}'.fo(mod.irc.conf));
	echo('USER {user} {mode} * :{name}'.fo(mod.irc.conf));

};	

irc.on('connect', onconnect);

mod.on('PING', function(message) {
	echo('PONG :' + message.text);
});
	
mod.on(433, function() {
	var newnick;
	if ('alt_nicks' in irc.conf) {
		var alt = irc.conf.alt_nicks;
		if (!(alt instanceof Array)) alt = [alt];

		var next = alt.indexOf(irc.state.nick) + 1;

		if (next < alt.length) newnick = alt[next];
	}

	if (!newnick) newnick = irc.state.nick + (~~(Math.random() * 100)).toString();

	com.nick(newnick);
});

mod.on('NICK', function(message) {
	if (message.nick == irc.state.nick || (message.nick === null && message.direction == 'outgoing')) irc.state.nick = message.params.last;
});

mod.on('JOIN', function(message) {
	if (message.direction == 'incoming' && message.fromMe()) irc.state.channels.push(message.channel);
});

mod.on('PART', function(message) {
	if (message.direction == 'incoming' && message.fromMe()) 
		irc.state.channels = irc.state.channels.filter(
			function(chan) { return chan != message.channel; });
});
	

//MOTD end
mod.on(376, startup);
mod.on(422, startup);

function startup() {
	irc.state.logged_in = true;
	//Send login messages if any
	mod.irc.doInConf('msg_on_login', function(msg) {
		var sfw = msg.splitFirstWord();
		sfw.length == 2 && privmsg(sfw[0], sfw[1]);
	});

	mod.irc.doInConf('channels', function(channel) {
		com.join(channel);
	});
};

/*mod.on('PRIVMSG \x01', function(message) {
	console.log("CTCPSOMETHING");
	var clone = message.clone();
	clone.text = clone.text.substr(1);
	mod.emitAll('CTCP', clone);
});*/

mod.on('CTCP version', function(message) {
	message.respond(mod.irc.conf.version);
});

mod.on('CTCP time', function(message) {
	message.respond(new Date);
});

mod.on('CTCP ping', function(message) {
	message.respond(message.args[1]);
});

mod.on('UNLOAD', function() {
	irc.removeListener('connect', onconnect);
	irc.removeListener('data', ondata);
});





/*mod.on('!stfu', function(message) {
	queue.splice(0);
});*/


			


//print_r(mod._events);
	
	
