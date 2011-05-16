require 'sqlite3'

db = SQLite3::Database.new('./lib/database/log.db')

#mod.back('UHNUHNUHN', ->jebus { 
#	insult = db.get_first_row("select insult from insults order by random() limit 1")
#	console.log(insult)

#})

mod.on('!quote', lambda {|message|
	console.log("from: #{message['from']}, qcmd: #{message['qcmd']}, qarg: #{message['qarg']}") 
})
