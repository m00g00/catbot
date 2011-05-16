function ready(func) {
	var span = document.createElement('span');
	var ms = 0;
	var tid = setTimeout(function() {
		try {
			document.body.appendChild(span);

			document.body.removeChild(span)

			//console.log("READY");
			func();
		} catch(e) {
			//console.log("NOT READY");
			setTimeout(arguments.callee, ms);
		}
	}, ms);
}

function $(id) { return document.getElementById(id); }

function on(element, event, callback) {
	if (element.addEventListener) {

		element.addEventListener(event, callback, false);

	} else if (element.attachEvent) {

		element.attachEvent('on'+event, function() {
			callback.apply(element, arguments);
		});

	} else {
		if (!element.__events) element.__events = {};

		if (!element.__events[event]) {
			var e = element.__events[event] = [];

			element['on'+event] = function() {
				for (var i=0, l=e.length; i<l; i++) {
					e[i].apply(element, arguments);
				}
			};
		}

		element.__events[event].push(callback);
	}
}


ready(function() {

	var chat = $('chat'), lines = $('lines');

	function toBottom() {
		chat.scrollTop = chat.scrollHeight;
	}

	toBottom();

	on(window, 'resize', function(e) {
		//toBottom();
	});

	openConnection();

});
var conn;
function openConnection() {
	console.log('hai');
	conn = new WebSocket("ws://bigmooworld.com:4829");

	conn.onopen = function() {
		console.log('connected');
	}

	conn.onerror = function(err) {
		console.log('error');
		console.log(err.toString(), err);
	}

	conn.onclose = function(evt) {
		console.log('close');
		console.log(evt.toString(), evt);
	}

	conn.onmessage = function(evt) {
		console.log('message');
		console.log(evt.data);
	}
}
