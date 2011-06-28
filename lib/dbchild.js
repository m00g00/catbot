var sys = require('sys');
var fs = require('fs');

var dbout = fs.openSync('dbout', 'a');
process.on('uncaughtException', function(err) {
	if (typeof err == 'object') err.sql = lastquery;
	sput(err);
});

var sqlite = require('./database/sqlite_grumdrig2/sqlite');

var db = sqlite.openDatabaseSync(String(process.argv[2]));

process.on('SIGTERM', function() {
	db.close();
	process.exit();
});

var stdin = process.openStdin();
stdin.setEncoding('utf8');
process.stdout.setEncoding('utf8');

var buffer = '';
stdin.on('data', function(data) {
	//fs.writeSync(dbout, '\n==IN==\n' + data + '\n');
	var blocks = (buffer + data).split('\0');
	//console.log(blocks);

	for (var i=0, l=blocks.length; i<l-1; i++) {
		receive(blocks[i]);
	}

	buffer = blocks[i];
});

var lastquery = null;

function receive(block) {
//	try {
		var cmd = JSON.parse(block);
		
		var sql = lastquery = cmd[0], bindings = cmd[1];

		//mput(sql);

		var response = function(result) { 
			sput(result); 
		};

		if (bindings) db.query(sql, bindings, response);
		else db.query(sql, response);

		/*var sql = lastquery = cmd[0], bindings = cmd[1];

		db.query(sql, function(result) {
			sput(result);
			//var msg = JSON.stringify(result);
			//process.stdout.write(msg + '\0');
		});*/
//	} catch(e) {
//		sput(e);
//	}

}

function mput(obj) {
	process.stdout.write('DB>> ' + obj + '\0');
}
	
function sput(obj) {
	var out = JSON.stringify(obj, null, '  ') + '\0';
	//fs.writeSync(dbout, '\n==OUT==\n' + out + '\n');
	process.stdout.write(out); 
}
