require 'sqlite3'
require 'iconv'
#require 'mongo'

$db = SQLite3::Database.new('./log.db')
#$nb = SQLite3::Database.new('./newlog.db')

$db.results_as_hash = true

$quitchans = { 'freenode' => [ '##javascript', '#node.js' ], 'whatnet' => [ '#hobbes' ], 'irchighway' => [ '#trollkingdom' ], 'choopa' => [ '#roms-isos' ] }
$cols = [ 'timestamp', 'nick', 'text', 'type', 'host', 'self' ]
$stmts = {}
$chans = {}

=begin
def addline(row)
	colname = (row['server'] + '::' + row['channel']).downcase

	if !$chanlines.key? colname then
		$chanlines[colname] = []
	end

	$chanlines[colname].push row
end
=end

def escape3(str) 
	begin
		ic = Iconv.new('UTF-8//IGNORE', 'UTF-8')
		ret = ic.iconv(str.to_s + ' ')[0..-2].gsub(/'/, "''").gsub(/\n/, '').gsub("\0", '')
	rescue
		ret = nil
	end

	ret
end

=begin
def addline(server, channel, type, host, nick, timestamp, ownself, text)
	colname = (server + '::' + channel).downcase

	if !$stmts.key? colname then
		$stmts[colname] = createChan(colname)
	end

	stmt = $stmts[colname]

	stmt.execute( 'timestamp' => timestamp, 'nick' => nick, 'text' => text, 'type' => type, 'host' => host, 'self' => ownself )
end

def createChan(name)
	$nb.execute("CREATE VIRTUAL TABLE \"#{name}\" USING fts4(timestamp, nick, text, type, host, self)");

	$nb.prepare("INSERT INTO \"#{name}\" (timestamp, nick, text, type, host, self) VALUES (:timestamp, :nick, :text, :type, :host, :self)")
end
=end

$db.execute("SELECT server, channel FROM loginfo GROUP BY server, channel HAVING SUBSTR(channel, 1, 1) = '#' AND count(channel) > 2000") do |row|
#$db.execute("SELECT loginfo.rowid rowid, type, host, server, channel, nick, timestamp, self, content FROM loginfo JOIN logtext ON loginfo.rowid = logtext.docid ORDER BY loginfo.rowid ASC") do |row|
	#next if row['server'] == nil

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
	
	#next if sid == nil

	#next if row['channel'] == nil || row['channel'][0] != '#'

	$chans[sid + '::' + row['channel']] = row

=begin
	if (row['type'] == 'QUIT' || row['type'] == 'NICK') && $quitchans.key?(sid) then
		$quitchans[sid].each do |chan|
			addline(row)
		end
	else
		addline(row)
	end
=end

	#puts "#{row['rowid']}: #{row['channel']}"
			
end

$stmt = $db.prepare("SELECT type, host, nick, timestamp, self, content text FROM loginfo JOIN logtext ON loginfo.rowid = logtext.docid WHERE (server = ? AND channel = ?) OR ((type = 'QUIT' OR type = 'NICK') AND server = ?) ORDER BY loginfo.rowid ASC")

$chans.each do |key, val|
	puts "CREATE VIRTUAL TABLE \"#{key}\" USING fts4(timestamp, nick, text, type, host, self);"
	#$stdout.print "INSERT INTO \"#{key}\""

	$stmt.execute(val['server'], val['channel'], val['server']) do |res|
		
		count = 0
		res.each { |row|

			vfields = $cols.map { |col|
					 vsql = escape3(row[col])

					 vsql == nil ? vsql : "'" + vsql + (count % 400 == 0 ? "' AS '" + col + "'" : "'")
			}.compact

			if vfields.length == $cols.length then
				if count % 400 == 0 
					$stdout.print ";\n\nINSERT INTO \"#{key}\" SELECT "
				else
					$stdout.print " UNION SELECT "
				end
				count += 1
				$stdout.print(vfields.join(', '))
			end
			
		}
	end

	puts ';'

end
		

