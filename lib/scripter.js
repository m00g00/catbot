	var fs = require('fs'),
		readFile = fs.readFile,
		readFileSync = fs.readFileSync;
	    Script = require('vm');

	var onSyntaxError = function(e, source, file, returnFunc) {
		var spawn = require('child_process').spawn;

		var child = spawn('node', ['syntaxcheck.js', file]);

		var std = '';
		var capture = function(data) {
			std += data;
		};

		//child.stdout.on('data', capture);
		child.stderr.on('data', capture);

		child.on('exit', function(code) {
			e.stack = std.match(/^[^]*?\nSyntaxError.*/)[0].replace('undefined:', file + ':').trim();
			if (returnFunc instanceof Function) returnFunc(e, null);
		});

		//child.stdin.write(source);
		child.stdin.end(source, 'utf8');
	};

	var loadFile = function(file, callback, returnFunc, encoding) {
		encoding = encoding || 'utf8';
		readFile(file, encoding, function(err, source) {
			var result;
			try {
				if (err) throw err;
				result = callback(source);
				if (returnFunc instanceof Function) returnFunc(null, result);
			} catch(e) {
				if (e instanceof SyntaxError) onSyntaxError(e, source, file, returnFunc);
				else if (returnFunc instanceof Function) returnFunc(e, null);
			}
		});
	};

	var loadFileSync = function(file, callback, encoding) {
		encoding = encoding || 'utf8';
		var source = readFileSync(file, encoding), result;
		try {
			result = callback(source);
		} catch(e) {
			if (e instanceof SyntaxError)
				onSyntaxError(e, source, file);

			result = e;
		}

		return result;
	};

	//return {
	exports.runFileInThisContext = function(file, callback) {
		loadFile(file, function(source) {
			return Script.runInThisContext(source, file);
		}, callback);
	};

	exports.runFileInContext = function(file, context, callback) {
		loadFile(file, function(source) {
			Script.runInContext(source, context, file);
		}, callback);
	};

	exports.runFileInNewContex = function(file, context, callback) {
		loadFile(file, function(source) {
			Script.runInNewContext(source, context, file);
		}, callback);
	};

	exports.runFileSyncInThisContext = function(file) {
		return loadFileSync(file, function(source) {
			Script.runInThisContext(source, file);
		});
	};

	exports.runFileSyncInNewContext = function(file, context) {
		return loadFileSync(file, function(source) {
			Script.runInNewContext(source, context, file);
		});
	};

	exports.runFileAsFunction = function(file, args, context, callback) {
		loadFile(file, function(source) {
			var result, keys;
			keys = Object.keys(args);
			source = '(function ('
					 + keys.join(', ')
					 + ') { ' 
					 + source
					 + '\n});';

			var func = Script.runInThisContext(source, file);
			return func.apply(context, 
							 keys.map(function(e) {
								return args[e];
							 })
			);
		}, callback);
	};

