/* ===== Snelmexx =====
   Telefoon midden op tafel: elk paar dobbelstenen heeft een eigen vak met de naam van wie de stenen heeft.
   Iedereen met stenen gooit tegelijk, zo snel mogelijk, tot er Mexx ligt; dan pas gaan de stenen met de klok mee door.
   Keuzes waar de bijbel niets over zegt:
   - "Dezelfde regels als Mexx": een 1 of 2 mag je één keer laten liggen, hier één keer per keer dat je de stenen hebt
     (je "beurt" duurt tot je Mexx gooit) en voor één worp. Scores, laagste verliest en opzetten vervallen: niemand eindigt met een score.
   - Regel 4 (31: iedereen met stenen één slok, ook de gooier) vervangt de Mexx-regel "31 = één slok uitdelen".
   - Ingehaald = je krijgt een paar terwijl je er nog een hebt. Je hebt dan twee paren en moet met elk paar Mexx gooien.
   - Adtje kruk telt per paar stenen (de telling reist met de stenen mee, zoals bij Mexx "doorgegeven tussen spelers").
   - "etc." bij de benodigdheden: per twee spelers extra een paar erbij (9 of 10 spelers: vier paar). Zelf te kiezen, hooguit vier vakken.
   - Variant "spel stopt": opnieuw verdelen begint bij de verliezer. */
