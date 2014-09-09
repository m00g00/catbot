var func = {

	inherits: function(func, superFunc) {
		func.prototype.__proto__ = superFunc.prototype;
		Object.defineProperty(func.prototype, 'super_', {
			writable: false,
			configurable: true,
			enumerable: false,
			value: superFunc.prototype
		});

		return func;
	},

	addPrototype: function(func, obj, ifundef) {
		var keys, key, i, l, desc;

		keys = Object.keys(obj);
		for (i=0, l=keys.length; i<l; ++i) {
			key = keys[i];
			if (ifundef && typeof func.prototype[key] != 'undefined') continue;

			desc = Object.getOwnPropertyDescriptor(obj, key);
			desc.enumerable = false;
			Object.defineProperty(func.prototype, key, desc);
		}

		return func;
	},

	values: function() {
		return Object.values(this);
	},

	bind: function(func, obj) {
		return function() {
			func.apply(obj, arguments);
		};
	}
		
};

Object.newChild = function() {
	var lchild, nchild, fchild, i;
	for (i=0; i<arguments.length; i++) {
		nchild = {};
		nchild.inherits(arguments[i]);
		if (typeof lchild != 'undefined') lchild.inherits(nchild);
		else fchild = nchild;
		lchild = nchild;
	}

	return fchild;
};

Object.noenum = function(obj) {
	for (var i in obj) if (obj.hasOwnProperty(i)) {
		var desc = Object.getOwnPropertyDescriptor(obj, i);
		desc.enumerable = false;
		Object.defineProperty(obj, i, desc);
	}

	return obj;
};

Object.make = function(proto, props) {
	var dprops = {};
	if (props) for (var i in props) if (props.hasOwnProperty(i)) {
		var desc = Object.getOwnPropertyDescriptor(props, i);
		desc.enumerable = false;
		desc.configurable = true;
		desc.writeable = true;
		dprops[i] = desc;
	}



	return Object.create(Object.noenum(proto), dprops);
};


var object = {

	values: function(obj) {
		var arr = [];
		for (var i in obj) if (obj.hasOwnProperty(i)) arr.push(obj[i]);
		return arr;
	},

	inherits: function(obj, superObj) {
			obj.__proto__ = superObj;
			Object.defineProperty(obj, 'super_', {
				writable: false,
				configurable: true,
				enumerable: false,
				value: superObj
			});
			return obj;
	},

	meld: function(a) {
		var n, l, b, i, kl, keys;

		for (n=1, l=arguments.length; n<l; ++n) {
			b = arguments[n];
			keys = Object.keys(b);
			for (i=0, kl=keys.length; i<kl; ++i) {
				a[keys[i]] = b[keys[i]];
			}
		}

		return a;
	},

	up: function(o, n) {
		n = typeof n != 'undefined' ? n : 1;

		var parent = o;
		while ((parent = parent.__proto__) && --n);

		return parent;
	},

	numProperties: function(obj) {
		return Object.keys(obj).length;
	},

	/*get count() {
		return object.numProperties(this);
	},*/

	iterate: function (obj, func, self) {
		var keys = Object.keys(obj);
		for (var i=0, l=keys.length; i<l; ++i) {
			if (func.call(self, obj[keys[i]], keys[i], obj) === false) break;
		}
	},

	forEach: function(obj, func, self) {
		if ('length' in obj) {
			Array.prototype.forEach.call(obj, func, self);
		} else {
		    object.iterate(obj, func, self);
		}
	},

	clone: function(obj) {
		var nobj = {};
		for (var key in obj) if (obj.hasOwnProperty(key))
			nobj[key] = obj[key];
		return nobj;
	},

	map: function(obj, func, self) {
		var nobj = {};
		for (var key in obj) if (obj.hasOwnProperty(key))
			nobj[key] = func.call(self, obj[key], key, obj);
		return nobj;
	},

	kmap: function(obj, func, self) {
		var nobj = {}, ans;
		for (var key in obj) if (obj.hasOwnProperty(key)) {
			ans = func.call(self, obj[key], key, obj);
			nobj[ans[0]] = ans[1];
		}
		return nobj;
	},

	filter: function(obj, func, self) {
		var nobj = {};
		for (var key in obj) if (obj.hasOwnProperty(key)) {
			if (func.call(self, obj[key], key, obj)) nobj[key] = obj[key];
		}
		return nobj;
	}

	/*get _() {
		return this.valueOf();
	}*/
		
};

