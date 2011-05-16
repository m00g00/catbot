var path = require('path'),
    spawn = require('child_process').spawn;


var ExternalScript = {
	types: {
		ruby: {
			ext: 'rb',
			exec: '/usr/local/bin/ruby',
			loader: './lib/rubyLoader.rb',
			methods: 'Ruby'
		}
	},


	Child: function(exec, loader, file) {
	
		this.file = file;
		this.exports = {};
		this.exported = {};

		this.export = function(name, obj) {
			this.exports[name] = obj;
			this.flushExports();
		};

		this.flushExports = function() {
			this.exports.forEach(function(v,n) {
				if (!(n in this.exported)) {
					this.putExport(n);

					this.exported[n] = true;
				}
			}, this);
		};

		/*var exports = [];
		this.addExport = function(obj) {
			return exports.push(obj);
		};

		this.getExport = function(id) {
			return exports[id-1];
		};

		this.deleteExport = function(id) {
			delete exports[id-1];
		};*/

		this.inherits(spawn(exec, [loader]));

		var thiz = this;
		var dump = function(data) {
			process.stdout.write(thiz.prompt+data);
		};

		this.stdout.setEncoding('utf8');
		this.stderr.setEncoding('utf8');

		this.bufferData = function(stream) {
			var buffer = ''
			stream.on('data', function(data) {
				(buffer+data).split(/\n/).forEach(function(line, i, a) {
					if (i < a.length-1)
						stream.emit('line', line+'\n');
					else
						buffer = line;
				});
			});
		};

		this.bufferData(this.stderr);
		this.bufferData(this.stdout);

		this.stderr.on('line', function(line) {
			process.stdout.write('stderr> ' + line);
		});

		var thiz = this;
		this.stdout.on('line', function(line) {
			try {
				var msg = JSON.parse(line);
			} catch(e) {}

			 	if (!(msg instanceof Object)) return; 

				var jsobj =  thiz.exports[msg.JSObject];
				var target = jsobj[msg.key];

				if (msg.command == 'call') {
					var fargs = msg.args.map(function(e) {
						var match;
						if (!(match = /^\[Function #(\d+)\]$/.exec(e))) 
							return e;

						var funcid = match[1];
						return function() {
							var args = JSON.stringify(
								Array.prototype.slice.call(arguments).
								filter(function(e){
									return typeof e != 'undefined' &&
										   e !== null;
								}));
							thiz.putFunction(funcid, args);
						};
					});
					//print_r(fargs);

					target.apply(jsobj, fargs);
				}
		});
		//this.stderr.on('data', this.bufferData());

		this.linkStdout = function() {
			var listener = function(line) {
				process.stdout.write('stdout> ' + line);
			};

			this.unlinkStdout = function() {
				this.stdout.removeListener('line', listener);
			}

			this.stdout.on('line', listener);
		};

		this.unlinkStdout = function() {
			return false;
		};

		this.puts = function(str) {
			this.stdin.write(str + '\n');
		};



	
	},

	Ruby: {
		prompt: 'Ruby> ',

		run: function() {
			this.puts('eval(File.read("%"), scope, "%")'.f(this.file, this.file))
			//this.puts('runScript "%"'.f(this.file));
		},

		putExport: function(name) {
			this.puts(name + ' = JSObject.new "' + name + '"');
		},

		putFunction: function(id, args) {
			this.puts(
				'JSObject.callbacks[{id}].call( *JSON.parse( %({args}) ) )'
				.fo({id: id, args: args})
			);
		}
	}
		
}



/*ExternalScript.ChildScript.addPrototype({
	puts: function(str) {
		this.stdin.write(str + '\n');
	}
});*/

		


exports.load = function(file, type) {
	var types = ExternalScript.types;
	if (!type) {
		var ext = path.extname(file).substr(1);
		types.forEach(function(props, name) {
			if (props.ext == ext) {
				type = name;
				return false;
			}
		});

		if (!type) throw new Error("Extension '%' not recognized".f(ext));
	}

	if (!(type in types)) throw new Error("Type '%' not supported".f(type));

	var opt = types[type];

	return new ExternalScript.Child(
		opt.exec, opt.loader, file
	).meld(ExternalScript[opt.methods]);
};

exports.loadRuby = function(file) {
	return exports.load(file, 'ruby');
};

	
		
	
