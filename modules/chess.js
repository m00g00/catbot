var ch = require('./modules/chess/chess.js'),
	fs = require('fs'), stache, connect;

//if (!global.share.chess){
	

/*var allgames = global.share.chess || (global.share.chess = {}),
    sname = mod.irc.getServerName(),
    games = allgames[sname] || (allgames[sname] = {}),*/

var games = global.share.chess || (global.share.chess = {}),
    
    HTTP_SERVER = { port: 4800, link: 'http://catbot.bigmooworld.com/chess/{name}', html_template: 'modules/chess/index.html' },
    SVG = { template: 'modules/chess/game.svg.stache' },
    DCC_SERVER = { port: 4900, ip: 	1122249322 },
	SAVED_GAMES = 'modules/chess/saved.js',
	FORCE_UTF8 = true,
    trans = {
        utf8: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔',
                P: '♟', N: '♞', B: '♝', R: '♜', Q: '♛', K: '♚' }
    },

	saved = JSON.parse(fs.readFileSync(SAVED_GAMES));

if (!Object.keys(global.share.chess).length) {
		saved.forEach(function(go,n){
			//dump(go.setup);
			//var co = go.setup ? new ch.Chess(go.setup) : new ch.Chess();
			//dump(co.validate_fen(go.setup));
			//dump(co.load_pgn(go.pgn,{newline_char: ':'}))

			var co = new ch.Chess();
			co.unserialize(go.data)
			co.meld({ 
				id: n, 
			  	starttime: go.starttime,
			  	opts:{ starttime:go.starttime, id:n },
			  	msg:{ respond: function(str){ com.privmsg(go.chan, str) }, 
					  channel: go.chan }});

			games[n] = co;

		});
}


var savesaved=function(){return fs.writeFile(SAVED_GAMES, JSON.stringify(saved))};



if (SVG) SVG.source = fs.readFileSync(SVG.template, 'utf8');
if (HTTP_SERVER) 
	HTTP_SERVER.html = fs.readFileSync(HTTP_SERVER.html_template, 'utf8'),
	stache = require('./modules/chess/mustache.js'),
	connect = require('connect'); 

games.each(function(g,n) {
    play(g, g.msg, g.opts);
});

function getcid(msg){ return msg.query.args[0] || msg.channel || msg.from }


mod.on('.newgame', function(msg) {
	var cid = getcid(msg), cidn = cid, n=0;

	while (games[cidn]) cidn = cid + ':' + ++n;

	cid = cidn;
	

	games[cid]=new ch.Chess();
	play(games[cid],msg,{id:cid,starttime:+new Date})

	games[cid].details();
});



mod.on('.list', function(msg){
	games.forEach(function(g,cid){
		msg.respond(cid + ' > ' + new Date(g.starttime).format('%m/%d/%Y %H:%M:%S'));
	})
});

function rename(oldid, newid) {
	
	games[newid] = games[oldid];

	games[oldid].off();
	delete games[oldid];

	games[newid].id = newid;

	saved[newid] = saved[oldid];
	delete saved[oldid];
	saved[newid].id = newid;
	savesaved();
}

mod.on('.rename', function(msg){
	rename(msg.query.args[0], msg.query.args[1]);
	msg.respond('renamed');
});



/*mod.on('.game', function(msg) {
        
	var cid = msg.query.args[0] || msg.channel || msg.from;

	var game = games[cid];

	if (!game) {
		game = games[cid] = new ch.Chess();
		play(game, msg, {id: cid, starttime: +new Date});
	}

	game.details();

    switch(msg.query.args[0]) {
        case "end":
            if (game) {
                game.end();
                resp = "Game ended";
            }
            break;
        case "start":
        default:
            if (game) resp = "Game already in progress"; 
            else {
                game = games[newid] = new ch.Chess();
                var options = {};
                msg.query.args.slice(1).each(function(a) { options[a] = true });
                play(game, msg, options);
                game.print();
            }
            break;
    }

    
});*/

