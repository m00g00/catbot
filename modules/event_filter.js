if (!mod.irc.conf.filter || !Array.isArray(mod.irc.conf.filter))
	throw "Filter list not available or invalid";


mod.on('EVENT_REGISTERED', function(event, listener, parent) {
	var eventFilter = com.eventFilter;
	mod.irc.conf.filter.forEach(function(i) {
		var channels = i.channels;
		if (i.blacklist && Array.isArray(i.blacklist))
			i.blacklist.forEach(function(bi) {
				if ((Array.isArray(bi) && 
					bi[0] == parent.name && 
					(bi.length == 1 || eventFilter(bi[1]) == event &&
					(bi.length == 2 || (bi.length == 3 && bi[2] == listener.name)))) ||

					(typeof bi == 'string' && eventFilter(bi) == event) ) {

					var override;
					if (typeof i.override == 'function') 
						override = i.override(event, listener, parent);
					else override = function() {
					var curchan;
					if (arguments[0] && 
							typeof arguments[0].channel == 'string' && (curchan = arguments[0].channel) &&
							channels.some(function(c) { return c.toLowerCase() == curchan.toLowerCase() })) {

							//console.log("FUNCTION BLOCKED");
							//console.log(event);
							return;
						} else {
							listener.apply(parent, arguments);
						}
					};


					if (typeof parent._events[event] == 'function') 
						parent._events[event] = override 					
					else if (Array.isArray(parent._events[event]))
						for (var j=0, len=parent._events[event].length; j<len; j++) 
							if (parent._events[event][j] == listener)
								parent._events[event][j] = override;


				}
			});
	});
});
