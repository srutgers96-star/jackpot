/* ===== Oude Bami, Nieuwe Bami =====
   Eén dobbelsteen, 2 spelers (eventueel 3). Keuzes waar de bijbel niets over zegt:
   - Volgorde van gooien: de volgorde van de spelersbalk; wie bovenaan actief staat en meedoet begint.
   - Het spel heeft geen einde in de regels: het loopt door tot iemand op "Nieuw spel" tikt.
   - Regel 6 ("de regels mogen niet worden uitgelegd"): de app zegt alleen wie er drinkt, niet waarom.
   - Staan er meer dan drie spelers in de balk, dan kiezen er 2 of 3 een bami en kijkt de rest toe.
   Eén steen, dus geen adtje kruk (A.kruk geldt alleen bij twee stenen). */
(function(){
  "use strict";
  var A=App, el=A.el, esc=A.esc;
  var ROLES=[{k:"oude",t:"Oude bami"},{k:"nieuwe",t:"Nieuwe bami"},{k:"midden",t:"Midden bami"}];
  function roleTitle(k){ for(var i=0;i<ROLES.length;i++) if(ROLES[i].k===k) return ROLES[i].t; return ""; }
  function css(){
    if(el("oudebami-style")) return;
    var s=document.createElement("style"); s.id="oudebami-style";
    s.textContent=".oudebami-pick{margin:6px 0 14px}"+
      ".oudebami-pick h3{margin:0 0 2px;font-size:17px;font-weight:700}"+
      ".oudebami-pick h3 small{font-size:12px;font-weight:500;color:var(--ivory-dim);margin-left:6px}"+
      ".oudebami-pick .seg{justify-content:flex-start;margin:6px 0 0}"+
      ".oudebami-pick .seg button{min-height:42px;padding:6px 16px;font-size:15px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"+
      ".oudebami-btn{min-height:44px}"+
      ".oudebami-hist{display:flex;flex-wrap:wrap;align-items:center;gap:4px 2px;margin:10px 4px 0;font-size:13px;color:var(--ivory-dim)}"+
      ".oudebami-hist span.oudebami-lbl{margin-right:4px}"+
      ".oudebami-last{margin:10px 0 0}"+
      ".oudebami-last p{margin:0 0 4px}"+
      ".oudebami-last p:last-child{margin-bottom:0}"+
      ".oudebami-zwijg{font-size:12px;font-style:italic}";
    document.head.appendChild(s);
  }
  A.register({ id:"oudebami", beta:true, title:"Oude Bami, Nieuwe Bami", level:"app", sub:"Kies wie welke bami is, dobbel, de app zegt wie drinkt",
    init:function(root){
      css();
      var G=A.gs("oudebami"), gen=0, obs=null, lastSig="";
      if(G.phase!=="play") G.phase="setup";
      G.role=G.role||{}; G.nm=G.nm||{}; G.tally=G.tally||{}; G.hist=G.hist||[]; G.rolls=G.rolls||0;
      ROLES.forEach(function(r){ if(typeof G.role[r.k]!=="number") G.role[r.k]=null; G.tally[r.k]=G.tally[r.k]||0; });

      function sig(){ return A.S.players.map(function(p){ return p.name; }).join("\u0001"); }
      /* deelnemers (rol-sleutels) in de volgorde van de spelersbalk */
      function parts(){ return ROLES.map(function(r){ return r.k; }).filter(function(k){ return G.role[k]!==null; }).sort(function(a,b){ return G.role[a]-G.role[b]; }); }
      function roleOf(i){ for(var x=0;x<ROLES.length;x++) if(G.role[ROLES[x].k]===i) return ROLES[x].k; return null; }
      /* De spelersbalk kan tussendoor veranderen (speler erbij, weg, hernoemd): rollen weer aan de juiste speler hangen. */
      function sync(){
        var p=A.S.players, seen={}, same=G.np===p.length;
        ROLES.forEach(function(r){
          var i=G.role[r.k], nm=G.nm[r.k], j=-1, x;
          if(i===null) return;
          if(p[i]&&p[i].name===nm) return;
          for(x=0;x<p.length;x++) if(p[x].name===nm){ j=x; break; }
          /* naam niet meer te vinden: bij een even lange balk is de speler hernoemd, anders is hij verwijderd
             (dan mag de speler die op zijn plek schuift de bami niet stilletjes erven) */
          if(j>=0) G.role[r.k]=j; else if(same&&p[i]) G.nm[r.k]=p[i].name; else G.role[r.k]=null;
        });
        G.np=p.length;
        if(p.length<3) G.role.midden=null; /* een midden bami kan alleen met een derde speler */
        ROLES.forEach(function(r){ var i=G.role[r.k]; if(i===null) return; if(seen[i]){ G.role[seen[i]]=null; G.role[r.k]=null; } else seen[i]=r.k; });
        if(G.phase==="play"&&(G.role.oude===null||G.role.nieuwe===null)){
          G.phase="setup";
          A.toast("Een bami is weg","De oude of de nieuwe bami staat niet meer in de spelersbalk. Kies opnieuw wie welke bami is.",5000);
        }
        if(G.phase==="play"&&(!G.turn||G.role[G.turn]===null||G.role[G.turn]===undefined)) G.turn=parts()[0];
      }

      function pick(k,i){
        var p=A.S.players, o;
        if(!p[i]) return;
        if(G.role[k]===i){ G.role[k]=null; }
        else {
          ROLES.forEach(function(r){ if(G.role[r.k]===i) G.role[r.k]=null; });
          G.role[k]=i; G.nm[k]=A.name(i);
          /* met precies twee spelers ligt de andere bami meteen vast */
          if(p.length===2&&k!=="midden"){ o=k==="oude"?"nieuwe":"oude"; G.role[o]=1-i; G.nm[o]=A.name(1-i); }
        }
        A.save(); render();
      }
      function start(){
        sync();
        if(G.role.oude===null||G.role.nieuwe===null){ render(); return; }
        G.phase="play"; G.rolls=0; G.hist=[]; G.last=null;
        ROLES.forEach(function(r){ G.tally[r.k]=0; });
        /* de bijbel zegt niet wie begint: de actieve speler als die meedoet, anders de eerste deelnemer in de balk */
        G.turn=roleOf(A.S.active)||parts()[0];
        A.save(); render();
      }
      function newGame(){
        G.phase="setup"; G.rolls=0; G.hist=[]; G.last=null;
        ROLES.forEach(function(r){ G.tally[r.k]=0; });
        A.save(); render();
      }
      function drinkText(list){
        return A.joinNames(list.map(function(x){ return x.n+" ("+roleTitle(x.k).toLowerCase()+")"; }))+(list.length>1?" drinken elk 1 slok.":" drinkt 1 slok.");
      }
      function roll(v){
        sync();
        if(G.phase!=="play"){ A.save(); render(); return; }
        var n=v[0], roller=G.role[G.turn], who=[], order, list;
        if(n<=3) who.push("oude");                                   /* regel 3: oude bami drinkt bij 1, 2 of 3 */
        if(n>=4) who.push("nieuwe");                                 /* regel 4: nieuwe bami drinkt bij 4, 5 of 6 */
        if(G.role.midden!==null&&(n===3||n===4)) who.push("midden"); /* regel 5: midden bami drinkt bij 3 of 4 */
        list=who.map(function(k){ return {k:k,n:A.name(G.role[k])}; });
        who.forEach(function(k){ A.drink(G.role[k],1); G.tally[k]++; });
        G.rolls++; G.hist.unshift(n); if(G.hist.length>8) G.hist.length=8;
        G.last={v:n, roller:A.name(roller), list:list};
        /* regel 2: om de beurt één worp, daarna is de volgende deelnemer */
        order=parts(); G.turn=order[(order.indexOf(G.turn)+1)%order.length];
        A.S.active=G.role[G.turn]; A.save(); A.renderPlayers();
        A.play("ding");
        A.overlay("dood","Slok!",[drinkText(list)],1500,A.dicerow([n]));
        render();
      }

      function zwijg(){ return '<p class="hint oudebami-zwijg">Regel 6: de regels mogen niet worden uitgelegd. De app zegt dus alleen wie er drinkt.</p>'; }
      function renderSetup(){
        var p=A.S.players, h="", ok=G.role.oude!==null&&G.role.nieuwe!==null, b;
        if(p.length<2){
          root.innerHTML='<p class="hint">Dit spel is voor 2 spelers (eventueel 3). Voeg bovenaan een speler toe met “+ speler”.</p>';
          return;
        }
        h+='<p class="hint">Bepaal eerst wie de oude bami en wie de nieuwe bami is. Tik per bami een speler aan.</p>';
        ROLES.forEach(function(r){
          if(r.k==="midden"&&p.length<3) return;
          h+='<div class="oudebami-pick"><h3>'+r.t+(r.k==="midden"?'<small>eventueel, voor een derde speler</small>':'')+'</h3><div class="seg">'+
            p.map(function(q,i){ return '<button data-role="'+r.k+'" data-i="'+i+'" aria-pressed="'+(G.role[r.k]===i)+'">'+esc(q.name)+'</button>'; }).join("")+'</div></div>';
        });
        if(p.length<3) h+='<p class="hint">Met een derde speler in de balk kan er ook een midden bami gekozen worden.</p>';
        else if(p.length>3) h+='<p class="hint">Er doen 2 of 3 spelers mee. Wie geen bami is, kijkt toe.</p>';
        h+='<div class="btnrow"><button class="btn gold oudebami-btn" id="oudebami-start"'+(ok?'':' disabled')+'>Start het spel</button></div>';
        if(!ok) h+='<p class="hint">Kies een oude bami en een nieuwe bami om te beginnen.</p>';
        h+=zwijg();
        root.innerHTML=h;
        root.querySelectorAll("[data-role]").forEach(function(btn){ btn.onclick=function(){ pick(btn.getAttribute("data-role"),+btn.getAttribute("data-i")); }; });
        b=el("oudebami-start"); if(b) b.onclick=start;
      }
      function renderPlay(){
        var my=gen, turnI=G.role[G.turn], L=G.last, h;
        if(A.S.active!==turnI){ A.S.active=turnI; A.save(); A.renderPlayers(); }
        h='<div class="board"><table class="score"><tr><th>bami</th><th>speler</th><th>slokken dit spel</th></tr>';
        ROLES.forEach(function(r){
          if(G.role[r.k]===null) return;
          h+='<tr'+(r.k===G.turn?' class="cur"':'')+'><td>'+r.t+'</td><td>'+esc(A.name(G.role[r.k]))+'</td><td>'+G.tally[r.k]+'</td></tr>';
        });
        h+='</table><div class="stat"><span>Worpen: <b>'+G.rolls+'</b></span><span>Aan de beurt: <b>'+esc(A.name(turnI))+'</b></span></div>';
        if(G.hist.length) h+='<div class="oudebami-hist"><span class="oudebami-lbl">Laatste worpen:</span>'+A.dicerowSmall(G.hist)+'</div>';
        h+='</div>';
        if(L&&L.list) h+='<div class="verdict fout oudebami-last"><p>'+esc(L.roller)+' gooide '+A.dicerowSmall([L.v])+'</p><p><b>'+esc(drinkText(L.list))+'</b></p></div>';
        h+='<p class="hint"><b>'+esc(A.name(turnI))+'</b> gooit één keer: tik op Dobbel, of tik op de steen om een echte worp in te vullen.</p><div id="oudebami-dice"></div>';
        h+=zwijg();
        h+='<div class="btnrow"><button class="btn oudebami-btn" id="oudebami-new">Nieuw spel</button></div>';
        root.innerHTML=h;
        /* digitaal gooien of de echte steen intikken; een worp van een verouderd scherm telt niet */
        A.Dice(el("oudebami-dice"),{n:1,label:"Dobbel",onRoll:function(v){ if(my!==gen) return; roll(v); }});
        el("oudebami-new").onclick=newGame;
      }
      function render(){
        sync(); lastSig=sig(); gen++;
        if(G.phase==="play") renderPlay(); else renderSetup();
      }

      /* Tik op een speler in de balk: doet hij mee, dan is hij nu aan de beurt; anders blijft de beurt waar hij was. */
      this.onPlayer=function(i){
        sync();
        if(G.phase==="play"){
          var k=roleOf(i);
          if(k){ G.turn=k; A.save(); }
          else A.toast(A.name(i)+" doet niet mee","Kies bij een nieuw spel wie welke bami is.",2600);
        }
        render();
      };
      this.destroy=function(){ gen++; if(obs){ obs.disconnect(); obs=null; } };

      /* core meldt niet dat de spelersbalk verandert, dus kijken we zelf mee */
      if(window.MutationObserver&&el("players")){
        obs=new window.MutationObserver(function(){ if(sig()!==lastSig) render(); });
        obs.observe(el("players"),{childList:true});
      }
      render();
    }
  });
})();
