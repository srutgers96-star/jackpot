/* ===== Adtzee ===== */
(function(){
  "use strict";
  var A=App, el=A.el, esc=A.esc, pct=A.pct, ID="adtzee";
  /* Keuzes waar de bijbel ruimte laat:
     - Wisselen van combinatie (regel 5) kost een adtje. De losgelaten combinatie blijft open: ze is niet afgemaakt, dus niet afgestreept.
       Ook een andere invulling van dezelfde combinatie (andere steen, andere straat) is wisselen. Je worpen krijg je niet terug.
     - Wisselen mag zolang de beurt niet is afgerond, ook na de derde worp: de regel noemt geen grens.
     - "Maximaal drie worpen": eerder stoppen mag, ook als je mist (dan drink je de ogen die je mist).
     - Full House: drie en twee van verschillende ogen (vijf dezelfde is Adtzee).
     - Three/Four of a Kind met meer dezelfde stenen dan nodig: de overtollige stenen tellen als reststeen.
     - Bovenste helft met precies drie stenen: gehaald, maar er is geen extra steen, dus niets uit te delen.
     - Adtzee, "iedereen één adtje": staat in de kolom Uitdelen, dus alle andere spelers trekken er een, de gooier deelt uit.
       De verdubbelingen gaan over slokken en laten dit adtje met rust.
     - Variërende regel 1 (niet alle worpen nodig) stapelt op regel 2 of 3; regel 2 en 3 samen blijven één verdubbeling.
     - Uitdelen "mag": verdelen over meerdere spelers kan, en (een deel) niet uitdelen ook. */
  var tick=0; /* elke render en elke destroy hoogt hem op, zodat een worp die nog uitrolt nooit op een oud scherm landt */
  if(!document.getElementById("adtzee-style")){
    var css=document.createElement("style"); css.id="adtzee-style";
    css.textContent=
      ".adtzee-who{color:var(--gold);font-size:17px;}"+
      ".adtzee-warn{color:var(--gold);}"+
      ".adtzee-dice .dice{gap:8px;margin:10px 0 6px;align-items:flex-start;}"+
      ".adtzee-dice .diewrap{width:54px;}"+
      ".adtzee-dice .die{width:54px;height:54px;padding:7px;border-radius:11px;}"+
      ".adtzee-dice .die .pip{width:9px;height:9px;}"+
      ".adtzee-dice .die.blank{font-size:26px;}"+
      ".adtzee-dice .keep{width:54px;min-height:40px;padding:2px 0;font-size:10px;line-height:1.15;border-radius:10px;}"+
      ".adtzee-dice .roll{font-size:18px;}"+
      ".adtzee-row .btn{min-height:42px;}"+
      ".adtzee-ttl{font-size:20px;font-weight:900;text-align:center;line-height:1.15;margin-bottom:4px;}"+
      ".adtzee-status{text-align:center;font-size:15px;margin:6px 0 2px;line-height:1.5;}"+
      ".adtzee-leg{text-align:center;font-size:12px;color:var(--ivory-dim);margin:6px 0 0;line-height:1.4;}"+
      ".adtzee-leg b{color:var(--ivory);}"+
      ".adtzee-lbl{font-size:12px;color:var(--ivory-dim);text-align:center;margin:8px 0 5px;}"+
      ".adtzee-combos{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px;}"+
      ".adtzee-combo{display:block;min-height:56px;min-width:0;text-align:left;padding:7px 10px;border-radius:10px;border:1.5px solid rgba(243,233,210,.25);background:rgba(0,0,0,.18);color:var(--ivory);line-height:1.2;}"+
      ".adtzee-combo b{display:block;font-size:14px;}"+
      ".adtzee-combo small{display:block;font-size:12px;color:var(--ivory-dim);margin-top:3px;}"+
      ".adtzee-combo small .kans{color:var(--gold);font-weight:700;}"+
      ".adtzee-combo.adtzee-ok{border-color:var(--gold);background:rgba(231,184,79,.12);}"+
      ".adtzee-combo:disabled{opacity:.4;}"+
      ".adtzee-combo:disabled b{text-decoration:line-through;}"+
      ".adtzee-combo .dsmall{width:22px;height:22px;padding:3px;border-radius:5px;}"+
      ".adtzee-combo .dsmall .pip{width:4px;height:4px;}"+
      ".adtzee-pick{display:flex;justify-content:center;gap:6px;flex-wrap:wrap;}"+
      ".adtzee-pick button{width:44px;height:44px;border-radius:10px;border:0;background:linear-gradient(#fffdf6,#efe7d2);box-shadow:0 3px 0 #c4b793;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);padding:6px;}"+
      ".adtzee-pick button .pip{width:8px;height:8px;}"+
      ".adtzee-pick button.adtzee-str{display:block;width:auto;padding:0 14px;color:var(--ink);font-size:15px;font-weight:700;}"+
      ".adtzee-pick button[aria-pressed=\"true\"]{outline:3px solid var(--gold);outline-offset:2px;}"+
      ".adtzee-give{display:flex;align-items:center;gap:6px;padding:5px 0;border-top:1px solid rgba(243,233,210,.12);}"+
      ".adtzee-give:first-child{border-top:0;}"+
      ".adtzee-nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700;font-size:15px;}"+
      ".adtzee-give b{min-width:30px;text-align:center;font-size:20px;}"+
      ".adtzee-give button{min-width:44px;height:44px;border-radius:10px;border:1.5px solid rgba(243,233,210,.35);background:rgba(0,0,0,.18);font-size:15px;font-weight:700;padding:0 8px;}"+
      ".adtzee-give button:disabled{opacity:.3;}"+
      ".adtzee-sb{margin-top:14px;}"+
      ".adtzee-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;}"+
      ".adtzee-score td,.adtzee-score th{min-width:34px;white-space:nowrap;}"+
      ".adtzee-score th span{display:block;max-width:64px;margin:0 auto;overflow:hidden;text-overflow:ellipsis;}"+
      ".adtzee-score td:first-child{font-size:12px;}"+
      ".adtzee-score th.adtzee-curcol{color:var(--gold);font-weight:700;}"+
      ".adtzee-score tr.adtzee-half td{border-top:2px solid rgba(243,233,210,.3);}"+
      ".adtzee-score tr.adtzee-sum td{color:var(--ivory-dim);}"+
      ".adtzee-hit{color:var(--green);font-weight:700;}"+
      ".adtzee-miss{color:#f0a195;font-weight:700;}"+
      ".adtzee-now{color:var(--gold);font-weight:900;}"+
      ".adtzee-opts button{min-height:40px;}";
    document.head.appendChild(css);
  }

  /* ---- de twaalf combinaties ---- */
  var COMBOS=[], i0;
  for(i0=1;i0<=6;i0++) COMBOS.push({c:"b"+i0,n:"Drie maal "+i0});
  COMBOS.push({c:"tk",n:"Three of a Kind"},{c:"fk",n:"Four of a Kind"},{c:"fh",n:"Full House"},{c:"ks",n:"Kleine Straat"},{c:"gs",n:"Grote Straat"},{c:"az",n:"Adtzee"});
  var ORDER=COMBOS.map(function(x){return x.c;});
  function cname(c){ return COMBOS[ORDER.indexOf(c)].n; }
  function upper(c){ return c.charAt(0)==="b"?+c.charAt(1):0; }
  /* bij deze vier ligt de uitbetaling vast zodra de combinatie er ligt; doorgooien levert niets meer op */
  function fixed(c){ return c==="fh"||c==="ks"||c==="gs"||c==="az"; }
  function sum(a){ return a.reduce(function(x,y){return x+y;},0); }
  function slok(k){ return k+" "+(k===1?"slok":"slokken"); }
  function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
  /* een doel is {c, a, b}: a = de steen (of de laagste steen van de straat), b = het paar van de Full House */
  function specs(c){
    var out=[], a, b, max;
    if(upper(c)) return [{c:c}];
    if(c==="fh"){ for(a=1;a<=6;a++)for(b=1;b<=6;b++) if(a!==b) out.push({c:c,a:a,b:b}); return out; }
    max=c==="ks"?3:c==="gs"?2:6; for(a=1;a<=max;a++) out.push({c:c,a:a}); return out;
  }
  function spec(t){
    var c=t.c;
    if(upper(c)) return "";
    if(c==="tk") return "3× "+t.a;
    if(c==="fk") return "4× "+t.a;
    if(c==="az") return "5× "+t.a;
    if(c==="fh") return "3× "+t.a+" en 2× "+t.b;
    return t.a+" t/m "+(t.a+(c==="ks"?3:4));
  }
  function label(t){ var s=spec(t); return cname(t.c)+(s?", "+s:""); }
  function same(x,y){ return !!x&&!!y&&x.c===y.c&&x.a===y.a&&x.b===y.b; }
  /* de stenen die er voor dit doel moeten liggen */
  function req(t){
    var c=t.c, u=upper(c), a=t.a;
    if(u) return [u,u,u];
    if(c==="tk") return [a,a,a];
    if(c==="fk") return [a,a,a,a];
    if(c==="fh") return [a,a,a,t.b,t.b];
    if(c==="ks") return [a,a+1,a+2,a+3];
    if(c==="gs") return [a,a+1,a+2,a+3,a+4];
    return [a,a,a,a,a];
  }
  /* regel 3.I: de stenen die je mist; hun ogen zijn je slokken */
  function missing(vals,t){
    var cnt=[0,0,0,0,0,0,0], out=[];
    vals.forEach(function(v){ if(v)cnt[v]++; });
    req(t).forEach(function(v){ if(cnt[v]>0)cnt[v]--; else out.push(v); });
    return out;
  }
  /* het uitdeelschema; alleen aanroepen als de combinatie er ligt */
  function payout(t,vals){
    var c=t.c, u=upper(c), a=t.a, s=sum(vals), x;
    if(u){ x=vals.filter(function(v){return v===u;}).length-3; return {n:x*u, f:x?x+" extra × "+u:"geen extra steen"}; }
    if(c==="tk"){ x=vals.slice(); [0,1,2].forEach(function(){ x.splice(x.indexOf(a),1); }); return {n:s-3*a, f:x[0]+" + "+x[1]}; }
    if(c==="fk"){ x=s-4*a; return {n:2*x, f:"2 × "+x}; }
    if(c==="fh") return {n:a+t.b, f:a+" + "+t.b};
    if(c==="ks") return {n:a+3, f:"hoogste steen van de straat"};
    if(c==="gs") return {n:2*(a+4), f:"2 × "+(a+4)};
    return {adt:true, n:0, f:""};
  }
  function rule(t){
    var c=t.c, u=upper(c);
    if(u) return "elke extra "+u+" is "+slok(u)+" uitdelen";
    if(c==="tk") return "de som van de twee reststenen uitdelen";
    if(c==="fk") return "het dubbele van de reststeen uitdelen";
    if(c==="fh") return slok(t.a+t.b)+" uitdelen ("+t.a+" + "+t.b+")";
    if(c==="ks") return slok(t.a+3)+" uitdelen (hoogste steen)";
    if(c==="gs") return slok(2*(t.a+4))+" uitdelen (2 × "+(t.a+4)+")";
    return "iedereen één adtje";
  }
  /* voorstel bij het kiezen: de invulling waar je het minst voor mist (eerst minste stenen, dan minste ogen, bij gelijk de hoogste) */
  function bestSpec(c,vals){
    var best=null, bm=99, bs=999;
    specs(c).forEach(function(s){ var m=missing(vals,s), ms=sum(m); if(m.length<bm||(m.length===bm&&ms<=bs)){ best=s; bm=m.length; bs=ms; } });
    return {c:best.c,a:best.a,b:best.b};
  }
  function autoKeep(t,vals){
    var u=upper(t.c), cnt=[0,0,0,0,0,0,0];
    if(u) return vals.map(function(v){return v===u;}); /* elke extra steen telt mee bij het uitdelen */
    req(t).forEach(function(v){cnt[v]++;});
    return vals.map(function(v){ if(v&&cnt[v]>0){cnt[v]--;return true;} return false; });
  }
  /* kans om de ontbrekende stenen nog te gooien: miss = aantal per oog, f = losse stenen, k = worpen over.
     Wat je nodig hebt blijft liggen, de rest gaat opnieuw; voor een vast doel is dat de beste aanpak. */
  var memo={};
  function pHit(miss,f,k){
    var need=sum(miss), key, tot=0, n, code, x, d, i, c, nm, got, h;
    if(!need) return 1;
    if(k<=0||f<need) return 0;
    key=miss.filter(Boolean).sort().join("")+"|"+f+"|"+k; if(key in memo) return memo[key];
    n=Math.pow(6,f);
    for(code=0;code<n;code++){
      c=[0,0,0,0,0,0]; x=code; for(d=0;d<f;d++){ c[x%6]++; x=Math.floor(x/6); }
      nm=[]; got=0; for(i=0;i<6;i++){ h=Math.min(miss[i],c[i]); got+=h; nm.push(miss[i]-h); }
      tot+=pHit(nm,f-got,k-1);
    }
    return (memo[key]=tot/n);
  }
  function chance(t,vals,k){
    var m=missing(vals,t), c=[0,0,0,0,0,0];
    m.forEach(function(v){c[v-1]++;});
    return pHit(c,5-(req(t).length-m.length),k);
  }

  A.register({ id:ID, beta:true, title:"Adtzee", level:"app", kans:true, sub:"Vijf stenen, scoreblad per speler, missen drinken en raak uitdelen",
    init:function(root){
      var G=A.gs(ID), dice=null, sureNew=false;
      G.opt=G.opt||{}; G.log=G.log||[];
      function np(){ return A.S.players.length; }
      function openOf(i){ var col=(G.cols&&G.cols[i])||{}; return ORDER.filter(function(c){return !col[c];}); }
      function firstOpen(from){ var n=np(), k, i; for(k=0;k<n;k++){ i=(from+k)%n; if(openOf(i).length) return i; } return -1; }
      function addLog(s){ G.log.unshift(s); if(G.log.length>8)G.log.length=8; }
      /* variërende regel 2: alle anderen hebben deze combinatie al afgestreept */
      function isLast(c,p){ return np()>1&&A.others(p).every(function(j){ return !!(G.cols[j]&&G.cols[j][c]); }); }
      function dblWhy(c,p){
        if(G.opt.finale&&G.finale) return "laatste ronde met alleen Adtzee";
        if(G.opt.laatste&&isLast(c,p)) return "laatste die dit probeert";
        return "";
      }
      function startTurn(p){
        /* variërende regel 3 wordt bij het begin van de laatste ronde vastgesteld: iedereen heeft dan precies één combinatie open */
        var opens=A.S.players.map(function(q,i){return openOf(i);});
        if(opens.every(function(o){return o.length===1;})) G.finale=opens.every(function(o){return o[0]==="az";});
        else if(opens.some(function(o){return o.length>1;})) G.finale=false;
        G.turn={p:p,throws:0,vals:[null,null,null,null,null],kept:[false,false,false,false,false],target:null,pick:null,changing:false,await:true,prev:null,deal:null};
        A.S.active=p; A.save(); A.renderPlayers();
      }
      /* scoreblad gelijk houden met de spelerslijst (speler erbij, speler weg, andere naam) en de beurt met de actieve speler */
      function sync(){
        var names=A.S.players.map(function(q){return q.name;}), old=G.names, T, i, j, used, map, cols, act, s;
        if(!G.cols||!old){ G.cols=[]; G.turn=null; G.over=false; G.finale=false; G.log=[]; }
        else if(names.length<old.length){
          used=[]; map=[]; cols=[];
          for(i=0;i<names.length;i++){ map[i]=-1; for(j=0;j<old.length;j++) if(!used[j]&&old[j]===names[i]){ used[j]=true; map[i]=j; break; } cols.push(map[i]>=0&&G.cols[map[i]]?G.cols[map[i]]:{}); }
          G.cols=cols; T=G.turn;
          if(T){ i=map.indexOf(T.p); if(i<0) G.turn=null; else { T.p=i; if(T.deal)T.deal.give={}; A.S.active=i; } }
        }
        for(i=0;i<names.length;i++) if(!G.cols[i]) G.cols[i]={};
        G.cols.length=names.length; G.names=names;
        T=G.turn; if(T&&(!T.vals||T.vals.length!==5||!T.kept||!(T.p<names.length))) G.turn=T=null;
        if(G.over){ A.save(); return; }
        act=(A.S.active>=0&&A.S.active<names.length)?A.S.active:0;
        if(!T){ s=firstOpen(act); if(s<0){ G.over=true; A.save(); } else startTurn(s); return; }
        if(T.p!==act){
          /* nog niet gegooid: de aangetikte speler mag beginnen; anders maakt de huidige speler eerst zijn beurt af */
          if(T.throws===0&&!T.deal&&openOf(act).length) startTurn(act);
          else { A.S.active=T.p; A.save(); A.renderPlayers(); }
        }
      }
      function guard(fn){ return function(){ if(!G.names||np()!==G.names.length){ render(); return; } fn.apply(this,arguments); }; }
      function rollLocked(){
        var T=G.turn;
        if(!T||T.deal||G.over) return true;
        if(T.throws===0) return false;
        if(!T.target||T.changing||T.throws>=3) return true;
        if(T.kept.every(Boolean)) return true;
        return fixed(T.target.c)&&T.vals.every(Boolean)&&!missing(T.vals,T.target).length;
      }
      function advance(){
        var nx=firstOpen((G.turn.p+1)%np());
        if(nx<0){ G.over=true; G.turn=null; A.save(); return true; }
        startTurn(nx); return false;
      }

      /* ---- een worp: digitaal, of echte stenen ingevuld terwijl er lege stenen lagen ---- */
      function onRoll(v,digital){
        var T=G.turn; if(!T||T.deal||G.over) return;
        if(digital||T.await){
          if(T.throws>=3||(T.throws>=1&&(!T.target||T.changing))){ render(); return; }
          T.throws++; T.vals=v; T.await=false; T.prev=null;
          if(T.target){ T.kept=autoKeep(T.target,v); if(!missing(v,T.target).length) A.play("ding"); }
        } else {
          /* een steen aangepast terwijl de worp al lag: verbetering van de invoer, telt niet als worp */
          T.vals=v; if(T.target&&!T.changing) T.kept=autoKeep(T.target,v);
        }
        A.save(); render();
      }
      /* ---- combinatie vastleggen (regel 2) of wisselen voor een adtje (regel 5) ---- */
      function fix(){
        var T=G.turn, k=T&&T.pick, p; if(!k||T.deal||G.cols[T.p][k.c]) return;
        p=T.p;
        if(T.changing){
          if(same(k,T.target)){ T.changing=false; T.pick=null; A.save(); render(); return; }
          A.atje(p,1); T.target=k; addLog(A.name(p)+" trekt een adtje en wisselt naar "+label(k));
          A.play("ding"); A.overlay("info","Adtje!",[A.name(p)+" trekt een adtje en gaat nu voor "+label(k)+"."],2800);
        } else T.target=k;
        T.pick=null; T.changing=false; T.kept=autoKeep(T.target,T.vals);
        A.save(); render();
      }
      /* ---- beurt afronden: missen = drinken wat je mist, raak = uitdelen volgens het schema ---- */
      function finish(){
        var T=G.turn, t=T&&T.target, p, nm, vals, miss, lbl, why, d, k, po, fs, tot, f, oth, over;
        if(!t||T.deal||T.changing||!T.vals.every(Boolean)) return;
        p=T.p; nm=A.name(p); vals=T.vals.slice(); miss=missing(vals,t); lbl=label(t); why=dblWhy(t.c,p); d=why?2:1;
        if(miss.length){
          k=sum(miss)*d; G.cols[p][t.c]={h:0,n:k}; A.drink(p,k); addLog(nm+" mist "+lbl+" en drinkt "+slok(k));
          over=advance(); render(); A.play("dood");
          A.overlay("dood","Mis!",[nm+" drinkt "+slok(k)+".","Mist "+miss.join(", ")+" voor "+lbl+(why?" ("+why+": dubbel)":"")+"."].concat(over?["Het spel is klaar."]:[]),0,A.dicerow(vals));
          return;
        }
        po=payout(t,vals); oth=A.others(p);
        if(po.adt){
          G.cols[p][t.c]={h:1,n:0,a:1}; oth.forEach(function(j){ A.atje(j,1); });
          addLog(nm+" gooit "+lbl+": "+(oth.length?A.joinNames(oth)+" een adtje":"iedereen een adtje"));
          over=advance(); render(); A.play("special");
          A.overlay("win","Adtzee!",[oth.length?A.joinNames(oth)+(oth.length>1?" trekken":" trekt")+" een adtje.":"Iedereen aan tafel trekt een adtje.",nm+" gooit "+lbl+"."].concat(over?["Het spel is klaar."]:[]),0,A.dicerow(vals));
          return;
        }
        fs=(G.opt.snel&&T.throws<3)?2:1; tot=po.n*fs*d; f=po.f+(fs>1?", dubbel: niet alle worpen nodig":"")+(why?", dubbel: "+why:"");
        G.cols[p][t.c]={h:1,n:tot};
        if(!tot){
          addLog(nm+" haalt "+lbl+" met precies drie stenen");
          over=advance(); render(); A.play("ding");
          A.overlay("info","Raak",[nm+" haalt "+lbl+" met precies drie stenen.","Geen extra steen: niets uit te delen, niets te drinken."].concat(over?["Het spel is klaar."]:[]),0,A.dicerow(vals));
          return;
        }
        if(!oth.length){
          addLog(nm+" haalt "+lbl+" en deelt "+slok(tot)+" uit aan tafel");
          over=advance(); render(); A.play("win");
          A.overlay("win","Raak!",[nm+" mag "+slok(tot)+" uitdelen aan tafel.",lbl+" ("+f+")."].concat(over?["Het spel is klaar."]:[]),0,A.dicerow(vals));
          return;
        }
        T.deal={n:tot,f:f,lbl:lbl,give:{}}; if(oth.length===1) T.deal.give[oth[0]]=tot;
        A.save(); A.play("win"); render();
      }
      function settle(){
        var T=G.turn, D=T&&T.deal, p, nm, parts=[], tot=0, over;
        if(!D) return;
        p=T.p; nm=A.name(p);
        A.others(p).forEach(function(j){ var g=D.give[j]||0; if(g>0){ A.drink(j,g); parts.push(A.name(j)+" drinkt "+slok(g)+"."); tot+=g; } });
        addLog(nm+" haalt "+D.lbl+(tot?" en deelt "+slok(tot)+" uit":", deelt niets uit"));
        over=advance(); render();
        if(tot){ A.play("win"); A.overlay("win","Proost!",[nm+" deelt "+slok(tot)+" uit."].concat(parts).concat(over?["Het spel is klaar."]:[]),0); }
        else A.overlay("info","Niks",[nm+" deelt niets uit."].concat(over?["Het spel is klaar."]:[]),2200);
      }

      /* ---- schermdelen ---- */
      function gridHtml(T,p){
        var col=G.cols[p], left=3-T.throws, h='<div class="adtzee-combos">';
        COMBOS.forEach(function(cb){
          var r=col[cb.c], u=upper(cb.c), ttl=u?'Drie maal '+A.dicerowSmall([u]):esc(cb.n), s, m, ms, sp;
          if(r){ h+='<button class="adtzee-combo" disabled><b>'+ttl+'</b><small>'+(r.h?(r.a?'gehaald, adtjes':'gehaald, +'+r.n):'gemist, −'+r.n)+'</small></button>'; return; }
          s=bestSpec(cb.c,T.vals); m=missing(T.vals,s); ms=sum(m); sp=spec(s);
          h+='<button class="adtzee-combo'+(m.length?'':' adtzee-ok')+'" data-c="'+cb.c+'"><b>'+ttl+'</b><small>'+(sp?esc(sp)+' · ':'')+(m.length?'mist '+ms+(ms===1?' oog':' ogen'):'ligt er al')+
            (A.S.kans&&left>0&&m.length?'<span class="kans"> · '+pct(chance(s,T.vals,left),0)+'</span>':'')+'</small></button>';
        });
        return h+'</div>';
      }
      function pickHtml(T,p){
        var k=T.pick, c=k.c, miss=missing(T.vals,k), ms=sum(miss), left=3-T.throws, why=dblWhy(c,p), cur=T.changing&&same(k,T.target), h='<div class="board"><div class="adtzee-ttl">'+esc(cname(c))+'</div>';
        function row(attr,val,lbl){ var s='<div class="adtzee-lbl">'+lbl+'</div><div class="adtzee-pick">', v; for(v=1;v<=6;v++) s+='<button data-'+attr+'="'+v+'" aria-pressed="'+(val===v)+'" aria-label="'+v+'">'+A.pips(v)+'</button>'; return s+'</div>'; }
        if(c==="tk"||c==="fk"||c==="az") h+=row("a",k.a,"Welke steen?");
        else if(c==="fh") h+=row("a",k.a,"Drie keer")+row("b",k.b,"Twee keer");
        else if(c==="ks"||c==="gs"){ h+='<div class="adtzee-lbl">Van waar tot waar?</div><div class="adtzee-pick">'; specs(c).forEach(function(s){ h+='<button class="adtzee-str" data-a="'+s.a+'" aria-pressed="'+(k.a===s.a)+'">'+spec(s)+'</button>'; }); h+='</div>'; }
        h+='<p class="adtzee-status">'+(miss.length?'Je mist nu '+A.dicerowSmall(miss)+' ('+ms+(ms===1?' oog':' ogen')+')':'Ligt er al!')+'</p>';
        h+='<p class="adtzee-leg">Raak: '+esc(rule(k))+'. Mis: drinken wat je mist.'+(why?' '+esc(cap(why))+': alle slokken dubbel.':'')+'</p>';
        if(A.S.kans&&left>0&&miss.length) h+='<p class="adtzee-leg kans">Kans om het te halen in '+left+(left===1?' worp':' worpen')+': <b>'+pct(chance(k,T.vals,left),0)+'</b></p>';
        h+='</div><div class="btnrow adtzee-row"><button class="btn gold" id="adtzeeFix"'+(cur?' disabled':'')+'>'+(cur?'Hier ga je al voor':T.changing?'Adtje trekken en wisselen':'Vastleggen')+'</button><button class="btn" id="adtzeeBack">Andere kiezen</button>'+
          (T.changing?'<button class="btn" id="adtzeeKeep">Toch niet wisselen</button>':'')+'</div>';
        return h;
      }
      function scoreHtml(){
        var T=G.turn, pl=A.S.players, h='<div class="board adtzee-sb"><div class="adtzee-scroll"><table class="score adtzee-score"><tr><th>combinatie</th>';
        pl.forEach(function(q,i){ h+='<th'+(T&&!G.over&&T.p===i?' class="adtzee-curcol"':'')+'><span>'+esc(q.name)+'</span></th>'; });
        h+='</tr>';
        COMBOS.forEach(function(cb,ci){
          h+='<tr'+(ci===6?' class="adtzee-half"':'')+'><td>'+esc(cb.n)+'</td>';
          pl.forEach(function(q,i){
            var r=(G.cols[i]||{})[cb.c], now=T&&!G.over&&T.p===i&&T.target&&!T.deal&&T.target.c===cb.c;
            h+='<td>'+(r?(r.h?'<span class="adtzee-hit">'+(r.a?'adt':'+'+r.n)+'</span>':'<span class="adtzee-miss">−'+r.n+'</span>'):now?'<span class="adtzee-now">…</span>':'')+'</td>';
          });
          h+='</tr>';
        });
        [["uitdelen",1],["zelf gedronken",0]].forEach(function(row,ri){
          h+='<tr class="adtzee-sum'+(ri===0?' adtzee-half':'')+'"><td>'+row[0]+'</td>';
          pl.forEach(function(q,i){ var col=G.cols[i]||{}, s=0; ORDER.forEach(function(c){ if(col[c]&&col[c].h===row[1]) s+=col[c].n; }); h+='<td>'+s+'</td>'; });
          h+='</tr>';
        });
        return h+'</table></div><p class="adtzee-leg">+ mocht uitdelen · − zelf gedronken · adt = iedereen een adtje · elke combinatie één keer</p></div>';
      }

      function render(){
        var token=++tick, ask=sureNew, h="", T, p, nm, t, playing=false, full, left, miss, ms, why, d, hit=false, lockHit=false, po, fs, tot, D, oth, given, rest, nr, endLbl;
        sureNew=false; sync(); T=G.turn;
        if(G.over||!T){
          h+='<div class="verdict win"><h2>Spel klaar</h2><p>Alle combinaties zijn afgestreept. De totalen staan onder aan het scoreblad.</p></div>';
        } else {
          p=T.p; nm=esc(A.name(p)); t=T.target; playing=!!t&&!T.changing; full=T.vals.every(Boolean); left=3-T.throws;
          nr=Math.min(12,12-openOf(p).length+(T.deal?0:1));
          h+='<p class="hint"><b class="adtzee-who">'+nm+'</b> is aan de beurt · combinatie '+nr+' van 12</p>';
          if(np()<2) h+='<p class="hint">Alleen in de app? Wat je mag uitdelen verdeel je dan zelf aan tafel. Meer spelers toevoegen kan met + speler.</p>';
          if(G.opt.finale&&G.finale) h+='<p class="hint adtzee-warn">Laatste ronde en iedereen heeft alleen Adtzee nog open: alle slokken dubbel.</p>';
          if(T.deal){
            D=T.deal; oth=A.others(p); given=0; oth.forEach(function(j){ given+=D.give[j]||0; }); rest=D.n-given;
            h+='<div class="verdict win"><h2>Raak!</h2><p>'+nm+' haalt <b>'+esc(D.lbl)+'</b> en mag <b>'+slok(D.n)+'</b> uitdelen ('+esc(D.f)+'). Tik wie ze krijgt.</p></div><div class="board">';
            oth.forEach(function(j){ var g=D.give[j]||0;
              h+='<div class="adtzee-give"><span class="adtzee-nm">'+esc(A.name(j))+'</span><button data-g="-1" data-j="'+j+'"'+(g?'':' disabled')+' aria-label="Een slok minder">−</button><b>'+g+'</b><button data-g="1" data-j="'+j+'"'+(rest>0?'':' disabled')+'>+1</button><button data-g="all" data-j="'+j+'"'+(rest>0?'':' disabled')+'>rest</button></div>'; });
            h+='<div class="stat"><span>Nog uit te delen: <b>'+rest+'</b></span><span>Totaal: <b>'+D.n+'</b></span></div></div>';
            h+='<div class="btnrow adtzee-row"><button class="btn gold" id="adtzeeDeal"'+(rest>0?' disabled':'')+'>Uitdelen</button>'+(rest>0?'<button class="btn" id="adtzeeSkip">'+(given?'Rest niet uitdelen':'Niet uitdelen')+'</button>':'')+'</div>';
          } else {
            if(T.throws===0) h+='<p class="hint">Gooi alle vijf de stenen. Echte stenen? Tik op een ? en vul de worp in.</p>';
            if(playing){
              miss=missing(T.vals,t); ms=sum(miss); why=dblWhy(t.c,p); d=why?2:1; hit=full&&!miss.length; lockHit=hit&&fixed(t.c);
              h+='<div class="board"><div class="adtzee-ttl">'+esc(label(t))+'</div><p class="adtzee-status">';
              if(!full) h+='Vul de nieuwe worp in (tik op een ?) of gooi digitaal.';
              else if(!hit) h+='Mist nog '+A.dicerowSmall(miss)+' = <b>'+slok(ms*d)+'</b> drinken';
              else {
                po=payout(t,T.vals); fs=(G.opt.snel&&T.throws<3)?2:1; tot=po.n*fs*d;
                h+=po.adt?'Gehaald! Iedereen één adtje.':tot?'Gehaald! <b>'+slok(tot)+'</b> uitdelen ('+esc(po.f)+(fs>1?', dubbel: niet alle worpen nodig':'')+')':'Gehaald met precies drie stenen: nog niets uit te delen.';
              }
              h+='</p><div class="stat"><span>Worp <b>'+T.throws+'</b> van 3</span>'+(why?'<span>'+esc(cap(why))+': dubbel</span>':'')+'</div>';
              if(A.S.kans&&full&&!hit&&left>0) h+='<p class="adtzee-leg kans">Kans om het nog te halen: <b>'+pct(chance(t,T.vals,left),0)+'</b></p>';
              h+='</div>';
            }
            h+='<div id="adtzeeDice" class="adtzee-dice"></div>';
            if(playing){
              if(!full) h+='<div class="btnrow adtzee-row"><button class="btn" id="adtzeeUndo">Toch niet gooien</button></div>';
              else {
                if(left>0&&!lockHit) h+='<p class="hint">Zet vast wat blijft liggen en gooi de rest. Met echte stenen: tik eerst op Echte stenen gooien.</p>';
                endLbl=hit?(po.adt?'Gehaald: iedereen een adtje':tot?'Gehaald: '+slok(tot)+' uitdelen':'Gehaald: beurt afronden'):(left>0?'Stoppen en '+slok(ms*d)+' drinken':'Beurt afronden: '+slok(ms*d)+' drinken');
                h+='<div class="btnrow adtzee-row"><button class="btn'+(hit||left<=0?' gold':'')+'" id="adtzeeEnd">'+endLbl+'</button>'+(left>0&&!lockHit?'<button class="btn" id="adtzeeReal">Echte stenen gooien</button>':'')+'<button class="btn" id="adtzeeChange">Andere combinatie (adtje)</button></div>';
              }
            } else if(T.throws>0){
              h+='<p class="hint">'+(T.changing?'Wisselen kost een adtje. Je worpen blijven staan: '+T.throws+' van 3 gebruikt.':'Kies waar je voor gaat. Daarna ligt het vast: wisselen kost een adtje.')+'</p>';
              h+=T.pick?pickHtml(T,p):gridHtml(T,p);
              if(T.changing&&!T.pick) h+='<div class="btnrow adtzee-row"><button class="btn" id="adtzeeKeep">Toch niet wisselen</button></div>';
            }
          }
        }
        h+=scoreHtml();
        if(G.log.length) h+='<div class="log">'+G.log.map(function(x){return '<div>'+esc(x)+'</div>';}).join("")+'</div>';
        h+='<div class="adtzee-lbl">Variërende regels (zelf af te spreken)</div><div class="seg adtzee-opts">'+
          '<button data-o="snel" aria-pressed="'+!!G.opt.snel+'">Niet alle worpen nodig: dubbel uitdelen</button>'+
          '<button data-o="laatste" aria-pressed="'+!!G.opt.laatste+'">Laatste op een combinatie: alles dubbel</button>'+
          '<button data-o="finale" aria-pressed="'+!!G.opt.finale+'">Laatste ronde alleen Adtzee: alles dubbel</button></div>';
        h+='<div class="btnrow adtzee-row"><button class="btn'+(ask?' danger':'')+'" id="adtzeeNew">'+(ask?'Zeker weten? Het scoreblad wordt gewist':'Nieuw spel')+'</button></div>';
        root.innerHTML=h;

        function on(id,fn){ var b=el(id); if(b) b.onclick=guard(fn); }
        var box=el("adtzeeDice");
        dice=null;
        if(box&&T){
          dice=A.Dice(box,{n:5, keepable:playing&&full&&left>0&&!lockHit,
            label:T.throws===0?"Gooi (worp 1 van 3)":!playing?"Kies eerst een combinatie":left<=0?"Drie worpen op":lockHit?"Gehaald":"Gooi de rest (worp "+(T.throws+1)+" van 3)",
            onRoll:guard(function(v,dg){ if(token===tick) onRoll(v,dg); }),
            onChange:function(v){ if(token!==tick||!G.turn||G.turn.deal) return; G.turn.vals=v; A.save(); },
            onKeep:function(k){ if(token!==tick||!G.turn) return; G.turn.kept=k; A.save(); if(dice) dice.lock(rollLocked()); }});
          dice.set(T.vals); dice.setKept(T.kept); dice.lock(rollLocked());
        }
        root.querySelectorAll("[data-c]").forEach(function(b){ b.onclick=guard(function(){ var c=b.getAttribute("data-c"); if(G.cols[T.p][c]) return; T.pick=bestSpec(c,T.vals); A.save(); render(); }); });
        root.querySelectorAll("[data-a]").forEach(function(b){ b.onclick=guard(function(){ var v=+b.getAttribute("data-a"), k=T.pick; if(!k) return; if(k.c==="fh"&&v===k.b) k.b=k.a; k.a=v; A.play("tick"); A.save(); render(); }); });
        root.querySelectorAll("[data-b]").forEach(function(b){ b.onclick=guard(function(){ var v=+b.getAttribute("data-b"), k=T.pick; if(!k) return; if(v===k.a) k.a=k.b; k.b=v; A.play("tick"); A.save(); render(); }); });
        on("adtzeeFix",fix);
        on("adtzeeBack",function(){ T.pick=null; A.save(); render(); });
        on("adtzeeKeep",function(){ T.changing=false; T.pick=null; A.save(); render(); });
        on("adtzeeChange",function(){ T.changing=true; T.pick=null; A.save(); render(); });
        on("adtzeeEnd",finish);
        on("adtzeeReal",function(){
          if(T.kept.every(Boolean)){ A.toast("Alle stenen liggen vast","Tik onder een steen om hem weer los te maken."); return; }
          T.prev=T.vals.slice(); T.vals=T.vals.map(function(v,i){ return T.kept[i]?v:null; }); T.await=true; A.save(); render();
        });
        on("adtzeeUndo",function(){ if(T.prev){ T.vals=T.prev; T.prev=null; T.await=false; } A.save(); render(); });
        root.querySelectorAll("[data-g]").forEach(function(b){ b.onclick=guard(function(){
          var Dl=T.deal, j, g, cur, r=0; if(!Dl) return;
          j=+b.getAttribute("data-j"); g=b.getAttribute("data-g"); cur=Dl.give[j]||0;
          A.others(T.p).forEach(function(x){ r+=Dl.give[x]||0; }); r=Dl.n-r;
          if(g==="all") Dl.give[j]=cur+Math.max(r,0); else if(g==="1"){ if(r>0) Dl.give[j]=cur+1; } else if(cur>0) Dl.give[j]=cur-1;
          A.play("tick"); A.save(); render();
        }); });
        on("adtzeeDeal",settle);
        on("adtzeeSkip",settle);
        root.querySelectorAll("[data-o]").forEach(function(b){ b.onclick=function(){ var k=b.getAttribute("data-o"); G.opt[k]=!G.opt[k]; A.save(); render(); }; });
        el("adtzeeNew").onclick=function(){
          var busy=!G.over&&(G.cols.some(function(c){ return Object.keys(c).length>0; })||(G.turn&&G.turn.throws>0));
          if(busy&&!ask){ sureNew=true; render(); return; }
          G.cols=null; G.names=null; G.turn=null; G.over=false; G.finale=false; G.log=[]; A.save(); render();
        };
      }

      render();
      this.refresh=render;
      /* een andere speler aangetikt: mag alleen als de huidige speler nog niet heeft gegooid (sync regelt dat) */
      this.onPlayer=function(i){
        var T=G.turn;
        if(T&&!G.over&&T.p!==i){
          if(T.throws>0||T.deal) A.toast(A.name(T.p)+" is nog bezig","Maak eerst deze beurt af.");
          else if(!openOf(i).length) A.toast(A.name(i)+" is al klaar","Alle combinaties zijn afgestreept.");
        }
        render();
      };
    },
    destroy:function(){ tick++; }
  });
})();
