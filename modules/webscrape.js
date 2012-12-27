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

mod.on('!npm', npm);

mod.on('!mdn', function(msg) { goog(msg.query.text + ' site:developer.mozilla.org', msg.respond.bind(msg)) });

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
	goog(message.query.text, message.respond.bind(message));
}

function goog(query, resp) {

	var ln = mod.irc.conf.webscrape_google_num_results || 3;
	//console.log('http://www.google.com/search?q=' + escape(message.query.text.replace(/\s/g, '+')))

	scrape('http://www.google.com/search?q=' + escape(query), function(doc, body, response) {
		var ls = doc.find('//li[not(@id)]//h3/a');

		var msg = [], i=0;
		ls.some(function(l) {
			if (i >= ln) return true;
			i++
				msg.push(unescape(l.text()) + ' @ ' + 
						(function(){ dump("moooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo"); 
									 var v = l.attr('href').value(),
									 vul = url.parse(v, true);
									 dump(v,vul);
			  						 return /^\/url\?q=.*/.test(v) ? vul.query.q : v }()))
		});

		resp(msg.join(' -- '));
	});
}

function wikipedia(message) {
	var base = 'http://en.wikipedia.org';

	ifl(message.qtxt, base, function(body, response) {
		var url = response.headers.location + '?action=render';

		scrape(url, function(doc, body, resp) {

			var par = doc.get('/html/body/p');
			dump(par);

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

	if (nofollow) get(uri, callback, true);
	else scrape(uri, function(doc, body, request) {

		dump(request, 0, 2)

		if (request.req._headers.host.match('google.com')) {
			var flink = doc.get('//div[@id="ires"]//a/@href').text().trim();

			console.log("Not so lucky...redirecting again: " + flink);

			scrape(flink, callback);
		} else {
			callback(doc, body, request);
		}
	});
}

function npm(message) {
	var query = escape(message.query.text.trim());

	if (!query) {
		message.respond("What package do you want to search for?");
		return;
	}


	var resp = function(info) {
		var robj = {};

		robj.name = info.name;
		robj.description = info.description || info['dist-tags'].latest;

		if (info.name) robj.name = info.name;
		//if (info.description) robj.description = info.description;
		if (info.author) robj.author = info.author.name;
		else if (info.maintainers && info.maintainers.length) 
			robj.maintainer = info.maintainers[0].name;

		if (info.repository) robj.repo = info.repository.url;
		else if (info['dist-tags'] && info['dist-tags'].latest && info.versions) {
			var ver = info.versions[info['dist-tags'].latest]
			if (ver && ver.repositories && ver.repositories.length)
				robj.repo = ver.repositories[0].url
		}


		var msg = Object.keys(robj).filter(function(k) { return k != 'name' && k != 'description' })
								   .map(function(k) { return k.capitalize() + ': ' + robj[k] })
								   .join(', ');

		
		message.respond(robj.name + ': ' + robj.description + ' -- ' + msg);
	};

	var search = function() {
		var uri = 'http://search.npmjs.org/_list/search/search?startkey=%22'+query+'%22&endkey=%22'+query+'%22&limit=25';

		get(uri, function(data) {
			var obj = JSON.parse(data);

			if (!obj.rows || !obj.rows.length) {
				var uri = 'http://search.npmjs.org/_view/author?reduce=false&include_docs=true&key=%22' + query + '%22';
				get(uri, function(data) {
					var obj = JSON.parse(data);
					dump(obj);

					if (obj.rows && obj.rows.length) {
						message.respond('Packages by ' + obj.rows[0].key + ': ' + obj.rows.map(function(r) { return r.id }).join(', '));
						return;
					} else {
						message.respond("Nothing found");
						return;
					}
				});
			} else if (obj.rows.length > 1) {
				message.respond(obj.rows.map(function(r) { return r.key }).join(', '));
				return;
			} else {
				resp(obj.rows[0].value);
				return;
			}

		});
	};

	var package = function() {

		var uri = 'http://search.npmjs.org/api/' + query;

		get(uri, function(data) {
			var obj = JSON.parse(data);

			if (obj && obj.name == query) {
				resp(obj);
				return;
			} else {
				search();
			}
		});
	};

	if (message.query.args[0].toLowerCase() == 'search') {
		query = message.query.args.slice(1).join(' ');
		search();
	} else {
		package();
	}
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

/*mod.on('!auth', function(msg) {
	var digest = require('./lib/digest'),
		user = "wpdev", pass = "p@ss4d3v";
		method = 'GET', host = 'dev.wellplayed.org', path = '/api/channels/live.json?key=e45296d6343c13e75b4d2566028f5871';

	digest.request(user, pass, { 
		host: host, port: 80, path: path, method: method,
		headers: { Host: host, 'User-Agent': 'Mozilla/5.0' }
	}, function(res) {
		res.setEncoding('utf8');
		var buffer = '';
		res.on('data', function(chunk) {
			buffer += chunk;
		});
		res.on('end', function() {
			//var obj = JSON.parse(buffer);
			//print_r(obj);
			//with(obj) msg.respond(JSON.stringify(eval(msg.query.text)));

			msg.respond(buffer.slice(0,200));
		});
		res.on('error', function(er) { console.log('error: ' + er) });
	});
});*/
/*mod.on('!auth', function(msg) {
	var http = require('http')
	var client = http.createClient(80, host);

	client.request(method, path, {
		'Host': 'dev.wellplayed.org',
		'User-Agent': 'Mozilla/5.0'
	}).on('response', function(res) {
			print_r(res.headers); print_r(res.statusCode);
		if (res.statusCode == 401) {
			print_r(client);
			console.log('hai');
			var authdata = {}, authquotes = {}, authreg = /(\w+)="?([^",]+)"?/g, x;
			while(x=authreg.exec(res.headers['www-authenticate'])) {
				authdata[x[1]] = x[2];
				if (x[0].indexOf('"') != -1) authquotes[x[1]] = true;
			}
			//authdata.qop = 'auth';
			print_r(authdata);
			var crypt = require('crypto'), ha1 = crypt.createHash('md5'),
			    ha2 = crypt.createHash('md5'), response = crypt.createHash('md5'), cnonce = crypt.createHash('md5');

			//authdata.nonce = "exnlYc6mBAA=fa0775c543c3f5a03b5697484f7cc4b394304cf4"

		    cnonce.update(Math.random().toString().slice(2));

			authdata.nc = '00000001'
			authdata.cnonce = cnonce.digest('hex').slice(0,16);
			authquotes.cnonce = true;
			//authdata.cnonce = "c822c727a648aba7";

			ha1.update([user, authdata.realm, pass].join(':'));
			ha2.update([method, path].join(':'));
			response.update(
			  [ha1.digest('hex'), authdata.nonce, authdata.nc, authdata.cnonce, authdata.qop, ha2.digest('hex')].join(':')
			);*/

			/*response.update([user, authdata.realm, pass].join(':'));
			response.update([authdata.nonce, authdata.nc, authdata.cnonce, authdata.qop].join(':'));
			response.update([method, path].join(':'));*/

			//var order = ['username', 'realm', 'nonce', 'uri', 'algorithm', 'response', 'qop', 'nc', 'cnonce', 'opaque'];

/*
			var final = response.digest('hex');
			print_r(authdata)
			console.log(final);
			authdata.response = final;
			authdata.username = user;
			authdata.uri = path;
			authquotes.uri = true;
			authquotes.username = true;
			authquotes.response = true;
			authquotes.qop = false;
			var fheaders = {
				'Host': host,
				'User-Agent': 'Mozilla/5.0',
				'Authorization': 'Digest ' + //order.filter(function(k) { return k in authdata })
				                      Object.keys(authdata).map(function(k) {
					var q = true ? '"' : '';
					return k + '=' + q + authdata[k] + q;
				}).join(', ')
			}
			print_r(fheaders);

			//var req2 = http.createClient(80, host);
			http.request({ host: host, port: 80, path: path, method: 'GET', headers: fheaders },
			function(res) {
				console.log('status ' + res.statusCode);
				print_r(res.headers);
				res.setEncoding('utf8');
				var buffer = '';
				res.on('data', function(chunk) {
					buffer += chunk;
				});
				res.on('end', function() {
					//var obj = JSON.parse(buffer);
					//print_r(obj);
					//with(obj) msg.respond(JSON.stringify(eval(msg.query.text)));

					msg.respond(buffer.slice(0,200));
				});
				res.on('error', function(er) { console.log('error: ' + er) });
			}).end();
		}
	}).end();*/





	/*var req = client.request('GET', '/api/channels/live.json?key=e45296d6343c13e75b4d2566028f5871', {
		'Host': 'dev.wellplayed.org',
		'User-Agent': 'Mozilla/5.0',
		'Authorization': 'Digest username="wpdev", realm="dev", nonce="momFNsumBAA=e79aec4cb44b77ce1d1039a72a14ffda4621aba9", uri="/api/channels/live.json?key=e45296d6343c13e75b4d2566028f5871", algorithm=MD5, response="5b21375dc51544784f1cf2a9fe743174", qop=auth, nc=00000001, cnonce="082c875dcb2ca740"'
		
	});*/




//});
//mod.on('!ud', ud);

/*function ud(message, random) {
	ifl(message.qtxt, 'http://www.urbandictionary.com', function(doc, body, response) {
		var items = doc.find('//table[@id="entries"]//td[@class="index"]/../following-sibling::tr[1]/td[@class="text"]');

		ite 
*/

