var db = global.db, crypt = require('crypto');
	conds = ['type', 'name', 'server', 'channel', 'key'];

function uid() {
	var hash = crypt.createHash('md5');
	hash.update([Math.random().toString(16).slice(2), +new Date].concat(Array.prototype.slice.call(arguments), Math.random().toString(16).slice(2)).join(':'));
	return hash.digest('hex');
}

function makeConds(params) {
	  return conds.filter(function(k) { return k in params })
			 	  .map(function(k) { return k + (params[k] === null ? ' IS NULL' : ' = $' + k) })
			 	  .join(' AND ');
}

function makeValues(params) {
	return params.filter(function(v) { return v !== null }).kmap(function(v, k) { return ['$' + k, JSON.stringify(v)] });
}

function updateMeta(obj, callback) {

	var p = obj.__proto__;
	obj.forEach(function(v, k) {
		if (Array.isArray(v)) v.forEach(function(e, i) {
			if (p[k] && p[k][i]) {
				if (e != p[k][i].val) {
					p[k][i].val = e;
					setIdObj(p[k][i]);
				}
			} else {
				if (!Array.isArray(p[k])) p[k] = [];

				p[k][i] = { val: e };
				var par = p.__proto__.clone();
				par.key = k;
				p[k][i].id = insertMeta(par, e);
			}

		});
		else if (typeof p[k] != 'undefined' && v != p[k].val) {
			p[k].val = v;
			setIdObj(p[k]);
		} else {
			p[k] = { val: v };
			var par = p.__proto__.clone();
			par.key = k;
			p[k].id = insertMeta(par, v);
		}
	});
}

function setIdObj(obj, callback) {
	setId(obj.id, obj.val, callback);
}

function setId(id, value, callback) {
	var sql = "UPDATE meta SET value = ? WHERE rowid = ?";
	db.run(sql, [value, id], callback);
}


function getMeta(params, callback) {
	//conds.forEach(function(k) { if (k != 'key' && !(k in params)) params[k] = null });
	var sql = "SELECT rowid, type, name, server, channel, key, value, timestamp FROM meta WHERE " + makeConds(params);
	console.log(sql);
	console.log(makeValues(params));

	db.query(sql, makeValues(params), function(res) {
		var data = Object.create(params), fdata = Object.create(data);
		if (res) res.forEach(function(e) {
			var tval = JSON.parse(e.value);
			var value = { id: e.rowid, val: tval };
			if (e.key in data) {
				if (!Array.isArray(data[e.key])) {
					data[e.key] = [data[e.key]];
					fdata[e.key] = [fdata[e.key]];
				}

				data[e.key].push(value);
				fdata[e.key].push(tval);
			} else {
				data[e.key] = value;
				fdata[e.key] = tval;
			}
		});

		callback(fdata);
	});
}

function insertMeta(params, value, callback) {
	params.value = value;
	params.id = uid.apply(null, Object.keys(params).map(function(k) { return params[k] }));
	var fields = ['id'].concat(Object.keys(params));
	db.run("INSERT INTO meta (" + fields.join(', ') + ") VALUES (" + fields.map(function(k) { return '$' + k }).join(', ') + ")",
		   makeValues(params),
		   callback);
	return params.id;
}

function setMeta(params, value, callback) {
	var sql = "UPDATE meta SET value = $value WHERE " + makeConds(params), values;

	params.value = value;
	values = makeValues(params);

	db.run(sql, values, function(res) {
		db.get('SELECT changes() c', function(row) {
			if (!row.c) {
				db.run("INSERT INTO meta (" + Object.keys(params).join(', ') + ") VALUES (" + Object.keys(params).map(function(k) { return '$' + k }).join(', '),
					   values,
					   callback
				);
			} else {
				if (typeof callback == 'function') callback(null);
			}
		});
	});
}

exports.get = getMeta;
exports.set = setMeta;
exports.update = updateMeta;
