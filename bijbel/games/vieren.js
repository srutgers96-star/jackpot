/* ===== Vieren ===== */
(function(){
  "use strict";
  var A=App, el=A.el, esc=A.esc;
  /* De bijbel: "8 slokken" in een glas. Een halve bak boeken we daarom als 4 slokken, een volledige bak als een adtje. */
  var GLAS=8, HALF=GLAS/2;
  /* tick: elke render en elke destroy hoogt hem op, zodat een worp die nog uitrolt nooit op een oud scherm landt */
  var tick=0;
  /* watch: kijkt mee met de spelersbalk, want core meldt een hernoemde of verwijderde speler niet aan het spel */
  var watch=null;
  if(!document.getElementById("vieren-style")){
    var css=document.createElement("style"); css.id="vieren-style";
    css.textContent=
      ".vieren-call{display:block;width:100%;max-width:360px;min-height:60px;margin:4px auto 2px;padding:10px 16px;border-radius:14px;border:2px solid var(--gold);background:rgba(231,184,79,.14);color:var(--ivory);font-size:24px;font-weight:900;letter-spacing:.02em;line-height:1.15;}"+
      ".vieren-call small{display:block;font-size:12px;font-weight:500;letter-spacing:0;color:var(--ivory-dim);margin-top:3px;}"+
      ".vieren-call[aria-pressed=\"true\"]{background:var(--green);border-color:var(--green);color:var(--ink);}"+
      ".vieren-call[aria-pressed=\"true\"] small{color:var(--ink);}"+
      ".vieren-call:disabled{opacity:.5;}"+
      ".vieren-who{color:var(--gold);font-size:17px;}"+
      ".vieren-legend{font-size:12px;line-height:1.45;padding:2px 0 0;}"+
      ".vieren-btns .btn{min-height:44px;}"+
      ".vieren-log .dsmall{width:24px;height:24px;padding:3px;border-radius:6px;}"+
      ".vieren-log .dsmall .pip{width:5px;height:5px;}";
    document.head.appendChild(css);
  }
  A.register({ id:"vieren", beta:true, title:"Vieren", level:"app", kans:true, sub:"Vier roepen, gooien: slok, halve bak of volle bak",
    init:function(root){
      var G=A.gs("vieren");
      if(!Array.isArray(G.log))G.log=[];
      G.beurten=G.beurten||0; G.vieren=G.vieren||0; G.vergeten=G.vergeten||0; G.called=!!G.called;
      var rolling=false, snap=false, shown=null;
      function cur(){ if(!(A.S.active>=0&&A.S.active<A.S.players.length)){ A.S.active=0; A.save(); A.renderPlayers(); } return A.S.active; }
      /* een geroepen vier hoort bij de speler die riep: is intussen iemand anders aan de beurt (ander spel, herladen), dan vervalt hij */
      if(G.called&&G.calledBy!==A.name(cur())){ G.called=false; A.save(); }
      function addLog(o){ G.log.unshift(o); if(G.log.length>12)G.log.length=12; }
      /* de laatste boeking mag terug als er verkeerd getikt is (verkeerde ogen ingevoerd, wel geroepen maar de knop vergeten) */
      function canUndo(){ var L=G.last; return !!(L&&A.S.players[L.i]&&A.S.players[L.i].name===L.nm); }
      /* De knop is het roepen. Wie de steen gooit (digitaal of een echte steen invoert) zonder dat de knop aan staat, heeft niet geroepen. */
      function paintCall(){
        var b=el("vierenCall"), hint=el("vierenHint"); if(!b)return;
        b.setAttribute("aria-pressed",String(G.called)); b.disabled=rolling;
        b.innerHTML=G.called?'VIER! geroepen<small>gooi nu de steen</small>':'Roep: VIER!<small>tik dit voordat je gooit</small>';
        if(hint&&shown) hint.innerHTML='<b class="vieren-who">'+esc(shown.nm)+'</b> '+(rolling?'gooit…':G.called?'riep vier: gooi nu de steen.':'is aan de beurt: roep eerst VIER, gooi dan de steen.');
      }
      function onRoll(v,digital){
        var i=cur(), x=v[0], nm=A.name(i), n=A.S.players.length;
        /* Regel 1: roepen "alvorens te gooien". Bij de digitale worp telt dus de stand van de knop op het moment dat de steen ging rollen. */
        var called=(digital&&rolling)?snap:G.called;
        rolling=false; G.called=false;
        if(!called){
          /* Regel 2: niet geroepen = zelf een halve bak en opnieuw gooien. De worp zelf telt niet, ook niet als het een vier was. */
          A.drink(i,HALF); G.vergeten++; addLog({who:nm,k:"vergeten"}); G.last={i:i,nm:nm,k:"vergeten",sl:HALF,at:0}; A.save();
          A.play("dood");
          /* korte woorden in de titel: die staat in reuzenletters en moet op 360 px passen */
          A.overlay("dood","Halve bak!",[nm+" riep geen vier voor het gooien en neemt een halve bak ("+HALF+" slokken).","De worp telt niet. "+nm+" roept vier en gooit opnieuw."],0);
          render(); return;
        }
        G.beurten++;
        if(x===4){
          /* Regel 3: vier geroepen en vier gegooid = zelf een volledige bak */
          A.atje(i,1); G.vieren++; addLog({who:nm,k:"vier",v:4}); G.last={i:i,nm:nm,k:"vier",sl:0,at:1}; A.save();
          A.play("win");
          A.overlay("win","VIER!",[nm+" trekt een volledige bak (adtje) om de winst te vieren."].concat(n>1?["Daarna gaat de steen naar "+A.name((i+1)%n)+"."]:[]),0,A.dicerow([4]));
        } else {
          /* Regel 4: vier geroepen en geen vier = zelf een slok */
          A.drink(i,1); addLog({who:nm,k:"slok",v:x}); G.last={i:i,nm:nm,k:"slok",sl:1,at:0}; A.save();
          A.play("ding");
          A.overlay("info","Slok",[nm+" gooit "+x+", geen vier.",nm+" neemt een slok om het verdriet weg te drinken."],2400,A.dicerow([x]));
        }
        /* Regel 5: de steen gaat met de klok mee door = de volgende in de spelerslijst */
        A.nextPlayer(); render();
      }
      function undo(){
        var L=G.last; if(!canUndo()){ G.last=null; A.save(); render(); return; }
        var p=A.S.players[L.i];
        if(L.sl)A.drink(L.i,-Math.min(L.sl,p.slokken));
        if(L.at&&p.atjes>=L.at)A.atje(L.i,-L.at);
        if(L.k==="vergeten")G.vergeten=Math.max(0,G.vergeten-1);
        else { G.beurten=Math.max(0,G.beurten-1); if(L.k==="vier")G.vieren=Math.max(0,G.vieren-1); }
        if(G.log.length&&G.log[0].who===L.nm&&G.log[0].k===L.k)G.log.shift();
        G.last=null; G.called=false; A.S.active=L.i; A.save(); A.renderPlayers(); render();
        A.toast("Teruggedraaid","De laatste worp van "+L.nm+" is uit de telling. "+L.nm+" is weer aan de beurt.",3500);
      }
      function render(){
        var token=++tick; rolling=false;
        var i=cur(), n=A.S.players.length, h='';
        shown={i:i,nm:A.name(i)};
        /* 2 of meer spelers volgens de bijbel; in je eentje werkt het technisch gewoon, dus alleen een melding, geen blokkade */
        if(n<2) h+='<p class="hint">Vieren speel je met twee of meer spelers. Voeg iemand toe met + speler hierboven.</p>';
        h+='<div class="board"><div class="stat"><span>Beurten: <b>'+G.beurten+'</b></span><span>Vieren: <b>'+G.vieren+'</b></span><span>Niet geroepen: <b>'+G.vergeten+'</b></span></div>'+
          '<div class="stat kans"><span>Kans op vier: <b>'+A.pct(1/6)+'</b></span><span>Gemiddeld <b>'+A.num((GLAS+5)/6)+'</b> slokken per beurt</span></div></div>';
        h+='<p class="hint" id="vierenHint"></p>';
        h+='<button class="vieren-call" id="vierenCall" aria-pressed="false"></button>';
        h+='<div id="vierenDice"></div>';
        h+='<p class="hint vieren-legend">Vier gegooid: volledige bak (adtje). Geen vier: één slok. Niet geroepen: halve bak ('+HALF+' slokken) en opnieuw gooien.<br>Met een echte dobbelsteen: roep vier, gooi, tik dan op de steen hierboven en kies de ogen.</p>';
        h+='<div class="log vieren-log">'+G.log.map(function(x){
          return '<div><b>'+esc(x.who)+'</b> '+(x.k==="vergeten"?'riep geen vier: halve bak ('+HALF+' slokken), opnieuw gooien':
            x.k==="vier"?A.dicerowSmall([4])+' vier! Volledige bak':A.dicerowSmall([x.v])+' geen vier, een slok')+'</div>';
        }).join("")+'</div>';
        h+='<div class="btnrow vieren-btns">'+(canUndo()?'<button class="btn" id="vierenUndo">Vergissing? Worp terugdraaien</button>':'')+'<button class="btn" id="vierenNew">Nieuw spel</button></div>';
        root.innerHTML=h;
        var box=el("vierenDice");
        A.Dice(box,{n:1,label:"Gooi",onRoll:function(v,digital){ if(token!==tick)return; onRoll(v,digital); }});
        /* vangfase: leg vast of er geroepen was op het moment dat de digitale steen begon te rollen; daarna nog tikken is te laat */
        box.addEventListener("click",function(e){ if(token!==tick||rolling||!e.target.closest||!e.target.closest(".roll"))return; rolling=true; snap=G.called; paintCall(); },true);
        el("vierenCall").onclick=function(){ if(rolling)return; G.called=!G.called; G.calledBy=A.name(cur()); A.save(); if(G.called)A.play("ding"); paintCall(); };
        el("vierenNew").onclick=function(){ G.log=[]; G.beurten=0; G.vieren=0; G.vergeten=0; G.called=false; G.last=null; A.save(); render(); };
        var u=el("vierenUndo"); if(u)u.onclick=undo;
        paintCall();
      }
      render();
      /* een andere speler aangetikt: die begint een verse beurt en moet zelf nog roepen */
      this.onPlayer=function(){ G.called=false; A.save(); render(); };
      /* speler hernoemd of verwijderd (core tekent dan alleen de spelersbalk opnieuw): scherm bijwerken, en een geroepen vier gaat niet mee naar een ander */
      if(watch){ watch.disconnect(); watch=null; }
      var bar=el("players");
      if(bar&&typeof MutationObserver==="function"){
        watch=new MutationObserver(function(){
          var i=cur(); if(!shown||(shown.i===i&&shown.nm===A.name(i)))return;
          G.called=false; A.save(); render();
        });
        watch.observe(bar,{childList:true});
      }
    },
    destroy:function(){ tick++; if(watch){ watch.disconnect(); watch=null; } }
  });
})();
