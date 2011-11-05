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
					case 'I': var h = getHours(); return ze(h==0 ? 12 : h<=12 ? h : h-12);
					case 'm': return ze(getMonth()+1);
					case 'M': return ze(getMinutes());
					case 'n': return '\n';
					case 'p': return getHours() < 12 ? 'am' : 'pm';
					case 'r': return callee(timestamp, '%I:%M:%S %p');
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

//date.format = date.toLocaleFormat;

Date.prototype.toLocaleFormat = function(format) {
	return date.toLocaleFormat(this, format);
};

Date.prototype.format = Date.prototype.toLocaleFormat;