if (HTTP_SERVER) !function() {

	var cserv = global.share.chess_server
	if (!cserv) {
		cserv = global.share.chess_server = connect(/*connect.logger('dev'),*/ connect.static('modules/chess')); 

		cserv.defStack = cserv.stack.length;

		cserv.listen(HTTP_SERVER.port);
	}

	if (cserv.stack.length > cserv.defStack) cserv.stack.length=cserv.defStack;


	cserv.use('/chess', function(req, res){
		var options = { output: 'index',
						orient: 'w',
						game: null }

	
	
		req.url.toLowerCase().split('/').reverse().filter(function(t){ return t != '' })
		   .forEach(function(t){ 
			   
			({ output: [ 'index', 'svg', 'pgn', 'wait' ],
			   orient: [ 'b', 'w' ],
			   game: Object.keys(games).map(function(e){ return e.replace(/#/g, '') }) })


		     .forEach(function(o,n){ if (o.indexOf(t) != -1) options[n] = t }) })
								
		//dump(options)

		var game = games['#'+options.game] || games[options.game] || games['@'+options.game]

		if (!game){ res.end("No such game"); return }

		({ wait: function(req, res, next) {
		       game.onturn.push(function() { res.end() }) },

		   svg: function(req, res, next) {
			   var body = svg(game, options.orient == 'b');

			   res.setHeader('Content-Type', 'image/svg+xml');

			   res.end(body); },

		   pgn: function(req, res, next) {
			   res.setHeader("Content-Type", "text/plain")
			   res.end(game.pgn) },

		   index: function(req, res, next) {
			var body = stache.to_html(HTTP_SERVER.html, {
				title: 'chess >> ' + game.id,
				pgnn: game.pgn().replace(/\n/g, "\\n"),
				pgn: game.pgn(),
				history: game.movesstr(),
				name: options.game,
				orientation: options.orient,
				rotated: options.orient == 'w' ? 'b' : 'w'
			});

		    res.end(body); }})[options.output](req, res) 
		
		
		})


	cserv.use('/', function(rq, rs){ rs.end(mod.irc.modules.random.exports.peen()) })

			
    

    /*mod.on('UNLOAD', function() { 
            if (global.share.chess_server) {
                console.log("Stopping http...");
                global.share.chess_server.close();
                delete global.share.chess_server;
                console.log("http stopped (hopefully)");
            }
    });*/

}();

    


function svg(game, reverse) {
	var rv = reverse?1:0,
		ranks = [8,7,6,5,4,3,2,1].map(function(r,i){ return { y: Math.abs(i - 7*rv) * 10 + '%', rank: r } }),
		files = ['a','b','c','d','e','f','g','h'].map(function(f,i){ return { x: Math.abs(i - 7*rv)*10 + '%', file: f } }),
		squares = game.SQUARES.map(function(id, ix) { 
                var sq = game.get(id); 
                if (sq) {
                    sq.type = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }[sq.type];
                    sq.color = { b: 'black', w: 'white' }[sq.color];
                }

                return {
                    id: id, color: game.square_color(id) == 'light' ? 'white' : 'black',
					tx: Math.abs(ix % 8 - 7*rv) * 100, ty: Math.abs(~~(ix / 8) - 7*rv) * 100,
                    piece: sq
                }
		}),
		captured = function(){
			var co = { white: [], black: [] },
				st = function(a,b){ var or = [ 'q', 'r', 'b', 'n', 'p' ]; 
									return or.indexOf(a) < or.indexOf(b) },
				wtf = function(t,i){ t.y = i * 70 };

			game.history({ verbose: true })
				.forEach(function(m,i){
					if (m.captured) 
						co[m.color=='w'?'black':'white'].push(
							{ /*y: i * 30,*/
							  type: ({p:'pawn', n:'knight', b:'bishop', r:'rook', q:'queen'})[m.captured]})
				})

			co.black.sort(st); co.white.sort(st);

			co[reverse?'black':'white'].reverse();;

			co.black.forEach(wtf); co.white.forEach(wtf);




			return co
		}()

		//dump(captured)




    var xml = stache.to_html(SVG.source, {
           width: '100%',
           height: '100%',
           squares: squares,
           ranks: ranks,
           files: files,
		   capture_w: captured.white,
		   capture_b: captured.black,
		   capture_wt: reverse ? 1000 - captured.white.length*70 : 90,
		   capture_bt: reverse ? 90:1000 - captured.black.length*70
    });

    return xml;

}

function play(game, msg, opts) {

    opts = opts || {};

    game.msg = msg;
    game.opts = opts;

	game.id = opts.id || msg.channel, game.starttime = opts.starttime || +new Date;

	game.onturn = [];
	
	var runturn=function(){game.onturn.forEach(function(f){f()})};

	game.onturn.push(function(){
		saved[game.id] = {
			//setup: game.header().SetUp,
			id: game.id,
			starttime: game.starttime,
			lastmove: +new Date,
			//pgn: game.pgn({newline_char: ':'}),
			chan: game.msg.channel,
			data: game.serialize(true)
		}
		savesaved();
	});
		

	game.print_board = false;
    
    var events = [];

    var on = function(cmd, func) {
			var ev = { cmd: cmd, func: function(m) { if (m.channel == msg.channel) func(m) } };
			events.push(ev);
			mod.on(cmd, ev.func) 
		},

	
        off = function() {
            events.forEach(function(ev) {
                mod.removeListener(ev.cmd, ev.func);
            });
    	};

    game.__proto__ = {
		utf8board: {
			color: { square: { white: 15, black: 14 },
					 piece: { white: 0, black: 1 } },
			chars: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚', _: '\u3000' },

			gen: function(opts){
				var matrix, ranks=[],files=[],r=8,f=8;
				opts = opts || {};

				while(r)ranks.push(r--);
				while(f)files.push(String.fromCharCode(97+(8-f--)));

				if (opts.reverse){
					ranks.reverse();
					files.reverse();
				}

				matrix = ranks.map(function(rank){
					return [String.fromCharCode(0xff10+rank)].concat(files.map(function(file,fi){
						var sq = file+rank;
						var sqco = game.square_color(sq)=='light'?
								game.utf8board.color.square.white : game.utf8board.color.square.black;
						var sqpc = game.get(sq),
							piece = sqpc ? game.utf8board.chars[sqpc.type] + ' '  : game.utf8board.chars._,
							pcolor = sqpc ? 
								(sqpc.color=='w'?game.utf8board.color.piece.white:game.utf8board.color.piece.black) : sqco;

						return '\x03' + pcolor + ',' + sqco  + piece  + (fi==7?'\x03':'');
					}))
				});

				matrix.push([' ',' ', ' '].concat(['ａ', 	'ｂ', 	'ｃ', 	'ｄ', 	'ｅ', 	'ｆ', 	'ｇ', 	'ｈ']))

				return matrix;

			}
		},

	
			
        print: function(noboard, noinfo, nomoves) {

            if (!noboard)
            translate(game.ascii().trimRight()).split('\n').forEach(function(row) { 
                    msg.respond(row) 
            });

			game.inX();

			//nomoves = noinfo = noboard;

			//!nomoves && game.printmoves();

			!game.game_over() && !noinfo && game.info();

            function translate(str) {
            
                if (FORCE_UTF8 || opts.utf8) {
                    var llinepos = str.lastIndexOf('\n'),
                        top = str.substr(0, llinepos),
                        bot = str.substr(llinepos);

                    trans.utf8.each(function(piece, key) { top = top.replace(new RegExp(key, 'g'), piece) });
                    
                    return top + bot;
                }

                return str;

            }
        },

		inX: function(){
			['checkmate', 'check', 'draw', 'stalemate', 'threefold_repetition'].some(function(n) {
                if (game['in_'+n]()) {
                    msg.respond(n.capitalize().replace(/_/g, ' ') + '!');
                    return true;
                }
            });
		},

			

        info: function() {
            msg.respond("Move #"+game.move_number()+": "+(game.turn()=='w'?'White':'Black'));
        },

		printheaders: function(){
			game.header().forEach(function(h,k){
				msg.respond("%: %".f(k,h));
			});
		},

		movesstr: function(){
			return game.history()
					   .map(function(m,i){ return (i%2==0?~~(i/2)+1+'. ':'')+m })
					   .join(' ');
		},

		printmoves: function(){
			var mvtxt = game.movesstr();

			if (mvtxt) msg.respond(mvtxt);
		},

		details: function(){
			msg.respond('Game ' + game.id + ', started ' + new Date(game.starttime).format('%m/%d/%y %H:%M:%S'));
			game.printheaders();
			game.print(false, true);
			//game.printmoves();

			!game.game_over() && game.info();
		},

		off: function(){ off() },

    };

    //Events

    ({ 'move|mov|mv|m':  function(m) {
            var to = m.query.text;

            dump(to);

            var res = game.move(to);

            dump(res);

            if (!res) msg.respond("Illegal move");
			else game.print(!game.print_board), runturn(); //game.onturn.forEach(function(f){f()});
         },
      
         undo: function(m) {
				game.undo() && game.print(!game.print_board), runturn();
         },

		 load: function(m) {
		 		var fen = m.query.text,
					valid = game.validate_fen(fen);

				if (!valid.valid) { 
					msg.respond(valid.error);
					return;
				} else {
					game.load(fen);
					game.print();
					runturn();
				}

		},

         moves: function(m) {
                msg.respond(game.moves().join(', ') || "No moves!");
         },

         turn: function(m) {
                msg.respond(game.turn());
         },

         pgn: function(m) {
                msg.respond(game.pgn({ newline_char: ', ' }));
         },

		 fen: function(m) { msg.respond(game.fen()) },
         
         print: function() { game.print() },

		 delete: function(m) { 
		 	if (m.query.args[0] == game.id) {
				off();
				delete games[game.id];
				delete saved[game.id];

				savesaved();

				m.respond(game.id + ' removed');
			}
		 },

		 details: function() { game.details() },

		test: function(){
				game.utf8board.gen()
					.forEach(function(l){
						msg.respond(l.join(''));
					});
			},
         //end: function() { game.end() && msg.respond('Game ended') },

         link: function() { msg.respond(HTTP_SERVER ? HTTP_SERVER.link.fo({ name: game.id.replace(/#/g, '') }) : 'Not available') },

		 board: function() { msg.respond("Board printout " + ((game.print_board = !game.print_board) ? 'enabled' : 'disabled')) },

         dcc: function(m) {
            if (!game.dccserv) {
                game.dccserv = require('net').createServer();
                
                game.dccserv.on('connection', function(r) {
                    r.write(game.ascii() + "\r\n");
                });

                game.dccserv.listen(DCC_SERVER.port);
            }

            com.privmsg(m.nick, "\x01DCC CHAT chat " + DCC_SERVER.ip + " " + DCC_SERVER.port + "\x01");
         }

        }).each(function(f,k) { k.split('|').forEach(function(c) { 
			on('.'+c+ (game.id[0]!='#'?game.id:game.id.indexOf(':')!=-1?game.id.split(':')[1]:''), f) 
		}) });

    return game;
}

