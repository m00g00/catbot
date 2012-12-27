//process.chdir(__dirname);
var constants = {
	USE_REPL: true,
	GLOBAL_CONF: './global.js',
	PATH_ROOT: __dirname
};
global.constants = constants;

var log = {};
require('./helper').
	place({
		//script: require('vm'),
		log: log
	}).

	extendAll();

var sep = log.colors.yellow + ':' + log.colors.reset;
global.share = {
	process_start_time: new Date,
	log_short: true,
	TIMESTAMP_MODE: 0,
	TIMESTAMP_FORMAT: '%H' + sep + '%M' + sep + '%S'
};





global.print_r = log.print_r;
global.dump = log.print_r;
global._prs = log.prs;
global.var_dump = function(val) {
	print_r(val, true, 8, null, true);
};

process.on('uncaughtException', function(err) {
	log.error("Uncaught Exception");
	console.log(err.stack);
	//process.exit(1);
});

process.once('SIGINT', function catcher() {
	console.error('SIGINT CAUGHT: Are you sure?');

	setTimeout(function() {
		process.removeAllListeners('SIGINT');
		process.once('SIGINT', catcher);
	}, 10000);

	process.once('SIGINT', function() {
		console.error('SIGINT CAUGHT: Closing connections...');


		var closed = 0, num = servers.numProperties();
		servers.forEach(function(server) {
			server.on('end', function() {
				this.destroy();

				closed++;

				if (closed == num) {
					console.error('ALL DONE, BAI');
					process.kill(process.pid);
				}
			});

			server.quit();
		});
	});
});


global.servers = {};

if (constants.USE_REPL) require('./repl.js');

var irc = require('./irc');

log.important('\nHAI I IN UR SERVER RUNNING UR BOTZ\n');

var path = require('path');

if (path.exists(constants.GLOBAL_CONF)) Script.runFileSyncInThisContext(constants.GLOBAL_CONF);

var Script = require('./lib/scripter');
var cfiles = process.argv.slice(2);
var loadFile = function(file) {
	Script.runFileSyncInThisContext(file);
	global.servers[config.id] = irc.createConnection(config);
};

cfiles.forEach(loadFile);

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

	repl.context.loadFile = loadFile; 

	repl.context.destroy = function(s) {
		s.quit();
		s.end();
		s.destroy();
		delete repl.context[s.conf.id];
		delete global.servers[s.conf.id];
	};

	repl.context.watchModule = function(name) {
		require('fs').watchFile('./modules/' + name + '.js', function(curr, prev) {
			if (curr.mtime > prev.mtime) { 
				reloadModule(name)
			}
		});
	};

	repl.context.unwatchModule = function(name) {
		require('fs').unwatchFile('./modules/' + name + '.js');
	}

	//repl.context.reloadModule = function(name) { call(function(s) { s.reloadModule(name) }) };
	//repl.context.reloadModule = function(name) { call(function(s) { s.reloadModule(name) }) };
}


//servers.push(irc.createConnection(config));

//if (constants.USE_REPL) repl.context.irc = servers[0];
