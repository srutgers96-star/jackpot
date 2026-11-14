/* ===== Poefen ===== */
/* De telefoon is de stapel van de verdediger: de aanvaller tikt de kaart die hij noemt (soort + waarde), de app draait de
   bovenste kaart en rekent af. Keuzes waar de bijbel ruimte laat:
   - "Links van de dealer" en "met de klok mee" = de volgende speler in de spelersbalk, net als in de andere spellen.
   - Regel 5: de rol van verdediger schuift na de eigen beurt van de verdediger altijd door (goed of fout), naar analogie
     van regel 3 waar de beurt ook altijd doorschuift; een ronde is dus precies één rondje tafel.
   - Regel 4, "iedereen drinkt": alle andere spelers, de verdediger zelf niet.
   - De Poef: de inzet wordt één keer afgerekend, op de eerstvolgende kaart die gedraaid wordt (zo staat het in het
     voorbeeld). Kiezen is een recht van de verdediger ("mag"), dus "Geen Poef" kan ook.
   - Is de stapel op, dan wordt er een nieuw spel van 52 kaarten geschud; de bijbel noemt geen einde.
   - Vol raak (5 slokken) krijgt een scherm dat blijft staan tot er getikt wordt, zodat een tik niet doorvalt naar
     de knop Verder eronder. */