object.each = object.forEach;

var array = {
	getLast: function(arr) {
		if (!arr.length) return;
		return arr[arr.length-1];
	},

	setLast: function(arr, val) {
		//if (!arr.length) return;
		arr[arr.length ? arr.length-1 : 0] = val;
	},

	get last() {
		return array.getLast(this);
	},

	set last(v) {
		array.setLast(this, v);
	},

};

function extendProto() {
	Object.defineProperties(Array.prototype, {
		each: { 
			value: Array.prototype.forEach
		},

		getRandom: {
			value: function() {
				return this[this.getRandomIndex()];
			}
		},

		getRandomIndex: {
			value: function() {
				return ~~(Math.random() * this.length);
			}
		},

		shuffle: {
			value: function() {
				var l = this.length, tmp, i, j;
				if (l) while(--l) {
					i = ~~(Math.random() * (l + 1));
					tmp = this[i]; this[i] = this[l]; this[l] = tmp;
				}

				return this;
				//return this.sort(function(){return Math.random() > .5;});
			}
		}
	});

	Array.toArray = function(arg) { return Array.isArray(arg) ? arg : [arg] };

	Object.defineProperties(String.prototype, {
		startsWith: { 
			value: function(str) {
				return str == this.substr(0, str.length);
			}
		},

		endsWith: {
			value: function(str) {
				return str == this.substr(this.length - str.length);
			}
		},

		capitalize: {
			value: function() {
				return this[0].toUpperCase() + this.substr(1);
			}
		},

		eq: {
			value: function(str) {
				return this.toLowerCase() === (''+str).toLowerCase();
			}
		}
	});

	Object.defineProperties(Number.prototype, {
		toCommaString: {
			value: function() {
				var nstr = this.toString();

				var np = nstr.split('.');

				var na = np[0].split('');

				for (var i = na.length-3, gc = 0; i > 0; i-=3)
					na.splice(i, 0, ',');

				return na.join('') + (np.length > 1 ? '.' + np[1] : '');
			}
		}
	});

}
				

/*for (var i=0, l=obj.length; i<l; i++) {
if (func.call(self, obj[i], i) === false) break;
}*/

var string = {

	format: function(str) {
		//if (typeof str != 'string') throw new Error("Invalid string  " + typeof str);

		var args = Array.prototype.slice.call(arguments, 1);
		var argc = 0;
		return str.replace(/%(%|s|d|\d*)/g, function(match, sub, off) {
			if (sub == '%') return '%';
			
			return /^\d+$/.test(sub) && +sub < args.length ? args[+sub] : args[argc++];
		});
	},


	formatObject: function(str, obj) {

		if (!obj) return str;

		for (var i in obj) {
			str = str.replace(
				new RegExp('\\{'+i+'\\}', 'g'), 
				typeof obj[i] != 'undefined' && obj[i] != null ? obj[i] : ''
			);
		}

		return str;
	},

	formatExpression: function(str, scope, self) {

		scope = typeof scope != 'undefined' && scope !== null ? scope : {};
		self = self || str;

		str = str.replace(/\{([^}]*)\}/g, function(m, ex) {
			with(scope) {
				var res = eval(ex);
				return typeof res != 'undefined' ? res : '';
			}
		});

		return str;
	}

	/*splitFirstWord: function(str) {
		var match = /^\s*(\S+)\s+([^]*)/.exec(str);

		return match && match.length ? [match[1], match[2]] : [str];
	}*/

};

