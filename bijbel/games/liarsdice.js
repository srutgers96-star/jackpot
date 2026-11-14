/* ===== Liar’s Dice =====
   Twee manieren van spelen (schakelaar "Stenen"):
   - in de app: de telefoon gaat rond; ieder gooit zijn stenen digitaal (of tikt zijn echte worp in) en ziet alleen zijn eigen stenen.
     Bij het trekken van de beker telt de app alles.
   - echt op tafel: echte stenen en bekers; de app houdt het bieden, de beurt, de stenen per speler en het drinken bij
     en vraagt bij het trekken hoeveel er liggen.
   Keuzes waar de bijbel ruimte laat:
   - Hoger bieden: "ofwel het aantal verhogen, ofwel de waarde verhogen". Het voorbeeld (zeven 2en, daarna zes 3en) laat zien dat
     het aantal mag zakken als de ogen omhoog gaan. Letterlijk gelezen dus: een bod is geldig als het aantal hoger is OF de ogen hoger zijn.
   - Enen zijn jokers tenzij het EERSTE bod van de ronde op enen is; dat geldt dan de hele ronde. Een later bod op enen telt alleen de enen zelf.
   - "Een half glas drinken" is geboekt als 4 slokken (een glas is 8 slokken), "dubbel drinken" als 8 slokken.
   - Steen kwijt: ligt de verliezer eruit, dan begint de eerstvolgende speler die nog stenen heeft. Het adtje voor "alles kwijt" komt bovenop het halve glas.
   - Jackpot: claimen kan zolang er nog niet geboden is, door iedereen met vijf stenen (bluffen kan, de bijbel kent de uitkomst "er liggen geen vijf dezelfde").
     "Iedereen moet een adtje" is gelezen als iedereen behalve de claimer (zoals bij optie I); de uitdager die verliest trekt dat adtje plus nog een half adtje,
     bovenop het halve adtje van het uitdagen. Na een jackpot is de ronde voorbij: iedereen gooit opnieuw, dezelfde speler begint, niemand levert een steen in.
   - Een bod hoger dan het aantal stenen op tafel kan nooit kloppen; de teller stopt daarom bij het totaal.
   - Adtje kruk (A.kruk) hoort bij spellen met twee dobbelstenen. Dit is een spel met vijf stenen per speler en de worp blijft geheim,
     dus de app roept het nooit aan, ook niet als iemand door de steen-kwijt-afspraak nog twee stenen over heeft. */
