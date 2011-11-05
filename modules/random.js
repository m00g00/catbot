mod.on('!date', date);
mod.on('!pi', pi);
mod.on('!commands', listcommands);
mod.on('!math', math);
mod.on('!spell', spell);
//mod.on(['.js', '..'], js);
//mod.on(['.jsreset', '.jsr'], force_resetcontext);
['!rock', '!paper', '!scissors'].forEach(function(e) {
	mod.on(e, rps);
});

exports.peen = function(msg) {
	var r=function(c,m){return Array(~~(Math.random()*m)).join(c)}; 
	return r('#',4)+'8'+r('=',30)+'D'+r('~',10)
}
mod.on('.peen', function(msg) {
	msg.respond(exports.peen());
});
/*mod.on('.kafc', function(msg) {
	msg.respond(kaffine_compile(msg.query.text).trim());
});*/
/*mod.on('.kafr', function(msg) {
	var code = kaffine_compile(msg.query.text).trim();
	var clone = msg.clone();
	clone.query.text = code;
	js(clone);
});*/

/*mod.on('.perf', function(msg) {
	var nmsg = msg.clone();

	nmsg.text = '.pref var __i = 999999; console.time(); while (--__i) { ' + msg.query.text + '}; console.timeEnd()';

	js(nmsg);
});*/

mod.on('!uptime', function(message) {
	var now = new Date,
		connect_time = now - mod.irc.state.connect_time,
		process_time = now - global.share.process_start_time;
		

	var calcdiff = function(diff) {
		var second = 1000,
			minute = second * 60,
			hour   = minute * 60,
			day	   = hour * 24;

		var days    = ~~(diff / day),
			hours   = ~~((diff -= days * day) / hour),
			minutes = ~~((diff -= hours * hour) / minute),
			seconds = ~~((diff -= minutes * minute) / second),
			millise = (diff -= seconds * second)
		
		var o = [ { days: days }, { hours: hours }, { minutes: minutes }, { seconds: seconds }, { milliseconds: millise } ];

		return o.filter(function(e) {
			return e[Object.keys(e)[0]];
		}).map(function(e, i, a) {
			var k = Object.keys(e)[0];
			if (!e[k]) return '';

			return (i == a.length - 1 ? 'and ' : '') + e[k] + ' ' + (e[k] > 1 ? k : k.substr(0, k.length-1));
		}).join(' ');
	}

	message.respond(
		process_time == connect_time ?
			"I haz not crashed, and has been connected to thiz server for " + calcdiff(process_time) :
			"I haz not crashed for " + calcdiff(process_time) + " and has been connected to this server for " + calcdiff(connect_time)
	);
});

var Chess = {
	colors: {
		w: 7,
		b: 8,
		piece: 1
	},
	empty: '-',
	codestart: 0x2654,
	generatePieces: function() {
		Chess.pieces = { white: {}, black: {} };
		['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'].each(function(n,i,a) {
			var w = String.fromCharCode(Chess.codestart+i)+n[0], b = String.fromCharCode(Chess.codestart+a.length+i)+n[0];
			Chess.pieces.white[n] = w; 
			Chess.pieces.black[n] = b;
			Chess.pieces[n] = { white: w, black: b };
		});
	},

	makeBoard: function() {
		var board = [], colors = ['w', 'b', 'w'], color, side, piece, r, c, row,
			setup = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
		for (r=0; r<8; r++) {
			board[r] = [];
			for (c=0; c<8; c++) {
				color = colors[r % 2 == 0 ? c % 2 : (c+1) % 2];
				side = r > 3 ? 'white' : 'black';
				piece = r == 0 || r == 7 ? Chess.pieces[side][setup[c]] : r == 1 || r == 6 ? Chess.pieces[side].pawn : Chess.empty;

				board[r][c] = '\x03' + (piece == Chess.empty ? Chess.colors[color] : Chess.colors.piece) + ',' + Chess.colors[color] + piece;
			}
		}

		return board;
	},


	

};

Chess.generatePieces();

exports.Chess = Chess;



mod.on('.oldchess', function(msg) {
	var board = Chess.makeBoard();

	board.each(function(r) {
		var line = r.map(function(e) { return e + (e[e.length-1] == Chess.empty ? ' ' : '') }).join(''); //r.map(function(e) { var colors = e.match(/^\x03(\d{1,2}),(\d{1,2})/); return e + ' '; /*return e + '\x03' + colors[2] + ',' + colors[2] + '-'*/ }).join('');
		console.log(JSON.stringify(line));
		msg.respond(line);
	});
});
			
/*mod.on('.chess', function(msg) {
	var resp = */




/*mod.on('.php', function(

var meta = require('./lib/meta');*/

