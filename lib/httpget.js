var http = require('http');
var purl = require('url');

exports.get = function(url, callback, nofollow) {
	var p = purl.parse(url, true);

	//p.hostname = p.hostname || p.href;
	p.search = p.search || '';
	p.port = p.port || 80;
	p.pathname = p.pathname || '/';

	print_r(p);

	var client = http.createClient(p.port, p.hostname);

	var headers = {
		'Host': p.hostname,
		'User-Agent': 'Mozilla/5.0'
	};

	var request = client.request('GET', p.pathname + p.search, headers);

	request.on('response', function(response) {
		if ((response.statusCode == 301 || response.statusCode == 302) && response.headers.location && !nofollow) {
			exports.get(response.headers.location, callback);
			return;
		}

		if (response.headers['content-encoding'] == 'gzip') {
			var spawn = require('child_process').spawn;

			var gzip = spawn('gzip', ['-d']);

			var deflate = '';

			gzip.stdout.on('data', function(data) {
				deflate += data;
			});

			gzip.stderr.on('data', function(err) {
				console.log(err.toString());
			});

			gzip.on('exit', function(c) {
				//console.log(c);
				callback(deflate, response);
			});

			response.on('data', function(chunk) {
				gzip.stdin.write(chunk);
			});

			response.on('end', function() {
				gzip.stdin.end();
			});
		} else {

			response.setEncoding('utf8');

			var body = '';
			response.on('data', function(chunk) {
				body += chunk;
			});

			response.on('end', function() {
				callback(body, response);
			});
		}
	});

	request.end();
};





