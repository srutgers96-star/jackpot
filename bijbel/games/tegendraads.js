/* ===== Tegendraads ===== */
(function(){
  var A=App, el=A.el, esc=A.esc, pct=A.pct;
  /* verdeling van de som van twee dobbelstenen */
  var P2=[]; for(var s=0;s<=12;s++)P2[s]=0; for(var a=1;a<=6;a++)for(var b=1;b<=6;b++)P2[a+b]+=1/36;
  function expect(first,pred,half){ /* verwachte slokken (negatief = uitdelen) */
    var e=0; for(var s2=2;s2<=12;s2++){ var tot=first+s2, pr=P2[s2]; if(!pr)continue; var v;
      if(tot===pred) v=-tot; else if(tot<pred) v=(pred-tot); else v=2*(tot-pred); if(half)v=Math.ceil(v/2)*Math.sign(v); e+=pr*v; }
    return e;
  }
  A.register({ id:"tegendraads", beta:true, title:"Tegendraads", level:"app", kans:true, sub:"Voorspelling, kans per getal, verzekering",
    init:function(root){
      var G=A.gs("tegendraads"); var st={first:null,pred:null,rest:null,ins:false};
      var d1,d2;
      function render(){
        var i=A.S.active, h='<p class="hint">'+esc(A.name(i))+' is aan de beurt</p>';
        if(st.first===null){ h+='<div class="hint">Gooi de eerste steen</div><div id="d1"></div>'; }
        else {
          h+='<div class="board"><div class="stat"><span>Eerste steen: <b>'+st.first+'</b></span><span>Voorspelling: <b>'+(st.pred||"–")+'</b></span>'+(st.ins?'<span>verzekerd (±1)</span>':'')+'</div></div>';
          if(st.pred===null){
            h+='<div class="hint">Hoeveel ogen worden het met drie stenen?</div><div class="opts">';
            var best=null,bestE=1e9; for(var p=st.first+2;p<=st.first+12;p++){ var e=expect(st.first,p,G.half); if(e<bestE){bestE=e;best=p;} }
            for(var p=st.first+2;p<=st.first+12;p++){ var pr=P2[p-st.first], e=expect(st.first,p,G.half);
              h+='<button class="opt'+(p===best?' best':'')+'" data-p="'+p+'"><span class="num">'+p+'</span><span class="lbl">'+(p===st.first*3?'drie dezelfde: dubbel uitdelen':'')+'<small>raak: '+p+' uitdelen</small></span><span class="odds kans"><b>'+pct(pr,1)+'</b>verwacht '+(e<0?'+'+A.num(-e):'-'+A.num(e))+'</span></button>'; }
            h+='</div>';
          } else if(st.rest===null){
            h+='<div class="hint">Gooi de andere twee stenen'+(st.ins?' (verzekerd)':'')+'</div><div id="d2"></div>';
            if(!st.ins) h+='<div class="btnrow"><button class="btn" id="ins">Verzekering kopen (half adtje, dan ±1 ook raak)</button></div>';
          }
        }
        h+='<div class="seg"><button id="half" aria-pressed="'+!!G.half+'">slokken halveren</button></div>';
        root.innerHTML=h;
        if(st.first===null) d1=A.Dice(el("d1"),{n:1,onRoll:function(v){ st.first=v[0]; render(); }});
        root.querySelectorAll("[data-p]").forEach(function(b){ b.onclick=function(){ st.pred=+b.getAttribute("data-p"); render(); }; });
        var ins=el("ins"); if(ins) ins.onclick=function(){ st.ins=true; A.atje(i,0.5); A.drink(i,4); render(); };
        if(st.pred!==null&&st.rest===null) d2=A.Dice(el("d2"),{n:2,onRoll:function(v){ finish(v); }});
        el("half").onclick=function(){ G.half=!G.half; A.save(); render(); };
      }
      function finish(v){
        var i=A.S.active, tot=st.first+v[0]+v[1], p=st.pred, triple=(st.first===v[0]&&v[0]===v[1]), n, msg, kind;
        var hit=tot===p||(st.ins&&Math.abs(tot-p)===1);
        if(hit){ n=tot*(triple&&p===st.first*3?2:1); if(G.half)n=Math.ceil(n/2); kind="win"; msg=A.name(i)+" gooit "+tot+" en deelt "+n+" slokken uit"+(triple?" (drie dezelfde, dubbel)":"")+"."; A.play("win"); A.overlay("win","Raak!",[msg],0); }
        else { var diff=Math.abs(tot-p); n=tot<p?diff:2*diff; if(st.ins)n*=2; if(G.half)n=Math.ceil(n/2); A.drink(i,n); kind="dood"; msg=A.name(i)+" voorspelde "+p+", gooide "+tot+(tot>p?" (te laag ingezet, dubbel)":"")+(st.ins?", buiten de verzekering, dubbel":"")+". Drink "+n+"."; A.play("dood"); A.overlay("dood","Mis",[msg],0,A.dicerow([st.first,v[0],v[1]])); }
        A.onOverlayClose(function(){ st={first:null,pred:null,rest:null,ins:false}; A.nextPlayer(); render(); });
        root.innerHTML='<div class="verdict '+(kind==="win"?"win":"fout")+'"><h2>'+(kind==="win"?"Raak":"Mis")+'</h2><p>'+esc(msg)+'</p></div>';
      }
      render(); this.refresh=render; this.onPlayer=function(){ st={first:null,pred:null,rest:null,ins:false}; render(); };
    }
  });
})();