(function(){
  "use strict";
  var A=App, esc=A.esc;
  var COL=["#e7b84f","#8fd19e","#9ec3ff","#f0a08f"], TICKS=7, HOLD=1200, SIP=1500;
  var CSS=[
    ".snelmexx-pair{padding:10px 10px 8px;margin:10px 0;border-left:6px solid var(--gold);-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:manipulation}",
    ".snelmexx-lock{box-shadow:inset 0 0 0 2px var(--red),0 10px 30px rgba(0,0,0,.35)}",
    ".snelmexx-flash{animation:snelmexx-flash .9s ease-out}",
    "@keyframes snelmexx-flash{0%{filter:brightness(2.4)}100%{filter:none}}",
    ".snelmexx-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px}",
    ".snelmexx-head b{font-size:20px;font-weight:900;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".snelmexx-head span{flex:0 0 auto;font-size:12px;color:var(--ivory-dim)}",
    ".snelmexx-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:8px}",
    ".snelmexx-dbox{display:contents}",
    ".snelmexx-row .dice{order:1;flex:0 0 auto;margin:0;gap:8px}",
    ".snelmexx-row .die{width:54px;height:54px;padding:7px;border-radius:11px;touch-action:manipulation}",
    ".snelmexx-row .die.blank{font-size:26px}",
    ".snelmexx-row .pip{width:9px;height:9px}",
    ".snelmexx-row .picker{order:3;flex:0 0 100%;gap:6px;margin:2px 0 0}",
    ".snelmexx-row .picker .pip{width:8px;height:8px}",
    ".snelmexx-act{order:2;flex:1 1 0;min-width:0;display:flex;gap:8px}",
    ".snelmexx-act button{flex:1 1 0;min-width:0;min-height:58px;margin:0;padding:8px 6px;font-size:20px;line-height:1.1;border-radius:14px;touch-action:manipulation}",
    ".snelmexx-note{min-height:36px;margin-top:8px;font-size:13px;line-height:1.35;color:var(--ivory-dim)}",
    ".snelmexx-note b{color:var(--ivory)}",
    ".snelmexx-note .dsmall{width:22px;height:22px;padding:3px;border-radius:5px}",
    ".snelmexx-note .dsmall .pip{width:4px;height:4px}",
    ".snelmexx-info{margin-top:12px}",
    ".snelmexx-dot{display:inline-block;width:12px;height:12px;border-radius:50%;margin:0 2px;vertical-align:middle}",
    ".snelmexx-lbl{font-size:12px;color:var(--ivory-dim);align-self:center}",
    ".snelmexx-box .seg button{min-height:40px}",
    ".snelmexx-box .btnrow .btn{min-height:42px}"
  ].join("");
  function css(){ if(document.getElementById("snelmexx-css")) return; var s=document.createElement("style"); s.id="snelmexx-css"; s.textContent=CSS; document.head.appendChild(s); }

  A.register({ id:"snelmexx", title:"Snelmexx", level:"app", beta:true, sub:"Elk paar stenen een eigen vak: gooien tot Mexx, 31 en inhalen bijgehouden",
    init:function(root){
      css();
      var G=A.gs("snelmexx"), box=document.createElement("div"), busy={}, gen=0, dead=false, timers=[], ivs=[], lastN=A.S.players.length, PE=!!window.PointerEvent;
      box.className="snelmexx-box"; root.appendChild(box);
      if(G.mode!=="echt") G.mode="dig";
      if(G.pen!==1) G.pen=0.5;
      G.phase=G.phase||"setup"; G.pairs=G.pairs||[]; G.wait=G.wait||{}; G.cnt=G.cnt||{}; G.log=G.log||[];
      if(G.phase!=="setup"&&(G.n!==lastN||!G.pairs.length)){ G.phase="setup"; G.pairs=[]; G.wait={}; }

      function N(){ return A.S.players.length; }
      /* bijbel: 4 tot 6 spelers twee paar, 7 of 8 drie paar, "etc." */
      function autoPairs(n){ return Math.max(2,Math.floor((n-1)/2)); }
      function maxPairs(n){ return Math.max(2,Math.min(COL.length,n-1)); }
      function nPairs(){ var n=N(); return Math.max(2,Math.min(G.np||autoPairs(n),maxPairs(n))); }
      function later(fn,ms){ timers.push(setTimeout(function(){ if(!dead) fn(); },ms)); }
      function pairsOf(i){ return G.pairs.filter(function(P){ return P.holder===i; }); }
      function holders(){ var hs=[], i; for(i=0;i<N();i++) if(pairsOf(i).length) hs.push(i); return hs; }
      function waiting(i){ return !!(G.wait[i]&&G.wait[i].why&&G.wait[i].why.length); }
      function addWait(i,why){ var w=G.wait[i]||(G.wait[i]={why:[]}); w.why.push(why); w.t=Date.now(); later(function(){ renderPairs(i); },SIP+40); }
      function addLog(t){ G.log.unshift(t); if(G.log.length>8) G.log.length=8; }
      function bump(i,key){ var c=G.cnt[i]||(G.cnt[i]={m:0,e:0,i:0}); c[key]++; }
      function penTxt(){ return G.pen===1?"een adtje":"een half adtje"; }
      function toSetup(msg){ G.phase="setup"; G.pairs=[]; G.wait={}; G.msg=msg||""; gen++; busy={}; A.save(); render(); }

      /* regel 2: de paren ongeveer gelijk over de tafel verdeeld (7 spelers, 3 paar: A, C en E) */
      function deal(start,keepHist){
        var n=N(), p=nPairs(), old=G.pairs||[], k;
        start=start%n; G.n=n; G.pairs=[];
        for(k=0;k<p;k++) G.pairs.push({holder:(start+Math.floor(k*n/p))%n, vals:null, kept:[false,false], keepUsed:false, rolls:0, note:"", free:0, kruk:(keepHist&&old[k]&&old[k].kruk)||[]});
        G.wait={}; G.msg=""; G.phase="klaar"; gen++; busy={};
        if(!keepHist){ G.cnt={}; G.log=[]; }
        A.S.active=start; A.save(); A.renderPlayers(); render();
      }

      /* een 1 of 2 mag één keer blijven liggen; variant: bij 31 niets laten liggen */
      function canKeep(P,d){
        if(!P.vals||P.keepUsed) return false;
        var v=P.vals[d], o=P.vals[1-d];
        if(v!==1&&v!==2) return false;
        if(G.strikt&&v===1&&o===3) return false;
        return true;
      }
      function toggleKeep(k,d){
        var P=G.pairs[k]; if(!P||G.phase!=="spel"||G.mode!=="dig"||busy[k]||waiting(P.holder)||!canKeep(P,d)) return;
        var on=!P.kept[d]; P.kept=[false,false]; P.kept[d]=on; A.play("tick"); A.save(); renderPair(k);
      }

      /* digitale worp van één paar; meerdere paren rollen tegelijk */
      function paint(k){
        var b=busy[k], d, e; if(!b) return;
        for(d=0;d<2;d++){ e=box.querySelector('[data-die="'+k+':'+d+'"]'); if(e){ e.className="die"+(b.kept[d]?" kept":" rolling"); e.innerHTML=A.pips(b.f[d]); } }
      }
      function roll(k){
        var P=G.pairs[k]; if(!P||G.phase!=="spel"||G.mode!=="dig"||busy[k]||waiting(P.holder)||Date.now()<(P.free||0)) return;
        var my=gen, kept=[!!(P.kept[0]&&P.vals), !!(P.kept[1]&&P.vals)], cnt=0, b;
        b=busy[k]={f:[kept[0]?P.vals[0]:A.rnd(6), kept[1]?P.vals[1]:A.rnd(6)], kept:kept};
        A.play("clack",0.5); renderPair(k);
        var iv=setInterval(function(){
          if(dead||my!==gen){ clearInterval(iv); return; }
          for(var d=0;d<2;d++) if(!kept[d]) b.f[d]=A.rnd(6);
          if(++cnt<TICKS){ paint(k); return; }
          clearInterval(iv); delete busy[k];
          if(G.phase!=="spel"||G.pairs[k]!==P){ renderPair(k); return; }
          if(kept[0]||kept[1]) P.keepUsed=true;
          P.kept=[false,false]; A.play("clack",0.9);
          handle(k,b.f.slice(),false);
        },60);
        ivs.push(iv);
      }
      /* echte stenen: Mexx en 31 met één tik melden. De app ziet dan niet elke worp, dus de kruk-telling van dit paar begint opnieuw;
         wie adtje kruk wil laten tellen voert elke worp in door op de stenen te tikken. */
      function quick(k,what){
        var P=G.pairs[k]; if(!P||G.phase!=="spel"||G.mode!=="echt"||busy[k]||waiting(P.holder)||Date.now()<(P.free||0)) return;
        handle(k,what==="m"?[1,2]:[1,3],true);
      }

      function handle(k,v,quickTap){
        var P=G.pairs[k]; if(!P||G.phase!=="spel") return;
        if(N()!==G.n){ toSetup("Het aantal spelers is veranderd. Verdeel de stenen opnieuw."); return; }
        var i=P.holder, hi=Math.max(v[0],v[1]), lo=Math.min(v[0],v[1]), kr=false;
        /* een worp die al onderweg was toen iemand anders 31 gooide telt gewoon: de stenen waren al los */
        P.vals=v; P.rolls++; P.note="";
        /* adtje kruk bij elke worp van twee stenen; de telling hoort bij dit paar, dus de eigen reeks van het paar gaat in en uit de kern */
        if(quickTap) P.kruk=[]; else { G._kruk=P.kruk||[]; kr=A.kruk("snelmexx",v,i); P.kruk=G._kruk||[]; G._kruk=[]; }
        if(kr) addLog("Adtje kruk: "+A.name(i)+" gooit voor de derde keer op rij "+v[0]+" en "+v[1]+" en trekt een adtje.");
        if(A.S.active!==i){ A.S.active=i; A.renderPlayers(); }
        if(hi===2&&lo===1) mexx(k,kr);
        else if(hi===3&&lo===1) een31(k,kr);
        else {
          /* Mexx-variant: wie dubbel gooit neemt zelf één slok */
          if(v[0]===v[1]&&G.dubbel){ A.drink(i,1); P.note="Dubbel: "+A.name(i)+" neemt zelf één slok."; addLog(A.name(i)+" gooit dubbel "+v[0]+" en neemt zelf één slok."); }
          renderPair(k); renderInfo();
        }
        A.save();
      }

      /* regel 3: pas na Mexx gaan de stenen met de klok mee door. Regel 5: heeft de volgende zelf nog stenen, dan is die ingehaald. */
      function mexx(k,kr){
        var P=G.pairs[k], i=P.holder, nx=(i+1)%N(), had=pairsOf(nx).length>0, r=P.rolls, cntTxt=G.mode==="dig"?" in "+r+(r===1?" worp":" worpen"):"";
        bump(i,"m");
        P.holder=nx; P.vals=null; P.kept=[false,false]; P.keepUsed=false; P.rolls=0; P.free=Date.now()+HOLD; P.flash=1;
        P.note="Mexx van "+A.name(i)+cntTxt+". De stenen zijn nu van "+A.name(nx)+".";
        addLog(A.name(i)+" gooit Mexx"+cntTxt+": stenen naar "+A.name(nx)+".");
        later(function(){ renderPair(k); },HOLD+40);
        if(!pairsOf(i).length) delete G.wait[i]; /* geen stenen meer: er valt niets meer te wachten (de slok is al geteld) */
        if(!had){ A.play("win"); renderPair(k); renderInfo(); return; }
        bump(nx,"i");
        if(G.stop){
          /* variërende regel: het spel stopt, de verliezer trekt een (half) adtje, daarna opnieuw verdelen */
          G.phase="stop"; G.loser=nx; G.by=i; G.stopT=Date.now(); A.atje(nx,G.pen); A.play("dood");
          addLog(A.name(nx)+" is ingehaald door "+A.name(i)+" en trekt "+penTxt()+". Het spel stopt.");
          A.overlay("dood","Ingehaald!",[A.name(nx)+" trekt "+penTxt()+".","Daarna worden de stenen opnieuw verdeeld."],2600);
          render(); later(render,HOLD+40); return;
        }
        A.atje(nx,0.5); addWait(nx,"een half adtje (ingehaald door "+A.name(i)+")"); A.play("dood");
        addLog(A.name(nx)+" is ingehaald door "+A.name(i)+": half adtje, daarna pas verder gooien.");
        if(!kr) A.toast("Ingehaald!",A.name(nx)+" trekt een half adtje en gooit daarna pas verder. Het spel gaat door.",5000);
        renderPairs(nx); renderInfo();
      }
      /* regel 4: bij 31 neemt iedereen die een paar heeft (ook de gooier) eerst één slok */
      function een31(k,kr){
        var P=G.pairs[k], i=P.holder, hs=holders(), meer=hs.length>1;
        bump(i,"e"); P.note="Eénendertig gegooid.";
        hs.forEach(function(j){ A.drink(j,1); addWait(j,"één slok (31 van "+A.name(i)+")"); });
        addLog(A.name(i)+" gooit 31: "+A.joinNames(hs)+(meer?" nemen elk":" neemt")+" één slok.");
        A.play("ding");
        if(!kr) A.toast("Eénendertig!",A.joinNames(hs)+(meer?" nemen elk":" neemt")+" één slok en "+(meer?"gooien":"gooit")+" daarna pas verder.",5000);
        renderPairs(); renderInfo();
      }
      function ok(i){
        var w=G.wait[i]; if(!w||Date.now()<(w.t||0)+SIP) return;
        delete G.wait[i]; A.play("tick"); A.save(); renderPairs(i);
      }

      /* ---- tekenen ---- */
      function pairHtml(k,P,w,live){
        var i=P.holder, now=Date.now(), b=busy[k], transit=now<(P.free||0), dis=(!live||transit)?" disabled":"", h, d, v, kp, note, c0, c1;
        h='<div class="snelmexx-head"><b>'+esc(A.name(i))+'</b><span>paar '+(k+1)+(G.mode==="dig"&&P.rolls?" · worp "+P.rolls:"")+'</span></div><div class="snelmexx-row">';
        if(G.mode==="echt"){
          h+='<div class="snelmexx-dbox"><div class="dice"><span class="die blank">?</span><span class="die blank">?</span></div></div>';
        } else {
          h+='<div class="dice">';
          for(d=0;d<2;d++){ v=b?b.f[d]:(P.vals?P.vals[d]:null); kp=b?b.kept[d]:(P.kept[d]&&!!P.vals);
            h+='<button class="die'+(v?"":" blank")+(kp?" kept":b?" rolling":"")+'" data-die="'+k+":"+d+'" aria-label="Dobbelsteen '+(d+1)+(v?": "+v:"")+'">'+(v?A.pips(v):"?")+'</button>'; }
          h+='</div>';
        }
        h+='<div class="snelmexx-act">';
        if(w) h+='<button class="btn gold" data-ok="'+i+'"'+(now<(w.t||0)+SIP?" disabled":"")+'>Gedronken</button>';
        else if(G.mode==="echt") h+='<button class="btn" data-q="'+k+':e"'+dis+'>31</button><button class="btn gold" data-q="'+k+':m"'+dis+'>Mexx</button>';
        else h+='<button class="roll" data-roll="'+k+'"'+dis+'>Dobbel</button>';
        h+='</div></div>';
        if(w) note='<b>'+esc(A.name(i)+" drinkt eerst "+w.why.join(" en ")+".")+'</b> Daarna op Gedronken tikken en verder gooien.';
        else {
          note=esc(P.note||"");
          if(G.mode==="echt"&&live&&P.vals) note="Vorige worp "+A.dicerowSmall(P.vals)+" "+note;
          if(G.mode==="dig"&&live&&P.vals&&!b){
            c0=canKeep(P,0); c1=canKeep(P,1);
            if(P.kept[0]||P.kept[1]) note+=" De "+P.vals[P.kept[0]?0:1]+" blijft één worp liggen (tik nog eens om hem toch mee te gooien).";
            else if(c0||c1) note+=" Tik op "+(c0&&c1?"een ":"de ")+P.vals[c0?0:1]+" om hem één keer te laten liggen.";
          }
        }
        return h+'<div class="snelmexx-note">'+note+'</div>';
      }
      function renderPair(k){
        var e=box.querySelector("#snelmexx-p"+k), P=G.pairs[k]; if(!e||!P) return;
        var w=waiting(P.holder)?G.wait[P.holder]:null, live=G.phase==="spel";
        e.className="board snelmexx-pair"+(w?" snelmexx-lock":"")+(P.flash?" snelmexx-flash":""); delete P.flash;
        e.style.borderLeftColor=COL[k%COL.length];
        e.innerHTML=pairHtml(k,P,w,live);
        /* echte stenen: beide stenen invoeren telt als één worp, daarna is het vak weer leeg voor de volgende */
        if(G.mode==="echt"&&live&&!w) A.Dice(e.querySelector(".snelmexx-dbox"),{n:2,noRoll:true,onRoll:function(v){ handle(k,v,false); }});
      }
      function renderPairs(who){ G.pairs.forEach(function(P,k){ if(who===undefined||P.holder===who) renderPair(k); }); }
      function renderInfo(){
        var e=box.querySelector("#snelmexx-info"); if(!e) return;
        var h='<div class="board"><table class="score"><tr><th>speler</th><th>stenen</th><th>Mexx</th><th>31</th><th>ingehaald</th></tr>';
        A.S.players.forEach(function(q,i){
          var c=G.cnt[i]||{m:0,e:0,i:0}, dots="";
          G.pairs.forEach(function(P,k){ if(P.holder===i) dots+='<i class="snelmexx-dot" style="background:'+COL[k%COL.length]+'"></i>'; });
          h+='<tr'+(dots?' class="cur"':'')+'><td>'+esc(q.name)+'</td><td>'+dots+'</td><td>'+c.m+'</td><td>'+c.e+'</td><td>'+c.i+'</td></tr>';
        });
        h+='</table></div>';
        if(G.log.length) h+='<div class="log">'+G.log.map(function(t){ return '<div>'+esc(t)+'</div>'; }).join("")+'</div>';
        e.innerHTML=h;
      }
      function seg(lbl,items){ return '<div class="seg"><span class="snelmexx-lbl">'+lbl+'</span>'+items.map(function(x){ return '<button data-set="'+x[0]+'" aria-pressed="'+!!x[2]+'">'+esc(x[1])+'</button>'; }).join("")+'</div>'; }
      function modeSeg(){ return seg("stenen:",[["mode:dig","digitaal",G.mode==="dig"],["mode:echt","echte stenen",G.mode==="echt"]]); }
      function render(){
        var n=N(), h="", k, p, cur, hs, opts=[];
        lastN=n;
        if(G.phase==="setup"){
          h='<div class="board"><p class="hint">Leg de telefoon midden op tafel. Elk paar dobbelstenen krijgt een eigen vak met de naam van wie de stenen heeft. Gooi zo snel mogelijk Mexx (1 en 2): pas dan gaan je stenen met de klok mee door. Bij 31 neemt iedereen met stenen eerst één slok. Krijg je stenen terwijl je er zelf nog hebt, dan ben je ingehaald: half adtje.</p></div>';
          if(n<3) h+='<p class="hint">Snelmexx heeft minstens drie spelers nodig; de bijbel rekent met vier of meer (twee paar dobbelstenen). Voeg spelers toe met + speler.</p>';
          else {
            if(G.msg) h+='<p class="hint">'+esc(G.msg)+'</p>';
            if(n===3) h+='<p class="hint">De bijbel rekent met vier of meer spelers; met drie spelers en twee paar gaat het ook.</p>';
            cur=nPairs();
            for(p=2;p<=maxPairs(n);p++) opts.push(["np:"+p,p+" paar"+(p===autoPairs(n)?" (bijbel)":""),p===cur]);
            h+=seg("paren:",opts)+modeSeg();
            h+=seg("ingehaald:",[["stop:0","spel gaat door",!G.stop],["stop:1","spel stopt",!!G.stop]]);
            if(G.stop) h+=seg("verliezer trekt:",[["pen:0.5","half adtje",G.pen!==1],["pen:1","heel adtje",G.pen===1]]);
            h+=seg("afspraken:",[["strikt:t","bij 31 niets laten liggen",!!G.strikt],["dubbel:t","dubbel: zelf een slok",!!G.dubbel]]);
            h+='<div class="btnrow"><button class="btn gold" id="snelmexx-deal">Verdeel de stenen</button></div>';
          }
          box.innerHTML=h; wire(); return;
        }
        if(G.phase==="stop"){
          h='<div class="verdict fout"><h2>Ingehaald!</h2><p><b>'+esc(A.name(G.loser))+'</b> is ingehaald door '+esc(A.name(G.by))+' en trekt '+penTxt()+'. Daarna worden de stenen weer gelijk verdeeld.</p><div class="btnrow"><button class="btn gold" id="snelmexx-deal"'+(Date.now()<(G.stopT||0)+HOLD?" disabled":"")+'>Verdeel de stenen opnieuw</button></div></div>';
        } else {
          if(G.phase==="klaar"){ hs=holders();
            h='<div class="verdict neutral"><h2>Klaar?</h2><p><b>'+esc(A.joinNames(hs))+'</b> '+(hs.length>1?"hebben":"heeft")+' de stenen. Gooi zo snel mogelijk Mexx en geef dan pas door.</p><div class="btnrow"><button class="btn gold" id="snelmexx-go">Start!</button></div></div>'; }
          for(k=0;k<G.pairs.length;k++) h+='<div id="snelmexx-p'+k+'"></div>';
        }
        h+='<div class="snelmexx-info" id="snelmexx-info"></div>'+modeSeg();
        if(G.mode==="echt") h+='<p class="hint">Echte stenen: tik Mexx of 31 in het vak van je paar. Wil je adtje kruk laten tellen, voer dan elke worp in door op de stenen te tikken.</p>';
        h+='<div class="btnrow"><button class="btn" id="snelmexx-new">Nieuw spel</button></div>';
        box.innerHTML=h; renderPairs(); renderInfo(); wire();
      }
      function wire(){
        var b;
        Array.prototype.forEach.call(box.querySelectorAll("[data-set]"),function(x){ x.onclick=function(){
          var s=x.getAttribute("data-set").split(":");
          if(s[0]==="np") G.np=+s[1]; else if(s[0]==="mode") G.mode=s[1]; else if(s[0]==="stop") G.stop=s[1]==="1"; else if(s[0]==="pen") G.pen=+s[1]; else G[s[0]]=!G[s[0]];
          A.save(); render();
        }; });
        if((b=box.querySelector("#snelmexx-deal"))) b.onclick=function(){ if(N()<3){ render(); return; } if(G.phase==="stop") deal(G.loser||0,true); else deal(A.S.active,false); };
        if((b=box.querySelector("#snelmexx-go"))) b.onclick=function(){ G.phase="spel"; G.pairs.forEach(function(P){ P.free=0; }); A.save(); render(); };
        if((b=box.querySelector("#snelmexx-new"))) b.onclick=function(){ toSetup(""); };
      }

      /* Vakken luisteren naar pointerdown: meerdere vingers tegelijk werken dan allemaal (een click komt bij tegelijk tikken niet altijd door).
         De click erna doet niets, behalve vanaf het toetsenbord (detail 0). */
      function act(e){
        var t=e.target, b, s;
        if(!t||!t.closest||(e.type==="pointerdown"&&e.button>0)) return;
        if((b=t.closest("[data-roll]"))) roll(+b.getAttribute("data-roll"));
        else if((b=t.closest("[data-die]"))){ s=b.getAttribute("data-die").split(":"); toggleKeep(+s[0],+s[1]); }
        else if((b=t.closest("[data-ok]"))) ok(+b.getAttribute("data-ok"));
        else if((b=t.closest("[data-q]"))){ s=b.getAttribute("data-q").split(":"); quick(+s[0],s[1]); }
      }
      box.addEventListener(PE?"pointerdown":"click",act);
      if(PE) box.addEventListener("click",function(e){ if(e.detail===0) act(e); });

      /* spelers erbij of eraf: de verdeling klopt dan niet meer */
      ivs.push(setInterval(function(){
        if(dead||N()===lastN) return;
        if(G.phase==="setup") render(); else toSetup("Het aantal spelers is veranderd. Verdeel de stenen opnieuw.");
      },800));

      render();
      this.refresh=render;
      this.destroy=function(){ dead=true; ivs.forEach(function(x){ clearInterval(x); }); timers.forEach(function(x){ clearTimeout(x); }); };
    }
  });
})();
