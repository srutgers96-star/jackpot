/* ===== Eigen Risico =====
   Hulp-niveau: de halve liter pul en het schenken blijven echt op tafel. De app is de dobbelsteen en de scheidsrechter:
   wie is aan de beurt, welk getal is genoemd, raak of mis, wie drinkt de pul leeg en wie vult hem daarna.
   Keuzes waar de tekst ruimte laat:
   - "Pul leegdrinken" wordt geboekt als één adtje (A.atje), hoeveel er ook in zat: de app kan de inhoud niet meten.
   - "De speler links" = de volgende in de spelerslijst (zet de spelers in de volgorde waarin jullie zitten).
   - Regel 4: de verliezer vult de pul "naar eigen wens" en is opnieuw aan de beurt. Dat vullen telt hier als het
     schenken van die nieuwe beurt (je mag maar één keer schenken), dus daarna noemt hij/zij meteen een getal.
   - Variërende regel (altijd je hele glas in de pul): bij het opnieuw vullen gaat dan in elk geval ook het hele glas erin.
   - Of de pul vol is weet alleen de tafel: de speler die aan de beurt komt meldt het ("Pul is al vol"), daarna slaat de
     app het schenken over tot de pul is leeggedronken.
   - Geen spelregel maar een correctieknop: "Laatste worp terugdraaien" (verkeerd getikt bij een echte steen) zet de
     stand van vlak voor de worp terug, inclusief een geboekt adtje. */
