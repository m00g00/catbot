(function() {
	var SEP = '\r\n';
	process.postMessage = function(message) {
		process.stdout.write(
			JSON.stringify(message) + SEP
		);
	};
	process.post = process.postMessage;

	var receive = function(block) {
		var result;
		try {
			result = JSON.parse(block);
			process.emit('message', result);
		} catch(e) {
			console.error(e.toString());
		}
	};

	var stdin = process.openStdin(), buffer = '';
	stdin.on('data', function(data) {
		var blocks = (buffer + data).split(SEP), result;

		for (var i=0, l=blocks.length; i<l-1; i++) {
			if (blocks[i].length) receive(blocks[i]);
		}

		buffer = blocks[i];
	});
})();

eval('('+process.argv[2]+')()');
