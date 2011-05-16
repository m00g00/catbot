/*process.stdout.__write = process.stdout.write;
process.stdout.write = function(str) {
	var ESC = "\033[";
	//this.__write(TERM_ESCAPE + '1A');
		//this.__write(str);
	this.__write(ESC+'1K'+str);
	repl.rli.emit('line', '\n');
};*/

/*with ({Script: require('vm'), tmp: null}) {
	tmp = Script.runInContext;
	Script.runInContext = function(cmd, context, file) {
		var match;
		if (match = /^use (.*)/.exec(cmd)) {

			if (match[1] == 'none') cmd = '(function(){this.__use = null;})()';

			else cmd = '(function(){this.__use = '+match[1]+';})()';

		} else if (match = /^usemsg (.*)/.exec(cmd)) {
			
			if (match[1] == 'none') cmd = '(function(){this.__usemsg = null;})()';
			
			else cmd = '(function(){this.__usemsg = "'+match[1].replace(/"/g, '\\"')+'";})()';

		} else if (cmd[0] == '#') {
			
			process.stdout.write('\r\b');
			cmd = '(function(){irc.echo(this.__usemsg||"" + "'+cmd.substr(1).replace(/"/g, '\\"')+'");})()';

		} else if ('__use' in context && typeof context.__use != 'undefined' && context.__use !== null) {

			cmd = 'with(__use) { ' + cmd + ' }';

		}
		//console.log(typeof cmd);

		return tmp(cmd, context, file);
	};*/

	/*process.stdout._write = process.stdout.write;
	process.stdout.write = function(str) {
		this._write('\r\r' + str);
	};*/

			
	with (require('repl')) {
		writer = function(obj, showHidden, depth) {
			return print_r(obj, showHidden, repl.context._depth, null, null, true);
		};
			
		global.repl = start('bot> ');

		global.repl.context._depth = 3;	
	}

	//Script.runInContext = tmp;
//}

repl.context.__use = null;
repl.context.__usemsg = null;
repl.context.print_r = print_r;
repl.context.var_dump = var_dump;
repl.context.servers = global.servers;
