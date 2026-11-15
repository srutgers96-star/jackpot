/* ===== Bierspelbijbel core ===== */
var App=(function(){
  "use strict";
  var el=function(id){return document.getElementById(id);};
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function pct(x,d){return (x*100).toFixed(d===undefined?1:d).replace(".",",")+"%";}
  function num(x,d){return x.toFixed(d===undefined?1:d).replace(".",",");}
  function rnd(n){return 1+Math.floor(Math.random()*n);}

  /* ---- state ---- */
  var S={ players:[{name:"Speler 1",slokken:0,atjes:0},{name:"Speler 2",slokken:0,atjes:0}], active:0, sound:true, kans:false, game:null, gs:{} };
  function save(){ try{ localStorage.setItem("bijbel-state",JSON.stringify(S)); }catch(e){} }
  function load(){ try{ var raw=localStorage.getItem("bijbel-state"); if(raw){ var o=JSON.parse(raw); if(o&&o.players&&o.players.length) S=o; } }catch(e){} S.gs=S.gs||{};
    /* eenmalig: de oude standaardnamen (Stijn en Daan, nog niets gedronken) worden Speler 1 en 2; alleen Jackpot begint met die twee */
    if(!S.namesV2){ S.namesV2=true; if(S.players.length===2&&S.players[0].name==="Stijn"&&S.players[1].name==="Daan"&&!S.players.some(function(q){return q.slokken||q.atjes;})){ S.players[0].name="Speler 1"; S.players[1].name="Speler 2"; } }
  }
  load();

  /* ---- sound ---- */
  var AC=null;
  function ctx(){ try{ if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)(); if(AC.state==="suspended")AC.resume(); return AC; }catch(e){ return null; } }
  function tone(f,t0,dur,type,vol){ var c=ctx(); if(!c)return; var o=c.createOscillator(), g=c.createGain(); o.type=type||"sine"; o.frequency.setValueAtTime(f,c.currentTime+t0);
    g.gain.setValueAtTime(0.0001,c.currentTime+t0); g.gain.exponentialRampToValueAtTime(vol||0.25,c.currentTime+t0+0.01); g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+t0+dur);
    o.connect(g); g.connect(c.destination); o.start(c.currentTime+t0); o.stop(c.currentTime+t0+dur+0.05); }
  function noise(t0,dur,vol,freq,q){ var c=ctx(); if(!c)return; var n=Math.floor(c.sampleRate*dur), b=c.createBuffer(1,n,c.sampleRate), d=b.getChannelData(0);
    for(var i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2); var src=c.createBufferSource(); src.buffer=b;
    var f=c.createBiquadFilter(); f.type="bandpass"; f.frequency.value=freq||(1800+Math.random()*1500); f.Q.value=q||1.2;
    var g=c.createGain(); g.gain.value=vol||0.5; src.connect(f); f.connect(g); g.connect(c.destination); src.start(c.currentTime+t0); }
  var sfx={
    rattle:function(){ for(var i=0;i<9;i++){ noise(i*0.08+Math.random()*0.03,0.06,0.35+Math.random()*0.3); } noise(0.78,0.12,0.6); },
    tick:function(){ noise(0,0.04,0.3); tone(220,0,0.06,"square",0.08); },
    clack:function(x){ x=typeof x==="number"?x:0.5; noise(0,0.025+0.03*(1-x),0.25+0.75*x,1400+2200*x,2.2); noise(0.004,0.05+0.04*(1-x),0.08+0.3*x,600+500*x,1.5); tone(130+70*x,0,0.045+0.03*x,"sine",0.12+0.35*x); },
    dood:function(){ tone(196,0,0.35,"sawtooth",0.2); tone(146.8,0.3,0.4,"sawtooth",0.2); tone(98,0.65,0.8,"sawtooth",0.25); },
    win:function(){ [523.25,659.25,783.99,1046.5,1318.5].forEach(function(f,i){ tone(f,i*0.11,0.3,"triangle",0.25); }); tone(1046.5,0.6,0.9,"triangle",0.3); tone(1318.5,0.6,0.9,"triangle",0.2); },
    special:function(){ [392,523.25,659.25,783.99,1046.5,1318.5,1567.98].forEach(function(f,i){ tone(f,i*0.1,0.35,"triangle",0.25); }); [523.25,659.25,783.99,1046.5].forEach(function(f){ tone(f,0.85,1.6,"triangle",0.18); }); },
    ding:function(){ tone(880,0,0.25,"triangle",0.2); tone(1320,0.08,0.4,"triangle",0.15); }
  };
  function play(name,arg){ if(S.sound&&sfx[name])try{sfx[name](arg);}catch(e){} }

  /* ---- overlay ---- */
  var overlayTimer=null;
  function overlay(kind,title,sub,ms,extraHtml){
    var o=el("overlay"), sticky=ms===0; clearTimeout(overlayTimer); o.className="overlay "+kind+(sticky?" sticky":""); o.style.background="";
    if(sub&&!Array.isArray(sub))sub=[sub];
    el("overlayText").innerHTML='<span class="t">'+esc(title)+'</span>'+(sub?sub.map(function(l){return "<small>"+esc(l)+"</small>";}).join(""):"")+(extraHtml||"")+(sticky?'<span class="tap">Tik om verder te gaan</span>':"");
    void o.offsetWidth; o.className="overlay "+kind+(sticky?" sticky":"")+" show";
    if(!sticky) overlayTimer=setTimeout(function(){ o.className="overlay"; },ms||2200);
    return o;
  }
  function pul(f){ /* f = 1 vol, 0.5 half, 0 leeg */
    var fill=f>=1?'<rect x="6" y="6" width="12" height="13" rx="1.5" fill="#e7b84f"/>':f>0?'<rect x="6" y="12" width="12" height="7" rx="1.5" fill="#e7b84f"/>':'';
    return '<svg class="pul" viewBox="0 0 24 24" aria-hidden="true">'+fill+'<path d="M6 4h12v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M18 8h2.5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H18" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  }
  function pullen(arr){ if(!arr||!arr.length)return ""; return '<span class="pullen" title="Hoeveel bier">'+arr.map(pul).join("")+'</span>'; }
  function dicerowSmall(vals){ return vals.map(function(v){return '<span class="dsmall">'+pips(v)+'</span>';}).join(""); }
  function dicerow(vals){ return '<span class="dicerow">'+vals.map(function(v){return '<span class="mini">'+pips(v)+'</span>';}).join("")+'</span>'; }

  /* ---- dice ---- */
  function pips(v){ var on={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]}[v]||[]; var h=""; for(var i=0;i<9;i++)h+='<span class="pip'+(on.indexOf(i)>=0?' on':'')+'"></span>'; return h; }
  /* Dice widget: n dice, manual entry via picker, digital roll, optional keep toggles.
     opts: {n, keepable, onRoll(values), onChange(values), label} */
  function Dice(container,opts){
    var n=opts.n, vals=[], kept=[], pick=null, rolling=false, i;
    for(i=0;i<n;i++){vals.push(null);kept.push(false);}
    container.innerHTML='<div class="dice"></div><div class="picker"></div>'+(opts.noRoll?'':'<button class="roll">'+esc(opts.label||"Dobbel")+'</button>');
    var row=container.querySelector(".dice"), pk=container.querySelector(".picker"), rollBtn=container.querySelector(".roll");
    function complete(){ return vals.every(function(v){return v!==null;}); }
    function render(){
      row.innerHTML=vals.map(function(v,i){
        return '<div class="diewrap"><button class="die'+(v?'':' blank')+(pick===i?' picking':'')+(kept[i]?' kept':'')+(rolling&&!kept[i]?' rolling':'')+'" data-i="'+i+'" aria-label="Dobbelsteen '+(i+1)+(v?': '+v:'')+'">'+(v?pips(v):"?")+'</button>'+
          (opts.keepable&&v?'<button class="keep" data-k="'+i+'" aria-pressed="'+kept[i]+'">'+(kept[i]?"vast":"laat liggen")+'</button>':'')+'</div>';
      }).join("");
      pk.className="picker"+(pick!==null?" open":""); var h=""; for(var v=1;v<=6;v++)h+='<button data-v="'+v+'">'+pips(v)+'</button>'; pk.innerHTML=h;
    }
    row.addEventListener("click",function(e){
      var k=e.target.closest(".keep"); if(k){ var ki=+k.getAttribute("data-k"); kept[ki]=!kept[ki]; render(); if(opts.onKeep)opts.onKeep(kept.slice()); return; }
      var b=e.target.closest(".die"); if(!b||rolling)return; var idx=+b.getAttribute("data-i"); pick=(pick===idx?null:idx); render(); ctx();
    });
    pk.addEventListener("click",function(e){
      var b=e.target.closest("button"); if(!b||pick===null)return; vals[pick]=+b.getAttribute("data-v"); play("tick");
      var nxt=null; for(var j=1;j<=n;j++){ var c=(pick+j)%n; if(vals[c]===null){nxt=c;break;} } pick=nxt; render();
      if(opts.onChange)opts.onChange(vals.slice());
      if(complete()&&opts.onRoll)opts.onRoll(vals.slice(),false);
    });
    if(rollBtn) rollBtn.onclick=function(){
      if(rolling)return; rolling=true; pick=null; play("rattle"); var cnt=0;
      var iv=setInterval(function(){ for(var i=0;i<n;i++) if(!kept[i]) vals[i]=rnd(6); cnt++; render(); if(cnt>=12){ clearInterval(iv); rolling=false; render(); if(opts.onChange)opts.onChange(vals.slice()); if(opts.onRoll)opts.onRoll(vals.slice(),true); } },70);
    };
    render();
    return {
      get:function(){return vals.slice();}, kept:function(){return kept.slice();},
      set:function(v){ vals=v.slice(); pick=null; render(); }, clear:function(keepKept){ for(var i=0;i<n;i++){ if(!(keepKept&&kept[i])) vals[i]=null; if(!keepKept)kept[i]=false; } pick=null; render(); },
      setKept:function(k){ kept=k.slice(); render(); }, lock:function(on){ if(rollBtn)rollBtn.disabled=!!on; }, render:render, setLabel:function(t){ if(rollBtn)rollBtn.textContent=t; }
    };
  }

  /* ---- players ---- */
  function renderPlayers(){
    var p=el("players"); if(!p)return;
    p.innerHTML=S.players.map(function(q,i){ return '<button class="player'+(i===S.active?' active':'')+'" data-i="'+i+'"><span class="name">'+esc(q.name)+'</span><span class="stats"><b>'+q.slokken+'</b> slokken · <b>'+half(q.atjes)+'</b> atjes</span></button>'; }).join("")+'<button class="player add" id="addPlayer">+ speler</button><button class="player add" id="editPlayers">✎ spelers</button>'; renderHomePlayers();
  }
  function half(x){ x=Math.round((x||0)*2)/2; var w=Math.floor(x), h=x-w>=0.5; return (w||!h?String(w):"")+(h?"½":""); } /* 0.5 → ½, 1.5 → 1½ */
  function refreshGame(){ if(current&&current.refresh)try{current.refresh();}catch(e){} }
  /* ---- spelersscherm: overal (beginscherm en elk spel) toevoegen, hernoemen en verwijderen, zonder de beurt te verzetten ---- */
  function renderHomePlayers(){
    var h=el("homePlayers"); if(!h)return;
    h.innerHTML='<button class="link" id="homePlayersBtn">Spelers ('+S.players.length+'): <b>'+esc(S.players.map(function(q){return q.name;}).join(", "))+'</b> · aanpassen</button>';
  }
  function playersChanged(){ if(S.active>=S.players.length)S.active=0; save(); renderPlayers(); refreshGame(); }
  function openPlayers(){
    var p=el("sheetPanel"); closeName();
    function draw(focusNew){
      var h='<button class="btn close" id="sheetClose">Klaar</button><h2>Spelers</h2><p class="meta">Pas een naam aan, haal iemand weg of voeg iemand toe. Dit geldt voor alle spellen in de bijbel; Jackpot heeft zijn eigen spelers.</p>';
      S.players.forEach(function(q,i){ h+='<div class="prow"><input class="txt" data-pi="'+i+'" type="text" maxlength="20" value="'+esc(q.name)+'" autocomplete="off" aria-label="Naam speler '+(i+1)+'">'+(S.players.length>1?'<button class="btn danger" data-del="'+i+'">Verwijder</button>':'')+'</div>'; });
      h+='<div class="prow"><input class="txt" id="newPlayer" type="text" maxlength="20" placeholder="Naam nieuwe speler" autocomplete="off"><button class="btn primary" id="newPlayerOk">Toevoegen</button></div>';
      if(S.players.length===1) h+='<p class="meta">Er blijft altijd één speler over.</p>';
      p.innerHTML=h;
      el("sheetClose").onclick=closeRules; el("newPlayerOk").onclick=add;
      el("newPlayer").onkeydown=function(e){ if(e.key==="Enter")add(); };
      if(focusNew) el("newPlayer").focus();
    }
    function add(){ var nm=el("newPlayer").value.trim(); if(!nm)return; S.players.push({name:nm,slokken:0,atjes:0}); playersChanged(); draw(true); }
    /* een naam typen werkt meteen door in de balk; het lopende spel ververst bij het sluiten */
    p.oninput=function(e){ var a=e.target.getAttribute?e.target.getAttribute("data-pi"):null; if(a===null)return; var nm=e.target.value.trim(); if(nm&&S.players[+a]){ S.players[+a].name=nm; save(); renderPlayers(); } };
    p.onclick=function(e){ var b=e.target.closest?e.target.closest("[data-del]"):null; if(!b)return; var i=+b.getAttribute("data-del"); if(S.players.length<=1||!S.players[i])return; S.players.splice(i,1); if(i<S.active)S.active--; playersChanged(); draw(false); };
    onSheetClose=function(){ p.oninput=null; p.onclick=null; refreshGame(); };
    draw(false); el("sheet").className="sheet open";
  }
  var nameTarget=null;
  function openName(i){ nameTarget=i; var f=el("nameform"), inp=el("nameInput"); inp.value=i===null?"":S.players[i].name; inp.placeholder=i===null?"Naam nieuwe speler":"Naam"; el("nameDel").style.display=(i!==null&&S.players.length>1)?"":"none"; f.className="nameform open"; inp.focus(); }
  function closeName(){ el("nameform").className="nameform"; nameTarget=null; }
  function drink(i,n,reason){ if(S.players[i]){ S.players[i].slokken+=n; } save(); renderPlayers(); }
  function atje(i,n){ if(S.players[i]){ S.players[i].atjes+=(n||1); } save(); renderPlayers(); }
  function others(i){ return S.players.map(function(p,j){return j;}).filter(function(j){return j!==i;}); }
  function name(i){ return S.players[i]?S.players[i].name:"?"; }
  function nextPlayer(){ S.active=(S.active+1)%S.players.length; save(); renderPlayers(); return S.active; }
  function joinNames(a){ a=a.map(function(i){return typeof i==="number"?name(i):i;}); return a.length<=1?a.join(""):a.slice(0,-1).join(", ")+" en "+a[a.length-1]; }

  /* ---- views / routing ---- */
  var GAMES={}, current=null;
  function register(g){ GAMES[g.id]=g; }
  function show(view){ document.querySelectorAll(".view").forEach(function(v){ v.classList.toggle("active",v.id==="view-"+view); }); el("bar-home").style.display=view==="home"?"":"none"; el("bar-game").style.display=view==="home"?"none":""; el("playersWrap").style.display=(view==="game")?"":"none"; if(view!=="game") el("ucBanner").style.display="none"; }
  function openGame(id){
    var g=GAMES[id]; if(!g)return;
    if(current&&current.destroy)try{current.destroy();}catch(e){}
    current=g; S.game=id; save();
    el("gameTitle").textContent=g.title;
    if(g.frame){ var fr=el("jpframe"); if(!fr.getAttribute("src"))fr.setAttribute("src","../index.html?bijbel=1"); show("frame"); return; }
    var root=el("view-game"); root.innerHTML=""; show("game"); renderPlayers();
    el("ucBanner").style.display=g.beta?"":"none";
    el("btnKans").style.display=g.kans?"":"none";
    try{ g.init(root); }catch(e){ root.innerHTML='<p class="hint">Dit spel kon niet starten: '+esc(e.message)+'</p>'; }
  }
  function goHome(){ if(current&&current.destroy)try{current.destroy();}catch(e){} current=null; S.game=null; save(); show("home"); }

  /* ---- rules sheet ---- */
  var RULES=[]; /* filled from data */
  function rulesFor(title){ return RULES.filter(function(r){return r.title===title;})[0]; }
  function openRules(title,startId){
    var r=rulesFor(title); var p=el("sheetPanel");
    if(!r){ p.innerHTML='<button class="btn close" id="sheetClose">Sluiten</button><h2>'+esc(title)+'</h2><p class="meta">Geen regels gevonden.</p>'; }
    else {
      var h='<button class="btn close" id="sheetClose">Sluiten</button><h2>'+esc(r.title)+' '+pullen(r.pullen)+'</h2><p class="meta">'+(r.spelers?'Spelers: '+esc(r.spelers)+'. ':'')+(r.glas?'In één glas: '+esc(r.glas)+'.':'')+'</p>';
      if(r.benodigdheden.length) h+='<h3>Benodigdheden</h3><ul>'+r.benodigdheden.map(function(b){return '<li>'+esc(b)+'</li>';}).join("")+'</ul>';
      r.secties.forEach(function(s){ h+='<h3>'+esc(s.kop)+'</h3><ul>'+s.regels.map(function(x){ var sub=/^([IVX]+\.|[ivx]+\.|Voorbeeld|Hint|N\.B\.|Let op)/.test(x); return '<li'+(sub?' class="sub"':'')+'>'+esc(x.replace(/^\d+\.\s*/,""))+'</li>'; }).join("")+'</ul>'; });
      if(startId&&GAMES[startId]) h+='<div class="btnrow startrow"><button class="btn gold" id="sheetStart">Spelen</button></div>';
      p.innerHTML=h;
    }
    el("sheet").className="sheet open";
    el("sheetClose").onclick=closeRules;
    var st=el("sheetStart"); if(st) st.onclick=function(){ closeRules(); openGame(startId); };
  }
  var onSheetClose=null;
  function closeRules(){ el("sheet").className="sheet"; if(onSheetClose){ var f=onSheetClose; onSheetClose=null; f(); } }

  /* ---- home ---- */
  var CATS=[["Een spel kaarten",["99","Fuck the Dealer","Kaartje Blazen","Kingsen","Magic Bussen","Piramide Spel","Poefen","Paardenrace","Vierkanten","Sixteen","Total Black-Out"]],
    ["Kaarten en dobbelstenen",["Kaartje Dobbelen"]],
    ["Eén dobbelsteen",["Chinees Roulette","Oude Bami, Nieuwe Bami","Vieren","Eigen Risico"]],
    ["Twee dobbelstenen",["Drommels","7, 8, 9","Blind Mexxen","Driemannen","Jackpot","Mexxpot","Mexx","PowerMexx","Inverse Mexx","Nostradamus PowerMexx","Ottomaans Mexx","Snelmexx"]],
    ["Drie tot zes dobbelstenen",["1’tje Gooien","Tegendraads","Straatje Leggen","Adtzee","Nixxen","Streepjesspel"]],
    ["Dobbelstenen per speler",["Jessen","Liar’s Dice"]],
    ["Pingpongbal en bekers",["Beerpong","Stack Cup"]],
    ["Geen benodigdheden",["21’en","Duikboten","Handje klap","Kneiteren","Tafeltennis","Vinger op ‘t Glaasje","Hazen"]]];
  /* bier (0 weinig,1 gemiddeld,2 veel) x complexiteit (0 laag,1 gemiddeld,2 hoog), uit de Bierspel Tabel */
  var TABEL={"Sixteen":[0,0],"Kneiteren":[0,0],"Kingsen":[0,1],"99":[0,1],"Snelmexx":[0,1],"Handje klap":[0,1],"Tafeltennis":[0,1],"Blind Mexxen":[0,2],"Liar’s Dice":[0,2],"21’en":[0,2],
    "Kaartje Blazen":[1,0],"Paardenrace":[1,0],"Kaartje Dobbelen":[1,0],"Chinees Roulette":[1,0],"Driemannen":[1,0],"1’tje Gooien":[1,0],"Beerpong":[1,0],"Stack Cup":[1,0],"Vinger op ‘t Glaasje":[1,0],"Hazen":[1,0],
    "Fuck the Dealer":[1,1],"Total Black-Out":[1,1],"Jackpot":[1,1],"Mexxpot":[1,1],"Mexx":[1,1],"Straatje Leggen":[1,1],"Piramide Spel":[1,2],"Nixxen":[1,2],
    "Poefen":[2,0],"Eigen Risico":[2,0],"7, 8, 9":[2,0],"Duikboten":[2,0],"Magic Bussen":[2,1],"Tegendraads":[2,1],"Jessen":[2,1],"Adtzee":[2,2],"Streepjesspel":[2,2],
    "Vierkanten":[1,1],"Oude Bami, Nieuwe Bami":[1,0],"Vieren":[2,0],"Drommels":[1,0],"PowerMexx":[1,0],"Inverse Mexx":[1,1],"Nostradamus PowerMexx":[2,1],"Ottomaans Mexx":[1,0]};
  function gameByTitle(t){ for(var k in GAMES) if(GAMES[k].title===t) return GAMES[k]; return null; }
  function levelOf(t){ var g=gameByTitle(t); return g?(g.level||"app"):"regels"; }
  /* Hoe goed een spel in de app werkt: [ogen, pen]. 3 ogen = werkt perfect, 2 = werkt goed, 1 = niet echt handig.
     pen = de app is hier vooral scoreblok of hulpje; het spel zelf staat op tafel (of is van nature pen en papier).
     Inschatting van november 2026; pas hem hier aan als een spel na het spelen anders uitpakt. */
  var OORDEEL={"Jackpot":[3],"Mexx":[3],"PowerMexx":[3],"Inverse Mexx":[3],"Driemannen":[3],"Drommels":[3],"Vieren":[3],"Oude Bami, Nieuwe Bami":[3],"Paardenrace":[3],"Fuck the Dealer":[3],"Vierkanten":[3],"Poefen":[3],"Mexxpot":[3],
    "Kaartje Dobbelen":[2],"Total Black-Out":[2],"Straatje Leggen":[2],"Tegendraads":[2],"Nixxen":[2],"1’tje Gooien":[2],"Jessen":[2],"Nostradamus PowerMexx":[2],"Ottomaans Mexx":[2],"Magic Bussen":[2],
    "Kingsen":[2,1],"Chinees Roulette":[2,1],"Eigen Risico":[2,1],"7, 8, 9":[2,1],"Adtzee":[2,1],"Streepjesspel":[2,1],
    "99":[1],"Sixteen":[1],"Liar’s Dice":[1],"Blind Mexxen":[1],"Piramide Spel":[1],"Snelmexx":[1]};
  var OORDEEL_TXT={3:"werkt perfect",2:"werkt goed",1:"niet echt handig"};
  var PEN='<svg class="pen" viewBox="0 0 24 24" role="img" aria-label="scoreblok"><path d="M4 20l1-4.5L16.5 4a2.1 2.1 0 0 1 3 3L8 18.5 4 20z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M14.5 6l3 3" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  function oordeelOf(t){ var o=OORDEEL[t]; return (o&&gameByTitle(t))?{r:o[0],pen:!!o[1]}:null; }
  function ogen(r){ var h='<span class="ogen" role="img" aria-label="'+OORDEEL_TXT[r]+'">'; for(var i=1;i<=3;i++)h+='<i'+(i<=r?' class="on"':'')+'></i>'; return h+'</span>'; }
  var homeFilter=null;
  function legendHtml(){
    function b(f,cls,inner){ return '<button class="chip '+cls+'" data-f="'+f+'" aria-pressed="false">'+inner+'</button>'; }
    return '<p class="legendcap">Hoe goed werkt het in de app? Tik om te filteren.</p><div class="legend">'+
      b("3","r3",ogen(3)+'werkt perfect')+b("2","r2",ogen(2)+'werkt goed')+b("1","r1",ogen(1)+'niet echt handig')+
      b("pen","",PEN+'scoreblok')+b("regels","",'alleen regels')+'</div>';
  }
  function setFilter(f){
    homeFilter=(homeFilter===f)?null:f; var v=el("view-home");
    Array.prototype.forEach.call(v.querySelectorAll("[data-f]"),function(b){ b.setAttribute("aria-pressed",String(b.getAttribute("data-f")===homeFilter)); });
    Array.prototype.forEach.call(v.querySelectorAll("[data-t]"),function(b){ var r=b.getAttribute("data-r"), ok=!homeFilter||(homeFilter==="pen"?b.getAttribute("data-pen")==="1":homeFilter==="regels"?!r:r===homeFilter); b.hidden=!ok; });
    Array.prototype.forEach.call(v.querySelectorAll(".cat"),function(c){ c.hidden=!c.querySelector(".gitem:not([hidden])"); });
  }
  function renderHome(){
    var v=el("view-home"), h='<div class="hero"><p class="ed">Jeroen en Kevins</p><h1>Bierspelbijbel</h1><p>Tweede editie, januari 2024. Nu met rekenwerk.</p><button class="link" id="voorwoord">Voorwoord</button></div><div class="homeplayers" id="homePlayers"></div>';
    h+=legendHtml()+'<div class="tabel"><span></span><span class="h">Laag</span><span class="h">Gemiddeld</span><span class="h">Hoog</span>';
    ["Weinig bier","Gemiddeld","Veel bier"].forEach(function(lbl,bi){
      h+='<span class="h row">'+lbl+'</span>';
      for(var ci=0;ci<3;ci++){ h+='<span class="cell">'+Object.keys(TABEL).filter(function(t){return TABEL[t][0]===bi&&TABEL[t][1]===ci;}).map(function(t){ var o=oordeelOf(t); return '<button class="chip '+(o?'r'+o.r:'regels')+'" data-t="'+esc(t)+'"'+(o?' data-r="'+o.r+'"'+(o.pen?' data-pen="1"':''):'')+'>'+esc(t)+(o&&o.pen?PEN:'')+'</button>'; }).join("")+'</span>'; }
    });
    h+='</div>';
    CATS.forEach(function(c){ h+='<div class="cat"><h2>'+esc(c[0])+'</h2><div class="glist">'+c[1].map(function(t){ var g=gameByTitle(t), r=rulesFor(t), o=oordeelOf(t); var sub=g?g.sub:(r&&r.benodigdheden.length?r.benodigdheden.slice(0,2).join(", "):""); return '<button class="gitem '+(o?'r'+o.r:'regels')+'" data-t="'+esc(t)+'"'+(o?' data-r="'+o.r+'"'+(o.pen?' data-pen="1"':''):'')+'><span><span class="t">'+esc(t)+' '+pullen(r?r.pullen:null)+'</span><span class="s">'+esc(sub||"")+(r&&r.glas?' · '+esc(r.glas)+' in een glas':'')+'</span></span><span class="tag">'+(o?(o.pen?PEN:'')+ogen(o.r):"regels")+'</span></button>'; }).join("")+'</div></div>'; });
    h+='<p class="amen">Moge deze bijbel ook in uw handen heilig blijven.<br><span>SV KoKo, Commissie tot de Bar</span></p>';
    v.innerHTML=h;
    el("voorwoord").onclick=function(){ var p=el("sheetPanel"); p.innerHTML='<button class="btn close" id="sheetClose">Sluiten</button><h2>Voorwoord</h2>'+VOORWOORD.map(function(x,i){ return i===0?'<p class="meta">'+esc(x)+'</p>':'<p class="vw">'+esc(x)+'</p>'; }).join("")+'<p class="vw"><em>Eerste editie september 2016 door Jeroen Velzing, commissaris CtB 2013-2014. Tweede editie januari 2024 door Kevin Bruggeman. Deze app: Stijn, 2026.</em></p>'; el("sheet").className="sheet open"; el("sheetClose").onclick=closeRules; };
  }
  function tapTitle(t){ var g=gameByTitle(t); if(g&&g.level!=="regels") openGame(g.id); else openRules(t,g?g.id:null); }

  /* ---- init ---- */
  var VOORWOORD=[];
  function init(rules,voorwoord){
    RULES=rules; VOORWOORD=voorwoord||[]; renderHome(); renderPlayers();
    el("view-home").addEventListener("click",function(e){ var fb=e.target.closest("[data-f]"); if(fb){ setFilter(fb.getAttribute("data-f")); return; } if(e.target.closest("#homePlayersBtn")){ openPlayers(); return; } var b=e.target.closest("[data-t]"); if(b)tapTitle(b.getAttribute("data-t")); });
    el("btnBack").onclick=goHome;
    el("btnRules").onclick=function(){ if(current) openRules(current.rules||current.title); };
    el("btnKans").onclick=function(){ S.kans=!S.kans; applyFlags(); save(); if(current&&current.refresh)current.refresh(); };
    el("btnSound").onclick=function(){ S.sound=!S.sound; applyFlags(); save(); ctx(); };
    el("players").addEventListener("click",function(e){ var a=e.target.closest("#addPlayer"); if(a){openName(null);return;} if(e.target.closest("#editPlayers")){openPlayers();return;} var b=e.target.closest(".player"); if(!b)return; var i=+b.getAttribute("data-i"); if(i===S.active)openName(i); else { S.active=i; save(); renderPlayers(); if(current&&current.onPlayer)current.onPlayer(i); } });
    el("nameCancel").onclick=closeName;
    el("nameOk").onclick=function(){ var nm=el("nameInput").value.trim(); if(!nm){closeName();return;} if(nameTarget===null)S.players.push({name:nm,slokken:0,atjes:0}); else S.players[nameTarget].name=nm; closeName(); save(); renderPlayers(); refreshGame(); };
    el("nameDel").onclick=function(){ if(nameTarget!==null&&S.players.length>1){ var i=nameTarget; S.players.splice(i,1); if(i<S.active)S.active--; if(S.active>=S.players.length)S.active=0; } closeName(); save(); renderPlayers(); refreshGame(); };
    el("overlay").addEventListener("click",function(){ var o=el("overlay"); if(o.className.indexOf("sticky")>=0){ o.className="overlay"; if(onOverlayClose){var f=onOverlayClose;onOverlayClose=null;f();} } });
    el("sheet").addEventListener("click",function(e){ if(e.target.id==="sheet")closeRules(); });
    applyFlags();
    if(S.game&&GAMES[S.game]) openGame(S.game); else show("home");
  }
  var onOverlayClose=null;
  function applyFlags(){ document.body.classList.toggle("nokans",!S.kans); el("btnKans").setAttribute("aria-pressed",String(S.kans)); el("btnSound").textContent=S.sound?"🔊":"🔇"; }

  /* ---- toast (korte melding bovenin, botst niet met de overlay van een spel) ---- */
  var toastTimer=null;
  function toast(title,sub,ms){
    var t=el("toast"); if(!t){ t=document.createElement("div"); t.id="toast"; t.className="toast"; document.body.appendChild(t); }
    t.innerHTML='<b>'+esc(title)+'</b>'+(sub?'<span>'+esc(sub)+'</span>':''); t.className="toast show";
    clearTimeout(toastTimer); toastTimer=setTimeout(function(){ t.className="toast"; },ms||4200);
    t.onclick=function(){ t.className="toast"; };
  }
  /* ---- adtje kruk (regel uit Jackpot, geldt bij elk spel met twee dobbelstenen): drie keer op rij dezelfde ogen,
     ook door beurten en spelers heen, ook als er een steen is blijven liggen (zoals bij Mexx). Roep aan bij ELKE worp waarbij één speler met twee stenen gooit;
     niet bij spellen waar ieder één steen gooit (Drommels, Jessen) en niet bij één, drie of meer stenen. ---- */
  function kruk(id,vals,player){
    if(!vals||vals.length!==2||!vals[0]||!vals[1]) return false;
    var g=S.gs[id]=S.gs[id]||{}, key=Math.min(vals[0],vals[1])+"-"+Math.max(vals[0],vals[1]);
    g._kruk=g._kruk||[]; g._kruk.push(key); if(g._kruk.length>3)g._kruk.shift();
    if(g._kruk.length===3&&g._kruk[0]===key&&g._kruk[1]===key){
      g._kruk=[]; atje(player,1); play("dood");
      toast("Adtje kruk!",name(player)+" gooit voor de derde keer op rij "+vals[0]+" en "+vals[1]+". Adtje op de kruk, het spel gaat door.",6000); return true;
    }
    save(); return false;
  }
  function krukReset(id){ if(S.gs[id]) S.gs[id]._kruk=[]; save(); }

  /* ---- kaarten ---- */
  var SUITS=["♠","♥","♦","♣"], RANKS=["","A","2","3","4","5","6","7","8","9","10","B","V","H"];
  function shuffle(a){ for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), x=a[i]; a[i]=a[j]; a[j]=x; } return a; }
  /* deck(jokers): geschud spel van 52 kaarten {r:1..13 (1=aas, 11=boer, 12=vrouw, 13=heer), s:0..3 (schoppen, harten, ruiten, klaveren)}; joker = {r:0,s:-1} */
  function deck(jokers){ var d=[]; for(var s=0;s<4;s++)for(var r=1;r<=13;r++)d.push({r:r,s:s}); for(var j=0;j<(jokers||0);j++)d.push({r:0,s:-1}); return shuffle(d); }
  function isRed(c){ return c.s===1||c.s===2; }
  function cardName(c){ return c.r===0?"Joker":SUITS[c.s]+" "+RANKS[c.r]; }
  /* cardHtml(c,cls): c=null of cls bevat 'back' geeft een dichte kaart */
  function cardHtml(c,cls){ cls=cls||""; if(!c||/back/.test(cls)) return '<span class="card back '+cls.replace(/back/,"")+'"></span>'; return '<span class="card'+(c.r===0?' joker':isRed(c)?' red':'')+' '+cls+'"><b>'+(c.r===0?"★":RANKS[c.r])+'</b><i>'+(c.r===0?"joker":SUITS[c.s])+'</i></span>'; }
  /* ---- telefoon doorgeven: scherm afdekken tot de juiste speler tikt ---- */
  function handover(i,sub,cb){ overlay("info","Telefoon naar "+name(i),[sub||"Laat niemand meekijken."],0); onOverlayClose=cb; }

  return { el:el, esc:esc, pct:pct, num:num, rnd:rnd, S:S, save:save, play:play, overlay:overlay, dicerow:dicerow, pips:pips, Dice:Dice,
    drink:drink, atje:atje, others:others, name:name, nextPlayer:nextPlayer, joinNames:joinNames, renderPlayers:renderPlayers,
    dicerowSmall:dicerowSmall, register:register, openGame:openGame, goHome:goHome, openRules:openRules, init:init, gs:function(id){ S.gs[id]=S.gs[id]||{}; return S.gs[id]; },
    onOverlayClose:function(f){ onOverlayClose=f; },
    toast:toast, kruk:kruk, krukReset:krukReset, shuffle:shuffle, deck:deck, isRed:isRed, cardName:cardName, cardHtml:cardHtml, handover:handover, SUITS:SUITS, RANKS:RANKS };
})();

