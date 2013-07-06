var log = require('./helper').log;

mod.on('!insult', insult);
mod.on('!insultadd', insultadd);
mod.on('!insultorder', insultorder);
mod.on('!insultinfo', insultinfo);
mod.on('!insultsearch', insultsearch);
//mod.on('!stardate', insult);
if (!mod.irc.conf.insult_no_join) mod.on('JOIN', insultjoin);

var db = com.db;

var insults, pointer=0;

db.query('SELECT * FROM insults ORDER BY insultid', function(res){
	insults = res
	share.insults = insults
	randomize('newer')
})

function randomize(mode) {
	insults.sort(mode == 'newest' ? function(a,b){ return Date.parse(b.timestamp) - Date.parse(a.timestamp) } :
				 mode == 'oldest' ? function(a,b){ return Date.parse(a.timestamp) - Date.parse(b.timestamp) } :
				 mode == 'newer'  ? function(a,b){ return Math.random() > .5 ? Date.parse(b.timestamp) - Date.parse(a.timestamp) : Math.random() - Math.random() } :
				 mode == 'random' || !mode ? function(a,b){ return Math.random() - Math.random() } : 0)
}

function insultorder(msg) {
	var mode = msg.query.args[0], start = parseInt(msg.query.args[1])
		r = 'Sorts insults n stuff: !insultorder [ newest | oldest | newer | random ]';
		dump(msg.query.args, mode, start)

		if (/^(newest|oldest|newer|random)$/i.test(mode)) {
			randomize(mode)
			pointer=!isNaN(start)&&start>0&&start<insults.length?start:0
			r='kthx'
		}

		msg.respond(r)
}

function insultinfo(msg) {
	var r=[], ii = pointer - (1+(parseInt(msg.query.args[0])||0))

	//for (var i=0,ii=pointer-1,ins;i<5&&ii>=0&&ii<insults.length;i++,ii--){
		ins=insults[ii]
		r.push(ii + '@ ' + ins.timestamp + ' ' + ins.nick + '> ' + ins.insult)
	//}
	//r.push('Next insult #: ' + pointer)

	r.forEach(function(m){
		msg.respond(m)
	})
}

var filt, filtq, filti
function insultsearch(msg) {
	var query = msg.query.args.slice(), insultee;

	if (query.last[0] == '@') insultee = query.last.substr(1), query.pop()

	var qtxt = query.join(' ')

	if (qtxt != filtq){

		filt  = insults.filter(function(ins){
			return query.every(function(q){ return RegExp(q, 'i').test(ins.insult) }) })

		filtq = qtxt
		filti=0
	}

	dump(filt.length, filti, query, filtq)

	var ret = insultfmt(filt[filti++].insult, msg.from, insultee)

	msg.respond(ret)
}

	

function insultfmt(ins, insulter, insultee, old) {
	var insult = ins.replace(/\[\]/g, insulter);

	insultee = !insultee || insultee.toLowerCase() == mod.irc.state.nick.toLowerCase() ? insulter : insultee

	if (insult.indexOf('{}') != -1) insult = insult.replace(/\{\}/g, insultee);
	else insult = insultee + (old?' is a ':' ') + insult;

	return insult
}
	

function insultjoin(message) {
	if (!message.fromMe()) insult(message);
}

function insult(message) {
	/*db.query('SELECT insult FROM insults ORDER BY RANDOM() LIMIT 1', onquery);
	function onquery(result) {
	
	var insult = result[0].insult;*/

	var insult = insults[pointer++].insult.replace(/\\"/g,'"');


	var insulter = message.from;

	var query = message.qtxt.trim();
	

	var insultee = 
		query == '' || query.toLowerCase() == mod.irc.state.nick.toLowerCase() ? insulter : query;

	insult = insult.replace(/\[\]/g, insulter);

	if (insult.indexOf('{}') != -1) insult = insult.replace(/\{\}/g, insultee);
	else insult = insultee + ' ' + insult;

	message.respond(insult);

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
		
var oldinsults, oii
mod.on('!insultold', function(msg){
	if (!oldinsults) {
		require('fs').readFile('modules/Insults.txt', {encoding: 'utf8'}, function(err, data) {
			if (err) throw err
			for(var a=data.split('\n'),i=a.length-1,j,tmp; i; i--)
				j=Math.round(Math.random()*i), tmp=a[j], a[j]=a[i], a[i]=tmp

			oldinsults=a
			oii=0

			goforit()
		})
	} else {
		goforit()
	}

	function goforit() { msg.respond(insultfmt(oldinsults[oii++], msg.from, msg.qtxt, true)) }
})
	
	
	



//var db = mod.irc.db;

//print_r(db);

//print_r(db);

function dump() { print_r(arguments); };

//db.query('SELECT * FROM insults;', dump, dump);
