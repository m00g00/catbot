mod.on('!date', date);
mod.on('!pi', pi);
mod.on('!commands', listcommands);
mod.on('!math', math);
mod.on('!spell', spell);
mod.on(['.js', '..'], js);
mod.on(['.jsreset', '.jsr'], force_resetcontext);
['!rock', '!paper', '!scissors'].forEach(function(e) {
	mod.on(e, rps);
});
mod.on('.peen', function(msg){
	var r=function(c,m){return Array(~~(Math.random()*m)).join(c)}; 
	msg.respond(r('#',4)+'8'+r('=',30)+'D'+r('~',10)); 
});
mod.on('.kafc', function(msg) {
	msg.respond(kaffine_compile(msg.query.text).trim());
});
mod.on('.kafr', function(msg) {
	var code = kaffine_compile(msg.query.text).trim();
	var clone = msg.clone();
	clone.query.text = code;
	js(clone);
});

mod.on('.perf', function(msg) {
	var nmsg = msg.clone();

	nmsg.text = '.pref var i = 999999; console.time(); while (--i) { ' + msg.query.text + '}; console.timeEnd()';

	js(nmsg);
});

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



/*mod.on('.php', function(

var meta = require('./lib/meta');*/

mod.on('!give', function(msg) {
	var p = /^\s*([^\s]+)\s+(?:([\+-]?\d+)\s+)?(.*)\s*/(msg.query.text);

	if (!p) { msg.respond("Give what to who now?"); return; }

	var nick = p[1], num = !isNaN(p[2]) ? +p[2] : 1, item = p[3];

	var ident = { type: 'items', name: nick, server: mod.irc.getServerName(), channel: msg.channel, key: item };
	meta.get(ident, function(obj) {
		if (!(item in obj)) obj[item] = 0;

		obj[item] += num;
		meta.update(obj);

		msg.respond(msg.nick + " gave " + num + " " + item + " to " + nick + ", " + nick + " now has " + obj[item] + " " + item);
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

var kaffine = require('kaffeine');

function kaffine_compile(code) {
	return kaffine.fn.compile(code);
}

var jsctx = {};
function spawncontext(message) {
		var msgs = [],
			getmsg = function() { return msgs.shift(); },
			child = require('./lib/fork').fork(function() {
			var vm = require('vm'),
				util = require('util'),
				//inspect = util.inspect,
				inspect = require('./eyes').inspector({ 
					styles: { 
					},
					pretty: false, 
					stream: null,
					maxLength: 200
				}),

				times = [];
				//bf = require('node-brainfuck'),
				context = {
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
				console.log(buffer);
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
				}, 5000);
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

function js(message) {
	if (!message.query.text.trim()) return;
	var ctxname = message.channel ? message.channel : message.from;

	var ctx = jsctx[ctxname] || (jsctx[ctxname] = spawncontext(message));

	ctx.post(message);
}






	/*var str = message.query.text, vm = require('vm');

	if (true || !jschild) {
		jschild = require('child_process').spawn('node');
			jschild.stdout.on('data', function(data) {
				console.log('DD');
				message.respond(data);
			});
		jschild.stderr.on('data', function(data) {
				console.log('EE');
			message.respond(data);
		});
	}

	jschild.stdin.end('console.log('+str+');' + '\n');*/

//}



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
