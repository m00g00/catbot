
	var sys = require('sys');

	var meld = function(a,b) {
		for (var i in b) if (b.hasOwnProperty(i)) a[i] = b[i];
		return a;
	};

	var proto = function(construct, obj) {
		return meld(construct.prototype, obj);
	};

	var Markup = function(tagset) {

		var tags = {
			limited: ['div', 'span', 'p', 'ul', 'li', 'a', 'br', 'img'],

			common: ['html', 'head', 'body', 'div', 'p', 'span', 'a', 'b', 'title', 'link', 'style', 
				'script', 'h1', 'h2', 'ul', 'li', 'table', 'tr', 'th', 'td', 'form', 
				'input', 'textarea', 'select', 'option', 'label', 'link', 'img', 'pre', 'br', 'base', 'iframe'],

			extended: ['html', 'head', 'body', 'div', 'a', 'span', 'title', 'link',
				'style', 'script', 'meta', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
				'b', 'em', 'abbr', 'ul', 'li', 'ol', 'dl', 'dt', 'dd', 'table',
				'thead', 'tbody', 'tr', 'th', 'td', 'col', 'colgroup', 'form',
				'input', 'textarea', 'select', 'option', 'optgroup', 'button',
				'label', 'fieldset', 'legend', 'link', 'img', 'pre', 'code', 'br',
				'blockquote', 'hr', 'i', 'object', 'embed', 'base', 'b', 'iframe']
		};


		var usetags = tagset instanceof Array ? tagset : 
					  	    tagset in tags ? tags[tagset] : tags.common;

		this.addTags(usetags);
	};

	Markup.selfclosing = ['img', 'link', 'br', 'input', 'hr', 'meta', 'base', 'area', 'basefont'];

	proto(Markup, {
		addTags: function(taglist) {
			taglist.forEach(function(name) {
				var thiz = this;
				this[name] = function() {
					Array.prototype.unshift.call(arguments, name);
					return thiz.tag.apply(this, arguments);
				}
			}, this);
		},

		tag: function(name) {
			var tag = new Tag(name)

			tag.push.apply(tag, Array.prototype.slice.call(arguments, 1));

			return tag;
		},

		inline: function(value) {
			return new HTMLText(value);
		}
	});

	function Element() {
		this.parent = null;
		this.type = 'element';
		this.value = null;
	}

	proto(Element, {
		toString: function() {
			return escapeHTML(''+this.value);
		}
	});

	function escapeHTML(html) {
		return html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	function HTMLText(value) {
		this.type = 'HTMLText'
		this.value = value;
	}

	sys.inherits(HTMLText, Element);

	proto(HTMLText, {
		toString: function() {
			return this.value;
		}
	});
		
	function Tag(name) {
		this.name = name;
		this.type = 'tag';
		this.children = [];
		this.attributes = {};
	}

	sys.inherits(Tag, Element);

	proto(Tag, {
		push: function() {
			for (var i=0, l=arguments.length; i<l; i++) {
				var arg = arguments[i];

				if (arg === null) continue;
				console.log(arg);

				if (arg instanceof Array) {
					arguments.callee.apply(this, arg);
				} else if (arg instanceof Element) {
					arg.parent = this;
					this.children.push(arg);
				} else if (typeof arg == 'object') {
					meld(this.attributes, arg);
				} else {
					var ele = new Element();
					ele.value = arg;
					ele.parent = this;
					this.children.push(ele);
				}
			}
		},

		toHTML: function() {
			var html = '', format = '  ';
			if (this.__meta) {
				var meta = this.__meta;
				if (typeof meta.format != 'undefined') {
					if (meta.format === false || meta.format === null) format = '';
					else if (meta.format !== true) format = ''+meta.format;
				}

				if (meta.doctype) {
					html += meta.doctype + '\n';
				}
			}
								 
			return html + this.toString(format);
		},

		toString: function(indent) {
			indent = indent || '';

			var str = '<' + this.name;

			for (var attr in this.attributes)
				if (this.attributes.hasOwnProperty(attr)) 
					str += ' ' + attr + '="' + (this.attributes[attr].join ? this.attributes[attr].join(' ') : this.attributes[attr]) + '"';


			if (this.children.length) {
				str += '>';
				var inner = [], ilen=0, childstr;
				var ilen = 0, contains_tag = false;
				for (var i=0, l=this.children.length; i<l; i++) {
					childstr = this.children[i].toString(indent);
					ilen += childstr.length;

					if (this.children[i] instanceof Tag) contains_tag = true;
					
					inner.push(childstr);
				}
				
				if (ilen < 80 || !contains_tag) str += inner.join('');
				else str += '\n' + inner.map(function(e) { return e.replace(/^/gm, indent);}).join('\n') + '\n';

				str += '</'+this.name+'>';

			} else {
				str += Markup.selfclosing.indexOf(this.name) != -1 && !this.children.length ? '/>' : '></'+this.name+'>';
			}

		/*		str += '</'+this.name+'>';
			} else {
				str += '/>';
			}*/

			return str;
		}
				
	});

	Object.defineProperties(Tag.prototype, {
		id: {
				get: function() { return this.attributes.id; },
				set: function(v) { this.attributes.id = v; }
		},

		ids: {
			get: function() {
					var ids = {};

					(function(tag) {
						if ('id' in tag.attributes) ids[tag.attributes.id] = tag;

						var callee = arguments.callee;
						tag.children.forEach(function(child) {
							if (child instanceof Tag) callee(child);
						});
					}(this));

					return ids;
			}
		},

		getClasses: {
			value: function() {
				if (typeof this.attributes.class == 'undefined')
					return [];
				else
					return this.attributes.class.split(/\s+/);
			}
		},

		setClasses: {
			value: function(classes) {
				if (classes.length) 
					this.attributes.class = classes.map(function(c) { return c.trim(); }).join(' ');
			}
		},

		addClass: {
			value: function(name) {
				var classes = this.getClasses();

				if (classes.indexOf(name.trim()) == -1) 
					classes.push(name);

				this.setClasses(classe);

				return this;
			}
		},

		remClass: {
			value: function(name) {
				var classes = this.getClasses();

				var ci = classes.indexOf(name.trim());

				if (ci != -1) this.setClasses(classes.splice(ci, 1));

				return this;
			}
		}
	});

	exports.Markup = Markup;
	exports.Tag = Tag;
	exports.Element = Element;
	exports.HTMLText = HTMLText;
	exports.escapeHTML = escapeHTML;


	exports.test = function() {
		var m = new exports.Markup();

		with(m){
		var dom = html(
					head(
						title('test dom')
					),
					body(
						h1('TEST DOM'),
						div(
							ul({id: 'test-list'},
								li('hmm'),
								li('dude'),
								li("BLAH")
							)
						)
					)
				);
		}
		console.log(dom.toString('  '));
	};
