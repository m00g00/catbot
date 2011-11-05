require 'sqlite3'
require 'mongo'

$db = SQLite3::Database.new('./log.db')
$mb = Mongo::Connection.new.db('log')

$db.results_as_hash = true

$quitchans = { 'freenode' => [ '##javascript', '#node.js' ], 'whatnet' => [ '#hobbes' ], 'irchighway' => [ '#trollkingdom' ], 'choopa' => [ '#roms-isos' ] }
$autoinc = {}

def addline(server, channel, type, host, nick, timestamp, ownself, text)
	colname = (server + '::' + channel).downcase

	col = $mb[colname]

	$autoinc[colname] = 0 if !$autoinc.key? colname

	$autoinc[colname] += 1

	doc = { '_id' => $autoinc[colname], 'type' => type, 'host' => host, 'nick' => nick, 'timestamp' => timestamp, 'self' => ownself, 'text' => text }

	col.insert(doc)
end

$db.execute("SELECT loginfo.rowid rowid, type, host, server, channel, nick, timestamp, self, content FROM loginfo JOIN logtext ON loginfo.rowid = logtext.docid ORDER BY loginfo.rowid ASC") do |row|
	next if row['server'] == nil

	sid = case row['server'].downcase
		when 'whatnet'
			'hobbes' 
		when 'irchighway'
			'susie'
		when 'choopa'
			'moe'
		when 'freenode'
			'freenode'
	end
	
	next if sid == nil

	next if row['channel'] == nil || row['channel'][0] != '#'

	if (row['type'] == 'QUIT' || row['type'] == 'NICK') && $quitchans.key?(sid) then
		$quitchans[sid].each do |chan|
			addline(row['server'], chan, row['type'], row['host'], row['nick'], row['timestamp'], row['self'], row['content'])
		end
	else
		addline(row['server'], row['channel'], row['type'], row['host'], row['nick'], row['timestamp'], row['self'], row['content'])
	end

	puts "#{row['rowid']}: #{row['channel']}"
			
end
