var Stream = require('net').Stream, 
    EventEmitter = require('events').EventEmitter,
    path = require('path'), 
    //Script = process.binding('evals').Script, 
	Script = require('./lib/scripter'),
    //fs = require('fs'),
    sys = require('sys'),
    log = require('./helper').log;

var logf = log.format;
var loge = log.error;
var logs = log.success;
var logi = log.important;
var logq = log.question;


function IRC(conf) {
	if (!conf.server) throw "Invalid server";
	if (!conf.port) throw "Invalid port";

	//this.irc = this;
	this.stream = this.super_;
	this.super_.constructor.call(this);
	this.setEncoding('utf8');

	this.conf = Object.prototype.inherits.call(conf, IRC.defaultConf);

	if (!(this.conf.modules instanceof Array)) throw "Config: Property 'modules' must be array";

	this.state = {
		nick: null,
		mode: null,
		channels: [],
		server: null,
		connect_time: null,
		logged_in: false
	};

	this.common = {};

	/*var db = require('./lib/db').use(this.conf.database.type);
	db.connect(this.conf.database,
	function() { logs("Database connect!"); },
	function() { loge("Database no connect :("); } );

	this.db = db;	*/

	this.initModules();
	//this.modules = {};

	this.baseEvents();

	this.loadModulesInOrder();

	//this.connect();
}

IRC.inherits(Stream);

IRC.addPrototype({
	commands: {},
	//common: {},

	initModules: function() {
		this.modules = {};
	},

	getId: function() {
		return this.conf.id;
	},

	getServerName: function() {
		return /^(?:[^.]+\.)?([^.]+)/(this.state.server)[1];
	},	

	baseEvents: function() {
		this.on('connect', function() {
			this.state.server = this.conf.server;
			this.state.connect_time = new Date;

			if (this.conf.extra instanceof Function) this.conf.extra(this);
		});

		this.on('module_before_load', function(name, file) {
			logq('I CAN HAS "%s"?', name);
		});

		this.on('module_loaded', function(name, file, module) {
			this.modules[file] = module;

			logf('Registered % event handlers', module.getNumListeners());
			logs('I HAS "%s"!\n', name);
		});

		this.on('module_load_error', function(name, file, error) {
			print_r(error, 1, 3, 'Module Error');
			
			loge('I CANT HAS "%s", IT IZ BROKED :( \n', name);
		});

		this.on('modules_loaded', function() {
			if (this.modules.numProperties() == this.conf.modules.length) logs('I HAS ALL UR BOTZ AND UR BASE');
			else if (this.modules.numProperties() > 0) loge('I HAS UR BOTZ BUT I WANT MOAR!');

			this.connect();
		});
	},

	connect: function() {
		this.super_.connect.call(this, this.conf.port, this.conf.server);
	},

	//Placeholder, should be extended by modules
	parseEvent: function(event) {
		return event;
	},

	getModule: function(name) {
		//return this.modules[keys[i]];
		var key = this.getModuleKey(name);

		return this.modules[key];
	},

	getModuleKey: function(name) {
		var keys = Object.keys(this.modules);
		for (var i=0, l=keys.length; i<l; ++i) {
			if (this.modules[keys[i]].name == name)
				return keys[i];
		}
	},

	use: function(name) {
		var mod = this.getModule(name);
		if (!mod) return false;
		return mod.exports;
	},

	emitModules: function() {
		var keys = Object.keys(this.modules);
		for (var i=0, l=keys.length; i<l; ++i) {
			var module = this.modules[keys[i]];
			module.emit.apply(module, arguments);
		}
	},

	on: function(events, listener) {
		if (!(events instanceof Array)) events = [events];

		for (var i=0, l=events.length; i<l; ++i) {
			this.super_.on.call(this, events[i], listener);
		}
	},

	/*emit: function() {
		console.log("EVENT EMITTED: %s", arguments[0]);

		return this.stream.emit.apply(this, arguments);
	},*/

	/*moduleOn: function(events, listener) {
		if (!(events instanceof Array)) events = [events];

		var thiz = this;

		for (var i=0, l=events.length; i<l; ++i) {
			var event = this.parseEvent(events[i]);

			if (event instanceof Array) {
				with ({name: event[0], condition: event[1]}) {
					
					this.stream.on.call(this, name, function() {
						if (condition.apply(thiz, arguments)) {
							listener.apply(thiz, arguments);
						}
					});
				}
			} else {
				this.stream.on.call
					*/
					

	removeListener: function(events, listener) {
		if (!(events instanceof Array)) events = [events];

		for (var i=0, l=events.length; i<l; ++i) {
			this.super_.removeListener.call(this, events[i], listener);
		}
	},

	/*moduleError: function(e) {
		if (!e) return false;

		if (e instanceof Object && 'stack' in e) {
			logf(e.stack);
		} else {
			logf(e);
		}

		return true;
	},*/

	loadModules: function() {
		this.loadModulesInOrder();
	},

	loadModulesInOrder: function() {
		this.loadModulesChain(0);
	},

	loadModulesChain: function(mi) {
		//module index
		mi = mi || 0;

		if (mi >= this.conf.modules.length) throw "Invalid starting index";

		events = ['module_loaded', 'module_load_error'];

		this.on(events, function(module) {
			if (++mi < this.conf.modules.length) this.loadModule(this.conf.modules[mi]);
			else {
				this.removeListener(events, arguments.callee);
				this.emit('modules_loaded');
			}
		});

		this.loadModule(this.conf.modules[mi]);

	},

	unloadModule: function(name) {
		var mod = this.getModuleKey(name);

		if (typeof mod == 'undefined') throw IRC.NO_SUCH_MODULE;

		this.modules[mod].emit('UNLOAD');

		delete this.modules[mod];

		return true;
	},

	reloadModules: function() {
		this.initModules();
		this.loadModules();
	},

	reloadModule: function(name) {
		try {
			this.unloadModule(name);
		} catch(e) {
			if (e == IRC.NO_SUCH_MODULE) console.log('Module not loaded, loading anyway...');
			else throw e;
		}

		this.loadModule(name);
	},

	/*reloadModule: function(name) {
		var modkey;
		this.modules.iterate(function(mod, key) {
			if (mod.name == name) {
				modkey = key;
				return false;
			}
		});

		if (modkey) {
			delete this.modules[modkey];
			console.log(modkey + ' unloaded');
			this.loadModule(name);
		} else {
			loge(name + ' not found');
		}

	},*/

	loadModule: function(name) {
		var file = (name[0] == '.' || name[0] == '/' ? 
				name : path.join(this.conf.path_modules, name)) + '.js';

		this.emit('module_before_load', name, file);

		new Module(name, file, this);
	},

	echo: function(str) {
		logf('#'+str);
		this.write(str+'\r\n');
	},

	doInConf: function(key, onexists, base) {
		base = base || this.conf;

		if (key in base) {
			var val = base[key];
			if (!(val instanceof Object) || !('forEach' in val))
				val = [val];

			val.forEach(onexists);
			return true;
        }
		return false;
	},

	toString: function() {
		return '[object IRC: '+this.conf.server+']';
	}
});

