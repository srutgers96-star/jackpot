/* ===== Driemannen =====
   Bijbelregels, en hoe de open plekken zijn ingevuld:
   - "Bij elke [3] die wordt gegooid" = elke steen die een 3 laat zien (de som 3 van [1][2] telt niet). Bij [3][3] liggen er
     twee drieën: de Drieman drinkt er dus twee en mag daarna tien uitdelen (regel 2 blijft gelden naast regel 3.II.ii).
   - "De speler voor/na jou" = de vorige/volgende in de spelersbalk (de beurt gaat met de klok mee).
   - Uitdelen is aan anderen, niet aan jezelf. Alles wordt verdeeld voordat de volgende gooit.
   - Zonder de variant "dubbele Drieman" verandert er niets als de Drieman zelf weer [1][2] gooit.
   - Variant 1 zegt "etc.": elke volgende [1][2] van de Drieman telt er een bij op (3 per drie, 30 uitdelen, ...).
   - Variant 3 zegt niet hoe je aan je getal komt: iedere speler kiest het zelf, dubbele getallen mogen.
   - Twee stenen: A.kruk bij elke worp. Er blijft nooit een steen liggen (regel 1), dus geen "laat liggen". */
(function(){
  var A=App, el=A.el, esc=A.esc, ID="driemannen", inst=null;
  var CSS=
    ".driemannen-leg{font-size:12px;line-height:1.5;color:var(--ivory-dim);margin:8px 4px 0}"+
    ".driemannen-leg b{color:var(--ivory)}"+
    ".driemannen-res{margin-top:10px;padding:10px;border-radius:10px;background:rgba(0,0,0,.25);font-size:14px;line-height:1.4}"+
    ".driemannen-who{font-weight:700}"+
    ".driemannen-res p{margin:6px 0 0}"+
    ".driemannen-deel{margin-top:10px;padding:12px;border-radius:12px;background:rgba(231,184,79,.18);border:1.5px solid var(--gold)}"+
    ".driemannen-deel h2{margin:0 0 4px;font-size:22px;font-weight:900;text-align:center}"+
    ".driemannen-deel p{margin:0 0 8px;font-size:14px;text-align:center;color:var(--ivory-dim)}"+
    ".driemannen-deel p b{color:var(--ivory)}"+
    ".driemannen-row{display:flex;align-items:center;gap:6px;padding:5px 0;border-top:1px solid rgba(243,233,210,.14)}"+
    ".driemannen-nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700;font-size:15px}"+
    ".driemannen-cnt{min-width:28px;text-align:center;font-size:18px}"+
    ".driemannen-row .btn{min-width:44px;min-height:44px;padding:6px 10px}"+
    ".driemannen-btn{min-height:44px}"+
    ".driemannen-seg button{min-height:40px}"+
    ".driemannen-kop{font-size:12px;color:var(--ivory-dim);text-align:center;margin:16px 0 0}"+
    ".driemannen-sel{font:inherit;font-size:16px;font-weight:700;min-height:44px;min-width:84px;padding:6px 8px;border-radius:10px;border:1.5px solid var(--ivory-dim);background:rgba(0,0,0,.25);color:var(--ivory)}"+
    ".driemannen-big{display:block;font-size:min(13vw,60px);font-weight:900;line-height:1;text-align:center;color:var(--ink);transform:rotate(-4deg);margin-bottom:6px}";
  function css(){ if(document.getElementById("driemannen-css"))return; var s=document.createElement("style"); s.id="driemannen-css"; s.textContent=CSS; document.head.appendChild(s); }
  function int(x,lo,hi){ return typeof x==="number"&&x%1===0&&x>=lo&&x<=hi; }
  function zeros(n){ var z=[],k; for(k=0;k<n;k++)z.push(0); return z; }
  function slok(n){ return n+" "+(n===1?"slok":"slokken"); }
  function maalNaam(m){ return m===2?"dubbele":m===3?"driedubbele":m===4?"vierdubbele":m+"-voudige"; }
  function okEntry(x){ return !!x&&typeof x==="object"&&int(x.a,1,6)&&int(x.b,1,6)&&Array.isArray(x.ev); }

  function make(root){
    var G=A.gs(ID), alive=true, gen=0;

    /* een bewaard spel van een oudere versie (drieman-index, dubbel:true/false, log) leesbaar maken */
    if(G.v!==2){ G.maal=G.dubbel?2:1; delete G.dubbel; G.pend=null; G.last=null; G.names=null; G.v=2; }
    G.v789=!!G.v789; G.vDubbel=!!G.vDubbel; G.vWaarde=!!G.vWaarde;
    if(!Array.isArray(G.log))G.log=[];
    G.log=G.log.filter(okEntry);
    if(!okEntry(G.last))G.last=null;
    if(!Array.isArray(G.names))G.names=null;
    if(!Array.isArray(G.waarde))G.waarde=[];
    if(!int(G.maal,1,99))G.maal=1;
    if(!G.pend||typeof G.pend!=="object")G.pend=null;

    function prefill(P,n){ P.give=zeros(n); if(n===2)P.give[1-P.giver]=P.n; } /* met z'n tweeen is er maar een ontvanger */

    /* Spelers kunnen onderweg bijkomen, weggaan of anders heten: Drieman, eigen getallen en een lopende uitdeling
       verhuizen mee met de speler. G.names is de lijst van de vorige keer. */
    function sync(){
      var now=A.S.players.map(function(p){return String(p.name);}), n=now.length, old=G.names, map=null, k, diff=0, gone, was=A.S.active, P=G.pend, w, to, tot;
      function byName(i){ var j=now.indexOf(old[i]); return j<0?null:j; }
      if(old&&old.length){
        if(old.length===n){ for(k=0;k<n;k++)if(old[k]!==now[k])diff++; if(diff>1)map=byName; } /* een verschil = hernoemd */
        else if(n===old.length-1){ gone=n; for(k=0;k<n;k++)if(old[k]!==now[k]){gone=k;break;} map=function(i){ return i===gone?null:(i>gone?i-1:i); }; }
        else { for(k=0;k<Math.min(n,old.length);k++)if(old[k]!==now[k])diff++; if(n<old.length||diff>0)map=byName; } /* erbij = achteraan, indexen blijven */
      }
      if(map){
        G.drieman=int(G.drieman,0,old.length-1)?map(G.drieman):null;
        w=[]; for(k=0;k<old.length;k++){ to=map(k); if(to!==null&&int(G.waarde[k],2,12))w[to]=G.waarde[k]; } G.waarde=w;
        if(P){ P.giver=int(P.giver,0,old.length-1)?map(P.giver):null; P.thrower=int(P.thrower,0,old.length-1)?map(P.thrower):null; }
      }
      if(!int(G.drieman,0,n-1))G.drieman=null;
      if(G.drieman===null||!G.vDubbel)G.maal=1;
      for(k=0;k<n;k++)G.waarde[k]=int(G.waarde[k],2,12)?G.waarde[k]:null;
      G.waarde.length=n;
      if(!int(A.S.active,0,n-1))A.S.active=0;
      if(P){
        if(!int(P.thrower,0,n-1))P.thrower=null;
        if(n<2||!int(P.giver,0,n-1)||!int(P.n,1,999)){ /* de uitdeler is weg: uitdeling vervalt, de beurt gaat door */
          G.pend=null; if(P.thrower!==null&&n>0)A.S.active=(P.thrower+1)%n;
        } else {
          if(map||!Array.isArray(P.give)||P.give.length!==n)prefill(P,n);
          tot=0; for(k=0;k<n;k++){ if(!int(P.give[k],0,P.n)||k===P.giver)P.give[k]=0; tot+=P.give[k]; }
          if(tot>P.n)prefill(P,n);
          if(P.thrower!==null)A.S.active=P.thrower; /* tot het uitdelen klaar is blijft de gooier aan de beurt */
        }
      }
      if(map||A.S.active!==was||!old||old.join("\n")!==now.join("\n")){ G.names=now; A.save(); }
      if(A.S.active!==was)A.renderPlayers();
    }

    function left(P){ var t=0,k; for(k=0;k<P.give.length;k++)t+=P.give[k]; return P.n-t; }

    function bigOverlay(title,lines){
      A.overlay("win","",null,0,'<span class="driemannen-big">'+esc(title)+'</span>'+lines.map(function(l){ return "<small>"+esc(l)+"</small>"; }).join(""));
      A.onOverlayClose(null);
    }

    function roll(v){
      if(!alive||G.pend)return;
      var n=A.S.players.length, a=v[0], b=v[1];
      if(n<2||!int(a,1,6)||!int(b,1,6))return;
      if(!int(A.S.active,0,n-1))A.S.active=0;
      var i=A.S.active, me=A.name(i), prev=(i-1+n)%n, next=(i+1)%n, sum=a+b, ev=[], big=null, threes, d, lo, who=[], k, giver, cnt, oud;
      A.kruk(ID,[a,b],i); /* adtje kruk: elke worp van de twee stenen telt */

      /* regel 2 (en variant 1): [1][2] maakt de Drieman */
      if(sum===3){
        if(G.drieman===i){
          if(G.vDubbel){ G.maal++; ev.push(me+" gooit als Drieman weer 1 en 2: "+maalNaam(G.maal)+" Drieman. Voortaan "+slok(G.maal)+" per 3 en "+(10*G.maal)+" uitdelen bij 3 3.");
            big=[maalNaam(G.maal).charAt(0).toUpperCase()+maalNaam(G.maal).slice(1)+" Drieman!",[me,slok(G.maal)+" per 3, "+(10*G.maal)+" uitdelen bij 3 3"]]; }
          else ev.push(me+" gooit 1 en 2 en blijft de Drieman.");
        } else {
          oud=G.drieman; G.drieman=i; G.maal=1;
          ev.push(oud===null?me+" gooit 1 en 2 en is de Drieman.":me+" gooit 1 en 2 en is de nieuwe Drieman. "+A.name(oud)+" is ervan af.");
          big=["Nieuwe Drieman!",[me,"♪ Nieu-we Drie-man! Ja-la la-la-la la-la. (2x) ♪"]];
        }
      }
      /* regel 2: elke 3 die wordt gegooid, ook door de Drieman zelf */
      threes=(a===3?1:0)+(b===3?1:0);
      if(threes&&G.drieman!==null){ d=threes*G.maal; A.drink(G.drieman,d); ev.push("Drieman "+A.name(G.drieman)+" drinkt "+slok(d)+" ("+(threes===2?"twee keer een 3":"er ligt een 3")+")."); }
      /* regel 3.I (variant 2: 7, 8, 9 in plaats van 7, 9, 11) */
      lo=G.v789?[7,8,9]:[7,9,11];
      if(sum===lo[0]){ A.drink(prev,1); ev.push(sum+" ogen: "+A.name(prev)+", de speler voor "+me+", drinkt 1 slok."); }
      if(sum===lo[1]){ A.drink(i,1); ev.push(sum+" ogen: "+me+" drinkt zelf 1 slok."); }
      if(sum===lo[2]){ A.drink(next,1); ev.push(sum+" ogen: "+A.name(next)+", de speler na "+me+", drinkt 1 slok."); }
      /* variant 3: eigen getal */
      if(G.vWaarde){ for(k=0;k<n;k++)if(G.waarde[k]===sum){ A.drink(k,1); who.push(k); }
        if(who.length)ev.push("Eigen getal "+sum+": "+A.joinNames(who)+(who.length>1?" drinken ieder 1 slok.":" drinkt 1 slok.")); }
      /* regel 3.II: dubbel gooien */
      if(a===b){
        if(a===3&&G.drieman!==null){ giver=G.drieman; cnt=10*G.maal; ev.push("3 3: Drieman "+A.name(giver)+" mag "+cnt+" slokken uitdelen."); }
        else if(a===3){ giver=i; cnt=6; ev.push("3 3 zonder Drieman: "+me+" mag 6 slokken uitdelen."); }
        else { giver=i; cnt=sum; ev.push("Dubbel "+a+": "+me+" mag "+cnt+" slokken uitdelen."); }
        G.pend={thrower:i,giver:giver,n:cnt,give:[]}; prefill(G.pend,n);
      }
      if(!ev.length)ev.push("Niets aan de hand.");
      G.last={who:me,a:a,b:b,ev:ev};
      G.log.unshift({who:me,a:a,b:b,ev:ev.slice()}); if(G.log.length>30)G.log.length=30;
      if(!G.pend)A.nextPlayer();
      A.save();
      if(big){ A.play("special"); bigOverlay(big[0],big[1]); }
      else A.play(ev[0]==="Niets aan de hand."?"tick":"ding");
      render();
    }

    function finishPend(){
      var P=G.pend, parts=[], k, line, n=A.S.players.length;
      if(!P||left(P)!==0)return;
      for(k=0;k<n;k++)if(P.give[k]>0){ A.drink(k,P.give[k]); parts.push(A.name(k)+" drinkt "+slok(P.give[k])); }
      line=A.name(P.giver)+" deelt uit: "+A.joinNames(parts)+".";
      if(G.last)G.last.ev.push(line);
      if(G.log[0])G.log[0].ev.push(line);
      G.pend=null;
      if(P.thrower!==null){ A.S.active=P.thrower; A.nextPlayer(); }
      A.save(); A.play("ding"); render();
    }

    function render(){
      if(!alive)return;
      gen++; /* een digitale worp die nog rolt in een oud dobbelvak telt niet meer */
      sync();
      var p=A.S.players, n=p.length, P=G.pend, i=A.S.active, lo=G.v789?[7,8,9]:[7,9,11], h, rest, my=gen, box;
      if(n<2){ root.innerHTML='<p class="hint">Driemannen speel je met minstens twee spelers. Tik bovenaan op + speler.</p>'; return; }

      h='<div class="board"><div class="stat"><span>Drieman: <b>'+(G.drieman===null?"nog niemand":esc(A.name(G.drieman))+(G.maal>1?" ("+maalNaam(G.maal)+")":""))+'</b></span><span>'+lo.join(" / ")+'</span></div>';
      h+='<p class="driemannen-leg"><b>1 en 2</b> jij wordt Drieman · <b>elke 3</b> Drieman drinkt '+G.maal+' · <b>'+lo[0]+'</b> speler voor jou drinkt · <b>'+lo[1]+'</b> jij drinkt · <b>'+lo[2]+'</b> speler na jou drinkt · <b>dubbel</b> je ogen uitdelen · <b>3 3</b> Drieman deelt '+(10*G.maal)+' uit, zonder Drieman deel jij er 6 uit</p>';
      if(G.last){
        h+='<div class="driemannen-res"><div class="driemannen-who">'+A.dicerowSmall([G.last.a,G.last.b])+' '+esc(G.last.who)+' gooide '+G.last.a+' en '+G.last.b+'</div>'+
          G.last.ev.map(function(l){ return '<p>'+esc(l)+'</p>'; }).join("")+'</div>';
      }
      h+='</div>';

      if(P){
        rest=left(P);
        h+='<p class="hint">'+(rest>0?esc(A.name(P.giver))+' deelt uit: tik op + bij wie moet drinken.':'Alles is verdeeld: tik op Deel uit.')+'</p>';
        h+='<div class="driemannen-deel"><h2>Uitdelen</h2><p><b>'+esc(A.name(P.giver))+'</b> verdeelt '+slok(P.n)+'. Nog te verdelen: <b>'+rest+'</b></p>';
        A.others(P.giver).forEach(function(k){
          h+='<div class="driemannen-row"><span class="driemannen-nm">'+esc(A.name(k))+'</span>'+
            '<button class="btn" data-min="'+k+'"'+(P.give[k]>0?'':' disabled')+' aria-label="een slok minder">−</button>'+
            '<b class="driemannen-cnt">'+P.give[k]+'</b>'+
            '<button class="btn" data-plus="'+k+'"'+(rest>0?'':' disabled')+' aria-label="een slok erbij">+</button>'+
            '<button class="btn" data-rest="'+k+'"'+(rest>0?'':' disabled')+'>rest</button></div>';
        });
        h+='<div class="btnrow"><button class="btn gold driemannen-btn" id="driemannen-ok"'+(rest===0?'':' disabled')+'>Deel uit</button></div></div>';
      } else {
        h+='<p class="hint">'+esc(A.name(i))+' is aan de beurt: tik op Dobbel, of tik op een steen om je echte worp in te voeren.</p><div id="driemannen-dice"></div>';
      }

      h+='<p class="driemannen-kop">Zelf af te spreken</p>';
      h+='<div class="seg driemannen-seg"><button id="driemannen-t789" aria-pressed="'+G.v789+'">7, 8, 9 in plaats van 7, 9, 11</button><button id="driemannen-tdub" aria-pressed="'+G.vDubbel+'">dubbele Drieman</button><button id="driemannen-twaarde" aria-pressed="'+G.vWaarde+'">eigen getal</button></div>';
      if(G.vWaarde){
        h+='<div class="board"><p class="driemannen-leg">Iedere speler kiest een getal van 2 tot en met 12. Wordt dat aantal ogen gegooid, dan drinkt die speler 1 slok.</p>';
        p.forEach(function(q,k){
          var o='<option value="">kies</option>', x;
          for(x=2;x<=12;x++)o+='<option value="'+x+'"'+(G.waarde[k]===x?' selected':'')+'>'+x+'</option>';
          h+='<div class="driemannen-row"><span class="driemannen-nm">'+esc(q.name)+'</span><select class="driemannen-sel" data-w="'+k+'" aria-label="Getal van '+esc(q.name)+'">'+o+'</select></div>';
        });
        h+='</div>';
      }
      h+='<div class="btnrow"><button class="btn driemannen-btn" id="driemannen-new">Nieuw spel</button></div>';
      h+='<div class="log">'+G.log.slice(G.last?1:0).map(function(x){ return '<div><b>'+esc(x.who)+'</b> '+x.a+' en '+x.b+': '+esc(x.ev.join(" "))+'</div>'; }).join("")+'</div>';
      root.innerHTML=h;

      if(P){
        root.querySelectorAll("[data-plus]").forEach(function(b){ b.onclick=function(){ var k=+b.getAttribute("data-plus"); if(G.pend&&left(G.pend)>0){ G.pend.give[k]++; A.save(); render(); } }; });
        root.querySelectorAll("[data-min]").forEach(function(b){ b.onclick=function(){ var k=+b.getAttribute("data-min"); if(G.pend&&G.pend.give[k]>0){ G.pend.give[k]--; A.save(); render(); } }; });
        root.querySelectorAll("[data-rest]").forEach(function(b){ b.onclick=function(){ var k=+b.getAttribute("data-rest"); if(G.pend&&left(G.pend)>0){ G.pend.give[k]+=left(G.pend); A.save(); render(); } }; });
        el("driemannen-ok").onclick=finishPend;
      } else {
        box=el("driemannen-dice");
        if(box)A.Dice(box,{n:2,label:"Dobbel",onRoll:function(v){ if(alive&&my===gen)roll(v); }});
      }
      el("driemannen-t789").onclick=function(){ G.v789=!G.v789; A.save(); render(); };
      el("driemannen-tdub").onclick=function(){ G.vDubbel=!G.vDubbel; A.save(); render(); };
      el("driemannen-twaarde").onclick=function(){ G.vWaarde=!G.vWaarde; A.save(); render(); };
      root.querySelectorAll("[data-w]").forEach(function(s){ s.onchange=function(){ var k=+s.getAttribute("data-w"), x=parseInt(s.value,10); G.waarde[k]=int(x,2,12)?x:null; A.save(); }; });
      el("driemannen-new").onclick=function(){
        G.drieman=null; G.maal=1; G.log=[]; G.last=null; G.pend=null; if(A.krukReset)A.krukReset(ID);
        A.save(); A.toast("Nieuw spel","Er is geen Drieman meer. "+A.name(A.S.active)+" begint.",2500); render();
      };
    }

    return { render:render, stop:function(){ alive=false; gen++; } };
  }

  A.register({ id:ID, beta:true, title:"Driemannen", level:"app", sub:"Drieman, 7 9 11, dubbel uitdelen, drie varianten",
    init:function(root){ css(); if(inst)inst.stop(); inst=make(root); inst.render(); },
    refresh:function(){ if(inst)inst.render(); },
    onPlayer:function(){ if(inst)inst.render(); },
    destroy:function(){ if(inst){ inst.stop(); inst=null; } }
  });
})();
