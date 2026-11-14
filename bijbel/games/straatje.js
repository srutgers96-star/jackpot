/* ===== Straatje Leggen ===== */
(function(){
  var A=App, el=A.el, esc=A.esc, pct=A.pct;
  /* kans om met m stenen in k worpen de resterende r verschillende waarden (uit een set van r) te halen, optimaal houdend */
  var memo={};
  function pFill(r,k,m){ /* r needed distinct values still missing, k throws left, m dice available to roll (m>=r) */
    if(r===0)return 1; if(k===0)return 0; var key=r+"|"+k+"|"+m; if(key in memo)return memo[key];
    /* roll m dice; number of distinct needed values hit j: distribution via inclusion-exclusion on r values out of 6 */
    var tot=0, total=Math.pow(6,m);
    for(var j=0;j<=r;j++){ var ways=0; /* exactly j of the r needed values appear among m dice */
      var C=function(n,k){ var x=1; for(var i=0;i<k;i++)x=x*(n-i)/(i+1); return x; };
      /* count = C(r,j) * sum_{t=0..j} (-1)^t C(j,t) (6-r+j-t)^m */
      for(var t=0;t<=j;t++) ways+=Math.pow(-1,t)*C(j,t)*Math.pow(6-r+j-t,m);
      ways*=C(r,j); tot+=ways/total*pFill(r-j,k-1,m-j); }
    return (memo[key]=tot);
  }
  A.register({ id:"straatje", beta:true, title:"Straatje Leggen", level:"app", kans:true, sub:"Vier stenen, drie worpen, kans per straat",
    init:function(root){
      var dice, st={throws:0, vals:null, target:null, kept:[false,false,false,false]};
      var TARGETS=[[1,2,3,4],[2,3,4,5],[3,4,5,6]];
      function missing(vals,T){ return T.filter(function(x){return vals.indexOf(x)<0;}); }
      function render(){
        var i=A.S.active, h='<p class="hint">'+esc(A.name(i))+', worp '+Math.min(st.throws+1,3)+' van 3</p><div id="dicebox"></div>';
        if(st.vals){ h+='<div class="opts">';
          TARGETS.forEach(function(T,ti){ var miss=missing(st.vals,T), k=3-st.throws, pr=pFill(miss.length,k,4-(4-miss.length)), hi=T[3];
            /* dice available to roll = 4 - (distinct needed held) */
            pr=pFill(miss.length,k,miss.length+ (4-T.length) );
            h+='<button class="opt'+(st.target===ti?' best':'')+'" data-t="'+ti+'"><span class="num">'+T[0]+'-'+T[3]+'</span><span class="lbl">'+(miss.length?'mist '+miss.join(", "):'compleet')+'<small>raak: '+hi+' uitdelen</small></span><span class="odds kans">'+(miss.length?'<b>'+pct(pr,0)+'</b>in '+k+(k===1?' worp':' worpen'):'<b>klaar</b>')+'</span></button>'; });
          h+='</div>';
          if(st.throws>=3||st.target!==null&&!missing(st.vals,TARGETS[st.target]).length) h+='<div class="btnrow"><button class="btn gold" id="finish">Beurt afronden</button></div>';
        }
        root.innerHTML=h;
        dice=A.Dice(el("dicebox"),{n:4,keepable:true,onRoll:function(v){ st.throws++; st.vals=v; autoKeep(); render(); },onKeep:function(k){st.kept=k;}});
        if(st.vals){ dice.set(st.vals); dice.setKept(st.kept); }
        if(st.throws>=3) dice.lock(true);
        root.querySelectorAll("[data-t]").forEach(function(b){ b.onclick=function(){ st.target=+b.getAttribute("data-t"); autoKeep(); render(); }; });
        var f=el("finish"); if(f) f.onclick=finish;
      }
      function autoKeep(){ if(st.target===null||!st.vals)return; var T=TARGETS[st.target], seen={}; st.kept=st.vals.map(function(v){ if(T.indexOf(v)>=0&&!seen[v]){seen[v]=1;return true;} return false; }); }
      function finish(){
        var i=A.S.active; if(st.target===null){ /* kies beste straat */ var best=0,bm=9; TARGETS.forEach(function(T,ti){ var m=missing(st.vals,T).length; if(m<bm){bm=m;best=ti;} }); st.target=best; }
        var T=TARGETS[st.target], miss=missing(st.vals,T);
        if(!miss.length){ var n=T[3]; A.play("win"); A.overlay("win","Straat!",[A.name(i)+" legt "+T[0]+" tot "+T[3]+" en deelt "+n+" slokken uit."],0,A.dicerow(st.vals)); }
        else { var sum=miss.reduce(function(a,b){return a+b;},0), n2=Math.ceil(sum/2); A.drink(i,n2); A.play("dood"); A.overlay("dood","Mis",[A.name(i)+" mist "+miss.join(" en ")+". Drink "+n2+"."],0,A.dicerow(st.vals)); }
        A.onOverlayClose(function(){ st={throws:0,vals:null,target:null,kept:[false,false,false,false]}; A.nextPlayer(); render(); });
      }
      render(); this.refresh=render; this.onPlayer=function(){ st={throws:0,vals:null,target:null,kept:[false,false,false,false]}; render(); };
    }
  });
})();