String.prototype.splitFirstWord = function() {
		var match = /^\s*(\S+)\s+([^]*)/.exec(this);

		return match ? [match[1], match[2]] : [this.toString()];
};
	

//Aliases
string.f = string.format;
string.fo = string.formatObject;
string.fe = string.formatExpression;

var stream = {
	
	echo: function(stream, str) {
		console.log('#'+str);
		stream.write(str+'\n');
	}

};

/*var script = (function() {
	var fs = require('fs');
	var readFile = fs.readFile,
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
			e.stack = std;
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

	return {
			runFileInThisContext: function(file, callback) {
				loadFile(file, function(source) {
					return Script.runInThisContext(source, file);
				}, callback);
			},

			runFileInContext: function(file, context, callback) {
				loadFile(file, function(source) {
					Script.runInContext(source, context, file);
				}, callback);
			},

			runFileInNewContext: function(file, context, callback) {
				loadFile(file, function(source) {
					Script.runInNewContext(source, context, file);
				}, callback);
			},

			runFileSyncInThisContext: function(file) {
				return loadFileSync(file, function(source) {
					Script.runInThisContext(source, file);
				});
			},

			runFileSyncInNewContext: function(file, context) {
				return loadFileSync(file, function(source) {
					Script.runInNewContext(source, context, file);
				});
			},

			runFileAsFunction: function(file, args, context, callback) {
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
			}
	};

}());*/

