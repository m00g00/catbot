var spawn = require('child_process').spawn;
var sys = require('sys');

function echomsg(msg) {
	print_r(msg);
	//process.stdout.write(sys.inspect(msg).split('\n').map(function(s) { return pre + '>> ' + s; }).join('\n')+'\n');
}

exports.openDatabase = function(file) {

		var child = spawn('node', ['lib/dbchild.js', file]);
		child.stdout.setEncoding('utf8');
		child.stdin.setEncoding('utf8');
		child.stderr.setEncoding('utf8');

		var buffer = '';
		child.stdout.on('data', function(data) {
			var blocks = (buffer + data).split('\0');

			for (var i=0, l=blocks.length; i<l-1; i++) {
				if (blocks[i].length) receive(blocks[i]);
			}

			buffer = blocks[i];
		});

		child.stderr.on('data', function(data) {
			console.log(data);
		});
			
		var cmdqueue = [];
		var curcmd = null;

		function queue(sql, params, callback) {
			cmdqueue.push([sql, params, callback]);

			next();
		}

		function next() {
			if (!curcmd && cmdqueue.length) {
				curcmd = cmdqueue.shift();

				var pcmd = curcmd.slice(0,2); 
				pcmd[2] = typeof curcmd[2] == 'function' ? 1 : 0;
				
				child.stdin.write(JSON.stringify(pcmd) + '\0');
			}
		}

		function receive(block) {
			var result;
			try { 
				result = JSON.parse(block); 
			} catch (e) { 
				echomsg(block);
				//console.log(echomsg);
				//console.log('DBERR::blen=' + block.length + '> ' + e + '\n' + block) 
			}

			if (result) {
				if (result.message) echomsg(result, 'DBMSG');
				//print_r(result);

				try {
					if (typeof curcmd[2] == 'function') curcmd[2](result);
				} finally {
					curcmd = null;
					next();
				}
			}
		}

		return {
				file: file,
				query: function(sql) {
					queue(
						sql, 
						typeof arguments[1] == 'object' && 'length' in arguments[1] ? arguments[1] : null, 
						typeof arguments[1] == 'function' ? arguments[1] : arguments[2] instanceof Function ? arguments[2] : null
					);
				},

				transaction: function (callback) {
					this.query('BEGIN TRANSACTION');
					callback({executeSql: this.query});
					this.query('COMMIT');
				}
		};
}

//print_r(module);

//exports.query = query;
//exports.transaction = transaction;
	

/*transaction(function(tx) {
	tx.executeSql(
		'CREATE TEMP TABLE zomfg (val)'
	);

	tx.executeSql(
		'INSERT INTO zomfg (val) SELECT nick FROM loginfo WHERE server = "WhatNET" ORDER BY RANDOM() LIMIT 50'
	);

	tx.executeSql('SELECT * FROM zomfg',
				function(res) { console.log(res); }
	);
});

var cc = 0;
setInterval(function() { console.log(cc++); query('select insult from insults order by random() limit 1', function(ee) { console.log(ee); })}, 500);
//query('select * from insults order by random() limit 10', function(res) { console.log(res); });*/
