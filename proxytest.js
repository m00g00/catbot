var fs = require('fs'), 
	Proxy = require('node-proxy'),
	makeProxy = function(obj, set) {
		return Proxy.create({
			getOwnPropertyDescriptor: function(name) {
				var desc = Object.getOwnPropertyDescriptor(obj, name);
				if (typeof desc != 'undefined') desc.configurable = true;
				return desc;
			},

			getOwnPropertyNames: function() {
				return Object.getOwnPropertyNames(obj);
			},

			getPropertyNames: function() {
				var names = [], k;
				for (k in obj) names.push(k);
				return names;
			},

			defineProperty: function(name, desc) {
				Object.defineProperty(obj, name, desc);
			},

			delete: function(name) {
				return delete obj[name];
			},

			has: function(name) {
				return name in obj;
			},

			hasOwn: function(name) {
				return obj.hasOwnProperty(name);
			},

			get: function(rec, name) {
				if (!(name in obj)) {
					obj[name] = {};
					return makeProxy({}

				if (typeof obj[name] == 'object' && obj[name] !== null) return makeProxy(obj[name], set);
				else return obj[name];
			},

			set: function(rec, name, val) {
				obj[name] = val; 
				set();
				return true;
			},

			enumerate: function() {
				return Object.keys(obj);
			},

			keys: function() {
				return Object.keys(obj);
			}
		});
	};

function get(file) {
	var obj;
	try {
		obj = JSON.parse(fs.readFileSync(file, 'utf8'));
	} catch(e) {
		obj = {};
	}

	return makeProxy(obj, function() {
		fs.writeFile(file, JSON.stringify(obj));
	});
};

exports.get = get;

var data = use('jsdatathing.js');

data.dude.a.b.c = 'hai';
data.dude.a.omg = 'uh';

data['whatnet']['#hobbes']['MooGoo']['beers']++;




/*var o = { a: 1, b: 2, c: 3 };
var obj = makeProxy(o);

obj.dude.a.b.c = 'hai';
obj.dude.a.omg = 'uh';
console.log(JSON.stringify(o));
console.log(Object.keys(obj));*/

