var https = require('https');
var http = require('http');
var purl = require('url');

exports.get = function(opt, callback, nofollow) {

	var headers = { },
	    data = null,
	    url,method='GET'

	if (typeof opt=='string') url = opt
	else {
	    headers = opt.headers || headers
	    data = opt.data || data
	    url = opt.url
	    method = opt.method || method
	}

	var p = purl.parse(url, true);

	if (!headers.Host) 
		headers.Host= p.hostname
	if (!headers['User-Agent'])
		headers['User-Agent']='Mozilla/5.0'


	//p.hostname = p.hostname || p.href;
	p.search = p.search || '';
	p.port = p.port || (p.protocol == 'https:' ? 443 : 80);
	p.pathname = p.pathname || '/';


	//print_r(p);
	dump(p.port);
	dump(p);
	dump(opt);
	dump(url);

	var request=(p.protocol == 'https:' ? https : http).request({port:p.port, hostname:p.hostname, path: p.pathname + p.search, method: method, headers:headers});

	//var request = client.request('GET', p.pathname + p.search, headers);
	request.on('error', function(resp){ dump(arguments) })
	request.on('response', function(response) {
	dump("STATUS: " + response.statusCode + ' > ' + response.headers.location)
			//dump("HAI");
		if ((response.statusCode == 301 || response.statusCode == 302) && response.headers.location && !nofollow) {
		dump(response.headers.location);
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

	request.end(data);
};





