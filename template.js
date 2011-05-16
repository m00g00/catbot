var DEFAULT_LINES = 50;

var markup = new require('./lib/markup');
var purl = require('url');

//print_r(markup.Markup.selfclosing);

var T = new markup.Markup();

var db = com.db;

function notfound(request, response) {
	var dom = Template.main();

	dom.body.push(T.h1("I NO UNDERSTANDS UR NEEDZ"));

	response.send(dom, 404);
}
//dude
server.routes.push([/^\/[A-Za-z0-9]+(\/.*)?$/, channel]);
//print_r(server.routes);

function channel(request, response) {
	var info = purl.parse(
		request.url.substr(-1) == '/' ? 
			request.url.slice(0,-1) : request.url
	);
	var pparts = info.pathname.split('/');
	var chan = '#'+pparts[1];

	if (!pparts[2]) {
		response.redirect(info.pathname + '/recent#b');
		return;
	}

	var offset, limit = 50;

	var dom = Template.main();

	var flush = function() { response.send(dom.toHTML()); };

	db.transaction(function(tx) {
		console.log("<channel "+chan+" requested>");
		tx.executeSql('SELECT server FROM loginfo WHERE channel = ? ORDER BY rowid DESC LIMIT 1', [chan], function(result) {
			if (!result.length) {
				console.log("<channel not found>");
				var title = 'No logs for ' + chan;
				dom.h1.push(title);
				dom.title.push(title);
				flush();
			} else {
				console.log("<channel found>");
				var server = result[0].server;

				tx.executeSql(
					 'SELECT loginfo.rowid, time(timestamp) timestamp, type, channel, nick, content ' +
					 'FROM loginfo, logtext ' +
					 'WHERE (channel = ? OR type = "QUIT" AND server = ?) AND loginfo.rowid = logtext.docid ' +
					 'ORDER BY loginfo.rowid DESC LIMIT ?',
					 [chan, server, limit], 
					 function(result) {
						result.reverse();

						response.send(
							Template.chanlog({
								title: chan,
								h1: chan,
								lines: result
							})
						);
});}});});}

var Template = {
	main: function(params) {
		params = params || {};
		var ref = {};
		with (T) {
			var dom = 
				html(
					ref.head = head(
						ref.title = title(params.title),
						base({href: 'http://bigmooworld.com:4829/'}),
						link({rel: 'stylesheet', href: 'style.css', type: 'text/css'}),
						script({src: 'script.js', type: 'text/javascript'})
					),
					ref.body = body(
						ref.h1 = h1(params.h1),
						div({id: 'chat'},
							table({id: 'lines'}, params.lines),
							a({id: 'b'})
						)
					)
				)
			;
		}

		dom.__meta = {
			doctype: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">',
			format: true
		};

		dom.meld(ref);

		return dom;
	},

	chanlog: function(params) {
		params.lines = Template.lines(params.lines)
		return Template.main(params);
	},

	lines: function(lines) {
		var nickcolor = 1;
		var nicks = {};
		return lines.map(function(e) {
			var content = markup.escapeHTML(e.content)
												  .replace(/https?:\/\/[^\s]+/g, '<a href="$&">$&</a>');
			var nick = e.nick;

			var nc;
			if (nick in nicks) nc = nicks[nick];
			else nc = nicks[nick] = nickcolor++;

			if (nickcolor > 10) nickcolor = 1;

			with(T) {
			if (/JOIN|PART|QUIT/.test(e.type)) {
				content = span({class: 'color-'+nc}, nick) +
								  span({class: 'has'}, ' has ' + 
								  (e.type == 'JOIN' ? 'joined' : e.type == 'PART' ? 'left' : 'quit') + ' ') + 
									(e.type == 'PART' ? b(e.channel) + ' ' : '') +
									(e.type == 'QUIT' || e.type == 'PART' ? 
										 span({class:'qb'}, '(') + content + span({class: 'qb'}, ')') :
										 b(content));

			if (e.type == 'JOIN') {
				nick = '-->'; nc = 'joined';
			} else {
				nick = '<--'; nc = 'left';
			}
			}

			var ptime = e.timestamp.split(':');
			
				return tr({id: e.rowid, class: e.type},
								 td({class: 'rowid'}, e.rowid),
								 td({class: 'timestamp'},
									 ptime[0], span(':'), ptime[1], span(':'), ptime[2]
								 ),
								 td({class: ['nick', 'color-'+nc]}, nick),
								 td({class: 'content'}, inline(content))
			         );
			}
		});
	}
};

function getlog(limit, offset, callback) {
	db.query('SELECT timestamp, type, nick, content FROM loginfo, logtext WHERE loginfo.rowid = logtext.docid LIMIT % OFFSET %'.f(limit, offset), callback);
}
