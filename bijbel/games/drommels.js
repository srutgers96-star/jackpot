/* ===== Drommels =====
   De bijbel beschrijft Drommels voor twee spelers; hier kan het met twee of meer.

   Regels in de app:
   1. Iedere deelnemer heeft één steen en iedereen gooit tegelijk. "Gooi tegelijk" gooit voor iedereen één digitale
      steen; echte stenen vul je per steen in door hem aan te tikken (onder elke steen staat van wie hij is).
   2. De laagste roept 'drommels' en drinkt één slok. Ligt de laagste worp er vaker, dan drinkt IEDER van hen één slok.
      Uitzondering: gooit iedereen hetzelfde, dan is er geen laagste en drinkt niemand (met twee spelers is dat precies
      de gelijke worp uit de bijbel: alleen uitdelen).
   3. Elke groep van twee of meer spelers met dezelfde ogen deelt het TOTAAL van de stenen van die groep uit (drie
      spelers met een 4 = 12 slokken) aan ÉÉN andere persoon, samen gekozen door een naam aan te tikken. Kiesbaar is
      iedereen die niet in die groep zit: eerst wie toekijkt (de bijbel: "een andere persoon die niet deelneemt aan het
      spel"), dan de andere deelnemers. Daarnaast kan altijd "iemand anders in de ruimte" (de bijbel;
      die staat niet in de app, dus daar wordt niets geboekt), ook als er in de app niemand buiten de groep is. Wie samen het laagst gooit drinkt dus én deelt uit; gelijke ogen hoger op tafel delen alleen uit.
   4. Meerdere groepen in één worp worden na elkaar afgehandeld, de laagste ogen eerst; pas als alles is afgehandeld
      kan de volgende worp.

   Punt 2 tot en met 4 voor meer dan twee spelers staan NIET in de bijbel: dat is het besluit van Stijn (15 nov 2026):
   "drommels kan ook met meerdere spelers" en, bij meerdere laagsten: "uitdelen en drinken is dat dan volgens mij. dus
   wordt stuk chaotischer met meerdere spelers."

   Verder:
   - "Het totaal aantal ogen" (bijbel, regel 3) is gelezen als alle stenen van de groep samen (4 en 4 = 8 slokken).
   - Uitdelen mag, het hoeft niet (bijbel: "kan uitgedeeld worden"): daarom staat er ook "Niet uitdelen".
   - Geen adtje kruk: ieder gooit hier maar één steen; de kruk-regel geldt alleen als één speler met twee stenen gooit.
   - Zolang er nog een groep moet uitdelen staat het uitdelen bovenaan, boven de stenen, en zijn de volgende worp en
     de knoppen voor wie meedoet geblokkeerd. Het grote scherm bij een worp met uitdelen en na elke uitgedeelde slok
     blijft staan tot een tik; een tweede tik binnen een halve seconde daarna telt niet.
   - Wie meedoet: standaard iedereen in de spelersbalk. Met de knoppen onderaan zet je iemand op "kijkt toe" (minstens
     twee doen mee). De keuze staat per NAAM in A.gs("drommels").pl en blijft staan als er spelers bijkomen, weggaan
     of anders gaan heten.
   - Een bewaarde stand van de oude versie voor twee (velden a, b, an, bn, sa, sb, rounds, pending, last) wordt
     omgezet: de tellers blijven, een half afgehandelde worp vervalt.

   Opslag (A.gs("drommels")): v=2, n=worpen, dealt=uitgedeelde slokken, pl=[{n:naam,out:kijkt toe,s:slokken,d:steen}]
   in de volgorde van de spelersbalk, r=de getelde worp {dice:[{n,v}],low,drank:[namen],gr:[{v,t,nm,st,to}]} of null.
   gr[].st: 0 = moet nog uitgedeeld, 1 = uitgedeeld aan to, 2 = niet uitgedeeld, 3 = niemand buiten de groep. */
