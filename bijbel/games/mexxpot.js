/* ===== Mexxpot: een ronde Mexx en een ronde Jackpot lopen door elkaar =====
   Elke getelde worp is een Mexx-worp EN verplicht tot het omdraaien van een cijfer (1 t/m 9) op het gedeelde Jackpot-bord.
   Het bord blijft liggen over spelers en Mexx-rondes heen en begint pas opnieuw na vastlopen of na een Jackpot.

   Keuzes waar de bijbel ruimte laat:
   - [1][3] "telt niet mee als worp": dan ook geen cijfer omdraaien, alleen een slok uitdelen en opnieuw gooien.
   - "Etc." bij de Mexx-regels: ook een 1 of 2 één keer laten liggen, eerder stoppen dan drie worpen, de opzet-regel bij Mexx
     en de extra ronde bij gelijk laag gelden. Het cijfer kies je uit de twee stenen die op tafel liggen, ook als er één bleef liggen.
   - Vastlopen of Jackpot midden in een beurt: het bord gaat meteen opnieuw open, de speler houdt zijn resterende Mexx-worpen.
   - Extra ronde bij gelijk laag: ook dat zijn worpen, dus ook daar wordt een cijfer omgedraaid ("bij elke worp").
     Mexx gegooid in de extra ronde telt niet mee voor de straf van de ronde.
   - Half adtje per Mexx = 4 slokken (8 slokken in een glas), zoals bij Mexx. */
