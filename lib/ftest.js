var f = require('./fork')

var c = f.fork(function(dude) {
	var vm = require('vm'),
		context = {};
	process.on('message', function(msg) {
		if (!/^\s*$/.test(msg)) process.postMessage(
			vm.runInNewContext(msg, context)
		);
	});
});

var stall = false;
c.on('message', function(m) {
	stall = false;
	console.log(m);
});

c.on('error', function(e) {
	console.log('ERROR: ' + e);
});

var stdin = process.openStdin();
stdin.on('data', function(data) {
	c.post(data.toString());
	stall = true;
	setTimeout(function() {
		if (stall) {
			console.log("TIMEOUT");
			process.exit();
		}
	}, 5000);

});

