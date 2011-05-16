var stdin = process.openStdin();
stdin.setEncoding('utf8');

var source = '';

stdin.on('data', function(chunk) {
	source += chunk;
});

stdin.on('end', function() {
	eval('(function () {'+source+'\n});');
	process.exit();
});
