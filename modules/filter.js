var evdefault = com.eventFilter;

com.eventFilter = function(event) {
	return event[0] == '!' || event[0] == '.' ? 
            evdefault(event).replace('!', '.') : evdefault(event);
}
