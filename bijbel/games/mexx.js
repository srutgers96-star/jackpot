/* ===== Mexx (met PowerMexx en Inverse Mexx) =====
   Eén telefoon gaat rond: de app gooit (of je voert je echte worp in door op de stenen te tikken), telt de worpen,
   houdt bij wie laag staat en boekt de slokken.
   Keuzes waar de bijbel niets over zegt:
   - De verliezer zet de volgende ronde op.
   - "Mag in principe driemaal gooien": eerder laten staan mag; de laatste worp is je score.
   - Een steen laten liggen kan één keer per beurt, voor één worp, met één steen (een 1 of een 2).
   - 31 telt niet als worp. Lag de 1 al vast, dan blijft hij liggen voor de nieuwe worp. Na een 31 met twee stenen mag je
     de 1 nog laten liggen als je dat deze beurt nog niet deed (afspraak "bij 31 niets laten liggen" zet dat uit).
   - Afspraak "32 staat altijd vast": wie 32 gooit is meteen klaar met 32.
   - Extra ronde bij gelijk laag: de eerste van de gelijke spelers kiest Mexx of Ogen (zoals Speler D in het voorbeeld).
     Bij Mexx telt een 31 daar ook niet (slok uitdelen, opnieuw); bij Ogen is 31 gewoon vier ogen. Een Mexx in de extra
     ronde telt wel mee voor het aantal Mexxen (besluit Stijn), ook bij Ogen: 1 en 2 is dan drie ogen en een Mexx.
     Nog steeds gelijk: de gelijke spelers gooien nog een extra ronde.
   - Een half adtje per Mexx wordt als half adtje geboekt (niet als slokken).
   - PowerMexx: 3 3 telt als twee Mexx (ook in de extra ronde) en is de hoogste worp (boven Mexx). De rest (31, vast,
     extra ronde) loopt als bij Mexx.
   - Inverse Mexx: laagste steen is het tiental, dubbel telt niet als honderdtal, Mexx blijft de beste worp, de hoogste score
     verliest en staat "vast". Bij Ogen in de extra ronde verliest dan ook wie de meeste ogen gooit. Laten liggen blijft mogen. */
