var evdefault = com.eventFilter;

com.eventFilter = function(event) {
	return evdefault(event).replace('!', '.');
}
