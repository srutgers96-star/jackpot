/* ===== Tegendraads ===== */
/* Niveau "app": de drie stenen kunnen digitaal of met de hand ingevoerd worden, de app rekent uit wie wat drinkt
   of uitdeelt en bewaakt de beurt.
   Keuzes waar de bijbel niets of iets dubbelzinnigs zegt:
   - "Drie dezelfde voorspellen" = het totaal 3 x de eerste steen voorspellen (zo staat het in het voorbeeld:
     [3], negen ogen). Dubbel uitdelen alleen als er ook echt drie dezelfde liggen; 9 met [3][2][4] is gewoon
     raak en deelt 9 uit.
   - Verzekering: kan alleen wie de laatste twee stenen één voor één gooit, na de tweede en voor de derde steen.
     Precies raak blijft raak (ook dubbel bij drie dezelfde). Eén oog ernaast deelt de gegooide ogen uit, niet
     dubbel. Verder ernaast: het gebruikelijke aantal keer twee, dus te veel gegooid = 2 x 2 x het verschil.
   - Het halve adtje van de verzekering wordt als adtje (½) geboekt en valt niet onder "slokken halveren".
   - Variant halveren: eerst alles uitrekenen (met de verdubbelingen), dan halveren en naar boven afronden.
   - De bijbel noemt geen einde: het spel loopt door tot je stopt. "Nieuw spel" wist de lopende beurt en het
     logboek; de slokkenstand bovenaan blijft staan.
   - Drie dobbelstenen, dus geen adtje kruk (A.kruk is alleen voor spellen met twee stenen). */
