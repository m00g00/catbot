var constants = {
	USE_REPL: true
};
global.constants = constants;

var log = {};
require('./helper').
	place({
		//script: require('vm'),
		log: log
	}).

	extendAll();




global.print_r = log.print_r;
global._prs = log.prs;
global.var_dump = function(val) {
	print_r(val, true, 8, null, true);
};

process.on('uncaughtException', function(err) {
	log.error("Uncaught Exception");
	print_r(arguments);
	//process.exit(1);
});

process.on('SIGINT', function() {
	console.error('SIGINT CAUGHT: Closing connections...');
	process.removeListener('SIGINT', arguments.callee);

	var closed = 0, num = servers.numProperties();
	servers.forEach(function(server) {
		server.on('close', function() {
			this.destroy();

			closed++;

			if (closed == num) {
				console.error('ALL DONE, BAI');
				process.kill(process.pid);
			}
		});

		server.common.quit(server.conf.quit_msg)
	});
});


global.servers = {};

if (constants.USE_REPL) require('./repl.js');

var irc = require('./irc');

log.important('\nHAI I IN UR SERVER RUNNING UR BOTZ\n');

//var Script = process.binding('evals').Script;
var Script = require('./lib/scripter');
var cfiles = process.argv.slice(2);
cfiles.forEach(function(cf) {
	Script.runFileSyncInThisContext(cf);
	global.servers[config.id] = irc.createConnection(config);
	/*global.servers.push(
		irc.createConnection(config)
	);*/
});
if (constants.USE_REPL && !repl.context.irc) {
	global.servers.forEach(function(v,n) {
		repl.context[n] = v;
		if (!repl.context.irc) repl.context.irc = v;
	});

	repl.context.dbq = function(sql) { repl.context.irc.common.db.query(sql, function(r) { print_r(r); }); }

	repl.context.call = function(callback) {
		global.servers.forEach(callback)
	};

	['reloadModule', 'loadModule', 'unloadModule'].forEach(function(n) {
		repl.context[n] = function() { var args = arguments; servers.forEach(function(s) { s[n].apply(s, args) }) };
	});
	//repl.context.reloadModule = function(name) { call(function(s) { s.reloadModule(name) }) };
	//repl.context.reloadModule = function(name) { call(function(s) { s.reloadModule(name) }) };
}


//servers.push(irc.createConnection(config));

//if (constants.USE_REPL) repl.context.irc = servers[0];
