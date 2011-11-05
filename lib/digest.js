var crypt = require('crypto'), http = require('http'),
	supported = ['auth'];

function hash(data, type, encoding) {
	type = type || 'md5';
	encoding = encoding || 'hex';

	var hobj = crypt.createHash(type);

	hobj.update('' + data);

	return hobj.digest(encoding);
}

function md5(data, encoding) {
	return hash(data, 'md5', encoding);
}

function generateAuthString(params) {
	if (typeof params != 'object' || params === null || !['username', 'pass', 'uri', 'realm', 'nonce', 'qop', 'cnonce', 'nc'].every(
		function(k) { return k in params })) throw "Incomplete information";

	if (supported.indexOf(params.qop) == -1) throw "Unsupported auth type";

	params.method = params.method || 'GET';

	var genHash = function() {
		return md5(Array.prototype.map.call(arguments, function(e) {
			return e in params ? params[e] : e;
		}).join(':'));
	};

	var ha1 = genHash('username', 'realm', 'pass'),
		ha2 = genHash('method', 'uri'),
		response = genHash(ha1, 'nonce', 'nc', 'cnonce', 'qop', ha2);

		return response;
}

function generateAuthHeader(data) {
	return 'Digest ' + 
		['username', 'realm', 'nonce', 'uri', 'algorithm', 'response', 'qop', 'nc', 'cnonce', 'opaque'].
			filter(function(k) { return k in data }).
			map(function(k) { return k + '="' + data[k] + '"' }).
			join(', ');
}

function authToObj(authstr) {
	var data = {}, reg = /(\w+)="?([^",]+)"?/g, x;
	while (x = reg.exec(authstr)) data[x[1]] = x[2];
	return data;
}

function createAuthResponse(user, pass, request, respback) {
	var res = request.res, authstr,
		data = authToObj(res.headers['www-authenticate']);

		data.qop = supported.filter(function(f) { return data.qop.indexOf(f) != -1 })[0];
		data.uri = request.path;
		data.nc = '00000001';
		data.cnonce = md5(Math.random().toString().slice(2)).slice(0,16);
		data.method = request.method;
		data.username = user;
		data.pass = pass;
		data.response = generateAuthString(data);

		authstr = generateAuthHeader(data);

		var headers = { 'Authorization' : authstr };
		Object.keys(request._headerNames).forEach(function(k) {
			headers[request._headerNames[k]] = request._headers[k];
		});

		return http.request({ host: request.agent.host,
							  port: request.agent.port,
							  path: request.path,
							  method: request.method,
							  headers: headers }, respback);
}

function createAuthRequest(user, pass, options, response) {
	return http.request(options, function(res) {
		if (res.statusCode == 401) createAuthResponse(user, pass, this, response).end();
		else response(res);
	}).end();
}
					
exports.response = createAuthResponse;
exports.request = createAuthRequest;
