var sqlite = require('sqlite3'), mongo = require('mongolian'), db = new sqlite.Database('./log.db'),
	mserver = new mongo, mdb = mserver.db('log');

mdb.dropDatabase(function() {});

db.serialize();

var l=0, limit = 100;
var quitchans = { freenode: [ '##javascript', '#node.js' ], whatnet: [ '#hobbes' ], irchighway: [ "#trollkingdom" ], choopa: [ '#roms-isos' ] };
var colls = {};
var seq = mdb.collection('sequence');
var addline = function(server, channel, type, host, nick, timestamp, self, text) {
	var colname = (server + '::' + channel).toLowerCase();

	var col = mdb.collection(colname);
	var data = { type: type, host: host, nick: nick, timestamp: timestamp, self: self, text: text }

	console.log(Object.keys(data).map(function(k) { return k + ': ' + data[k] }).join(' '));

	if (!colls[colname]) colls[colname] = 0;

	colins(colname, ++colls[colname], data);

	//l++;

	//if (l > limit) process.exitj
}

var colins = function(colname, rowid, data) {
	var col = mdb.collection(colname);
	col.insert({ _id: rowid, type: data.type, host: data.host, nick: data.nick, text: data.content, timestamp: data.timestamp, self: data.self, text: data.content });
};

db.each("SELECT * FROM loginfo JOIN logtext ON loginfo.rowid = logtext.docid ORDER BY loginfo.rowid ASC", function(err, row) {
	if (!row.server) return;

	var sid = {
		whatnet: 'hobbes',
		irchighway: 'susie',
		choopa: 'moe',
		freenode: 'calvin'
	}[row.server.toLowerCase()];

	if (typeof sid == 'undefined') return;

	if ((row.type == 'QUIT' || row.type == 'NICK') && row.server in quitchans) {
		quitchans[row.server].forEach(function(chan) {
			addline(sid, chan, row.type, row.host, row.nick, row.timestamp, row.self, row.content);
		});
	} else if (row.channel) {
		addline(sid, row.channel, row.type, row.host, row.nick, row.timestamp, row.self, row.content);
	}

});
