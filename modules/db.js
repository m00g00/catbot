//var log = require('./helper').log;
//var db = require('./lib/db').use(mod.irc.conf.database.type);

if (!global.db) {
	global.db = require('./lib/dbasync').openDatabase(mod.irc.conf.database.file);
}


/*db.connect(
	mod.irc.conf.database,

	function () {
		log.success("Database connected");
		print_r(arguments);
	},

	function () {
		log.error("Database connect failed");
		print_r(arguments);
	}
);*/

exports.db = global.db;
com.db = global.db;
