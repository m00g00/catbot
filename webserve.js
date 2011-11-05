var	connect = require('connect'),
	httpserver = connect.createServer(
		connect.logger(),
		connect.query(),

		connect.router(function(app) {
			var dateformat = '%Y-%m-%d';
			app.get('/log/:server/:channel/latest', function(req, res, next) {
				var now = new Date,
					to = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1).format(dateformat),
					from = now.format(dateformat);

				req.url = req.url.split('/').slice(0, -1).concat(from, to).join('/');
				console.log(req.url);

				//req.params.to = to;
				//req.from = from;

				next();

			});

			app.get('/log/:server/:channel/:from/:to', (function() {
				var log = require('./lib/loggen'),
					totimefmt = function(fmt) { return fmt.replace(/[A-Za-z]/g, '%$&') },
					styles = {
						mirc: {
							PRIVMSG: '[{timestamp}] <{nick}> {text}',
							JOIN:    '[{timestamp}] * {nick} has joined {channel}',
							PART:	 '[{timestamp}] * {nick} has left {channel}',
							QUIT:	 '[{timestamp}] * {nick} has quit ({text})',
							NICK:	 '[{timestamp}] * {nick} is now known as {text}',
							DEFAULT: '[{timestamp}] * {type} {text}'
						},

						tab: {}
					},

					formats = {

						text: function(params, req, res, logr) {
							res.setHeader('Content-type', 'text/plain; charset=utf-8')
							logr.timestamp(req.query.timestamp ? totimefmt(req.query.timestamp) : '%T')
								.format(styles[req.query.style || 'mirc'])
							    .each(function(line) { res.write(line + '\n') })
								.complete(function(n) {
									if (!n) res.write("No log data for " + params.channel +
										              " on " + params.server + " from " +
													  params.from + " to " + params.to)

									res.end()
								})
								.error(function(e) { res.end("Error: " + e) })
						},

						json: function(params, req, res, logr) {
							res.setHeader('Content-type', 'application/json')
							var first = false;
							res.write('[')
							logr.each(function(line) { 
									if (first) res.write(',')
									else first = true
									res.write(JSON.stringify(line)) 
								})
								.complete(function(n) { res.write(']'); res.end() })
								.error(function(e) { res.end(JSON.stringify({error: e})) })
						},

						html: function(params, req, res, logr) {
							res.setHeader('Content-type', 'text/html');

							res.write('<html><head><title="'+params.channel+'"/><style>td.nick { text-align: right; font-weight: bold; }</style></head><body><table id="log" border="1">');
							logr.each(function(line) {
								res.write('<tr><td>'+line.timestamp+'</td>' +
											  '<td class="nick">' + (line.type == 'JOIN' ? '-->' : line.type == 'QUIT' || line.type == 'PART' ? '<--' : line.type != 'PRIVMSG' ? '*' : line.nick) + '</td>' +
											  '<td>' + (line.type == 'JOIN' ? '<b>' + line.nick + '</b>' + ' has joined ' + line.channel :  line.type == 'PART' ? '<b>' + line.nick + '</b>' + ' has left ' + line.channel : 
											            line.type == 'QUIT' ? '<b>' + line.nick + '</b>' + ' has quit (' + line.text + ')' : line.type != 'PRIVMSG' ? '<b>' + line.nick + '</b>' + ' ' + line.type + ' ' + line.text :
														line.text) + '</td></tr>');
							}).timestamp('%T').complete(function() { res.end('</table></body></html>') });

							/*var markup = require('./lib/markup');
							with(new markup.Markup()) {
								var dom = html(
											head(
												title('log')
											),
											body(
												h1(params.channel),
												iframe({src: req.url + '?format=table', width: '100%', height: '100%' })
											)
										);
							}

							res.end(dom.toString());*/
						},

						table: function(params, req, res, logr) {
							var markup = require('./lib/markup');
							res.write('<table>');

							with(new markup.Markup()) {
							logr.each(function(line) {
								res.write(tr(td(line.timestamp), td(line.nick), td(line.text)).toString());
							}).complete(function(n) { res.end('</table>') }).timestamp('%T');
							}
						}

												
								

					}
				
				return function(req, res, next) {
					var params = req.params,
						query = req.query || {},
						format = formats[typeof query.format == 'string' ? query.format.toLowerCase() : 'text'],
						logp = { channel: '#' + params.channel,
								 server: params.server,
								 from: new Date(params.from).format(dateformat),
								 to: new Date(params.to).format(dateformat) }
					
					if (req.query.filter) logp.type = req.query.filter.toUpperCase()

					format(params, req, res, log.get(logp))
				 }
			}())
		)
	})
).listen(4829)
