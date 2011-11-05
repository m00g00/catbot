var spawn = require('child_process').spawn,
	SEP = '\r\n';


var fork = function(code) {
	if (typeof code == 'function') {
		code = code.toString().match(/^function.*?\{([^]*)\}/)[1];
	} /*else if (typeof code == 'string') {
		code = 'function(){'+code+'}'
	}*/

	var child = spawn('node', ['./lib/fork_child.js']);
	child.stdin.write(code);

	var receive = function(block) {
		//console.log(block);
		var result;
		try {
			result = JSON.parse(block);
			child.emit('message', result);
		} catch(e) {
			//console.log("FORK ERROR: " + e);
		}
	}

	child.post = function(obj) {
		var msg = JSON.stringify(obj);

		child.stdin.write(msg + SEP);
	};

	child.postMessage = child.post;

	var buffer = '';
	child.stdout.on('data', function(data) {
		var blocks = (buffer + data).split(SEP), result;

		for (var i=0, l=blocks.length; i<l-1; i++) {
			if (blocks[i].length) receive(blocks[i]);
		}

		buffer = blocks[i];
	});

	child.stderr.on('data', function(data) {
		child.emit('error', data.toString());
	});

	return child;
};

exports.fork = fork;
