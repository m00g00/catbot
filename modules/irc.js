with (require('./helper').log) {
		var log = putIRC;
		var getcolor = parseColor;
		var color = colors;
}

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

	respond: function(text) {
		var response = ({}).inherits(IRCMessage);

		response.command = this.command;

		response.text = text;
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
		
		var c;
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

			if (colored) 
				with ({i: parts.length-this.params.length}) 
					parts[i] = c.params + parts[i];

			if (this.trailing) parts.last = c.trailing + ':' + parts.last;

		}


		return parts.join(' ') + c.reset;
	},

	get text() {
		return this.params.last;
		//return this.params.length ? this.params.last : null;
		//return this.trailing ? this.trailing : null;
	},

	set text(txt) {
		this.trailing = txt;

		this.params.last = txt;
	},

	get args() {
		return typeof this.params.last == 'string' ? this.params.last.split(' ') : [];
	}

};


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
		var nickuserhost = /^([^!@. ]+)(?:!([^!@. ]+))?(?:@([^!@ ]+))?$/
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

var irc = mod.irc;

//IRC helper functions
function echo(line) {
	var message = parse(line, 'outgoing');

	log(color.red + '< ' + color.reset + message.toString(true));

	irc.write(line+'\r\n');
}

irc.echo = echo;

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

	//if (parts.length > 1) parts.last = ':' + parts.last;

	return parts.join(' ');
}

function command() {
	echo(makeCommand.apply(null, arguments));
}


mod.echo = echo;
mod.makeCommand = makeCommand;
mod.command = command;
mod.cmd = command;

//var transmorgrify = function(obj, numparams, textpos, list) {
var transmorgrify = function(params) {
	var obj = params.obj,
	    textpos = params.textpos, 
		list = params.list;

	list.forEach(function(i) {
		var func = function() {
			/*if (arguments.length != numparams || arguments.length != numparams+1)
			    throw '% expects % parameters'.f(i, numparams);

			var retcommand = false;
			if (arguments.length == numparams+1) {
				retcommand = Array.prototype.pop.call(arguments);
				if (typeof retcommand != 'boolean')
					throw "Extra parameter expected to be type boolean";
			}*/

			if (typeof textpos == 'number' && textpos >= 0)
			    arguments[textpos] = ':' + arguments[textpos];

			Array.prototype.unshift.call(arguments, i);

			var message = makeCommand.apply(null, arguments);

			echo(message);

			//if (retcommand) return message;
			//else echo(message);
		};

		obj[i.toLowerCase()] = func;
	});
};

			
transmorgrify({
	obj: mod,
	textpos: 1,
	list: ['PRIVMSG', 'NOTICE', 'SQUERY', 'PART']
});

var privmsg = mod.privmsg;

transmorgrify({
	obj: mod,
	textpos: null,
	list: ['JOIN']
});
	

		
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
mod.constructor.prototype.eventFilter = parseEvent;

//Expose helper functions to other modules
mod.constructor.addPrototype({
	echo: echo,
	privmsg: privmsg
});


//Read raw stream buffer
var buffer = '';

irc.on('data', function(data) {
	var lines = (buffer + data).split('\n');

	for (var i=0,l=lines.length-1; i<l; i++) {
		emitLine(lines[i]);
	}

	buffer = lines[i];
});

function emitLine(line) {

	var message = parse(line);

	log(color.yellow + '> ' + color.reset + message.toString(true));

	mod.emitAll('RAW', message);

	var caseCmd = message.command.toUpperCase();

	mod.emitAll(caseCmd, message);

	if (message.trailing) mod.emitAll(caseCmd + ' ' + message.args[0], message);

};

irc.on('connect', function() {
	irc.state.connect_time = new Date;

	mod.echo('NICK {nick}'.fo(mod.irc.conf));
	mod.echo('USER {user} {mode} * :{name}'.fo(mod.irc.conf));

	irc.state.nick = irc.conf.nick;
});	

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

	irc.commands.nick(newnick);
});

	

//MOTD end
mod.on(376, function() {
	//Send login messages if any
	if ('msg_on_login' in this.irc.conf) {
		var msg = this.irc.conf.msg_on_login;

		if (!(msg instanceof Array)) msg = [msg];

		msg.forEach(function(v) {
			var sfw = v.splitFirstWord();
			sfw.length == 2 && privmsg(sfw[0], sfw[1]);
		});
	}

	//if ('channels' i
});
			

mod.on('!insult', function(message) {
	print_r("DUDE");
	//print_r(message);
});

//print_r(mod._events);
	
	
