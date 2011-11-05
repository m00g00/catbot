var sqlite3 = require('sqlite3').verbose(), db = new sqlite('log.cache.db');

require('../../helper').extend({ string: String });

db.serialize();

var sql = ['BEGIN TRANSACTION'];

db.run('ATTACH DATABASE "log.db" AS log')
  .all('SELECT channel, server FROM loginfo WHERE substr(channel, 1, 1) = "#" GROUP BY channel HAVING count(*) > 1000',
  	   function(err, res) {
		   var tblname = '`' + res.server + '_' + res.channel + '`';
		   sql.push("DROP TABLE IF EXISTS {tbl}",
		   			"CREATE VIRTUAL TABLE {tbl} USING fts3(nick, content)"
					"INSERT INTO {tbl} (docid, nick, content) " +
					"SELECT loginfo.rowid, nick, content FROM loginfo, logtext " +
					"WHERE channel = '{channel}' AND server = '{server}
		   );
		   


	   }
  )