var log = {
	TIMESTAMP_MODE: 0, //0=no timestamp, 1=timestamp, 2=timestmap on change
	TIMESTAMP_FORMAT: '%H:%M:%S',

	last_timestamp: null,

	colors: {
	  reset: "\x1B[0m",

	  grey: "\x1B[2;0m",
	  red: "\x1B[0;31m",
	  green: "\x1B[0;32m",
	  yellow: "\x1B[0;33m",
	  blue: "\x1B[0;34m",
	  magenta: "\x1B[0;35m",
	  cyan: "\x1B[0;36m",
	  white: "\x1B[0;37m",

	  bold: {
		grey: "\x1B[1;30m",
		red: "\x1B[1;31m",
		green: "\x1B[1;32m",
		yellow: "\x1B[1;33m",
		blue: "\x1B[1;34m",
		magenta: "\x1B[1;35m",
		cyan: "\x1B[1;36m",
		white: "\x1B[1;37m",
	  }
	},

	getTimestamp: function() {
		switch(typeof share.TIMESTAMP_MODE == 'number' ? share.TIMESTAMP_MODE : log.TIMESTAMP_MODE) {
			case 0: return '';
			case 1: return date.toLocaleFormat(new Date, share.TIMESTAMP_FORMAT || log.TIMESTAMP_FORMAT);
			case 2: 
				var d = new Date;
				if (date.last_timestamp == null || d.toString() != date.last_timestamp.toString()) {
					date.last_timestamp = d;
					return date.toLocaleFormat(d, log.TIMESTAMP_FORMAT)+'\n';
				} else {
					return '';
				}
		}
	},

	IRCSpecialChars: function(str) {
		var co = 0;
		return (''+str).replace(/\cB|\cA/g, function(m) {
			return (co ^= 1) ? log.colors.bold.white : log.colors.reset;
		});
	},

	put: function(str, force) {
		if (!force && global.constants.SUPRESS_LOG) return;

		if (global.constants.USE_REPL) {
			//process.stdout.write('\r'+str+'\n');
			process.stdout.write('\n'+str);
			//global.repl.displayPrompt();
		} else {
			process.stdout.write(str+'\n');
		}
	},

	putIRC: function(str, force) {
		log.put(log.getTimestamp() + ' ' + log.IRCSpecialChars(str), force);
	},

	formatColor: function(str, obj, colors) {
		var cobj;
		if (colors instanceof Object) {
			cobj = {};
			obj.iterate(function(v,n) {
				if (n in colors && typeof v != 'undefined' && v != null) {
					cobj[n] = colors[n] + v;
				} else {
					cobj[n] = v;
				}
			});
		} else {
			cobj = obj;
		}

		log.putIRC(str.fo(cobj));
	},

	format: function() {
				//arguments[0] = log.getTimestamp()+arguments[0];
				var str = string.format.apply(null, arguments)

				log.putIRC(str);
	},

	Fformat: function(){ log.putIRC(string.format.apply(null,arguments), true) },

	formatObject: function(str, obj) {
		log.putIRC(str.fo(obj));
	},

	colora: function(color, args, force) {
		args[0] = args[0].split('\n').map(function(e) { return color + e + log.colors.reset; }).join('\n');
		//args[0] = color + args[0] + log.colors.reset;
        log[force?'Fformat':'format'].apply(null, args);
	},

	error: function() {
		log.colora(log.colors.red, arguments, true);
	},

	success: function() {
		log.colora(log.colors.green, arguments);
	},

	important: function() {
		log.colora(log.colors.bold.white, arguments);
	}, 

	question: function() {
		log.colora(log.colors.cyan, arguments);
	},

	colorWrap: function(str, color) {
		return color + str + log.colors.reset;
	},

	parseColor: function(colorstr) {
		var colors = {}, color = '';
		

		//Bold if first letter capitalized
		if (colorstr[0] == colorstr[0].toUpperCase()) {
			colors.meld(log.colors.bold);
			colors.reset = log.colors.reset;
		} else {
			log.colors.iterate(function(v,n) { 
				if (typeof v == 'string') colors[n] = v; 
			});
		}

		colorstr = colorstr.toLowerCase();
		var clen = colorstr.length;
		colors.iterate(function(v,n) {
			if (n.substr(0, clen) == colorstr) {
				color = v;
				return false; //Break
			}
		});

		return color;
	},

	colorize: function(str, color) {
		return log.parseColor(color) + str;
	},

	prs: function() {
		Array.prototype.forEach.call(arguments, function(e) { print_r(e) });
	},

	print_r: function (val, showHidden, maxdepth, prepend, extra, returnText, colorize) {
			
			maxdepth = typeof maxdepth == 'number' ? maxdepth : 3;

			var colors = {
				reset: "\x1B[0m",
				string: "",
				key: "\x1B[0;33m",
				brace: "\x1B[0;36m",
				number: "",
				'function': "\x1B[0;36m",
				undefnull: "\x1B[0;31m",
				boolean: "\x1B[0;31m",
				prepend: "\x1B[1;37m"
			}

			var colorize = typeof colorize != 'undefined' ? colorize : true;

			var co = function(type) {
				if (!colorize) return '';
				return colors[type || 'reset'];
			};

			var adjustIndent = function(str, ins) {
					return ins.replace(
						/\n/g, 
						'\n' + new Array(
									str.substr(lines.lastIndexOf('\n'))
										 .replace(/\x1B[^m]+m/g, '')
										 .length + 1
							   ).join(' ')
					);
			};

			var usedobjs = [];	

			var lines = '', depth = 0, depthstr = '    ',
				brace_arr = ['[', ']'], brace_obj = ['{', '}'];

			if (prepend) lines += co('prepend') + prepend + co() + ' = ';

			(function(v, d) {
				var tab = new Array(d).join(depthstr);

				var type = null;
				if (extra) {
					if (typeof v == 'undefined' || v === null) {
						type = ''+v;
					} else {
						if (v.constructor) {
							var construct_string = v.constructor.toString();
							var match = construct_string.match(/^function ([^(]*)/);

							type = match ? match[1] : construct_string;
						} else {
							type = typeof v;
						}

						if (type != 'Function') lines += type + (type == 'String' || type == 'Array' ? '(' + v.length + ') ' :  ' ');
					}
				}

				
				var keys;
				try {
					keys = showHidden ? Object.getOwnPropertyNames(v) : 
										Object.keys(v);

					if (!keys.length && typeof v == 'function') throw "nope";
				} catch(e) {
					keys = false;
				}

				if (typeof v == 'object') {
					if (usedobjs.some(function(e,n) { 
						return n < d && e.some(function(z) { return z == v });
					})) {
						lines += '[Circular]';
						return;
					} else {
						if (!usedobjs[d]) usedobjs[d] = [];

						usedobjs[d].push(v);
					}
				}
				
				if (d <= maxdepth && keys instanceof Array) {
					var braces = typeof v != 'function' && 'length' in v ? brace_arr : brace_obj;


					if (typeof v == 'function')
						lines += v.toString().match(/^function[^{]*/)[0].trimRight();

					lines += co('brace') + braces[0] + co();
					
					var keys = showHidden ? Object.getOwnPropertyNames(v) : Object.keys(v);
					for (var i=0, l=keys.length; i<l; i++) {
						with ({kv: v[keys[i]], k: keys[i]}) {
							lines += '\n' + tab+depthstr + co('key') +
									 (/^[A-Za-z0-9$_]+$/.test(k) ? k : "'"+k+"'") +
									 co() + ": ";

							arguments.callee(kv, d+1);
						}

						lines += (i<l-1 ? ',' : '');
					}

					lines += (i ? '\n' + tab : '') + co('brace') + braces[1] + co();

				} else if (typeof v == 'object' && v !== null) {
					lines += '[object ' + (v instanceof Array ? 'Array' : 'Object') + ']';
				} else if (typeof v == 'function') {
					
					if (v.constructor.toString().match(/^function RegExp/)) lines += v.toString();
					else lines += v.toString().match(/^function[^{]*/)[0].trimRight() + '{}';
					//lines += '[Function]';

					//lines += adjustIndent(lines, v.toString()).replace(/(^function)/, co('function')+'$1'+co());

				} else if (typeof v == 'string') {
					var quote = co('string') + '"' + co();
					lines += quote + v.replace(
						/\n/g, 
						'\n' + new Array(
									lines.substr(lines.lastIndexOf('\n'))
										 .replace(/\x1B[^m]+m/g, '')
										 .length + 1
							   ).join(' ')
					) + quote;
				} else if (typeof v == 'number') {
					lines += co('number') + v + co();
				} else if (typeof v == 'undefined') {
					lines += co('undefnull')+v+co();;
				} else if (v == null) {
					lines += co('undefnull')+v+co();;
				} else if (typeof v == 'boolean') {
					lines += co('boolean') + v + co();
				}
			})(val, 1);

			if (returnText) return lines;

			process.stdout.write(lines + '\n');
		}
			
};


var date = (function() {

	var daynames = [
		'Sunday',
		'Monday',
		'Tuesday',
		'Wednesday',
		'Thursday',
		'Friday',
		'Saturday'
	];

	var monthnames = [
		'Janurary',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	];

	var abbrv = function(name) {
		return name.substr(0, 3);
	};

	var padd = function(num, len, fill) {
		len = len || 2;
		fill = fill || '0';

		num = (~~(num)).toString();

		var plen = len - num.length;
		if (plen <= 0) return num;

		return new Array(plen+1).join(fill) + num;
	};

	var zero = function(num, len) { return padd(num, len); };
	var space = function(num, len) { return padd(num, len, ' '); };
	var unsupported = function(c) {
		console.error("Date character '"+c+"' is not supported");
		return '%'+c;
	};

	return {
	toLocaleFormat: function(timestamp, format) {
		timestamp = timestamp instanceof Date ? timestamp : new Date(+timestamp);

		if (isNaN(timestamp.valueOf())) throw "Invalid datetime";

		var reg = /%([A-Za-z%])/g;

		var dn = daynames, mn = monthnames, ab = abbrv, ze = zero, sp = space;

		var callee = arguments.callee;

		var output = format.replace(reg, function(m,c) {
			with (timestamp) {
				switch(c) {
					case 'a': return ab(dn[getDay()]);
					case 'A': return dn[getDay()];
					case 'h': 
					case 'b': return ab(mn[getMonth()]);
					case 'B': return mn[getMonth()];
					case 'c': return toLocaleString();
					case 'C': return ze(getFullYear() / 100);
					case 'd': return ze(getDate());
					case 'D': return callee(timestamp, '%m/%d/%y');
					case 'e': return sp(getDate());
					case 'H': return ze(getHours());
					case 'I': var h = getHours; return ze(h==0 ? 12 : h<=12 ? h : h-12);
					case 'm': return ze(getMonth()+1);
					case 'M': return ze(getMinutes());
					case 'n': return '\n';
					case 'p': return getHours() < 12 ? 'am' : 'pm';
					case 'r': return callee(timestmap, '%I:%M:%S %p');
					case 'R': return callee(timestamp, '%H:%M');
					case 'S': return ze(getSeconds());
					case 't': return '\t';
					case 'T': return callee(timestamp, '%H:%M:%S');
					case 'u': var d=getDay(); return d==0 ? 7 : d;
					case 'w': return getDay();
					case 'x': return toLocaleDateString();
					case 'X': return toLocaleTimeString();
					case 'y': return ze(getFullYear().toString().substr(2));
					case 'Y': return getFullYear();
					case 'Z': return getTimezoneOffset();
					case '%': return '%'
					case 'j':
					case 'U':
					case 'V':
					case 'W':
						return unsupported(c);
				}
			}
		});

		return output;
	}
	};
}());

date.format = date.toLocaleFormat;

Date.prototype.toLocaleFormat = function(format) {
	return date.toLocaleFormat(this, format);
};

Date.prototype.format = Date.prototype.toLocaleFormat;

/*JSON._stringify = JSON.stringify;
JSON.stringify = function() {
	if (typeof arguments[0].toJSON == 'function') {
		arguments[0] = arguments[0].toJSON();
	}


	return this._stringify.apply(this, arguments);
};*/

exports.object = object;
exports.string = string;
exports.array = array;
exports.date = date;
exports.log = log;
exports.func = func;
//exports.script = script;
exports.stream = stream;

exports.extend = function(params) {
	if (!(params instanceof Object)) return false;

	object.iterate(params, function(parent, type) {
		if (!(type in exports)) throw "Object '"+type+"' not exported"
		if ('prototype' in parent && exports[type] instanceof Object) {
			object.iterate(exports[type], function(method, name) {
				var desc = Object.getOwnPropertyDescriptor(exports[type], name);
				desc.enumerable = false;

				if ('value' in desc && method instanceof Function) {
					desc.value = function() {
						Array.prototype.unshift.call(arguments, this);
						return method.apply(this, arguments);
					}
				}

				Object.defineProperty(parent.prototype, name, desc);

				/*Object.defineProperty(parent.prototype, name, { 
					writable: true,
					configurable: true,
					enumerable: false,
					value: function() {
						Array.prototype.unshift.call(arguments, this);
						return method.apply(this, arguments);
					}
				});*/
			});
		}
	});
	return exports;
}

exports.place = function(params) {
	if (!(params instanceof Object)) return false;

	object.iterate(params, function(parent, type) {
		if (parent instanceof Object && type in exports && exports[type] instanceof Object) {
			object.iterate(exports[type], function(method, name) {
				parent[name] = method;
			});
		}
	});
	return exports;
};

exports.extendAll = function() {
	exports.extend({	
		object: Object,
		array: Array,
		string: String,
		func: Function
	});

	extendProto();

	return exports;
};

				
			
		
