
var http = require('http');
var purl = require('url');
var path = require('path');
var fs = require('fs');
var Script = require('vm');
var log = function() {
	console.log('<' + Array.prototype.join.call(arguments, ', ') + '>');
};

var watchedFiles = [];

function watchMTime(filename, callback) {
	watchedFiles.push(filename);
	fs.watchFile(filename, function(curr, prev) {
	print_r(typeof curr.mtime);
		if (curr.mtime > prev.mtime) {
			log("FILE CHANGE DETECTED: " + filename);
			callback(filename, curr, prev);
		}
	});
}

function unwatchAll() {
	watchedFiles.forEach(function(f) {
		fs.unwatchFile(f);
	});
}

	

http.Server.addPrototype({
	loadfile: function(filename, callback) {
		var thiz = this;
		fs.readFile(filename, function(err, data) {
			if (err) {
				log('HTTP FILE LOAD ERROR', err)
			} else {
				log('FILE LOADED');
				thiz.fcache[filename] = data;
			}

			if (callback) callback(err);
		});
	},

	watchloadfile: function(filename, callback) {
		var thiz = this;
		watchMTime(filename, function() {
			log('FILE CHANGED, RELOADING');
			thiz.loadfile(filename);
		});
		this.loadfile(filename, callback);
	},
		
	filerequest: function(request, response) {
		var filename = this.root + request.url;
		if (request.url.indexOf('..') != -1) {
			this.notfound(request, response);
		} else if (filename in this.fcache) {
			this.sendfile(filename, request, response);
		} else {
			var thiz = this;
			path.exists(filename, function(exists) {
				if (exists) {
					thiz.watchloadfile(filename, function(err, data) {
						if (!err) {
							thiz.sendfile(filename, request, response);
						} else {
							thiz.error(err);
						}
					});
				} else {
					request.pass();
				}
			});
		}
	},

	sendfile: function(filename, request, response) {
		var data = this.fcache[filename];
		var head = { 'Content-Length': data.length }
		var ext = path.extname(filename).substr(1);
		if (ext && this.filetypes[ext]) head['Content-Type'] = this.filetypes[ext];

		response.writeHead(200, head);
		response.end(data);
	},

	initFCache: function() {
		this.fcache = {};
	},

	init: function() {
		this.initTemplate();
		this.initFCache();
	},

	noroute: function(request, response) {
		log("NO ROUTE", request.url);
		response.writeHead(404, "Not Found");
		response.end();
	},

	error: function(err, request, response) {
		response.writeHead(500, "Error")
		print_r(err);
		response.end(err.toString());
	},

	loadTemplate: function(callback) {
		this.routes = this.base_routes.slice();

		Script.runFileAsFunction(
			this.template,
			{ server: this, mod: mod, com: com, require: require },
			null,
			function(err, result) {
				if (err) {
					log('HTTP TEMPALTE ERROR', err);
				} else {
					log('HTTP TEMPLATE LOADED');
				}

				if (typeof callback == 'function') callback(err, result);
			}
		);
	},

	initTemplate: function() {
		var thiz = this;
		watchMTime(this.template, function() {
			thiz.loadTemplate();
		});
		log('HTTP WATCHING TEMPLATE FILE');

		this.loadTemplate();
	}

});

http.ServerResponse.addPrototype({
	send: function(str, status, headers) {
		str = str instanceof Object && 'toHTML' in str ? str.toHTML() : str.toString();

		status = status || 200;

		headers = defhead(headers || {});

		headers['Content-Length'] = str.length;

		this.writeHead(status, headers);
		this.end(str);
	},

	redirect: function(url) {
		console.log("REDIRECT: " + url);
		this.writeHead(302, { 'Location': url });
		this.end();
	}
		
});

var server = http.createServer();

server.root = './http';
server.template = './template.js';

server.base_routes = [
	[/\.[A-Za-z0-9]+$/, server.filerequest.bind(server)]
];

server.filetypes = {
	css: 'text/css',
	js: 'text/javascript',
	gif: 'image/gif',
	png: 'image/png',
	jpeg: 'image/jpeg'
}

server.destruct = function() {
	server.close();
	server.removeAllListeners('request');
	unwatchAll();
	server = null;
};


server.init();
//server.initTemplate();

server.on('request', function (request, response) {
	log('REQUEST', request.url);
	var dests = this.routes.filter(function(route) {
		return route[0].test(request.url);
	}).map(function(route) { return route[1]; });

	var thiz = this;
	request.pass = function() {
		try {
			(dests.shift() || thiz.noroute).call(thiz, request, response);
		} catch(err) {
			thiz.error(err, request, response);
		}
	};

	request.pass();
});

server.on('upgrade', function(req, socket, head) {
	if (req.headers.upgrade = 'WebSocket')
		new WebSocket(socket, req, head);
});

server.listen(4829);

mod.on('UNLOAD', function() {
	console.log("CLOSING HTTP CONNECTION");
	if (server) server.destruct();
	if (ws) ws.close();
});
		
	
	
		
	

