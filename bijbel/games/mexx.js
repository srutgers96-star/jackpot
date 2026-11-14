/* ===== Mexx (met PowerMexx en Inverse Mexx) ===== */
(function(){
  var A=App, el=A.el, esc=A.esc, pct=A.pct;
  function score(a,b,inv){ var hi=Math.max(a,b), lo=Math.min(a,b); if(hi===2&&lo===1) return inv?0:1000; if(a===b) return inv?a*11:a*100; return inv?lo*10+hi:hi*10+lo; }
  function label(a,b,inv){ var hi=Math.max(a,b),lo=Math.min(a,b); if(hi===2&&lo===1)return "Mexx"; if(hi===3&&lo===1)return "31"; return inv?(lo*10+hi)+"":(a===b?a*100+"":hi*10+lo+""); }
  /* kans om boven t te eindigen met k worpen over; keep = mag nog een 1/2 laten liggen (true/false). Optimaal spel. */
  var memo={};
  function pBeat(t,k,keep,inv){
    var key=t+"|"+k+"|"+keep+"|"+inv; if(key in memo)return memo[key]; if(k===0)return 0;
    var tot=0;
    for(var a=1;a<=6;a++)for(var b=1;b<=6;b++){
      var hi=Math.max(a,b),lo=Math.min(a,b);
      if(hi===3&&lo===1) continue; /* 31 telt niet als worp: opnieuw, dus buiten de telling */
      var s=score(a,b,inv), best=(inv?s<t:s>t)?1:0;
      if(hi===2&&lo===1&&!inv){ tot+=1; continue; } /* mexx: beurt klaar, hoogste */
      if(k>1){ best=Math.max(best,pBeat(t,k-1,keep,inv)); if(keep&&(lo===1||lo===2)&&!inv) best=Math.max(best,pKeep(lo,t,k-1,inv)); }
      tot+=best;
    }
    return (memo[key]=tot/34);
  }
  function pKeep(k1,t,k,inv){ /* één steen vast (1 of 2), gooi de andere; daarna geen laten liggen meer */
    var key="K"+k1+"|"+t+"|"+k+"|"+inv; if(key in memo)return memo[key]; if(k===0)return 0; var tot=0;
    var cnt=0;
    for(var b=1;b<=6;b++){ var hi=Math.max(k1,b),lo=Math.min(k1,b); if(hi===3&&lo===1) continue; cnt++; var s=score(k1,b,inv); var best=(s>t)?1:0; if(hi===2&&lo===1){tot+=1;continue;} if(k>1) best=Math.max(best,pBeat(t,k-1,false,inv)); tot+=best; }
    return (memo[key]=tot/cnt);
  }
  A.register({ id:"mexx", beta:true, title:"Mexx", level:"app", kans:true, sub:"Scores, wie staat vast, Mexx-telling, kruk, kansen",
    init:function(root){
      var G=A.gs("mexx"); G.variant=G.variant||"normaal"; G.mexxStraf=G.mexxStraf||2;
      var R=null; /* ronde */
      function inv(){return G.variant==="inverse";}
      function power(){return G.variant==="power";}
      function newRound(start){ R={start:start, cur:start, turns:{}, maxThrows:power()?1:3, mexxCount:0, streak:[], done:false}; startTurn(); }
      function startTurn(){ R.t={throws:0, keptUsed:false, score:null, a:null, b:null, deal31:0}; render(); }
      var dice;
      function lowest(){ var lo=null; Object.keys(R.turns).forEach(function(i){ var s=R.turns[i].score; if(lo===null||(inv()?s>lo:s<lo))lo=s; }); return lo; }
      function onRoll(v){
        var a=v[0],b=v[1], t=R.t, hi=Math.max(a,b),lo=Math.min(a,b);
        A.kruk("mexx",v,R.cur); /* adtje kruk: elke worp telt, ook met een steen die bleef liggen */
        if(hi===3&&lo===1){ t.deal31++; A.play("ding"); A.overlay("info","31!",[A.name(R.cur)+" deelt een slok uit. Telt niet als worp."],1800); dice.clear(true); render(); return; }
        t.throws++; t.a=a; t.b=b; t.score=score(a,b,inv());
        var isMexx=hi===2&&lo===1, pm=power()&&a===3&&b===3;
        var vast=lowest(); var tieLow=vast!==null&&t.score===vast;
        if(isMexx||pm){ R.mexxCount+=pm?2:1; if(R.cur===R.start&&t.throws<R.maxThrows&&!power()) R.maxThrows=t.throws; A.play("win"); A.overlay("win",pm?"PowerMexx!":"Mexx!",[A.name(R.cur)+(pm?" gooit 3 3, telt als twee Mexx.":" gooit Mexx.")+" Verliezer drinkt straks "+(R.mexxCount*G.mexxStraf)+"."],2600); endTurn(); return; }
        if(tieLow){ A.play("dood"); A.overlay("info","Vast",[A.name(R.cur)+" gooit "+label(a,b,inv())+", gelijk aan de laagste. Beurt voorbij."],2200); endTurn(); return; }
        if(t.throws>=R.maxThrows){ endTurn(); return; }
        render();
      }
      function endTurn(){ var t=R.t; R.turns[R.cur]={score:t.score,a:t.a,b:t.b,throws:t.throws};
        var nxt=(R.cur+1)%A.S.players.length;
        if(nxt===R.start){ finishRound(); return; }
        R.cur=nxt; A.S.active=nxt; A.save(); A.renderPlayers(); startTurn();
      }
      function finishRound(){
        R.done=true; var lo=lowest(); var losers=Object.keys(R.turns).filter(function(i){return R.turns[i].score===lo;}).map(Number);
        var straf=R.mexxCount?R.mexxCount*G.mexxStraf:1;
        if(losers.length>1){ R.tie=losers; render(); return; }
        settle(losers[0],straf);
      }
      function settle(loser,straf){
        A.drink(loser,straf); A.play("dood");
        var lbl=R.turns[loser]?label(R.turns[loser].a,R.turns[loser].b,inv()):"";
        A.overlay("dood","Dood!",[A.name(loser)+" is laag met "+lbl+". Drink "+straf+" "+(straf===1?"slok":"slokken")+".",R.mexxCount?R.mexxCount+"x Mexx deze ronde.":"Geen Mexx deze ronde."],0);
        A.onOverlayClose(function(){ A.S.active=loser; A.save(); A.renderPlayers(); newRound(loser); });
        R.settled=true; render();
      }
      /* tie-break: elke speler gooit één keer, laagste verliest */
      var tieDice=null;
      function render(){
        var p=A.S.players, lo=lowest(), t=R.t, k=R.maxThrows-t.throws;
        var h='<div class="board"><table class="score"><tr><th>speler</th><th>worp</th><th>score</th><th>worpen</th></tr>';
        p.forEach(function(q,i){ var tr=R.turns[i]; h+='<tr'+(i===R.cur&&!R.done?' class="cur"':'')+'><td>'+esc(q.name)+'</td><td>'+(tr?A.dicerowSmall([tr.a,tr.b]):(i===R.cur&&t.a?A.dicerowSmall([t.a,t.b]):'–'))+'</td><td>'+(tr?label(tr.a,tr.b,inv()):(i===R.cur&&t.a?label(t.a,t.b,inv()):'–'))+(tr&&tr.score===lo?' <span class="kans" style="color:var(--ivory-dim);font-size:11px">laag</span>':'')+'</td><td>'+(tr?tr.throws:'')+'</td></tr>'; });
        h+='</table><div class="stat"><span>Mexx deze ronde: <b>'+R.mexxCount+'</b></span><span>Max worpen: <b>'+R.maxThrows+'</b></span>'+(lo!==null?'<span>Vast: <b>'+Object.keys(R.turns).map(function(i){return R.turns[i];}).filter(function(x){return x.score===lo;}).map(function(x){return label(x.a,x.b,inv());})[0]+'</b></span>':'')+'</div></div>';
        if(R.tie){
          h+='<div class="verdict neutral"><h2>Gelijk laag</h2><p>'+esc(A.joinNames(R.tie))+' staan samen laag. Extra ronde: ieder één worp, laagste verliest.</p><div id="tie"></div></div>';
        } else if(!R.done){
          h+='<p class="hint">'+esc(A.name(R.cur))+' is aan de beurt, worp '+(t.throws+1)+' van '+R.maxThrows+(t.deal31?' (31 uitgedeeld: '+t.deal31+')':'')+'</p><div id="dicebox"></div>';
          if(t.a){ var cur=t.score, pb=lo===null?null:pBeat(lo,k,!t.keptUsed&&!power(),inv());
            h+='<div class="opts">';
            h+='<button class="opt'+(k>0?'':' best')+'" id="stop"><span class="num">'+label(t.a,t.b,inv())+'</span><span class="lbl">Laten staan<small>beurt klaar</small></span><span class="odds kans">'+(lo===null?'eerste score':(cur===lo?'gelijk aan laag':(inv()?cur<lo:cur>lo)?'boven laag':'LAAG'))+'</span></button>';
            if(k>0){ h+='<button class="opt" id="again"><span class="num">⟳</span><span class="lbl">Opnieuw gooien<small>beide stenen, nog '+k+'</small></span><span class="odds kans">'+(lo===null?'':'<b>'+pct(pBeat(lo,k,!t.keptUsed&&!power(),inv()),0)+'</b>boven laag')+'</span></button>';
              if(!power()&&!inv()&&!t.keptUsed){ [t.a,t.b].forEach(function(d,idx){ if(d===1||d===2){ h+='<button class="opt" data-keep="'+idx+'"><span class="num">'+d+'</span><span class="lbl">De '+d+' laten liggen<small>andere steen opnieuw</small></span><span class="odds kans">'+(lo===null?'':'<b>'+pct(pKeep(d,lo,k,inv()),0)+'</b>boven laag')+'</span></button>'; } }); }
            }
            h+='</div>';
          }
        }
        h+='<div class="seg" style="margin-top:14px"><button data-var="normaal" aria-pressed="'+(G.variant==="normaal")+'">Mexx</button><button data-var="power" aria-pressed="'+(G.variant==="power")+'">PowerMexx</button><button data-var="inverse" aria-pressed="'+(G.variant==="inverse")+'">Inverse</button></div>';
        h+='<div class="seg"><span style="font-size:12px;color:var(--ivory-dim);align-self:center">per Mexx:</span><button data-s="2" aria-pressed="'+(G.mexxStraf===2)+'">2 slokken</button><button data-s="3" aria-pressed="'+(G.mexxStraf===3)+'">3</button><button data-s="4" aria-pressed="'+(G.mexxStraf===4)+'">half adtje (4)</button></div>';
        h+='<div class="btnrow"><button class="btn" id="newRound">Nieuwe ronde</button></div>';
        root.innerHTML=h;
        if(!R.done&&!R.tie){
          dice=A.Dice(el("dicebox"),{n:2,onRoll:onRoll,label:"Dobbel"});
          if(t.a){ dice.set([t.a,t.b]); dice.lock(true); }
          var st=el("stop"); if(st)st.onclick=function(){ endTurn(); };
          var ag=el("again"); if(ag)ag.onclick=function(){ dice.clear(false); dice.lock(false); t.a=null;t.b=null;t.score=null; render(); };
          root.querySelectorAll("[data-keep]").forEach(function(b){ b.onclick=function(){ var idx=+b.getAttribute("data-keep"); t.keptUsed=true; var kept=[idx===0,idx===1]; dice.setKept(kept); dice.clear(true); dice.lock(false); t.a=null;t.b=null;t.score=null; render(); dice.setKept(kept); dice.clear(true); }; });
        }
        if(R.tie){ renderTie(); }
        root.querySelectorAll("[data-var]").forEach(function(b){ b.onclick=function(){ G.variant=b.getAttribute("data-var"); A.save(); newRound(R.start); }; });
        root.querySelectorAll("[data-s]").forEach(function(b){ b.onclick=function(){ G.mexxStraf=+b.getAttribute("data-s"); A.save(); render(); }; });
        el("newRound").onclick=function(){ newRound(A.S.active); };
      }
      function renderTie(){
        R.tieRolls=R.tieRolls||{}; var box=el("tie"), i=R.tie.filter(function(x){return !(x in R.tieRolls);})[0];
        if(i===undefined){ var lo=null,loser=null; R.tie.forEach(function(x){ var s=R.tieRolls[x]; if(lo===null||s<lo){lo=s;loser=x;} }); var straf=R.mexxCount?R.mexxCount*G.mexxStraf:1; R.tie=null; settle(loser,straf); return; }
        box.innerHTML='<p class="hint">'+esc(A.name(i))+' gooit</p><div id="tiedice"></div>'+Object.keys(R.tieRolls).map(function(x){return '<div class="hint">'+esc(A.name(+x))+': '+R.tieRolls[x]+' ogen</div>';}).join("");
        A.Dice(el("tiedice"),{n:2,onRoll:function(v){ R.tieRolls[i]=v[0]+v[1]; renderTie(); }});
      }
      
      newRound(A.S.active);
      this.refresh=render;
    }
  });
})();