(function(){
  "use strict";
  var A=App, el=A.el, esc=A.esc, obs=null;
  if(!document.getElementById("poefen-style")){
    var css=document.createElement("style"); css.id="poefen-style";
    css.textContent=
      ".poefen-duel{align-items:center;gap:14px;margin:10px 0}"+
      ".poefen-vs{font-size:12px;color:var(--ivory-dim)}"+
      ".poefen-col{display:flex;flex-direction:column;align-items:center;gap:6px}"+
      ".poefen-col small{font-size:12px;color:var(--ivory-dim)}"+
      ".poefen-ghost{background:rgba(243,233,210,.1);box-shadow:none;border:2px dashed rgba(243,233,210,.4);color:var(--ivory-dim)}"+
      ".poefen-suits{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:8px 0}"+
      ".poefen-ranks{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:8px 0 14px}"+
      ".poefen-pick{min-height:46px;padding:0;border:0;border-radius:9px;background:linear-gradient(#fffdf6,#efe7d2);color:var(--ink);font-size:20px;font-weight:900;box-shadow:0 3px 0 #c4b793}"+
      ".poefen-suits .poefen-pick{font-size:28px;min-height:52px}"+
      ".poefen-pick.poefen-red{color:var(--red)}"+
      ".poefen-pick[aria-pressed=\"true\"]{box-shadow:0 0 0 3px var(--gold),0 3px 0 #c4b793;transform:translateY(-2px)}"+
      ".poefen-has .poefen-pick[aria-pressed=\"false\"]{opacity:.5}"+
      ".poefen-tap{min-height:44px}"+
      ".poefen-seg button{min-height:44px;min-width:48px;font-size:16px}"+
      ".poefen-legend{font-size:12px;padding:0 0 4px}"+
      ".poefen-sum{justify-content:center;gap:14px;margin:0 0 10px;font-size:15px}"+
      ".poefen-flipin{animation:popin .35s cubic-bezier(.2,1.4,.4,1)}";
    document.head.appendChild(css);
  }
  function sl(n){ return n+" "+(n===1?"slok":"slokken"); }
  function kleur(red){ return red?"rood":"zwart"; }
  /* de kaart die genoemd wordt, ook als er pas een soort of pas een waarde gekozen is */
  function guessHtml(s,r){
    var none=s===null&&r===null;
    return '<span class="card'+(none?' poefen-ghost':'')+(s===1||s===2?' red':'')+'"><b>'+(r===null?'?':A.RANKS[r])+'</b><i>'+(s===null?(none?'':'?'):A.SUITS[s])+'</i></span>';
  }
  var SOORT=["schoppen","harten","ruiten","klaveren"];

  A.register({ id:"poefen", beta:true, title:"Poefen", level:"app", sub:"Noem een kaart: de app draait, rekent af en regelt de Poef",
    init:function(root){
      var G=A.gs("poefen"), lastSig="", flipAt=0;
      function int(v,lo,hi){ return typeof v==="number"&&v%1===0&&v>=lo&&v<=hi; }
      function isCard(c){ return !!c&&int(c.r,1,13)&&int(c.s,0,3); }
      function P(){ return A.S.players; }
      function names(){ return P().map(function(p){return p.name;}); }
      function sig(){ return names().join("\n"); }
      function fresh(d){
        var len=P().length;
        G.deck=A.deck(0); G.def=(d>=0&&d<len)?d:0; G.turn=(G.def+1)%len; G.phase="poef"; G.poef=null;
        G.pick={s:null,r:null}; G.last=null; G.log=[]; G.turned=0; G.n=len; G.names=names(); A.save();
      }
      /* op welke plek zit speler i uit de oude spelerslijst nu? -1 = hij is weg. Is er precies één speler verwijderd,
         dan schuift iedereen achter hem één plek op; anders wordt er op naam gezocht. */
      function where(old,now,i){
        var k=0, j, one=now.length===old.length-1;
        if(one){ while(k<now.length&&now[k]===old[k])k++; for(j=k;j<now.length;j++) if(now[j]!==old[j+1])one=false; }
        if(one) return i<k?i:i>k?i-1:-1;
        return now[i]===old[i]?i:now.indexOf(old[i]);
      }
      /* bewaarde stand controleren en bijwerken als er spelers bij of af zijn: verdediger, beurt en Poef blijven bij
         dezelfde persoon, ook als iemand vóór hen uit de spelersbalk verdwijnt */
      function sync(){
        var len=P().length, now=names(), old=G.names, d, t, p;
        if(len<1)return;
        if(!Array.isArray(G.deck)||!G.phase||!int(G.def,0,99)||!int(G.turn,0,99)){ fresh(A.S.active); return; }
        /* een stand uit een oudere versie of een half bewaarde stand: wat niet klopt wordt leeggemaakt, geen foutmelding */
        G.deck=G.deck.filter(isCard);
        if(!G.pick||typeof G.pick!=="object")G.pick={s:null,r:null};
        if(!int(G.pick.s,0,3))G.pick.s=null;
        if(!int(G.pick.r,1,13))G.pick.r=null;
        if(!Array.isArray(G.log))G.log=[];
        if(!Array.isArray(old))old=null;
        if(G.poef&&(typeof G.poef!=="object"||!int(G.poef.i,0,99)))G.poef=null;
        if(G.poef&&G.poef.open&&(!int(G.poef.n,1,5)||typeof G.poef.red!=="boolean"))G.poef=null;
        if(G.last&&(!isCard(G.last.g)||!isCard(G.last.c)||!Array.isArray(G.last.lines)||!Array.isArray(G.last.sum)))G.last=null;
        if(old&&old.length!==len){
          d=where(old,now,G.def); t=where(old,now,G.turn);
          if(G.poef){ p=where(old,now,G.poef.i); if(p<0)G.poef=null; else G.poef.i=p; }
          if(d<0){
            /* de verdediger is weg: wie na hem zat neemt de stapel over en begint een nieuwe ronde */
            G.def=G.def%len; G.turn=(G.def+1)%len; G.phase="poef"; G.poef=null; G.last=null; G.pick={s:null,r:null};
          } else {
            G.def=d;
            if(t>=0)G.turn=t;
            else { /* wie aan de beurt was is weg: de volgende aan tafel zit nu op zijn plek */
              G.turn=G.turn%len; if(G.phase==="result"){ G.phase="guess"; G.last=null; }
            }
          }
        }
        G.n=len; G.names=now;
        if(G.def>=len||G.def<0)G.def=0;
        if(G.turn>=len||G.turn<0)G.turn=G.turn>0?G.turn%len:0;
        if(G.poef&&(G.poef.i>=len||G.poef.i===G.def))G.poef=null;
        if(G.phase==="bet"&&!G.poef)G.phase="poef";
        if(G.phase==="poef")G.turn=(G.def+1)%len;
        if(G.phase==="result"&&!G.last)G.phase="guess";
        if(G.phase!=="poef"&&G.phase!=="bet"&&G.phase!=="guess"&&G.phase!=="result")G.phase="poef";
        A.save();
      }
      /* wie moet er nu iets doen: verdediger kiest de Poef, de Poef zet in, daarna wie een kaart noemt */
      function actor(){ return G.phase==="poef"?G.def:G.phase==="bet"?G.poef.i:G.turn; }

      function flip(){
        if(P().length<2)return;
        sync();
        if(G.phase!=="guess"||G.pick.s===null||G.pick.r===null)return;
        var who=G.turn, def=G.def, own=who===def;
        if(!G.deck.length){ G.deck=A.deck(0); A.toast("Nieuwe stapel","Alle 52 kaarten zijn gedraaid. De stapel is opnieuw geschud.",3500); }
        var c=G.deck.pop(), g={r:G.pick.r,s:G.pick.s};
        var sOk=c.s===g.s, rOk=c.r===g.r, n=sOk&&rOk?5:rOk?2:sOk?1:0;
        var tally={}, lines=[], kort=[];
        function give(i,k){ A.drink(i,k); tally[i]=(tally[i]||0)+k; }
        var said=A.name(who)+" noemt "+A.cardName(g)+", de kaart is "+A.cardName(c)+". ";
        var wat=n===5?"Soort en waarde goed":n===2?"De waarde klopt":n===1?"De soort klopt":"Soort en waarde fout";
        if(n===0){ give(who,1); lines.push(said+wat+": "+A.name(who)+" drinkt zelf 1 slok."); }
        else if(own){ A.others(def).forEach(function(i){ give(i,n); }); lines.push(said+wat+" en "+A.name(def)+" is zelf de verdediger: iedereen drinkt "+sl(n)+" ("+A.joinNames(A.others(def))+")."); }
        else { give(def,n); lines.push(said+wat+": verdediger "+A.name(def)+" drinkt "+sl(n)+"."); }
        /* de Poef: alleen de eerstvolgende kaart na het inzetten */
        if(G.poef&&G.poef.open){
          var pf=G.poef, red=A.isRed(c), raak=red===pf.red, wie=raak?def:pf.i;
          pf.open=false; pf.done=true; give(wie,pf.n);
          kort.push("Poef: "+A.name(wie)+" drinkt "+sl(pf.n)+".");
          lines.push("De Poef: "+A.name(pf.i)+" zette "+sl(pf.n)+" in op "+kleur(pf.red)+" en de kaart is "+kleur(red)+". "+(raak?"Verdediger "+A.name(def)+" drinkt ":A.name(pf.i)+" drinkt zelf ")+sl(pf.n)+".");
        }
        var sum=Object.keys(tally).map(Number).sort(function(a,b){return a-b;}).map(function(i){ return [A.name(i),tally[i]]; });
        G.turned=(G.turned||0)+1; G.pick={s:null,r:null};
        G.last={g:g,c:c,n:n,title:n===5?"Vol raak!":n===2?"Waarde goed":n===1?"Soort goed":"Mis",kind:n?"win":"fout",lines:lines,sum:sum};
        G.log.unshift(A.name(who)+(own?" (verdediger)":"")+": "+A.cardName(g)+" genoemd, "+A.cardName(c)+" gedraaid. Slokken: "+sum.map(function(x){return x[0]+" "+x[1];}).join(", ")+".");
        if(G.log.length>8)G.log.length=8;
        G.phase="result"; flipAt=Date.now(); A.save();
        A.play(n===5?"special":n?"ding":"clack");
        render();
        /* blijft staan tot er getikt wordt (ms 0): een scherm dat vanzelf verdwijnt laat tikken door naar de knop Verder */
        if(n===5){ A.overlay("win","Vol raak!",[(own?"Iedereen drinkt 5 slokken":A.name(def)+" drinkt 5 slokken")+"."].concat(kort),0); A.onOverlayClose(null); }
      }
      function next(){
        if(P().length<2)return;
        sync();
        /* een dubbele tik op "Draai de kaart" mag de uitslag niet meteen wegtikken */
        if(G.phase!=="result"||Date.now()-flipAt<700)return;
        var len=P().length;
        if(G.turn===G.def){ G.def=(G.def+1)%len; G.turn=(G.def+1)%len; G.poef=null; G.phase="poef"; }
        else { G.turn=(G.turn+1)%len; G.phase="guess"; }
        G.last=null; A.save(); render();
      }

      function render(){
        var len=P().length, h="";
        lastSig=sig();
        if(len<2){
          /* de ronde vervalt: wie er straks bij komt erft geen beurt of Poef-inzet van iemand die weg is */
          if(G.phase){ G.def=0; G.turn=0; G.phase="poef"; G.poef=null; G.last=null; G.pick={s:null,r:null}; G.names=names(); A.save(); }
          root.innerHTML='<p class="hint">Poefen speel je met minstens twee spelers: een verdediger met de stapel en minstens één aanvaller. Tik hierboven op + speler.</p>'; return;
        }
        sync();
        if(A.S.active!==actor()){ A.S.active=actor(); A.save(); A.renderPlayers(); }
        var def=G.def, dn=esc(A.name(def)), pf=G.poef;
        var ptxt=!pf?"geen":esc(A.name(pf.i))+(pf.open?" · "+pf.n+" op "+kleur(pf.red):pf.done?" · afgerekend":"");
        h+='<div class="board"><div class="stat" style="margin-top:0"><span>Verdediger: <b>'+dn+'</b></span><span>Poef: <b>'+ptxt+'</b></span><span>Stapel: <b>'+G.deck.length+'</b></span></div></div>';

        if(G.phase==="poef"){
          h+='<div class="verdict neutral"><h2>Poef kiezen</h2><p><b>'+dn+'</b> heeft de stapel en verdedigt. '+dn+' mag een Poef aanwijzen: die zet 1 tot 5 slokken in op zwart of rood voor de eerstvolgende kaart. Tik op wie de Poef wordt, of op Geen Poef.</p><div class="btnrow">'+
            A.others(def).map(function(i){ return '<button class="btn primary poefen-tap" data-poef="'+i+'">'+esc(A.name(i))+'</button>'; }).join("")+
            '</div><div class="btnrow"><button class="btn poefen-tap" id="poefenNone">Geen Poef</button></div></div>';
          if(!G.turned) h+='<p class="hint">Iemand anders laten verdedigen? Tik op zijn naam hierboven.</p>';
        }
        else if(G.phase==="bet"){
          var pn=esc(A.name(pf.i)), ok=int(pf.n,1,5)&&(pf.red===true||pf.red===false);
          h+='<div class="verdict neutral"><h2>De Poef zet in</h2><p><b>'+pn+'</b> is de Poef van '+dn+' en zet 1 tot 5 slokken in op een kleur. Is de volgende kaart die kleur, dan drinkt '+dn+' de inzet. Anders drinkt '+pn+' hem zelf.</p><div class="seg poefen-seg">';
          for(var k=1;k<=5;k++) h+='<button data-n="'+k+'" aria-pressed="'+(pf.n===k)+'">'+k+'</button>';
          h+='</div><div class="seg poefen-seg"><button data-col="0" aria-pressed="'+(pf.red===false)+'">♠ ♣ zwart</button><button data-col="1" aria-pressed="'+(pf.red===true)+'">♥ ♦ rood</button></div>'+
            '<div class="btnrow"><button class="btn gold poefen-tap" id="poefenBet"'+(ok?'':' disabled')+'>'+(ok?'Zet '+sl(pf.n)+' op '+kleur(pf.red):'Zet in')+'</button><button class="btn poefen-tap" id="poefenBack">Andere Poef</button></div></div>';
          if(!ok) h+='<p class="hint">'+pn+', tik een aantal slokken en een kleur aan.</p>';
        }
        else if(G.phase==="guess"){
          var own=G.turn===def, wn=esc(A.name(G.turn)), pk=G.pick, r;
          h+='<p class="hint">'+(own?'<b>'+dn+'</b> verdedigt en raadt nu zelf. Noem een kaart: soort en waarde.':'<b>'+wn+'</b> valt <b>'+dn+'</b> aan. Noem een kaart: soort en waarde.')+'</p>';
          h+='<div class="cards poefen-duel">'+guessHtml(pk.s,pk.r)+'<span class="poefen-vs">tegen</span>'+A.cardHtml(null,"back")+'</div>';
          h+='<div class="poefen-suits'+(pk.s!==null?' poefen-has':'')+'">';
          for(var s=0;s<4;s++) h+='<button class="poefen-pick'+(s===1||s===2?' poefen-red':'')+'" data-s="'+s+'" aria-pressed="'+(pk.s===s)+'" aria-label="'+SOORT[s]+'">'+A.SUITS[s]+'</button>';
          h+='</div><div class="poefen-ranks'+(pk.r!==null?' poefen-has':'')+'">';
          for(r=1;r<=13;r++) h+='<button class="poefen-pick" data-r="'+r+'" aria-pressed="'+(pk.r===r)+'">'+A.RANKS[r]+'</button>';
          h+='</div><button class="roll" id="poefenFlip"'+(pk.s!==null&&pk.r!==null?'':' disabled')+'>Draai de kaart</button>';
          h+='<p class="hint poefen-legend">'+(own?'Soort goed: iedereen drinkt 1 · waarde goed: 2 · allebei: 5 · niets goed: '+dn+' drinkt 1':'Soort goed: '+dn+' drinkt 1 · waarde goed: 2 · allebei: 5 · niets goed: '+wn+' drinkt 1')+'</p>';
        }
        else {
          var L=G.last, last=G.turn===def, nx=(G.turn+1)%len;
          h+='<div class="cards poefen-duel"><div class="poefen-col"><small>genoemd</small>'+A.cardHtml(L.g,"big")+'</div><div class="poefen-col"><small>gedraaid</small>'+A.cardHtml(L.c,"big poefen-flipin")+'</div></div>';
          h+='<div class="verdict '+(L.kind==="win"?"win":"fout")+'"><h2>'+esc(L.title)+'</h2>'+L.lines.map(function(x){ return '<p>'+esc(x)+'</p>'; }).join("")+
            '<div class="stat poefen-sum">'+L.sum.map(function(x){ return '<span>'+esc(x[0])+' drinkt <b>'+x[1]+'</b></span>'; }).join("")+'</div>'+
            '<div class="btnrow"><button class="btn gold poefen-tap" id="poefenNext">'+(last?'Ronde klaar: '+esc(A.name((def+1)%len))+' verdedigt':nx===def?'Verder: '+dn+' raadt zelf':'Verder: '+esc(A.name(nx))+' valt aan')+'</button></div></div>';
        }
        if(G.log.length) h+='<div class="log">'+G.log.map(function(x){ return '<div>'+esc(x)+'</div>'; }).join("")+'</div>';
        h+='<div class="btnrow" style="margin-top:16px"><button class="btn poefen-tap" id="poefenNew">Nieuw spel</button></div>';
        root.innerHTML=h;

        root.querySelectorAll("[data-poef]").forEach(function(b){ b.onclick=function(){ G.poef={i:+b.getAttribute("data-poef"),n:null,red:null,open:false}; G.phase="bet"; A.play("tick"); A.save(); render(); }; });
        var none=el("poefenNone"); if(none)none.onclick=function(){ G.poef=null; G.phase="guess"; A.save(); render(); };
        root.querySelectorAll("[data-n]").forEach(function(b){ b.onclick=function(){ if(!G.poef)return; G.poef.n=+b.getAttribute("data-n"); A.play("tick"); A.save(); render(); }; });
        root.querySelectorAll("[data-col]").forEach(function(b){ b.onclick=function(){ if(!G.poef)return; G.poef.red=b.getAttribute("data-col")==="1"; A.play("tick"); A.save(); render(); }; });
        var bet=el("poefenBet"); if(bet)bet.onclick=function(){ var q=G.poef; if(!q||!int(q.n,1,5)||typeof q.red!=="boolean")return; q.open=true; G.phase="guess"; A.play("ding"); A.save(); render(); };
        var back=el("poefenBack"); if(back)back.onclick=function(){ G.poef=null; G.phase="poef"; A.save(); render(); };
        root.querySelectorAll("[data-s]").forEach(function(b){ b.onclick=function(){ G.pick.s=+b.getAttribute("data-s"); A.play("tick"); A.save(); render(); }; });
        root.querySelectorAll("[data-r]").forEach(function(b){ b.onclick=function(){ G.pick.r=+b.getAttribute("data-r"); A.play("tick"); A.save(); render(); }; });
        var fl=el("poefenFlip"); if(fl)fl.onclick=flip;
        var nxt=el("poefenNext"); if(nxt)nxt.onclick=next;
        el("poefenNew").onclick=function(){ fresh(G.def); render(); };
      }

      /* de spelersbalk kan namen en spelers wijzigen zonder het spel te waarschuwen: dan opnieuw tekenen */
      if(obs){ obs.disconnect(); obs=null; }
      if(window.MutationObserver&&el("players")){ obs=new window.MutationObserver(function(){ if(sig()!==lastSig)render(); }); obs.observe(el("players"),{childList:true}); }

      render();
      this.refresh=render;
      /* tik op een naam: alleen vóór de eerste kaart kies je daarmee de verdediger, daarna houdt het spel de beurt zelf bij */
      this.onPlayer=function(i){
        if(P().length>=2&&G.phase==="poef"&&!G.turned){ fresh(i); render(); return; }
        render();
        A.toast("Poefen houdt de beurt bij","Een andere verdediger kiezen kan na Nieuw spel.",3200);
      };
    },
    destroy:function(){ if(obs){ obs.disconnect(); obs=null; } }
  });
})();
