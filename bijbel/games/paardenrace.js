/* ===== Paardenrace ===== */
(function(){
  "use strict";
  var A=App, esc=A.esc, ID="paardenrace";
  var NAMES=["Schoppen","Harten","Ruiten","Klaveren"]; /* zelfde volgorde als A.SUITS */
  function sl(n){ return n+" "+(n===1?"slok":"slokken"); }
  function ace(s){ return {r:1,s:s}; }
  /* lange lijsten passen niet op de overlay: vanaf vijf regels wordt het één zin */
  function compact(lines){ return lines.length>4?[lines.join(", ")+"."]:lines; }
  function css(){
    if(document.getElementById("paardenrace-style")) return;
    var s=document.createElement("style"); s.id="paardenrace-style";
    s.textContent=
      ".paardenrace-bet{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}"+
      ".paardenrace-lane{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0}"+
      ".paardenrace-step{width:100%;min-width:40px;min-height:44px;padding:0;font-size:24px;font-weight:900;line-height:1;border-radius:10px;border:1.5px solid rgba(243,233,210,.35);background:rgba(0,0,0,.22);color:var(--ivory)}"+
      ".paardenrace-step:disabled{opacity:.3}"+
      ".paardenrace-n{font-size:22px;font-weight:900;line-height:1;text-align:center}"+
      ".paardenrace-pick td{padding:12px 3px;cursor:pointer}"+
      ".paardenrace-gap{margin-top:10px}"+
      ".paardenrace-top{display:flex;align-items:center;gap:12px;margin:4px 0 10px}"+
      ".paardenrace-msg{flex:1;min-width:0;font-size:14px;line-height:1.35;color:var(--ivory-dim)}"+
      ".paardenrace-msg b{color:var(--ivory)}"+
      ".paardenrace-msg small{display:block;margin-top:4px;font-size:12px}"+
      ".paardenrace-flip{display:block;width:100%;margin:0 0 12px;font-size:22px;font-weight:900;padding:13px 22px;border-radius:14px;border:0;background:var(--gold);color:var(--ink);box-shadow:0 5px 0 #a67c22,0 10px 20px rgba(0,0,0,.3)}"+
      ".paardenrace-flip:active{transform:translateY(3px);box-shadow:0 2px 0 #a67c22,0 4px 10px rgba(0,0,0,.3)}"+
      ".paardenrace-track{display:grid;grid-template-columns:auto repeat(4,1fr);gap:4px 6px;align-items:center;justify-items:center}"+
      ".paardenrace-side{display:flex;align-items:center;justify-content:flex-end;gap:6px;min-width:50px;font-size:11px;color:var(--ivory-dim)}"+
      ".paardenrace-cell{width:38px;height:54px;border-radius:7px;border:1.5px dashed rgba(243,233,210,.16);display:flex;align-items:center;justify-content:center}"+
      ".paardenrace-fin{border:1.5px solid var(--gold);background:rgba(231,184,79,.12)}"+
      ".paardenrace-hot{display:inline-flex}"+
      ".paardenrace-hot .card{outline:3px solid var(--gold);outline-offset:1px}"+
      ".paardenrace-row{display:grid;grid-template-columns:1fr 44px 30px 44px auto;align-items:center;gap:6px;padding:6px 0;border-top:1px solid rgba(243,233,210,.12)}"+
      ".paardenrace-row:first-child{border-top:0}"+
      ".paardenrace-row .paardenrace-who{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700}"+
      ".paardenrace-row .btn{min-height:44px;padding:9px 12px}"+
      ".paardenrace-log{margin:0 0 4px;font-size:14px;color:var(--ivory)}";
    document.head.appendChild(s);
  }

  A.register({ id:ID, title:"Paardenrace", level:"app", beta:true, sub:"Inzetten, kaarten draaien, de azen racen, de winnaar deelt uit",
    init:function(root){
      css();
      var G=A.gs(ID);
      function P(){ return A.S.players; }
      function tot(i){ var b=G.bets[i]||[0,0,0,0]; return b[0]+b[1]+b[2]+b[3]; }
      function allTot(){ var t=0; for(var i=0;i<G.bets.length;i++) t+=tot(i); return t; }
      function allocSum(){ var t=0; for(var j=0;j<G.alloc.length;j++) t+=G.alloc[j]; return t; }

      function newGame(){
        G.len=(G.len===4||G.len===8)?G.len:6; G.phase="bet"; G.bets=P().map(function(){ return [0,0,0,0]; });
        G.steps=[]; G.open=[]; G.deck=[]; G.pos=[0,0,0,0]; G.last=null; G.ev=null; G.winner=null; G.queue=[]; G.qi=0; G.alloc=[]; G.log=[];
        A.save();
      }
      /* een bewaard spel van voor een herlaad alleen hervatten als het compleet is */
      function sane(){
        if(["bet","race","deal","done"].indexOf(G.phase)<0||!Array.isArray(G.bets)) return false;
        if(G.phase==="bet") return true;
        return Array.isArray(G.steps)&&G.steps.length===G.len&&Array.isArray(G.open)&&Array.isArray(G.deck)&&Array.isArray(G.pos)&&G.pos.length===4&&Array.isArray(G.queue)&&Array.isArray(G.alloc)&&Array.isArray(G.log)&&(G.phase!=="deal"||(G.winner>=0&&G.winner<4));
      }
      /* Spelers kunnen tussendoor worden toegevoegd of verwijderd. De inzet staat op de plek in de spelerslijst;
         valt er precies één speler weg, dan zoekt de app op naam wie dat was, zodat de inzetten bij de juiste mensen blijven. */
      function drop(i){
        var cur;
        G.bets.splice(i,1);
        if(G.phase!=="deal") return;
        cur=G.queue[G.qi]; G.alloc.splice(i,1);
        G.queue=G.queue.slice(G.qi).filter(function(x){ return x!==i; }).map(function(x){ return x>i?x-1:x; }); G.qi=0;
        if(!G.queue.length){ G.phase="done"; G.log.push("Wie nog moest uitdelen doet niet meer mee."); }
        else if(cur===i) startDeal();
      }
      function fit(){
        var p=P(), n=p.length, now=p.map(function(q){ return q.name; }), old=G.names, i;
        if(Array.isArray(old)&&old.length===n+1&&G.bets.length===n+1){ for(i=0;i<n&&old[i]===now[i];i++){} drop(i); }
        G.names=now;
        while(G.bets.length<n) G.bets.push([0,0,0,0]);
        if(G.bets.length>n) G.bets.length=n;
        if(G.phase==="deal"){
          if(n<2||!(G.queue[G.qi]<n)){ G.phase="done"; G.log.push("Er is niemand meer om aan uit te delen."); A.save(); }
          else {
            while(G.alloc.length<n) G.alloc.push(0);
            if(G.alloc.length>n) G.alloc.length=n;
            /* tijdens het uitdelen blijft de uitdeler aan de beurt */
            if(A.S.active!==G.queue[G.qi]){ A.S.active=G.queue[G.qi]; A.save(); A.renderPlayers(); }
          }
        }
        if(!(A.S.active>=0&&A.S.active<n)){ A.S.active=0; A.save(); A.renderPlayers(); }
      }

      /* ---- inzetten ---- */
      function startRace(){
        var p=P(), lines=[], i, t;
        if(p.length<2||!allTot()) return;
        /* regel 1: de azen eruit, zes (of 4/8) dichte kaarten als stappen, de rest is de stapel van de dealer */
        var d=A.deck(0).filter(function(c){ return c.r!==1; });
        G.steps=d.splice(0,G.len); G.open=G.steps.map(function(){ return false; }); G.deck=d;
        G.pos=[0,0,0,0]; G.last=null; G.ev=null; G.winner=null; G.queue=[]; G.qi=0; G.alloc=[]; G.log=[]; G.phase="race";
        /* regel 2: wat je inzet drink je eerst zelf */
        for(i=0;i<p.length;i++){ t=tot(i); if(t){ A.drink(i,t); lines.push(A.name(i)+" drinkt "+sl(t)); } }
        A.save(); A.play("ding");
        A.overlay("info","Eerst drinken",compact(lines).concat(["Daarna draait "+A.name(A.S.active)+" de kaarten om."]),0);
        render();
      }

      /* ---- de race ----
         Lezing van "voorbij": de azen starten onder de rij stappen; pos p = naast stapkaart p (0 = start).
         "Voorbij" is in regel 4 en regel 5 hetzelfde woord en betekent hier beide keren echt erlangs:
         stapkaart k gaat open zodra alle azen op k+1 of hoger liggen, en een aas wint op pos len+1 (de finishrij).
         De laatste stapkaart kan daardoor nooit open gaan; dat is bij elke consequente lezing zo. */
      function flip(){
        if(G.phase!=="race") return;
        if(!G.deck.length){ G.phase="done"; G.winner=-1; A.save(); render(); return; } /* kan bij 4, 6 of 8 stappen niet gebeuren */
        var c=G.deck.pop(); G.last=c; G.ev=null; G.pos[c.s]++;
        if(G.pos[c.s]>G.len){ finish(c.s); return; }
        var k=G.open.indexOf(false)+1; /* laagste dichte stap, 1 = onderste */
        if(k>0&&Math.min.apply(null,G.pos)>k){
          var sc=G.steps[k-1]; G.open[k-1]=true; G.pos[sc.s]--; G.ev={k:k,s:sc.s}; A.play("clack");
        } else A.play("tick");
        if(!G.deck.length){ G.phase="done"; G.winner=-1; }
        A.save(); render();
      }
      function finish(s){
        var p=P(), lines=[NAMES[s]+" is als eerste voorbij alle stappen."], give=[], i;
        G.winner=s; G.queue=[]; G.qi=0; G.log=[];
        for(i=0;i<p.length;i++) if(G.bets[i]&&G.bets[i][s]>0){ G.queue.push(i); give.push(A.name(i)+" deelt "+sl(2*G.bets[i][s])+" uit"); }
        if(G.queue.length){ G.phase="deal"; startDeal(); lines=lines.concat(compact(give)); }
        else { G.phase="done"; lines.push("Niemand had op "+NAMES[s]+" ingezet: niemand deelt uit."); }
        A.save(); A.play("win");
        A.overlay("win",A.SUITS[s]+" wint!",lines,0);
        render();
      }

      /* ---- uitdelen: wie op de winnaar inzette deelt het dubbele van die inzet uit (regel 5) ---- */
      function startDeal(){
        var i=G.queue[G.qi], o=A.others(i);
        G.alloc=P().map(function(){ return 0; });
        if(o.length===1) G.alloc[o[0]]=2*G.bets[i][G.winner]; /* met twee spelers valt er niets te kiezen */
        A.S.active=i; A.save(); A.renderPlayers();
      }
      function confirmDeal(){
        var i=G.queue[G.qi], n=2*G.bets[i][G.winner], parts=[], lines=[], j;
        if(allocSum()!==n) return;
        for(j=0;j<G.alloc.length;j++) if(G.alloc[j]>0){ A.drink(j,G.alloc[j]); parts.push(A.name(j)+" "+G.alloc[j]); lines.push(A.name(j)+" drinkt "+sl(G.alloc[j])); }
        G.log.push(A.name(i)+" deelt "+sl(n)+" uit: "+parts.join(", ")+".");
        G.qi++;
        if(G.qi<G.queue.length) startDeal(); else G.phase="done";
        A.save(); A.play("dood");
        A.overlay("dood","Drinken!",compact(lines).concat(["Uitgedeeld door "+A.name(i)+"."]),0);
        render();
      }

      /* ---- schermen ---- */
      function betsTable(pick){
        var p=P(), h='<table class="score'+(pick?' paardenrace-pick':'')+'"><tr><th>speler</th>', s, i;
        for(s=0;s<4;s++) h+='<th>'+A.SUITS[s]+'</th>';
        h+='<th>inzet</th></tr>';
        for(i=0;i<p.length;i++){
          h+='<tr'+(i===A.S.active?' class="cur"':'')+(pick?' data-sel="'+i+'"':'')+'><td>'+esc(p[i].name)+'</td>';
          for(s=0;s<4;s++) h+='<td>'+(G.bets[i][s]||"–")+'</td>';
          h+='<td>'+tot(i)+'</td></tr>';
        }
        return h+'</table>';
      }
      function betHtml(){
        var p=P(), i=A.S.active, b=G.bets[i]||[0,0,0,0], ok=p.length>1&&allTot()>0, none=[], h='', s;
        h+='<p class="hint">Zet met + en − slokken in op één of meer paarden en geef de telefoon door. Je inzet drink je zelf op vóór de start. Wint jouw paard, dan deel je het dubbele uit.</p>';
        if(p.length<2) h+='<p class="hint">Paardenrace speel je met minstens twee spelers, want de winnaar deelt slokken uit aan de anderen. Voeg hierboven een speler toe.</p>';
        h+='<div class="board"><div class="stat"><span>Inzet van <b>'+esc(A.name(i))+'</b></span><span>samen <b>'+sl(tot(i))+'</b></span></div><div class="paardenrace-bet">';
        for(s=0;s<4;s++) h+='<div class="paardenrace-lane"><button class="paardenrace-step" data-plus="'+s+'" aria-label="Eén slok meer op '+NAMES[s]+'">+</button>'+A.cardHtml(ace(s),"")+'<span class="paardenrace-n">'+b[s]+'</span><button class="paardenrace-step" data-min="'+s+'" aria-label="Eén slok minder op '+NAMES[s]+'"'+(b[s]?'':' disabled')+'>−</button></div>';
        h+='</div></div>';
        h+='<div class="btnrow">'+(p.length>1?'<button class="btn" data-next>Volgende speler</button>':'')+'<button class="btn gold" data-start'+(ok?'':' disabled')+'>Start de race</button></div>';
        for(s=0;s<p.length;s++) if(!tot(s)) none.push(s);
        if(ok&&none.length) h+='<p class="hint">Nog geen inzet van '+esc(A.joinNames(none))+'. Wie niets inzet, kijkt alleen mee.</p>';
        h+='<div class="board">'+betsTable(true)+'</div><p class="hint">Tik een naam om de inzet van die speler te wijzigen.</p>';
        h+='<div class="seg"><span style="font-size:12px;color:var(--ivory-dim);align-self:center">baan:</span>';
        [4,6,8].forEach(function(n){ h+='<button data-len="'+n+'" aria-pressed="'+(G.len===n)+'">'+n+' stappen</button>'; });
        return h+'</div>';
      }
      function trackHtml(){
        var N=G.len, h='<div class="board"><div class="paardenrace-track">', r, s;
        for(r=N+1;r>=0;r--){
          if(r===N+1) h+='<span class="paardenrace-side">finish</span>';
          else if(r===0) h+='<span class="paardenrace-side">start</span>';
          else h+='<span class="paardenrace-side'+(G.ev&&G.ev.k===r?' paardenrace-hot':'')+'">'+r+(G.open[r-1]?A.cardHtml(G.steps[r-1],"small"):A.cardHtml(null,"back small"))+'</span>';
          for(s=0;s<4;s++) h+='<span class="paardenrace-cell'+(r===N+1?' paardenrace-fin':'')+'">'+(G.pos[s]===r?'<span'+(G.last&&G.last.s===s?' class="paardenrace-hot"':'')+'>'+A.cardHtml(ace(s),"small")+'</span>':'')+'</span>';
        }
        return h+'</div></div>';
      }
      function raceHtml(){
        var c=G.last, m;
        if(!c) m='<b>'+esc(A.name(A.S.active))+'</b> is de dealer en draait de kaarten één voor één om. Elke kaart schuift de aas van dezelfde soort één stap omhoog.';
        else {
          m='<b>'+esc(A.cardName(c))+'</b>: '+NAMES[c.s]+' gaat één stap vooruit.';
          if(G.ev) m+='<br>Alle azen zijn voorbij stap '+G.ev.k+'. Daar lag <b>'+esc(A.cardName(G.steps[G.ev.k-1]))+'</b>: '+NAMES[G.ev.s]+' gaat één stap terug.';
        }
        m+='<small>Nog '+G.deck.length+' kaarten op de stapel</small>';
        return '<div class="paardenrace-top">'+(c?A.cardHtml(c,""):A.cardHtml(null,"back"))+'<div class="paardenrace-msg">'+m+'</div></div>'+
          '<button class="paardenrace-flip" data-flip>Draai kaart</button>'+trackHtml()+'<div class="board paardenrace-gap">'+betsTable(false)+'</div>';
      }
      function dealHtml(){
        var i=G.queue[G.qi], w=G.winner, bet=G.bets[i][w], n=2*bet, left=n-allocSum(), o=A.others(i), h, k, j;
        h='<div class="verdict win"><h2>'+A.SUITS[w]+' '+NAMES[w]+' wint</h2><p><b>'+esc(A.name(i))+'</b> zette '+sl(bet)+' in op '+NAMES[w]+' en deelt het dubbele uit: <b>'+sl(n)+'</b>.</p><p>'+(left>0?'Tik + bij wie ze krijgt. Nog te verdelen: <b>'+left+'</b>':'Alles is verdeeld. Tik <b>Deel uit</b>.')+'</p></div>';
        h+='<div class="board paardenrace-gap">';
        for(k=0;k<o.length;k++){ j=o[k];
          h+='<div class="paardenrace-row"><span class="paardenrace-who">'+esc(A.name(j))+'</span>'+
            '<button class="paardenrace-step" data-take="'+j+'" aria-label="Eén slok minder voor '+esc(A.name(j))+'"'+(G.alloc[j]?'':' disabled')+'>−</button>'+
            '<span class="paardenrace-n">'+G.alloc[j]+'</span>'+
            '<button class="paardenrace-step" data-give="'+j+'" aria-label="Eén slok meer voor '+esc(A.name(j))+'"'+(left>0?'':' disabled')+'>+</button>'+
            '<button class="btn" data-rest="'+j+'"'+(left>0?'':' disabled')+'>rest</button></div>';
        }
        h+='</div><div class="btnrow"><button class="btn gold" data-ok'+(left===0?'':' disabled')+'>Deel uit</button></div>';
        return h+trackHtml();
      }
      function doneHtml(){
        var w=G.winner, h;
        if(w===null||w<0) h='<div class="verdict neutral"><h2>Geen winnaar</h2><p>De stapel is op voordat een aas voorbij alle stappen was.</p></div>';
        else {
          h='<div class="verdict win"><h2>'+A.SUITS[w]+' '+NAMES[w]+' wint</h2>';
          if(G.log.length) h+=G.log.map(function(x){ return '<p class="paardenrace-log">'+esc(x)+'</p>'; }).join("");
          else h+='<p>Niemand had op '+NAMES[w]+' ingezet, dus niemand deelt uit.</p>';
          h+='</div>';
        }
        return h+'<div class="paardenrace-gap">'+trackHtml()+'</div><div class="board paardenrace-gap">'+betsTable(false)+'</div>';
      }

      function on(sel,fn){ var l=root.querySelectorAll(sel); for(var k=0;k<l.length;k++) l[k].onclick=fn; }
      function render(arm){
        fit();
        var busy=G.phase==="race"||G.phase==="deal", hot=arm===true&&busy;
        var h=G.phase==="bet"?betHtml():G.phase==="race"?raceHtml():G.phase==="deal"?dealHtml():doneHtml();
        h+='<div class="btnrow"><button class="btn'+(hot?' danger':G.phase==="done"?' gold':'')+'" data-new="'+(hot?1:0)+'">'+(hot?"Race afbreken? Tik nog eens":"Nieuw spel")+'</button></div>';
        root.innerHTML=h;
        /* een lopende race breek je pas af met een tweede tik */
        on("[data-new]",function(){ if((G.phase==="race"||G.phase==="deal")&&this.getAttribute("data-new")!=="1"){ render(true); return; } newGame(); render(); });
        on("[data-plus]",function(){ var b=G.bets[A.S.active], s=+this.getAttribute("data-plus"); if(b&&b[s]<99){ b[s]++; A.save(); A.play("tick"); } render(); });
        on("[data-min]",function(){ var b=G.bets[A.S.active], s=+this.getAttribute("data-min"); if(b&&b[s]>0){ b[s]--; A.save(); } render(); });
        on("[data-sel]",function(){ A.S.active=+this.getAttribute("data-sel"); A.save(); A.renderPlayers(); render(); });
        on("[data-next]",function(){ A.nextPlayer(); render(); });
        on("[data-len]",function(){ G.len=+this.getAttribute("data-len"); A.save(); render(); });
        on("[data-start]",startRace);
        on("[data-flip]",flip);
        on("[data-give]",function(){ var j=+this.getAttribute("data-give"), i=G.queue[G.qi]; if(allocSum()<2*G.bets[i][G.winner]){ G.alloc[j]++; A.save(); A.play("tick"); } render(); });
        on("[data-take]",function(){ var j=+this.getAttribute("data-take"); if(G.alloc[j]>0){ G.alloc[j]--; A.save(); } render(); });
        on("[data-rest]",function(){ var j=+this.getAttribute("data-rest"), i=G.queue[G.qi], left=2*G.bets[i][G.winner]-allocSum(); if(left>0){ G.alloc[j]+=left; A.save(); A.play("tick"); } render(); });
        on("[data-ok]",confirmDeal);
      }

      if(!sane()) newGame();
      render();
      this.refresh=function(){ render(); };
      /* een tik in de spelersbalk kiest wie inzet of wie dealer is; tijdens het uitdelen zet fit() de uitdeler terug */
      this.onPlayer=function(){ render(); };
    }
  });
})();
