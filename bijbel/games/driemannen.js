/* ===== Driemannen ===== */
(function(){
  var A=App, el=A.el, esc=A.esc;
  A.register({ id:"driemannen", beta:true, title:"Driemannen", level:"app", sub:"Wie is de Drieman, wie drinkt, hoeveel",
    init:function(root){
      var G=A.gs("driemannen"); G.log=G.log||[]; if(G.drieman===undefined)G.drieman=null; G.dubbel=!!G.dubbel; G.v789=!!G.v789;
      var dice;
      function roll(v){ A.kruk("driemannen",v,A.S.active);
        var a=v[0],b=v[1], i=A.S.active, n=A.S.players.length, prev=(i-1+n)%n, next=(i+1)%n, sum=a+b, ev=[], big=null;
        var isDM=G.drieman===i;
        if((a===1&&b===2)||(a===2&&b===1)){
          if(isDM&&G.vDubbel){ G.dubbel=true; ev.push("Dubbele Drieman! "+A.name(i)+" drinkt nu 2 per 3."); big=["Dubbele Drieman!",A.name(i)]; }
          else { G.drieman=i; G.dubbel=false; ev.push(A.name(i)+" is de nieuwe Drieman."); big=["Nieuwe Drieman!","Ja-la la-la-la la-la, "+A.name(i)]; }
        }
        var threes=(a===3?1:0)+(b===3?1:0);
        if(a===3&&b===3){ if(G.drieman!==null){ ev.push("3 3: de Drieman ("+A.name(G.drieman)+") deelt "+(G.dubbel?20:10)+" slokken uit."); } else ev.push("3 3 zonder Drieman: "+A.name(i)+" deelt 6 slokken uit."); }
        else if(a===b){ ev.push("Dubbel "+a+": "+A.name(i)+" deelt "+sum+" slokken uit."); }
        if(threes&&G.drieman!==null&&!(a===3&&b===3)){ var d=threes*(G.dubbel?2:1); A.drink(G.drieman,d); ev.push("Drieman "+A.name(G.drieman)+" drinkt "+d+" ("+threes+"x een 3)."); }
        var lo=G.v789?[7,8,9]:[7,9,11];
        if(sum===lo[0]){ A.drink(prev,1); ev.push(sum+": "+A.name(prev)+" (voor jou) drinkt 1."); }
        if(sum===lo[1]){ A.drink(i,1); ev.push(sum+": "+A.name(i)+" drinkt zelf 1."); }
        if(sum===lo[2]){ A.drink(next,1); ev.push(sum+": "+A.name(next)+" (na jou) drinkt 1."); }
        if(!ev.length) ev.push("Niets. Volgende.");
        G.log.unshift({who:A.name(i),a:a,b:b,ev:ev}); if(G.log.length>30)G.log.length=30; A.save();
        if(big){ A.play("special"); A.overlay("win",big[0],[big[1]],3200); } else { A.play(ev.length>1||ev[0]!=="Niets. Volgende."?"ding":"tick"); }
        A.nextPlayer(); render(); 
      }
      function render(){
        var h='<div class="board"><div class="stat"><span>Drieman: <b>'+(G.drieman===null?"nog niemand":esc(A.name(G.drieman))+(G.dubbel?" (dubbel)":""))+'</b></span><span>'+(G.v789?'7 / 8 / 9':'7 / 9 / 11')+'</span></div></div>';
        h+='<p class="hint">'+esc(A.name(A.S.active))+' gooit</p><div id="dicebox"></div>';
        h+='<div class="seg"><button id="t789" aria-pressed="'+G.v789+'">7, 8, 9 in plaats van 7, 9, 11</button><button id="tdub" aria-pressed="'+!!G.vDubbel+'">dubbele Drieman</button></div>';
        h+='<div class="log">'+G.log.map(function(x){ return '<div><b>'+esc(x.who)+'</b> '+x.a+' '+x.b+': '+esc(x.ev.join(" "))+'</div>'; }).join("")+'</div>';
        h+='<div class="btnrow"><button class="btn" id="reset">Opnieuw (geen Drieman)</button></div>';
        root.innerHTML=h;
        dice=A.Dice(el("dicebox"),{n:2,onRoll:roll});
        el("t789").onclick=function(){G.v789=!G.v789;A.save();render();};
        el("tdub").onclick=function(){G.vDubbel=!G.vDubbel;A.save();render();};
        el("reset").onclick=function(){G.drieman=null;G.dubbel=false;G.log=[];A.save();render();};
      }
      render(); this.onPlayer=render;
    }
  });
})();
