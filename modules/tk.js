var scrape = require('./lib/httpscrape').scrape,
    get = require('./lib/httpget').get,	
    url = require('url'),
    fs=require('fs'),

    skeyword=/susie/i,
    snick=/\bsusie\b/i,

    lpnf='lastpostnum',
    getlpostnum=function(){
	return +fs.readFileSync(lpnf)
    },
    setlpostnum=function(n){
	fs.writeFileSync(lpnf, n)
    },
    lreplies=null,
    lpostnum=getlpostnum(),
    //threadnum='143981'
	threadnum='144806'
    threadid='thread_'+threadnum,
    //forumid='23-The-Mine-Field',
    forumid='mine-field',
    sessionhash=null,
    loginpasshash='775238b604dc2994ea0197595d591684',
    loginnick='Susie'

var dologin=function(callback){
		    var data='vb_login_username='+loginnick+'&vb_login_password_hint=Password&vb_login_password=&s=&securitytoken=guest&do=login&vb_login_md5password='+loginpasshash+'&vb_login_md5password_utf='+loginpasshash
		   get({url:'http://trollkingdom.net/forum/login.php?do=login',
			headers: {
			    //Referer: link,
			    'Content-Type': 'application/x-www-form-urlencoded',
			    'Content-Length': data.length
			},
		       method:'POST',
		       data: data
		    }, function(body,resp){
			sessionhash=resp.headers['set-cookie'].filter(function(h){return /bb_sessionhash/.test(h)})[0].split(';')[0].split('=')[1]
			
			dump(sessionhash)

			callback(sessionhash)

			//dopost()

		    })
		}