/*server.on('request', function (request, response) {
	var func, 
		 	req = purl.parse(
				request.url.substr(-1) == '/' ? 
					request.url.slice(0,-1) : request.url
			);

	for (var i=0, l=urls.length; i<l; i++) {
		var url = urls[i];

		if (url[0] instanceof RegExp && url[0].test(req.pathname) ||
		    url[0] instanceof Array && url[0].some(function(e) { return e == request.pathname }) ||
		    typeof url[0] == 'string' && url[0] == request.pathname) {
					func = url[1];
					break;
		}

	}

	if (!func) func = notfound;

	request.info = req;

	try { func(request, response) }
	catch(e) {
		print_r(e);
		response.send('I has error', 500);
	}
});*/

function file(request, response) {
	print_r("FILE REQUEST");
	print_r(request.info,0,1);

	var fpath = DOCUMENT_ROOT + request.info.pathname;

	path.exists(fpath, function(exists) {
		if (!exists) {
			response.send('I no has file', 404);
		} else {
			fs.readFile(fpath, function(err, data) {
				if (err) {
					response.send('I has error', 500);
				} else {
					var head = { 'Content-Length': data.length };
					var ext = path.extname(fpath);
					if (ext && filetypes[ext]) head['Content-Type'] = filetypes[ext];

					response.writeHead(200, head);

					response.end(data);
				}
			});
		}
	});
}

/*var template = {};
Script.runFileAsFunction(
	'./template.js', 
	{ exports: template, 
	  server: server,
		mod: mod,
		com: com },
	template,
	function(err, result) {
		if (err) throw err;

		server.listen(8080);
	}
);*/

exports.server = server;

function defhead(props) {
	props = props || {};

	return ({ 'Content-Type': 'text/html' }).meld(props);
}

var net = require('net');
//var md5 = require('./lib/md5/hashlib').md5;
var crypto = require('crypto');

function WebSocket(socket, req, body) {
	this.socket = socket;


				var headers = req.headers;

				var rkey = WebSocket.handshake(headers['Sec-WebSocket-Key1'], headers['Sec-WebSocket-Key2'], body);
				
				var resphead = ['HTTP/1.1 101 WebSocket Protocol Handshake',
								'Upgrade: WebSocket',
								'Connection: Upgrade',
								'Sec-WebSocket-Origin: http://bigmooworld.com:4829',
								'Sec-WebSocket-Location: ws://bigmooworld.com:7734/',
								//'Sec-WebSocket-Protocol: sample',
								'',
								rkey]

				var rdata = resphead.join('\r\n');

				print_r(rdata.match(/\r\n/g).length);
				print_r(rdata.replace(/\r\n/g, '\\r\\n\n'));

				stream.write(rdata);
			//}

			print_r(data);
		//});
	//});
}

WebSocket.inherits(net.Server);

WebSocket.handshake = function(key1, key2, key3) {
	var hash = crypto.createHash('md5');

	[key1, key2].forEach(function(k) { 
		print_r(k);
		var c = parseInt(k.replace(/[^\d]/g, ''), 10) / k.match(/ /g).length;

		hash.update(
			String.fromCharCode.apply(null, [24, 16, 8, 0].map(function(o) { return c >> o & 0xff; }))
		);
	});

	hash.update(key3);

	return hash.digest('binary');
}

/*WebSocket.handshake = function(key1, key2, key3) {
	var keys = [key1, key2];

	var knums = keys.map(function(k) { return parseInt(k.replace(/[^\d]/g, ''), 10) });
	var kspac = keys.map(function(k) { return k.replace(/[^ ]/g, '').length });
	var rnums = knums.map(function(n,i) { return n / kspac[i] });
	var hash = crypto.createHash('md5');

	var rnums = [key1, key2].map(function(k) { 
		var c = parseInt(k.replace(/[^\d]/g, ''), 10) / 
				k.match(/ /g).length;

		//var s = '', i = 24;
		for (var i=24, s=''; i >=0; i -= 8)
			s += String.fromCharCode(c >> i & 0xff);

		hash.update(s);
		/*s += f(c >> 24 & 0xFF);
		s += f(c >> 16 & 0xFF);
		s += f(c >> 8 & 0xFF);
		s += f(c & 0xFF);

	});

	hash.update(key3);


	/*var pack = function(num) {
	  var result = '';
	  result += String.fromCharCode(num >> 24 & 0xFF);
	  result += String.fromCharCode(num >> 16 & 0xFF);
	  result += String.fromCharCode(num >> 8 & 0xFF);
	  result += String.fromCharCode(num & 0xFF);
	  return result;
	};

	hash.update(pack(rnums[0]));
	hash.update(pack(rnums[1]));
	hash.update(key3);

	return hash.digest('binary');
}*/


function strchr(str) {
	for (var i=0, carr=[]; i<str.length; i++) carr.push(str.charCodeAt(i).toString(16));
	print_r(carr.join(' '));
}



//var ws = new WebSocket();
//ws.listen(7734);

exports.WebSocket = WebSocket;		

