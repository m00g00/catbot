if (!global.db) {
	//global.db = require('./lib/dbasync').openDatabase(mod.irc.conf.database.file);
	global.db = require('./lib/dbshim').openDatabase(mod.irc.conf.database.file);
}

exports.db = global.db;
com.db = global.db;

mod.on('UNLOAD', function() {
	global.db.close();
	global.db = undefined;
	com.db = undefined;
});