function tk(msg){
    dologin(function(sessh){
    scrape({url:'http://trollkingdom.net/forum/'+forumid,
	    headers: { 'Cookie': 'bb_sessionhash='+sessh } },
    function(doc, body, resp) {
		dump("HERE");
	    //var r = doc.get('//tr[@id="'+threadid+'"]/td[starts-with(@class, "stats")]/a').text()
	    //dump('replies: '+r)
	    //if (lreplies === null) lreplies = +r

	    //if (lreplies <= r) throw "No new replies"

	    var lp = doc.get('//tr[@id="'+threadid+'"]/td[starts-with(@class, "vbs_threadlastpost")]/dl/dd/a[starts-with(@class,"lastpostdate")]/@href').value()

	    //var link='http://trollkingdom.net/forum/'+lp
		var link = lp
	    scrape({url:link, headers: {Cookie:'bb_sessionhash='+sessh}},function(doc,body,resp){
		//doc.find('//ol[@id="posts"]/li//blockquote').forEach(function(e){ console.log(e.path()) })
		var lis=doc.find('//ol[@id="posts"]//li[starts-with(@id, "post")]')
		console.log('len: '+lis.length)

		var newlpnum=null,
		    replypost=null,
		    numresponse=null,
		    nrespa=[],
		    msgpost='',
			dopost=function(){
		    console.log('rp: '+replypost)
		    scrape({url:'http://trollkingdom.net/forum/newreply.php?p='+replypost+'&noquote=1',
			 headers: { 'Cookie': 'bb_sessionhash='+sessionhash }
			},function(doc,body,response,xml){
			    var inps=doc.find('//form[@name="vbform"]//input[@type="hidden"]')
			    for (var o={},i=0,l=inps.length;i<l;i++){
				o[inps[i].get('@name').value()] = inps[i].get('@value').value()
			    }

				com.db.query('SELECT count(*) c FROM logtext',function(res){
					var num=res[0].c
					db.query('SELECT content FROM logtext LIMIT '+~~(Math.random()*num) +',1',function(res){

						var rsent=res[0].content||'null'
						susie.modules.log.exports.talk({text:rsent,query:{text:rsent.split(' ').slice(1).join(' ')},channel:'#trollkingdom',respond:function(str){
						msgpost+='\n\n[HR][/HR]'+str
					



			    o.message = msgpost

			    o.title=o.message_backup=''
			    o.subscribe=0
			    o.emailupdate=0
			    o.iconid=0
			    o.parseurl=1
			    o.sbutton='Submit Reply'
			    dump(o)

			    var data = Object.keys(o).map(function(k){return k+'='+encodeURIComponent(o[k]).replace(/%20/g,'+')}).join('&')

			    dump(data)

			    get({url:'http://trollkingdom.net/forum/newreply.php?do=postreply&t='+o.t,
				 headers: { 'Cookie': 'bb_sessionhash='+sessionhash+';',
					    'Content-Type': 'application/x-www-form-urlencoded',
					    'Content-Length': data.length },
				 method: 'POST',
				 data: data
				}, function(body,resp){
				    console.log(resp.headers)
				    console.log("DONE")
				}
			    )
			}},true,{tryagain:true})})})	 
			})
		    },
			docmd=function(text,nick,pid){
				var pmsg = {
					nick: nick,
					command: 'PRIVMSG',
					direction: 'incoming',
					params: [text],
					trailing: text,
					channel: '#trollkingdom',
					respond: (function(){
						var firsttime = false;
						return function(str){
							if (!firsttime) {
								var rsp='[QUOTE='+nick+';'+pid+']'+text+'[/QUOTE]\n'+str+'\n'
								firsttime = true
								process.nextTick(function(){

									var next = nrespa.pop()
									if (!next) dopost()
									else next()
								})


							} else {
								var rsp=str+'\n'
							}


							msgpost+=rsp

						}
					}())
				}

				pmsg.inherits(susie.modules.raw.exports.IRCMessage)

				susie.modules.raw.exports.emitLine(pmsg)
			},
						
		    talk=function(text, nick,pid){
				var pmsg = {
					text: text,
					respond: function(str){
					var rsp='[QUOTE='+nick+';'+pid+']'+text+'[/QUOTE]\n'+str+'\n'

					console.log("RESPONSE: "+rsp)

					msgpost+=rsp

					var next = nrespa.pop()
					if (!next) {
						dopost()
						//if (!sessionhash) dologin()
						//else dopost()
					} else next()
					},
					channel: '#trollkingdom'
				}

				susie.modules.log.exports.talk(pmsg)
		    }
				
		for (var i=lis.length;i--;){
		    var li=lis[i]

		    var pnum = li.get('div/div[@class="posthead"]/span[@class="nodecontrols"]/a[starts-with(@id,"postcount")]/@name').value()

		    if (newlpnum===null) {
			newlpnum=pnum
			replypost=li.get('@id').value().split('_')[1]
		    }

		    console.log('pnum: '+pnum)
		    console.log('lpostnum: '+lpostnum)
			var content = li.get('.//div[starts-with(@id,"post_message")]/blockquote[starts-with(@class,"postcontent")]').childNodes().filter(function(e){return e.type()=='text'}).map(function(e){return e.text()}).join('\n').trim()
			//for(var rj in scont)console.log(rj)
			console.log("C: "+content)
		    if (pnum <= lpostnum) { dump("READ IT ALREADY"); break }
		    dump("TEXT##"+li.get('@id').value())

//		    var content=li.get('.//div[starts-with(@id,"post_message")]').text().trim(),
			nick=li.get('.//a[contains(@class, "username")]/strong').text().trim(),
			pid=li.get('@id').value().split('_')[1]



		    
			//var strt=content.replace(/\[(\w+)[^\]]*\].*?\[\/\1\]/g, '')
			if ((content[0] == '!' || content[0] == '.') && !snick.test(nick)){
				nrespa.push(function(content,nick,pid){
					return function(){
						docmd(content,nick,pid)
					}
				}(content,nick,pid))
				
			} else if (skeyword.test(content) && !snick.test(nick)) {
				nrespa.push(function(content,nick,pid){
					return function(){
						talk(content, nick, pid)
					} 
				}(content,nick,pid))
			//dump(content)

			//msgpost+=content+"\n"

		    }
		}

		console.log('NRESPA: '+nrespa)

		if (!nrespa.length) {
		    console.log("No replies, nothing to do")
		} else {
		    nrespa.pop()()
		}

		setlpostnum(newlpnum)
		lpostnum=newlpnum

				
		

	    })

    })
})
}
exports.tk=tk
var time = 1000*60*10 //10 minutes
console.log('registering TK check timer at ' + time + ' ms')
var intid=setInterval(tk, time)

mod.on('UNLOAD',function(){
	console.log('unregistering TK check timer')
	clearInterval(intid)
})
