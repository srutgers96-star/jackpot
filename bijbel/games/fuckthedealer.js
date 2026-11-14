/* ===== Fuck the Dealer ===== */
(function(){
  "use strict";
  var A=App, el=A.el, esc=A.esc, pct=A.pct, ID="fuckthedealer", obs=null;
  /* Hoe de app de bijbel leest waar de tekst het open laat:
     - De app is de stapel: hij houdt de bovenste kaart dicht en zegt zelf "hoger" of "lager" (regel 3). Niemand hoeft
       dus een geheim te zien; de dealer is alleen nog degene die drinkt als er goed geraden wordt.
     - "Links" is de volgende speler in de spelersbalk. Na elke kaart is de volgende speler aan de beurt, ook na een
       goede gok (regel 4.II noemt het alleen bij een misser); de dealer raadt niet mee.
     - Regel 6: drie verloren beurten achter elkaar (elke goede gok zet de teller op nul). De speler na de dealer wordt
       de nieuwe dealer, de beurt loopt gewoon door en de oude dealer raadt weer mee.
     - De bijbel zegt niet wanneer het spel klaar is: hier als de stapel van 52 kaarten (geen jokers) op is.
     - Een waarde waarvan alle vier de kaarten al op tafel liggen, en bij de tweede gok een waarde aan de verkeerde kant
       van hoger/lager, kan niet meer en is daarom niet aan te tikken. */
  var ORDER=[2,3,4,5,6,7,8,9,10,11,12,13,14]; /* de aas is hoog */
  function val(c){ return c.r===1?14:c.r; }
  function lbl(v){ return A.RANKS[v===14?1:v]; }
  function word(v){ return v===11?"boer":v===12?"vrouw":v===13?"heer":v===14?"aas":String(v); }
  function slok(k){ return k+" "+(k===1?"slok":"slokken"); }

  if(!document.getElementById("fuckthedealer-css")){
    var css=document.createElement("style"); css.id="fuckthedealer-css";
    css.textContent=
      ".fuckthedealer-top{display:flex;align-items:center;gap:14px;}"+
      ".fuckthedealer-say{flex:1;min-width:0;font-size:14px;line-height:1.35;color:var(--ivory-dim);}"+
      ".fuckthedealer-say b{display:block;font-size:22px;font-weight:900;line-height:1.1;color:var(--ivory);margin-bottom:3px;overflow-wrap:anywhere;}"+
      ".fuckthedealer-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin:12px 0 4px;}"+
      ".fuckthedealer-cell{min-height:66px;min-width:0;padding:6px 2px;border-radius:10px;border:1.5px solid rgba(243,233,210,.25);background:rgba(0,0,0,.18);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;}"+
      ".fuckthedealer-cell b{font-size:22px;font-weight:900;line-height:1;}"+
      ".fuckthedealer-cell i{display:flex;gap:1px;min-height:15px;font-style:normal;}"+
      ".fuckthedealer-cell i span{width:12px;height:15px;border-radius:3px;background:#f3e9d2;color:#1b1a17;font-size:11px;line-height:15px;text-align:center;}"+
      ".fuckthedealer-cell i span.r{color:#c84b3a;}"+
      ".fuckthedealer-cell small{font-size:11px;line-height:1;color:var(--ivory-dim);}"+
      ".fuckthedealer-cell.best{border-color:var(--gold);background:rgba(231,184,79,.12);}"+
      ".fuckthedealer-cell.was{border-style:dashed;border-color:var(--red);}"+
      ".fuckthedealer-cell:disabled{opacity:.35;cursor:default;}"+
      ".fuckthedealer-cell:active:not(:disabled){transform:translateY(2px);}"+
      ".fuckthedealer-last{margin:8px 4px 0;padding-top:8px;border-top:1px solid rgba(243,233,210,.15);font-size:13px;line-height:1.35;color:var(--ivory-dim);overflow-wrap:anywhere;}"+
      ".fuckthedealer-last b{color:var(--ivory);}"+
      ".fuckthedealer-ov{display:flex;justify-content:center;margin-top:16px;}";
    document.head.appendChild(css);
  }

  A.register({ id:ID, beta:true, title:"Fuck the Dealer", level:"app", kans:true, sub:"De app is de stapel: zegt hoger of lager, telt missers, wisselt de dealer",
    init:function(root){
      var G=A.gs(ID), sure=false;
      function n(){ return A.S.players.length; }
      function names(){ return A.S.players.map(function(p){ return p.name; }).join("\n"); }
      function playing(){ return G.phase==="first"||G.phase==="second"; }

      /* Speler weggehaald (kan in de spelersbalk, ook terwijl een ander spel open staat): tellers, dealer en rader zijn
         op plaatsnummer bewaard en schuiven dus mee. Viel de dealer zelf weg, dan is de speler links van hem dealer. */
      function sync(){
        var now=A.S.players.map(function(p){ return p.name; }), old=G.pn, k;
        if(old&&old.join("\n")===now.join("\n")) return;
        if(old&&now.length===old.length-1){
          k=0; while(k<now.length&&now[k]===old[k]) k++;
          if(G.sc) G.sc.splice(k,1);
          if(playing()){
            if(k<G.dealer) G.dealer--; else if(k===G.dealer) G.streak=0;
            if(k<G.guesser) G.guesser--; else if(k===G.guesser){ G.phase="first"; G.first=null; G.hint=null; }
          }
        }
        G.pn=now; fix(); A.save();
      }
      /* bewaarde stand weer kloppend maken (herladen, speler erbij of eraf) */
      function fix(){
        var N=n(), i;
        G.out=G.out||[]; G.log=G.log||[]; G.sc=G.sc||[];
        for(i=0;i<N;i++) if(!G.sc[i]) G.sc[i]={b:0,r:0,s:0};
        if(!playing()&&G.phase!=="end") G.phase="setup";
        if(!playing()) return;
        if(!G.deck||!G.deck.length||G.deck.length+G.out.length!==52){ G.phase="setup"; return; }
        if(G.phase==="second"&&(typeof G.first!=="number"||(G.hint!=="hoger"&&G.hint!=="lager"))){ G.phase="first"; G.first=null; G.hint=null; }
        if(N<2) return;
        if(!(G.dealer>=0&&G.dealer<N)) G.dealer=0;
        if(!(G.guesser>=0&&G.guesser<N)) G.guesser=0;
        if(G.guesser===G.dealer) G.guesser=(G.dealer+1)%N;
      }
      function reset(){ G.phase="setup"; G.deck=null; G.out=[]; G.log=[]; G.sc=[]; G.streak=0; G.first=null; G.hint=null; sure=false; A.save(); render(); }
      function start(d){
        G.deck=A.deck(0); G.out=[]; G.log=[]; G.sc=[]; G.streak=0; G.first=null; G.hint=null;
        G.dealer=d; G.guesser=(d+1)%n(); G.phase="first"; sure=false;
        A.play("tick"); A.save(); render();
      }

      /* hoeveel kaarten van elke waarde zitten nog in de stapel */
      function counts(){ var c={}; ORDER.forEach(function(v){ c[v]=4; }); G.out.forEach(function(k){ c[val(k)]--; }); return c; }
      function allowed(v,c){ if(c[v]<=0) return false; if(G.phase==="second") return G.hint==="hoger"?v>G.first:v<G.first; return true; }
      /* p = kans dat de waarde klopt; best = eerste gok: kleinste kans dat je zelf drinkt (tweede gok meegerekend), tweede gok: grootste kans */
      function odds(c){
        var p={}, best={}, score={}, top=-1, tot=0, N=G.deck.length;
        ORDER.forEach(function(v){ if(allowed(v,c)) tot+=c[v]; });
        ORDER.forEach(function(v){
          if(!allowed(v,c)) return;
          if(G.phase==="second"){ p[v]=c[v]/tot; score[v]=c[v]; }
          else { var lo=0, hi=0; ORDER.forEach(function(w){ if(w<v&&c[w]>lo)lo=c[w]; if(w>v&&c[w]>hi)hi=c[w]; }); p[v]=c[v]/N; score[v]=c[v]+lo+hi; }
          if(score[v]>top) top=score[v];
        });
        var cnt=0, same=0; ORDER.forEach(function(v){ if(v in score){ cnt++; if(score[v]===top) same++; } });
        if(same<cnt) ORDER.forEach(function(v){ if(score[v]===top) best[v]=true; }); /* alles even goed: niets uitlichten */
        return {p:p,best:best};
      }

      function guess(v){
        if(!playing()||n()<2||!G.deck.length) return;
        sure=false;
        var card=G.deck[G.deck.length-1], cv=val(card), g=G.guesser, d=G.dealer;
        if(G.phase==="first"&&v!==cv){ /* regel 3.I: fout, de dealer zegt hoger of lager */
          G.first=v; G.hint=cv>v?"hoger":"lager"; G.phase="second"; A.save(); A.play("ding");
          A.overlay("info",G.hint==="hoger"?"Hoger!":"Lager!",["Geen "+word(v)+". "+A.name(g)+" noemt nog een waarde."],1800);
          render(); return;
        }
        var kind=v!==cv?"mis":G.phase==="first"?"raak1":"raak2", a=G.phase==="first"?v:G.first, b=G.phase==="first"?null:v;
        var lines=[], wissel=false, sips, who;
        G.deck.pop(); G.out.push(card); G.sc[g].b++;
        if(kind==="mis"){ /* regel 4.II */
          sips=1; who=g; G.streak=(G.streak||0)+1;
          lines.push(A.name(g)+" drinkt 1 slok.");
        } else { /* regel 3.II (2 slokken) en 4.I (1 slok) */
          sips=kind==="raak1"?2:1; who=d; G.streak=0; G.sc[g].r++;
          lines.push(A.name(d)+" (dealer) drinkt "+slok(sips)+".");
          lines.push(A.name(g)+" had hem "+(kind==="raak1"?"in één keer.":"bij de tweede gok."));
        }
        G.sc[who].s+=sips;
        G.log.unshift({c:card,g:A.name(g),a:a,b:b,k:kind,w:A.name(who),n:sips}); if(G.log.length>6) G.log.length=6;
        if(G.streak>=3){ G.dealer=(d+1)%n(); G.streak=0; wissel=true; } /* regel 6 */
        var ng=(g+1)%n(); if(ng===G.dealer) ng=(ng+1)%n();
        G.guesser=ng; G.first=null; G.hint=null;
        if(!G.deck.length){ G.phase="end"; lines.push("De stapel is op."); }
        else {
          G.phase="first";
          if(wissel) lines.push("Derde misser op rij: "+A.name(G.dealer)+" is de nieuwe dealer.");
          else if(kind==="mis") lines.push("Missers op rij: "+G.streak+" van 3.");
        }
        A.S.active=ng; A.drink(who,sips); /* drink bewaart en tekent de spelersbalk */
        render();
        A.play(kind==="mis"?"dood":"win");
        A.overlay(kind==="mis"?"dood":"win",kind==="mis"?"Mis!":"Raak!",lines,0,'<span class="fuckthedealer-ov">'+A.cardHtml(card,"big")+'</span>');
        A.onOverlayClose(null);
      }

      function logHtml(){
        if(!G.log.length) return "";
        return '<div class="log">'+G.log.map(function(x){
          return '<div><b>'+esc(A.cardName(x.c))+'</b> · '+esc(x.g)+' noemde '+word(x.a)+(x.b?', toen '+word(x.b):'')+' · '+(x.k==="mis"?'mis':'raak')+', <b>'+esc(x.w)+'</b> drinkt '+slok(x.n)+'</div>';
        }).join("")+'</div>';
      }

      function render(){
        sync(); fix();
        var N=n(), h="";
        if(N<2){
          root.innerHTML='<p class="hint">Fuck the Dealer speel je met minstens twee spelers: één dealer en minstens één speler die raadt. Voeg hierboven een speler toe.</p>';
          return;
        }
        if(G.phase==="setup"){
          h='<p class="hint">Tik aan wie de dealer is. De anderen raden om de beurt de waarde van de bovenste kaart. De app is de stapel: de kaart blijft dicht en de app zegt hoger of lager. Raak: de dealer drinkt. Twee keer mis: de rader drinkt.</p><div class="opts">';
          A.S.players.forEach(function(p,i){ h+='<button class="opt" data-d="'+i+'"><span class="num">'+(i+1)+'</span><span class="lbl">'+esc(p.name)+'<small>is de dealer</small></span><span class="odds"></span></button>'; });
          h+='</div><div class="btnrow"><button class="btn" id="fuckthedealer-rnd">Willekeurige dealer</button></div>';
          root.innerHTML=h;
          root.querySelectorAll("[data-d]").forEach(function(b){ b.onclick=function(){ start(+b.getAttribute("data-d")); }; });
          el("fuckthedealer-rnd").onclick=function(){ start(A.rnd(n())-1); };
          return;
        }
        if(G.phase==="end"){
          h='<div class="verdict neutral"><h2>Stapel op</h2><p>Alle 52 kaarten liggen op tafel. Dit was het spel.</p></div>';
          h+='<div class="board"><table class="score"><tr><th>speler</th><th>beurten</th><th>raak</th><th>slokken</th></tr>';
          A.S.players.forEach(function(p,i){ var s=G.sc[i]; h+='<tr><td>'+esc(p.name)+'</td><td>'+s.b+'</td><td>'+s.r+'</td><td>'+s.s+'</td></tr>'; });
          h+='</table></div>'+logHtml()+'<div class="btnrow"><button class="btn gold" id="fuckthedealer-new">Nieuw spel</button></div>';
          root.innerHTML=h;
          el("fuckthedealer-new").onclick=reset;
          return;
        }
        if(A.S.active!==G.guesser){ A.S.active=G.guesser; A.save(); A.renderPlayers(); }
        var c=counts(), o=odds(c), g=G.guesser, d=G.dealer, kans=!!A.S.kans, by={}, L=G.log[0];
        G.out.forEach(function(k){ (by[val(k)]=by[val(k)]||[]).push(k); });
        h='<div class="board"><div class="fuckthedealer-top">'+A.cardHtml(null)+'<div class="fuckthedealer-say">'+
          (G.phase==="first"
            ?'<b>'+esc(A.name(g))+' raadt</b>Noem een waarde en tik hem hieronder aan.'
            :'<b>'+(G.hint==="hoger"?"Hoger":"Lager")+' dan '+word(G.first)+'</b>Geen '+word(G.first)+'. '+esc(A.name(g))+' noemt nog een waarde.')+
          '</div></div><div class="stat"><span>Dealer: <b>'+esc(A.name(d))+'</b></span><span>Missers op rij: <b>'+(G.streak||0)+'</b> van 3</span><span>Stapel: <b>'+G.deck.length+'</b></span></div>'+
          (L&&G.phase==="first"?'<div class="fuckthedealer-last">Vorige kaart: <b>'+esc(A.cardName(L.c))+'</b>, '+(L.k==="mis"?'mis':'raak')+'. <b>'+esc(L.w)+'</b> drinkt '+slok(L.n)+'.</div>':'')+'</div>';
        /* de tafel (regel 5: op waarde gesorteerd, gelijke waarden gestapeld) is meteen het rijtje knoppen */
        h+='<div class="fuckthedealer-grid">';
        ORDER.forEach(function(v){
          var on=allowed(v,c), out=by[v]||[];
          h+='<button class="fuckthedealer-cell'+(kans&&o.best[v]?' best':'')+(G.phase==="second"&&v===G.first?' was':'')+'" data-v="'+v+'"'+(on?'':' disabled')+' aria-label="'+word(v)+', '+out.length+' van 4 op tafel">'+
            '<b>'+lbl(v)+'</b><i>'+out.map(function(k){ return '<span'+(A.isRed(k)?' class="r"':'')+'>'+A.SUITS[k.s]+'</span>'; }).join("")+'</i>'+
            (on?'<small class="kans">'+pct(o.p[v],0)+'</small>':'')+'</button>';
        });
        h+='</div>';
        h+='<p class="hint">'+(G.phase==="first"
          ?'Meteen goed: '+esc(A.name(d))+' (dealer) drinkt 2 slokken. Fout: de app zegt hoger of lager en je mag nog één keer. Na drie missers op rij wordt de volgende speler dealer.'
          :'Goed: '+esc(A.name(d))+' (dealer) drinkt 1 slok. Fout: '+esc(A.name(g))+' drinkt 1 slok.')+'</p>';
        h+='<p class="hint kans">Het percentage is de kans dat die waarde klopt. Goud: '+(G.phase==="first"?'de kleinste kans dat je zelf drinkt, je tweede gok meegerekend.':'de grootste kans.')+'</p>';
        h+=logHtml();
        h+='<div class="btnrow"><button class="btn'+(sure?' danger':'')+'" id="fuckthedealer-new">'+(sure?'Zeker weten? Tik nog een keer':'Nieuw spel')+'</button></div>';
        root.innerHTML=h;
        root.querySelectorAll("[data-v]").forEach(function(b){ b.onclick=function(){ guess(+b.getAttribute("data-v")); }; });
        el("fuckthedealer-new").onclick=function(){ if(!sure&&G.out.length){ sure=true; render(); } else reset(); };
      }

      /* een andere speler aantikken in de balk: die raadt nu (alleen vóór de eerste gok, en niet de dealer) */
      this.onPlayer=function(i){
        if(playing()&&n()>=2){
          if(i===G.dealer) A.toast(A.name(i)+" is de dealer","De dealer raadt niet mee.",2600);
          else if(G.phase==="first"){ G.guesser=i; A.save(); }
        }
        render();
      };
      this.refresh=render;
      /* core meldt niet dat er een speler bij komt, weggaat of anders heet: kijk mee met de spelersbalk */
      if(obs){ obs.disconnect(); obs=null; }
      if(window.MutationObserver&&el("players")){
        obs=new MutationObserver(function(){ if(names()!==(G.pn||[]).join("\n")) render(); });
        obs.observe(el("players"),{childList:true});
      }
      render();
    },
    destroy:function(){ if(obs){ obs.disconnect(); obs=null; } }
  });
})();