(function(){
  "use strict";
  var A=App, el=A.el, esc=A.esc, ID="eigenrisico";

  if(!document.getElementById("eigenrisico-style")){
    var css=document.createElement("style"); css.id="eigenrisico-style";
    css.textContent=
      ".eigenrisico-top{display:flex;align-items:center;gap:12px}"+
      ".eigenrisico-pul{width:56px;height:56px;flex:none;color:var(--ivory)}"+
      ".eigenrisico-info{flex:1;min-width:0;display:grid;gap:3px;font-size:13px;color:var(--ivory-dim)}"+
      ".eigenrisico-info b{color:var(--ivory)}"+
      ".eigenrisico-nums{display:grid;grid-template-columns:repeat(3,72px);gap:12px;justify-content:center;margin:4px 0 10px}"+
      ".eigenrisico-num{width:72px;height:72px;border-radius:14px;border:0;background:linear-gradient(#fffdf6,#efe7d2);box-shadow:0 5px 0 #c4b793,0 8px 14px rgba(0,0,0,.35);display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);padding:11px}"+
      ".eigenrisico-num:active{transform:translateY(3px);box-shadow:0 2px 0 #c4b793,0 4px 8px rgba(0,0,0,.35)}"+
      ".eigenrisico-said{display:flex;align-items:center;justify-content:center;gap:8px;font-size:16px;margin:12px 0 0}"+
      ".eigenrisico-said b{font-size:22px;font-weight:900}"+
      ".eigenrisico-step .btn{min-height:44px}"+
      ".eigenrisico-foot .btn{min-height:40px}"+
      ".eigenrisico-seg button{min-height:40px}";
    document.head.appendChild(css);
  }

  /* pul-plaatje: alleen een statuslampje (leeg / er zit bier in / vol), geen meting */
  function pulSvg(state){
    var fill=state==="vol"?'<rect x="11" y="9" width="22" height="31" rx="2" fill="#e7b84f"/><rect x="11" y="6" width="22" height="6" rx="3" fill="#fffdf6"/>'
      :state==="gevuld"?'<rect x="11" y="24" width="22" height="16" rx="2" fill="#e7b84f"/>':'';
    return '<svg class="eigenrisico-pul" viewBox="0 0 48 48" aria-hidden="true">'+fill+
      '<path d="M10 6h24v34a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="2.4"/>'+
      '<path d="M34 14h5a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-5" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';
  }

  A.register({ id:ID, beta:true, title:"Eigen Risico", level:"hulp", kans:true, sub:"Getal noemen, dobbelen, wie drinkt de pul leeg",
    init:function(root){
      var G=A.gs(ID);
      /* gen: elke render maakt een nieuwe dobbelsteen; een worp die nog liep op een vervangen steen telt niet meer */
      var gen=0;
      /* fase: schenk (bijschenken) -> noem (getal 1..6) -> gooi -> mis: volgende speler / raak: vul (pul opnieuw vullen) -> noem */
      if(["schenk","noem","gooi","vul"].indexOf(G.phase)<0) G.phase="schenk";
      G.variant=!!G.variant; G.full=!!G.full; G.pours=G.pours|0; G.worpen=G.worpen|0; G.leeg=G.leeg|0;
      if(!Array.isArray(G.log)) G.log=[];
      if(!(G.pick>=1&&G.pick<=6)){ G.pick=null; if(G.phase==="gooi") G.phase="noem"; }
      if(G.phase==="schenk"&&G.full) G.phase="noem";
      if(!G.undo||typeof G.undo!=="object") G.undo=null;

      function fixActive(){ var n=A.S.players.length, a=A.S.active; if(!(a>=0&&a<n)){ A.S.active=0; A.save(); A.renderPlayers(); } }
      function turnStart(){ G.pick=null; G.phase=G.full?"noem":"schenk"; } /* regel 1.II: volle pul = niet bijschenken */
      function newGame(){ G.phase="schenk"; G.pick=null; G.full=false; G.pours=0; G.worpen=0; G.leeg=0; G.log=[]; G.loser=""; G.undo=null; A.save(); render(); }
      function pulState(){ return G.full?"vol":G.pours>0?"gevuld":"leeg"; }
      function pushLog(x){ G.log.unshift(x); if(G.log.length>12) G.log.length=12; }

      function onRoll(v){
        if(G.phase!=="gooi"||G.pick===null) return;
        fixActive();
        var i=A.S.active, r=v[0], p=G.pick, who=A.name(i);
        if(!(r>=1&&r<=6)) return;
        /* stand van vlak voor de worp, voor "Laatste worp terugdraaien" */
        G.undo={active:i,who:who,pick:p,pours:G.pours,full:G.full,worpen:G.worpen,leeg:G.leeg,loser:G.loser||"",atje:false};
        if(r===p){
          /* regel 3.II: zelf de pul leegdrinken; regel 4: daarna opnieuw vullen en opnieuw aan de beurt */
          pushLog({who:who,pick:p,roll:r,hit:true});
          G.undo.atje=true;
          G.leeg++; G.pours=0; G.full=false; G.worpen=0; G.pick=null; G.loser=who; G.phase="vul"; A.save();
          A.atje(i,1); A.play("dood");
          A.onOverlayClose(null);
          A.overlay("dood","Raak!",[who+" zei "+p+" en gooit "+r+".","Drink de pul leeg: 1 adtje voor "+who+"."],0,A.dicerow([r]));
          render();
        } else {
          /* regel 3.I: ander aantal ogen, de beurt schuift door naar links */
          G.worpen++;
          var nxt=A.nextPlayer(), nm=A.name(nxt);
          pushLog({who:who,pick:p,roll:r,hit:false,next:nxt===i?"":nm});
          turnStart(); A.save(); A.play("tick");
          A.overlay("info","Mis",[who+" zei "+p+" en gooit "+r+". Niemand drinkt.",nxt===i?"Nog een keer.":"Beurt naar "+nm+"."],1700,A.dicerow([r]));
          render();
        }
      }

      /* correctie, geen spelregel: de laatste worp was verkeerd ingevoerd */
      function undoRoll(){
        var u=G.undo; if(!u) return;
        G.undo=null;
        if(!(u.active>=0&&u.active<A.S.players.length)||A.name(u.active)!==u.who){ A.save(); render(); return; } /* spelerslijst is intussen veranderd */
        if(u.atje) A.atje(u.active,-1);
        G.pours=u.pours; G.full=u.full; G.worpen=u.worpen; G.leeg=u.leeg; G.loser=u.loser; G.pick=u.pick; G.phase="gooi";
        if(G.log.length) G.log.shift();
        A.S.active=u.active; A.save(); A.renderPlayers(); render();
      }

      function render(){
        gen++;
        fixActive();
        var i=A.S.active, who=esc(A.name(i)), ps=pulState(), h="";
        h+='<div class="board"><div class="eigenrisico-top">'+pulSvg(ps)+'<div class="eigenrisico-info">'+
          '<span>Pul: <b>'+(ps==="vol"?"vol":ps==="gevuld"?"er zit bier in":"leeg")+'</b>'+(G.pours>0?' ('+G.pours+'× geschonken)':'')+'</span>'+
          '<span>Mis gegooid sinds de pul leeg was: <b>'+G.worpen+'</b>×'+(G.worpen>0?'<span class="kans"> · kans daarop '+A.pct(Math.pow(5/6,G.worpen),1)+'</span>':'')+'</span>'+
          '<span>Pul leeggedronken: <b>'+G.leeg+'</b>×</span>'+
          '</div></div></div>';

        if(G.phase==="vul"){
          /* G.loser = wie de pul leegdronk; is intussen een andere speler aangetikt, dan vult die de pul */
          var same=!!G.loser&&G.loser===A.name(i);
          h+='<div class="verdict fout eigenrisico-step"><h2>Pul leegdrinken</h2><p>'+
            (same?'<b>'+who+'</b> gooide het eigen getal en drinkt de pul leeg (1 adtje). Daarna vult '+who+' de pul opnieuw, zo vol als je zelf wilt, en is opnieuw aan de beurt.'
                 :'De pul is leeggedronken'+(G.loser?' door '+esc(G.loser):'')+'. <b>'+who+'</b> vult hem opnieuw, zo vol als je zelf wilt, en is aan de beurt.')+'</p>'+
            (G.variant?'<p>Afgesproken: daarbij gaat in elk geval je hele glas in de pul.</p>':'')+
            '<div class="btnrow"><button class="btn gold" id="erFilled">Pul is gevuld</button></div></div>';
        } else if(G.phase==="schenk"){
          h+='<p class="hint"><b>'+who+'</b> is aan de beurt: eerst bijschenken, dan een getal noemen</p>';
          h+='<div class="verdict neutral eigenrisico-step"><h2>Schenk bij</h2><p>'+(G.pours===0?'De pul is leeg. ':'')+
            (G.variant?'Afgesproken: gooi je hele glas leeg in de pul. Eén keer, je glas bijvullen mag niet.'
                      :'Gooi bier uit je glas in de pul: hooguit je eigen glas en maar één keer. Je glas bijvullen en nog eens schenken mag niet.')+'</p>'+
            '<div class="btnrow"><button class="btn gold" id="erPoured">Bijgeschonken</button><button class="btn" id="erFull">Pul is al vol</button></div></div>';
        } else if(G.phase==="noem"){
          h+='<p class="hint"><b>'+who+'</b> noemt hardop een getal en tikt het aan.<br>Gooi je daarna dat getal, dan drink je de pul zelf leeg.'+(G.full?'<br>De pul is vol: bijschenken kan niet.':'')+'</p>';
          h+='<div class="eigenrisico-nums">';
          for(var n=1;n<=6;n++) h+='<button class="eigenrisico-num" data-n="'+n+'" aria-label="Noem '+n+'">'+A.pips(n)+'</button>';
          h+='</div><p class="hint kans" style="padding-top:0">Elk getal is even goed: 1 op 6 ('+A.pct(1/6,1)+') dat je de pul zelf leegdrinkt.</p>';
          if(G.full) h+='<div class="btnrow eigenrisico-foot"><button class="btn" id="erNotFull">Pul is toch niet vol</button></div>';
        } else {
          h+='<div class="eigenrisico-said"><span>'+who+' zegt</span>'+A.dicerowSmall([G.pick])+'<b>'+G.pick+'</b></div>';
          h+='<p class="hint" style="padding-bottom:0">Gooi de dobbelsteen: '+G.pick+' = pul leegdrinken, iets anders = beurt door.<br>Echte steen: tik op het vraagteken en kies de worp.</p><div id="erDice"></div>';
          h+='<div class="btnrow eigenrisico-foot"><button class="btn" id="erRepick">Ander getal</button></div>';
        }

        h+='<div class="seg eigenrisico-seg" style="margin-top:14px"><button id="erVariant" aria-pressed="'+G.variant+'">variant: altijd je hele glas in de pul</button></div>';
        if(G.log.length) h+='<div class="log">'+G.log.map(function(x){
          return '<div><b>'+esc(x.who)+'</b> zei '+x.pick+', gooide '+x.roll+': '+(x.hit?'raak, pul leeg (adtje).':'mis'+(x.next?', door naar '+esc(x.next):'')+'.')+'</div>';
        }).join("")+'</div>';
        h+='<div class="btnrow eigenrisico-foot">'+(G.undo&&G.phase!=="gooi"?'<button class="btn" id="erUndo">Laatste worp terugdraaien</button>':'')+'<button class="btn" id="erNew">Nieuw spel</button></div>';
        h+='<p class="hint" style="font-size:12px">'+(A.S.players.length<2?'Met één speler blijft de beurt bij jezelf: voeg spelers toe met + speler. ':'')+
          'Zo werkt het: schenk bij, noem een getal, gooi één steen. Gooi je je eigen getal, dan drink je de pul leeg. '+
          'De beurt gaat naar links: zet de spelers in de volgorde waarin jullie zitten.</p>';
        root.innerHTML=h;

        var b;
        /* elke stap verder maakt de vorige worp definitief (terugdraaien kan alleen direct na de worp) */
        if((b=el("erPoured"))) b.onclick=function(){ G.undo=null; G.pours++; G.phase="noem"; A.save(); render(); };
        if((b=el("erFull"))) b.onclick=function(){ G.undo=null; G.full=true; G.phase="noem"; A.save(); render(); };
        if((b=el("erNotFull"))) b.onclick=function(){ G.full=false; G.phase="schenk"; A.save(); render(); };
        if((b=el("erFilled"))) b.onclick=function(){ G.undo=null; G.pours=1; G.phase="noem"; A.save(); render(); };
        if((b=el("erRepick"))) b.onclick=function(){ G.pick=null; G.phase="noem"; A.save(); render(); };
        if((b=el("erUndo"))) b.onclick=undoRoll;
        root.querySelectorAll("[data-n]").forEach(function(x){ x.onclick=function(){ G.undo=null; G.pick=+x.getAttribute("data-n"); G.phase="gooi"; A.play("tick"); A.save(); render(); }; });
        if(G.phase==="gooi"){
          var mine=gen;
          A.Dice(el("erDice"),{n:1,onRoll:function(v){ if(mine===gen) onRoll(v); },label:"Gooi"}); /* één steen: geen adtje kruk */
        }
        el("erVariant").onclick=function(){ G.variant=!G.variant; A.save(); render(); };
        el("erNew").onclick=newGame;
      }

      render();
      this.refresh=render;
      /* spel verlaten terwijl de steen nog rolt: die worp telt niet meer */
      this.destroy=function(){ gen++; };
      /* een andere speler aangetikt: die is nu aan de beurt. Staat de pul leeg te wachten, dan vult die speler hem. */
      this.onPlayer=function(){ G.undo=null; if(G.phase!=="vul") turnStart(); A.save(); render(); };
    }
  });
})();
