/* ===== Straatje Leggen =====
   Bijbel: vier stenen, drie worpen. Na de eerste worp noemt de speler zijn straat (1-4, 2-5 of 3-6); wisselen mag
   tijdens de beurt. Gehaald: hoogste oog van de straat in slokken uitdelen (verdelen mag). Niet gehaald: de helft
   van de ogen van de ontbrekende stenen drinken, naar boven afgerond. Daarna schuift de beurt met de klok mee door.
   Keuzes waar de tekst niets over zegt (de natuurlijke lezing):
   - stenen die bij de straat passen blijven liggen (anders valt er niets te "leggen"); de speler mag zelf wisselen;
   - meerdere ontbrekende stenen: ogen eerst optellen, dan halveren en naar boven afronden;
   - na de derde worp ligt de genoemde straat vast (het voorbeeld van speler C: 6-4-3-1 voor 3-6 kost 3 slokken,
     niet 1 slok via 1-4), tot en met de tweede worp mag de speler wisselen;
   - ligt de straat er al eerder, dan mag de speler meteen afronden of voor een andere straat doorgooien.
   Vier stenen: de regel "adtje kruk" (alleen bij twee stenen) geldt hier niet. */
(function(){
  var A=App, el=A.el, esc=A.esc, pct=A.pct;
  var TARGETS=[[1,2,3,4],[2,3,4,5],[3,4,5,6]];
  var inst=null; /* het lopende scherm: {refresh,onPlayer,destroy} */

  /* kans om met m stenen in k worpen de r nog ontbrekende ogen te gooien, als elke goede steen blijft liggen */
  var memo={};
  function comb(n,k){ var x=1; for(var i=0;i<k;i++)x=x*(n-i)/(i+1); return x; }
  function pFill(r,k,m){
    if(r<=0)return 1; if(k<=0||m<r)return 0;
    var key=r+"|"+k+"|"+m; if(key in memo)return memo[key];
    var tot=0, total=Math.pow(6,m);
    for(var j=0;j<=r;j++){ var ways=0; /* precies j van de r gezochte ogen vallen */
      for(var t=0;t<=j;t++) ways+=Math.pow(-1,t)*comb(j,t)*Math.pow(6-r+j-t,m);
      tot+=comb(r,j)*ways/total*pFill(r-j,k-1,m-j); }
    return (memo[key]=tot);
  }
  function sl(n){ return n+" "+(n===1?"slok":"slokken"); }
  function missing(vals,T){ return T.filter(function(x){return vals.indexOf(x)<0;}); }
  function sum(a){ return a.reduce(function(x,y){return x+(y||0);},0); }
  function isDie(v){ return v===1||v===2||v===3||v===4||v===5||v===6; }
  function full(vals){ return vals.every(isDie); }
  function straf(miss){ return Math.ceil(sum(miss)/2); }
  function lijst(a){ return A.joinNames(a.map(String)); }
  function css(){
    if(document.getElementById("straatje-css"))return;
    var s=document.createElement("style"); s.id="straatje-css";
    s.textContent=".straatje-dice .dice{gap:6px}"+
      ".straatje-dice .keep{min-height:40px;min-width:66px;padding:2px 4px}"+
      ".straatje-opt{min-height:56px}.straatje-opt .lbl{min-width:0;overflow-wrap:anywhere}"+
      ".straatje-opt.straatje-sel{border-color:var(--gold);background:rgba(231,184,79,.12)}"+
      ".straatje-opt:disabled{opacity:.45}.straatje-opt.straatje-sel:disabled{opacity:1}"+
      ".straatje-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:stretch;margin-top:8px}"+
      ".straatje-row .btn{min-height:48px;border-radius:10px}"+
      ".straatje-btn{min-height:44px}";
    document.head.appendChild(s);
  }

  A.register({ id:"straatje", beta:true, title:"Straatje Leggen", level:"app", kans:true, sub:"Vier stenen, drie worpen, straat noemen en uitdelen",
    refresh:function(){ if(inst)inst.refresh(); },
    onPlayer:function(i){ if(inst)inst.onPlayer(i); },
    destroy:function(){ if(inst)inst.destroy(); inst=null; },
    init:function(root){
      css();
      var G=A.gs("straatje"), dice=null, gen=0, busy=false, dead=false;
      if(!Array.isArray(G.log))G.log=[];

      function newTurn(){
        var i=A.S.active;
        G.t={who:i, name:A.name(i), np:A.S.players.length, throws:0, vals:[null,null,null,null], kept:[false,false,false,false],
          target:null, entering:true, prev:null, phase:"roll", give:null};
        A.save();
      }
      function validTurn(t){
        return !!t&&typeof t==="object"&&(t.throws===0||t.throws===1||t.throws===2||t.throws===3)&&
          Array.isArray(t.vals)&&t.vals.length===4&&t.vals.every(function(v){return v===null||isDie(v);})&&
          Array.isArray(t.kept)&&t.kept.length===4&&(t.target===null||t.target===0||t.target===1||t.target===2)&&
          (t.phase==="roll"||t.phase==="deal")&&typeof t.who==="number";
      }
      /* brengt de bewaarde beurt in lijn met de spelerslijst van nu (speler erbij of eraf, andere speler aangetikt, oude opslag) */
      function sync(){
        var n=A.S.players.length;
        if(!(A.S.active>=0&&A.S.active<n&&Math.floor(A.S.active)===A.S.active)){ A.S.active=0; A.save(); A.renderPlayers(); }
        var t=G.t;
        if(!validTurn(t)){ newTurn(); return; }
        if(t.np!==n){
          /* bij verwijderen schuiven de nummers op: dezelfde naam op de actieve plek betekent dezelfde beurt */
          if(n<t.np){ if(A.name(A.S.active)===t.name) t.who=A.S.active; else { newTurn(); return; } }
          t.np=n; t.give=null;
        }
        if(t.who!==A.S.active){ newTurn(); return; }
        t.name=A.name(t.who);
        t.kept=t.kept.map(function(k,x){ return !!k&&t.vals[x]!==null; });
        if(t.throws===0){ t.target=null; t.entering=true; t.prev=null; }
        if(!full(t.vals)) t.entering=true;
        else if(t.entering){ if(t.throws<3)t.throws++; t.entering=false; t.prev=null; }
        if(t.phase==="deal"){
          if(t.target===null||missing(t.vals,TARGETS[t.target]).length){ t.phase="roll"; t.give=null; }
          else {
            var tot=TARGETS[t.target][3], ok=Array.isArray(t.give)&&t.give.length===n&&!t.give[t.who]&&
              t.give.every(function(g){return typeof g==="number"&&g>=0&&Math.floor(g)===g;})&&sum(t.give)<=tot;
            if(!ok){ t.give=A.S.players.map(function(){return 0;}); var oth=A.others(t.who); if(oth.length===1)t.give[oth[0]]=tot; }
          }
        }
      }
      function canRoll(t){ return t.phase==="roll"&&t.throws<3&&(t.throws===0||t.target!==null)&&t.kept.some(function(k){return !k;}); }
      function canFinish(t){ return t.phase==="roll"&&t.throws>=1&&!t.entering&&t.target!==null&&full(t.vals)&&(t.throws>=3||!missing(t.vals,TARGETS[t.target]).length); }
      /* één steen per oog van de genoemde straat blijft liggen */
      function autoKeep(t){
        if(t.target===null)return; var T=TARGETS[t.target], seen={};
        t.kept=t.vals.map(function(v){ if(v!==null&&T.indexOf(v)>=0&&!seen[v]){ seen[v]=1; return true; } return false; });
      }
      function hintText(t){
        if(t.throws===0) return "Tik op Dobbel. Zelf gegooid? Tik op een steen en vul de ogen in.";
        if(t.target===null) return "Kies hieronder voor welke straat je gaat.";
        var T=TARGETS[t.target], miss=missing(t.vals,T), naam=T[0]+" t/m "+T[3];
        if(t.entering) return "Tik op een ? en vul in wat je gooide (worp "+(t.throws+1)+" van 3).";
        if(!miss.length) return "Straat "+naam+" ligt er! Tik op Beurt afronden en deel "+sl(T[3])+" uit."+(t.throws<3?" Of kies een andere straat en gooi door.":"");
        if(t.throws>=3) return "Drie worpen op. Je mist "+lijst(miss)+" en drinkt "+sl(straf(miss))+". Tik op Beurt afronden.";
        if(!canRoll(t)) return "Alle stenen staan vast. Tik onder een steen op vast om hem los te maken.";
        return "Je gaat voor "+naam+" en mist "+lijst(miss)+". Goud blijft liggen: tik op Dobbel, of kies een andere straat.";
      }

      function render(){
        if(dead)return;
        gen++; var my=gen; dice=null;
        sync();
        var t=G.t, i=t.who, h="";
        if(A.S.players.length<2){ root.innerHTML='<p class="hint">Straatje Leggen speel je met minstens twee spelers. Tik bovenaan op + speler.</p>'; return; }
        if(t.phase==="deal"){
          var T=TARGETS[t.target], tot=T[3], left=tot-sum(t.give), oth=A.others(i);
          h+='<div class="verdict win"><h2>Straat!</h2><p><b>'+esc(A.name(i))+'</b> legt '+T[0]+' t/m '+T[3]+' en mag '+sl(tot)+' uitdelen.</p>'+A.dicerowSmall(t.vals)+'</div>';
          h+='<p class="hint" id="straatje-hint">'+esc(left>0?"Tik op wie een slok krijgt. Nog "+sl(left)+" te verdelen.":
            (oth.length===1&&t.give[oth[0]]===tot?"Alle "+sl(tot)+" gaan naar "+A.name(oth[0])+". Tik op Uitdelen.":"Alles is verdeeld. Tik op Uitdelen."))+'</p>';
          oth.forEach(function(j){
            h+='<div class="straatje-row"><button class="opt straatje-opt'+(t.give[j]?' straatje-sel':'')+'" data-g="'+j+'"'+(left>0?'':' disabled')+'><span class="num">'+t.give[j]+'</span><span class="lbl">'+esc(A.name(j))+'<small>tik voor een slok erbij</small></span><span class="odds">+1</span></button>'+
              '<button class="btn" data-all="'+j+'"'+(left>0?'':' disabled')+'>de rest</button></div>';
          });
          h+='<div class="btnrow"><button class="btn straatje-btn" id="straatje-reset">Opnieuw verdelen</button><button class="btn gold straatje-btn" id="straatje-ok"'+(left>0?' disabled':'')+'>Uitdelen</button></div>';
        } else {
          var k=3-t.throws;
          h+='<div class="stat"><span>Aan de beurt: <b>'+esc(A.name(i))+'</b></span><span>Worpen gedaan: <b>'+t.throws+'</b> van 3</span></div>';
          h+='<p class="hint" id="straatje-hint">'+esc(hintText(t))+'</p><div id="straatje-dice" class="straatje-dice"></div>';
          var extra="";
          if(canFinish(t)) extra+='<button class="btn gold straatje-btn" id="straatje-finish">Beurt afronden</button>';
          if(t.throws>=1&&t.entering&&t.prev) extra+='<button class="btn straatje-btn" id="straatje-back">Terug naar de vorige worp</button>';
          else if(t.throws>=1&&!t.entering&&canRoll(t)) extra+='<button class="btn straatje-btn" id="straatje-man">Zelf gegooid: ogen invullen</button>';
          if(extra) h+='<div class="btnrow">'+extra+'</div>';
          if(t.throws>=1){
            var locked=t.throws>=3&&t.target!==null;
            h+='<div class="opts">';
            TARGETS.forEach(function(T,ti){
              var miss=missing(t.vals,T), pr=pFill(miss.length,k,miss.length);
              h+='<button class="opt straatje-opt'+(t.target===ti?' straatje-sel':'')+'" data-t="'+ti+'"'+(locked?' disabled':'')+'><span class="num">'+T[0]+'-'+T[3]+'</span>'+
                '<span class="lbl">'+(miss.length?'mist '+lijst(miss):'ligt er')+'<small>gehaald: '+T[3]+' uitdelen'+(miss.length?' · niet gehaald: '+straf(miss)+' drinken':'')+'</small></span>'+
                '<span class="odds kans">'+(miss.length?(k>0?'<b>'+pct(pr,0)+'</b>in '+k+(k===1?' worp':' worpen'):'<b>mis</b>'):'<b>klaar</b>')+'</span></button>';
            });
            h+='</div>';
          }
        }
        if(G.log.length) h+='<div class="log">'+G.log.map(function(l){return '<div>'+esc(l)+'</div>';}).join("")+'</div>';
        h+='<div class="btnrow"><button class="btn straatje-btn" id="straatje-new">Nieuw spel</button></div>';
        root.innerHTML=h;

        if(t.phase==="deal"){
          root.querySelectorAll("[data-g]").forEach(function(b){ b.onclick=function(){ give(+b.getAttribute("data-g"),1); }; });
          root.querySelectorAll("[data-all]").forEach(function(b){ b.onclick=function(){ give(+b.getAttribute("data-all"),99); }; });
          el("straatje-reset").onclick=function(){ var t=G.t; if(t.phase!=="deal")return; t.give=A.S.players.map(function(){return 0;}); A.save(); render(); };
          el("straatje-ok").onclick=deal;
        } else {
          var box=el("straatje-dice");
          dice=A.Dice(box,{n:4, keepable:true, label:t.throws>=3?"Drie worpen gedaan":"Dobbel: worp "+(t.throws+1)+" van 3",
            onChange:function(v){ if(my!==gen||dead)return; G.t.vals=v.slice(); A.save(); },
            onRoll:function(v,digital){ if(my!==gen||dead)return; onRoll(v,digital); },
            onKeep:function(kp){ if(my!==gen||dead)return; G.t.kept=kp.slice(); A.save(); if(!busy)render(); }});
          dice.set(t.vals); dice.setKept(t.kept); dice.lock(!canRoll(t));
          /* tijdens het rollen (ruim een halve seconde) geen andere knoppen: anders gaat de worp verloren */
          var rb=box.querySelector?box.querySelector(".roll"):null;
          if(rb&&rb.addEventListener) rb.addEventListener("click",function(){ if(my===gen&&!rb.disabled)busy=true; });
          root.querySelectorAll("[data-t]").forEach(function(b){ b.onclick=function(){ pickTarget(+b.getAttribute("data-t")); }; });
          var f=el("straatje-finish"); if(f) f.onclick=finish;
          var m=el("straatje-man"); if(m) m.onclick=manual;
          var bk=el("straatje-back"); if(bk) bk.onclick=back;
        }
        el("straatje-new").onclick=function(){ if(busy)return; G.log=[]; newTurn(); render(); };
      }

      function onRoll(v,digital){
        busy=false; var t=G.t;
        if(!validTurn(t)||t.who!==A.S.active||t.phase!=="roll"){ render(); return; } /* tijdens het rollen is er van speler gewisseld */
        t.vals=v.slice();
        /* een worp telt bij de digitale knop en na het invullen van lege stenen; een los verbeterde steen is geen worp */
        if((digital||t.entering)&&t.throws<3){ t.throws++; t.prev=null; }
        t.entering=false;
        autoKeep(t); A.save(); render();
      }
      function pickTarget(ti){
        var t=G.t; if(busy||t.phase!=="roll"||t.throws<1||!TARGETS[ti])return;
        if(t.throws>=3&&t.target!==null)return; /* na de derde worp ligt de genoemde straat vast */
        t.target=ti; autoKeep(t); A.save(); render();
      }
      function manual(){
        var t=G.t; if(busy||!canRoll(t)||t.entering)return;
        t.prev=t.vals.slice(); t.vals=t.vals.map(function(v,x){return t.kept[x]?v:null;}); t.entering=true; A.save(); render();
      }
      function back(){
        var t=G.t; if(busy||!t.entering||!t.prev)return;
        t.vals=t.prev.slice(); t.prev=null; t.entering=false; autoKeep(t); A.save(); render();
      }
      function logLine(s){ G.log.unshift(s); if(G.log.length>5)G.log.length=5; }
      function finish(){
        var t=G.t; if(busy||!canFinish(t))return;
        var i=t.who, T=TARGETS[t.target], miss=missing(t.vals,T), vals=t.vals.slice();
        if(!miss.length){ /* gehaald: eerst aantikken wie de slokken krijgt */
          t.phase="deal"; t.give=null; A.save(); A.play("win"); render(); return;
        }
        var n=straf(miss), wie=A.name(i);
        A.drink(i,n);
        logLine(wie+" miste "+lijst(miss)+" voor straat "+T[0]+"-"+T[3]+": "+sl(n)+" gedronken.");
        /* eerst de beurt doorschuiven en bewaren, dan pas de melding: zo blijft er nooit een scherm zonder knop achter */
        A.nextPlayer(); newTurn(); render();
        A.play("dood");
        A.overlay("dood","Mis!",[wie+" mist "+lijst(miss)+" en drinkt "+sl(n)+".","Daarna is "+A.name(A.S.active)+" aan de beurt."],0,A.dicerow(vals));
        A.onOverlayClose(null);
      }
      function give(j,n){
        var t=G.t; if(t.phase!=="deal"||!Array.isArray(t.give)||j===t.who||!A.S.players[j])return;
        var left=TARGETS[t.target][3]-sum(t.give); if(left<=0)return;
        t.give[j]+=Math.min(n,left); A.save(); A.play("tick"); render();
      }
      function deal(){
        var t=G.t; if(t.phase!=="deal"||!Array.isArray(t.give))return;
        var T=TARGETS[t.target], tot=T[3]; if(sum(t.give)!==tot)return;
        var i=t.who, wie=A.name(i), vals=t.vals.slice(), lines=[wie+" deelt "+sl(tot)+" uit."], kort=[];
        t.give.forEach(function(g,j){ if(g>0&&A.S.players[j]){ A.drink(j,g); lines.push(A.name(j)+" drinkt "+sl(g)+"."); kort.push(A.name(j)+" "+g); } });
        logLine(wie+" legde straat "+T[0]+"-"+T[3]+" en deelde "+sl(tot)+" uit: "+kort.join(", ")+".");
        A.nextPlayer(); newTurn(); render();
        A.play("ding");
        lines.push("Daarna is "+A.name(A.S.active)+" aan de beurt.");
        A.overlay("win","Straat!",lines,0,A.dicerow(vals));
        A.onOverlayClose(null);
      }

      inst={
        refresh:function(){ if(!busy)render(); },
        /* een naam bovenaan aantikken: tijdens het uitdelen telt dat als een slok voor die speler, anders begint die speler een nieuwe beurt */
        onPlayer:function(j){
          var t=G.t;
          if(validTurn(t)&&t.phase==="deal"&&t.np===A.S.players.length&&A.S.players[t.who]){
            A.S.active=t.who; A.save(); A.renderPlayers();
            if(j!==t.who&&Array.isArray(t.give)&&TARGETS[t.target][3]-sum(t.give)>0){ give(j,1); return; }
            render(); return;
          }
          if(!busy)render(); /* sync() ziet de andere speler en begint een nieuwe beurt */
        },
        destroy:function(){ dead=true; busy=false; gen++; }
      };
      render();
    }
  });
})();
