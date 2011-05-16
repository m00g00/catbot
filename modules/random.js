mod.on('!date', date);
mod.on('!pi', pi);
mod.on('!commands', listcommands);
mod.on('!math', math);
mod.on('!spell', spell);
mod.on([',js', '..'], js);
mod.on([',jsreset', ',jsr'], force_resetcontext);
['!rock', '!paper', '!scissors'].forEach(function(e) {
	mod.on(e, rps);
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

var jsctx = {};
function spawncontext(message) {
		var child = require('./lib/fork').fork(function() {
			var vm = require('vm'),
				util = require('util'),
				//inspect = util.inspect,
				inspect = require('./eyes').inspector({ 
					/*styles: { 
						key: 'yellow',
						bool: 'red',
						special: 'cyan',
						string: 'green'
					},*/
					pretty: false, 
					stream: null,
					maxLength: 200
				}),
				context = {
					console: {
						log: function(obj) {
							process.postMessage(inspect(obj));
						}
					},

					setTimeout: global.setTimeout,
					setInterval: global.setInterval
				};
			process.on('message', function(msg) {
				process.postMessage(
					msg == '#PING' ? '#PONG' :
					inspect(vm.runInNewContext(msg, context))
				);
			});
		});

		var ping = false;
		child.on('message', function(m) {
			if (ping && m == "#PONG") {
				ping = false;
			} else {
				m = m.replace(/\n/g, '');
				if (m.length > 200) m = m.substr(0, 200) + '\x0f ...';
				message.respond(m);
			}
		});

		child.on('error', function(e) {
			message.respond(
				(e.message || e).replace(/\n/g, '')
			);
		});

		var _post = child.post;
		child.post = function(obj, p) {
			_post(obj);
			if (!p) setTimeout(function() {
				ping = true;
				child.post('#PING', true)
				setTimeout(function() {
					if (ping) {
						child.emit('error', 'Error: Timeout');
						resetcontext(message);
					}
				}, 500);
			}, 5000);
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
	var ctxname = message.channel ? message.channel : message.from;

	var ctx = jsctx[ctxname] || (jsctx[ctxname] = spawncontext(message));

	ctx.post(message.query.text);
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
	var list = [];
	mod.irc.modules.forEach(function(module, name) {
		console.log(name);
		if (module._events) module._events.forEach(function(action, command) {
			var cp = command.match(/^PRIVMSG ([^\w]\w+)/);
			if (cp) {
				list.push(cp[1]);
			}
		});
	});

	message.respond(list.join(' '));

}


function rps(message) {
	message.respond(['rock', 'paper', 'scissors'][~~(Math.random()*3)]);
}
