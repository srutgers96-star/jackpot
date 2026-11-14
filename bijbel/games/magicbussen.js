/* ===== Magic Bussen =====
   Drie fases, alles op één telefoon (de kaarten liggen in dit spel open, er is niets geheim):
   1. de vragen: iedereen krijgt vier kaarten en raadt er per kaart iets over;
   2. het veld: 4 kolommen van 2 kaarten plus één laatste kaart rechts (plaatje in de bijbel, blz. 12);
   3. de bus: ruit van 1-2-3-2-1 kaarten (blz. 13) die de buspassagiers moeten oversteken.
   Keuzes waar de bijbel niets of iets dubbelzinnigs zegt:
   - fase 1 gaat per vraag de kring rond (eerst iedereen vraag I, dan iedereen vraag II, ...);
   - fout in fase 1 is één slok (goed is ook "een slok" uitdelen);
   - gelijk aan de eerste kaart is niet hoger en niet lager, dus fout; op de paal is niet binnen en niet buiten, dus fout;
   - "een kaart voor zich hebben" = een kaart met dezelfde waarde; heb je er twee, dan telt het twee keer;
   - uitdelen in fase 2 mag je verdelen: elke tik is één slok;
   - heeft niemand de laatste kaart, dan zegt de bijbel niets: de app biedt een nieuwe laatste kaart aan, of de tafel wijst iemand aan;
   - een plaatje is boer, vrouw of heer (de aas niet);
   - zitten er meer spelers in de bus, dan steken ze samen over: om de beurt een kaart aanwijzen, bij een plaatje drinken ze allemaal;
   - de kolom telt vanaf de kant waar je begon (eerste kaart = kolom 1);
   - is de stok in fase 3 op, dan worden de afgedekte kaarten onder de stapeltjes geschud tot nieuwe stok;
   - komt er tijdens het spel een speler bij, dan doet die pas het volgende spel mee (hij kan wel slokken krijgen);
     gaat er een speler weg, dan kloppen de handen niet meer en moet er een nieuw spel komen. */
