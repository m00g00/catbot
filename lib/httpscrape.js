var get = require('./httpget').get,
	xml = require('libxmljs');


exports.scrape = function(uri, callback) {
	get(uri, function(body, response) {
		//console.log(body);
		//console.log(response.headers);
		var doc = xml.parseHtmlString(body);

		callback(doc, body, response, xml);
	});
};


