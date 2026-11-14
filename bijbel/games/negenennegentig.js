/* ===== 99 ===== */
(function(){
  "use strict";
  var A=App, el=A.el, esc=A.esc, ID="negenennegentig", obs=null;
  var NAMEN={1:"aas",11:"boer",12:"vrouw",13:"koning"};

  if(!document.getElementById(ID+"-css")){
    var css=document.createElement("style"); css.id=ID+"-css";
    css.textContent=[
      ".negenennegentig-top{display:flex;align-items:center;justify-content:center;gap:20px;min-height:136px}",
      ".negenennegentig-empty{display:flex;align-items:center;justify-content:center;width:92px;height:132px;border-radius:12px;border:2px dashed rgba(243,233,210,.35);color:var(--ivory-dim);font-size:12px;text-align:center;padding:6px}",
      ".negenennegentig-tot{text-align:center;min-width:110px}",
      ".negenennegentig-tot span{display:block;font-size:13px;color:var(--ivory-dim)}",
      ".negenennegentig-tot b{display:block;font-size:64px;font-weight:900;line-height:1.05}",
      ".negenennegentig-tot small{display:block;font-size:12px;color:var(--ivory-dim)}",
      ".negenennegentig-hand{display:flex;justify-content:center;gap:6px;margin:6px 0 12px;padding-top:8px}",
      ".negenennegentig-slot{display:flex;flex-direction:column;align-items:center;gap:8px;width:72px}",
      ".negenennegentig-slot small{font-size:11px;color:var(--ivory-dim);text-align:center;line-height:1.2}",
      ".negenennegentig-hand .card{width:66px;height:94px;border-radius:9px}",
      ".negenennegentig-hand .card b,.negenennegentig-hand .card i{font-size:26px}",
      ".negenennegentig-names{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}",
      ".negenennegentig-names button{min-height:56px;border-radius:12px;border:1.5px solid rgba(243,233,210,.35);background:rgba(0,0,0,.25);font-size:26px;font-weight:900}",
      ".negenennegentig-log{margin:10px 2px 0;font-size:14px;line-height:1.4}",
      ".negenennegentig-log div{padding:5px 0;border-top:1px solid rgba(243,233,210,.12)}",
      ".negenennegentig-log div:first-child{border-top:0}",
      ".negenennegentig-wrap .btn{min-height:44px;border-radius:22px}",
      ".negenennegentig-wrap .seg{align-items:center}",
      ".negenennegentig-wrap .seg button{min-height:40px}",
      ".negenennegentig-wrap .seg span{font-size:12px;color:var(--ivory-dim)}",
      ".negenennegentig-foot{margin-top:18px;padding-top:6px;border-top:1px solid rgba(243,233,210,.12)}"
    ].join("\n");
    document.head.appendChild(css);
  }

  /* waarde zonder keuze: plaatjes 10, koning 0, aas 1 (of 11), tien 10 (of -10) */
  function baseVal(c){ return c.r===13?0:c.r>=11?10:c.r; }
  function capt(c){ return c.r===1?"1 of 11":c.r===10?"+10 of −10":c.r===13?"0 · wijs aan":c.r===4?"4 · jij slaat over":c.r>=11?"10":String(c.r); }
  function cardTxt(c){ return A.SUITS[c.s]+" "+(NAMEN[c.r]||c.r); }
  function tot(x){ return x<0?"−"+(-x):String(x); }
  function adt(n){ return n===0.5?"een half adtje":"een heel adtje"; }
  /* zes mogelijke totalen om uit te kiezen: het goede en vijf aannemelijke rekenfouten */
  function makeOpts(old,nw,c){
    var cand=[], out=[nw], i, v;
    if(c.r===1) cand.push(old+(nw-old===1?11:1));
    if(c.r===10) cand.push(old-(nw-old));
    if(c.r===13) cand.push(old+10);
    if(c.r===11||c.r===12) cand.push(old+c.r);
    A.shuffle([-11,-10,-9,-2,-1,1,2,9,10,11]).forEach(function(d){ cand.push(nw+d); });
    for(i=0;i<cand.length&&out.length<6;i++){ v=cand[i]; if(out.indexOf(v)<0&&v<=99&&(v>=0||nw<0)) out.push(v); }
    return out.sort(function(a,b){ return a-b; });
  }

  A.register({ id:ID, beta:true, title:"99", level:"app", sub:"De app deelt geheime handen, telt tot 99 en regelt koning, tien en vier",
    init:function(root){
      var G=A.gs(ID);
      var shown=null; /* wiens hand nu open op het scherm staat (nooit bewaard: na herladen weer dicht) */
      var sel=null, mode=null, sure=false, seen=0;
      if(G.pen!==1&&G.pen!==0.5) G.pen=0.5;
      if(G.count===undefined) G.count=true;

      function n(){ return A.S.players.length; }
      function idx(x){ return typeof x==="number"&&x>=0&&x<G.n; }
      /* Bewaarde stand compleet en bruikbaar? Zo niet, dan wordt er gewoon opnieuw gedeeld. */
      function ok(){
        var P=G.pend, i;
        if(!(G.hands&&G.hands.length===G.n&&G.pile&&G.stock&&G.skip&&typeof G.total==="number"&&idx(G.cur)))return false;
        for(i=0;i<G.n;i++) if(!G.hands[i]||typeof G.hands[i].length!=="number")return false;
        if(G.phase==="turn")return true;
        if(G.phase==="over")return idx(G.loser);
        if(!P||!P.card||!idx(P.who))return false;
        if(G.phase==="name")return !!(G.opts&&G.opts.length);
        if(G.phase==="king")return true;
        if(G.phase==="kingResp")return idx(P.target)&&P.target!==P.who;
        return false;
      }
      /* wie bovenaan gemarkeerd hoort te staan */
      function turnOf(){ return G.phase==="kingResp"?G.pend.target:G.phase==="over"?G.loser:G.pend?G.pend.who:G.cur; }
      function stale(){ if(n()!==G.n||!ok()){ render(); return true; } return false; }

      /* Nieuwe ronde: alle kaarten terug, schudden, ieder vier kaarten. De bijbel zegt niet of je je hand houdt; opnieuw delen is het eenvoudigst. */
      function newRound(start,fresh){
        var p=n(), d=A.deck(0), i;
        G.n=p; G.hands=[]; G.skip=[];
        for(i=0;i<p;i++){ G.hands.push(d.splice(0,4)); G.skip.push(false); }
        G.stock=d; G.pile=[]; G.total=0; G.cur=(start>=0&&start<p)?start:0; G.phase="turn"; G.pend=null; G.opts=null; G.loser=null; G.last=[];
        G.round=fresh?1:(G.round||0)+1;
        shown=null; sel=null; mode=null;
        A.S.active=G.cur; A.save(); A.renderPlayers();
      }
      /* Pak een kaart. Is de gesloten stapel op, dan wordt de open stapel (zonder de bovenste kaart) geschud en dicht neergelegd;
         staat niet in de bijbel, maar zonder kan regel 1 (altijd vier kaarten) niet. */
      function draw(i){
        if(!G.stock.length&&G.pile.length>1){ var top=G.pile.pop(); G.stock=A.shuffle(G.pile); G.pile=[top]; G.last.push("De gesloten stapel was op: de open stapel is geschud en ligt weer dicht."); }
        if(G.stock.length) G.hands[i].push(G.stock.pop());
      }
      function reveal(who,sub){ A.handover(who,sub,function(){ if(stale())return; shown=who; sel=null; mode=null; render(); }); }

      function commit(){
        if(stale()||G.phase!=="turn")return;
        var i=G.cur, c=G.hands[i][sel]; if(!c)return;
        if((c.r===1||c.r===10)&&!mode)return;
        /* Een tien eraf mag het totaal onder nul brengen: de bijbel noemt geen ondergrens. */
        var v=c.r===1?(mode==="hi"?11:1):c.r===10?(mode==="lo"?-10:10):baseVal(c);
        G.hands[i].splice(sel,1); G.pile.push(c);
        G.pend={who:i,card:c,val:v,nw:G.total+v};
        shown=null; sel=null; mode=null; A.play("clack");
        /* over de 99 is meteen verloren, dan hoeft het totaal niet meer genoemd */
        if(G.pend.nw>99||!G.count){ resolve(null); return; }
        G.opts=makeOpts(G.total,G.pend.nw,c); G.phase="name"; A.save(); render();
      }
      function playedTxt(P){
        var c=P.card;
        return A.name(P.who)+" legt "+cardTxt(c)+" op"+(c.r===1?" en telt hem als "+P.val:c.r===10?(P.val<0?" en haalt er 10 af":" en telt er 10 bij"):c.r===13?" (0 punten)":"");
      }
      function resolve(said){
        var P=G.pend, i=P.who, c=P.card, nm=A.name(i), wrong=said!==null&&said!==P.nw;
        G.last=[playedTxt(P)+": "+(P.nw===G.total?"het totaal blijft "+tot(P.nw):tot(G.total)+" wordt "+tot(P.nw))+"."];
        if(wrong){ A.drink(i,1); G.last.push(nm+" noemt "+tot(said)+", maar het is "+tot(P.nw)+": 1 slok."); }
        G.total=P.nw; G.opts=null;
        if(G.total>99){
          G.phase="over"; G.loser=i; G.lostPen=G.pen; A.atje(i,G.pen);
          G.last.push(nm+" gaat over de 99 en trekt "+adt(G.pen)+".");
          A.S.active=i; A.save(); A.renderPlayers(); A.play("dood");
          A.overlay("dood","Over de 99!",[nm+" komt op "+G.total+" en trekt "+adt(G.pen)+"."],0); A.onOverlayClose(null);
          render(); return;
        }
        draw(i);
        if(wrong){ A.play("dood"); A.overlay("dood","Fout geteld",[nm+" noemt "+tot(said)+", het is "+tot(P.nw)+". 1 slok."],2400); }
        else if(said!==null) A.play("tick");
        if(c.r===13){ G.phase="king"; A.save(); render(); return; }
        /* "Bij de volgende ronde overgeslagen" gelezen als: de eerstvolgende keer dat de beurt bij jou komt. */
        if(c.r===4){ G.skip[i]=true; G.last.push(nm+" legt een vier en wordt de volgende keer overgeslagen."); }
        advance(i);
      }
      function advance(from){
        var p=n(), nx=(from+1)%p, guard=0;
        while(G.skip[nx]&&guard<p){ G.skip[nx]=false; G.last.push(A.name(nx)+" wordt overgeslagen (vier)."); nx=(nx+1)%p; guard++; }
        G.cur=nx; G.phase="turn"; G.pend=null; shown=null; sel=null; mode=null;
        A.S.active=nx; A.save(); A.renderPlayers(); render();
      }
      function pickTarget(j){
        if(stale()||G.phase!=="king")return;
        G.pend.target=j; G.phase="kingResp"; shown=null;
        A.S.active=j; A.save(); A.renderPlayers(); render();
        reveal(j,A.name(G.pend.who)+" wijst jou aan met een koning. Laat niemand meekijken.");
      }
      /* Koning terugleggen: de aangewezen speler legt buiten de beurt om zijn koning op (0 punten) en pakt een kaart bij;
         hij wijst zelf niemand meer aan en de beurt gaat daarna gewoon door links van de eerste speler. */
      function respond(counter){
        if(stale()||G.phase!=="kingResp")return;
        var P=G.pend, i=P.who, j=P.target, k=-1, x;
        if(counter){
          for(x=0;x<G.hands[j].length;x++) if(G.hands[j][x].r===13){ k=x; break; }
          if(k<0)return;
          var kc=G.hands[j].splice(k,1)[0]; G.pile.push(kc); draw(j); A.atje(i,1);
          G.last.push(A.name(j)+" legt zelf een koning op ("+cardTxt(kc)+"): "+A.name(i)+" trekt een heel adtje.");
          A.play("special"); A.overlay("win","Koning terug!",[A.name(i)+" trekt een heel adtje.",A.name(j)+" had zelf ook een koning."],0);
        } else {
          A.atje(j,0.5);
          G.last.push(A.name(j)+" trekt een half adtje, aangewezen door "+A.name(i)+".");
          A.play("dood"); A.overlay("dood","Half adtje",[A.name(j)+" trekt een half adtje.","Aangewezen door "+A.name(i)+" met een koning."],0);
        }
        A.onOverlayClose(null);
        advance(i);
      }

      function slot(c,idx,tap){
        var cls="card"+(A.isRed(c)?" red":"")+(tap&&sel===idx?" sel":""), inner='<b>'+A.RANKS[c.r]+'</b><i>'+A.SUITS[c.s]+'</i>';
        return '<div class="negenennegentig-slot">'+(tap?'<button class="'+cls+'" data-c="'+idx+'" aria-label="'+esc(cardTxt(c))+'" aria-pressed="'+(sel===idx)+'">'+inner+'</button>':'<span class="'+cls+'">'+inner+'</span>')+'<small>'+capt(c)+'</small></div>';
      }
      function lastHtml(){ return G.last&&G.last.length?'<div class="negenennegentig-log">'+G.last.map(function(l){ return '<div>'+esc(l)+'</div>'; }).join("")+'</div>':''; }
      function on(q,fn){ var b=root.querySelector(q); if(b)b.onclick=fn; }

      function render(){
        var p=n(), h="", askSure=sure; sure=false; seen=p;
        if(p<2||p>12){
          root.innerHTML='<p class="hint">'+(p<2?"99 speel je met minstens twee spelers. Voeg bovenaan een speler toe.":"Met één spel kaarten kunnen hooguit twaalf spelers meedoen (ieder vier kaarten). Haal bovenaan spelers weg.")+'</p>';
          G.n=0; /* straks zitten er andere mensen aan tafel: dan opnieuw delen */
          return;
        }
        if(G.n!==p||!ok()){
          var changed=!!(G.n&&G.n!==p&&G.hands);
          newRound(A.S.active,true);
          if(changed){ G.last=["Het aantal spelers is veranderd: er is opnieuw gedeeld."]; A.save(); }
        }
        /* na herladen of een ander spel kan bovenaan de verkeerde speler gemarkeerd staan */
        if(A.S.active!==turnOf()){ A.S.active=turnOf(); A.save(); A.renderPlayers(); }
        var ph=G.phase, cur=G.cur, top=G.pile.length?G.pile[G.pile.length-1]:null, P=G.pend, sk=[], hand, c, j;
        G.skip.forEach(function(s,i){ if(s) sk.push(i); });

        h+='<div class="board"><div class="negenennegentig-top">'+(top?A.cardHtml(top,"big"):'<span class="negenennegentig-empty">open stapel</span>')+
          '<div class="negenennegentig-tot"><span>'+(ph==="name"?"Stond op":"Totaal")+'</span><b>'+tot(G.total)+'</b><small>'+(ph==="over"?"over de 99":"boven 99 heb je verloren")+'</small></div></div>'+
          '<div class="stat"><span>Ronde <b>'+G.round+'</b></span><span>Gesloten stapel: <b>'+G.stock.length+'</b></span><span>Open: <b>'+G.pile.length+'</b></span></div>'+
          (sk.length?'<div class="stat"><span>Wordt de volgende keer overgeslagen: <b>'+esc(A.joinNames(sk))+'</b></span></div>':'')+'</div>';

        if(ph==="turn"){
          hand=G.hands[cur];
          if(shown!==cur){
            h+=lastHtml();
            if(!G.pile.length) h+='<p class="hint">Om de beurt leg je een kaart op de stapel en noem je het nieuwe totaal. Wie boven de 99 komt, heeft verloren.</p>';
            h+='<p class="hint"><b>'+esc(A.name(cur))+'</b> is aan de beurt'+(G.pile.length?'.':' en begint de ronde. Tik bovenaan op een naam om iemand anders te laten beginnen.')+'</p>';
            h+='<div class="btnrow"><button class="btn gold" id="nn99-show">Telefoon naar '+esc(A.name(cur))+': toon hand</button></div>';
          } else if(!hand.length){
            h+='<p class="hint">'+esc(A.name(cur))+' heeft geen kaarten meer.</p><div class="btnrow"><button class="btn gold" id="nn99-pass">Beurt voorbij</button></div>';
          } else {
            h+='<p class="hint"><b>'+esc(A.name(cur))+'</b>, kies een kaart om op te leggen.</p>';
            h+='<div class="negenennegentig-hand">'+hand.map(function(x,i){ return slot(x,i,true); }).join("")+'</div>';
            c=sel!==null?hand[sel]:null;
            if(c){
              if(c.r===1) h+='<div class="seg"><span>De aas telt als</span><button data-m="lo" aria-pressed="'+(mode==="lo")+'">1</button><button data-m="hi" aria-pressed="'+(mode==="hi")+'">11</button></div>';
              else if(c.r===10) h+='<div class="seg"><span>De tien is</span><button data-m="hi" aria-pressed="'+(mode==="hi")+'">10 erbij</button><button data-m="lo" aria-pressed="'+(mode==="lo")+'">10 eraf</button></div>';
              else if(c.r===13) h+='<p class="hint">Koning: 0 punten. Daarna wijs je iemand aan voor een half adtje.</p>';
              else if(c.r===4) h+='<p class="hint">Vier: 4 punten, en jij wordt de volgende keer overgeslagen.</p>';
              var need=(c.r===1||c.r===10)&&!mode, pv=c.r===1?(mode==="hi"?11:1):c.r===10?(mode==="lo"?-10:10):baseVal(c);
              if(need) h+='<p class="hint">Kies eerst hierboven hoe de kaart telt.</p>';
              h+='<div class="btnrow"><button class="btn gold" id="nn99-play"'+(need?' disabled':'')+'>Leg '+esc(cardTxt(c))+' op'+(!G.count&&!need?' (totaal wordt '+tot(G.total+pv)+')':'')+'</button></div>';
            }
            h+='<div class="btnrow"><button class="btn" id="nn99-hide">Verberg hand</button></div>';
          }
        } else if(ph==="name"){
          h+='<div class="verdict neutral"><h2>Noem het totaal</h2><p>'+esc(playedTxt(P))+'. Wat is het nieuwe totaal? Fout is een slok.</p><div class="negenennegentig-names">'+
            G.opts.map(function(v){ return '<button data-v="'+v+'">'+tot(v)+'</button>'; }).join("")+'</div></div>';
        } else if(ph==="king"){
          h+=lastHtml();
          h+='<div class="verdict win"><h2>Koning</h2><p><b>'+esc(A.name(P.who))+'</b> wijst iemand aan voor een half adtje. Heeft die zelf een koning, dan mag hij of zij hem opleggen en trekt '+esc(A.name(P.who))+' een heel adtje. Tik op een naam.</p><div class="btnrow">'+
            A.others(P.who).map(function(o){ return '<button class="btn primary" data-t="'+o+'">'+esc(A.name(o))+'</button>'; }).join("")+'</div></div>';
        } else if(ph==="kingResp"){
          j=P.target; hand=G.hands[j];
          if(shown!==j){
            h+=lastHtml();
            h+='<p class="hint"><b>'+esc(A.name(P.who))+'</b> wijst <b>'+esc(A.name(j))+'</b> aan. '+esc(A.name(j))+' kijkt eerst in de eigen hand.</p>';
            h+='<div class="btnrow"><button class="btn gold" id="nn99-show">Telefoon naar '+esc(A.name(j))+'</button></div>';
          } else {
            var hasK=hand.some(function(x){ return x.r===13; });
            h+='<p class="hint"><b>'+esc(A.name(j))+'</b>, '+esc(A.name(P.who))+' wijst jou aan met een koning.</p>';
            h+='<div class="negenennegentig-hand">'+hand.map(function(x,i){ return slot(x,i,false); }).join("")+'</div>';
            if(hasK) h+='<div class="btnrow"><button class="btn gold" id="nn99-counter">Leg je koning op: '+esc(A.name(P.who))+' trekt een heel adtje</button><button class="btn" id="nn99-accept">Zelf een half adtje trekken</button></div>';
            else h+='<p class="hint">Je hebt geen koning.</p><div class="btnrow"><button class="btn gold" id="nn99-accept">Ik trek een half adtje</button></div>';
          }
        } else { /* over */
          h+='<div class="verdict fout"><h2>Over de 99</h2><p><b>'+esc(A.name(G.loser))+'</b> heeft verloren en trekt '+adt(G.lostPen||G.pen)+'.</p>'+
            '<div class="btnrow"><button class="btn gold" id="nn99-next">Nieuwe ronde</button></div></div>'+lastHtml();
        }

        h+='<div class="negenennegentig-foot">'+
          '<div class="seg"><span>Verliezer trekt</span><button data-pen="0.5" aria-pressed="'+(G.pen===0.5)+'">half adtje</button><button data-pen="1" aria-pressed="'+(G.pen===1)+'">heel adtje</button></div>'+
          '<div class="seg"><span>Totaal noemen</span><button data-cnt="1" aria-pressed="'+!!G.count+'">zelf (fout is een slok)</button><button data-cnt="0" aria-pressed="'+!G.count+'">de app telt</button></div>'+
          '<div class="btnrow"><button class="btn'+(askSure?' danger':'')+'" id="nn99-new">'+(askSure?"Zeker weten? Tik nog eens":"Nieuw spel")+'</button></div></div>';
        root.innerHTML='<div class="negenennegentig-wrap">'+h+'</div>';

        on("#nn99-show",function(){ if(stale())return; if(G.phase==="kingResp") reveal(G.pend.target,A.name(G.pend.who)+" wijst jou aan met een koning. Laat niemand meekijken."); else if(G.phase==="turn") reveal(G.cur,"Jouw hand. Laat niemand meekijken."); });
        on("#nn99-hide",function(){ shown=null; sel=null; mode=null; render(); });
        on("#nn99-pass",function(){ if(stale())return; G.last=[A.name(G.cur)+" heeft geen kaarten en slaat over."]; advance(G.cur); });
        on("#nn99-play",commit);
        on("#nn99-counter",function(){ respond(true); });
        on("#nn99-accept",function(){ respond(false); });
        /* De bijbel zegt niet wie de volgende ronde begint: de verliezer begint. */
        on("#nn99-next",function(){ newRound(G.loser,false); render(); });
        on("#nn99-new",function(){ if(!askSure){ sure=true; render(); return; } newRound(G.cur,true); render(); });
        root.querySelectorAll("[data-c]").forEach(function(b){ b.onclick=function(){ var x=+b.getAttribute("data-c"); sel=(sel===x?null:x); mode=null; render(); }; });
        root.querySelectorAll("[data-m]").forEach(function(b){ b.onclick=function(){ mode=b.getAttribute("data-m"); render(); }; });
        root.querySelectorAll("[data-v]").forEach(function(b){ b.onclick=function(){ if(stale()||G.phase!=="name")return; resolve(+b.getAttribute("data-v")); }; });
        root.querySelectorAll("[data-t]").forEach(function(b){ b.onclick=function(){ pickTarget(+b.getAttribute("data-t")); }; });
        root.querySelectorAll("[data-pen]").forEach(function(b){ b.onclick=function(){ G.pen=+b.getAttribute("data-pen"); A.save(); render(); }; });
        root.querySelectorAll("[data-cnt]").forEach(function(b){ b.onclick=function(){ G.count=b.getAttribute("data-cnt")==="1"; A.save(); render(); }; });
      }

      /* Spelers erbij of eraf via de balk bovenaan: core meldt dat niet, dus kijk mee en deel dan opnieuw. */
      if(obs){ obs.disconnect(); obs=null; }
      var bar=el("players");
      if(bar&&typeof MutationObserver!=="undefined"){ obs=new MutationObserver(function(){ if(n()!==seen) render(); }); obs.observe(bar,{childList:true}); }

      render();
      this.refresh=render;
      /* De app bewaakt de beurt. Alleen voordat de eerste kaart ligt mag je bovenaan kiezen wie begint. */
      this.onPlayer=function(i){
        if(n()!==G.n||!ok()){ render(); return; }
        if(G.phase==="turn"&&!G.pile.length){ G.cur=i; shown=null; sel=null; mode=null; A.save(); render(); return; }
        A.S.active=turnOf(); A.save(); A.renderPlayers();
      };
      this.destroy=function(){ shown=null; if(obs){ obs.disconnect(); obs=null; } };
    }
  });
})();