IRC.defaultConf = {
	port: 6667,

	path_root: '.',
	path_modules: './modules',

	format_messages_incoming: true,
	format_messages_outgoing: true,

	quit_msg: 'BAI',

	flood_throttle: true,

	flood_max_lines: 7,
	flood_interval: 1000,
	
	modules: [
		'raw'
	]
};

IRC.NO_SUCH_MODULE = "No such module";

function Module(name, file, irc) {

	this.name = name;
	
	this.irc = irc;

	this.super_.constructor.call(this);

	this.exports = {};

	var params = {
		mod: this,
		com: irc.common,
		exports: this.exports,
		require: require
	}

	var module = this;
	
	Script.runFileAsFunction(file, params, this, function(err, result) {
		if (err) {
			irc.emit('module_load_error', name, file, err);
		} else {
			irc.emit('module_loaded', name, file, module);
		}
	});
};

Module.inherits(EventEmitter);

Module.addPrototype({
	emitAll: function() {
		this.irc.emitModules.apply(this.irc, arguments);
	},

	getNumListeners: function() {
		var num = 0;

		if ('_events' in this) {
			this._events.forEach(function(v,n) {
				num += v instanceof Array ? v.length : 1;
			});
		}

		return num;
	},

	eventFilter: null,

	on: function(events, listener) {
		if (!(events instanceof Array)) events = [events];

		events.forEach(function(event) {
			if (this.irc.common.eventFilter instanceof Function) {
				event = this.irc.common.eventFilter(event);
			}

			this.super_.on.call(this, event, listener);
		}, this);
	},

	put: function(line) {
		this.irc.write(line+'\n');
	}
});








/*function IRC(conf) {

	this.on('connect', function() {
		
	this.connect(conf.port, conf.server);
	var stream = net.createConnection(conf.port, conf.server);
	stream.setEncoding('utf8');

	var thiz = this //lolcat for this
	stream.on('connect', function() {
		thiz.emit('connect')
		log('HAS CONNECT {server}:{port}'.fo(conf));
		stream.on('data', function init(buf) {
			stream.echo('NICK {nick}'.fo(conf));
			stream.echo('USER {user} {mode} * :{name}'.fo(conf));

			stream.removeListener('data', arguments.callee);

			stream.on('data', function(buf) {
				log(buf);
			});
		});
	});
}*/

//IRC.prototype = new Stream();

exports.createConnection = function(conf) {
	return new IRC(conf);
};

				
			
