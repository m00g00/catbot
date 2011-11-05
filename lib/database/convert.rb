require 'sqlite3'
#require 'mongo'

$db = SQLite3::Database.new('./log.db')
$nb = SQLite3::Database.new('./newlog.db')

$db.results_as_hash = true

$quitchans = { 'freenode' => [ '##javascript', '#node.js' ], 'whatnet' => [ '#hobbes' ], 'irchighway' => [ '#trollkingdom' ], 'choopa' => [ '#roms-isos' ] }
$stmts = {}

def addline(server, channel, type, host, nick, timestamp, ownself, text)
	colname = (server + '::' + channel).downcase

	if !stmts.key? colname then
		$stmts[colname] = createChan(colname)
	end

	stmt = $stmts[colname]

	stmt.execute( 'timestamp' => timestamp, 'nick' => nick, 'text' => text, 'type' => type, 'host' => host, 'self' => ownself )
end

def createChan(name)
	$nb.execute("CREATE VIRTUAL TABLE \"#{name}\" USING fts4(timestamp, nick, text, type, host, self)");

	$nb.prepare("INSERT INTO \"#{name}\" (timestamp, nick, text, type, host, self) VALUES (:timestamp, :nick, :text, :type, :host, :self)")
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
			'calvin'
	end
	
	next if sid == nil

	next if row['channel'] == nil || row['channel'][0] != '#'

	if 

	if (row['type'] == 'QUIT' || row['type'] == 'NICK') && $quitchans.key?(sid) then
		$quitchans[sid].each do |chan|
			addline(row['server'], chan, row['type'], row['host'], row['nick'], row['timestamp'], row['self'], row['content'])
		end
	else
		addline(row['server'], row['channel'], row['type'], row['host'], row['nick'], row['timestamp'], row['self'], row['content'])
	end

	#puts "#{row['rowid']}: #{row['channel']}"
			
end