(function(){
  "use strict";
  var A=App, esc=A.esc;
  var CSS=[
    ".mexx-box .seg button{min-height:40px}",
    ".mexx-box .btn{min-height:44px}",
    ".mexx-box .opt{min-height:56px}",
    ".mexx-lbl{font-size:12px;color:var(--ivory-dim);align-self:center}",
    ".mexx-info{margin:0 2px 10px;font-size:12px;line-height:1.4;color:var(--ivory-dim);text-align:center}",
    ".mexx-note{margin:10px 2px 0;font-size:14px;line-height:1.35;text-align:center;color:var(--ivory)}",
    ".mexx-tag{font-size:11px;font-weight:500;color:var(--ivory-dim);white-space:nowrap}",
    ".mexx-static .die{cursor:default}",
    ".mexx-tie{margin:0 0 6px;font-size:14px;line-height:2.2;text-align:center;color:var(--ivory-dim)}",
    ".mexx-tie b{color:var(--ivory)}",
    ".mexx-set{margin-top:14px}",
    ".mexx-box table.score td{word-break:break-word}"
  ].join("");
  function css(){ if(document.getElementById("mexx-css")) return; var s=document.createElement("style"); s.id="mexx-css"; s.textContent=CSS; document.head.appendChild(s); }

  function pip(x){ return x===1||x===2||x===3||x===4||x===5||x===6; }
  function isMexx(a,b){ return a+b===3; }
  function is31(a,b){ return a+b===4&&a!==b; }
  function is32(a,b){ return a+b===5&&(a===2||a===3); }
  /* v = "normaal" | "power" | "inverse" */
  function score(a,b,v){
    var hi=Math.max(a,b), lo=Math.min(a,b);
    if(hi===2&&lo===1) return v==="inverse"?0:1000;
    if(v==="power"&&hi===3&&lo===3) return 2000;
    if(v==="inverse") return lo*10+hi;
    return a===b?a*100:hi*10+lo;
  }
  function better(x,y,v){ return v==="inverse"?x<y:x>y; }
  function label(a,b,v){ if(isMexx(a,b)) return "Mexx"; if(v==="power"&&a===3&&b===3) return "PowerMexx"; return String(score(a,b,v)); }

  /* Kans om met optimaal spel NIET op of onder de vaste (laagste) score L te eindigen.
     k = worpen die nog tellen, keep = mag nog een 1 of 2 laten liggen, h = steen die nu vast ligt (0 = geen). */
  var memo={};
  function chance(L,k,keep,h,inv,strict,o32){
    var key=[L,k,keep?1:0,h,inv?1:0,strict?1:0,o32?1:0].join("|"), v=inv?"inverse":"normaal", S=0, a, b, x, y, res;
    if(memo.hasOwnProperty(key)) return memo[key];
    function val(p,q,kp){
      var s, good, r;
      if(isMexx(p,q)) return 1;
      s=score(p,q,v); if(s===L) return 0; /* gelijk aan laag: beurt voorbij, samen laag */
      good=better(s,L,v)?1:0;
      if(k<=1||(o32&&is32(p,q))) return good;
      r=Math.max(good,chance(L,k-1,kp,0,inv,strict,o32));
      if(kp){ if(p<=2) r=Math.max(r,chance(L,k-1,false,p,inv,strict,o32)); if(q<=2) r=Math.max(r,chance(L,k-1,false,q,inv,strict,o32)); }
      return r;
    }
    if(h){
      for(b=1;b<=6;b++) if(!is31(h,b)) S+=val(h,b,false);
      /* 31 met de 1 vast: telt niet, zelfde worp opnieuw (of beide stenen als bij 31 niets mag blijven liggen) */
      res=h===1?(strict?(S+chance(L,k,false,0,inv,strict,o32))/6:S/5):S/6;
    } else {
      for(a=1;a<=6;a++) for(b=1;b<=6;b++) if(!is31(a,b)) S+=val(a,b,keep);
      x=S/34; y=(keep&&!strict)?chance(L,k,false,1,inv,strict,o32):-1; /* na 31: beide opnieuw (x) of de 1 laten liggen (y) */
      res=x>=y?x:(S+2*y)/36;
    }
    return (memo[key]=res);
  }

  A.register({ id:"mexx", beta:true, title:"Mexx", level:"app", kans:true, sub:"Worpen, wie staat vast, 31 uitdelen, Mexx-telling, extra ronde, kansen",
    init:function(root){
      css();
      var G=A.gs("mexx"), box=document.createElement("div"), dead=false, gen=0, lockUntil=0, R=null;
      box.className="mexx-box"; root.appendChild(box);

      /* bewaarde stand opschonen (ook die van een oudere versie) */
      if(G.variant!=="power"&&G.variant!=="inverse") G.variant="normaal";
      if(G.straf!==2&&G.straf!==3&&G.straf!=="half") G.straf=G.mexxStraf===3?3:G.mexxStraf===4?"half":2;
      delete G.mexxStraf;
      G.opt32=!!G.opt32; G.strikt=!!G.strikt; G.dubbel=!!G.dubbel;
      G.log=Array.isArray(G.log)?G.log.filter(function(x){ return typeof x==="string"; }).slice(0,8):[];

      function N(){ return A.S.players.length; }
      function V(){ return G.variant; }
      function power(){ return G.variant==="power"; }
      function inv(){ return G.variant==="inverse"; }
      function lowWord(){ return inv()?"hoog":"laag"; }
      function lowest(){ return inv()?"hoogste":"laagste"; }
      function okIdx(i,n){ return typeof i==="number"&&i===Math.floor(i)&&i>=0&&i<n; }
      function addLog(t){ G.log.unshift(t); if(G.log.length>8) G.log.length=8; }
      function lock(ms){ lockUntil=Date.now()+ms; }
      function worpen(n){ return n+(n===1?" worp":" worpen"); }
      function halfTxt(c){ return c===1?"een half adtje":c===2?"een heel adtje":c===3?"anderhalf adtje":(Math.floor(c/2)+(c%2?"½":""))+" adtjes"; }
      /* regel 4: geen Mexx = één slok; per Mexx twee slokken, drie slokken of een half adtje */
      function strafTxt(m){ if(!m) return "1 slok"; if(G.straf==="half") return halfTxt(m); return (m*G.straf)+" slokken"; }
      function book(i,m){ if(!m) A.drink(i,1); else if(G.straf==="half") A.atje(i,0.5*m); else A.drink(i,m*G.straf); }
      function freshTurn(){ return {throws:0, rolls:0, a:0, b:0, is31:false, keepUsed:false, held:-1, hv:0, st:"roll"}; }

      function validRound(r){
        var n=N(), k, t, T, i;
        if(!r||typeof r!=="object"||r.v!==G.variant||r.n!==n||!okIdx(r.start,n)||!okIdx(r.cur,n)) return false;
        if(r.max!==1&&r.max!==2&&r.max!==3) return false;
        if(typeof r.mexx!=="number"||!(r.mexx>=0)) return false;
        if(!r.turns||typeof r.turns!=="object"||Array.isArray(r.turns)) return false;
        for(k in r.turns){ t=r.turns[k]; if(!okIdx(+k,n)||!t||!pip(t.a)||!pip(t.b)) return false; }
        if(r.phase==="play"){
          t=r.t; if(!t||typeof t!=="object"||r.turns[r.cur]) return false;
          if(t.st!=="roll"&&t.st!=="decide"&&t.st!=="deal") return false;
          if(t.st!=="roll"&&(!pip(t.a)||!pip(t.b))) return false;
          if(t.held!==-1&&t.held!==0&&t.held!==1) return false;
          if(t.held>=0&&t.hv!==1&&t.hv!==2) return false;
          if(typeof t.throws!=="number"||!(t.throws>=0)||t.throws>=r.max) return false;
          return true;
        }
        if(r.phase==="tiepick"||r.phase==="tie"){
          T=r.tie; if(!T||!Array.isArray(T.p)||T.p.length<2||!T.rolls||typeof T.rolls!=="object") return false;
          for(i=0;i<T.p.length;i++) if(!okIdx(T.p[i],n)) return false;
          for(i=0;i<n;i++) if(!r.turns[i]) return false;
          for(k in T.rolls){ t=T.rolls[k]; if(!t||!pip(t.a)||!pip(t.b)) return false; }
          if(r.phase==="tie"){
            if(T.mode!=="mexx"&&T.mode!=="ogen") return false;
            if(!okIdx(T.k,T.p.length)) return false;
            if(T.st!=="roll"&&T.st!=="deal") return false;
            if(T.st==="deal"&&(!pip(T.a)||!pip(T.b))) return false;
          }
          return true;
        }
        if(r.phase==="done") return okIdx(r.loser,n)&&typeof r.res==="string";
        return false;
      }

      function newRound(start,msg){
        var n=N(); if(!okIdx(start,n)) start=0;
        R=G.r={v:G.variant, n:n, start:start, cur:start, turns:{}, max:power()?1:3, mexx:0, phase:"play", t:freshTurn(), tie:null, loser:-1, res:"", res2:"", note:msg||""};
        A.save(); render();
      }
      function fresh(){ return !!R&&R.phase==="play"&&R.cur===R.start&&!Object.keys(R.turns).length&&R.t.rolls===0; }
      /* wie moet er nu iets doen */
      function actor(){
        if(R.phase==="play") return R.cur;
        if(R.phase==="tiepick") return R.tie.p[0];
        if(R.phase==="tie") return R.tie.p[R.tie.k];
        return R.loser;
      }
      function sync(){ var i=actor(); if(okIdx(i,N())&&A.S.active!==i){ A.S.active=i; A.save(); A.renderPlayers(); } }
      /* de slechtste score tot nu toe: die staat vast */
      function worst(){
        var w=null, i, tr, s;
        for(i=0;i<R.n;i++){ tr=R.turns[i]; if(!tr) continue; s=score(tr.a,tr.b,V()); if(w===null||better(w,s,V())) w=s; }
        return w;
      }
      function worstLabel(w){ var i, tr; for(i=0;i<R.n;i++){ tr=R.turns[i]; if(tr&&score(tr.a,tr.b,V())===w) return label(tr.a,tr.b,V()); } return ""; }

      /* ---- worpen ---- */
      function rolled(v){
        if(!R||!v||v.length!==2) return;
        if(R.phase==="play"&&R.t.st==="roll") turnRoll(v[0],v[1]);
        else if(R.phase==="tie"&&R.tie.st==="roll") tieRoll(v[0],v[1]);
      }
      /* adtje kruk: elke worp van de twee stenen telt, ook als er een steen bleef liggen; de kern boekt het adtje en meldt het */
      function kruk(a,b,i){
        var kr=A.kruk("mexx",[a,b],i);
        if(kr) addLog("Adtje kruk: "+A.name(i)+" gooit voor de derde keer op rij "+a+" en "+b+" en doet een adtje op de kruk.");
        return kr;
      }
      function dubbel(a,b,i,kr){
        if(a!==b||!G.dubbel) return "";
        A.drink(i,1); addLog(A.name(i)+" gooit dubbel "+a+" en neemt zelf 1 slok.");
        if(!kr) A.toast("Dubbel!",A.name(i)+" neemt zelf 1 slok.",3500);
        return " Dubbel: "+A.name(i)+" neemt zelf 1 slok.";
      }
      function turnRoll(a,b){
        var t=R.t, i=R.cur, nm=A.name(i), v=V(), kr, lbl, w, m, pm, note, lines;
        if(t.held===0) a=t.hv; else if(t.held===1) b=t.hv; /* de steen die bleef liggen verandert niet */
        if(!pip(a)||!pip(b)){ render(); return; }
        kr=kruk(a,b,i);
        t.rolls++; t.a=a; t.b=b;
        if(is31(a,b)){
          /* bijzondere regel 1: telt niet als worp, één slok uitdelen */
          t.is31=true; t.st="deal"; A.play("ding");
          R.note=nm+" gooit 31: telt niet als worp, wel één slok uitdelen.";
          A.save(); render(); return;
        }
        t.is31=false; t.held=-1; t.throws++;
        lbl=label(a,b,v);
        note=dubbel(a,b,i,kr);
        m=isMexx(a,b); pm=power()&&a===3&&b===3;
        if(m||pm){
          R.mexx+=pm?2:1;
          lines=[nm+(pm?" gooit 3 en 3: dat telt als twee Mexx.":" gooit Mexx in "+worpen(t.throws)+".")];
          /* bijzondere regel 4: zet de opzetter in minder dan drie worpen Mexx, dan krijgt de rest ook maar zoveel worpen */
          if(m&&i===R.start&&t.throws<R.max){ R.max=t.throws; lines.push("Opgezet in "+worpen(R.max)+": de rest mag ook maar "+R.max+" keer gooien."); }
          lines.push("De verliezer drinkt nu "+strafTxt(R.mexx)+".");
          R.note=lines.join(" ")+note; addLog(lines[0]+" De verliezer drinkt nu "+strafTxt(R.mexx)+".");
          A.play("win"); lock(1500); A.overlay("win",pm?"Power Mexx!":"Mexx!",lines,1800);
          endTurn(); return;
        }
        w=worst();
        if(w!==null&&score(a,b,v)===w){
          /* bijzondere regel 2: de laagste score staat vast */
          R.note=nm+" gooit ook "+lbl+": samen "+lowWord()+", beurt voorbij."+note;
          A.play("dood"); lock(1500); A.overlay("info","Vast!",[nm+" gooit ook "+lbl+".","Samen "+lowWord()+", de beurt is voorbij."],1800);
          endTurn(); return;
        }
        if(G.opt32&&is32(a,b)){
          R.note=nm+" gooit "+lbl+": dat staat altijd vast, beurt voorbij."+note;
          lock(1500); A.overlay("info","Vast!",[nm+" gooit 3 en 2.","Dat staat altijd vast, de beurt is voorbij."],1800);
          endTurn(); return;
        }
        if(t.throws>=R.max){ R.note=nm+" eindigt op "+lbl+"."+note; endTurn(); return; }
        R.note=note?note.slice(1):"";
        t.st="decide"; A.save(); render();
      }
      function endTurn(){
        var t=R.t, nxt=(R.cur+1)%R.n;
        R.turns[R.cur]={a:t.a, b:t.b, throws:t.throws};
        if(nxt===R.start){ finishRound(); return; }
        R.cur=nxt; R.t=freshTurn(); A.save(); render();
      }
      function finishRound(){
        var w=worst(), los=[], k, i, tr;
        for(k=0;k<R.n;k++){ i=(R.start+k)%R.n; tr=R.turns[i]; if(score(tr.a,tr.b,V())===w) los.push(i); }
        R.t=null;
        if(los.length===1){ settle(los[0],false); return; }
        /* regel 5: meerdere spelers laag: extra ronde */
        R.phase="tiepick"; R.tie={p:los, mode:"", rolls:{}, k:0, st:"roll", a:0, b:0, again:false};
        A.save(); render();
      }
      function settle(i,viaTie){
        var m=R.mexx, tr=R.turns[i], nm=A.name(i);
        book(i,m);
        R.res=nm+" verliest"+(viaTie?" de extra ronde":" met "+label(tr.a,tr.b,V()))+" en drinkt "+strafTxt(m)+".";
        R.res2=m?"Er is "+m+" keer Mexx gegooid.":"Geen Mexx gegooid, dus één slok.";
        addLog(R.res);
        R.phase="done"; R.loser=i; R.tie=null; R.t=null;
        A.play("dood"); A.overlay("dood",inv()?"Hoog!":"Laag!",[R.res,R.res2].concat(R.note?[R.note]:[]),0); A.onOverlayClose(null);
        A.save(); render();
      }
      function tieRoll(a,b){
        var T=R.tie, i=T.p[T.k], nm=A.name(i), og=T.mode==="ogen", kr, note, m, pm, lines;
        if(!pip(a)||!pip(b)){ render(); return; }
        kr=kruk(a,b,i);
        if(T.mode==="mexx"&&is31(a,b)){
          T.a=a; T.b=b; T.st="deal"; A.play("ding");
          R.note=nm+" gooit 31: telt niet als worp, wel één slok uitdelen.";
          A.save(); render(); return;
        }
        T.rolls[i]={a:a, b:b};
        note=dubbel(a,b,i,kr);
        lines=[nm+" gooit "+(og?(a+b)+" ogen":label(a,b,V()))+"."];
        m=isMexx(a,b); pm=power()&&a===3&&b===3;
        if(m||pm){
          /* besluit Stijn: een Mexx in de extra ronde telt mee voor de straf (3 3 bij PowerMexx als twee), ook bij Ogen */
          R.mexx+=pm?2:1;
          lines.push(pm?"3 en 3 telt ook in de extra ronde als twee Mexx.":(og?"1 en 2 is Mexx en telt":"Die telt")+" ook in de extra ronde mee voor de straf.");
          lines.push("De verliezer drinkt nu "+strafTxt(R.mexx)+".");
          addLog(lines.join(" "));
          A.play("win"); lock(1500); A.overlay("win",pm?"Power Mexx!":"Mexx!",lines,1800);
        }
        R.note=lines.join(" ")+note;
        T.k++;
        if(T.k>=T.p.length){ resolveTie(); return; }
        A.save(); render();
      }
      function tieVal(x,mode){ return mode==="ogen"?x.a+x.b:score(x.a,x.b,V()); }
      function resolveTie(){
        var T=R.tie, v=V(), w=null, los=[];
        function worse(s,x){ return T.mode==="ogen"?(inv()?s>x:s<x):better(x,s,v); }
        T.p.forEach(function(i){ var s=tieVal(T.rolls[i],T.mode); if(w===null||worse(s,w)) w=s; });
        T.p.forEach(function(i){ if(tieVal(T.rolls[i],T.mode)===w) los.push(i); });
        if(los.length===1){ settle(los[0],true); return; }
        R.note=A.joinNames(los)+" gooien weer gelijk: nog een extra ronde.";
        R.phase="tiepick"; R.tie={p:los, mode:"", rolls:{}, k:0, st:"roll", a:0, b:0, again:true};
        A.save(); render();
      }

      /* ---- knoppen ---- */
      function canKeepNow(){ var t=R.t; return !power()&&!t.keepUsed&&(t.is31?!G.strikt:t.throws<R.max); }
      function act(name,arg){
        var t, T, i, j, s, was;
        if(dead) return;
        if(name==="set"){ setOpt(String(arg||"")); return; }
        if(name==="new"){ if(!R){ render(); return; } newRound(R.phase==="done"?R.loser:R.start,""); return; }
        if(!R) return;
        if(name==="next"){ if(R.phase==="done") newRound(R.loser,""); return; }
        if(name==="tiemode"){
          if(R.phase!=="tiepick"||(arg!=="mexx"&&arg!=="ogen")) return;
          T=R.tie; T.mode=arg; T.rolls={}; T.k=0; T.st="roll"; R.phase="tie"; R.note="";
          A.save(); render(); return;
        }
        if(name==="deal"){
          j=+arg;
          if(R.phase==="play"&&R.t.st==="deal") i=R.cur; else if(R.phase==="tie"&&R.tie.st==="deal") i=R.tie.p[R.tie.k]; else return;
          if(!okIdx(j,R.n)||j===i) return;
          A.drink(j,1);
          s=A.name(i)+" deelt uit (31): "+A.name(j)+" drinkt 1 slok.";
          addLog(s); R.note=s; A.toast(A.name(j)+" drinkt 1 slok","Uitgedeeld door "+A.name(i)+" (31).",3500);
          if(R.phase==="tie") R.tie.st="roll";
          else {
            t=R.t;
            if(t.held>=0){ if(G.strikt) t.held=-1; t.st="roll"; }      /* de 1 lag al vast */
            else if(canKeepNow()) t.st="decide";                        /* beide opnieuw, of de 1 één keer laten liggen */
            else t.st="roll";
          }
          A.save(); render(); return;
        }
        if(R.phase!=="play"||R.t.st!=="decide") return;
        t=R.t;
        if(name==="stop"){
          if(t.is31) return;
          R.note=A.name(R.cur)+" laat "+label(t.a,t.b,V())+" staan."; endTurn(); return;
        }
        if(name==="again"){
          if(!t.is31&&t.throws>=R.max) return;
          t.st="roll"; t.held=-1; R.note=""; A.save(); render(); return;
        }
        if(name==="keep"){
          j=+arg; was=j===0?t.a:j===1?t.b:0;
          if((was!==1&&was!==2)||!canKeepNow()) return;
          t.keepUsed=true; t.held=j; t.hv=was; t.st="roll"; R.note="";
          A.save(); render(); return;
        }
      }
      function setOpt(a){
        var s=a.split(":"), key=s[0], val=s[1];
        if(key==="variant"){
          if(val!=="normaal"&&val!=="power"&&val!=="inverse") return;
          if(val===G.variant) return;
          var prog=!!R&&!fresh()&&R.phase!=="done", st=R?(R.phase==="done"?R.loser:R.start):A.S.active;
          G.variant=val; newRound(st,prog?"Andere variant gekozen: de ronde begint opnieuw.":""); return;
        }
        if(key==="straf"){ G.straf=val==="half"?"half":val==="3"?3:2; }
        else if(key==="opt32"||key==="strikt"||key==="dubbel"){ G[key]=!G[key]; }
        else return;
        A.save(); render();
      }
      /* tijdens een korte melding (Mexx!, Vast!) gaan tikken er niet doorheen naar de knoppen eronder */
      box.addEventListener("click",function(e){ if(Date.now()<lockUntil){ e.stopPropagation(); e.preventDefault(); } },true);
      box.addEventListener("click",function(e){
        var t=e.target, b=t&&t.closest?t.closest("[data-act]"):null;
        if(!b||b.disabled) return;
        act(b.getAttribute("data-act"),b.getAttribute("data-arg"));
      });

      /* ---- tekenen ---- */
      function staticDice(a,b,keptIdx){ return '<div class="dice mexx-static"><span class="die'+(keptIdx===0?" kept":"")+'">'+A.pips(a)+'</span><span class="die'+(keptIdx===1?" kept":"")+'">'+A.pips(b)+'</span></div>'; }
      function hint(t){ return '<p class="hint">'+esc(t)+'</p>'; }
      function seg(lbl,items){ return '<div class="seg"><span class="mexx-lbl">'+esc(lbl)+'</span>'+items.map(function(x){ return '<button data-act="set" data-arg="'+x[0]+'" aria-pressed="'+!!x[2]+'">'+esc(x[1])+'</button>'; }).join("")+'</div>'; }
      function dealHtml(i){ return '<div class="btnrow">'+A.others(i).map(function(j){ return '<button class="btn gold" data-act="deal" data-arg="'+j+'">'+esc(A.name(j))+'</button>'; }).join("")+'</div>'; }
      function tableHtml(){
        var w=worst(), v=V(), t=R.t, h='<div class="board"><table class="score"><tr><th>speler</th><th>worp</th><th>score</th><th>worpen</th></tr>', i, tr, cur, d, s, c;
        for(i=0;i<R.n;i++){
          tr=R.turns[i]; cur=R.phase==="play"&&i===R.cur; d="–"; s="–"; c="";
          if(tr){ d=A.dicerowSmall([tr.a,tr.b]); s=esc(label(tr.a,tr.b,v))+(score(tr.a,tr.b,v)===w?' <span class="mexx-tag">'+lowWord()+'</span>':''); c=String(tr.throws); }
          else if(cur&&t){
            if(t.st!=="roll"&&pip(t.a)&&pip(t.b)){ d=A.dicerowSmall([t.a,t.b]); s=t.is31?'31 <span class="mexx-tag">telt niet</span>':esc(label(t.a,t.b,v)); }
            if(t.throws) c=String(t.throws);
          }
          h+='<tr'+(cur?' class="cur"':'')+'><td>'+esc(A.name(i))+(i===R.start?' <span class="mexx-tag">zet op</span>':'')+'</td><td>'+d+'</td><td>'+s+'</td><td>'+c+'</td></tr>';
        }
        h+='</table><div class="stat"><span>Mexx deze ronde: <b>'+R.mexx+'</b></span><span>Verliezer drinkt: <b>'+esc(strafTxt(R.mexx))+'</b></span><span>Worpen per beurt: <b>'+R.max+'</b></span>';
        if(w!==null) h+='<span>Vast ('+lowest()+'): <b>'+esc(worstLabel(w))+'</b></span>';
        return h+'</div></div>';
      }
      function playHtml(){
        var t=R.t, i=R.cur, nm=A.name(i), v=V(), k=R.max-t.throws, L=worst(), h="", opts=[], best=-1, ck, s, good, pa, lowTxt, d, seen={};
        if(t.st==="deal") return hint("31 telt niet als worp. "+nm+", tik wie de slok krijgt.")+staticDice(t.a,t.b,t.held)+dealHtml(i);
        if(t.st==="roll"){
          if(t.held>=0) h=hint("De "+t.hv+" blijft liggen. "+nm+": tik Dobbel voor de andere steen, of tik op het vraagteken en voer hem in (worp "+(t.throws+1)+" van "+R.max+").");
          else h=hint(nm+" is aan de beurt, worp "+(t.throws+1)+" van "+R.max+": tik Dobbel, of tik op een steen en voer je eigen worp in.");
          if(fresh()) h+='<p class="mexx-info">Zet iemand anders op? Tik boven op die naam.</p>';
          return h+'<div id="mexx-dice"></div>';
        }
        /* st === "decide" */
        ck=canKeepNow(); lowTxt="niet "+lowWord();
        function odds(p){ return L===null?'':'<b>'+A.pct(p,0)+'</b>'+lowTxt; }
        function ch(keep,held){ return L===null?0:chance(L,k,keep,held,inv(),G.strikt,G.opt32); }
        if(t.is31){
          h=hint(nm+": gooi beide stenen opnieuw, of laat de 1 één keer liggen.");
        } else {
          s=score(t.a,t.b,v); good=L===null||better(s,L,v);
          h=hint(nm+" gooide "+label(t.a,t.b,v)+" (worp "+t.throws+" van "+R.max+"): laten staan of opnieuw gooien?");
          opts.push({p:L===null?-1:(good?1:0), html:'data-act="stop"><span class="num">'+esc(label(t.a,t.b,v))+'</span><span class="lbl">Laten staan<small>'+(L===null?"eerste score van de ronde":good?"beter dan de "+lowest()+" ("+esc(worstLabel(L))+")":"dan sta jij "+lowWord())+'</small></span><span class="odds kans">'+(L===null?'':good?lowTxt:'<b>'+lowWord().toUpperCase()+'</b>')+'</span>'});
        }
        pa=ch(ck,0);
        opts.push({p:L===null?-1:pa, html:'data-act="again"><span class="num">⟳</span><span class="lbl">Opnieuw gooien<small>beide stenen'+(t.is31?"":", nog "+worpen(k))+'</small></span><span class="odds kans">'+odds(pa)+'</span>'});
        if(ck) [t.a,t.b].forEach(function(dv,idx){
          if((dv!==1&&dv!==2)||seen[dv]) return; seen[dv]=1; d=ch(false,dv);
          opts.push({p:L===null?-1:d, html:'data-act="keep" data-arg="'+idx+'"><span class="num">'+dv+'</span><span class="lbl">De '+dv+' laten liggen<small>alleen de andere steen opnieuw, mag één keer per beurt</small></span><span class="odds kans">'+odds(d)+'</span>'});
        });
        if(L!==null) opts.forEach(function(o,x){ if(best<0||o.p>opts[best].p+1e-9) best=x; });
        h+=staticDice(t.a,t.b,-1)+'<div class="opts">'+opts.map(function(o,x){ return '<button class="opt'+(x===best?' best':'')+'" '+o.html+'</button>'; }).join("")+'</div>';
        return h;
      }
      function tieHtml(){
        var T=R.tie, v=V(), names=A.joinNames(T.p), first=A.name(T.p[0]), h="", i, tr;
        if(R.phase==="tiepick"){
          tr=R.turns[T.p[0]];
          h=hint(first+" kiest de extra ronde: Mexx of Ogen.");
          h+='<div class="verdict neutral"><h2>Gelijk '+lowWord()+'</h2><p>'+(T.again?"Nog steeds gelijk. ":"")+'<b>'+esc(names)+'</b> staan samen '+lowWord()+(T.again?"":" met "+esc(label(tr.a,tr.b,v)))+'. Extra ronde: ieder gooit één keer; een Mexx telt ook nu mee voor de straf. '+esc(first)+' kiest hoe.</p>';
          h+='<div class="btnrow"><button class="btn gold" data-act="tiemode" data-arg="mexx">Mexx: '+lowest()+' score verliest</button><button class="btn gold" data-act="tiemode" data-arg="ogen">Ogen: '+(inv()?"meeste":"minste")+' ogen verliest</button></div></div>';
          return h;
        }
        i=T.p[T.k];
        if(T.st==="deal") h=hint("31 telt niet als worp. "+A.name(i)+", tik wie de slok krijgt.");
        else h=hint("Extra ronde ("+(T.mode==="ogen"?"Ogen":"Mexx")+"): "+A.name(i)+" gooit één keer. Tik Dobbel, of tik op een steen en voer je worp in.");
        h+='<div class="mexx-tie">'+T.p.map(function(p){ var x=T.rolls[p]; return '<div><b>'+esc(A.name(p))+'</b>: '+(x?A.dicerowSmall([x.a,x.b])+' '+esc(T.mode==="ogen"?(x.a+x.b)+" ogen":label(x.a,x.b,v)):(p===i?"gooit nu":"moet nog"))+'</div>'; }).join("")+'</div>';
        if(T.st==="deal") h+=staticDice(T.a,T.b,-1)+dealHtml(i); else h+='<div id="mexx-dice"></div>';
        return h;
      }
      function infoTxt(){
        if(power()) return "PowerMexx: iedereen gooit altijd maar één keer en laat nooit iets liggen. 3 en 3 is PowerMexx en telt als twee Mexx. De laagste score drinkt.";
        if(inv()) return "Inverse Mexx: de telling is andersom. De laagste steen is het tiental (6 en 3 = 36, 4 en 4 = 44). 1 en 2 blijft Mexx en is het beste. De hoogste score drinkt.";
        return "De hoogste steen is het tiental (6 en 3 = 63), dubbel is een honderdtal (4 en 4 = 400), 1 en 2 is Mexx. Je mag drie keer gooien; de laagste score drinkt.";
      }
      function render(){
        var n=N(), h, e, t, my, d;
        if(dead) return;
        gen++; /* een worp die nog rolt in een oud dobbelvak telt niet meer */
        if(n<2){ box.innerHTML='<p class="hint">Mexx speel je met minstens twee spelers. Tik boven op + speler om iemand toe te voegen.</p>'; return; }
        if(!R){ newRound(A.S.active,""); return; }
        if(R.n!==n){ newRound(R.start,"Het aantal spelers is veranderd: de ronde begint opnieuw."); return; }
        sync();
        h='<p class="mexx-info">'+esc(infoTxt())+'</p>'+tableHtml();
        if(R.note) h+='<p class="mexx-note">'+esc(R.note)+'</p>';
        if(R.phase==="play") h+=playHtml();
        else if(R.phase==="done") h+=hint("Tik op Volgende ronde. "+A.name(R.loser)+" zet op.")+'<div class="verdict fout"><h2>'+esc(A.name(R.loser))+' drinkt</h2><p><b>'+esc(R.res)+'</b> '+esc(R.res2)+'</p><div class="btnrow"><button class="btn gold" data-act="next">Volgende ronde</button></div></div>';
        else h+=tieHtml();
        h+='<div class="mexx-set">'+seg("variant:",[["variant:normaal","Mexx",G.variant==="normaal"],["variant:power","PowerMexx",power()],["variant:inverse","Inverse Mexx",inv()]]);
        h+=seg("per Mexx:",[["straf:2","2 slokken",G.straf===2],["straf:3","3 slokken",G.straf===3],["straf:half","half adtje",G.straf==="half"]]);
        h+=seg("afspraken:",(power()?[]:[["opt32:t","32 staat altijd vast",G.opt32],["strikt:t","bij 31 niets laten liggen",G.strikt]]).concat([["dubbel:t","dubbel: zelf een slok",G.dubbel]]))+'</div>';
        if(R.phase!=="done") h+='<div class="btnrow"><button class="btn" data-act="new">Nieuwe ronde</button></div>';
        if(G.log.length) h+='<div class="log">'+G.log.map(function(x){ return '<div>'+esc(x)+'</div>'; }).join("")+'</div>';
        box.innerHTML=h;
        e=box.querySelector("#mexx-dice");
        if(e){
          my=gen; t=R.phase==="play"?R.t:null;
          d=A.Dice(e,{n:2, label:"Dobbel", onRoll:function(v){ if(dead||my!==gen) return; rolled(v); }});
          if(t&&t.held>=0){ d.set(t.held===0?[t.hv,null]:[null,t.hv]); d.setKept([t.held===0,t.held===1]); }
        }
      }

      R=validRound(G.r)?G.r:null;
      render();
      this.refresh=function(){ if(!dead) render(); };
      /* op een naam tikken: voor de eerste worp van een ronde kies je zo wie opzet; daarna blijft de beurt waar hij is */
      this.onPlayer=function(i){ if(dead||!R) return; if(fresh()&&okIdx(i,R.n)){ R.start=R.cur=i; A.save(); } render(); };
      this.destroy=function(){ dead=true; gen++; };
    }
  });
})();