(function(){
  "use strict";
  var A=App, el=A.el, esc=A.esc, pct=A.pct, ID="tegendraads";

  if(!document.getElementById(ID+"-style")){
    var css=document.createElement("style"); css.id=ID+"-style";
    css.textContent=
      ".tegendraads-nu{font-size:16px;color:var(--ivory);padding:4px 0 8px;}"+
      ".tegendraads-uitleg{font-size:13px;line-height:1.4;padding:6px 6px 8px;}"+
      ".tegendraads-stand{display:flex;align-items:center;justify-content:center;gap:2px;flex-wrap:wrap;}"+
      ".tegendraads-q{display:inline-flex;width:30px;height:30px;margin:0 2px;border-radius:7px;align-items:center;justify-content:center;background:rgba(243,233,210,.22);color:var(--ivory);font-weight:900;}"+
      ".tegendraads-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px;}"+
      ".tegendraads-tile{min-width:0;min-height:64px;padding:6px 4px;border-radius:10px;border:1.5px solid rgba(243,233,210,.25);background:rgba(0,0,0,.18);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;}"+
      ".tegendraads-tile b{font-size:24px;font-weight:900;line-height:1.1;}"+
      ".tegendraads-tile small{display:block;font-size:11px;line-height:1.2;text-align:center;color:var(--ivory-dim);}"+
      ".tegendraads-tile small.tegendraads-drie{color:var(--gold);font-weight:700;}"+
      ".tegendraads-best{border-color:var(--gold);background:rgba(231,184,79,.12);}"+
      ".nokans .tegendraads-best{border-color:rgba(243,233,210,.25);background:rgba(0,0,0,.18);}"+
      ".tegendraads-row{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:8px;}"+
      ".tegendraads-row .opt{min-width:0;min-height:52px;}"+
      ".tegendraads-row .btn{border-radius:10px;min-width:88px;}"+
      ".tegendraads-btn{min-height:44px;}"+
      ".tegendraads-seg{margin-top:16px;}"+
      ".tegendraads-seg button{min-height:40px;}"+
      ".tegendraads-worp{margin:2px 0 8px;}";
    document.head.appendChild(css);
  }

  /* kans op elke som van twee stenen */
  var P2=[], s0, a0, b0; for(s0=0;s0<=12;s0++)P2[s0]=0; for(a0=1;a0<=6;a0++)for(b0=1;b0<=6;b0++)P2[a0+b0]+=1/36;
  function slok(n){ return n+" "+(n===1?"slok":"slokken"); }
  function isInt(x,lo,hi){ return typeof x==="number"&&isFinite(x)&&Math.floor(x)===x&&x>=lo&&x<=hi; }

  /* De hele afrekening van één beurt. hit = uitdelen (n slokken), anders drinkt de speler zelf n slokken. */
  function outcome(first,pred,d2,d3,ins,half){
    var tot=first+d2+d3, diff=Math.abs(tot-pred), o={tot:tot,diff:diff,exact:tot===pred,hoog:tot>pred,hit:false,dubbel:false}, n;
    if(o.exact||(ins&&diff===1)){ o.hit=true; o.dubbel=o.exact&&d2===first&&d3===first; n=tot*(o.dubbel?2:1); }
    else n=(o.hoog?2*diff:diff)*(ins?2:1);
    o.n=half?Math.ceil(n/2):n; return o;
  }
  /* verwachte slokken bij twee stenen tegelijk, zonder verzekering (negatief = uitdelen) */
  function expect(first,pred,half){ var e=0,x,y,o; for(x=1;x<=6;x++)for(y=1;y<=6;y++){ o=outcome(first,pred,x,y,false,half); e+=(o.hit?-o.n:o.n)/36; } return e; }

  /* Beurt in A.gs: ph = first (eerste steen) → pred (voorspellen) → rest (twee tegelijk) of second → third (één voor één)
     → deal (raak: uitdelen) of done (mis: gedronken). Alles wat niet klopt (oude versie, kapotte opslag) begint opnieuw. */
  function sane(G){
    var t=G.t, k; if(!t||typeof t!=="object")return false;
    if(t.ph==="first")return true;
    if(!isInt(t.first,1,6))return false;
    if(t.ph==="pred")return true;
    if(!isInt(t.pred,t.first+2,t.first+12))return false;
    if(t.ph==="rest"||t.ph==="second")return true;
    if(t.ph==="third")return isInt(t.second,1,6);
    if(t.ph!=="deal"&&t.ph!=="done")return false;
    if(!Array.isArray(t.dice)||t.dice.length!==3||typeof t.msg!=="string")return false;
    for(k=0;k<3;k++) if(!isInt(t.dice[k],1,6))return false;
    if(t.ph==="done")return true;
    return isInt(t.n,1,36)&&isInt(t.left,0,t.n)&&isInt(t.fixed,0,t.n)&&!!t.given&&typeof t.given==="object";
  }

  A.register({ id:ID, beta:true, title:"Tegendraads", level:"app", kans:true, sub:"Voorspel je drie stenen: raak is uitdelen, mis is drinken, met verzekering",
    init:function(root){
      var G=A.gs(ID), gen=0, part=null, askNew=false;
      if(!Array.isArray(G.log))G.log=[];
      G.half=!!G.half;

      function newTurn(){ G.t={ph:"first"}; part=null; }
      function addLog(s){ G.log.unshift(s); if(G.log.length>6)G.log.length=6; }
      function fixActive(){ if(!isInt(A.S.active,0,A.S.players.length-1)){ A.S.active=0; A.save(); A.renderPlayers(); } }
      function givenList(t){ return Object.keys(t.given).filter(function(j){ return t.given[j]>0&&A.S.players[+j]; }).map(function(j){ return A.name(+j)+" drinkt "+slok(t.given[j]); }); }
      function logDeal(t){ var gl=givenList(t); addLog(t.msg+(gl.length?" "+A.joinNames(gl)+".":"")); }
      function next(){ fixActive(); newTurn(); A.nextPlayer(); render(); }

      function finish(d2,d3){
        var t=G.t, i=A.S.active, nm=A.name(i), o=outcome(t.first,t.pred,d2,d3,!!t.ins,G.half), l1, l2;
        part=null; t.dice=[t.first,d2,d3];
        l2="Voorspeld "+t.pred+", gegooid "+o.tot+": ";
        if(o.hit){
          l1=nm+" mag "+slok(o.n)+" uitdelen";
          l2+=o.dubbel?"drie dezelfde voorspeld en gegooid, dubbel":o.exact?"precies goed":"één oog ernaast, de verzekering dekt het";
          t.ph="deal"; t.n=o.n; t.left=o.n; t.fixed=0; t.given={};
        } else {
          l1=nm+" drinkt "+slok(o.n);
          if(t.ins) l2+="buiten de verzekering"+(o.hoog?" en te laag ingezet, 2 × 2 × "+o.diff:", 2 × "+o.diff);
          else l2+=o.hoog?o.diff+" te veel (te laag ingezet), het dubbele verschil":o.diff+" te weinig, het verschil";
          A.drink(i,o.n); t.ph="done";
        }
        if(G.half) l2+=", gehalveerd";
        l2+="."; t.msg=l1+". "+l2;
        if(!o.hit) addLog(t.msg);
        A.save(); render();
        A.play(o.hit?"win":"dood");
        A.overlay(o.hit?"win":"dood",o.hit?"Raak!":"Mis",[l1,l2],0,A.dicerow(t.dice));
        /* mis: tik op de melding = door naar de volgende speler; raak: eronder staat het uitdeelscherm al klaar */
        A.onOverlayClose(o.hit?null:function(){ if(G.t===t&&t.ph==="done")next(); });
      }

      function render(){
        var myGen=++gen, ask=askNew, np=A.S.players.length, h="", t, i, nm, d, need, p, e, best, bestE, oth, gl, sum;
        askNew=false;
        if(np<2){ root.innerHTML='<p class="hint">Tegendraads speel je met minstens twee spelers. Tik bovenaan op + speler.</p>'; return; }
        fixActive(); if(!sane(G))newTurn();
        t=G.t; i=A.S.active;
        /* de speler die aan de beurt was is verwijderd: de volgende begint een nieuwe beurt */
        if(t.ph!=="first"&&isInt(t.pc,0,999)&&np<t.pc&&A.name(i)!==t.nm){ newTurn(); t=G.t; }
        /* spelerslijst veranderd tijdens het uitdelen: wat al gegeven is staat vast (de nummers kloppen niet meer) */
        if(t.ph==="deal"&&isInt(t.pc,0,999)&&np!==t.pc){ sum=0; Object.keys(t.given).forEach(function(k){ sum+=(+t.given[k]||0); }); t.fixed=Math.min(t.n,t.fixed+sum); t.given={}; }
        t.pc=np; t.nm=A.name(i); t.p=i; nm=esc(t.nm);

        function stand(dd,stats){
          var q=""; for(var k=dd.length;k<3;k++)q+='<span class="tegendraads-q">?</span>';
          return '<div class="board"><div class="tegendraads-stand">'+A.dicerowSmall(dd)+q+'</div>'+(stats?'<div class="stat">'+stats+'</div>':'')+'</div>';
        }
        function stats(dd){ var sm=0, r=3-dd.length, nd; dd.forEach(function(v){ sm+=v; }); nd=t.pred-sm;
          return '<span>Voorspeld: <b>'+t.pred+'</b></span><span>'+(nd>=r&&nd<=6*r?'Nog nodig: <b>'+nd+'</b>':'Precies '+t.pred+' kan niet meer')+'</span>'+(t.ins?'<span><b>Verzekerd</b>: '+(t.pred-1)+' en '+(t.pred+1)+' tellen ook</span>':''); }

        if(t.ph==="first"){
          h+='<p class="hint tegendraads-nu"><b>'+nm+'</b> is aan de beurt: gooi de eerste steen.</p><div id="tegendraads-dice"></div>';
          h+='<p class="hint tegendraads-uitleg">Met echte stenen: tik op de steen en kies wat er ligt.</p>';
        } else if(t.ph==="pred"){
          h+='<p class="hint tegendraads-nu"><b>'+nm+'</b> gooide '+t.first+': voorspel het totaal van alle drie de stenen.</p>'+stand([t.first]);
          best=null; bestE=1e9; for(p=t.first+2;p<=t.first+12;p++){ e=expect(t.first,p,G.half); if(e<bestE){ bestE=e; best=p; } }
          h+='<div class="tegendraads-grid">';
          for(p=t.first+2;p<=t.first+12;p++){ e=expect(t.first,p,G.half);
            h+='<button class="tegendraads-tile'+(p===best?' tegendraads-best':'')+'" data-p="'+p+'"><b>'+p+'</b>'+(p===3*t.first?'<small class="tegendraads-drie">3 × '+t.first+': dubbel</small>':'')+
              '<small class="kans">'+pct(P2[p-t.first],0)+' raak</small><small class="kans">gem. '+(e<0?A.num(-e)+' uitdelen':A.num(e)+' drinken')+'</small></button>'; }
          h+='</div><p class="hint tegendraads-uitleg">Raak: je deelt het aantal ogen uit. Minder gegooid: je drinkt het verschil. Meer gegooid: je drinkt het dubbele verschil. Drie keer een '+t.first+' voorspeld en gegooid: dubbel uitdelen.</p>';
        } else if(t.ph==="rest"){
          h+='<p class="hint tegendraads-nu"><b>'+nm+'</b> voorspelt '+t.pred+': gooi de andere twee stenen.</p>'+stand([t.first],stats([t.first]))+'<div id="tegendraads-dice"></div>';
          h+='<div class="btnrow"><button class="btn tegendraads-btn" id="tegendraads-een">Eén voor één gooien</button><button class="btn tegendraads-btn" id="tegendraads-terug">Andere voorspelling</button></div>';
          h+='<p class="hint tegendraads-uitleg">Eén voor één gooien: na de tweede steen mag je voor een half adtje een verzekering kopen. Eén oog ernaast is dan ook raak, maar gooi je er verder naast, dan drink je dubbel.</p>';
        } else if(t.ph==="second"){
          h+='<p class="hint tegendraads-nu"><b>'+nm+'</b> gooit één voor één: gooi de tweede steen.</p>'+stand([t.first],stats([t.first]))+'<div id="tegendraads-dice"></div>';
          h+='<div class="btnrow"><button class="btn tegendraads-btn" id="tegendraads-samen">Toch samen gooien</button><button class="btn tegendraads-btn" id="tegendraads-terug">Andere voorspelling</button></div>';
          h+='<p class="hint tegendraads-uitleg">Na deze steen mag je een verzekering kopen (half adtje).</p>';
        } else if(t.ph==="third"){
          d=[t.first,t.second]; need=t.pred-t.first-t.second;
          h+='<p class="hint tegendraads-nu"><b>'+nm+'</b>'+(t.ins?' is verzekerd: gooi de derde steen.':': koop een verzekering of gooi de derde steen.')+'</p>'+stand(d,stats(d));
          if(!t.ins){
            var pe=(need>=1&&need<=6)?1:0, pi=0; for(p=1;p<=6;p++) if(Math.abs(p-need)<=1)pi++;
            h+='<div class="btnrow"><button class="btn tegendraads-btn" id="tegendraads-ins">Verzekering kopen: half adtje</button></div>';
            h+='<p class="hint tegendraads-uitleg">Met verzekering is één oog ernaast ('+(t.pred-1)+' of '+(t.pred+1)+') ook raak en deel je de gegooide ogen uit. Gooi je er verder naast, dan drink je dubbel.<span class="kans"> Kans op raak: nu '+pct(pe/6,0)+', met verzekering '+pct(pi/6,0)+'.</span></p>';
          }
          h+='<div id="tegendraads-dice"></div>';
        } else if(t.ph==="deal"){
          oth=A.others(i); gl=givenList(t);
          h+='<div class="verdict win"><h2>Raak!</h2><div class="tegendraads-worp">'+A.dicerowSmall(t.dice)+'</div><p>'+esc(t.msg)+'</p></div>';
          if(t.left>0&&oth.length){
            h+='<p class="hint tegendraads-nu"><b>'+nm+'</b>: nog <b>'+slok(t.left)+'</b> uit te delen. Tik op wie er een krijgt.</p>';
            oth.forEach(function(j){ h+='<div class="tegendraads-row"><button class="opt" data-geef="'+j+'"><span class="num">'+(t.given[j]||0)+'</span><span class="lbl">'+esc(A.name(j))+'<small>tik: 1 slok erbij</small></span></button><button class="btn" data-rest="'+j+'">'+(gl.length||t.fixed?'rest: ':'alle ')+t.left+'</button></div>'; });
            if(gl.length) h+='<div class="btnrow"><button class="btn tegendraads-btn" id="tegendraads-opnieuw">Opnieuw verdelen</button></div>';
          } else {
            h+='<p class="hint tegendraads-nu">'+(gl.length?esc(A.joinNames(gl))+'. ':'')+(t.fixed?'Eerder al '+slok(t.fixed)+' uitgedeeld. ':'')+'Tik op Volgende speler.</p>';
            h+='<div class="btnrow"><button class="btn gold tegendraads-btn" id="tegendraads-volgende">Volgende speler: '+esc(A.name((i+1)%np))+'</button>'+(gl.length?'<button class="btn tegendraads-btn" id="tegendraads-opnieuw">Opnieuw verdelen</button>':'')+'</div>';
          }
        } else {
          h+='<div class="verdict fout"><h2>Mis</h2><div class="tegendraads-worp">'+A.dicerowSmall(t.dice)+'</div><p>'+esc(t.msg)+'</p></div>';
          h+='<p class="hint tegendraads-nu">Gedronken? Tik op Volgende speler.</p>';
          h+='<div class="btnrow"><button class="btn gold tegendraads-btn" id="tegendraads-volgende">Volgende speler: '+esc(A.name((i+1)%np))+'</button></div>';
        }
        h+='<div class="seg tegendraads-seg"><button id="tegendraads-half" aria-pressed="'+G.half+'">Variant: slokken halveren</button></div>';
        h+='<div class="btnrow"><button class="btn tegendraads-btn" id="tegendraads-new">'+(ask?'Zeker weten? Tik nog een keer':'Nieuw spel')+'</button></div>';
        if(G.log.length) h+='<div class="log">'+G.log.map(function(x){ return '<div>'+esc(x)+'</div>'; }).join("")+'</div>';
        root.innerHTML=h;

        function on(id,fn){ var n=el(id); if(n)n.onclick=fn; }
        /* elke render maakt een nieuwe A.Dice; een worp die nog liep in een vervangen widget telt niet (myGen) */
        function mk(n,label,cb){ var box=el("tegendraads-dice"); if(!box)return null;
          return A.Dice(box,{n:n,label:label,onChange:function(v){ if(myGen===gen&&n===2)part=v; },onRoll:function(v){ if(myGen===gen)cb(v); }}); }
        function go(){ A.save(); render(); }

        if(t.ph==="first") mk(1,"Gooi de eerste steen",function(v){ t.first=v[0]; t.ph="pred"; go(); });
        else if(t.ph==="rest"){ d=mk(2,"Gooi de twee stenen",function(v){ finish(v[0],v[1]); }); if(d&&part&&(part[0]||part[1])&&!(part[0]&&part[1]))d.set(part); }
        else if(t.ph==="second") mk(1,"Gooi de tweede steen",function(v){ t.second=v[0]; t.ph="third"; go(); });
        else if(t.ph==="third") mk(1,"Gooi de derde steen",function(v){ finish(t.second,v[0]); });

        root.querySelectorAll("[data-p]").forEach(function(b){ b.onclick=function(){ t.pred=+b.getAttribute("data-p"); t.ph="rest"; part=null; go(); }; });
        on("tegendraads-een",function(){ t.ph="second"; part=null; go(); });
        on("tegendraads-samen",function(){ t.ph="rest"; part=null; go(); });
        on("tegendraads-terug",function(){ t.ph="pred"; delete t.pred; part=null; go(); });
        on("tegendraads-ins",function(){
          if(t.ins)return; t.ins=true; A.atje(i,0.5); A.play("ding");
          addLog(t.nm+" koopt een verzekering en trekt een half adtje.");
          A.toast("Verzekering gekocht",t.nm+" trekt een half adtje. "+(t.pred-1)+" en "+(t.pred+1)+" tellen nu ook als raak.",5000); go();
        });
        root.querySelectorAll("[data-geef]").forEach(function(b){ b.onclick=function(){ var j=+b.getAttribute("data-geef"); if(t.left<1||!A.S.players[j])return; t.given[j]=(t.given[j]||0)+1; t.left--; A.drink(j,1); A.play("tick"); go(); }; });
        root.querySelectorAll("[data-rest]").forEach(function(b){ b.onclick=function(){ var j=+b.getAttribute("data-rest"), n=t.left; if(n<1||!A.S.players[j])return; t.given[j]=(t.given[j]||0)+n; t.left=0; A.drink(j,n); A.play("tick"); go(); }; });
        on("tegendraads-opnieuw",function(){ Object.keys(t.given).forEach(function(j){ var n=+t.given[j]||0; if(n>0&&A.S.players[+j]){ A.drink(+j,-n); t.left+=n; } }); t.given={}; t.left=Math.min(t.left,t.n-t.fixed); go(); });
        on("tegendraads-volgende",function(){ if(t.ph==="deal")logDeal(t); next(); });
        on("tegendraads-half",function(){ G.half=!G.half; go(); });
        on("tegendraads-new",function(){ if(!ask){ askNew=true; render(); return; } G.log=[]; newTurn(); go(); });
      }

      render();
      this.refresh=render;
      this.destroy=function(){ gen++; };
      /* tik op een andere speler in de balk: die begint een nieuwe beurt. Tijdens het uitdelen niet: dan zouden de slokken verdwijnen. */
      this.onPlayer=function(){
        var t=G.t;
        if(sane(G)&&t.ph==="deal"&&t.left>0&&A.S.players[t.p]&&A.S.players.length>1){
          A.S.active=t.p; A.save(); A.renderPlayers();
          A.toast("Eerst uitdelen",A.name(t.p)+" moet nog "+slok(t.left)+" uitdelen. Tik op een naam in de lijst eronder.",4200); return;
        }
        if(sane(G)&&t.ph==="deal")logDeal(t);
        newTurn(); A.save(); render();
      };
    }
  });
})();
