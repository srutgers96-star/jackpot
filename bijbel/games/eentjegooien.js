/* ===== 1’tje Gooien =====
   Twee stenen gooien, de derde steen ligt op tafel en telt af van 6 naar 1 en dan terug naar 6.
   Wie hem terug op de 6 draait, verliest. Alles zit in de app: de twee worpstenen (digitaal of echte ogen invoeren)
   en de derde steen op het scherm. Het dienblad uit de benodigdheden is alleen de ondergrond. */
(function(){
  "use strict";
  var A=App, el=A.el, esc=A.esc, pct=A.pct, ID="eentjegooien";

  if(!document.getElementById("eentjegooien-style")){
    var css=document.createElement("style"); css.id="eentjegooien-style";
    css.textContent=
      ".eentjegooien-top{display:flex;align-items:center;gap:14px}"+
      ".eentjegooien-third{flex:none;box-shadow:0 0 0 3px var(--gold),0 5px 0 #c4b793,0 8px 14px rgba(0,0,0,.35)}"+
      ".eentjegooien-third:active{transform:none;box-shadow:0 0 0 3px var(--gold),0 5px 0 #c4b793,0 8px 14px rgba(0,0,0,.35)}"+
      ".eentjegooien-info{min-width:0;font-size:13px;line-height:1.35;color:var(--ivory-dim)}"+
      ".eentjegooien-info b{display:block;font-size:19px;font-weight:900;color:var(--ivory);margin-bottom:2px}"+
      ".eentjegooien-track{display:flex;gap:4px;margin:12px 0 2px}"+
      ".eentjegooien-track span{flex:1;min-width:0;text-align:center;font-weight:900;font-size:15px;padding:5px 0;border-radius:8px;background:rgba(0,0,0,.25);color:var(--ivory-dim);border:1.5px solid transparent}"+
      ".eentjegooien-track span.eentjegooien-done{opacity:.45}"+
      ".eentjegooien-track span.eentjegooien-end{border-color:var(--red)}"+
      ".eentjegooien-track span.eentjegooien-cur{background:var(--gold);color:var(--ink);border-color:var(--gold);opacity:1}"+
      ".eentjegooien-last{margin-top:10px;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.22);font-size:14px;line-height:1.4;text-align:center;color:var(--ivory-dim);min-height:62px;overflow-wrap:anywhere}"+
      ".eentjegooien-last b{color:var(--ivory)}"+
      ".eentjegooien-last .eentjegooien-drink{display:block;color:var(--gold);font-weight:700}"+
      ".eentjegooien-rules{margin-top:14px}"+
      ".eentjegooien-rules td{font-size:14px}"+
      ".eentjegooien-seg button{min-height:40px}"+
      ".eentjegooien-seg .eentjegooien-lab{flex-basis:100%;text-align:center;font-size:12px;color:var(--ivory-dim)}"+
      ".eentjegooien-btn{min-height:44px}";
    document.head.appendChild(css);
  }

  /* Hoe vaak draait de derde steen bij deze worp? (regel 3)
     I een 1: 1x · II dubbel: 1x · III 1-1: 2x · IV 1-2: 3x. De zwaarste regel die past telt, ze stapelen niet:
     1-1 is dus 2x (niet 1 + 1 + 2) en 1-2 is 3x (niet 3 + 1 voor de losse 1). */
  function worp(a,b){
    var lo=Math.min(a,b), hi=Math.max(a,b);
    if(hi===1) return {n:2,k:"11",why:"dubbel 1"};
    if(lo===1&&hi===2) return {n:3,k:"12",why:"1 en 2"};
    if(lo===1) return {n:1,k:"1",why:"een 1"};
    if(a===b) return {n:1,k:"dd",why:"dubbel "+a};
    return {n:0,k:"",why:""};
  }
  /* kans dat één worp de steen minstens `rem` keer laat draaien, dus het spel eindigt */
  function pEnd(rem){ var c=0; for(var a=1;a<=6;a++)for(var b=1;b<=6;b++) if(worp(a,b).n>=rem)c++; return c/36; }
  function keer(n){ return ["nul keer","één keer","twee keer","drie keer"][n]||n+" keer"; }
  function slok(n){ return n+" "+(n===1?"slok":"slokken"); }

  A.register({ id:ID, beta:true, title:"1’tje Gooien", level:"app", kans:true, sub:"Twee stenen gooien, de derde steen telt af, wie hem terug op 6 draait drinkt",
    init:function(root){
      var G=A.gs(ID);
      if(G.straf!=="half") G.straf="slok";                       /* regel 4: een slok of een half adtje, zelf kiezen */
      if(G.extra!=="dubbel"&&G.extra!=="draai") G.extra="uit";    /* variërende regel */
      function reset(){ G.die=6; G.count=0; G.last=null; G.over=null; G.log=[]; A.save(); }
      if(!(G.die>=1&&G.die<=6)||typeof G.count!=="number"||!Array.isArray(G.log)) reset();

      function strafTxt(s){ return s==="half"?"een half adtje":"1 slok"; }

      function onRoll(v){
        if(G.over) return;
        var i=A.S.active, nm=A.name(i), a=v[0], b=v[1], w=worp(a,b), from=G.die, made=0, hit=false;
        A.kruk(ID,[a,b],i); /* adtje kruk: elke worp van de twee stenen telt */
        /* Draaien stopt zodra de steen op de 6 ligt: het spel is dan afgelopen (regel 4), de rest van de draaien vervalt. */
        while(made<w.n&&!hit){ G.die=G.die===1?6:G.die-1; made++; if(G.die===6)hit=true; }
        G.count++;
        /* Variërende regel, gelezen als twee losse afspraken: één slok bij dubbel, óf één slok per keer dat je draait
           (alleen de draaien die echt gemaakt zijn). */
        var sips=G.extra==="dubbel"?(a===b?1:0):G.extra==="draai"?made:0;
        if(sips) A.drink(i,sips);
        var L={p:nm,a:a,b:b,k:w.k,why:w.why,n:made,from:from,to:G.die,sips:sips,extra:G.extra,hit:hit};
        G.last=L; G.log.unshift(L); if(G.log.length>9) G.log.length=9;
        if(hit){
          if(G.straf==="half") A.atje(i,0.5); else A.drink(i,1);
          G.over={p:nm,straf:G.straf,sips:sips,extra:G.extra};
        }
        /* De beurt gaat altijd met de klok mee door, ook na de laatste worp: de volgende speler begint het nieuwe spel
           (de bijbel zegt niet wie begint; een andere naam aantikken kan altijd). */
        A.S.active=(i+1)%A.S.players.length; A.save(); A.renderPlayers();
        render();
        if(hit){
          A.play("dood");
          A.overlay("dood","Zes!",[nm+" draait de derde steen terug op de 6 en verliest.",
            "Drink "+strafTxt(G.straf)+(sips?" en "+slok(sips)+" voor "+(G.extra==="dubbel"?"de dubbel":"het draaien"):"")+"."],0,A.dicerow([a,b]));
        } else if(made){
          A.play("ding");
          A.overlay("info","Draai "+made+"×",[nm+" gooit "+w.why+".","Derde steen van "+from+" naar "+G.die+"."+(sips?" Drink "+slok(sips)+".":"")],1900,A.dicerow([a,b]));
        }
      }

      function lastHtml(L){
        if(!L) return 'Nog niet gegooid. De derde steen ligt op de 6.';
        var h=A.dicerowSmall([L.a,L.b])+' <b>'+esc(L.p)+'</b> ';
        if(!L.n) h+='gooit niets bijzonders. De derde steen blijft op '+L.to+'.';
        else if(L.hit) h+='gooit '+esc(L.why)+': de derde steen ligt terug op de 6.';
        else h+='gooit '+esc(L.why)+': '+keer(L.n)+' draaien, van '+L.from+' naar '+L.to+'.';
        if(L.sips) h+='<span class="eentjegooien-drink">'+esc(L.p)+' drinkt '+slok(L.sips)+' ('+(L.extra==="dubbel"?"dubbel gegooid":"één per draai")+').</span>';
        return h;
      }

      var dice=null;
      function render(){
        var p=A.S.players, i=A.S.active, over=G.over, idx=over?6:6-G.die, rem=over?0:G.die, L=G.last, h="", k;
        if(p.length<2) h+='<p class="hint">Met één speler verlies je altijd zelf. Voeg iemand toe met + speler.</p>';

        /* de derde steen en zijn route 6 → 1 → 6 */
        h+='<div class="board"><div class="eentjegooien-top"><div class="die eentjegooien-third" role="img" aria-label="Derde steen: '+G.die+'">'+A.pips(G.die)+'</div><div class="eentjegooien-info">';
        if(over) h+='<b>Terug op de 6</b>Het spel is afgelopen.';
        else h+='<b>Nog '+rem+' keer draaien</b>Dan ligt de derde steen terug op de 6. Wie hem daar neerlegt, verliest.';
        h+='</div></div><div class="eentjegooien-track" aria-hidden="true">';
        var route=[6,5,4,3,2,1,6];
        for(k=0;k<7;k++) h+='<span class="'+(k===6?'eentjegooien-end ':'')+(k<idx?'eentjegooien-done':k===idx?'eentjegooien-cur':'')+'">'+route[k]+'</span>';
        h+='</div><div class="stat"><span>Worpen dit spel: <b>'+G.count+'</b></span>'+(over?'':'<span class="kans">Kans dat deze worp het spel eindigt: <b>'+pct(pEnd(rem),0)+'</b></span>')+'</div>';
        h+='<div class="eentjegooien-last">'+lastHtml(L)+'</div></div>';

        if(over){
          h+='<div class="verdict fout"><h2>'+esc(over.p)+' verliest</h2><p><b>'+esc(over.p)+'</b> heeft de derde steen terug op de 6 gedraaid. Drink <b>'+strafTxt(over.straf)+'</b>'+
            (over.sips?' en '+slok(over.sips)+' voor '+(over.extra==="dubbel"?"de dubbel":"het draaien"):'')+'.</p>'+
            '<div class="btnrow"><button class="btn gold eentjegooien-btn" id="eentjegooien-again">Nieuw spel</button></div></div>'+
            '<p class="hint">'+esc(A.name(i))+' begint het nieuwe spel. Begint iemand anders? Tik op die naam.</p>';
        } else {
          h+='<p class="hint">'+esc(A.name(i))+' is aan de beurt: één worp met twee stenen.</p><div id="eentjegooien-dice"></div>';
        }

        /* spiekbriefje: wanneer draait de derde steen */
        var rows=[["1",A.dicerowSmall([1])+' een 1',"1×"],["dd",'dubbel (2-2 t/m 6-6)',"1×"],["11",A.dicerowSmall([1,1]),"2×"],["12",A.dicerowSmall([1,2]),"3×"]];
        h+='<table class="score eentjegooien-rules"><tr><th>worp</th><th>derde steen draait</th></tr>';
        rows.forEach(function(r){ h+='<tr'+(L&&L.k===r[0]?' class="cur"':'')+'><td>'+r[1]+'</td><td>'+r[2]+'</td></tr>'; });
        h+='</table>';

        h+='<div class="seg eentjegooien-seg" style="margin-top:14px"><span class="eentjegooien-lab">Verliezer drinkt</span>'+
          '<button data-straf="slok" aria-pressed="'+(G.straf==="slok")+'">1 slok</button><button data-straf="half" aria-pressed="'+(G.straf==="half")+'">half adtje</button></div>';
        h+='<div class="seg eentjegooien-seg"><span class="eentjegooien-lab">Extra slokken (zelf af te spreken)</span>'+
          '<button data-extra="uit" aria-pressed="'+(G.extra==="uit")+'">geen</button><button data-extra="dubbel" aria-pressed="'+(G.extra==="dubbel")+'">slok bij dubbel</button><button data-extra="draai" aria-pressed="'+(G.extra==="draai")+'">slok per draai</button></div>';
        h+='<div class="btnrow"><button class="btn eentjegooien-btn" id="eentjegooien-new">Nieuw spel</button></div>';

        if(G.log.length>1){
          h+='<div class="log">';
          G.log.slice(1).forEach(function(x){ h+='<div><b>'+esc(x.p)+'</b> '+x.a+'-'+x.b+(x.n?': '+x.n+'× gedraaid, '+x.from+' → '+x.to:': niets')+(x.sips?', '+slok(x.sips):'')+'</div>'; });
          h+='</div>';
        }
        root.innerHTML=h;

        dice=null;
        if(!over) dice=A.Dice(el("eentjegooien-dice"),{n:2,onRoll:onRoll,label:"Dobbel"});
        root.querySelectorAll("[data-straf]").forEach(function(b){ b.onclick=function(){ G.straf=b.getAttribute("data-straf"); A.save(); render(); }; });
        root.querySelectorAll("[data-extra]").forEach(function(b){ b.onclick=function(){ G.extra=b.getAttribute("data-extra"); A.save(); render(); }; });
        el("eentjegooien-new").onclick=function(){ reset(); render(); };
        var ag=el("eentjegooien-again"); if(ag) ag.onclick=function(){ reset(); render(); };
      }

      render();
      this.refresh=render;
      this.onPlayer=function(){ render(); };
    }
  });
})();