mod.on('!give', function(msg) {
	var p = /^\s*([^\s]+)\s+(?:([\+-]?\d+)\s+)?(.*)\s*/(msg.query.text);

	if (!p) { msg.respond("Give what to who now?"); return; }

	var meta = require('./lib/meta');

	var nick = p[1], num = !isNaN(p[2]) ? +p[2] : 1, item = p[3];

	var ident = { type: 'items', name: nick, server: mod.irc.getServerName(), channel: msg.channel, key: item };
	meta.get(ident, function(obj) {
		if (!(item in obj)) obj[item] = 0;

		obj[item] += num;
		meta.update(obj);

		msg.respond(msg.nick + " gave " + num + " " + item + " to " + nick + ", " + nick + " now has " + obj[item] + " " + item);
	});
});

/*function extractDateTime(from) {
	var times = [], tn = 0, s = 0, p;
	if (typeof from == 'string') from = from.split(/\s+/);


	while (from.length && s < from.length) {
		console.log(from.join(' '));
		p = from.length;

		while (!+(times[tn] = new Date(from.slice(s, --p).join(' '))) && p) {}

		console.log(s, p);
		if (p) { from.splice(s, p); tn++ }
		else s++;

	}

	return [times, from];
}*/

mod.on('!alarm', function(msg) {
	var time, message, qargs = msg.qarg, p = qargs.length;

	while (!+(time = new Date(qargs.slice(0, --p).join(' '))) && p) {}

	if (!p) { 
		msg.respond("Invalid Date");
		return;
	} else if (time <= Date.now()) {
		msg.respond("Date has already passed...");
		return;
	}

	var meta = require('./lib/meta');
	var key = time.toLocaleString();
	message = qargs.slice(p).join(' ');

	meta.get({ type: 'nick', name: msg.nick, server: mod.irc.getServerName(), channel: msg.channel, key: 'alarms' }, function(obj) {
		obj['alarms'] = { time: time, message: message };
		meta.update(obj);
		
		msg.respond("Alarm set for " + key)
	});

});

mod.on('!alarms', function(msg) {
	require('./lib/meta').get({ type: 'nick', name: msg.nick, server: mod.irc.getServerName(), channel: msg.channel }, function(obj) {
		dump(obj);
		msg.respond(obj.time + ': ' + obj.message);
	});
});

function spell(message) {
	var spawn = require('child_process').spawn,
		word = message.query.text,
		child = spawn('aspell', ['pipe']),
		buffer = '';

	child.stdout.on('data', function(data) {
		buffer += data;
	});

	child.on('exit', function(code) {

		var lines = buffer.trim().split('\n').slice(1), line;

		if (lines.length == 1) {
			line = lines[0];
			message.respond(line[0] == '*' ? 'Correct' : line.split(':')[1].trim());
		} else {
			var correct = lines.map(function(line, i) {
				return line[0] == '*' ? message.query.args[i] : line.split(':')[1].trim().split(',')[0];
			}).join(' ');

			message.respond(
				correct == message.query.args.join(' ') ?
					'Correct' : correct
			);
		}

	});

	child.stdin.end(word);
}

function date(message) {
	message.respond((new Date).toString());
}

function pi(message) {
	message.respond(Math.PI);
}

//var kaffine = require('kaffeine');

function kaffine_compile(code) {
	return kaffine.fn.compile(code);
}

var jsctx = {}, jshist = {};
function spawncontext(message) {
		var msgs = [],
			getmsg = function() { 
				return msgs.length ? msgs.shift() : message
			},
			child = require('./lib/fork').fork(function() {
			var vm = require('vm'),
				util = require('util'),
				markup = require('./markup'),
				//inspect = util.inspect,
				inspect = require('./eyes').inspector({ 
					styles: false,
					pretty: false, 
					stream: null,
					maxLength: 200
				}),

				times = [];
				//bf = require('node-brainfuck'),
				context = {
					markup: markup,
					console: {
						log: function(obj) {
							process.postMessage(inspect(obj));
						},

						time: function(label) { times[label] = Date.now() },
						timeEnd: function(label) { return (typeof label != 'undefined' ? label + ': ' : '') + (Date.now() - times[label]) + 'ms' },

						perf: function(code) { 
							var body;
							if (typeof code == 'function') {
								body = code.toString().match(/^function.*?\{(.*)\}$/)[1];
							} else if (typeof code == 'string') {
								body = code;
							} else {
								throw Error("Invalid code provided for testing");
							}

							return eval('this.time(); var i=999999; while(--i) {' + body + '}; this.timeEnd()');
						}

					},
					print: function(obj) {
						process.postMessage(inspect(obj));
					},

					//markup: require('./lib/markup')

					//bf: bf,

					//setTimeout: global.setTimeout,
					//setInterval: global.setInterval,
					//clearInterval: global.clearInterval
				};
			process.on('message', function(msg) {
				if (msg == '#PING') process.postMessage('#PONG');
				else {
					process.postMessage(
						inspect(vm.runInNewContext(msg, context))
					);
					process.postMessage('#DONE');
				}

				/*process.postMessage(
					msg == '#PING' ? '#PONG' :
					inspect(vm.runInNewContext(msg, context))
				);*/
			});
		});

		var ping = false, buffer = [];
		child.on('message', function(m) {
			if (ping && m == "#PONG") {
				ping = false;
			} else if (m == '#DONE') {

				getmsg().respond(buffer.map(function(b) {
					return (b.length > 200 ? b.substr(0, 200) + '\x0f ...' : b).replace(/\n/g, '\\n');
				}).join('; '));
				buffer.length = 0;

			} else {
				buffer.push(m);
				/*m = m.replace(/\n/g, '');
				if (m.length > 200) m = m.substr(0, 200) + '\x0f ...';
				message.respond(m);*/
			}
		});

		child.on('error', function(e) {
			getmsg().respond(
				e.replace(/\n/g, '')
			);
		});

		var _post = child.post;
		child.post = function(msg, p) {
			if (p) _post(msg)
			else { 
				msgs.push(msg); 
				_post(msg.query.text);

				setTimeout(function() {
					ping = true;
					child.post('#PING', true)
					setTimeout(function() {
						if (ping) {
							child.emit('error', 'Error: Timeout');
							resetcontext(getmsg());
						}
					}, 500);
				}, 10000);
			}
		};

		return child;
}

