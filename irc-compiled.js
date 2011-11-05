var e = null, g = require("net").J, h = require("events").I, i = require("path"), j = require("./lib/scripter");
require("sys");
var k = require("./helper").log, l = k.U, m = k.error, n = k.oa, o = k.da;
function p(a) {
  if(!a.g) {
    throw"Invalid server";
  }
  if(!a.port) {
    throw"Invalid port";
  }
  this.na = this.d;
  this.d.constructor.call(this);
  this.la("utf8");
  this.b = Object.prototype.o.call(a, q);
  this.ma(false);
  if(!(this.b.a instanceof Array)) {
    throw"Config: Property 'modules' must be array";
  }
  this.state = {aa:e, mode:e, L:[], g:e, u:e, Z:false};
  this.i = {};
  this.p();
  this.t();
  this.q()
}
p.o(g);
p.s({p:function() {
  this.a = {}
}, X:function() {
  return this.b.id
}, Y:function() {
  return this.b.ka || /^(?:[^.]+\.)?([^.]+)/.exec(this.state.g)[1]
}, t:function() {
  this.c("connect", function() {
    this.state.g = this.b.g;
    this.state.u = new Date;
    this.b.w instanceof Function && this.b.w(this)
  });
  this.c("module_before_load", function(a) {
    o('I CAN HAS "%s"?', a)
  });
  this.c("module_loaded", function(a, b, c) {
    this.a[typeof this.a[a] == "undefined" ? a : b] = c;
    l("Registered % event handlers", c.A());
    n('I HAS "%s"!\n', a)
  });
  this.c("module_load_error", function(a, b, c) {
    print_r(c, 1, 3, "Module Error");
    m('I CANT HAS "%s", IT IZ BROKED :( \n', a)
  });
  this.c("modules_loaded", function() {
    this.a.F() == this.b.a.length ? n("I HAS ALL UR BOTZ AND UR BASE") : this.a.F() > 0 && m("I HAS UR BOTZ BUT I WANT MOAR!")
  })
}, N:function() {
}, ba:function(a) {
  return a
}, z:function(a) {
  return this.a[this.n(a)]
}, n:function(a) {
  for(var b = Object.keys(this.a), c = 0, d = b.length;c < d;++c) {
    if(this.a[b[c]].name == a) {
      return b[c]
    }
  }
}, qa:function(a) {
  a = this.z(a);
  return!a ? false : a.j
}, v:function() {
  for(var a = Object.keys(this.a), b = 0, c = a.length;b < c;++b) {
    var d = this.a[a[b]];
    try {
      d.e.apply(d, arguments)
    }catch(f) {
      m("Module Event Exception"), console.error(f.stack), console.log(Object.getOwnPropertyNames(f))
    }
  }
}, c:function(a, b) {
  a instanceof Array || (a = [a]);
  for(var c = 0, d = a.length;c < d;++c) {
    this.d.c.call(this, a[c], b)
  }
}, h:function(a, b) {
  a instanceof Array || (a = [a]);
  for(var c = 0, d = a.length;c < d;++c) {
    this.d.h.call(this, a[c], b)
  }
}, C:function() {
  this.q()
}, q:function() {
  this.D(0)
}, D:function(a) {
  a = a || 0;
  if(a >= this.b.a.length) {
    throw"Invalid starting index";
  }
  var b = ["module_loaded", "module_load_error"];
  this.c(b, function(c) {
    ++a < this.b.a.length ? this.k(this.b.a[a]) : (this.h(b, arguments.callee), this.e("modules_loaded"))
  });
  this.k(this.b.a[a])
}, H:function(a) {
  a = this.n(a);
  if(typeof a == "undefined") {
    throw r;
  }
  try {
    this.a[a].e("UNLOAD")
  }catch(b) {
    console.log(b.stack)
  }
  return delete this.a[a]
}, ga:function() {
  this.p();
  this.C()
}, fa:function(a) {
  try {
    this.H(a)
  }catch(b) {
    if(b == r) {
      console.log("Module not loaded, loading anyway...")
    }else {
      throw b;
    }
  }
  this.k(a)
}, B:0, k:function(a) {
  var b;
  typeof a == "function" ? (b = a, a = (b.toString().match(/^\s*function\s+([\w\d$_]+)/) || [])[1] || "inline" + ++this.B) : b = typeof a == "string" && (a[0] == "." || a[0] == "/") ? a + ".js" : i.ia(__dirname, this.b.G, a) + ".js";
  this.e("module_before_load", a, b);
  new s(a, b, this)
}, Q:function(a) {
  l("#" + a);
  this.write(a + "\r\n")
}, P:function(a, b, c) {
  c = c || this.b;
  if(a in c) {
    a = c[a];
    if(!(a instanceof Object) || !("forEach" in a)) {
      a = [a]
    }
    a.forEach(b);
    return true
  }
  return false
}, toString:function() {
  return"[object IRC: " + this.b.g + "]"
}});
var q = {port:6667, ca:".", G:"./modules", V:true, W:true, version:"catbot 1.337 / Node.js irc bot / https://github.com/m00g00/catbot", ea:"BAI", T:true, S:7, R:1E3, a:["raw"]}, r = "No such module";
function s(a, b, c) {
  function d(d) {
    d ? c.e("module_load_error", a, b, d) : c.e("module_loaded", a, b, t)
  }
  this.name = a;
  this.f = c;
  this.d.constructor.call(this);
  this.j = {};
  var f = {$:this, M:c.i, j:this.j, ha:require}, t = this;
  typeof b == "function" ? d(e, b.apply(this, f.ra())) : j.ja(b, f, this, d)
}
s.o(h);
s.s({l:function() {
  this.f.v.apply(this.f, arguments)
}, A:function() {
  var a = 0;
  "_events" in this && this.K.forEach(function(b) {
    a += b instanceof Array ? b.length : 1
  });
  return a
}, m:e, r:function(a) {
  return this.f.i.m instanceof Function ? this.f.i.m(a) : a
}, c:function(a, b) {
  a instanceof Array || (a = [a]);
  a.forEach(function(a) {
    a = this.r(a);
    this.d.c.call(this, a, b);
    this.l("EVENT_REGISTERED", a, b, this)
  }, this)
}, h:function(a, b) {
  Array.pa(a).map(this.r, this).forEach(function(a) {
    this.d.h.call(this, a, b);
    this.l("EVENT_UNREGISTERED", a, b, this)
  }, this)
}, put:function(a) {
  this.f.write(a + "\n")
}});
exports.O = function(a) {
  return new p(a)
};

