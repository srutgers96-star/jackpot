/* ===== Blind Mexxen ===== */
(function(){
  "use strict";
  var A=App, el=A.el, esc=A.esc, ID="blindmexxen";
  /* Mexx-combinaties van laag naar hoog (Mexx blz. 32): 31 … 65, dan dubbel (100 … 600), dan Mexx (2 en 1). */
  var COMBOS=[31,32,41,42,43,51,52,53,54,61,62,63,64,65,100,200,300,400,500,600,1000];
  function score(d){ var hi=Math.max(d[0],d[1]), lo=Math.min(d[0],d[1]); if(hi===2&&lo===1)return 1000; if(hi===lo)return hi*100; return hi*10+lo; }
  function label(s){ return s===1000?"Mexx":String(s); }
  function eyes(s){ return s===1000?"2 en 1":s>=100?(s/100)+" en "+(s/100):Math.floor(s/10)+" en "+(s%10); }
  function slok(n){ return n+" "+(n===1?"slok":"slokken"); }

  if(!document.getElementById(ID+"-style")){
    var css=document.createElement("style"); css.id=ID+"-style";
    css.textContent=
      ".blindmexxen-root .btn,.blindmexxen-root .seg button{min-height:40px}"+
      ".blindmexxen-claim{text-align:center;font-size:14px;color:var(--ivory-dim);margin-top:8px}"+
      ".blindmexxen-claim b{display:block;font-size:46px;font-weight:900;color:var(--ivory);line-height:1.05}"+
      ".blindmexxen-cupwrap{display:flex;justify-content:center;align-items:center;min-height:120px;margin:8px 0 2px}"+
      ".blindmexxen-cup{width:112px;height:104px;position:relative;border-radius:10px;clip-path:polygon(16% 0,84% 0,100% 100%,0 100%);background:linear-gradient(100deg,#6b1f18,#a8382c 45%,#7a251c)}"+
      ".blindmexxen-cup::after{content:\"\";position:absolute;left:0;right:0;bottom:0;height:12px;background:rgba(0,0,0,.28)}"+
      ".blindmexxen-shake{animation:blindmexxen-shake .14s linear infinite}"+
      "@keyframes blindmexxen-shake{0%{transform:translate(-5px,0) rotate(-5deg)}50%{transform:translate(5px,-4px) rotate(5deg)}100%{transform:translate(-5px,0) rotate(-5deg)}}"+
      ".blindmexxen-one{min-height:40px;font-size:12px;font-weight:700;border:1.5px solid rgba(243,233,210,.4);background:rgba(0,0,0,.2);color:var(--ivory);border-radius:999px;padding:4px 10px}"+
      ".blindmexxen-log{font-size:12px;color:var(--ivory-dim);text-align:center;margin-top:8px;line-height:1.6}"+
      ".blindmexxen-log b{color:var(--ivory)}"+
      ".blindmexxen-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:4px}"+
      ".blindmexxen-grid button{min-height:50px;border-radius:10px;border:1.5px solid rgba(243,233,210,.25);background:rgba(0,0,0,.18);font-weight:900;font-size:18px;padding:4px 2px;line-height:1.1}"+
      ".blindmexxen-grid button small{display:block;font-size:11px;font-weight:500;color:var(--ivory-dim);margin-top:2px}"+
      ".blindmexxen-grid button[aria-pressed=\"true\"]{background:var(--gold);color:var(--ink);border-color:var(--gold)}"+
      ".blindmexxen-grid button[aria-pressed=\"true\"] small{color:var(--ink)}";
    document.head.appendChild(css);
  }

  A.register({ id:ID, beta:true, title:"Blind Mexxen", level:"app", sub:"Stenen onder de beker, bluffen, beker trekken, wie drinkt",
    init:function(root){
      var G=A.gs(ID), R=null, busy=false, timer=null, dead=false;
      G.mode=G.mode==="echt"?"echt":"digi"; G.inzet=G.inzet||1; G.v31=!!G.v31; G.dubbel=!!G.dubbel;
      function n(){ return A.S.players.length; }
      function digi(){ return G.mode==="digi"; }
      function nm(i){ return A.name(i); }
      function setActive(i){ A.S.active=i; A.save(); A.renderPlayers(); }
      function show(kind,title,lines,extra,cb){ A.overlay(kind,title,lines,0,extra||""); A.onOverlayClose(cb||null); }
      /* beurt: rolls = aantal worpen deze beurt, looked = gekeken vóór de eerste worp (keuze III),
         again = beurt opnieuw begonnen na een 1-3, peek = stenen staan nu op het scherm, say/pick = doorgeefkeuze */
      function newT(){ return {rolls:0, looked:false, again:false, peek:false, say:false, pick:null}; }
      function newRound(start){
        if(timer){ clearTimeout(timer); timer=null; } busy=false;
        if(!(start>=0&&start<n())) start=0;
        /* q = verborgen worpen die nog niet bij de adtje-kruk-telling zijn gemeld (zie flushKruk) */
        R=G.R={start:start, cur:start, prev:null, claim:null, dice:null, last:start, q:[], log:[], phase:"turn", t:newT(), deal:null, lift:null, tries:[], res:null, note:null};
        setActive(start); render();
      }
      function valid(r){
        var k=n(); if(!r||!r.t||!Array.isArray(r.q)||!Array.isArray(r.log)||!Array.isArray(r.tries)) return false;
        if(!(r.cur<k&&r.start<k&&(r.prev===null||r.prev<k))) return false;
        if(r.phase==="deal"&&(!r.deal||(r.deal.to!==null&&r.deal.to>=k))) return false;
        if(r.phase==="end"&&(!r.res||r.res.starter>=k)) return false;
        if(r.phase==="lift"&&!r.lift) return false;
        if(r.phase!=="turn"&&r.prev===null&&r.phase!=="deal"&&r.phase!=="lift"&&r.phase!=="end") return false;
        if(digi()&&!r.dice&&(r.prev!==null||r.t.rolls>0)&&r.phase!=="end") return false;
        return true;
      }

      /* ---- gooien onder de beker ---- */
      function startRoll(keep){ /* keep = index van de steen die blijft liggen, of null voor beide stenen */
        var t=R.t; t.peek=false; t.say=false; t.pick=null;
        if(!digi()){ applyRoll(null); return; } /* echte stenen: de app weet niet wat er ligt */
        busy=true; A.play("rattle"); render();
        timer=setTimeout(function(){ timer=null; busy=false; var d=[A.rnd(6),A.rnd(6)]; if(keep!==null&&R.dice) d[keep]=R.dice[keep]; applyRoll(d); },850);
      }
      function applyRoll(d){
        var t=R.t; R.dice=d; R.last=R.cur; R.note=null;
        if(d) R.q.push({v:d,p:R.cur});
        t.rolls++; t.again=false; if(t.rolls>=2) t.say=true; /* na de tweede worp niet meer kijken: blind doorgeven */
        A.save(); render();
      }
      /* Adtje kruk: elke worp van de twee stenen gaat naar A.kruk, ook met een steen die bleef liggen. Een worp onder de beker is
         geheim, dus de melding (die de ogen noemt) wordt bewaard tot de beker omhoog gaat; dan gaan alle worpen in volgorde
         naar de telling. Met echte stenen kent de app alleen de worp die bij het trekken wordt ingevoerd. */
      function flushKruk(d){
        if(digi()){ for(var i=0;i<R.q.length;i++) A.kruk(ID,R.q[i].v,R.q[i].p); }
        else A.kruk(ID,d,R.last);
        R.q=[];
      }
      function look(){
        var t=R.t; if(t.rolls===0) t.looked=true; /* keuze III: nu moet er minstens één steen opnieuw */
        t.say=false; t.pick=null; A.save();
        if(!digi()){ render(); return; }
        render();
        A.handover(R.cur,"Laat niemand meekijken. Tik om onder de beker te kijken.",function(){ if(R.t!==t||R.phase!=="turn")return; t.peek=true; render(); });
      }

      /* ---- doorgeven ---- */
      function announce(s){
        var me=R.cur, nxt=(me+1)%n();
        R.log.push({p:me,s:s}); R.prev=me; R.claim=s; R.cur=nxt; R.t=newT(); R.note=null;
        R.phase=s===1000?"mexx":"turn"; /* regel 5.II: wie Mexx zegt, dwingt de volgende tot geloven of niet geloven */
        setActive(nxt); render();
        if(digi()) A.handover(nxt,nm(me)+" zegt: "+label(s)+".",null);
        else A.toast(nm(me)+" zegt "+label(s),nm(nxt)+" is aan de beurt.",3500);
      }

      /* ---- de beker gaat omhoog ---- */
      function lift(why){
        R.t.peek=false;
        if(digi()&&R.dice){ resolve(why,R.dice); return; }
        R.phase="lift"; R.lift=why; A.save(); render(); /* echte stenen: eerst invoeren wat er ligt */
      }
      function finish(loser,cnt,title,text){
        A.drink(loser,cnt); A.play("dood");
        /* Wie daarna opzet staat niet in de bijbel: de drinker zet op (zoals bij Mexx gebruikelijk); tik op een andere speler om te wisselen. */
        R.phase="end"; R.lift=null; R.deal=null; R.res={kind:"fout",title:title,text:text,starter:loser};
        setActive(loser); render();
        show("dood",title,[text],R.dice?A.dicerow(R.dice):"");
      }
      function restart(note){ /* "De beurt van de uitdeler begint daarna opnieuw": 1-3 telt niet als worp, dus opnieuw beide stenen onder de beker */
        R.phase="turn"; R.deal=null; R.lift=null; R.t=newT(); R.t.again=true; R.note=note||null; A.save(); render();
      }
      function resolve(why,d){
        var s=score(d), c=R.cur, p=R.prev, x=G.inzet, dx=x*(G.dubbel?2:1), dbl=G.dubbel?" (dubbel)":"", C=nm(c), P=p===null?"":nm(p), msg, to;
        R.dice=d; R.lift=null; flushKruk(d);
        if(why==="deal"){
          to=R.deal.to;
          if(s===31){ A.drink(to,2); A.play("dood"); msg=nm(to)+" gelooft het niet, maar er ligt echt 1 en 3. "+nm(to)+" drinkt 2 slokken."; }
          else { A.drink(c,1); A.play("dood"); msg=nm(to)+" gelooft het niet en terecht: er ligt "+label(s)+". Uitdeler "+C+" drinkt 1 slok."; }
          restart(msg); show("dood",s===31?"Toch 31!":"Bluf!",[msg,C+" begint de beurt opnieuw."],A.dicerow(d)); return;
        }
        if(why==="doubt"){
          if(s<R.claim) finish(p,x,"Bluf!",C+" trekt de beker: er ligt "+label(s)+", lager dan de "+label(R.claim)+" van "+P+". "+P+" drinkt "+slok(x)+".");
          else if(s===R.claim) finish(c,dx,"Klopt!",C+" trekt de beker: er ligt precies "+label(s)+", zoals "+P+" zei. "+C+" drinkt "+slok(dx)+dbl+".");
          else finish(c,x,"Hoger!",C+" trekt de beker: er ligt "+label(s)+", hoger dan de "+label(R.claim)+" van "+P+". "+C+" drinkt "+slok(x)+".");
          return;
        }
        if(why==="mexxja"){
          if(s===1000){ R.phase="tries"; R.tries=[]; A.play("ding"); A.save(); render();
            show("info","Mexx!",["Er ligt echt Mexx. "+C+" gelooft het en krijgt drie worpen om ook Mexx te gooien."],A.dicerow(d)); }
          else finish(c,x,"Geen Mexx",C+" gelooft "+P+", maar er ligt "+label(s)+". "+C+" drinkt "+slok(x)+".");
          return;
        }
        /* mexxnee */
        if(s===1000) finish(c,dx,"Mexx!",C+" gelooft "+P+" niet, maar er ligt Mexx. "+C+" drinkt "+slok(dx)+dbl+".");
        else finish(p,x,"Bluf!",C+" gelooft "+P+" niet en terecht: er ligt "+label(s)+". "+P+" drinkt "+slok(x)+".");
      }
      /* regel 5.II.i: drie open worpen om ook Mexx te gooien. De bijbel noemt hier geen stenen laten liggen, dus elke poging is met beide stenen. */
      function tryRoll(v){
        var c=R.cur, C=nm(c); A.kruk(ID,v,c); R.tries.push(v); R.dice=v;
        if(score(v)===1000){
          A.play("win"); R.phase="end";
          /* "Lukt dit wel, begint een nieuwe ronde": niemand drinkt; wie de Mexx evenaarde zet op (keuze, staat niet in de bijbel). */
          R.res={kind:"win",title:"Ook Mexx!",text:C+" gooit in poging "+R.tries.length+" ook Mexx. Niemand drinkt, er begint een nieuwe ronde.",starter:c};
          A.save(); render(); show("win","Mexx!",[R.res.text],A.dicerow(v)); return;
        }
        if(R.tries.length>=3){ finish(c,G.inzet,"Geen Mexx",C+" gooit in drie pogingen geen Mexx en drinkt "+slok(G.inzet)+"."); return; }
        A.save(); render();
        A.overlay("info","Mis",[C+" gooit "+label(score(v))+". Nog "+(3-R.tries.length)+(3-R.tries.length===1?" poging.":" pogingen.")],1500,A.dicerow(v));
      }

      /* ---- knoppen ---- */
      function act(a,v){
        if(busy) return; var t=R.t, to;
        switch(a){
          case "roll": startRoll(null); break;
          case "one": startRoll(1-(+v)); break; /* alleen steen v opnieuw, de andere blijft liggen */
          case "look": look(); break;
          case "hide": t.peek=false; render(); break;
          case "say": t.say=true; t.pick=null; render(); break;
          case "back": t.say=false; t.pick=null; render(); break;
          case "pick": t.pick=+v; render(); break;
          case "go": if(t.pick) announce(t.pick); break;
          case "doubt": lift("doubt"); break;
          case "deal": t.peek=false; R.phase="deal"; R.deal={to:null}; A.save(); render(); break;
          case "dealto": R.deal.to=+v; A.save(); render(); break;
          case "dealback": R.phase="turn"; R.deal=null; A.save(); render(); break;
          case "dealja": to=R.deal.to; A.drink(to,1); A.play("ding");
            restart(nm(to)+" gelooft de 1 en 3 van "+nm(R.cur)+" en drinkt 1 slok.");
            show("info","Slok!",[nm(to)+" gelooft de 1 en 3 en drinkt 1 slok.",nm(R.cur)+" begint de beurt opnieuw."]); break;
          case "dealnee": lift("deal"); break;
          case "mexxja": lift("mexxja"); break;
          case "mexxnee": lift("mexxnee"); break;
          case "next": newRound(R.res.starter); break;
          case "new": newRound(A.S.active); break;
          case "mode": if(G.mode!==v){ G.mode=v==="echt"?"echt":"digi"; A.save(); newRound(A.S.active); } break;
          case "v31": G.v31=!G.v31; t.pick=null; A.save(); render(); break;
          case "dub": G.dubbel=!G.dubbel; A.save(); render(); break;
          case "inzet": G.inzet=+v; A.save(); render(); break;
        }
      }
      function opt(a,num,lbl,small,v){ return '<button class="opt" data-act="'+a+'"'+(v===undefined?'':' data-v="'+v+'"')+'><span class="num">'+num+'</span><span class="lbl">'+lbl+(small?'<small>'+small+'</small>':'')+'</span><span></span></button>'; }
      function openDice(d,one){
        var h='<div class="dice">', i;
        for(i=0;i<2;i++) h+='<div class="diewrap"><div class="die">'+A.pips(d[i])+'</div>'+(one?'<button class="blindmexxen-one" data-act="one" data-v="'+i+'">alleen deze opnieuw</button>':'')+'</div>';
        return h+'</div>';
      }

      function render(){
        if(dead) return; /* spel verlaten: een late tik of timer tekent niets meer */
        if(n()<2){
          root.innerHTML='<div class="blindmexxen-root"><p class="hint">Blind Mexxen speel je met minstens twee spelers: de beker gaat door naar de volgende. Voeg hierboven een speler toe.</p><div class="btnrow"><button class="btn gold" id="bmGo">Start</button></div></div>';
          el("bmGo").onclick=function(){ if(n()>=2) newRound(A.S.active); else A.toast("Nog te weinig spelers","Voeg eerst een tweede speler toe.",2500); };
          return;
        }
        if(!valid(R)){ newRound(A.S.active); return; }
        var t=R.t, ph=R.phase, cur=R.cur, cn=esc(nm(cur)), pn=R.prev===null?"":esc(nm(R.prev)), h, list, i, others;
        h='<div class="blindmexxen-root"><div class="board"><div class="stat"><span>Opzet: <b>'+esc(nm(R.start))+'</b></span><span>Aan de beurt: <b>'+cn+'</b></span></div>';
        h+=R.claim===null?'<div class="blindmexxen-claim">Nog niets doorgegeven</div>':'<div class="blindmexxen-claim">'+pn+' zegt<b>'+label(R.claim)+'</b></div>';
        if(ph==="end"){ if(R.dice) h+=openDice(R.dice,false); }
        else if(ph==="turn"&&t.peek&&R.dice){
          /* Keuze III zegt "op zijn minst één dobbelsteen opnieuw"; "nog een keer gooien" lezen we daar als dezelfde soort worp (één of beide).
             Bij de opzet en bij keuze II staat "beide dobbelstenen", daar is elke worp met beide stenen. */
          h+=openDice(R.dice,t.looked&&t.rolls<2)+'<div class="btnrow"><button class="btn" data-act="hide">Beker dicht</button></div>';
        }
        else if(ph!=="tries"&&ph!=="lift") h+='<div class="blindmexxen-cupwrap"><div class="blindmexxen-cup'+(busy?' blindmexxen-shake':'')+'"></div></div>';
        if(R.log.length) h+='<div class="blindmexxen-log">Deze ronde: '+R.log.map(function(x){ return esc(nm(x.p))+' <b>'+label(x.s)+'</b>'; }).join(" · ")+'</div>';
        h+='</div>';

        if(ph==="turn"){
          if(R.note) h+='<p class="hint">'+esc(R.note)+'</p>';
          if(busy) h+='<p class="hint">De stenen rollen onder de beker…</p>';
          else if(t.rolls===0&&(R.prev===null||t.again)){
            h+='<p class="hint">'+cn+(t.again?' begint de beurt opnieuw':' zet op')+': gooi beide stenen onder de beker'+(digi()?'.':' en tik daarna hieronder.')+'</p><button class="roll" data-act="roll">'+(digi()?'Gooi onder de beker':'Gegooid')+'</button>';
          }
          else if(t.say){
            list=COMBOS.filter(function(s){ return (R.claim===null||s>R.claim)&&!(G.v31&&s===31); });
            h+='<p class="hint">'+cn+(t.rolls>=2?' heeft twee keer gegooid, mag niet meer kijken en geeft blind door. ':' geeft door. ')+(R.claim===null?'Kies wat je zegt.':'Het moet hoger zijn dan '+label(R.claim)+'.')+' De waarheid hoeft niet.</p><div class="blindmexxen-grid">';
            for(i=0;i<list.length;i++) h+='<button data-act="pick" data-v="'+list[i]+'" aria-pressed="'+(t.pick===list[i])+'">'+label(list[i])+'<small>'+eyes(list[i])+'</small></button>';
            h+='</div><div class="btnrow">'+(t.rolls<2?'<button class="btn" data-act="back">Terug</button>':'')+'<button class="btn gold" data-act="go"'+(t.pick?'':' disabled')+'>'+(t.pick?'Zeg '+label(t.pick)+', beker naar '+esc(nm((cur+1)%n())):'Kies een worp')+'</button></div>';
            if(G.v31&&t.rolls>=1) h+='<div class="opts">'+opt("deal","31","1 en 3 gegooid: slok uitdelen","de ander mag het geloven of de beker trekken")+'</div>';
          }
          else if(t.rolls===0&&!t.looked){ /* regel 3: keuze I, II of III, of regel 5.I: niet geloven */
            h+='<p class="hint">'+cn+': '+pn+' zegt '+label(R.claim)+'. Wat doe je?</p><div class="opts">'+
              opt("doubt","✕","Ik geloof het niet: beker trekken","ligt er lager, dan drinkt "+pn+"; anders drink jij")+
              opt("say","→","Niet kijken en doorgeven","je zegt iets hogers dan "+label(R.claim))+
              opt("roll","⟳","Niet kijken, beide stenen opnieuw gooien","daarna mag je kijken")+
              opt("look","◎",digi()?"Onder de beker kijken":"Ik kijk onder de beker","daarna moet je minstens één steen opnieuw gooien")+'</div>';
          }
          else if(t.rolls===0){ /* keuze III, gekeken: nu minstens één steen opnieuw */
            h+='<p class="hint">'+cn+' heeft gekeken en moet nu minstens één steen opnieuw gooien.'+(digi()?' Eén steen laten liggen kies je terwijl de beker open is.':'')+'</p><div class="opts">'+
              (digi()?opt("roll","⟳","Beide stenen opnieuw gooien","daarna mag je nog eens kijken")+(t.peek?'':opt("look","◎","Nog eens onder de beker kijken","om één steen te laten liggen"))
                     :opt("roll","⟳","Gegooid","één of beide stenen; daarna mag je nog eens kijken"))+'</div>';
          }
          else { /* één keer gegooid: kijken mag, doorgeven of nog één keer gooien */
            h+='<p class="hint">'+cn+' heeft gegooid en mag '+(digi()?'kijken, ':'onder de beker kijken, ')+'doorgeven of nog één keer gooien. Na een tweede worp mag je niet meer kijken.</p><div class="opts">'+
              (digi()&&!t.peek?opt("look","◎","Onder de beker kijken","alleen jij"):"")+
              opt("say","→","Doorgeven",R.claim===null?"je zegt wat je wilt":"je zegt iets hogers dan "+label(R.claim))+
              opt("roll","⟳",digi()?"Nog een keer gooien, beide stenen":"Nog een keer gegooid",(t.looked?(digi()?"één steen laten liggen kies je met de beker open; ":"één of beide stenen; "):"")+"daarna niet meer kijken, blind doorgeven")+
              (G.v31?opt("deal","31","1 en 3 gegooid: slok uitdelen","de ander mag het geloven of de beker trekken"):"")+'</div>';
          }
        }
        else if(ph==="deal"){
          if(R.deal.to===null){
            others=A.others(cur);
            h+='<p class="hint">'+cn+' zegt 1 en 3 te hebben gegooid en mag één slok uitdelen. Aan wie?</p><div class="opts">';
            for(i=0;i<others.length;i++) h+=opt("dealto","1",esc(nm(others[i])),"krijgt de slok",others[i]);
            h+='</div><div class="btnrow"><button class="btn" data-act="dealback">Toch niet</button></div>';
          } else {
            h+='<p class="hint">'+esc(nm(R.deal.to))+': '+cn+' zegt dat er 1 en 3 ligt en geeft jou een slok. Geloof je het?</p><div class="opts">'+
              opt("dealja","✓","Ik geloof het","jij drinkt 1 slok")+
              opt("dealnee","✕","Ik geloof het niet: beker trekken","ligt er 1 en 3, dan drink jij 2 slokken; anders drinkt "+cn+" 1 slok")+'</div>';
          }
        }
        else if(ph==="mexx"){
          h+='<p class="hint">'+pn+' zegt Mexx. '+cn+': zeg of je het gelooft en trek dan de beker.</p><div class="opts">'+
            opt("mexxja","✓","Ik geloof het","ligt er Mexx, dan krijg je drie worpen om ook Mexx te gooien; anders drink jij")+
            opt("mexxnee","✕","Ik geloof het niet","ligt er Mexx, dan drink jij"+(G.dubbel?" dubbel":"")+"; anders drinkt "+pn)+'</div>';
        }
        else if(ph==="lift"){
          h+='<div class="verdict neutral"><h2>Beker omhoog</h2><p>Tik de stenen aan en voer in wat er onder de beker ligt.</p><div id="bmLift"></div></div>';
        }
        else if(ph==="tries"){
          h+='<p class="hint">'+cn+' gelooft '+pn+' en er ligt Mexx. Gooi nu zelf Mexx: poging '+(R.tries.length+1)+' van 3.</p><div id="bmTries"></div>';
          if(R.tries.length) h+='<div class="blindmexxen-log">'+R.tries.map(function(v,k){ return 'Poging '+(k+1)+': '+A.dicerowSmall(v); }).join(" &nbsp; ")+'</div>';
        }
        else if(ph==="end"){
          h+='<div class="verdict '+(R.res.kind==="win"?"win":"fout")+'"><h2>'+esc(R.res.title)+'</h2><p>'+esc(R.res.text)+'</p><div class="btnrow"><button class="btn gold" data-act="next">Nieuwe ronde: '+esc(nm(R.res.starter))+' zet op</button></div></div>';
        }

        h+='<div class="seg" style="margin-top:14px"><button data-act="mode" data-v="digi" aria-pressed="'+digi()+'">Digitale stenen</button><button data-act="mode" data-v="echt" aria-pressed="'+!digi()+'">Echte stenen en beker</button></div>';
        h+='<div class="seg"><button data-act="v31" aria-pressed="'+G.v31+'">1 en 3 = slok uitdelen</button><button data-act="dub" aria-pressed="'+G.dubbel+'">precies goed = dubbel</button></div>';
        /* De bijbel zegt alleen "moet drinken": standaard één slok, hoeveel precies spreek je zelf af. */
        h+='<div class="seg"><span style="font-size:12px;color:var(--ivory-dim);align-self:center">wie verliest drinkt:</span><button data-act="inzet" data-v="1" aria-pressed="'+(G.inzet===1)+'">1 slok</button><button data-act="inzet" data-v="2" aria-pressed="'+(G.inzet===2)+'">2</button><button data-act="inzet" data-v="3" aria-pressed="'+(G.inzet===3)+'">3</button></div>';
        h+='<p class="hint" style="font-size:12px">'+(digi()?'De telefoon is de beker: geef hem door. Alleen wie mag kijken, tikt op kijken.':'Gooi met echte stenen onder een echte beker. De app houdt bij wat er gezegd is en wie drinkt; gaat de beker omhoog, dan voer je in wat er ligt.')+'</p>';
        h+='<div class="btnrow"><button class="btn" data-act="new">Nieuw spel</button></div></div>';
        root.innerHTML=h;

        Array.prototype.forEach.call(root.querySelectorAll("[data-act]"),function(b){ b.onclick=function(){ act(b.getAttribute("data-act"),b.getAttribute("data-v")); }; });
        if(ph==="lift") A.Dice(el("bmLift"),{n:2,noRoll:true,onRoll:function(v){ if(R.phase==="lift") resolve(R.lift,v); }});
        if(ph==="tries") A.Dice(el("bmTries"),{n:2,label:"Gooi voor Mexx",onRoll:function(v){ if(R.phase==="tries") tryRoll(v); }});
      }

      this.refresh=render;
      this.destroy=function(){ dead=true; if(timer){ clearTimeout(timer); timer=null; } busy=false; if(R&&R.t) R.t.peek=false; };
      /* De app bewaakt de beurt. Alleen vóór de eerste worp (wie zet op) en na een ronde (wie begint de volgende) kies je zelf een speler. */
      this.onPlayer=function(i){
        if(n()<2||!valid(R)){ render(); return; }
        if(busy){ setActive(R.cur); return; }
        if(R.phase==="end"){ R.res.starter=i; A.save(); render(); return; }
        if(R.phase==="turn"&&R.prev===null&&R.t.rolls===0&&!R.t.again){ newRound(i); return; }
        setActive(R.cur); A.toast("De beurt ligt vast",nm(R.cur)+" is aan de beurt. Met Nieuw spel zet iemand anders op.",3000);
      };

      R=G.R||null;
      if(R&&R.t){ R.t.peek=false; } /* na herladen ligt de beker altijd dicht */
      if(valid(R)) render(); else newRound(A.S.active);
    }
  });
})();
