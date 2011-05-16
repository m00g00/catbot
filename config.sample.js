var config = {
	id: 'hobbes',
	server: 'irc.whatnet.org',
	port: 6667,
	nick: 'Hobbes',
	alt_nicks: ['HobbesBlob', 'Blob'],
	user: 'catbot',
	mode: 4,
	name: 'Hobbes',
	channels: '#hobbes',
	quit_msg: 'meow',

	database: {
		type: 'sqlite_grumdrig',
		file: './lib/database/log.db'
	},

	modules: [
		'raw',
		'db',
		'insult',
		'webscrape',
		'random',
		'log'
	]
};