(function(){
  var A=App, el=A.el, esc=A.esc, pct=A.pct, ID="liarsdice";
  var EEN=["","één","twee","drie","vier","vijf","zes"], MEER=["","enen","tweeën","drieën","vieren","vijven","zessen"];
  function bidTxt(q,f){ return q+" "+(q===1?EEN:MEER)[f]; }
  /* P(X >= k) voor X ~ Bin(n,p) */
  function tail(n,p,k){ if(k<=0)return 1; if(k>n)return 0; var q=1-p, pm=Math.pow(q,n), s=0, i; for(i=0;i<k;i++){ s+=pm; pm=pm*(n-i)/(i+1)*p/q; } return Math.max(0,Math.min(1,1-s)); }
  function die(v,cls){ return '<span class="liarsdice-d'+(cls?" "+cls:"")+'">'+A.pips(v)+'</span>'; }
  function small(v,cls){ return '<span class="dsmall'+(cls?" "+cls:"")+'">'+A.pips(v)+'</span>'; }
  function hit(v,f,w){ return v===f||(w&&v===1); }
  function allSame(d){ return !!d&&d.length===5&&d.every(function(v){ return v===d[0]; }); }
  function css(){
    if(document.getElementById("liarsdice-style"))return;
    var s=document.createElement("style"); s.id="liarsdice-style";
    s.textContent=
      ".liarsdice-d{display:inline-grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);width:48px;height:48px;padding:7px;border-radius:10px;background:linear-gradient(#fffdf6,#efe7d2);box-shadow:0 4px 0 #c4b793;vertical-align:middle}"+
      ".liarsdice-d .pip{width:8px;height:8px}"+
      ".liarsdice-hand{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin:14px 0}"+
      ".liarsdice-bid{display:flex;align-items:center;justify-content:center;gap:12px;margin:14px 0 0;font-size:36px;font-weight:900}"+
      ".liarsdice-tight{padding:4px 0 8px}"+
      ".liarsdice-step{display:flex;align-items:center;justify-content:center;gap:10px;margin:6px 0}"+
      ".liarsdice-step button{width:56px;height:48px;border-radius:12px;border:1.5px solid var(--ivory-dim);background:rgba(0,0,0,.2);font-size:28px;font-weight:900;line-height:1;color:var(--ivory)}"+
      ".liarsdice-step button:disabled{opacity:.3}"+
      ".liarsdice-step b{min-width:84px;text-align:center;font-size:34px;font-weight:900}"+
      ".liarsdice-faces{display:flex;justify-content:center;gap:6px;margin:10px 0 4px}"+
      ".liarsdice-faces button{width:44px;height:44px;padding:6px;border-radius:10px;border:0;background:linear-gradient(#fffdf6,#efe7d2);box-shadow:0 3px 0 #c4b793;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);opacity:.5}"+
      ".liarsdice-faces button[aria-pressed=\"true\"]{opacity:1;outline:3px solid var(--gold);outline-offset:2px}"+
      ".liarsdice-faces .pip{width:8px;height:8px}"+
      ".liarsdice-miss{opacity:.35}"+
      ".liarsdice-gap{margin-top:10px}"+
      ".liarsdice-hit{box-shadow:0 0 0 2px var(--gold),0 2px 0 #c4b793}"+
      ".liarsdice-b{min-height:44px}"+
      ".liarsdice-seg button{min-height:40px}"+
      ".liarsdice-lbl{font-size:12px;color:var(--ivory-dim);align-self:center}"+
      ".liarsdice-foot{margin-top:18px;border-top:1px solid rgba(243,233,210,.15);padding-top:8px}";
    document.head.appendChild(s);
  }

  A.register({ id:ID, title:"Liar’s Dice", level:"app", beta:true, kans:true, sub:"Stenen onder de beker, bieden, beker trekken en wie drinkt",
    init:function(root){
      css();
      var G=A.gs(ID);
      var shown=null;            /* van wie de stenen nu open op het scherm staan; wordt nooit bewaard */
      var selQ=null, selF=null;  /* het bod dat de speler aan het samenstellen is */
      var cntSel=0, sure=false, dead=false, seq=0;
      var ask=null, askNext=null; /* "new" of "again": de knop is één keer getikt en vraagt om een tweede tik */
      var tClose=0;               /* wanneer de uitslag-overlay dicht ging: een dubbele tik mag de uitslag niet overslaan */
      if(G.mode!=="tafel")G.mode="app";
      G.vLose=!!G.vLose; G.vAdt=!!G.vAdt; G.vExact=!!G.vExact; G.vJack=!!G.vJack;
      if(G.phase==="count"&&G.bid&&G.bid.q>0)cntSel=G.bid.q;

      function n(){ return A.S.players.length; }
      function alive(){ var a=[],i; for(i=0;i<G.n;i++) if(G.cnt[i]>0)a.push(i); return a; }
      function total(){ var t=0,i; for(i=0;i<G.n;i++)t+=G.cnt[i]; return t; }
      function nextAlive(i){ var k,j; for(k=1;k<=G.n;k++){ j=(i+k)%G.n; if(G.cnt[j]>0)return j; } return i; }
      function toRoll(){ var k,j; for(k=0;k<G.n;k++){ j=(G.start+k)%G.n; if(G.cnt[j]>0&&!G.dice[j])return j; } return -1; }
      /* tellen de enen mee voor een bod op f? Voor het eerste bod (G.wild nog open): ja, tenzij dat bod zelf op enen is. */
      function wildFor(f){ return f!==1&&(G.wild===null||G.wild===undefined?true:!!G.wild); }
      function countTable(f){ var w=wildFor(f), c=0; G.dice.forEach(function(d){ if(d)d.forEach(function(v){ if(hit(v,f,w))c++; }); }); return c; }
      function ok(){
        var i;
        if(!G.cnt||G.cnt.length!==G.n||!G.dice||G.dice.length!==G.n||!G.man||!G.hist)return false;
        if(!/^(roll|bid|count|jack|reveal|over)$/.test(G.phase))return false;
        if(!(G.round>=1))return false;
        for(i=0;i<G.n;i++){ if(!(G.cnt[i]>=0&&G.cnt[i]<=5))return false; if((G.phase==="roll"||G.phase==="bid")&&G.dice[i]&&G.dice[i].length!==G.cnt[i])return false; }
        if(G.bid&&!(G.bid.q>=1&&G.bid.f>=1&&G.bid.f<=6&&G.bid.by>=0&&G.bid.by<G.n))return false;
        if(G.res&&G.res.type==="call"&&!(G.res.loser>=0&&G.res.loser<G.n))return false;
        if(G.phase==="over"&&!(G.res.type==="call"&&G.res.winner>=0&&G.res.winner<G.n))return false;
        if(!(G.cur>=0&&G.cur<G.n&&G.start>=0&&G.start<G.n))return false;
        if((G.phase==="reveal"||G.phase==="over")&&!G.res)return false;
        if(G.phase==="count"&&(!G.bid||G.mode!=="tafel"))return false;
        if(G.phase==="jack"&&!G.jack)return false;
        if(G.phase==="roll"&&G.mode!=="app")return false;
        if(G.phase!=="over"&&alive().length<2)return false;
        if(G.phase==="bid"&&G.mode==="app") for(i=0;i<G.n;i++) if(G.cnt[i]>0&&!G.dice[i])return false;
        return true;
      }
      function stale(){ if(dead)return true; if(n()<2||n()!==G.n||!ok()){ shown=null; render(); return true; } return false; }
      /* wie is er aan zet (of moet er nu iets doen)? */
      function turn(){
        var a=G.cur;
        if(G.phase==="roll"){ a=toRoll(); if(a<0)a=G.start; }
        else if((G.phase==="reveal"||G.phase==="over")&&G.res) a=G.res.type==="call"?G.res.loser:G.res.by;
        else if(G.phase==="jack"&&G.jack&&G.jack.by!==null) a=G.jack.by;
        if(!(a>=0&&a<n()))a=0;
        return a;
      }
      function sync(){ A.S.active=turn(); A.save(); A.renderPlayers(); }
      function fresh(){ return !G.bid&&G.phase!=="jack"&&G.phase!=="count"&&!G.dice.some(function(d){ return !!d; }); }
      function newGame(){ var i; G.n=n(); G.cnt=[]; for(i=0;i<G.n;i++)G.cnt.push(5); G.round=0; newRound(A.S.active<G.n?A.S.active:0); }
      function newRound(start){
        var i; if(!(G.cnt[start]>0))start=nextAlive(start);
        G.round=(G.round||0)+1; G.start=start; G.cur=start; G.dice=[]; G.man=[];
        for(i=0;i<G.n;i++){ G.dice.push(null); G.man.push(false); }
        G.bid=null; G.wild=null; G.hist=[]; G.res=null; G.jack=null;
        G.phase=G.mode==="app"?"roll":"bid";
        shown=null; selQ=null; selF=null; sure=false; seq++;
        sync();
      }

      /* ---- bieden ---- */
      function canRaise(){ return !G.bid||G.bid.q<total()||G.bid.f<6; }
      function valid(q,f){ if(!(q>=1&&q<=total()&&f>=1&&f<=6))return false; return !G.bid||q>G.bid.q||f>G.bid.f; }
      function fixSel(){
        var t=total(), b=G.bid;
        if(selQ===null||selF===null){
          if(!b){ selQ=Math.max(1,Math.floor(t/3)); selF=2; }
          else if(b.q<t){ selQ=b.q+1; selF=b.f; }
          else { selQ=b.q; selF=Math.min(6,b.f+1); }
        }
        selQ=Math.max(1,Math.min(t,selQ));
      }
      function doBid(){
        if(stale()||G.phase!=="bid"||selQ===null||!valid(selQ,selF))return;
        var by=G.cur;
        G.bid={q:selQ,f:selF,by:by}; G.hist.push({q:selQ,f:selF,by:by});
        if(G.wild===null||G.wild===undefined)G.wild=selF!==1;
        G.cur=nextAlive(by); selQ=null; selF=null; sure=false;
        A.play("clack"); sync(); render();
      }
      function doCall(){
        if(stale()||G.phase!=="bid"||!G.bid)return;
        if(G.mode==="app"){ if(!sure){ sure=true; render(); return; } settle(countTable(G.bid.f)); }
        else { G.phase="count"; cntSel=Math.min(total(),G.bid.q); sure=false; A.save(); render(); }
      }
      function callLines(r){
        var L=[], dr=r.dbl?"dubbel: een heel glas (8 slokken), want het bod lag er precies":"een half glas (4 slokken)";
        L.push("Er "+(r.count===1?"ligt ":"liggen ")+bidTxt(r.count,r.f)+(r.wild?" (enen tellen mee)":"")+"; "+A.name(r.bidder)+" bood "+bidTxt(r.q,r.f)+".");
        L.push(r.holds?A.name(r.caller)+" geloofde het niet en drinkt "+dr+".":A.name(r.bidder)+" bood te hoog en drinkt "+dr+".");
        if(r.lost) L.push(A.name(r.loser)+" levert een steen in"+(r.out?" en ligt eruit."+(r.adt?" Alle stenen kwijt: "+A.name(r.loser)+" trekt ook een adtje.":""):" en heeft er nog "+r.left+"."));
        if(r.winner!==null) L.push(A.name(r.winner)+" heeft als laatste nog stenen en wint het spel.");
        return L;
      }
      /* de beker is getrokken: count = wat er op tafel ligt voor het bod */
      function settle(count){
        var b=G.bid, caller=G.cur, holds=count>=b.q, loser=holds?caller:b.by, al;
        var dbl=G.vExact&&holds&&count===b.q, sips=dbl?8:4;
        var r={type:"call",caller:caller,bidder:b.by,q:b.q,f:b.f,count:count,holds:holds,loser:loser,sips:sips,dbl:dbl,wild:wildFor(b.f),app:G.mode==="app",lost:false,out:false,adt:false,left:G.cnt[loser],winner:null};
        A.drink(loser,sips);
        if(G.vLose){
          G.cnt[loser]--; r.lost=true; r.left=G.cnt[loser];
          if(G.cnt[loser]===0){ r.out=true; if(G.vAdt){ A.atje(loser,1); r.adt=true; } }
          al=alive(); if(al.length===1)r.winner=al[0];
        }
        G.res=r; G.phase=r.winner!==null?"over":"reveal"; sure=false; shown=null; sync();
        A.play("dood"); A.overlay("dood",holds?"Het klopt!":"Gelogen!",callLines(r),0);
        A.onOverlayClose(function(){ tClose=Date.now(); if(!dead&&r.winner!==null)A.play("win"); });
        render();
      }
      function nextStart(){ var r=G.res, s=(r&&r.type==="call")?r.loser:G.start; return G.cnt[s]>0?s:nextAlive(s); }

      /* ---- jackpot (variant 3) ---- */
      function canClaim(i){ return G.vJack&&!G.bid&&(G.phase==="roll"||G.phase==="bid")&&G.cnt[i]===5&&!!G.dice[i]; }
      function claim(i){ G.jack={by:i,ch:null,back:G.phase}; G.phase="jack"; shown=null; sure=false; A.play("ding"); sync(); render(); }
      function jackLines(r){
        var by=A.name(r.by), L=[], t=r.dr.length===1?" trekt":" trekken";
        if(r.ch===null){ L.push("Niemand daagt "+by+" uit."); L.push(A.joinNames(r.dr)+t+" een adtje."); }
        else if(r.real){ L.push(by+" heeft echt vijf dezelfde. "+A.joinNames(r.dr)+t+" een adtje."); L.push(A.name(r.ch)+" daagde uit en trekt er nog een half adtje bij, naast het halve adtje van het uitdagen."); }
        else { L.push(by+" heeft geen vijf dezelfde en trekt een adtje."); L.push(A.name(r.ch)+" daagde uit met een half adtje en wint."); }
        return L;
      }
      function resolveJack(real){
        var J=G.jack, by=J.by, ch=J.ch, dr=[], r;
        if(ch===null||real){ alive().forEach(function(i){ if(i!==by){ A.atje(i,1); dr.push(i); } }); if(ch!==null)A.atje(ch,0.5); }
        else A.atje(by,1);
        r={type:"jack",by:by,ch:ch,real:ch===null?null:!!real,dr:dr,show:(ch!==null&&G.mode==="app"&&G.dice[by])?G.dice[by].slice():null};
        G.res=r; G.jack=null; G.phase="reveal"; shown=null; sync();
        if(ch!==null&&!real){ A.play("dood"); A.overlay("dood","Bluf!",jackLines(r),0); }
        else { A.play("special"); A.overlay("win","Jackpot!",jackLines(r),0); }
        A.onOverlayClose(function(){ tClose=Date.now(); }); render();
      }
      function challenge(c){
        var J=G.jack;
        if(stale()||G.phase!=="jack"||!J||J.by===null||J.ch!==null||c===J.by||!(G.cnt[c]>0))return;
        J.ch=c; A.atje(c,0.5); A.play("ding");
        if(G.mode==="app"&&G.dice[J.by]) resolveJack(allSame(G.dice[J.by]));
        else { A.save(); render(); }
      }

      /* ---- telefoon doorgeven en eigen stenen ---- */
      function pass(who,sub){
        var my=seq;
        A.handover(who,sub,function(){ if(dead||my!==seq||stale())return; if(G.phase!=="roll"&&G.phase!=="bid")return; if(!(G.cnt[who]>0))return; shown=who; render(); });
      }
      function hide(){
        if(stale())return;
        shown=null;
        if(G.phase==="roll"){
          var nx=toRoll();
          if(nx<0){ G.phase="bid"; G.cur=G.start; sync(); render(); }
          else { sync(); render(); pass(nx,"Gooi je stenen. Laat niemand meekijken."); }
        } else render();
      }

      /* ---- schermen ---- */
      function privHtml(){
        var i=shown, d=G.dice[i], h='<p class="hint"><b>'+esc(A.name(i))+'</b>, alleen jij kijkt.</p>', b, w, c;
        if(!d){
          h+='<p class="hint liarsdice-tight">'+(G.man[i]?'Tik je echte stenen opnieuw in.':'Gooi je '+G.cnt[i]+' '+(G.cnt[i]===1?'steen':'stenen')+', of tik op een steen om je echte worp in te vullen.')+' Daarna wordt er niet meer gegooid.</p><div id="ld-dice"></div>';
          return h;
        }
        h+='<div class="liarsdice-hand">'+d.map(function(v){ return die(v); }).join("")+'</div>';
        if(G.phase==="bid"&&G.bid){
          b=G.bid; w=wildFor(b.f); c=0; d.forEach(function(v){ if(hit(v,b.f,w))c++; });
          h+='<p class="hint liarsdice-tight">Het bod is '+esc(bidTxt(b.q,b.f))+(w?' (enen tellen mee)':'')+'. Jij hebt er '+c+'.<span class="kans"> Kans dat het er ligt met jouw stenen erbij: <b>'+pct(tail(total()-G.cnt[i],w?1/3:1/6,b.q-c),0)+'</b>.</span></p>';
        }
        h+='<div class="btnrow"><button class="btn gold liarsdice-b" id="ld-hide">Verberg mijn stenen</button></div>';
        if(G.phase==="roll"&&G.man[i]) h+='<div class="btnrow"><button class="btn liarsdice-b" id="ld-fix">Verkeerd ingetikt: opnieuw invullen</button></div>';
        if(canClaim(i)) h+='<div class="btnrow"><button class="btn liarsdice-b" id="ld-claim">Jackpot claimen</button></div><p class="hint liarsdice-tight">Vijf dezelfde? Zeg het. Daagt iemand je uit, dan gaat je beker omhoog.</p>';
        return h;
      }
      function rollHtml(){
        var who=toRoll(), h='<p class="hint">Ronde '+G.round+': iedereen gooit zijn stenen onder de beker. De telefoon gaat rond; ieder kijkt alleen naar zijn eigen stenen.</p>';
        h+='<div class="board"><table class="score"><tr><th>speler</th><th>stenen</th><th>gegooid</th></tr>';
        A.S.players.forEach(function(p,i){ var c=G.cnt[i]; h+='<tr'+(i===who?' class="cur"':'')+'><td>'+esc(p.name)+'</td><td>'+(c>0?c:'uit')+'</td><td>'+(c>0?(G.dice[i]?'ja':'nog niet'):'')+'</td></tr>'; });
        h+='</table></div><div class="btnrow"><button class="btn gold liarsdice-b" id="ld-pass">Telefoon naar '+esc(A.name(who))+'</button></div>';
        return h;
      }
      function bidHtml(){
        var t=total(), b=G.bid, cur=esc(A.name(G.cur)), last={}, h='', f, good;
        fixSel();
        G.hist.forEach(function(x){ last[x.by]=x; });
        h+='<div class="board"><table class="score"><tr><th>speler</th><th>stenen</th><th>laatste bod</th></tr>';
        A.S.players.forEach(function(p,i){ var c=G.cnt[i], x=last[i]; h+='<tr'+(i===G.cur?' class="cur"':'')+'><td>'+esc(p.name)+'</td><td>'+(c>0?c:'uit')+'</td><td>'+(x?x.q+' × '+small(x.f):'–')+'</td></tr>'; });
        h+='</table><div class="stat"><span>Ronde <b>'+G.round+'</b></span><span>Op tafel: <b>'+t+'</b> stenen</span><span>Enen: <b>'+(G.wild===null||G.wild===undefined?'joker, tenzij het eerste bod op enen is':G.wild?'joker':'geen joker')+'</b></span></div></div>';
        if(b){
          h+='<div class="liarsdice-bid"><span>'+b.q+' ×</span>'+die(b.f)+'</div>';
          h+='<p class="hint liarsdice-tight"><b>'+esc(A.name(b.by))+'</b> biedt: er liggen minstens '+esc(bidTxt(b.q,b.f))+(wildFor(b.f)?', enen tellen mee':'')+'.<span class="kans"> Kans zonder iemands stenen te kennen: <b>'+pct(tail(t,wildFor(b.f)?1/3:1/6,b.q),0)+'</b>.</span></p>';
        } else if(G.mode==="tafel"){
          h+='<p class="hint">Ronde '+G.round+': iedereen gooit zijn stenen onder de beker en kijkt. Liggen er stenen op elkaar, schud dan met je beker. Daarna wordt er niet meer gegooid.</p>';
        }
        h+='<p class="hint"><b>'+cur+'</b> '+(b?'is aan de beurt: bied hoger (meer stenen of hogere ogen) of trek de beker.':'begint met bieden: kies hoeveel stenen van welke ogen er minstens liggen, onder alle bekers samen.')+'</p>';
        if(canRaise()){
          good=valid(selQ,selF);
          h+='<div class="liarsdice-step"><button id="ld-qm" aria-label="Eén minder"'+(selQ<=1?' disabled':'')+'>−</button><b>'+selQ+' ×</b><button id="ld-qp" aria-label="Eén meer"'+(selQ>=t?' disabled':'')+'>+</button></div><div class="liarsdice-faces">';
          for(f=1;f<=6;f++) h+='<button data-f="'+f+'" aria-pressed="'+(selF===f)+'" aria-label="'+f+' ogen">'+A.pips(f)+'</button>';
          h+='</div>';
          if(good) h+='<p class="hint liarsdice-tight kans">Kans dat er '+esc(bidTxt(selQ,selF))+' liggen'+(wildFor(selF)?' (enen tellen mee)':'')+': <b>'+pct(tail(t,wildFor(selF)?1/3:1/6,selQ),0)+'</b></p>';
          else h+='<p class="hint liarsdice-tight">Bied een hoger aantal of hogere ogen dan '+esc(bidTxt(b.q,b.f))+'.</p>';
        } else {
          h+='<p class="hint liarsdice-tight">Hoger bieden kan niet meer: '+cur+' moet de beker trekken.</p>';
        }
        h+='<div class="btnrow">';
        if(canRaise()) h+='<button class="btn gold liarsdice-b" id="ld-bid"'+(good?'':' disabled')+'>Bied '+esc(bidTxt(selQ,selF))+'</button>';
        if(b) h+='<button class="btn danger liarsdice-b" id="ld-call">'+(sure?'Zeker? Tik nog eens: bekers omhoog':'Geloof ik niet: beker trekken')+'</button>';
        h+='</div>';
        if(G.mode==="app") h+='<div class="btnrow"><button class="btn liarsdice-b" id="ld-peek">Mijn stenen bekijken ('+cur+')</button></div>';
        else if(G.vJack&&!b&&alive().some(function(i){ return G.cnt[i]===5; })) h+='<div class="btnrow"><button class="btn liarsdice-b" id="ld-claimT">Iemand claimt jackpot</button></div>';
        if(G.hist.length>1){
          h+='<div class="log">'+G.hist.slice(-6).reverse().map(function(x){ return '<div><b>'+esc(A.name(x.by))+'</b>: '+esc(bidTxt(x.q,x.f))+'</div>'; }).join("")+'</div>';
        }
        return h;
      }
      function countHtml(){
        var b=G.bid, t=total(), w=wildFor(b.f), h='';
        if(cntSel>t)cntSel=t; if(cntSel<0)cntSel=0;
        h+='<div class="verdict neutral"><h2>Bekers omhoog</h2><p><b>'+esc(A.name(G.cur))+'</b> gelooft <b>'+esc(A.name(b.by))+'</b> niet. Iedereen trekt zijn beker. Tel alle '+MEER[b.f]+' op tafel'+(w?' en tel de enen mee als joker':'')+'.</p></div>';
        h+='<div class="liarsdice-bid"><span>bod: '+b.q+' ×</span>'+die(b.f)+'</div>';
        h+='<p class="hint">Hoeveel liggen er?</p><div class="liarsdice-step"><button id="ld-cm" aria-label="Eén minder"'+(cntSel<=0?' disabled':'')+'>−</button><b>'+cntSel+'</b><button id="ld-cp" aria-label="Eén meer"'+(cntSel>=t?' disabled':'')+'>+</button></div>';
        h+='<div class="btnrow"><button class="btn gold liarsdice-b" id="ld-count">Er '+(cntSel===1?'ligt':'liggen')+' '+esc(bidTxt(cntSel,b.f))+'</button><button class="btn liarsdice-b" id="ld-back">Terug naar het bieden</button></div>';
        return h;
      }
      function jackHtml(){
        var J=G.jack, h='', nm;
        if(J.by===null){
          h+='<div class="verdict win"><h2>Jackpot?</h2><p>Wie zegt vijf dezelfde stenen te hebben gegooid?</p></div><div class="opts">';
          alive().forEach(function(i){ if(G.cnt[i]===5) h+='<button class="opt" data-jby="'+i+'"><span class="num">5×</span><span class="lbl">'+esc(A.name(i))+'<small>claimt jackpot</small></span></button>'; });
          h+='</div>';
        } else if(J.ch===null){
          nm=esc(A.name(J.by));
          h+='<div class="verdict win"><h2>Jackpot?</h2><p><b>'+nm+'</b> zegt vijf dezelfde stenen te hebben. Daagt iemand uit? Wie uitdaagt, trekt eerst een half adtje; daarna gaat de beker van '+nm+' omhoog.</p></div><div class="opts">';
          alive().forEach(function(i){ if(i!==J.by) h+='<button class="opt" data-jch="'+i+'"><span class="num">½</span><span class="lbl">'+esc(A.name(i))+' daagt uit<small>trekt eerst een half adtje</small></span></button>'; });
          h+='<button class="opt" id="ld-jnone"><span class="num">–</span><span class="lbl">Niemand daagt uit<small>iedereen behalve '+nm+' trekt een adtje</small></span></button></div>';
        } else {
          h+='<div class="verdict neutral"><h2>Beker omhoog</h2><p><b>'+esc(A.name(J.ch))+'</b> trekt een half adtje en daagt <b>'+esc(A.name(J.by))+'</b> uit. Liggen er vijf dezelfde stenen?</p></div>';
          h+='<div class="btnrow"><button class="btn gold liarsdice-b" id="ld-jyes">Ja, vijf dezelfde</button><button class="btn liarsdice-b" id="ld-jno">Nee, geen vijf dezelfde</button></div>';
        }
        if(J.ch===null) h+='<div class="btnrow"><button class="btn liarsdice-b" id="ld-jcancel">Toch geen jackpot</button></div>';
        return h;
      }
      function revealHtml(){
        var r=G.res, h='', L, bad;
        if(r.type==="call"){
          L=callLines(r);
          h+='<div class="verdict fout"><h2>'+(r.holds?'Het klopt!':'Gelogen!')+'</h2>'+L.map(function(x){ return '<p>'+esc(x)+'</p>'; }).join("")+'</div>';
          if(r.app){
            h+='<div class="board liarsdice-gap"><table class="score"><tr><th>speler</th><th>stenen</th><th>telt</th></tr>';
            A.S.players.forEach(function(p,i){ var d=G.dice[i], c=0; if(!d)return;
              h+='<tr'+(i===r.loser?' class="cur"':'')+'><td>'+esc(p.name)+'</td><td>'+d.map(function(v){ var x=hit(v,r.f,r.wild); if(x)c++; return small(v,x?'liarsdice-hit':'liarsdice-miss'); }).join("")+'</td><td>'+c+'</td></tr>'; });
            h+='</table><div class="stat"><span>Bod: <b>'+esc(bidTxt(r.q,r.f))+'</b></span><span>Op tafel: <b>'+r.count+'</b></span></div></div>';
          }
        } else {
          L=jackLines(r); bad=r.ch!==null&&!r.real;
          h+='<div class="verdict '+(bad?'fout':'win')+'"><h2>'+(bad?'Bluf!':'Jackpot!')+'</h2>'+L.map(function(x){ return '<p>'+esc(x)+'</p>'; }).join("")+'</div>';
          if(r.show) h+='<div class="liarsdice-hand">'+r.show.map(function(v){ return die(v); }).join("")+'</div>';
        }
        if(G.phase==="over"){
          h+='<div class="verdict win"><h2>'+esc(A.name(r.winner))+' wint</h2><p>Alle anderen zijn hun stenen kwijt.</p></div><div class="btnrow"><button class="btn gold liarsdice-b" id="ld-new2">Nieuw spel</button></div>';
        } else {
          h+='<p class="hint"><b>'+esc(A.name(nextStart()))+'</b> begint de volgende ronde met bieden.</p><div class="btnrow"><button class="btn gold liarsdice-b" id="ld-next">Volgende ronde</button></div>';
        }
        return h;
      }
      function footHtml(){
        var h='<div class="liarsdice-foot"><div class="seg liarsdice-seg"><span class="liarsdice-lbl">Stenen:</span><button data-mode="app" aria-pressed="'+(G.mode==="app")+'">in de app</button><button data-mode="tafel" aria-pressed="'+(G.mode==="tafel")+'">echt op tafel</button></div>';
        h+='<div class="seg liarsdice-seg"><span class="liarsdice-lbl">Afspraken:</span><button data-v="vLose" aria-pressed="'+G.vLose+'">verliezer levert een steen in</button>';
        if(G.vLose) h+='<button data-v="vAdt" aria-pressed="'+G.vAdt+'">alles kwijt: adtje</button>';
        h+='<button data-v="vExact" aria-pressed="'+G.vExact+'">precies het bod: dubbel</button><button data-v="vJack" aria-pressed="'+G.vJack+'">jackpot claimen</button></div>';
        h+='<div class="btnrow">'+(G.phase==="reveal"||G.phase==="over"?'':'<button class="btn liarsdice-b" id="ld-again">'+(ask==="again"?'Zeker? Tik nog eens: ronde opnieuw':'Ronde opnieuw')+'</button>')+(G.phase==="over"?'':'<button class="btn liarsdice-b" id="ld-new">'+(ask==="new"?'Zeker? Tik nog eens: nieuw spel':'Nieuw spel')+'</button>')+'</div></div>';
        return h;
      }

      function on(id,fn){ var e=el(id); if(e)e.onclick=fn; }
      function each(sel,fn){ var l=root.querySelectorAll(sel), i; for(i=0;i<l.length;i++)fn(l[i]); }
      function wire(){
        var i=shown, box=el("ld-dice"), my=seq;
        if(box&&i!==null){
          A.Dice(box,{n:G.cnt[i],label:"Gooi onder de beker",noRoll:!!G.man[i],onRoll:function(v,dig){
            if(dead||my!==seq||shown!==i||G.dice[i])return;
            G.dice[i]=v.slice(); G.man[i]=!dig; A.save(); render();
          }});
        }
        on("ld-hide",hide);
        on("ld-fix",function(){ if(stale()||shown===null||G.phase!=="roll")return; G.dice[shown]=null; G.man[shown]=true; A.save(); render(); });
        on("ld-claim",function(){ if(stale()||shown===null||!canClaim(shown))return; claim(shown); });
        on("ld-pass",function(){ if(stale()||G.phase!=="roll")return; var w=toRoll(); if(w>=0)pass(w,"Gooi je stenen. Laat niemand meekijken."); });
        on("ld-peek",function(){ if(stale()||G.phase!=="bid")return; pass(G.cur,"Alleen jij kijkt naar je stenen."); });
        on("ld-qm",function(){ selQ--; sure=false; render(); });
        on("ld-qp",function(){ selQ++; sure=false; render(); });
        each("[data-f]",function(b){ b.onclick=function(){ selF=+b.getAttribute("data-f"); sure=false; render(); }; });
        on("ld-bid",doBid);
        on("ld-call",doCall);
        on("ld-claimT",function(){ if(stale()||G.phase!=="bid"||G.bid)return; G.jack={by:null,ch:null,back:"bid"}; G.phase="jack"; A.save(); render(); });
        on("ld-cm",function(){ cntSel--; render(); });
        on("ld-cp",function(){ cntSel++; render(); });
        on("ld-count",function(){ if(stale()||G.phase!=="count")return; settle(Math.max(0,Math.min(total(),cntSel))); });
        on("ld-back",function(){ if(stale()||G.phase!=="count")return; G.phase="bid"; A.save(); render(); });
        each("[data-jby]",function(b){ b.onclick=function(){ var k=+b.getAttribute("data-jby"); if(stale()||G.phase!=="jack"||G.jack.by!==null||G.cnt[k]!==5)return; G.jack.by=k; A.play("ding"); sync(); render(); }; });
        each("[data-jch]",function(b){ b.onclick=function(){ challenge(+b.getAttribute("data-jch")); }; });
        on("ld-jnone",function(){ if(stale()||G.phase!=="jack"||G.jack.by===null||G.jack.ch!==null)return; resolveJack(false); });
        on("ld-jyes",function(){ if(stale()||G.phase!=="jack"||G.jack.ch===null)return; resolveJack(true); });
        on("ld-jno",function(){ if(stale()||G.phase!=="jack"||G.jack.ch===null)return; resolveJack(false); });
        on("ld-jcancel",function(){ if(stale()||G.phase!=="jack"||G.jack.ch!==null)return; var back=G.jack.back; G.jack=null; G.phase=(back==="roll"&&G.mode==="app")?"roll":"bid"; sync(); render(); });
        on("ld-next",function(){ if(stale()||G.phase!=="reveal"||Date.now()-tClose<400)return; newRound(nextStart()); render(); });
        on("ld-new2",function(){ if(n()>=2)newGame(); render(); });
        /* midden in een ronde of een spel vragen deze twee knoppen om een tweede tik */
        on("ld-new",function(){ if(stale())return; if(ask!=="new"&&!(fresh()&&G.round===1)){ askNext="new"; render(); return; } newGame(); render(); });
        on("ld-again",function(){ if(stale())return; if(ask!=="again"&&!fresh()){ askNext="again"; render(); return; } G.round--; newRound(G.start); render(); });
        each("[data-mode]",function(b){ b.onclick=function(){
          var m=b.getAttribute("data-mode"); if(stale()||m===G.mode)return;
          G.mode=m;
          if(G.phase==="reveal"||G.phase==="over"){ A.save(); render(); }
          else { G.round--; newRound(G.start); render(); } /* midden in een ronde wisselen: de ronde begint opnieuw */
        }; });
        each("[data-v]",function(b){ b.onclick=function(){ var k=b.getAttribute("data-v"); G[k]=!G[k]; A.save(); render(); }; });
      }
      function render(){
        var changed, h;
        if(dead)return;
        ask=askNext; askNext=null;
        if(n()<2){
          shown=null;
          root.innerHTML='<p class="hint">Liar’s Dice speel je met minstens twee spelers. Voeg bovenaan een speler toe en tik op Nieuw spel.</p><div class="btnrow"><button class="btn gold liarsdice-b" id="ld-new">Nieuw spel</button></div>';
          on("ld-new",function(){ if(n()>=2)newGame(); render(); });
          return;
        }
        if(G.n!==n()||!ok()){
          changed=!!G.cnt&&G.n!==n();
          newGame();
          if(changed)A.toast("Nieuw spel","Het aantal spelers is veranderd: iedereen begint weer met vijf stenen.");
        }
        if(shown!==null&&(!(G.cnt[shown]>0)||(G.phase!=="roll"&&G.phase!=="bid")))shown=null;
        if(G.phase==="roll"&&shown===null&&toRoll()<0){ G.phase="bid"; G.cur=G.start; sync(); }
        if(A.S.active!==turn())sync(); /* iemand tikte een andere speler aan: de beurt blijft bij wie hij was */
        if(shown!==null) h=privHtml();
        else h=(G.phase==="roll"?rollHtml():G.phase==="bid"?bidHtml():G.phase==="count"?countHtml():G.phase==="jack"?jackHtml():revealHtml())+footHtml();
        root.innerHTML=h; wire();
      }

      /* herstel na herladen: een half gespeelde ronde gaat verder, maar niemands stenen staan meteen open */
      if(n()>=2&&G.n===n()&&ok())sync();
      render();
      this.refresh=render;
      this.destroy=function(){ dead=true; seq++; };
    }
  });
})();
