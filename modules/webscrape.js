var scrape = require('./lib/httpscrape').scrape,
    get = require('./lib/httpget').get,	
	url = require('url');

mod.on('!def', function(msg) { wiktionary(msg); });
mod.on('!defr', function(msg) { wiktionary(msg, true); });
mod.on('!wquote', wquote);
mod.on('!imquote', imquote);
mod.on('!nigger', niggerquote);
mod.on('!w' , wikipedia);
mod.on('!g', google);
mod.on('!gcalc', gcalc);
mod.on('!gstats', gstats);
mod.on('!bnet', bnet);
mod.on('!scrape', cmdscrape);
//mod.on('!ud', ud);

/*function ud(message, random) {
	ifl(message.qtxt, 'http://www.urbandictionary.com', function(doc, body, response) {
		var items = doc.find('//table[@id="entries"]//td[@class="index"]/../following-sibling::tr[1]/td[@class="text"]');

		ite 
*/

function gstats(message) {
	scrape('http://www.google.com/search?q=' + escape(message.query.text), function(doc, body, response) {
		try {
			var results = doc.get('//div[@id="resultStats"]').text().match(/[\d,]+/)[0];

			message.respond(message.query.text + ': ' + results);
		} catch(e) {
			print_r(e);
			message.respond('???');
		}
	});
}

function gcalc(message) {
	scrape('http://www.google.com/search?q=' + escape(message.query.text).replace(/\+/g, '%2B'), function(doc, body, response, xml) {
		try {
		var answer = (doc.get("//div[@id='topstuff']//h2/b") || doc.get("//div[@id='ires']//h3/b") || doc.get("//table[@class='obcontainer']//div/table//td"));

		try { answer.get('sup').addPrevSibling(new xml.Element(doc, 'text', {}, '^')) } catch(e) {print_r(e) }

		message.respond(
			answer.text().replace(/\u00d7/g, 'x')
				  .split('')
				  .filter(function(c) { return c.charCodeAt() < 128 ? true : false })
				  .join('')
				  
		);
		} catch(e) {
		console.log("ERROR: " + e);
		message.respond('???');
		}
	});
}


function google(message) {

	var ln = 3;
	console.log('http://www.google.com/search?q=' + escape(message.query.text.replace(/\s/g, '+')))

	scrape('http://www.google.com/search?q=' + escape(message.query.text), function(doc, body, response) {
		console.log(body);
		var ls = doc.find('//li[not(@id)]//h3/a');

		var msg = ''
		for (var i=0; i < ls.length && i < ln; i++) {
			var l = ls[i];
			msg += unescape(l.text()) + ' (' + l.attr('href').value() + ')' + (i < ln-1 ? ', ' : '')
		}

		message.respond(msg);
	});
}

function wikipedia(message) {
	var base = 'http://en.wikipedia.org';

	ifl(message.qtxt, base, function(body, response) {
		var url = response.headers.location + '?action=render';

		scrape(url, function(doc, body, resp) {

			var par = doc.get('/html/body/p');

			par.find('span | sup').forEach(function(e) {
				e.remove();
			});

			var text = par.text().replace(/\(.*?\)/g, '').replace(/\s{2,}/g, ' ').replace(/\s+,/g, ',');

			message.respond(text);
		});
	}, true);

	/*ifl(message.qtxt, base, function(body, response) {
		var loc = response.headers.location;

		var aurl = 'http://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&format=json&indexpageids&titles=' + loc.match(/\w+$/)[0]

		print_r(aurl);

		get(aurl, function(body) {
			var data = JSON.parse(body);

			var content = data.query.pages[data.query.pageids[0]].revisions[0]['*']

			var lines = content.split('\n');

			lines.some(function(line) {
				if (/^\w/.test(line)) {
					line = line.replace(/\{\{.*?\}\}/g, '');
					console.log(line);
					return true;
				}
			});

		});
	
	}, true);*/
}

function cmdscrape(message) {
	var query = message.query.text.match(/^\s*(https?:\/\/.*?)\s+--xpath (.*)/);

	console.log('url: ' + query[1] + '\nxpath: ' + query[2]);
	scrape(query[1], function(doc, body, response) {
		var items = doc.find(query[2]);

		message.respond(items[0].text().trim().replace(/\n|\s+|\t/g, ' ').substr(0, 255));
	});
}


function niggerquote(message) {
	var base = 'http://www.stupidniggers.com/index.php?p=random';

	scrape(base, function(doc, body, response) {
		var quotes = doc.find('//td[contains(@class, "body")]');

		var quote = quotes.getRandom();
		var msg = quote.text().trim();

		var name = quote.get('a/@href').text().match(/.*\/(.*)/)[1];
		var img = quote.get('a/img/@src').text().match(/^(.*)_normal(.jpe?g)$/i);
		if (img) img = img[1] + img[2];

		var msgresp = function(name, msg, lnk) {
			message.respond("<%> %".f(name, msg) + (lnk ? ' ('+lnk+')' : ''));
		}

		if (!/default_profile/.test(img)) {
			get('http://tinyurl.com/api-create.php?url=' + img, function(tiny, response) {
				msgresp(name, msg, tiny);
			});
		} else {
			msgresp(name, msg);
		}

	});
}

