/* ===== Kaartje Dobbelen =====
   Trek een kaart, gooi in drie worpen met twee stenen precies dat aantal ogen.
   Keuzes waar de bijbel niet eenduidig is:
   - Vrouw telt als 12 (de tabel in regel 2). Het voorbeeld in de bijbel rekent bij een Q met 11; de tabel gaat voor.
   - Heer en Aas zijn de hele beurt: er wordt niet gedobbeld, daarna is de volgende speler.
   - Aas, "iedereen vier slokken": ook de speler die de kaart trekt.
   - "Drie worpen" is een maximum: na worp één of twee mag je laten staan en het verschil drinken.
   - De vier slokken van de Heer mag je over meerdere spelers verdelen; het halve adtje gaat naar één speler
     en uitdelen "mag" (dus overslaan kan). Een half adtje wordt geboekt als 0,5 adtje (glas = 8 slokken).
   - Variant "steen laten liggen": één keer per beurt mag één steen één worp blijven liggen.
   - De bijbel noemt geen einde: is de stapel op, dan schud je opnieuw en speel je door.
   - Wordt de speler die aan de beurt is midden in zijn beurt verwijderd, dan vervalt die beurt en is de volgende aan de beurt. */
(function(){
  "use strict";
  var A=App, el=A.el, esc=A.esc, pct=A.pct, ID="kaartjedobbelen";

  if(!document.getElementById(ID+"-style")){
    var css=document.createElement("style"); css.id=ID+"-style";
    css.textContent=
      ".kaartjedobbelen-root .btn,.kaartjedobbelen-root .seg button{min-height:40px}"+
      ".kaartjedobbelen-top{display:flex;gap:14px;align-items:center}"+
      ".kaartjedobbelen-info{flex:1;min-width:0}"+
      ".kaartjedobbelen-doel{font-size:30px;font-weight:900;line-height:1.05;overflow-wrap:anywhere}"+
      ".kaartjedobbelen-doel small{display:block;margin-top:5px;font-size:13px;font-weight:500;line-height:1.3;color:var(--ivory-dim)}"+
      ".kaartjedobbelen-rolls{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:10px;font-size:14px;color:var(--ivory-dim)}"+
      ".kaartjedobbelen-rolls>div{white-space:nowrap}"+
      ".kaartjedobbelen-rolls b{color:var(--ivory)}"+
      ".kaartjedobbelen-rank{width:46px;height:60px}"+
      ".kaartjedobbelen-static .die{cursor:default}"+
      ".kaartjedobbelen-static .die:active{transform:none}"+
      ".kaartjedobbelen-lbl{font-size:12px;color:var(--ivory-dim);align-self:center}"+
      ".kaartjedobbelen-hold{text-align:center;font-size:13px;color:var(--ivory-dim)}";
    document.head.appendChild(css);
  }

  function sl(n){ return n+(n===1?" slok":" slokken"); }
  function rankName(r){ return r===1?"Aas":r===11?"Boer":r===12?"Vrouw":r===13?"Heer":String(r); }
  /* kans op precies t ogen met twee stenen */
  function pSum(t){ return (t<2||t>12)?0:(6-Math.abs(7-t))/36; }
  /* kans op t met één steen vast op waarde v */
  function pHold(t,v){ var need=t-v; return (need>=1&&need<=6)?1/6:0; }
  /* kans op raak binnen k worpen; hold = steen die de eerste van die worpen blijft liggen */
  function pWithin(t,k,hold){ if(k<=0)return 0; var first=hold?pHold(t,hold.val):pSum(t); return 1-(1-first)*Math.pow(1-pSum(t),k-1); }
  function cardBig(c){ return c.s>=0?A.cardHtml(c,"big"):'<span class="card big"><b>'+A.RANKS[c.r]+'</b></span>'; }
  function staticDice(d){ return '<div class="dice kaartjedobbelen-static">'+d.map(function(v){ return '<div class="die">'+A.pips(v)+'</div>'; }).join("")+'</div>'; }
  function btn(act,val,cls,html,disabled){ return '<button class="'+cls+'" data-a="'+act+'"'+(val===null?'':' data-v="'+val+'"')+(disabled?' disabled':'')+'>'+html+'</button>'; }

  A.register({ id:ID, beta:true, title:"Kaartje Dobbelen", level:"app", kans:true, sub:"Trekt de kaart, telt je drie worpen en rekent de slokken uit",
    init:function(root){
      var G=A.gs(ID), seq=0, quiet=0, cur=null; /* cur = het spelerobject van wie de beurt is: zo valt op als er iemand is verwijderd */
      G.keep=!!G.keep; G.real=!!G.real;
      if(!Array.isArray(G.log)) G.log=[];
      /* een stapel uit een oudere versie of met kapotte kaarten: alleen echte kaarten blijven */
      G.deck=Array.isArray(G.deck)?G.deck.filter(function(c){ return c&&c.r>=1&&c.r<=13&&c.s>=0&&c.s<=3; }):A.deck(0);

      function P(){ return A.S.players; }
      function act(){ var a=A.S.active; return (typeof a==="number"&&a%1===0&&a>=0&&a<P().length)?a:0; }
      function setActive(i){ A.S.active=i; A.save(); A.renderPlayers(); }
      function okDice(d){ return Array.isArray(d)&&d.length===2&&d[0]>=1&&d[0]<=6&&d[1]>=1&&d[1]<=6; }
      /* klopt een bewaarde beurt nog (ook na een oudere versie van dit spel)? */
      function valid(t){
        if(!t||typeof t.p!=="number"||t.p%1!==0||t.p<0||t.p>=P().length) return false;
        if(!Array.isArray(t.rolls)||!t.alloc||typeof t.alloc!=="object"||typeof t.throws!=="number") return false;
        if(t.phase==="draw") return true;
        if(!t.card||!(t.card.r>=1&&t.card.r<=13)) return false;
        var num=t.card.r>=2&&t.card.r<=12;
        if(t.phase==="roll") return num&&t.throws>=0&&t.throws<3&&(!t.hold||((t.hold.idx===0||t.hold.idx===1)&&t.hold.val>=1&&t.hold.val<=6));
        if(t.phase==="choice") return num&&okDice(t.dice)&&t.throws>=1&&t.throws<3;
        if(t.phase==="deal") return (t.deal==="heer"&&t.card.r===13)||(t.deal==="half"&&num&&okDice(t.dice));
        return t.phase==="done";
      }
      /* een melding over het hele scherm vangt geen tikken op: zolang hij staat, telt een tik op het spel eronder niet */
      function say(kind,title,lines,ms,extra){ quiet=Date.now()+ms; A.overlay(kind,title,lines,ms,extra); }
      function startTurn(p){
        G.t={p:p, n:P().length, phase:"draw", card:null, throws:0, dice:null, keptUsed:false, hold:null, rolls:[], deal:null, alloc:{}, res:null};
        cur=P()[p]||null; setActive(p); render();
      }
      /* Spelers kunnen midden in een beurt worden toegevoegd of verwijderd; het spel krijgt daar geen seintje van.
         0 = niets aan de hand, 1 = er is alleen iemand bijgekomen, 2 = de beurt is vervallen of verschoven en het scherm is opnieuw getekend. */
      function sync(){
        var pl=P(), t=G.t, i;
        if(!t) return 0;
        if(pl[t.p]===cur&&t.n===pl.length) return 0;
        i=cur?pl.indexOf(cur):-1;
        if(i<0){ startTurn(act()); return 2; } /* de speler van deze beurt is weg: de volgende (die core actief maakte) begint */
        if(i===t.p&&pl.length>t.n){ t.n=pl.length; A.save(); return 1; }
        t.p=i; t.n=pl.length;
        if(t.phase==="deal"&&t.deal==="heer"){ t.alloc={}; if(pl.length===2) t.alloc[1-i]=4; } /* de nummers zijn verschoven: opnieuw verdelen */
        setActive(i); render(); return 2;
      }
      function newGame(){ G.deck=A.deck(0); G.log=[]; if(A.krukReset)A.krukReset(ID); startTurn(act()); }
      function finish(kind,title,text){
        var t=G.t; t.phase="done"; t.res={kind:kind,title:title,text:text};
        G.log.unshift(text); if(G.log.length>8)G.log.length=8;
        A.save(); render();
      }
      function left(){ var t=G.t, n=4; A.others(t.p).forEach(function(j){ n-=(t.alloc[j]||0); }); return n; }

      /* de getrokken kaart ligt open */
      function onCard(c){
        var t=G.t, p=t.p, o=A.others(p); t.card=c; A.play("clack");
        if(c.r===1){ /* Aas: iedereen vier slokken */
          P().forEach(function(q,i){ A.drink(i,4); }); A.play("dood");
          say("dood","Aas!",["Iedereen drinkt vier slokken."],2600);
          finish("fout","Aas",A.name(p)+" trekt een Aas: iedereen drinkt 4 slokken."); return;
        }
        if(c.r===13){ /* Heer: vier slokken uitdelen */
          if(!o.length){ finish("neutral","Heer",A.name(p)+" trekt een Heer, maar er is niemand om slokken aan uit te delen."); return; }
          t.phase="deal"; t.deal="heer"; t.alloc={}; if(o.length===1) t.alloc[o[0]]=4;
          A.play("ding"); say("info","Heer!",[A.name(p)+" deelt vier slokken uit."],2000);
          A.save(); render(); return;
        }
        t.phase="roll"; A.save(); render();
      }
      /* een worp: v = beide stenen, of alleen de vrije steen als er één blijft liggen */
      function onRoll(v){
        var t=G.t, p=t.p, tg=t.card.r, d;
        if(t.hold){ d=[0,0]; d[t.hold.idx]=t.hold.val; d[1-t.hold.idx]=v[0]; } else d=[v[0],v[1]];
        t.throws++; t.dice=d; t.rolls.push(d); t.hold=null;
        A.kruk(ID,d,p); /* adtje kruk: elke worp telt, ook met een steen die bleef liggen */
        if(d[0]+d[1]===tg){
          A.play("win");
          if(!A.others(p).length){ finish("win","Raak!",A.name(p)+" gooit "+tg+". Er is niemand om een half adtje aan uit te delen."); return; }
          t.phase="deal"; t.deal="half";
          say("win","Raak!",[A.name(p)+" gooit "+tg+" en mag een half adtje uitdelen."],2200,A.dicerow(d));
          A.save(); render(); return;
        }
        if(t.throws>=3){ miss(); return; }
        t.phase="choice"; A.save(); render();
      }
      function miss(){
        var t=G.t, p=t.p, tg=t.card.r, sum=t.dice[0]+t.dice[1], diff=Math.abs(sum-tg);
        A.drink(p,diff); A.play("dood");
        say("dood","Mis",[A.name(p)+" moest "+tg+" gooien, er ligt "+sum+".","Drink "+sl(diff)+"."],2600,A.dicerow(t.dice));
        finish("fout","Mis",A.name(p)+" moest "+tg+" gooien en heeft "+sum+": drink "+sl(diff)+".");
      }
      function giveHalf(j){
        var t=G.t, p=t.p, tg=t.card.r;
        A.atje(j,0.5); A.play("ding");
        say("info","Half adtje",[A.name(j)+" trekt een half adtje (4 slokken).","Uitgedeeld door "+A.name(p)+"."],2600);
        finish("win","Raak!",A.name(p)+" gooit "+tg+" en deelt een half adtje uit aan "+A.name(j)+" (4 slokken).");
      }
      function dealHeer(){
        var t=G.t, p=t.p, parts=[];
        A.others(p).forEach(function(j){ var n=t.alloc[j]||0; if(n){ A.drink(j,n); parts.push(A.name(j)+" drinkt "+sl(n)); } });
        A.play("ding"); say("info","Proost",[A.joinNames(parts)+".","Uitgedeeld door "+A.name(p)+" (Heer)."],2600);
        finish("win","Heer",A.name(p)+" trekt een Heer en deelt 4 slokken uit: "+A.joinNames(parts)+".");
      }

      function render(){
        seq++;
        var pl=P(), t=G.t;
        if(!valid(t)){ startTurn(act()); return; }
        if(sync()===2) return; /* al opnieuw getekend */
        pl=P(); t=G.t;
        var p=t.p, c=t.card, tg=c?c.r:0, k=3-t.throws, nm=esc(A.name(p)), o=A.others(p), h, sum, diff;

        /* bord: kaart + doel */
        h='<div class="board"><div class="kaartjedobbelen-top">';
        if(!c){ h+=A.cardHtml(null,"big back")+'<div class="kaartjedobbelen-info"><div class="kaartjedobbelen-doel">'+nm+'<small>trekt de bovenste kaart van de stapel</small></div></div>'; }
        else {
          h+=cardBig(c)+'<div class="kaartjedobbelen-info">';
          if(c.r===1) h+='<div class="kaartjedobbelen-doel">Aas<small>iedereen drinkt vier slokken</small></div>';
          else if(c.r===13) h+='<div class="kaartjedobbelen-doel">Heer<small>vier slokken uitdelen</small></div>';
          else h+='<div class="kaartjedobbelen-doel">'+tg+' ogen<small>'+(c.r>10?rankName(c.r)+' telt als '+tg+'. ':'')+'Precies gooien, in hoogstens drie worpen.</small></div>';
          if(t.rolls.length) h+='<div class="kaartjedobbelen-rolls">'+t.rolls.map(function(d){ return '<div>'+A.dicerowSmall(d)+' <b>'+(d[0]+d[1])+'</b></div>'; }).join("")+'</div>';
          h+='</div>';
        }
        h+='</div><div class="stat"><span>Aan de beurt: <b>'+nm+'</b></span><span>'+(G.real?'Echte stapel':'Stapel: <b>'+G.deck.length+'</b> '+(G.deck.length===1?'kaart':'kaarten'))+'</span></div></div>';

        if(t.phase==="draw"){
          if(!G.real&&!G.deck.length){
            h+='<div class="verdict neutral"><h2>Stapel op</h2><p>Alle 52 kaarten zijn getrokken. Schud de stapel om door te spelen.</p><div class="btnrow">'+btn("shuffle",null,"btn gold","Schud en speel door")+'</div></div>';
          } else if(G.real){
            h+='<p class="hint"><b>'+nm+'</b> trekt de bovenste kaart van de echte stapel en legt hem open. Tik aan welke kaart het is.</p><div class="cards">';
            [2,3,4,5,6,7,8,9,10,11,12,13,1].forEach(function(r){ h+=btn("rank",r,"card kaartjedobbelen-rank",'<b>'+A.RANKS[r]+'</b>'); });
            h+='</div>';
          } else {
            h+='<p class="hint"><b>'+nm+'</b> is aan de beurt: trek de bovenste kaart.</p>'+btn("draw",null,"roll","Trek een kaart");
          }
          if(pl.length<2) h+='<p class="hint">Met één speler valt er niets uit te delen. Voeg bovenaan spelers toe.</p>';
        }
        else if(t.phase==="roll"){
          h+='<p class="hint"><b>'+nm+'</b>: worp '+(t.throws+1)+' van 3. Gooi samen precies '+tg+' ogen.</p>';
          if(t.hold) h+='<div class="kaartjedobbelen-hold">'+A.dicerowSmall([t.hold.val])+' blijft liggen. Gooi alleen de andere steen.</div>';
          h+='<div id="'+ID+'-dice"></div>';
          h+='<p class="hint kans">Kans op raak: deze worp <b>'+pct(t.hold?pHold(tg,t.hold.val):pSum(tg),0)+'</b>'+(k>1?', binnen je '+k+' worpen <b>'+pct(pWithin(tg,k,t.hold),0)+'</b>':'')+'.</p>';
        }
        else if(t.phase==="choice"){
          sum=t.dice[0]+t.dice[1]; diff=Math.abs(sum-tg);
          h+=staticDice(t.dice)+'<p class="hint">Er ligt <b>'+sum+'</b>, dat is '+diff+' '+(sum<tg?'te weinig':'te veel')+'. Nog '+k+(k===1?' worp':' worpen')+': gooi opnieuw of laat staan.</p><div class="opts">';
          h+=btn("again",null,"opt",'<span class="num">⟳</span><span class="lbl">Opnieuw gooien<small>beide stenen</small></span><span class="odds kans"><b>'+pct(pSum(tg),0)+'</b>raak</span>');
          if(G.keep&&!t.keptUsed){
            [0,1].forEach(function(idx){
              if(idx===1&&t.dice[0]===t.dice[1]) return;
              var d=t.dice[idx], need=tg-d, ok=need>=1&&need<=6;
              h+=btn("hold",idx,"opt",'<span class="num">'+d+'</span><span class="lbl">De '+d+' laten liggen<small>'+(ok?'de andere steen moet '+need+' worden':'raak kan dan niet met deze worp')+'</small></span><span class="odds kans"><b>'+pct(ok?1/6:0,0)+'</b>raak</span>');
            });
          }
          h+=btn("stop",null,"opt",'<span class="num">'+diff+'</span><span class="lbl">Laten staan<small>beurt klaar, drink '+sl(diff)+'</small></span>');
          h+='</div>';
          if(G.keep&&t.keptUsed) h+='<p class="hint">Je hebt deze beurt al een steen laten liggen.</p>';
        }
        else if(t.phase==="deal"&&t.deal==="half"){
          h+=staticDice(t.dice)+'<div class="verdict win"><h2>Raak!</h2><p>'+nm+' gooit '+tg+' en mag een half adtje uitdelen. Wie trekt hem?</p></div><div class="opts">';
          o.forEach(function(j){ h+=btn("half",j,"opt",'<span class="num">½</span><span class="lbl">'+esc(A.name(j))+'<small>half adtje (4 slokken)</small></span>'); });
          h+='</div><div class="btnrow">'+btn("skip",null,"btn","Niet uitdelen")+'</div>';
          if(!o.length) h+='<p class="hint">Er is niemand om aan uit te delen.</p>';
        }
        else if(t.phase==="deal"){
          var lf=left();
          h+='<p class="hint"><b>'+nm+'</b> deelt vier slokken uit. Tik per slok op wie hem krijgt. '+(lf>0?'Nog '+lf+' te verdelen.':'Alles is verdeeld: tik op Deel uit.')+'</p><div class="opts">';
          o.forEach(function(j){ var n=t.alloc[j]||0; h+=btn("sip",j,"opt",'<span class="num">'+n+'</span><span class="lbl">'+esc(A.name(j))+'<small>'+(lf>0?'tik voor een slok erbij':(n?'drinkt '+sl(n):'drinkt niets'))+'</small></span>',lf<=0); });
          h+='</div><div class="btnrow">'+btn("clear",null,"btn","Opnieuw verdelen",lf>=4)+btn("deal",null,"btn gold","Deel uit",lf!==0)+'</div>';
          if(!o.length) h+='<div class="btnrow">'+btn("skip",null,"btn gold","Niemand om aan uit te delen, verder")+'</div>';
        }
        else { /* done */
          var r=t.res||{kind:"neutral",title:"Klaar",text:""};
          h+=(t.dice?staticDice(t.dice):'')+'<div class="verdict '+r.kind+'"><h2>'+esc(r.title)+'</h2><p>'+esc(r.text)+'</p><div class="btnrow">'+btn("next",null,"btn gold",'Volgende: '+esc(A.name((p+1)%pl.length)))+'</div></div>';
        }

        var lg=t.phase==="done"?G.log.slice(1):G.log;
        if(lg.length) h+='<div class="log">'+lg.map(function(x){ return '<div>'+esc(x)+'</div>'; }).join("")+'</div>';
        h+='<div class="seg" style="margin-top:14px"><span class="kaartjedobbelen-lbl">Steen laten liggen:</span><button data-a="keep" data-v="0" aria-pressed="'+!G.keep+'">nee</button><button data-a="keep" data-v="1" aria-pressed="'+G.keep+'">één keer per beurt</button></div>';
        h+='<div class="seg"><span class="kaartjedobbelen-lbl">Kaarten:</span><button data-a="real" data-v="0" aria-pressed="'+!G.real+'">in de app</button><button data-a="real" data-v="1" aria-pressed="'+G.real+'">echte stapel</button></div>';
        h+='<div class="btnrow">'+btn("new",null,"btn","Nieuw spel")+'</div>';
        root.innerHTML='<div class="kaartjedobbelen-root">'+h+'</div>';

        if(t.phase==="roll"){
          var tk=seq; /* een worp die nog rolt terwijl het scherm al verder is, telt niet */
          A.Dice(el(ID+"-dice"),{n:t.hold?1:2, label:t.hold?"Gooi de andere steen":"Dobbel", onRoll:function(v){ if(tk!==seq||sync()===2||G.t.phase!=="roll")return; onRoll(v); }});
        }
      }

      function click(e){
        var b=e.target&&e.target.closest?e.target.closest("[data-a]"):null; if(!b||b.disabled)return;
        if(Date.now()<quiet) return;                       /* er staat nog een melding over het scherm */
        if(!valid(G.t)){ startTurn(act()); return; }
        if(sync()===2) return;                             /* spelers gewijzigd: het scherm is opnieuw getekend, deze tik telt niet */
        var a=b.getAttribute("data-a"), v=+b.getAttribute("data-v"), t=G.t, pl=P();
        if(a==="draw"){ if(t.phase==="draw"&&!G.real&&G.deck.length) onCard(G.deck.pop()); }
        else if(a==="rank"){ if(t.phase==="draw"&&G.real&&v>=1&&v<=13) onCard({r:v,s:-1}); }
        else if(a==="shuffle"){ if(!G.deck.length){ G.deck=A.deck(0); A.play("rattle"); A.save(); render(); } }
        else if(a==="again"){ if(t.phase==="choice"){ t.phase="roll"; t.hold=null; A.save(); render(); } }
        else if(a==="hold"){ if(t.phase==="choice"&&G.keep&&!t.keptUsed&&(v===0||v===1)){ t.keptUsed=true; t.hold={idx:v,val:t.dice[v]}; t.phase="roll"; A.save(); render(); } }
        else if(a==="stop"){ if(t.phase==="choice") miss(); }
        else if(a==="half"){ if(t.phase==="deal"&&t.deal==="half"&&v!==t.p&&pl[v]) giveHalf(v); }
        else if(a==="skip"){ if(t.phase==="deal") finish("neutral",t.deal==="half"?"Raak!":"Heer",A.name(t.p)+(t.deal==="half"?" gooit "+t.card.r+" en deelt geen half adtje uit.":" trekt een Heer, maar er is niemand om slokken aan uit te delen.")); }
        else if(a==="sip"){ if(t.phase==="deal"&&t.deal==="heer"&&left()>0&&v!==t.p&&pl[v]){ t.alloc[v]=(t.alloc[v]||0)+1; A.play("tick"); A.save(); render(); } }
        else if(a==="clear"){ if(t.phase==="deal"&&t.deal==="heer"){ t.alloc={}; A.save(); render(); } }
        else if(a==="deal"){ if(t.phase==="deal"&&t.deal==="heer"&&left()===0) dealHeer(); }
        else if(a==="next"){ if(t.phase==="done") startTurn((t.p+1)%pl.length); }
        else if(a==="keep"){ G.keep=v===1; A.save(); render(); }
        else if(a==="real"){ G.real=v===1; A.save(); render(); }
        else if(a==="new"){ newGame(); }
      }
      root.onclick=click;

      /* herstel een half gespeelde beurt, anders een schoon spel */
      var t0=G.t;
      if(!valid(t0)||t0.phase==="draw"||(typeof t0.n==="number"&&t0.n>P().length)){
        startTurn(act()); /* nog niets gebeurd, een onbruikbare beurt of een speler minder: de actieve speler begint; stapel en logboek blijven */
      } else {
        t0.rolls=t0.rolls.filter(okDice); if(!okDice(t0.dice)) t0.dice=null; /* alleen bij roll en done kan dice leeg zijn, valid() bewaakt de rest */
        t0.n=P().length; cur=P()[t0.p]; setActive(t0.p); render();
      }

      this.refresh=render;
      this.onPlayer=function(i){
        var t=G.t;
        if(!valid(t)||!P()[i]){ startTurn(act()); return; }
        if(sync()===2) return;
        t=G.t;
        if(t.phase==="draw"){ startTurn(i); }
        else if(t.phase==="done"){ setActive(t.p); A.toast("Tik op Volgende","Na "+A.name(t.p)+" is "+A.name((t.p+1)%P().length)+" aan de beurt.",2600); }
        else { setActive(t.p); A.toast("De beurt loopt nog",A.name(t.p)+" maakt eerst de beurt af.",2600); }
      };
      this.destroy=function(){ seq++; root.onclick=null; };
    }
  });
})();
