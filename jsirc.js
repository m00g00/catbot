//process.chdir(__dirname);
var constants = {
	USE_REPL: true,
	GLOBAL_CONF: './global.js',
	PATH_ROOT: __dirname,
	SUPRESS_LOG: false
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


var util = require('util'),
	eyes = require('./lib/eyes.js'),
	ins = eyes.inspector({stream:process.stdout,pretty:true}),
	logg = require('./lib/logging/lib/logging.js')
	debugfunc = function(o,showHidden,depth){
		//ins(o)
		log.put(util.inspect(o,showHidden,depth,true));
	};
	

global.print_r = debugfunc;
global.dump = debugfunc;
global._prs = log.prs;
global.var_dump = function(val) {
	print_r(val, true, 8, null, true);
};

process.on('uncaughtException', function(err) {
	log.error("Uncaught Exception");
	console.log(err.stack);
	//process.exit(1);
});

/*process.once('SIGINT', function catcher() {
	console.error('SIGINT CAUGHT: Are you sure?');

	setTimeout(function() {
		process.removeAllListeners('SIGINT');
		process.once('SIGINT', catcher);
	}, 10000);*/

	process.once('SIGINT', function() {
		console.error('SIGINT CAUGHT: Closing connections...');


		var closed = 0, num = servers.numProperties();
		servers.forEach(function(server) {
			server.on('end', function() {
				this.destroy();

				closed++;

				if (closed == num) {
					console.error('ALL DONE, BAI');
					//process.kill(process.pid);
					process.exit();
				}
			});

			server.quit();
		});

		process.kill(process.pid, 'SIGINT');
	});
//});


global.servers = {};

if (constants.USE_REPL) require('./repl.js');

var irc = require('./irc');

//log.important('\nHAI I IN UR SERVER RUNNING UR BOTZ\n');
log.important('\n *** catbot: the next generation v' + (Math.random()*100).toFixed(4) + '.' + (Math.random()*10).toFixed(0) + '\n')

var fs = require('fs');

//if (fs.exists(constants.GLOBAL_CONF)) Script.runFileSyncInThisContext(constants.GLOBAL_CONF);

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

	var fs=require('fs'),
		dirs=['modules', 'modules/chess'],
		watched=[],
		tid;

	repl.context.watchModules = function(id,cb){

		dirs.forEach(function(d){
			watched.push(fs.watch(d, function(ev,fn){
				if (ev=='change' && fn!='saved.js') {
					clearTimeout(tid);
					tid=setTimeout(function(){
						servers.hobbes2.reloadModule('chess')
					}, 100);
				}
						
			}
		))});

		console.log("watching % dirs: %".f(dirs.length, dirs.join()))
		return true;

	};

	repl.context.unwatchModules = function(){

		console.log("unwatching % dirs".f(watched.length))
		watched.forEach(function(w){
			dump(w); w.close();
		})
		watched.length=0;



	};





			


	//repl.context.reloadModule = function(name) { call(function(s) { s.reloadModule(name) }) };
	//repl.context.reloadModule = function(name) { call(function(s) { s.reloadModule(name) }) };
}


//servers.push(irc.createConnection(config));

//if (constants.USE_REPL) repl.context.irc = servers[0];
