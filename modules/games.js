
function between(min, max) {
	return Math.round(Math.random() * (max - min)) + min;
}

var Acro = {
	min_len: 3,
	max_len: 5,
	running: false,
	current: '',

	start: function(message) {

		if (!Acro.running) {
	//		Acro.start = true;

			var alen = between(Acro.min_len, Acro.max_len);
			var acronym = '';

			for (var i = 0; i < alen; i++)
				acronym += String.fromCharCode(between(65, 90));


			Acro.current = acronym;
			message.respond("The acronym is: " + acronym);
			message.respond("  Type \"/msg " + mod.irc.state.nick + " <acronym definition>\" to submit");
		}
	}
};

mod.on('!acro', Acro.start);
