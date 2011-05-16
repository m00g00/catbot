var spawn = require('child_process').spawn;

var ruby = spawn('/usr/local/bin/ruby', ['rubyLoader.rb']);

var dump = function(data) { console.log(data); };

ruby.stdout.setEncoding('utf8');

ruby.stdout.on('data', function(data) {
	console.log("IN: "+data.trim());
	try {
		var msg = JSON.parse(data);
		
		if (msg.command == 'call') {
			msg.args.forEach(function(e) {
				var match;
				if (match = /^\[Function #(\d+)\]$/.exec(e)) {
					console.log("CALL " + e);
					var funcid = match[1];
					setTimeout(function() {
						//ruby.stdin.write(msg.varname + '.callbacks['+funcid+'].call\n');
					}, 2000);
				}
			});
		}
	} catch(e) {
	}

	console.log('');

});

ruby.stderr.on('data', dump);

//var stdin = process.openStdin();
//stdin.setEncoding('utf8');

//var block = 0;
//var buffer = '';
/*stdin.on('data', function(data) {
	switch(data) {
		case "BLOCK\n":
			block = 1;
			break;
		case "END\n":
			if (block) {
				block = 0;
				ruby.stdin.write(buffer);
				buffer = '';
			} else {
				ruby.stdin.end();
			}
			break;
		default:
			if (block) buffer += data;
			else ruby.stdin.write(data);
			break;
	}
});*/