(function(){
  "use strict";
  var A=App, esc=A.esc, ID="drommels";
  var CSS='.drommels-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:12px 4px;padding:6px 0 2px}'+
    '.drommels-cell{width:72px;min-width:0;display:flex;flex-direction:column;align-items:center;gap:8px}'+
    '.drommels-nm{max-width:100%;font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
    '.drommels-sip{margin-top:-5px;font-size:11px;color:var(--ivory-dim);border-radius:999px;padding:1px 7px}'+
    '.drommels-sip.drommels-on{background:var(--gold);color:var(--ink);font-weight:700}'+
    '.drommels-hl{outline:3px solid var(--gold);outline-offset:3px}'+
    '.drommels-act{margin-top:14px}'+
    '.drommels-btn{min-height:44px}'+
    '.drommels-opt{min-height:52px}'+
    '.drommels-log{margin-top:10px}'+
    '.drommels-who{margin-top:16px}'+
    '.drommels-who button{min-height:44px;max-width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.25;padding:4px 12px}'+
    '.drommels-who button:disabled{opacity:.55}'+
    '.drommels-who b{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
    '.drommels-who small{font-size:11px;font-weight:400;white-space:nowrap}'+
    '.overlay.drommels-ov span.t{font-size:min(15vw,72px)}'+
    '.drommels-ovrow{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 4px;margin:14px 0 4px}'+
    '.drommels-ovd{width:66px;min-width:0;display:flex;flex-direction:column;align-items:center;gap:4px}'+
    '.drommels-ovn{max-width:100%;font-size:12px;font-weight:700;font-style:normal;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
    '.overlay.win .drommels-ovn{color:var(--ink)}';
  function addCss(){ if(document.getElementById("drommels-css"))return; var s=document.createElement("style"); s.id="drommels-css"; s.textContent=CSS; document.head.appendChild(s); }
  function slok(n){ return n===1?"1 slok":n+" slokken"; }
  function okVal(v){ return v===1||v===2||v===3||v===4||v===5||v===6; }
  function isStr(x){ return typeof x==="string"; }
  function cnt(x){ return (typeof x==="number"&&isFinite(x)&&x>0)?Math.floor(x):0; }
  var ALLE=["","","allebei","alle drie","alle vier","alle vijf","alle zes","alle zeven","alle acht"];
  function alle(c){ return ALLE[c]||("alle "+c); }

  /* De scheidsrechter: vals = ogen per deelnemer (1..6).
     low = de laagste ogen, of 0 als iedereen hetzelfde gooit (dan is er geen laagste);
     drink = wie één slok drinkt (plek in vals); groups = elke waarde die twee keer of vaker ligt, laagste eerst. */
  function judge(vals){
    var c=[0,0,0,0,0,0,0], low=7, drink=[], groups=[], i, v, g;
    for(i=0;i<vals.length;i++){ c[vals[i]]++; if(vals[i]<low) low=vals[i]; }
    if(c[low]===vals.length) low=0;
    for(i=0;i<vals.length;i++) if(vals[i]===low) drink.push(i);
    for(v=1;v<=6;v++) if(c[v]>=2){ g={v:v,idx:[]}; for(i=0;i<vals.length;i++) if(vals[i]===v) g.idx.push(i); groups.push(g); }
    return {low:low, drink:drink, groups:groups};
  }
  /* Exacte kansen per worp met n deelnemers. spect = er staat iemand in de app die niet meegooit, zodat er ook
     uitgedeeld kan worden als alle deelnemers hetzelfde gooien.
     drink: kans dat één bepaalde speler drinkt = kans dat zijn steen (mede) de laagste is, min de kans op allemaal gelijk.
     deal:  kans op minstens één keer uitdelen = 1 - kans op allemaal verschillend (- allemaal gelijk zonder toekijker).
     sips:  gemiddeld aantal uitgedeelde slokken = 3,5 x n x (1 - (5/6)^(n-1)) (- 21n/6^n zonder toekijker). */
  function odds(n,spect){
    var pLow=0, same=Math.pow(6,1-n), diff=1, v, i;
    for(v=1;v<=6;v++) pLow+=Math.pow((7-v)/6,n-1)/6;
    for(i=0;i<n;i++) diff*=Math.max(0,6-i)/6;
    return { drink:pLow-same, deal:1-diff-(spect?0:same), sips:3.5*n*(1-Math.pow(5/6,n-1))-(spect?0:21*n/Math.pow(6,n)) };
  }

  A.register({ id:ID, beta:true, title:"Drommels", level:"app", kans:true, sub:"Ieder één steen tegelijk: laagste drinkt, gelijke ogen delen uit",
    init:function(root){
      addCss();
      var G=A.gs(ID), box=document.createElement("div"), alive=true, pick=null, rolling=false, timer=null, tmp=[], seen="", obs=null, quiet=0;
      root.innerHTML=""; root.appendChild(box);

      function sig(){ return A.S.players.map(function(q){return q.name;}).join("\n"); }
      function stop(){ if(timer){ clearInterval(timer); timer=null; } rolling=false; }

      /* een stand van de versie voor twee spelers: tellers meenemen, de rest vervalt */
      function migrate(){
        var old, k;
        if(G.v===2) return;
        old={n:G.rounds, dealt:G.dealt, an:G.an, bn:G.bn, sa:G.sa, sb:G.sb};
        for(k in G) if(Object.prototype.hasOwnProperty.call(G,k)) delete G[k];
        G.v=2; G.n=cnt(old.n); G.dealt=cnt(old.dealt); G.pl=[]; G.r=null;
        if(isStr(old.an)) G.pl.push({n:old.an,out:false,s:cnt(old.sa),d:null});
        if(isStr(old.bn)&&old.bn!==old.an) G.pl.push({n:old.bn,out:false,s:cnt(old.sb),d:null});
        A.save();
      }
      /* onleesbare opslag: liever een schone worp dan een fout */
      function clean(){
        var r=G.r, ok;
        if(!Array.isArray(G.pl)) G.pl=[];
        G.pl=G.pl.filter(function(e){ return !!e&&typeof e==="object"&&isStr(e.n); });
        G.pl.forEach(function(e){ e.out=e.out===true; e.s=cnt(e.s); if(!okVal(e.d)) e.d=null; });
        G.n=cnt(G.n); G.dealt=cnt(G.dealt);
        ok=!!r&&typeof r==="object"&&Array.isArray(r.dice)&&r.dice.length>=2&&r.dice.every(function(x){ return !!x&&isStr(x.n)&&okVal(x.v); })&&
          (r.low===0||okVal(r.low))&&Array.isArray(r.drank)&&r.drank.every(isStr)&&Array.isArray(r.gr)&&r.gr.every(function(g){
            return !!g&&okVal(g.v)&&cnt(g.t)>0&&Array.isArray(g.nm)&&g.nm.length>=2&&g.nm.every(isStr)&&(g.st===0||g.st===2||g.st===3||(g.st===1&&isStr(g.to))); });
        if(!ok){ if(r) G.pl.forEach(function(e){ e.d=null; }); G.r=null; }
      }
      /* G.pl gelijk trekken met de spelersbalk: dezelfde naam houdt zijn keuze, slokken en steen; is alleen een naam
         veranderd (zelfde aantal spelers), dan verhuist de regel mee; een nieuwe speler doet mee. */
      function sync(){
        var P=A.S.players, old=G.pl, n=P.length, used=[], nw=[], ch=old.length!==n, i, j, c=0;
        for(i=0;i<n;i++) if(old[i]&&old[i].n===P[i].name){ nw[i]=old[i]; used[i]=true; }
        for(i=0;i<n;i++) if(!nw[i]) for(j=0;j<old.length;j++) if(!used[j]&&old[j].n===P[i].name){ nw[i]=old[j]; used[j]=true; ch=true; break; }
        for(i=0;i<n;i++) if(!nw[i]){
          if(old.length===n&&old[i]&&!used[i]){ nw[i]=old[i]; used[i]=true; nw[i].n=P[i].name; }
          else nw[i]={n:P[i].name,out:false,s:0,d:null};
          ch=true;
        }
        G.pl=nw;
        for(i=0;i<n;i++) if(!nw[i].out) c++;
        for(i=0;i<n&&c<2;i++) if(nw[i].out){ nw[i].out=false; c++; ch=true; } /* minstens twee doen mee */
        if(!G.r) for(i=0;i<n;i++) if(nw[i].out&&nw[i].d!==null){ nw[i].d=null; ch=true; }
        if(ch){ pick=null; A.save(); }
      }
      function parts(){ var a=[], i; for(i=0;i<G.pl.length&&i<A.S.players.length;i++) if(!G.pl[i].out) a.push(i); return a; }
      function pending(r){ var k; if(!r) return -1; for(k=0;k<r.gr.length;k++) if(r.gr[k].st===0) return k; return -1; }
      /* wie de slokken van groep g kan krijgen: iedereen die niet in de groep zit, toekijkers eerst */
      function elig(g){
        var s=[], o=[], i, e;
        for(i=0;i<A.S.players.length;i++){ e=G.pl[i]; if(!e||e.d===g.v) continue; (e.out?s:o).push(i); }
        return {s:s, o:o, n:s.length+o.length};
      }
      function autoSkip(){
        var r=G.r, ch=false;
        if(!r) return false;
        /* niemand in de app buiten de groep? Dan blijft de bijbelkeuze over: iemand anders in de ruimte. Niets wordt overgeslagen. */
        return ch;
      }
      function big(kind,title,lines,ms,extra){
        var o=A.overlay(kind,title,lines,ms,extra);
        if(o&&o.classList) o.classList.add("drommels-ov");
        /* Blijft hij staan tot een tik, dan telt een tweede tik vlak daarna (dubbel tikken om hem weg te halen) niet:
           die zou anders op een uitdeelknop of op Gooi tegelijk eronder terechtkomen, en een slok is niet terug te draaien.
           Dit vervangt meteen een oude afspraak van een ander spel. */
        if(ms===0) A.onOverlayClose(function(){ quiet=Date.now()+450; });
      }
      function ovDice(dice){
        return '<span class="drommels-ovrow">'+dice.map(function(x){ return '<span class="drommels-ovd"><span class="mini">'+A.pips(x.v)+'</span><i class="drommels-ovn">'+esc(x.n)+'</i></span>'; }).join("")+'</span>';
      }

      /* ---- een worp ---- */
      function startRound(){ G.r=null; G.pl.forEach(function(e){ e.d=null; }); pick=null; }
      function announce(r){
        var pend=r.gr.filter(function(g){return g.st===0;}), dead=r.gr.filter(function(g){return g.st===3;}), lines=[], title;
        if(!r.low){ title="Gelijk!"; lines.push((r.dice.length===2?A.joinNames(r.dice.map(function(x){return x.n;}))+" gooien allebei ":"Iedereen gooit ")+r.dice[0].v+": niemand drinkt."); }
        else { title="Drommels!"; lines.push(A.joinNames(r.drank)+(r.drank.length===1?" gooit het laagst en neemt een slok.":" gooien het laagst en nemen ieder een slok.")); }
        if(pend.length===1) lines.push(A.joinNames(pend[0].nm)+" delen samen "+slok(pend[0].t)+" uit.");
        else if(pend.length>1) lines.push("Er wordt "+pend.length+" keer uitgedeeld. Eerst "+A.joinNames(pend[0].nm)+": "+slok(pend[0].t)+".");
        else if(dead.length) lines.push("Er is niemand buiten de groep: er wordt niets uitgedeeld.");
        A.play(pend.length?"special":"ding");
        /* met uitdelen blijft hij staan tot een tik: die tik mag niet op een uitdeelknop eronder terechtkomen */
        big(r.low?"dood":"win",title,lines,pend.length?0:(lines.length>1?2600:1700),ovDice(r.dice));
      }
      /* alle stenen liggen: de laagste(n) drinken meteen, de groepen met gelijke ogen komen klaar te staan */
      function settle(){
        var P=A.S.players, part=parts(), vals, j, r;
        if(G.r||part.length<2){ render(); return; }
        vals=part.map(function(i){ return G.pl[i].d; });
        if(!vals.every(okVal)){ render(); return; }
        j=judge(vals);
        r={ dice:part.map(function(i,k){ return {n:P[i].name,v:vals[k]}; }), low:j.low,
            drank:j.drink.map(function(k){ return P[part[k]].name; }),
            gr:j.groups.map(function(g){ return {v:g.v, t:g.v*g.idx.length, nm:g.idx.map(function(k){ return P[part[k]].name; }), st:0, to:""}; }) };
        G.r=r; G.n++; pick=null; autoSkip();
        if(j.drink.length) A.S.active=part[j.drink[0]];
        j.drink.forEach(function(k){ G.pl[part[k]].s++; A.drink(part[k],1); });
        A.save(); A.renderPlayers();
        announce(r); render();
      }
      function rollAll(){
        var n=0;
        if(rolling||A.S.players.length<2) return;
        if(G.r){ if(pending(G.r)>=0) return; startRound(); }
        function shake(){ var c=parts().length, i; tmp=[]; for(i=0;i<c;i++) tmp.push(A.rnd(6)); }
        rolling=true; pick=null; A.play("rattle"); shake(); render();
        timer=setInterval(function(){
          var part;
          shake(); n++;
          if(n<12){ render(); return; }
          stop(); if(!alive) return;
          if(A.S.players.length<2||G.r){ render(); return; }
          sync(); part=parts();
          part.forEach(function(i,k){ G.pl[i].d=okVal(tmp[k])?tmp[k]:A.rnd(6); });
          settle();
        },70);
      }
      /* groep k deelt uit aan speler to (plek in de balk), of "none" = niet uitdelen */
      function deal(k,to){
        var r=G.r, g, j, e;
        if(!r||rolling||k!==pending(r)) return;
        g=r.gr[k];
        if(to==="none"){ g.st=2; A.save(); A.play("tick"); render(); return; }
        if(to==="room"){ /* bijbel, regel 3: iemand in de ruimte die niet meespeelt; die staat niet in de app, dus er wordt niets geboekt */
          g.st=1; g.to="Iemand anders in de ruimte"; G.dealt+=g.t; A.save(); A.play("dood"); render();
          big("dood",slok(g.t),["Iemand anders in de ruimte drinkt "+slok(g.t)+".","Uitgedeeld door "+A.joinNames(g.nm)+"."],0); return;
        }
        j=parseInt(to,10); e=G.pl[j];
        if(!A.S.players[j]||!e||e.d===g.v) return; /* wie zelf in de groep zit kan de slokken niet krijgen */
        g.st=1; g.to=A.name(j); G.dealt+=g.t; e.s+=g.t;
        A.S.active=j; A.drink(j,g.t); A.play("dood");
        render();
        big("dood",slok(g.t),[g.to+" drinkt "+slok(g.t)+".","Uitgedeeld door "+A.joinNames(g.nm)+"."],0);
      }
      function toggle(i){
        var e=G.pl[i];
        if(!e||!A.S.players[i]||rolling||pending(G.r)>=0) return;
        if(!e.out&&parts().length<=2){ A.toast("Minstens twee spelers","Drommels heeft twee gooiers nodig. Laat eerst iemand anders meedoen."); return; }
        e.out=!e.out; if(!G.r) e.d=null;
        pick=null; A.save(); A.play("tick"); render();
      }
      function newGame(){
        stop(); G.n=0; G.dealt=0; G.r=null; pick=null;
        G.pl.forEach(function(e){ e.s=0; e.d=null; });
        A.save(); render();
      }

      /* ---- scherm ---- */
      function gridDone(r,hl){
        var h='<div class="drommels-grid">';
        r.dice.forEach(function(x){
          var dr=!!r.low&&x.v===r.low;
          h+='<div class="drommels-cell"><span class="die'+(hl&&x.v===hl?' drommels-hl':'')+'">'+A.pips(x.v)+'</span><span class="drommels-nm">'+esc(x.n)+'</span>'+
            '<span class="drommels-sip'+(dr?' drommels-on':'')+'">'+(dr?'1 slok':'–')+'</span></div>';
        });
        return h+'</div>';
      }
      function gridOpen(part){
        var h='<div class="drommels-grid">';
        part.forEach(function(i,k){
          var v=rolling?tmp[k]:G.pl[i].d, nm=A.name(i);
          h+='<div class="drommels-cell"><button class="die'+(v?'':' blank')+(pick===i?' picking':'')+(rolling?' rolling':'')+'" data-d="'+i+'" aria-label="Steen van '+esc(nm)+(v?': '+v:'')+'">'+(v?A.pips(v):'?')+'</button>'+
            '<span class="drommels-nm">'+esc(nm)+'</span></div>';
        });
        return h+'</div>';
      }
      /* per slok een regel: wie, hoeveel en waarom */
      function lines(r){
        var h='<div class="log drommels-log">';
        if(!r.low) h+='<div>'+(r.dice.length===2?'Allebei':'Iedereen gooit')+' '+r.dice[0].v+': er is geen laagste, niemand drinkt.</div>';
        else r.drank.forEach(function(nm){ h+='<div><b>'+esc(nm)+'</b> drinkt 1 slok: laagste worp ('+r.low+'), roept ‘drommels’.</div>'; });
        r.gr.forEach(function(g){
          var who=esc(A.joinNames(g.nm)), same=alle(g.nm.length)+' '+g.v;
          if(g.st===1) h+='<div><b>'+esc(g.to)+'</b> drinkt '+slok(g.t)+': uitgedeeld door '+who+' ('+same+').</div>';
          else if(g.st===2) h+='<div>'+who+' gooien '+same+' en delen hun '+slok(g.t)+' niet uit.</div>';
          else if(g.st===3) h+='<div>'+who+' gooien '+same+' ('+slok(g.t)+'), maar er is niemand buiten de groep: er wordt niets uitgedeeld.</div>';
          else h+='<div>'+who+' gooien '+same+': samen '+slok(g.t)+' uitdelen.</div>';
        });
        return h+'</div>';
      }
      function render(){
        if(!alive) return;
        var P=A.S.players, h="", r, part, k, g, el, full, some, lock, o, v, more;
        seen=sig();
        if(P.length<2){ stop(); pick=null; box.innerHTML='<p class="hint">Drommels speel je met minstens twee spelers, ieder met één dobbelsteen. Voeg met “+ speler” een tweede speler toe.</p>'; return; }
        sync();
        if(autoSkip()) A.save();
        r=G.r; part=parts(); k=pending(r); lock=rolling||k>=0;
        if(pick!==null&&(r||!G.pl[pick]||G.pl[pick].out)) pick=null;
        h+='<div class="board"><div class="stat"><span>Worpen: <b>'+G.n+'</b></span><span>Uitgedeeld: <b>'+slok(G.dealt)+'</b></span></div></div>';
        if(r){
          g=k>=0?r.gr[k]:null;
          h+='<p class="hint">Worp '+G.n+'. '+(g?'Eerst uitdelen: tik hieronder aan wie de '+slok(g.t)+' krijgt.':'Alles is afgehandeld: gooi maar weer.')+'</p>';
          if(g){
            /* het uitdelen staat BOVEN de stenen: met vijf tot acht deelnemers (twee rijen stenen) zouden de namen anders
               pas na scrollen in beeld komen, terwijl er verder niets kan */
            el=elig(g); more=r.gr.filter(function(x){return x.st===0;}).length-1;
            h+='<div class="verdict win"><h2>'+slok(g.t)+' uitdelen</h2><p>'+esc(A.joinNames(g.nm))+' gooien '+alle(g.nm.length)+' <b>'+g.v+'</b>. Kies samen één persoon die de '+slok(g.t)+' drinkt en tik de naam aan.</p></div>';
            h+='<div class="opts">';
            el.s.forEach(function(j){ h+='<button class="opt drommels-opt" data-to="'+k+':'+j+'"><span class="num">'+g.t+'</span><span class="lbl">'+esc(A.name(j))+'<small>kijkt toe · drinkt '+slok(g.t)+'</small></span></button>'; });
            el.o.forEach(function(j){ var d=G.pl[j].d; h+='<button class="opt drommels-opt" data-to="'+k+':'+j+'"><span class="num">'+g.t+'</span><span class="lbl">'+esc(A.name(j))+'<small>doet mee'+(d?', gooide '+d:'')+' · drinkt '+slok(g.t)+'</small></span></button>'; });
            h+='<button class="opt drommels-opt" data-to="'+k+':room"><span class="num">'+g.t+'</span><span class="lbl">Iemand anders in de ruimte<small>staat niet in de app · drinkt '+slok(g.t)+'</small></span></button>';
            h+='<button class="opt drommels-opt" data-to="'+k+':none"><span class="num">–</span><span class="lbl">Niet uitdelen<small>uitdelen mag, het hoeft niet</small></span></button>';
            h+='</div>';
            h+='<p class="hint">'+(more>0?'Daarna '+(more===1?'is de volgende groep':'zijn de volgende groepen')+' met gelijke ogen aan de beurt.':'Daarna kan de volgende worp.')+'</p>';
          }
          h+='<div class="board">'+gridDone(r,g?g.v:0)+lines(r)+'</div>';
          if(!g){
            if(r.gr.some(function(x){return x.st===3;})) h+='<p class="hint">Is er iemand in de ruimte die niet meespeelt? Zet hem of haar erbij met “+ speler” en tik daarna onderaan op die naam, zodat er ‘kijkt toe’ staat: dan kunnen gelijke ogen de volgende keer wel worden uitgedeeld.</p>';
            h+='<div class="drommels-act"><button class="roll" data-act="roll">Gooi tegelijk</button><div class="btnrow"><button class="btn drommels-btn" data-act="manual">Echte stenen invullen</button></div></div>';
          }
        } else {
          full=!rolling&&part.every(function(i){ return !!G.pl[i].d; });
          some=!rolling&&part.some(function(i){ return !!G.pl[i].d; });
          h+='<p class="hint">Worp '+(G.n+1)+'. '+(rolling?'De stenen rollen…'
            :full?'Alle stenen liggen er. Klopt het? Tik op <b>Tel deze worp</b>; een steen aantikken verbetert hem.'
            :pick!==null?'Kies hieronder de ogen van '+esc(A.name(pick))+'; daarna komt vanzelf de volgende steen.'
            :some?'Nog niet alle stenen zijn ingevuld: tik een steen met een vraagteken aan en kies de ogen.'
            :'Iedereen gooit tegelijk één steen: tik op <b>Gooi tegelijk</b>, of tik een steen aan en vul de echte worp in.')+'</p>';
          h+='<div class="board">'+gridOpen(part)+'</div>';
          h+='<div class="drommels-act">';
          if(pick!==null&&!rolling){
            h+='<p class="hint">Wat gooit '+esc(A.name(pick))+'?</p><div class="picker open">';
            for(v=1;v<=6;v++) h+='<button data-v="'+v+'" aria-label="'+v+'">'+A.pips(v)+'</button>';
            h+='</div>';
          }
          if(full) h+='<button class="roll" data-act="count">Tel deze worp</button><div class="btnrow"><button class="btn drommels-btn" data-act="wipe">Stenen wissen</button><button class="btn drommels-btn" data-act="roll">Toch digitaal gooien</button></div>';
          /* wie echte stenen aan het invullen is krijgt geen grote gooiknop vlak onder de ogen: één misser zou de worp
             digitaal gooien en meteen tellen */
          else if(some||(pick!==null&&!rolling)) h+='<div class="btnrow">'+(some?'<button class="btn drommels-btn" data-act="wipe">Stenen wissen</button>':'')+'<button class="btn drommels-btn" data-act="roll">Toch digitaal gooien</button></div>';
          else h+='<button class="roll" data-act="roll"'+(rolling?' disabled':'')+'>Gooi tegelijk</button>';
          h+='</div>';
          h+='<p class="hint">De laagste roept ‘drommels’ en drinkt één slok (meerdere laagsten: ieder één). Wie dezelfde ogen gooien, delen die ogen samen uit aan één ander.</p>';
        }
        o=odds(part.length,P.length>part.length);
        h+='<p class="hint kans">Per worp met '+part.length+' gooiers: '+A.pct(o.drink)+' kans dat jij drinkt, '+
          (o.deal>1e-9?A.pct(o.deal)+' kans dat er wordt uitgedeeld (gemiddeld '+A.num(o.sips,2)+' slokken per worp).'
            :A.pct(1/6)+' kans op gelijk, maar zonder toekijker is er dan niemand om aan uit te delen.')+'</p>';
        h+='<div class="seg drommels-who">';
        P.forEach(function(q,i){ var e=G.pl[i]; h+='<button data-tog="'+i+'" aria-pressed="'+(!e.out)+'"'+(lock?' disabled':'')+'><b>'+esc(q.name)+'</b><small>'+(e.out?'kijkt toe':'doet mee')+' · '+slok(e.s)+'</small></button>'; });
        h+='</div>';
        h+='<p class="hint">'+(lock?'Wie meedoet pas je aan als deze worp is afgehandeld.'
          :P.length===2?'Met z’n tweeën doen jullie allebei mee. Zet toekijkers erbij met “+ speler” en tik ze hier op ‘kijkt toe’: zij gooien niet, maar kunnen wel slokken krijgen.'
          :'Tik op een naam om iemand te laten toekijken of weer mee te laten doen (minstens twee doen mee). Wie toekijkt gooit niet, maar kan wel slokken krijgen.')+'</p>';
        h+='<div class="btnrow"><button class="btn drommels-btn" data-act="new">Nieuw spel</button></div>';
        box.innerHTML=h;
      }

      box.addEventListener("click",function(ev){
        var b=ev.target&&ev.target.closest?ev.target.closest("button"):null; if(!b||b.disabled) return;
        var act=b.getAttribute("data-act"), d=b.getAttribute("data-d"), v=b.getAttribute("data-v"), to=b.getAttribute("data-to"), tg=b.getAttribute("data-tog"), part, e, i, n, c, at;
        /* de spelers zijn veranderd sinds dit scherm getekend is: de knoppen wijzen dan misschien naar de verkeerde
           speler, dus eerst opnieuw tekenen en deze tik niet uitvoeren */
        if(!alive||sig()!==seen){ render(); return; }
        if(Date.now()<quiet) return; /* de tweede tik van een dubbele tik op het grote scherm */
        if(d!==null){ if(rolling||G.r) return; i=parseInt(d,10); if(!G.pl[i]||G.pl[i].out) return; pick=(pick===i?null:i); render(); return; }
        if(v!==null){
          if(rolling||G.r||pick===null||!okVal(+v)) return;
          e=G.pl[pick]; part=parts(); at=part.indexOf(pick);
          if(!e||at<0){ pick=null; render(); return; }
          e.d=+v; A.play("tick"); n=part.length; c=null;
          for(i=1;i<n;i++){ if(G.pl[part[(at+i)%n]].d===null){ c=part[(at+i)%n]; break; } }
          pick=c; A.save(); render(); return;
        }
        if(to!==null){ to=to.split(":"); deal(parseInt(to[0],10),to[1]); return; }
        if(tg!==null){ toggle(parseInt(tg,10)); return; }
        if(act==="roll") rollAll();
        else if(act==="count"){ if(!rolling) settle(); }
        else if(act==="wipe"){ if(rolling||G.r) return; G.pl.forEach(function(x){ x.d=null; }); pick=null; A.save(); render(); }
        else if(act==="manual"){ if(rolling||!G.r||pending(G.r)>=0) return; startRound(); part=parts(); pick=part.length?part[0]:null; A.save(); render(); }
        else if(act==="new") newGame();
      });

      /* de spelersbalk verandert soms zonder seintje naar het spel (een naam typen): zelf meekijken of er iemand bij,
         af of hernoemd is, zodat er altijd precies één steen per deelnemer ligt */
      if(window.MutationObserver&&A.el("players")){
        obs=new MutationObserver(function(){ if(alive&&sig()!==seen) render(); });
        obs.observe(A.el("players"),{childList:true});
      }
      this.destroy=function(){ alive=false; stop(); if(obs){ obs.disconnect(); obs=null; } };
      this.refresh=render;
      migrate(); clean();
      render();
    }
  });
})();
