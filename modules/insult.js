var log = require('./helper').log;

mod.on('!insult', insult);
mod.on('!insultadd', insultadd);
mod.on('!stardate', insult);
mod.on('JOIN', insultjoin);

var db = com.db;

function insultjoin(message) {
	if (!message.fromMe()) insult(message);
}

function insult(message) {
	db.query('SELECT insult FROM insults ORDER BY RANDOM() LIMIT 1', onquery);
	function onquery(result) {
	
	var insult = result[0].insult;


	var insulter = message.from;

	var query = message.qtxt.trim();
	

	var insultee = 
		query == '' || query.toLowerCase() == mod.irc.state.nick.toLowerCase() ? insulter : query;

	insult = insult.replace(/\[\]/g, insulter);

	if (insult.indexOf('{}') != -1) insult = insult.replace(/\{\}/g, insultee);
	else insult = insultee + ' ' + insult;

	message.respond(insult);

	}
}

function insultadd(message) {
	var query = message.qtxt.trim();
	db.query('SELECT COUNT(*) count FROM insults WHERE insult = ?', [query], function(result) {

		if (+result[0].count) {
			message.respond("SRY, I already has dat insult, be moar creativ");
		} else {
			db.query(
				'INSERT INTO insults (nick, ip, timestamp, insult, type) VALUES (?, ?, DATETIME("NOW"), ?, "insult")',
				[message.from, message.host, query],
				function() {
					message.respond("I has ur insult!");
				}
			);
		}
	
	});
}
		
	
		
	
	



//var db = mod.irc.db;

//print_r(db);

//print_r(db);

function dump() { print_r(arguments); };

//db.query('SELECT * FROM insults;', dump, dump);