function wiktionary(message, random) {
	var base = 'http://en.wiktionary.org';

	var query = message.query;

	var uri = url.resolve(base, 'wiki/' + escape(query.text));

	console.log(uri);

	scrape(uri, function(doc, body, response) {
		var extract = function(doc) {
			var defs = doc.find('//div[@id="bodyContent"]/ol/li');
			console.log(defs);
			var def = defs[random ? defs.getRandomIndex() : 0];
			console.log(def);

			var word = def.get("parent::ol/preceding-sibling::p[1]//b").text().capitalize();
			var type = def.get("parent::ol/preceding-sibling::*[name()='h3' or name()='h4'][1]/span[contains(@class, 'mw-headline')]").text();

			var text = def.text().split('\n')[0];


			message.respond('%: % - %'.f(word, type, text));
		}

		var redirect = doc.get('//span[@id="did-you-mean"]');

		if (redirect) {
			var href = url.resolve(
				base,
				redirect.get('.//a/@href').text()
			);

			console.log("Redirecting to " + href);

			scrape(href, extract);
		} else {
			extract(doc);
		}
	});
}

function wquote(message) {
	var query = message.qtxt;

	ifl(query, 'wikiquote.org', function(doc, body) {

		var h1 = doc.get('//h1').text();

		var lis = doc.find("//div[@id='bodyContent']/ul[preceding-sibling::*[name() = 'h2' or name() = 'h3'][1]/span[@id != 'External_links' and @id != 'Sources']]/li");

		var li = lis.getRandom();

		var quote = li.get('text()').text().trim();

		message.respond(h1 + ': "' + quote + '"');

		var refs = li.get('ul');
		if (refs) refs.text().trim().split('\n').forEach(function(msg) {
			message.respond(' - ' + msg);
		});

	});
}

function imquote(message) {
	ifl(message.qtxt + ' character quotes', 'imdb.com', function(doc, body) {
		try {
		//console.log(body.substr(0, 1000));
		//var name = doc.get("//div[@id='tn15title']/h1/a[contains(@class, 'main')]").text();
		var quotes = doc.find('//div[@id="tn15content"]//*[name() = "b" or name() = "i"][a]');

		quotes = quotes.filter(function(q) {
			return q.get('a').text().toLowerCase().match(message.qtxt.toLowerCase());
		});

		var quoteline = quotes.getRandom();

		var quote = '';

		var current = quoteline;
		while ((current = current.nextSibling()) && current.name() != 'br') 
			quote += current.text();

		
		quote = quote.substr(1).trim();
		//var quote = quoteline.find('following-sibling::*[name() != "i"]').map(function(t) { return t.text(); }).join('').substr(1).trim();

		message.respond(quoteline.get('a').text() + ': ' + quote); 

		//console.log(quotes.length);
		} catch (e) {
			print_r(e);

			message.respond("it no worked...");
		}
	});
}

function ifl(query, site, callback, nofollow) {
	var uri = 'http://www.google.com/search?q=' + escape(query + ' site:' + site) + '&btnI';
	console.log(uri);

	if (nofollow) get(uri, callback, true);
	else scrape(uri, function(doc, body, request) {

		if (request.socket.host.match('google.com')) {
			var flink = doc.get('//div[@id="ires"]//a/@href').text().trim();

			console.log("Not so lucky...redirecting again: " + flink);

			scrape(flink, callback);
		} else {
			callback(doc, body, request);
		}
	});
}

function bnet(message) {
	var args = message.query.args,
		region = args[2] || 'us',
		code = args[1],
		name = args[0],
		uri = 'http://sc2ranks.com/api/base/teams/%s/%s%s%s.json?appKey=http://www.werkkrew.com'.f(
			region, name, code.length > 4 ? '!' : '$', code
		);

	console.log(uri);

	get(uri, function(data) {
		data = JSON.parse(data);
		print_r(data);
		if(!data.error) {
			region = data.region.toUpperCase();
			name = data.name;
			code = data.character_code;
			var found = false;

			for(var i=0, len = data.teams.length, teams; i < len; i++)
			{
				if (data.teams[i].bracket == 1) {
					team = data.teams[i];
					found = true;
					break;
				}
			}
			if(found) {
				var rank = team.division_rank,
					league = team.league.capitalize(),
					race = team.fav_race.capitalize(),
					points = team.points,
					wins = team.wins,
					loss = team.losses;
				if(loss > 0) {
					ratio = Math.round(((wins / (wins + loss)) * 100)*10)/10;
					stats = ", Wins: " +wins+ " Loss: " +loss+ " (" +ratio+ "%)";
				} else {
					stats = "";
				}

				message.respond("Battle.net: " +name+ " (" +region+ "), Rank " +rank+ " " +league+ " " +race+ ", " +points+ " Points" +stats);
			} else {
				message.respond("Battle.net: " +name+ " (" +region+ ") - No 1v1 Team Data");
			}
		} else {
			message.respond("Error: " + data.error);
		}
                console.log("Deleted Data");
	});

		
}