function force_resetcontext(message) {
	resetcontext(message);
	message.respond('Context reset');
}

function resetcontext(message) {
	var ctxname = message.channel ? message.channel : message.from;

	if (jsctx[ctxname]) {
		jsctx[ctxname].kill('SIGKILL');
		delete jsctx[ctxname];
	}

	jsctx[ctxname] = spawncontext(message);
}

exports.ctx = jsctx;
exports.hist = jshist;

function js(message) {
	if (!message.query.text.trim()) return;
	var ctxname = message.channel ? message.channel : message.from;

	var ctx = jsctx[ctxname] || (jsctx[ctxname] = spawncontext(message)),
		hist = jshist[ctxname] || (jshist[ctxname] = []);

	ctx.post(message);
	hist.push(message.query.text);

}

function math(message) {
	var eq = message.query.text;

	try {
	var rKeyword = /[A-Za-z_$][A-Za-z0-9_$]*/g
	if (rKeyword.test(eq)) {
		var valid = Object.getOwnPropertyNames(Math);
		if (!eq.match(rKeyword).every(function(e) { return valid.indexOf(e) != -1 }))
			throw "Invalid equation";
	}

	var vm = require('vm');

	var answer = vm.runInNewContext('with(Math) ' + eq);

	message.respond(answer);

	} catch(e) {
	
	message.respond("Error: " + e);
	
	}
}



function listcommands(message) {
	var list = [], cmdfilter;
	if (mod.irc.conf.filter)
		cmdfilter = mod.irc.conf.filter.filter(function(f) { return f.channels.indexOf(message.channel) != -1 });

		print_r(cmdfilter);

	mod.irc.modules.forEach(function(module, name) {
		console.log(name);
		if (module._events) module._events.forEach(function(action, command) {
			var cp = command.match(/^PRIVMSG ([^\w]\w+)/);
			if (cp && (!cmdfilter || !cmdfilter.length || cmdfilter.every(function(f) { return f.blacklist.indexOf(cp[1]) == -1 }))) {
				list.push(cp[1]);
			}
		});
	});

	message.respond(list.join(' '));

}


function rps(message) {
	message.respond(['rock', 'paper', 'scissors'][~~(Math.random()*3)]);
}

void function() {
	function flip() {
	 var result = flipString(document.f.original.value.toLowerCase());
	 document.f.flipped.value = result;
	}

	function flipString(aString) {
	 var last = aString.length - 1;
	 //Thanks to Brook Monroe for the suggestion to use Array.join
	 var result = new Array(aString.length)
	 for (var i = last; i >= 0; --i) {
	  var c = aString.charAt(i)
	  var r = flipTable[c]
	  result[last - i] = r ? r : c
	 }
	 return result.join('')
	}

	var flipTable = {
	a : '\u0250',
	b : 'q',
	c : '\u0254', //open o -- from pne
	d : 'p',
	e : '\u01DD',
	f : '\u025F', //from pne
	g : '\u0183',
	h : '\u0265',
	i : '\u0131', //from pne
	j : '\u027E',
	k : '\u029E',
	//l : '\u0283',
	m : '\u026F',
	n : 'u',
	r : '\u0279',
	t : '\u0287',
	v : '\u028C',
	w : '\u028D',
	y : '\u028E',
	'.' : '\u02D9',
	'[' : ']',
	'(' : ')',
	'{' : '}',
	'?' : '\u00BF', //from pne
	'!' : '\u00A1',
	"\'" : ',',
	'<' : '>',
	'_' : '\u203E',
	'\u203F' : '\u2040',
	'\u2045' : '\u2046',
	'\u2234' : '\u2235',
	'\r' : '\n' //thank you, Yeeliberto
	}

	for (i in flipTable) {
	  flipTable[flipTable[i]] = i
	}

	mod.on('.flip', function(msg) { msg.respond(flipString(msg.query.text)) });
}();