(function(){
  "use strict";
  var A=App, esc=A.esc, ID="mexxpot";

  function score(a,b){ var hi=Math.max(a,b), lo=Math.min(a,b); if(hi===2&&lo===1) return 1000; if(a===b) return a*100; return hi*10+lo; }
  function scoreLabel(s){ return s===1000?"Mexx":String(s); }
  function label(a,b){ return scoreLabel(score(a,b)); }
  function is31(a,b){ return Math.max(a,b)===3&&Math.min(a,b)===1; }
  function slok(n){ return n+" "+(n===1?"slok":"slokken"); }
  function ofList(a){ return a.length<=1?a.join(""):a.slice(0,-1).join(", ")+" of "+a[a.length-1]; }
  function each(root,sel,fn){ Array.prototype.forEach.call(root.querySelectorAll(sel),fn); }

  function css(){
    if(document.getElementById("mexxpot-style")) return;
    var s=document.createElement("style"); s.id="mexxpot-style";
    s.textContent=
      ".mexxpot-tiles{display:flex;flex-wrap:wrap;justify-content:center;gap:6px}"+
      ".mexxpot-tile{flex:0 0 calc((100% - 25px)/5);height:48px;border-radius:9px;border:0;padding:0;display:flex;align-items:center;justify-content:center;font-family:inherit;font-size:24px;font-weight:900;line-height:1;color:var(--ink);background:linear-gradient(#fffdf6,#efe7d2);box-shadow:0 3px 0 #c4b793}"+
      ".mexxpot-tile.mexxpot-om{color:rgba(243,233,210,.28);background:rgba(0,0,0,.32);box-shadow:inset 0 2px 5px rgba(0,0,0,.45)}"+
      ".mexxpot-tile.mexxpot-kies{background:var(--gold);box-shadow:0 3px 0 #a67c22,0 0 0 3px rgba(255,253,246,.8);animation:mexxpot-pulse 1s ease-in-out infinite}"+
      "@keyframes mexxpot-pulse{50%{transform:translateY(-3px)}}"+
      ".mexxpot-turn{font-size:16px;padding:2px 0 10px}.mexxpot-turn b{color:var(--gold)}"+
      ".mexxpot-do{color:var(--ivory);font-weight:700;font-size:15px;padding:4px 0 6px}"+
      ".mexxpot-do small{display:block;font-weight:500;color:var(--ivory-dim);font-size:13px;margin-top:2px}"+
      ".mexxpot-gap{margin-top:14px}.mexxpot-gap td:first-child{overflow-wrap:anywhere}"+
      ".mexxpot-tag{font-size:11px;font-weight:500;color:var(--ivory-dim)}"+
      ".mexxpot-big{min-height:44px}"+
      ".mexxpot-seg button{min-height:40px}"+
      ".mexxpot-lbl{font-size:12px;color:var(--ivory-dim);align-self:center}"+
      ".mexxpot-rolls{font-size:14px;color:var(--ivory);margin:6px 0 0}";
    document.head.appendChild(s);
  }

  A.register({ id:ID, title:"Mexxpot", level:"app", beta:true, sub:"Mexx en Jackpot tegelijk: dobbelstenen, negen cijfers, scores en wie drinkt",
    init:function(root){
      css();
      var G=A.gs(ID), gen=0, Q=[], showing=false, armed=false, armTimer=null, dice=null, lockUntil=0, lockTimer=null;
      if(G.straf!==2&&G.straf!==3&&G.straf!==4) G.straf=2;
      if(G.tie!=="ogen") G.tie="mexx";
      if(!Array.isArray(G.log)) G.log=[];

      function P(){ return A.S.players; }
      function note(s){ G.log.unshift(s); if(G.log.length>6) G.log.length=6; }
      function resetBoard(){ G.board=[false,false,false,false,false,false,false,false,false]; }
      function openCount(){ var c=0,i; for(i=0;i<9;i++) if(!G.board[i]) c++; return c; }
      /* Jackpot: de ogen van één van de stenen, of de som van beide */
      function cands(a,b){ var o=[]; [a,b,a+b].forEach(function(n){ if(n<=9&&o.indexOf(n)<0) o.push(n); }); return o; }
      function options(a,b){ return cands(a,b).filter(function(n){ return !G.board[n-1]; }).sort(function(x,y){ return x-y; }); }
      function lowest(){ var lo=null,T=G.R.turns; Object.keys(T).forEach(function(i){ if(lo===null||T[i].score<lo) lo=T[i].score; }); return lo; }
      function holder(){ return G.R.tie||G.R.t; } /* wie de worp op tafel "bezit": de beurt of de extra ronde */
      function who(){ var R=G.R; return R.tie?R.tie.players[R.tie.i]:R.cur; }
      function startIdx(){ return A.S.active<P().length?A.S.active:0; }
      function die(x){ return x===1||x===2||x===3||x===4||x===5||x===6; }
      /* klopt de bewaarde stand nog? Nee = opnieuw beginnen (andere spelers, of een stand uit een oudere versie) */
      function ok(){
        var R=G.R, n=P().length, T, t, bad=false;
        if(!Array.isArray(G.board)||G.board.length!==9||!R||typeof R!=="object"||R.n!==n||!R.turns||typeof R.turns!=="object") return false;
        if(!(R.start>=0&&R.start<n)||!(R.cur>=0&&R.cur<n)) return false;
        if(!(R.maxThrows>=1&&R.maxThrows<=3)||!(R.mexx>=0)) return false;
        Object.keys(R.turns).forEach(function(i){ var x=R.turns[i]; if(!(+i<n)||!x||typeof x.score!=="number"||!die(x.a)||!die(x.b)) bad=true; });
        if(bad) return false;
        if(R.tie){
          T=R.tie; if(!Array.isArray(T.players)||T.players.length<2||!T.rolls||typeof T.rolls!=="object"||!(T.i>=0&&T.i<T.players.length)) return false;
          T.players.forEach(function(p){ if(!(p>=0&&p<n)) bad=true; });
          if(bad) return false;
          if(T.phase==="roll") return true;
          if(T.phase!=="deal"&&T.phase!=="flip") return false;
          return die(T.a)&&die(T.b)&&(T.phase!=="flip"||options(T.a,T.b).length>0);
        }
        t=R.t; if(!t||typeof t!=="object"||!(t.throws>=0)) return false;
        if(t.k&&!((t.k.i===0||t.k.i===1)&&(t.k.v===1||t.k.v===2))) return false;
        if(t.phase==="roll") return t.throws<R.maxThrows;
        if(t.phase!=="deal"&&t.phase!=="after31"&&t.phase!=="flip"&&t.phase!=="decide") return false;
        if(!die(t.a)||!die(t.b)) return false;
        if(t.phase==="flip") return typeof t.score==="number"&&die(t.ca)&&die(t.cb)&&options(t.a,t.b).length>0;
        if(t.phase==="decide") return typeof t.score==="number"&&die(t.ca)&&die(t.cb)&&t.throws<R.maxThrows;
        return t.throws<R.maxThrows;
      }

      /* ---- meldingen: de stand is al bijgewerkt, de overlays zijn alleen de boodschap; meerdere tegelijk komen na elkaar ---- */
      function say(m){ Q.push(m); }
      function flush(){
        if(showing||!Q.length) return;
        var m=Q.shift(), sticky=m.ms===0||Q.length>0;
        if(m.snd) A.play(m.snd);
        A.overlay(m.kind,m.title,m.lines,sticky?0:m.ms,m.extra);
        if(sticky){ showing=true; A.onOverlayClose(function(){ showing=false; flush(); }); }
        else { lockUntil=Date.now()+(m.ms||2200); applyLock(); }
      }
      /* Een melding die vanzelf verdwijnt laat tikken door naar de knoppen eronder (pointer-events:none in de core).
         Zolang zo'n melding het scherm bedekt doet het spel dus niets met tikken: geen cijfer omdraaien of slok uitdelen op de gok. */
      function busy(){ return Date.now()<lockUntil; }
      function applyLock(){
        clearTimeout(lockTimer); if(!dice) return;
        if(!busy()){ dice.lock(false); return; }
        var g=gen; dice.lock(true);
        lockTimer=setTimeout(function(){ if(g===gen&&dice) dice.lock(false); },lockUntil-Date.now()+30);
      }
      function commit(){ A.S.active=who(); A.save(); A.renderPlayers(); render(); flush(); }

      /* ---- rondes en beurten ---- */
      function newTurn(){ G.R.t={throws:0,keptUsed:false,k:null,a:null,b:null,ca:null,cb:null,score:null,over:false,why:null,phase:"roll"}; }
      function newRound(start){ G.R={start:start,cur:start,n:P().length,turns:{},maxThrows:3,mexx:0,t:null,tie:null}; newTurn(); }
      function newGame(start){ resetBoard(); G.log=[]; A.krukReset(ID); newRound(start); }
      function startTie(pl){ G.R.t=null; G.R.tie={players:pl,rolls:{},i:0,phase:"roll",a:null,b:null}; }
      function boot(){
        if(P().length>=2&&!ok()){
          if(!Array.isArray(G.board)||G.board.length!==9) newGame(startIdx());
          else { if(G.R&&G.R.n!==P().length) note("Andere spelers aan tafel: de Mexx-ronde begint opnieuw, het Jackpot-bord blijft liggen."); newRound(startIdx()); }
        }
        if(P().length>=2) commit(); else render();
      }
      /* true = de actie gaat niet door (te weinig spelers, of het aantal spelers is veranderd en de ronde is opnieuw begonnen) */
      function guard(){ if(P().length<2||!ok()){ boot(); return true; } return false; }

      function endTurn(){
        var R=G.R, t=R.t;
        R.turns[R.cur]={a:t.ca,b:t.cb,score:t.score,throws:t.throws};
        note(A.name(R.cur)+": "+scoreLabel(t.score)+" in "+t.throws+" "+(t.throws===1?"worp":"worpen")+".");
        var nxt=(R.cur+1)%R.n;
        if(nxt===R.start){ finishRound(); return; }
        R.cur=nxt; newTurn();
      }
      function finishRound(){
        var R=G.R, lo=lowest(), losers=[];
        Object.keys(R.turns).forEach(function(i){ if(R.turns[i].score===lo) losers.push(+i); });
        if(losers.length>1){
          note(A.joinNames(losers)+" staan samen laag met "+scoreLabel(lo)+": extra ronde.");
          say({kind:"info",title:"Gelijk laag",lines:[A.joinNames(losers)+" staan samen laag met "+scoreLabel(lo)+".","Extra ronde: ieder één worp."],ms:2600,snd:"ding"});
          startTie(losers);
        } else settle(losers[0]);
      }
      function settle(loser){
        var R=G.R, n=R.mexx?R.mexx*G.straf:1, lbl=scoreLabel(R.turns[loser].score), nm=A.name(loser);
        A.drink(loser,n);
        note(nm+" is laag met "+lbl+" en drinkt "+slok(n)+(R.mexx?" ("+R.mexx+"× Mexx)":"")+". "+nm+" zet op.");
        say({kind:"dood",title:"Dood!",lines:[nm+" is laag met "+lbl+": drink "+slok(n)+".",R.mexx?R.mexx+"× Mexx deze ronde.":"Geen Mexx deze ronde.",nm+" zet de volgende ronde op. Het Jackpot-bord blijft liggen."],ms:0,snd:"dood"});
        newRound(loser);
      }
      function tieNext(){
        var R=G.R, T=R.tie, w=T.players[T.i], mx=G.tie==="mexx";
        T.rolls[w]={a:T.a,b:T.b};
        note(A.name(w)+" gooit "+(mx?label(T.a,T.b):(T.a+T.b)+" ogen")+" in de extra ronde.");
        T.i++; T.a=null; T.b=null; T.phase="roll";
        if(T.i<T.players.length) return;
        var lo=null, low=[];
        T.players.forEach(function(p){ var r=T.rolls[p], v=mx?score(r.a,r.b):r.a+r.b; if(lo===null||v<lo){ lo=v; low=[p]; } else if(v===lo) low.push(p); });
        if(low.length>1){
          note(A.joinNames(low)+" gooien weer gelijk en gooien opnieuw.");
          say({kind:"info",title:"Weer gelijk",lines:[A.joinNames(low)+" gooien nog een keer."],ms:2200,snd:"ding"});
          startTie(low);
        } else settle(low[0]);
      }
      function afterFlip(){
        var R=G.R;
        if(R.tie){ tieNext(); return; }
        if(R.t.over) endTurn(); else R.t.phase="decide";
      }

      /* ---- een worp ---- */
      function onThrow(v){
        if(guard()) return;
        if(busy()){ render(); return; } /* blind ingevuld onder een melding: stenen weer leeg */
        var R=G.R, X=holder(), w=who(), nm=A.name(w), inTie=!!R.tie, mexxRules=!inTie||G.tie==="mexx", a, b;
        if(X.phase!=="roll"||!v||!die(v[0])||!die(v[1])) return;
        if(!inTie&&X.k){ v=v.slice(); v[X.k.i]=X.k.v; } /* de steen die bleef liggen kan bij zelf invullen niet veranderen */
        a=v[0]; b=v[1];
        A.kruk(ID,[a,b],w); /* adtje kruk: elke worp van de twee stenen telt, ook een 31 en ook als er een steen bleef liggen */
        X.a=a; X.b=b;
        if(is31(a,b)&&mexxRules){ /* uitdelen, telt niet als worp: dus ook geen cijfer omdraaien */
          X.phase="deal";
          say({kind:"info",title:"31!",lines:[nm+" mag één slok uitdelen. Telt niet als worp."],ms:1400,snd:"ding"});
          commit(); return;
        }
        if(G.dub&&a===b&&mexxRules){
          A.drink(w,1); note(nm+" gooit dubbel "+a+" en neemt zelf 1 slok.");
          say({kind:"info",title:"Dubbel",lines:[nm+" gooit dubbel "+a+": zelf 1 slok."],ms:1800,snd:"ding"});
        }
        if(!inTie){
          var t=X, lo=lowest();
          t.throws++; t.ca=a; t.cb=b; t.score=score(a,b); t.why=null;
          if(t.score===1000){
            R.mexx++; t.over=true; t.why="mexx";
            var lines=[nm+" gooit Mexx. De laagste drinkt straks "+slok(R.mexx*G.straf)+"."];
            /* opzet-regel: Mexx in minder dan drie worpen door de opzetter beperkt de rest */
            if(w===R.start&&t.throws<R.maxThrows){ R.maxThrows=t.throws; lines.push("Opgezet in "+t.throws+": de rest mag ook maar "+t.throws+" keer gooien."); }
            note(nm+" gooit Mexx (worp "+t.throws+").");
            say({kind:"win",title:"Mexx!",lines:lines,ms:2400,snd:"win"});
          } else if((lo!==null&&t.score===lo)||(G.v32&&t.score===32)){
            t.over=true; t.why="vast";
            say({kind:"info",title:"Vast",lines:[nm+" gooit "+label(a,b)+(lo!==null&&t.score===lo?", gelijk aan de laagste.":", en 32 is altijd vast.")+" Beurt voorbij na het omdraaien."],ms:2200,snd:"ding"});
          } else if(t.throws>=R.maxThrows){ t.over=true; t.why="op"; }
        }
        if(options(a,b).length){ X.phase="flip"; commit(); return; }
        /* vastgelopen: resterende cijfers in slokken, nieuw bord, de Mexx-ronde gaat gewoon door */
        var n=openCount();
        A.drink(w,n); resetBoard();
        note(nm+" loopt vast op het Jackpot-bord en drinkt "+slok(n)+". Nieuw bord.");
        say({kind:"dood",title:"Klem!",lines:[nm+" kan geen "+ofList(cands(a,b))+" meer omdraaien. Nog "+n+" open: drink "+slok(n)+".","Nieuw Jackpot-bord. De Mexx-ronde gaat gewoon door."],ms:0,snd:"dood",extra:A.dicerow([a,b])});
        afterFlip(); commit();
      }
      function flip(n){
        if(guard()||busy()) return;
        var X=holder(), w=who(), nm=A.name(w);
        if(X.phase!=="flip"||options(X.a,X.b).indexOf(n)<0) return;
        G.board[n-1]=true; A.play("clack");
        if(openCount()===0){ /* Jackpot: de rest een adtje, nieuw bord, de Mexx-ronde gaat gewoon door */
          var rest=A.others(w);
          rest.forEach(function(j){ A.atje(j,1); });
          resetBoard();
          note(nm+" gooit Jackpot: "+A.joinNames(rest)+" "+(rest.length===1?"trekt":"trekken")+" een adtje. Nieuw bord.");
          say({kind:"win",title:"Jackpot!",lines:[nm+" draait het laatste cijfer om.",A.joinNames(rest)+" "+(rest.length===1?"trekt":"trekken")+" een adtje.","Nieuw Jackpot-bord. De Mexx-ronde gaat gewoon door."],ms:0,snd:"special"});
        }
        afterFlip(); commit();
      }
      function act(name,arg){
        if(guard()||busy()) return;
        var R=G.R, t=R.t, X=holder(), w=who(), dec=!!t&&t.phase==="decide";
        if(name==="deal"&&X.phase==="deal"){
          if(arg===w||!P()[arg]) return;
          A.drink(arg,1);
          note(A.name(w)+" gooit 31 en deelt 1 slok uit aan "+A.name(arg)+".");
          say({kind:"info",title:"Slok!",lines:[A.name(arg)+" drinkt 1 slok, uitgedeeld door "+A.name(w)+"."],ms:1500,snd:"tick"});
          if(R.tie){ X.a=null; X.b=null; X.phase="roll"; }
          else if(G.v31){ t.k=null; t.a=null; t.b=null; t.phase="roll"; } /* afspraak: bij 31 niets laten liggen */
          else if(t.k){ t.phase="roll"; }                                 /* de steen die al bleef liggen, blijft liggen: de worp telde niet */
          else if(!t.keptUsed){ t.phase="after31"; }                      /* de 1 van de 31 mag blijven liggen */
          else { t.a=null; t.b=null; t.phase="roll"; }
        }
        else if(name==="both"&&t&&t.phase==="after31"){ t.a=null; t.b=null; t.phase="roll"; }
        else if(name==="keep1"&&t&&t.phase==="after31"){ t.keptUsed=true; t.k={i:t.a===1?0:1,v:1}; t.phase="roll"; }
        else if(name==="stop"&&dec){ endTurn(); }
        else if(name==="again"&&dec){ t.k=null; t.a=null; t.b=null; t.ca=null; t.cb=null; t.score=null; t.phase="roll"; }
        else if(name==="keep"&&dec&&!t.keptUsed&&(arg===0||arg===1)){
          var kv=arg===0?t.a:t.b; if(kv!==1&&kv!==2) return;
          t.keptUsed=true; t.k={i:arg,v:kv}; t.ca=null; t.cb=null; t.score=null; t.phase="roll";
        }
        else return;
        commit();
      }

      /* ---- scherm ---- */
      function diceHtml(a,b,k){ return '<div class="dice">'+[a,b].map(function(v,i){ return '<div class="diewrap"><div class="die'+(k&&k.i===i?' kept':'')+'">'+A.pips(v)+'</div></div>'; }).join("")+'</div>'; }
      function render(){
        gen++; dice=null; var g=gen, p=P(), h="", n;
        if(p.length<2){
          root.innerHTML='<p class="hint">Mexxpot speel je met minstens twee spelers: iemand moet laag kunnen staan en je moet een slok kunnen uitdelen. Voeg bovenaan een speler toe.</p><div class="btnrow"><button class="btn gold mexxpot-big" data-act="start">Begin</button></div>';
          root.querySelector('[data-act="start"]').onclick=boot; return;
        }
        if(!ok()){ boot(); return; }
        var R=G.R, X=holder(), t=R.t, T=R.tie, w=who(), nm=esc(A.name(w)), lo=lowest(), ph=X.phase, o=ph==="flip"?options(X.a,X.b):[];

        h+='<p class="hint mexxpot-turn">'+(T?'Extra ronde: <b>'+nm+'</b> gooit één keer':'<b>'+nm+'</b> is aan de beurt · worp '+Math.min(R.maxThrows,t.throws+(ph==="flip"||ph==="decide"?0:1))+' van '+R.maxThrows)+'</p>';

        /* Jackpot-bord */
        h+='<div class="board"><div class="mexxpot-tiles">';
        for(n=1;n<=9;n++){
          if(o.indexOf(n)>=0) h+='<button class="mexxpot-tile mexxpot-kies" data-flip="'+n+'" aria-label="Draai de '+n+' om">'+n+'</button>';
          else h+='<span class="mexxpot-tile'+(G.board[n-1]?' mexxpot-om':'')+'"'+(G.board[n-1]?' aria-label="'+n+' is omgedraaid"':'')+'>'+n+'</span>';
        }
        h+='</div><div class="stat"><span>Jackpot: nog <b>'+openCount()+'</b> open</span><span>alles om: de rest een adtje</span></div></div>';

        /* de worp */
        if(ph==="roll"){
          h+='<p class="hint mexxpot-do">'+(t&&t.k?'De '+t.k.v+' blijft liggen. Gooi de andere steen: tik op Dobbel.<small>Echte dobbelsteen? Tik op de lege steen en kies de ogen.</small>':
            (T?'Gooi één keer met beide stenen: tik op Dobbel.':'Gooi beide stenen: tik op Dobbel.')+'<small>Echte dobbelstenen? Tik op een steen en kies de ogen.</small>')+'</p>';
          h+='<div data-box="dice"></div>';
        } else {
          h+=diceHtml(X.a,X.b,t?t.k:null);
        }
        if(ph==="deal"){
          h+='<div class="verdict neutral"><h2>31</h2><p>'+nm+' deelt één slok uit. Telt niet als worp, dus ook geen cijfer omdraaien. Wie drinkt?</p><div class="btnrow">'+
            A.others(w).map(function(j){ return '<button class="btn gold mexxpot-big" data-deal="'+j+'">'+esc(A.name(j))+'</button>'; }).join("")+'</div></div>';
        } else if(ph==="after31"){
          h+='<p class="hint mexxpot-do">De 31 telde niet als worp. Kies hoe '+nm+' opnieuw gooit.</p>';
          h+='<div class="opts"><button class="opt" data-act="both"><span class="num">⟳</span><span class="lbl">Opnieuw gooien<small>beide stenen</small></span><span></span></button>'+
            '<button class="opt" data-act="keep1"><span class="num">1</span><span class="lbl">De 1 laten liggen<small>andere steen opnieuw, mag één keer</small></span><span></span></button></div>';
        } else if(ph==="flip"){
          h+='<p class="hint mexxpot-do">'+(T?'':esc(label(X.a,X.b))+' gegooid. ')+(o.length===1?'Draai de '+o[0]+' om: tik erop.':'Draai een cijfer om: tik op '+ofList(o)+'.')+
            (t&&t.over?'<small>'+(t.why==="mexx"?'Mexx: daarna is de beurt voorbij.':t.why==="vast"?'Vast: daarna is de beurt voorbij.':'Laatste worp: daarna is de volgende aan de beurt.')+'</small>':'')+'</p>';
        } else if(ph==="decide"){
          var k=R.maxThrows-t.throws;
          h+='<p class="hint mexxpot-do">Kies: '+esc(label(t.ca,t.cb))+' laten staan of opnieuw gooien.</p>';
          h+='<div class="opts"><button class="opt" data-act="stop"><span class="num">'+esc(label(t.ca,t.cb))+'</span><span class="lbl">Laten staan<small>beurt klaar</small></span><span class="odds">'+(lo===null?'eerste score':t.score>lo?'boven laag':'LAAG')+'</span></button>'+
            '<button class="opt" data-act="again"><span class="num">⟳</span><span class="lbl">Opnieuw gooien<small>beide stenen, nog '+k+' '+(k===1?'worp':'worpen')+'</small></span><span></span></button>';
          if(!t.keptUsed) [t.a,t.b].forEach(function(d,idx){
            if((d===1||d===2)&&!(idx===1&&t.a===t.b)) h+='<button class="opt" data-keep="'+idx+'"><span class="num">'+d+'</span><span class="lbl">De '+d+' laten liggen<small>andere steen opnieuw, mag één keer</small></span><span></span></button>';
          });
          h+='</div>';
        }

        /* extra ronde bij gelijk laag */
        if(T){
          var locked=T.i>0||T.phase!=="roll", done=Object.keys(T.rolls);
          h+='<div class="verdict neutral mexxpot-gap"><h2>Gelijk laag</h2><p>'+esc(A.joinNames(T.players))+' staan samen laag. Ieder gooit één keer; ook nu draai je na de worp een cijfer om.</p>'+
            '<div class="seg mexxpot-seg"><button data-tie="mexx" aria-pressed="'+(G.tie==="mexx")+'"'+(locked?' disabled':'')+'>Mexx: laagste score verliest</button><button data-tie="ogen" aria-pressed="'+(G.tie==="ogen")+'"'+(locked?' disabled':'')+'>Ogen: minste ogen verliest</button></div>'+
            done.map(function(i){ var r=T.rolls[i]; return '<p class="mexxpot-rolls">'+esc(A.name(+i))+': '+A.dicerowSmall([r.a,r.b])+' '+(G.tie==="mexx"?esc(label(r.a,r.b)):(r.a+r.b)+' ogen')+'</p>'; }).join("")+'</div>';
        }

        /* Mexx-ronde */
        h+='<div class="board mexxpot-gap"><table class="score"><tr><th>speler</th><th>worp</th><th>score</th><th>worpen</th></tr>';
        p.forEach(function(q,i){
          var tr=R.turns[i], live=!T&&i===R.cur&&t.score!==null, a=tr?tr.a:live?t.ca:null, b=tr?tr.b:live?t.cb:null;
          h+='<tr'+(i===w?' class="cur"':'')+'><td>'+esc(q.name)+(i===R.start?' <span class="mexxpot-tag">zet op</span>':'')+'</td><td>'+(a?A.dicerowSmall([a,b]):'–')+'</td><td>'+(a?esc(label(a,b)):'–')+(tr&&tr.score===lo?' <span class="mexxpot-tag">laag</span>':'')+'</td><td>'+(tr?tr.throws:live?t.throws:'')+'</td></tr>';
        });
        h+='</table><div class="stat"><span>Mexx deze ronde: <b>'+R.mexx+'</b></span><span>Laagste drinkt: <b>'+slok(R.mexx?R.mexx*G.straf:1)+'</b></span>'+
          (lo!==null||G.v32?'<span>Vast: <b>'+(lo!==null?scoreLabel(lo):'')+(G.v32&&lo!==32?(lo!==null?' en ':'')+'32':'')+'</b></span>':'')+'</div></div>';

        if(G.log.length) h+='<div class="log">'+G.log.map(function(s,i){ return '<div>'+(i===0?'<b>'+esc(s)+'</b>':esc(s))+'</div>'; }).join("")+'</div>';

        /* afspraken */
        h+='<div class="seg mexxpot-seg mexxpot-gap"><span class="mexxpot-lbl">per Mexx:</span><button data-s="2" aria-pressed="'+(G.straf===2)+'">2 slokken</button><button data-s="3" aria-pressed="'+(G.straf===3)+'">3 slokken</button><button data-s="4" aria-pressed="'+(G.straf===4)+'">half adtje (4)</button></div>';
        h+='<div class="seg mexxpot-seg"><span class="mexxpot-lbl">afspraken:</span><button data-v="v32" aria-pressed="'+!!G.v32+'">32 altijd vast</button><button data-v="v31" aria-pressed="'+!!G.v31+'">bij 31 niets laten liggen</button><button data-v="dub" aria-pressed="'+!!G.dub+'">dubbel: zelf 1 slok</button></div>';
        h+='<div class="btnrow"><button class="btn mexxpot-big" data-act="new">'+(armed?'Zeker weten? Tik nog eens':'Nieuw spel')+'</button></div>';
        root.innerHTML=h;

        var box=root.querySelector('[data-box="dice"]');
        if(box){
          var d=A.Dice(box,{n:2,label:"Dobbel",onRoll:function(v){ if(g===gen) onThrow(v); }});
          if(t&&t.k){ var vals=[null,null], kp=[false,false]; vals[t.k.i]=t.k.v; kp[t.k.i]=true; d.set(vals); d.setKept(kp); }
          dice=d; applyLock();
        }
        each(root,"[data-flip]",function(b){ b.onclick=function(){ flip(+b.getAttribute("data-flip")); }; });
        each(root,"[data-deal]",function(b){ b.onclick=function(){ act("deal",+b.getAttribute("data-deal")); }; });
        each(root,"[data-keep]",function(b){ b.onclick=function(){ act("keep",+b.getAttribute("data-keep")); }; });
        each(root,"[data-act]",function(b){ var a=b.getAttribute("data-act"); if(a!=="new") b.onclick=function(){ act(a); }; });
        each(root,"[data-tie]",function(b){ b.onclick=function(){ var T2=G.R.tie; if(busy()||!T2||T2.i>0||T2.phase!=="roll") return; G.tie=b.getAttribute("data-tie"); A.save(); render(); }; });
        each(root,"[data-s]",function(b){ b.onclick=function(){ if(busy()) return; G.straf=+b.getAttribute("data-s"); A.save(); render(); }; });
        each(root,"[data-v]",function(b){ b.onclick=function(){ if(busy()) return; var key=b.getAttribute("data-v"); G[key]=!G[key]; A.save(); render(); }; });
        var nw=root.querySelector('[data-act="new"]');
        nw.onclick=function(){
          if(busy()) return;
          clearTimeout(armTimer);
          if(!armed){ armed=true; nw.textContent="Zeker weten? Tik nog eens"; armTimer=setTimeout(function(){ armed=false; var x=root.querySelector('[data-act="new"]'); if(x) x.textContent="Nieuw spel"; },3000); return; }
          armed=false; Q=[];
          if(P().length>=2){ newGame(startIdx()); commit(); } else render();
        };
      }

      this.refresh=render;
      /* de app bewaakt de beurt: tikken op een andere speler verandert niet wie er gooit */
      this.onPlayer=function(){ if(P().length>=2&&ok()){ A.S.active=who(); A.save(); A.renderPlayers(); } else boot(); };
      this.destroy=function(){ gen++; Q=[]; showing=false; armed=false; dice=null; clearTimeout(armTimer); clearTimeout(lockTimer); };
      boot();
    }
  });
})();