(function(){
  "use strict";
  var A=App, esc=A.esc, ID="magicbussen";
  var ROM=["I","II","III","IV"], QS=["rood of zwart","hoger of lager","binnen of buiten","soort"];
  var SOORT=["schoppen","harten","ruiten","klaveren"];
  /* busveld: kolom c (0..4) en hoogte y in halve kaarten; twee kaarten grenzen als de kolommen buren zijn en y hooguit 1 scheelt */
  var POS=[{c:0,y:0},{c:1,y:-1},{c:1,y:1},{c:2,y:-2},{c:2,y:0},{c:2,y:2},{c:3,y:-1},{c:3,y:1},{c:4,y:0}];

  function css(){
    if(document.getElementById("magicbussen-style")) return;
    var s=document.createElement("style"); s.id="magicbussen-style";
    s.textContent=
      ".magicbussen-ans{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px}"+
      ".magicbussen-ans .opt{grid-template-columns:auto 1fr;gap:8px;padding:10px;min-height:56px}"+
      ".magicbussen-ans .opt .num{min-width:30px;font-size:22px}"+
      ".magicbussen-red{color:#ff8a78}"+
      ".magicbussen-gap{margin-top:12px}"+
      ".magicbussen-hands{display:grid;gap:4px}"+
      ".magicbussen-hand{display:grid;grid-template-columns:minmax(0,1fr) auto 38px;align-items:center;gap:8px;padding:4px 6px;border-radius:8px}"+
      ".magicbussen-cur{background:rgba(231,184,79,.14);box-shadow:inset 0 0 0 1.5px var(--gold)}"+
      ".magicbussen-nm{font-weight:700;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"+
      ".magicbussen-cs{display:flex;gap:4px}"+
      ".magicbussen-tl{font-size:13px;text-align:right;font-weight:700}"+
      ".magicbussen-ch{font-size:11px;color:var(--ivory-dim);font-weight:500}"+
      ".magicbussen-slot{width:32px;height:46px;border-radius:5px;border:1.5px dashed rgba(243,233,210,.3);flex:none}"+
      ".magicbussen-hit{outline:3px solid var(--gold);outline-offset:1px}"+
      ".magicbussen-bad{outline:3px solid var(--red);outline-offset:1px}"+
      ".magicbussen-dim{opacity:.5}"+
      ".magicbussen-field{display:flex;justify-content:center;align-items:center;gap:8px;margin:6px 0}"+
      ".magicbussen-col{display:flex;flex-direction:column;align-items:center;gap:8px}"+
      ".magicbussen-cl{width:46px;text-align:center;font-size:11px;color:var(--ivory-dim)}"+
      ".magicbussen-next{outline:3px solid var(--gold);outline-offset:2px}"+
      "button.magicbussen-next{cursor:pointer}"+
      ".magicbussen-reveal{display:flex;justify-content:center;margin:0 0 10px}"+
      ".magicbussen-who{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:4px 0 2px}"+
      ".magicbussen-who .btn{min-height:44px;min-width:72px}"+
      ".magicbussen-btn{min-height:44px}";
    document.head.appendChild(s);
  }

  function val(c){ return c.r===1?14:c.r; } /* de aas is hoog */
  function isPlaatje(c){ return c.r>=11; }
  function rankWord(r){ return r===1?"aas":r===11?"boer":r===12?"vrouw":r===13?"heer":String(r); }
  function slok(n){ return n===1?"1 slok":n+" slokken"; }
  function options(q){
    if(q===0) return [{a:"rood",sym:"♥",red:1,l:"Rood"},{a:"zwart",sym:"♠",l:"Zwart"}];
    if(q===1) return [{a:"hoger",sym:"▲",l:"Hoger"},{a:"lager",sym:"▼",l:"Lager"}];
    if(q===2) return [{a:"binnen",sym:"→←",l:"Binnen"},{a:"buiten",sym:"←→",l:"Buiten"}];
    return [{a:"1",sym:"♥",red:1,l:"Harten"},{a:"0",sym:"♠",l:"Schoppen"},{a:"2",sym:"♦",red:1,l:"Ruiten"},{a:"3",sym:"♣",l:"Klaveren"}];
  }
  function ansLabel(q,a){ return q===3?SOORT[+a]:a; }
  function correct(q,a,card,hand){
    var d, lo, hi, v;
    if(q===0) return (a==="rood")===A.isRed(card);
    if(q===1){ d=val(card)-val(hand[0]); return a==="hoger"?d>0:d<0; }
    if(q===2){ lo=Math.min(val(hand[0]),val(hand[1])); hi=Math.max(val(hand[0]),val(hand[1])); v=val(card); return a==="binnen"?(v>lo&&v<hi):(v<lo||v>hi); }
    return +a===card.s;
  }
  function vraag(q,hand){
    if(q===0) return "Is de volgende kaart rood of zwart?";
    if(q===1) return "Is de volgende kaart hoger of lager dan "+A.cardName(hand[0])+"? De aas is hoog.";
    if(q===2) return "Valt de volgende kaart binnen of buiten "+A.cardName(hand[0])+" en "+A.cardName(hand[1])+"?";
    return "Welke soort is de volgende kaart?";
  }

  A.register({ id:ID, beta:true, title:"Magic Bussen", level:"app", kans:true, sub:"Deelt de kaarten, legt het veld en de bus, telt alle slokken",
    init:function(root){
      var G=A.gs(ID), confirmNew=false, lockUntil=0;
      css();

      /* ---- toestand ---- */
      function wipe(){ Object.keys(G).forEach(function(k){ delete G[k]; }); }
      function validCount(){ var n=A.S.players.length; return n>=2&&n<=10; } /* 4 kaarten per speler + 9 voor het veld uit 52 */
      function busy(){ return G.phase==="deal"||G.phase==="field"||G.phase==="bus"; }
      /* een speler erbij (achteraan in de lijst) verschuift niets: het spel loopt door. Een speler eraf verschuift de nummers. */
      function stale(){ return busy()&&A.S.players.length<G.n; }
      /* na een tik die het scherm verandert even geen tikken aannemen: een dubbele tik raakt anders de knop die op dezelfde plek verschijnt */
      function hold(){ lockUntil=Date.now()+350; }
      function say(t){ G.log=G.log||[]; G.log.unshift(t); if(G.log.length>6) G.log.length=6; }
      function sip(i,n){ G.tally[i]=(G.tally[i]||0)+n; A.drink(i,n); }
      function expected(){
        if(G.phase==="deal") return G.cur;
        if(G.phase==="field"&&G.fq&&G.fq.length) return G.fq[0].p;
        if(G.phase==="bus") return G.riders[G.bus.turn%G.riders.length];
        return null;
      }
      function sync(){ var e=expected(); if(e!==null&&e<A.S.players.length) A.S.active=e; A.save(); A.renderPlayers(); }

      function deal(){
        var n=A.S.players.length, i;
        wipe();
        G.phase="deal"; G.n=n; G.start=A.S.active<n?A.S.active:0; G.cur=G.start; G.q=0;
        G.hands=[]; G.tally=[]; for(i=0;i<n;i++){ G.hands.push([]); G.tally.push(0); }
        G.stock=A.deck(0); G.pend=null; G.log=[];
      }

      /* ---- fase 1: de vragen ---- */
      function answer(a){
        if(G.phase!=="deal"||G.pend) return;
        var p=G.cur, hand=G.hands[p], card=G.stock.pop(), ok=correct(G.q,a,card,hand);
        hand.push(card); G.pend={ok:ok,a:a};
        if(ok){ A.play("ding"); A.save(); }
        else { say(A.name(p)+" zegt "+ansLabel(G.q,a)+", krijgt "+A.cardName(card)+": drinkt 1 slok"); A.play("clack"); sip(p,1); }
        hold(); render();
      }
      function advance(){
        G.pend=null; G.cur=(G.cur+1)%G.n;
        if(G.cur===G.start){ G.q++; if(G.q>3) layField(); }
      }
      function give1(t){
        if(G.phase!=="deal"||!G.pend||!G.pend.ok||t===G.cur) return;
        var p=G.cur;
        say(A.name(t)+" drinkt 1 slok, uitgedeeld door "+A.name(p));
        A.toast(A.name(t)+" drinkt 1 slok","Uitgedeeld door "+A.name(p)+".",2400);
        advance(); sip(t,1); sync(); hold(); render();
      }
      function next1(){ if(G.phase!=="deal"||!G.pend||G.pend.ok) return; advance(); sync(); hold(); render(); }

      /* ---- fase 2: het veld ---- */
      function layField(){
        var i; G.phase="field"; G.field=[]; for(i=0;i<9;i++) G.field.push(G.stock.pop());
        G.turned=0; G.fq=[]; G.msgs=[]; G.nobus=false; G.riders=null;
      }
      function resolve(idx){
        var card=G.field[idx], rw=rankWord(card.r), m=[], who=[], i, k, col, top, n, has;
        for(i=0;i<G.n;i++){ m[i]=G.hands[i].filter(function(c){ return c.r===card.r; }).length; }
        for(k=0;k<G.n;k++){ i=(G.start+k)%G.n; if(m[i]) who.push(i); }
        G.msgs=[]; G.fq=[]; G.nobus=false; G.riders=null; G.hit=who.length>0;
        if(idx===8){
          if(who.length){
            G.riders=who.slice().sort(function(a,b){ return a-b; });
            G.msgs.push(A.joinNames(G.riders)+(who.length>1?" hebben een "+rw+" en zitten":" heeft een "+rw+" en zit")+" in de bus.");
            say(A.joinNames(G.riders)+(who.length>1?" zitten":" zit")+" in de bus ("+A.cardName(card)+")");
            /* blijft staan tot een tik: een overlay die vanzelf verdwijnt laat tikken door naar de knop eronder */
            A.play("dood"); A.overlay("dood","In de bus!",[A.joinNames(G.riders)+(who.length>1?" hebben":" heeft")+" een "+rw+"."],0); A.onOverlayClose(null);
          } else G.nobus=true;
          sync(); render(); return;
        }
        col=(idx>>1)+1; top=idx%2===0;
        if(!who.length) G.msgs.push("Niemand heeft een "+rw+".");
        for(k=0;k<who.length;k++){
          i=who[k]; n=col*m[i]; has=A.name(i)+" heeft "+(m[i]>1?m[i]+"× ":"")+"een "+rw;
          if(top) G.fq.push({p:i,n:n,tot:n,has:has,to:{}});
          else { G.msgs.push(has+" en drinkt "+slok(n)+"."); say(A.name(i)+" drinkt "+slok(n)+" ("+A.cardName(card)+", onderste rij, kolom "+col+")"); sip(i,n); }
        }
        A.play(who.length?(top?"ding":"clack"):"tick");
        sync(); render();
      }
      function turn(){
        if(G.phase!=="field"||G.fq.length||G.turned>=9) return;
        G.turned++; hold(); resolve(G.turned-1);
      }
      function give2(t){
        var f=G.fq[0], line; if(G.phase!=="field"||!f||t===f.p) return;
        f.n--; f.to[t]=(f.to[t]||0)+1;
        if(f.n<=0){
          G.fq.shift();
          line=A.name(f.p)+" deelt "+slok(f.tot)+" uit: "+Object.keys(f.to).map(function(k){ return A.name(+k)+" "+f.to[k]; }).join(", ");
          G.msgs.push(line+"."); say(line); hold();
        }
        A.play("tick"); sip(t,1); sync(); render();
      }
      function redraw(){ if(G.phase!=="field"||!G.nobus||!G.stock.length) return; G.field[8]=G.stock.pop(); hold(); resolve(8); }
      function appoint(i){
        if(G.phase!=="field"||!G.nobus) return;
        G.nobus=false; G.riders=[i]; G.msgs=[A.name(i)+" is door de tafel aangewezen en zit in de bus."];
        say(A.name(i)+" zit in de bus (aangewezen)"); A.play("dood"); sync(); hold(); render();
      }

      /* ---- fase 3: de bus ---- */
      function startBus(){
        if(G.phase!=="field"||!G.riders||!G.riders.length) return;
        var d=A.deck(0), piles=[], open=[], i; /* alle kaarten worden ingenomen: een vers geschud spel */
        for(i=0;i<9;i++){ piles.push([d.pop()]); open.push(false); }
        G.phase="bus"; G.hands=null; G.field=null; G.fq=[]; G.msgs=[];
        G.bus={piles:piles,open:open,path:[],stock:d,tries:1,turn:0,fail:null,resh:false};
        sync(); hold(); render();
      }
      function pickable(){
        var B=G.bus, path=B.path, out=[], last, dir;
        if(B.fail||G.phase!=="bus") return out;
        if(!path.length) return [0,8]; /* links of rechts beginnen maakt niet uit */
        last=POS[path[path.length-1]]; dir=path[0]===0?1:-1;
        POS.forEach(function(p,i){ if(p.c===last.c+dir&&Math.abs(p.y-last.y)<=1) out.push(i); });
        return out;
      }
      function pick(i){
        var B=G.bus, r=G.riders, pile, card, col;
        if(G.phase!=="bus"||pickable().indexOf(i)<0) return;
        pile=B.piles[i]; card=pile[pile.length-1]; col=B.path.length+1; B.open[i]=true;
        if(isPlaatje(card)){
          B.fail={i:i,col:col};
          say("Plaatje ("+A.cardName(card)+") in kolom "+col+": "+A.joinNames(r)+(r.length>1?" drinken elk ":" drinkt ")+slok(col));
          A.play("dood"); r.forEach(function(p){ sip(p,col); });
        } else {
          B.path.push(i);
          if(B.path.length===5){
            G.phase="done"; say(A.joinNames(r)+(r.length>1?" zijn":" is")+" uit de bus na "+(B.tries===1?"1 poging":B.tries+" pogingen"));
            A.play("win"); A.overlay("win","Uit de bus!",[A.joinNames(r)+(r.length>1?" zijn":" is")+" het veld overgestoken."],0); A.onOverlayClose(null);
          } else { B.turn++; A.play("clack"); }
        }
        sync(); render();
      }
      function restart(){
        var B=G.bus, need=[], i; if(G.phase!=="bus"||!B.fail) return;
        for(i=0;i<9;i++) if(B.open[i]) need.push(i);
        if(B.stock.length<need.length){ /* stok op: wat onder de stapeltjes ligt wordt geschud en is de nieuwe stok */
          for(i=0;i<9;i++){ while(B.piles[i].length>1) B.stock.push(B.piles[i].shift()); }
          A.shuffle(B.stock); B.resh=true;
        }
        need.forEach(function(j){ B.piles[j].push(B.stock.pop()); B.open[j]=false; });
        B.path=[]; B.fail=null; B.tries++; B.turn++;
        A.play("tick"); sync(); hold(); render();
      }

      /* ---- tekenen ---- */
      function whoHtml(p,attr){
        return '<div class="magicbussen-who">'+A.S.players.map(function(q,i){ return i===p?'':'<button class="btn" data-'+attr+'="'+i+'">'+esc(q.name)+'</button>'; }).join("")+'</div>';
      }
      function handsHtml(hitRank,cur){
        var h='<div class="magicbussen-hands"><div class="magicbussen-hand"><span class="magicbussen-ch">open op tafel</span><span></span><span class="magicbussen-ch" style="text-align:right">slokken</span></div>';
        G.hands.forEach(function(hand,i){
          var cs="", k, c;
          for(k=0;k<4;k++){ c=hand[k]; cs+=c?A.cardHtml(c,"small"+(hitRank&&c.r===hitRank?" magicbussen-hit":"")):'<span class="magicbussen-slot"></span>'; }
          h+='<div class="magicbussen-hand'+(i===cur?' magicbussen-cur':'')+'"><span class="magicbussen-nm">'+esc(A.name(i))+'</span><span class="magicbussen-cs">'+cs+'</span><span class="magicbussen-tl">'+(G.tally[i]||0)+'</span></div>';
        });
        return h+'</div>';
      }
      function logHtml(){ return G.log&&G.log.length?'<div class="log">'+G.log.map(function(l){ return '<div>'+esc(l)+'</div>'; }).join("")+'</div>':''; }
      function labels(arr){ return '<div class="magicbussen-field" style="margin:0">'+arr.map(function(t){ return '<span class="magicbussen-cl">'+esc(t)+'</span>'; }).join("")+'</div>'; }

      function renderIntro(){
        var ok=validCount(), n=A.S.players.length, st=A.S.active<n?A.S.active:0, h='<div class="verdict neutral"><h2>Magic Bussen</h2><p>Eerst krijgt iedereen vier kaarten en raadt er per kaart iets over. Dan bepaalt het veld wie uitdeelt, wie drinkt en wie in de bus zit. Wie in de bus zit, moet het laatste veld oversteken zonder plaatjes.</p>';
        if(ok) h+='<p><b>'+esc(A.name(st))+'</b> krijgt de eerste kaart, daarna met de klok mee. Tik hierboven een andere speler om te wisselen.</p>';
        /* de knop staat er altijd: de app tekent dit scherm niet vanzelf opnieuw als er hierboven een speler bij komt of weg gaat */
        h+='<button class="roll" data-act="start">Deel de kaarten</button></div>';
        if(!ok) h+='<p class="hint">Magic Bussen speel je met 2 tot 10 spelers: vier kaarten per speler en negen voor het veld. '+(n<2?'Voeg hierboven een speler toe met + speler':'Haal hierboven spelers weg: tik een speler twee keer aan en kies Verwijder')+', en tik dan op Deel de kaarten.</p>';
        return h;
      }
      function renderDeal(){
        var p=G.cur, hand=G.hands[p], q=G.q, pend=G.pend, h, cs="", k, card, opts, cnt, best, tot=G.stock.length, extra="";
        h='<div class="stat"><span>Fase 1 van 3: de vragen</span><span>Vraag <b>'+ROM[q]+'</b> van IV: <b>'+QS[q]+'</b></span></div>';
        for(k=0;k<hand.length;k++) cs+=A.cardHtml(hand[k],pend&&k===hand.length-1?"magicbussen-hit":"");
        if(!pend) cs+=A.cardHtml(null,"back");
        h+='<div class="cards">'+cs+'</div>';
        if(!pend){
          opts=options(q); best=0;
          cnt=opts.map(function(o){ var n=G.stock.filter(function(c){ return correct(q,o.a,c,hand); }).length; if(n>best)best=n; return n; });
          h+='<p class="hint"><b>'+esc(A.name(p))+'</b>: '+esc(vraag(q,hand))+'</p><div class="magicbussen-ans">';
          opts.forEach(function(o,j){
            var top=cnt[j]===best&&cnt.some(function(x){ return x!==best; });
            h+='<button class="opt'+(top?' best':'')+'" data-a="'+o.a+'"><span class="num'+(o.red?' magicbussen-red':'')+'">'+o.sym+'</span><span class="lbl">'+o.l+'<small class="kans">'+A.pct(cnt[j]/tot,0)+' kans</small></span></button>';
          });
          h+='</div>';
        } else {
          card=hand[hand.length-1];
          if(pend.ok) h+='<div class="verdict win"><h2>Goed!</h2><p>'+esc(A.name(p))+' zei '+esc(ansLabel(q,pend.a))+' en krijgt '+esc(A.cardName(card))+'. <b>'+esc(A.name(p))+' mag een slok uitdelen</b>: tik wie drinkt.</p>'+whoHtml(p,"g")+'</div>';
          else {
            if(q===1&&val(card)===val(hand[0])) extra=" Gelijk is niet hoger en niet lager.";
            if(q===2&&(val(card)===val(hand[0])||val(card)===val(hand[1]))) extra=" Op de paal is niet binnen en niet buiten.";
            h+='<div class="verdict fout"><h2>Fout</h2><p>'+esc(A.name(p))+' zei '+esc(ansLabel(q,pend.a))+' en krijgt '+esc(A.cardName(card))+'.'+extra+' <b>'+esc(A.name(p))+' drinkt 1 slok.</b></p><button class="roll" data-act="next">Volgende</button></div>';
          }
        }
        h+='<div class="board magicbussen-gap">'+handsHtml(0,p)+'</div>';
        return h;
      }
      function fieldCard(idx){
        if(idx<G.turned) return A.cardHtml(G.field[idx],idx===G.turned-1?"magicbussen-hit":"");
        return A.cardHtml(null,"back"+(idx===G.turned&&!G.fq.length?" magicbussen-next":""));
      }
      function renderField(){
        var t=G.turned, idx=t-1, f=G.fq[0], h, c, card, rw, col, top, lead, kind="neutral", given;
        h='<div class="stat"><span>Fase 2 van 3: het veld</span><span>Kaart <b>'+t+'</b> van 9</span></div>';
        h+='<div class="board magicbussen-gap">'+labels(["1","2","3","4","bus"])+'<div class="magicbussen-field">';
        for(c=0;c<4;c++) h+='<div class="magicbussen-col">'+fieldCard(c*2)+fieldCard(c*2+1)+'</div>';
        h+='<div class="magicbussen-col">'+fieldCard(8)+'</div></div><div class="stat"><span>Boven: uitdelen</span><span>Onder: zelf drinken</span><span>Kolom = slokken</span></div></div>';
        if(t===0) h+='<p class="hint">Iedereen heeft vier kaarten open voor zich. Draai de kaart linksboven; daarna de kaart eronder, dan de volgende kolom.</p>';
        else {
          card=G.field[idx]; rw=rankWord(card.r);
          if(idx===8){ lead="De laatste kaart: wie een "+rw+" voor zich heeft, zit in de bus."; if(G.riders) kind="fout"; }
          else {
            col=(idx>>1)+1; top=idx%2===0;
            lead="Kolom "+col+", "+(top?"bovenste rij: wie een "+rw+" heeft, deelt "+slok(col)+" uit.":"onderste rij: wie een "+rw+" heeft, drinkt zelf "+slok(col)+".");
            if(G.hit) kind=top?"win":"fout";
          }
          h+='<div class="verdict '+kind+' magicbussen-gap"><div class="magicbussen-reveal">'+A.cardHtml(card,"")+'</div><p><b>'+esc(lead)+'</b></p>';
          G.msgs.forEach(function(m){ h+='<p>'+esc(m)+'</p>'; });
          if(f){
            given=Object.keys(f.to).map(function(k){ return A.name(+k)+" "+f.to[k]; }).join(", ");
            h+='<p><b>'+esc(f.has)+' en deelt '+slok(f.tot)+' uit.</b> Nog '+f.n+': tik wie er één drinkt.'+(given?' Al uitgedeeld: '+esc(given)+'.':'')+'</p>'+whoHtml(f.p,"g");
          }
          if(idx===8&&G.riders) h+='<button class="roll" data-act="bus">Naar de bus</button>';
          if(idx===8&&G.nobus){
            h+='<p>Niemand heeft een '+esc(rw)+' voor zich. De bijbel zegt niet wat er dan gebeurt: draai een nieuwe laatste kaart, of wijs samen iemand aan die de bus in gaat.</p>';
            if(G.stock.length) h+='<button class="roll" data-act="redraw">Nieuwe laatste kaart</button>';
            h+=whoHtml(-1,"r");
          }
          h+='</div>';
        }
        if(!G.fq.length&&t<9) h+='<button class="roll magicbussen-gap" data-act="turn">'+(t===0?"Draai de eerste kaart":t===8?"Draai de laatste kaart":"Draai de volgende kaart")+'</button>';
        h+='<div class="board magicbussen-gap">'+handsHtml(t?G.field[idx].r:0,f?f.p:-1)+'</div>';
        return h;
      }
      function busField(){
        var B=G.bus, can=pickable(), dir=B.path.length?(B.path[0]===0?1:-1):(B.fail?(B.fail.i===0?1:B.fail.i===8?-1:0):0), h, c, lbl=[];
        h='<div class="magicbussen-field">';
        for(c=0;c<5;c++){
          h+='<div class="magicbussen-col">';
          POS.forEach(function(p,i){
            var pile, card; if(p.c!==c) return;
            pile=B.piles[i]; card=pile[pile.length-1];
            if(B.open[i]) h+=A.cardHtml(card,B.fail&&B.fail.i===i?"magicbussen-bad":"");
            else if(can.indexOf(i)>=0) h+='<button class="card back magicbussen-next" data-i="'+i+'" aria-label="Draai deze kaart"></button>';
            else h+=A.cardHtml(null,"back magicbussen-dim");
          });
          h+='</div>';
          lbl.push(dir===1?slok(c+1):dir===-1?slok(5-c):"");
        }
        return h+'</div>'+labels(lbl);
      }
      function busOdds(){
        /* kans op een plaatje: alle dichte kaarten en de stok zijn onderling inwisselbaar zolang er niet opnieuw geschud is */
        var B=G.bus, N=B.stock.length, F=B.stock.filter(isPlaatje).length, i, card, left=5-B.path.length, p=1, j;
        if(B.resh||B.fail) return "";
        for(i=0;i<9;i++) if(!B.open[i]){ card=B.piles[i][B.piles[i].length-1]; N++; if(isPlaatje(card)) F++; }
        for(j=0;j<left;j++) p*=(N-F-j)/(N-j);
        return '<div class="stat kans"><span>Plaatje op een dichte kaart: <b>'+A.pct(F/N,0)+'</b></span><span>Nu oversteken lukt: <b>'+A.pct(p,0)+'</b></span></div>';
      }
      function renderBus(){
        var B=G.bus, r=G.riders, who=r[B.turn%r.length], col=B.path.length+1, h, card;
        h='<div class="stat"><span>Fase 3 van 3: de bus</span><span>Poging <b>'+B.tries+'</b></span></div>';
        h+='<p class="hint">In de bus: <b>'+esc(A.joinNames(r))+'</b>. '+(B.fail?'Terug naar het begin.':B.path.length?esc(A.name(who))+' wijst de volgende kaart aan (kolom '+col+' van 5).':esc(A.name(who))+' wijst de eerste kaart aan: links of rechts, dat maakt niet uit.')+'</p>';
        h+='<div class="board">'+busField()+busOdds()+'</div>';
        if(B.fail){
          card=B.piles[B.fail.i][B.piles[B.fail.i].length-1];
          h+='<div class="verdict fout magicbussen-gap"><h2>Plaatje!</h2><p>'+esc(A.cardName(card))+' in kolom '+B.fail.col+'. <b>'+esc(A.joinNames(r))+(r.length>1?' drinken elk ':' drinkt ')+slok(B.fail.col)+'.</b> Op elke omgedraaide kaart komt een nieuwe kaart.</p><button class="roll" data-act="restart">Opnieuw beginnen</button></div>';
        }
        h+='<p class="hint">Een plaatje is een boer, vrouw of heer. Geen plaatje: een kolom verder, de volgende kaart moet grenzen aan de vorige. Wel een plaatje: opnieuw beginnen en per kolom een slok meer.</p>';
        return h;
      }
      function renderDone(){
        var B=G.bus, r=G.riders, h, i, rows=Math.min(Math.max(G.n,G.tally.length),A.S.players.length);
        h='<div class="verdict win"><h2>Uit de bus!</h2><p>'+esc(A.joinNames(r))+(r.length>1?' zijn':' is')+' het veld overgestoken in '+(B.tries===1?'één poging':B.tries+' pogingen')+'. Het spel is afgelopen.</p><button class="roll" data-act="new">Nieuw spel</button></div>';
        h+='<div class="board magicbussen-gap">'+busField()+'</div>';
        h+='<div class="board magicbussen-gap"><table class="score"><tr><th>speler</th><th>slokken dit spel</th></tr>';
        for(i=0;i<rows;i++) h+='<tr'+(r.indexOf(i)>=0?' class="cur"':'')+'><td>'+esc(A.name(i))+(r.indexOf(i)>=0?' (bus)':'')+'</td><td>'+(G.tally[i]||0)+'</td></tr>';
        return h+'</table></div>';
      }
      function render(){
        var h;
        if(!G.phase) h=renderIntro();
        else if(stale()) h='<p class="hint">Er is een speler weggehaald, de gedeelde kaarten kloppen niet meer. Tik op Nieuw spel.</p>';
        else if(G.phase==="deal") h=renderDeal();
        else if(G.phase==="field") h=renderField();
        else if(G.phase==="bus") h=renderBus();
        else h=renderDone();
        if(G.phase){
          h+=logHtml();
          if(G.phase!=="done") h+='<div class="btnrow magicbussen-gap"><button class="btn magicbussen-btn'+(confirmNew?' danger':'')+'" data-act="new">'+(confirmNew?'Zeker weten? Tik nog eens':'Nieuw spel')+'</button></div>';
        }
        root.innerHTML=h;
        bind("[data-a]",function(b){ answer(b.getAttribute("data-a")); });
        bind("[data-g]",function(b){ var t=+b.getAttribute("data-g"); if(G.phase==="deal") give1(t); else give2(t); });
        bind("[data-r]",function(b){ appoint(+b.getAttribute("data-r")); });
        bind("[data-i]",function(b){ pick(+b.getAttribute("data-i")); });
        bind("[data-act]",function(b,sure){
          var a=b.getAttribute("data-act");
          if(a==="new"){ /* terug naar het beginscherm: daar kies je wie de eerste kaart krijgt */
            if(busy()&&!stale()&&!sure){ confirmNew=true; render(); return; }
            wipe(); A.save(); hold(); render(); return;
          }
          if(a==="start"){
            if(!G.phase&&validCount()){ deal(); sync(); hold(); }
            render(); return;
          }
          if(stale()){ render(); return; }
          if(a==="next") next1(); else if(a==="turn") turn(); else if(a==="redraw") redraw(); else if(a==="bus") startBus(); else if(a==="restart") restart();
        },true);
      }
      /* free = de knop werkt ook als het aantal spelers is veranderd (Nieuw spel) */
      function bind(sel,fn,free){
        var list=root.querySelectorAll(sel), i;
        for(i=0;i<list.length;i++) attach(list[i],fn,free);
      }
      function attach(b,fn,free){
        b.onclick=function(){ var sure; if(Date.now()<lockUntil) return; sure=confirmNew; confirmNew=false; if(!free&&stale()){ render(); return; } fn(b,sure); };
      }

      /* een opgeslagen spel dat niet meer te lezen is: schoon beginnen in plaats van vastlopen */
      try{ if(busy()&&!stale()) sync(); render(); }catch(e){ wipe(); A.save(); render(); }
      this.refresh=render;
      /* de beurt ligt vast: tikt iemand een andere speler aan, dan springt de markering terug (voor het delen kies je zo wie begint) */
      this.onPlayer=function(){ confirmNew=false; if(busy()&&!stale()) sync(); render(); };
    }
  });
})();
