/*var esctlchar = function(str) {
    var ctlc = { 0: '0', 7: 'a', 8: 'b', 9: 't', 10: 'n', 12: 'f', 13: 'r' };
    return str.split('').map(function(c) {
        var cint = c.charCodeAt();
        if (cint < 32 || cint == 127) {
            return '\\' + (ctlc[cint] ? ctlc[cint] : 'x' + cint.toString(16)); 
        } else return c }).join('') }*/

var v8 = {
	path_history: 'modules/.js/',
	ctx: {},
	call: function(msg, code) {
        code = code || msg.query.text.trim()
		if (!code) return;

		var ctx = v8.getctx(msg);

		ctx.once('flush', function(res) {
            msg.respond(' '+res);
		});
	
		ctx.call(code);
	},

	getctx: function(msg) {
		var name = msg.channel || msg.from;

		if (!v8.ctx[name]) v8.spawn(name);

		return v8.ctx[name];
	},

	spawn: function(name) {
		//var child = require('child_process').spawn('sudo', ['-ujail', './botshell'], { cwd: '/home/jail' });
		var child = require('child_process').spawn('./botshell');
		child.stdout.setEncoding('utf8');
		child.stderr.setEncoding('utf8');
		child.stdin.setEncoding('utf8');

		v8.ctx[name] = child;

		/*child.stderr.on('data', function(e) { console.log('err: ' + e) });
		child.stdout.on('data', function(e) { console.log('out: ' + e) });*/

		child.ready = false;

		child.on('exit', function(code, sig) {
				dump(arguments);
				console.log('EXIT');
		});

		child.on('error', function(err) {
				console.log("ERROR");
				console.log(err);
		});

		child.stdout.on('data', function(d) {
			if (/^>>/m.test(d)) {
				child.ready = true;
				child.emit('ready');
			}
		});

		child.call = function(code) {
			if (!child.ready) child.once('ready', callshell);
			else callshell();

			function callshell() {

				var buffer = "",
					off = function() {
						child.stdout.removeAllListeners('data');
						child.stderr.removeAllListeners('data');
					},

					timeout = setTimeout(function() {
						off();
						dump("KILL");
						child.kill('SIGKILL');
						delete v8.ctx[name];
						child.emit('flush', 'Timeout Error');
					}, 5000);

				child.stdout.on('data', function(d) {
					buffer += d;
					if (/^>>/m.test(buffer)) {
						clearTimeout(timeout);
						off();

						var ln = buffer.split("\n");
						ln.pop();

						var out = ln.map(function(e){return e.trim()}).join('; ');

						if (out.length > 200) out = out.substr(0, 200) + '...';

						buffer = "";
						child.emit('flush', out);
					}
				});

				child.stderr.on('data', function(d) {
						buffer += d;
				});



				child.stdin.write(code + "\n");

			}
		}

		return child;
	}
};

mod.on(['..'], v8.call);
mod.on('UNLOAD', function() {
		v8.ctx.each(function(ctx) {
			ctx.kill('SIGKILL');
		});
});

exports.ctx = v8.ctx;



var coco = function(){
    var cc = require('coco'),
        ccc = function(str){ return cc.compile(str, {bare:1}).replace(/\n\s*/g, '') }
    return {
        compile: function(msg)
        { try { var cstr = ccc(msg.query.text.trim())
                msg.respond(cstr) }
          catch(e) { msg.respond(e.message) } },

        run: function(msg)
        { try { var cstr = ccc(msg.query.text.trim())
                v8.call(msg, cstr) }
          catch(e) { msg.respond(e.message) } } } }()
    

//mod.on('.c', coco.run)
//mod.on('.cc', coco.compile)

