var log = require('./lib/loggen'),
	ts = '[{timestamp}] ',
	args = process.argv.slice(2),
	dateformat = '%Y-%m-%d';

log.get({ channel: args[1][0] == '#' ? args[1] : '#' + args[1],
		  server: args[0],
		  from: new Date(args[2]).format(dateformat),
		  to: new Date(args[3]).format(dateformat) })
   .format(/*{ PRIVMSG: ts + '<{nick}> {text}', JOIN: ts + '* {nick} has joined {channel}',
             PART: ts + '* {nick} has left {channel}', QUIT: ts + '* {nick} has quit ({text})',
			 NICK: ts + '* {nick} is now known as {text}', DEFAULT: ts + '* {type} {text}' }*/)
   .timestamp('%T')
   .each(function(lines) {
     console.log(lines);
   });
