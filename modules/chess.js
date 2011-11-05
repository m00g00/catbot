var ch = require('./modules/chess/chess.js');

var allgames = global.share.chess || (global.share.chess = {}),
    sname = mod.irc.getServerName(),
    games = allgames[sname] || (allgames[sname] = {}),
    
    HTTP_SERVER = { port: 4800, link: 'http://bigmooworld.com:4800/chess/{name}/svg', html_template: 'modules/chess/index.html' },
    SVG = { template: 'modules/chess/game.svg.stache' },
    DCC_SERVER = { port: 4900, ip: 	1122249322 },



    trans = {
        utf8: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔',
                P: '♟', N: '♞', B: '♝', R: '♜', Q: '♛', K: '♚' }
    };


var fs = require('fs');
if (SVG) SVG.source = fs.readFileSync(SVG.template, 'utf8');
if (HTTP_SERVER) HTTP_SERVER.html = fs.readFileSync(HTTP_SERVER.html_template, 'utf8');

games.each(function(g,n) {
    play(g, g.msg, g.opts);
});

mod.on('.chess', function(msg) {
        
    if (!msg.channel) { msg.respond("Must be in channel"); return } 

    var game = games[msg.channel], resp;

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
                game = games[msg.channel] = new ch.Chess();
                var options = {};
                msg.query.args.slice(1).each(function(a) { options[a] = true });
                play(game, msg, options);
                game.print();
            }
            break;
    }

    if (resp) msg.respond(resp);
    
});

if (HTTP_SERVER && !global.share.chess_server) void function() {
    var connect = require('connect'),
        stache = require('./modules/chess/mustache.js');

    global.share.chess_server = connect(
            connect.logger(),
            connect.static('modules/chess'),
            connect.router(function(app) {
                app.get('/', function(req, res, next) {
                    res.end(mod.irc.modules.random.exports.peen());
                });

                var getGame = function(name) { return games['#'+name] };

                app.get('/chess/:game', function(req, res, next) {
                    var game = getGame(req.params.game);

                    var body = stache.to_html(HTTP_SERVER.html, {
                        title: 'chess >> ' + game.name(),
                        pgn: game.pgn(),
                        name: req.params.game
                    });

                    res.end(body);
                });

                app.get('/chess/:game/svg', function(req, res, next) {
                    var game = getGame(req.params.game);

                    if (!game) { next(); return }

                    var body = svg(game);

                    res.setHeader('Content-Type', 'image/svg+xml');

                    res.end(body);
                });

                app.get('/chess/:game/pgn', function(req, res, next) {
                    var game = getGame(req.params.game);

                    if (!game) { next(); return }

                    var body = game.pgn();

                    res.setHeader('Content-Type', 'text/plain');
                    res.end(body);
                });
                    
            })
    );
    
    global.share.chess_server.listen(HTTP_SERVER.port),

    mod.on('UNLOAD', function() { 
            if (global.share.chess_server) {
                console.log("Stopping http...");
                global.share.chess_server.close();
                delete global.share.chess_server;
                console.log("http stopped (hopefully)");
            }
    });

}();

    


function svg(game) {
    var stache = require('./modules/chess/mustache.js');

    var xml = stache.to_html(SVG.source, {
            width: '100%',
            height: '100%',
            squares: game.SQUARES.map(function(id, ix) { 
                var sq = game.get(id); 
                if (sq) {
                    sq.type = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }[sq.type];
                    sq.color = { b: 'black', w: 'white' }[sq.color];
                }

                return {
                    id: id, color: game.square_color(id) == 'light' ? 'white' : 'black',
                    tx: (ix % 8) * 100, ty: ~~(ix / 8) * 100,
                    piece: sq
                }
            }),
            /*squares: (function() {
                var squares = [], rank, file;

                for(rank=8; rank; rank--)
                    for(file=1; file<=8; file++) { 
                        var id = String.fromCharCode(96+file) + rank;
                        squares.push({ 
                            id: id,
                            color: file%2==rank%2 ? 'black' : 'white',
                            //x: (file-1)*10 + '%',
                            //y: (8-rank)*10 + '%',
                            
                            tx: (file-1)*100,
                            ty: (8-rank)*100,

                            piece: (function() { 
                                var sq = game.get(id);

                                if (sq) {
                                    sq.type = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }[sq.type];
                                    sq.color = { b: 'black', w: 'white' }[sq.color];
                                }

                                return sq;
                            }())


                        });
                    }


                return squares;

           }()),*/
           ranks: [8,7,6,5,4,3,2,1].map(function(r,i){ return { y: i*10 + '%', rank: r } }),
           files: ['a','b','c','d','e','f','g','h'].map(function(f,i){ return { x: i*10 + '%', file: f } })
    });

    return xml;

}

function play(game, msg, opts) {

    opts = opts || {};

    game.msg = msg;
    game.opts = opts;
    
    var events = [];

    var on = function(cmd, func) {
        var ev = { cmd: cmd, func: function(m) { if (m.channel == msg.channel) func(m) } };
        events.push(ev);
        mod.on(cmd, ev.func);
    },
        off = function() {
            events.forEach(function(ev) {
                mod.removeListener(ev.cmd, ev.func);
            });
    };

    game.__proto__ = {
        print: function() {

            translate(game.ascii().trimRight()).split('\n').forEach(function(row) { 
                    msg.respond(row) 
            });

            ['checkmate', 'check', 'draw', 'stalemate', 'threefold_repetition'].some(function(n) {
                if (game['in_'+n]()) {
                    msg.respond(n.capitalize().replace(/_/g, ' ') + '!');
                    return true;
                }
            });

            game.info();

            function translate(str) {
            
                if (opts.utf8) {
                    var llinepos = str.lastIndexOf('\n'),
                        top = str.substr(0, llinepos),
                        bot = str.substr(llinepos);

                    trans.utf8.each(function(piece, key) { top = top.replace(new RegExp(key, 'g'), piece) });
                    
                    return top + bot;
                }

                return str;

            }
        },

        info: function() {
            msg.respond("Move #"+game.move_number()+": "+(game.turn()=='w'?'White':'Black'));
        },

        end: function() {
            off();
            return delete games[msg.channel];
        },

        name: function() {
            return msg.channel;
        }
    };

    //Events

    ({ 'move|mov|mv|m':  function(m) {
            var to = m.query.text;

            dump(to);

            var res = game.move(to);

            dump(res);

            if (!res) msg.respond("Illegal move");
            else game.print();
         },
      
         undo: function(m) {
                game.undo() && game.print();
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
         
         print: function() { game.print() },

         end: function() { game.end() && msg.respond('Game ended') },

         link: function() { msg.respond(HTTP_SERVER ? HTTP_SERVER.link.fo({ name: game.name().replace(/#/g, '') }) : 'Not available') },

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

        }).each(function(f,k) { k.split('|').forEach(function(c) { on('.'+c, f) }) });

    return game;
}

