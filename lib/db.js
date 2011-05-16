var log = require('../helper').log;
var DB = {

	implements: function(engine, abstract) {
		var funcsig = function(func) {
			return func.toString().match(/^function\s+\([^)]*\)\s*\{/)[0] + '}';
		};

		abstract.forEach(function(v,n) {
			
			if (!engine.hasOwnProperty(n)) 
				throw "% does not implement % `%`".f(engine.name || 'Unknown', typeof v, n);
				
			var fs = [];
			if (typeof v == 'function' && 
			    (typeof engine[n] != 'function' || (fs = [funcsig(v), funcsig(engine[n])] && fs[0] != fs[1]))) 
			    	throw "Incorrect implementation of function %: expected %, got %".f(n, fs[0], fs[1]);

		});

		return true;
	},

	common: {
		filler: 'hai!',
		onconnect: function() {
			log.success('Database connected');
		},
		onerror: function() {
			log.error('DB Error');
			log.print_r(arguments);
		}
	},

	abstract: {

		db: null,
	
		connect: function(params, callback, errback) {
			var host, port, user, pass, dbname;
		},

		//usedb: function(name, callback, errback) {},

		query: function(sql) {}

	},

	engines: {
		sqlite_grumdrig: {
			db: null,

			connect: function(params, callback, errback) {
				var sqlite = require('./database/sqlite_grumdrig/sqlite');
				this.db = sqlite.openDatabaseSync(params.file);

				(callback || this.onconnect)();
			},

			query: function(sql) {
				this.db.query.apply(this.db, arguments);
			},

			transaction: function(callback, errback, successback) {
				this.db.transaction(callback,errback,successback);
			}
		},
				
		mysql_sidorares: {
			
			db: null,

			connect: function(params, callback, errback) {
				
				var mysql = require('./database/mysql_sidorares/mysql/client');

				this.db = mysql.createTCPClient(params.host || 'localhost', params.port || '3306')
				this.db.auto_prepare = true;

				var thiz = this;

				this.db.auth(params.dbname, params.user, params.pass)
			    .addListener('authorized', function(status) {
					thiz.onconnect();
					if (typeof callback == 'function') callback(status);
			    })
				.addListener('error', errback || this.onerror);
			},

			query: function(sql, callback, errback) {
				
				var result = [];
				this.db.query(sql).addListener('row', function(row) {
					console.log("ROW");
					result.push(row);
				}).addListener('end', function() {
					log.print_r(arguments);

					if (typeof callback == 'function') {
						callback(result);
					}
				}).addListener('error', this.onerror);
			}
					
		},
					
		mysql_masuidrive: {

			db: null,
		
			connect: function(params, callback, errback) {

				var mysql = require('./database/mysql_masuidrive/mysql');

				this.db = new mysql.
					Connection(params.host, 
							   params.user, 
							   params.pass, 
							   params.dbname, 
							   params.port || 3306
				);

				this.db.connect(callback, errback);
			},

			//usedb: function(name, callback) {},

			query: function(sql, callback, errback) {

				this.db.query(sql, callback, errback);
			
			}
		}
	}

}

exports.use = function(type) {

		if (!type) throw "Expected `type`";

		if (!(type in DB.engines)) throw "Uknown type";

		if (DB.implements(DB.engines[type], DB.abstract)) {
			
			var newDB = ({}).inherits(
				DB.engines[type].inherits(
					DB.common
				)
			);

			return newDB;
		}

		return false;
};



/*var SQLBuilder = {
	keywords: 
		['SELECT', 'UPDATE', 'INSERT', 'DELETE', 'DROP', 'ALTER',
		 'FROM', 'JOIN', 'WHERE', 'AND', 'OR', 'IN', 'GROUP BY', 
		 'ORDER BY', 'DESC', 'ASC', 'LIMIT']
}

function Query() {

	SQLBuilder.keywords.forEach(function(word) {
		word = word.toUpperCase().replace(/ /g, '_');
		this[word] = word;
	}, this);

	var qobj = {};
	this.sections.forEach(function(sec) {
		
		sec = sec.toLowerCase();
		qobj[sec] = [];

		this.__defineGetter__(sec, function() { return qobj[sec]; });
		this.__defineSetter__(sec, function(v) { qobj[sec] =
		qobj[sec].concat(v); });
	}, this);
}

function Select() {
	this.sections = ['select', 'from', 'where', 'group', 'order', 'limit'];

	Query.call(this);
}

exports.Select = Select;*/
