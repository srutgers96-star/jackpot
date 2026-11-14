/* ===== 7, 8, 9 =====
   Hulp-niveau: de drie buikjes, het dienblad en het schenken blijven echt op tafel. De app is de dobbelstenen en de
   scheidsrechter: wie is aan de beurt, wat betekent de worp, hoeveel wordt er gedronken en wie gooit er opnieuw.
   De app houdt een plaatje van de drie glazen bij (in kwarten) om de slokken te kunnen boeken; meten kan hij niet.
   Keuzes waar de tekst ruimte laat:
   - De bijbel noemt geen slokken per glas ("niet van toepassing"). Net als bij Vieren en Mexx telt een vol glas hier
     als 8 slokken, dus een kwart glas is 2 slokken. Alles wat uit de drie glazen gedronken wordt, wordt in slokken geboekt.
   - "Het meest linkse glas" is het glas van de 7 (de glazen staan van links naar rechts 7, 8, 9).
   - De beginstand staat niet in de regels: de app begint met het minimum (links halfvol, de rest leeg) en de tafel
     tikt aan hoe de glazen echt staan.
   - Zeven: "zoveel glazen als hij/zij wil" mag ook nul glazen zijn. Bijvullen is alleen erbij, nooit eraf.
   - Acht: "de helft van al het bier" gaat over het totaal. Uit welke glazen is aan de drinker; de app haalt van elk
     glas de helft af. Staat het plaatje daarna anders dan de tafel, dan is er "Glazen bijstellen".
   - Regel 1 (links altijd minstens halfvol) zegt niet wie bijvult. Na een acht of negen vraagt de app om het linker
     glas meteen weer tot minstens halfvol te vullen, voordat er opnieuw gegooid wordt. Dat bijvullen boekt niets.
   - "Met de klok mee" = de volgende in de spelerslijst (zet de spelers in de volgorde waarin jullie zitten).
   - Er staan geen variërende regels bij dit spel, dus er zijn geen schakelaars.
   Twee dobbelstenen: elke worp gaat langs A.kruk (adtje kruk). */
(function(){
  "use strict";
  var A=App, el=A.el, esc=A.esc, ID="zevenachtnegen";
  var GLAS=8, HALF=GLAS/2, STEP=GLAS/4;
  var FRAC=["","⅛","¼","⅜","½","⅝","¾","⅞"];
  var SHAPE="M13 6C5 22 6 42 15 54H33C42 42 43 22 35 6Z";
  /* tick: elke render en elke destroy hoogt hem op, zodat een worp die nog uitrolt nooit op een oud scherm landt */
  var tick=0;
  /* kijkt mee met de spelersbalk: een naam gewijzigd of een speler verwijderd terwijl het spel open staat */
  var obs=null;

  if(!document.getElementById(ID+"-style")){
    var css=document.createElement("style"); css.id=ID+"-style";
    css.textContent=
      ".zevenachtnegen-tray{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}"+
      ".zevenachtnegen-glas{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0;min-height:44px;padding:8px 4px 6px;border-radius:12px;border:1.5px solid transparent;background:rgba(0,0,0,.2);color:var(--ivory)}"+
      ".zevenachtnegen-glas:disabled{cursor:default}"+
      ".zevenachtnegen-glas svg{width:56px;height:70px;display:block}"+
      ".zevenachtnegen-glas b{font-size:22px;font-weight:900;line-height:1}"+
      ".zevenachtnegen-glas small{font-size:12px;color:var(--ivory-dim);line-height:1.2}"+
      ".zevenachtnegen-tik{border-color:var(--gold);background:rgba(231,184,79,.14)}"+
      ".zevenachtnegen-tik:active{transform:translateY(2px)}"+
      ".zevenachtnegen-who{color:var(--gold);font-size:17px}"+
      ".zevenachtnegen-stap .btn{min-height:44px}"+
      ".zevenachtnegen-foot .btn{min-height:40px}"+
      ".zevenachtnegen-legend{font-size:12px;padding:2px 0 0}"+
      ".zevenachtnegen-log .dsmall{width:24px;height:24px;padding:3px;border-radius:6px}"+
      ".zevenachtnegen-log .dsmall .pip{width:5px;height:5px}";
    document.head.appendChild(css);
  }

  function sl(n){ return n+" "+(n===1?"slok":"slokken"); }
  /* hoe vol een glas staat, in woorden (afgerond op achtsten; een achtste glas is een slok) */
  function vol(l){ var e=Math.round(l); if(l<=0.01) return "leeg"; if(e<=0) return "bodempje"; if(e>=GLAS) return "vol"; return FRAC[e]; }
  function glasSvg(k,l){
    var f=Math.max(0,Math.min(1,l/GLAS)), top=54-48*f, cid=ID+"-clip"+k;
    return '<svg viewBox="0 0 48 60" aria-hidden="true"><defs><clipPath id="'+cid+'"><path d="'+SHAPE+'"/></clipPath></defs>'+
      (f>0?'<rect x="0" y="'+top.toFixed(1)+'" width="48" height="'+(54-top).toFixed(1)+'" fill="#e7b84f" clip-path="url(#'+cid+')"/>':'')+
      /* streepje op het linker glas: de ondergrens van regel 1 (halfvol) */
      (k===0?'<line x1="8" y1="30" x2="40" y2="30" stroke="currentColor" stroke-width="1.3" stroke-dasharray="3 3" opacity=".75"/>':'')+
      '<path d="'+SHAPE+'" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';
  }

  A.register({ id:ID, beta:true, title:"7, 8, 9", level:"hulp", kans:true, sub:"Dobbelstenen, de drie glazen bijhouden, wie drinkt hoeveel",
    init:function(root){
      var G=A.gs(ID);
      var edit=false; /* "Glazen bijstellen" staat open (niet bewaard) */
      var dice=null, seenN=-1, seenName=null; /* de dobbelstenen van dit scherm; wie er bij de laatste render aan de beurt stond */

      /* fase: opzet (glazen klaarzetten) -> gooi -> bij 7: vul (bijvullen) -> gooi; bij 8 en 9 blijft het gooi, met G.refill
         zolang het linker glas nog bijgevuld moet worden. Alles staat in G, dus een herlaad gaat verder waar het was. */
      function okLv(a){ return Array.isArray(a)&&a.length===3&&a.every(function(x){ return typeof x==="number"&&isFinite(x)&&x>=0&&x<=GLAS; }); }
      function fresh(){ G.phase="opzet"; G.lv=[HALF,0,0]; G.base=[HALF,0,0]; G.refill=false; G.note=null; G.last=null; G.reeks=0; G.log=[]; }
      if(["opzet","gooi","vul"].indexOf(G.phase)<0||!okLv(G.lv)) fresh();
      if(G.lv[0]<HALF) G.lv[0]=HALF;
      if(!okLv(G.base)) G.base=G.lv.slice();
      if(!Array.isArray(G.log)) G.log=[];
      G.log=G.log.filter(function(x){ return x&&typeof x==="object"; });
      if(!Array.isArray(G.last)||G.last.length!==2) G.last=null;
      if(!G.note||typeof G.note!=="object"||(G.note.k!=="half"&&G.note.k!=="alles")||typeof G.note.n!=="number") G.note=null;
      G.refill=!!G.refill&&G.phase==="gooi"; G.reeks=G.reeks|0;

      function cur(){ if(!(A.S.active>=0&&A.S.active<A.S.players.length)){ A.S.active=0; A.save(); A.renderPlayers(); } return A.S.active; }
      function totaal(){ return G.lv[0]+G.lv[1]+G.lv[2]; }
      /* links staat altijd minstens halfvol, dus er valt altijd iets te drinken: minstens 1 slok boeken */
      function helft(T){ return Math.max(1,Math.round(T/2)); }
      function alles(T){ return Math.max(1,Math.round(T)); }
      function addLog(o){ G.log.unshift(o); if(G.log.length>12) G.log.length=12; }

      /* welke glazen zijn aan te tikken: vrij (opzet en bijstellen), op (zeven: alleen erbij), links (alleen het linker glas, na 8 of 9) */
      function mode(){ if(edit||G.phase==="opzet") return "vrij"; if(G.phase==="vul") return "op"; if(G.phase==="gooi"&&G.refill) return "links"; return null; }
      function boardHtml(){
        var m=mode(), T=totaal(), h='<div class="zevenachtnegen-tray">';
        for(var k=0;k<3;k++){
          var can=m==="vrij"||m==="op"||(m==="links"&&k===0), txt=vol(G.lv[k]);
          h+='<button class="zevenachtnegen-glas'+(can?' zevenachtnegen-tik':'')+'" data-k="'+k+'"'+(can?'':' disabled')+' aria-label="Glas van de '+(7+k)+': '+txt+(can?'. Tik om aan te passen':'')+'">'+
            glasSvg(k,G.lv[k])+'<b>'+(7+k)+'</b><small>'+txt+'</small></button>';
        }
        h+='</div><div class="stat"><span>In de glazen: <b>±'+Math.round(T)+'</b> slokken</span><span>Bij 8: <b>'+helft(T)+'</b></span><span>Bij 9: <b>'+alles(T)+'</b></span></div>'+
          '<div class="stat kans"><span>7: <b>'+A.pct(6/36)+'</b></span><span>8: <b>'+A.pct(5/36)+'</b></span><span>9: <b>'+A.pct(4/36)+'</b></span><span>beurt voorbij: <b>'+A.pct(21/36)+'</b></span></div>';
        return h;
      }
      /* alleen het dienblad opnieuw tekenen, zodat een half ingevoerde worp blijft staan */
      function paintBoard(){ var b=el(ID+"Board"); if(b) b.innerHTML=boardHtml(); }
      /* elke tik is een kwart glas erbij; na vol terug naar de ondergrens (vrij: leeg, links altijd half; bijvullen: hoe het stond) */
      function tap(k){
        var m=mode(); if(!m||(m==="links"&&k!==0)) return;
        var min=m==="vrij"?(k===0?HALF:0):m==="links"?HALF:G.base[k];
        var l=G.lv[k], nxt=l>=GLAS-0.01?min:Math.min(GLAS,(Math.floor(l/STEP+1e-6)+1)*STEP);
        if(nxt===l) return;
        G.lv[k]=nxt; A.play("tick"); A.save(); paintBoard();
      }

      /* een melding die vanzelf verdwijnt vangt geen tikken op: zolang ze staat kan de Gooi-knop eronder niet per ongeluk
         geraakt worden. Zelf de ogen intikken kan wel meteen. */
      function lockRoll(ms){ var d=dice, t=tick; if(!d) return; d.lock(true); setTimeout(function(){ if(t===tick) d.lock(false); },ms); }

      function onRoll(v){
        if(G.phase!=="gooi"||edit) return;
        var i=cur(), a=v[0], b=v[1], s=a+b, nm=A.name(i), T, d, refill, nxt;
        A.kruk(ID,[a,b],i); /* adtje kruk: elke worp van de twee stenen telt */
        G.refill=false; G.note=null; G.last=[a,b];
        A.onOverlayClose(null);
        if(s===7){
          /* regel 2.I.i: eerst bijvullen, dan opnieuw gooien */
          G.reeks++; G.phase="vul"; G.base=G.lv.slice(); addLog({who:nm,a:a,b:b,k:"vul"}); A.save();
          A.play("ding");
          A.overlay("info","Zeven!",[nm+" vult bij: zoveel glazen en zoveel bier als "+nm+" wil.","Daarna gooit "+nm+" opnieuw."],0,A.dicerow([a,b]));
        } else if(s===8||s===9){
          /* regel 2.I.ii en iii: de helft of alles van het bier in de drie glazen opdrinken, dan opnieuw gooien */
          T=totaal(); d=s===8?helft(T):alles(T);
          G.lv=s===8?G.lv.map(function(l){ l=l/2; return l<0.5?0:l; }):[0,0,0];
          /* regel 1: het linker glas is te allen tijde minstens halfvol */
          refill=G.lv[0]<HALF-0.01; if(refill) G.lv[0]=HALF;
          G.refill=refill; G.reeks++;
          G.note={k:s===8?"half":"alles",who:nm,n:d,a:a,b:b};
          addLog({who:nm,a:a,b:b,k:G.note.k,n:d});
          A.drink(i,d); A.save();
          A.play("dood");
          A.overlay("dood",s===8?"Acht!":"Negen!",[
            nm+(s===8?" drinkt de helft van al het bier in de drie glazen: ":" drinkt al het bier in de drie glazen op: ")+sl(d)+".",
            (refill?"Vul daarna het linker glas weer tot minstens halfvol. ":"")+nm+" gooit opnieuw."],0,A.dicerow([a,b]));
        } else {
          /* regel 2.II: geen 7, 8 of 9, de beurt schuift met de klok mee door */
          G.reeks=0; addLog({who:nm,a:a,b:b,k:"door"});
          nxt=A.nextPlayer(); A.save();
          A.play("tick");
          A.overlay("info",String(s),["Geen 7, 8 of 9: de beurt van "+nm+" is voorbij.",nxt===i?"Nog een keer.":"Beurt naar "+A.name(nxt)+"."],1600,A.dicerow([a,b]));
        }
        render();
        if(s<7||s>9) lockRoll(1600);
      }

      function render(){
        var token=++tick, i=cur(), n=A.S.players.length, who=esc(A.name(i)), N=G.note, h="", b;
        seenN=n; seenName=A.name(i); dice=null;
        if(n<2) h+='<p class="hint">Met één speler blijft de beurt bij jezelf. Voeg spelers toe met + speler hierboven.</p>';
        h+='<div class="board" id="'+ID+'Board">'+boardHtml()+'</div>';

        if(edit){
          h+='<div class="verdict neutral zevenachtnegen-stap"><h2>Glazen bijstellen</h2><p>Tik op de glazen tot het plaatje klopt met de tafel: elke tik is een kwart erbij, na vol begint het glas opnieuw. Er wordt niets geboekt. Het linker glas blijft minstens halfvol.</p>'+
            '<div class="btnrow"><button class="btn gold" id="'+ID+'EditDone">Klaar</button></div></div>';
        } else if(G.phase==="opzet"){
          h+='<div class="verdict neutral zevenachtnegen-stap"><h2>Zet de glazen klaar</h2><p>Drie buikjes naast elkaar op het dienblad: van links naar rechts de 7, de 8 en de 9. Het linker glas is altijd minstens halfvol.</p>'+
            '<p>Tik op een glas om aan te geven hoe vol het staat.</p>'+
            '<div class="btnrow"><button class="btn gold" id="'+ID+'Start">Start, '+who+' begint</button></div></div>';
        } else if(G.phase==="vul"){
          h+='<div class="verdict win zevenachtnegen-stap"><h2>Zeven '+(G.last?A.dicerowSmall(G.last):'')+'</h2><p><b>'+who+'</b> vult bij: zoveel glazen als je wilt, met zoveel bier als je wilt. Daarna gooi je opnieuw.</p>'+
            '<p>Tik op een glas om aan te geven hoe vol het nu staat: elke tik is een kwart erbij, na vol terug naar hoe het stond.</p>'+
            '<div class="btnrow"><button class="btn gold" id="'+ID+'Filled">Bijgevuld, gooi opnieuw</button></div></div>';
        } else {
          if(N){
            h+='<div class="verdict fout"><h2>'+(N.k==="half"?"Acht":"Negen")+' '+A.dicerowSmall([N.a,N.b])+'</h2><p><b>'+esc(N.who)+'</b> drinkt '+
              (N.k==="half"?'de helft van al het bier in de drie glazen':'al het bier in de drie glazen op')+': <b>'+sl(N.n)+'</b>.</p>'+
              (G.refill?'<p>Vul het linker glas meteen weer tot minstens halfvol. Staat het voller dan half? Tik dan op het glas.</p>':'')+'</div>';
          }
          h+='<p class="hint"><b class="zevenachtnegen-who">'+who+'</b> '+(G.reeks>0?'gooit opnieuw':'is aan de beurt')+': tik op Gooi, of tik op een steen om jullie echte worp in te vullen.</p>';
          h+='<div id="'+ID+'Dice"></div>';
        }

        h+='<p class="hint zevenachtnegen-legend">7: bijvullen. 8: de helft van al het bier opdrinken. 9: alles opdrinken. Daarna gooi je opnieuw. Iets anders: beurt voorbij.</p>';
        if(G.log.length) h+='<div class="log zevenachtnegen-log">'+G.log.map(function(x){
          return '<div><b>'+esc(x.who)+'</b> '+A.dicerowSmall([x.a,x.b])+' '+(x.a+x.b)+': '+
            (x.k==="vul"?'bijvullen en opnieuw gooien':x.k==="half"?'de helft opgedronken, '+sl(x.n)+', opnieuw gooien':
             x.k==="alles"?'alles opgedronken, '+sl(x.n)+', opnieuw gooien':'beurt voorbij')+'</div>';
        }).join("")+'</div>';
        h+='<div class="btnrow zevenachtnegen-foot">'+(G.phase!=="opzet"&&!edit?'<button class="btn" id="'+ID+'Edit">Glazen bijstellen</button>':'')+'<button class="btn" id="'+ID+'New">Nieuw spel</button></div>';
        h+='<p class="hint" style="font-size:12px">De app rekent een vol glas als 8 slokken en schat de glazen in kwarten. De beurt gaat met de klok mee: zet de spelers in de volgorde waarin jullie zitten.</p>';
        root.innerHTML=h;

        el(ID+"Board").addEventListener("click",function(e){ var g=e.target.closest?e.target.closest("[data-k]"):null; if(g&&!g.disabled) tap(+g.getAttribute("data-k")); });
        if((b=el(ID+"EditDone"))) b.onclick=function(){ edit=false; if(G.phase==="vul") G.base=G.lv.slice(); A.save(); render(); };
        if((b=el(ID+"Start"))) b.onclick=function(){ G.phase="gooi"; G.reeks=0; G.refill=false; G.note=null; A.save(); render(); };
        if((b=el(ID+"Filled"))) b.onclick=function(){ G.phase="gooi"; A.save(); render(); };
        if((b=el(ID+"Edit"))) b.onclick=function(){ edit=true; render(); };
        el(ID+"New").onclick=function(){ edit=false; fresh(); A.save(); render(); };
        if((b=el(ID+"Dice"))) dice=A.Dice(b,{n:2,label:"Gooi",onRoll:function(v){ if(token!==tick) return; onRoll(v); }});
      }

      render();
      this.refresh=render;
      /* De spelersbalk hoort bij de app en meldt een nieuwe naam of een verwijderde speler niet aan het spel. Daarom kijkt
         het spel zelf mee, anders blijft de oude naam staan. Is de speler die aan de beurt was verwijderd (alleen die kan
         verwijderd worden), dan begint de volgende een verse beurt: een open zeven, acht of negen vervalt met hem. */
      if(obs){ obs.disconnect(); obs=null; }
      if(typeof MutationObserver==="function"&&el("players")){
        obs=new MutationObserver(function(){
          var n=A.S.players.length, nm=A.name(cur());
          if(n===seenN&&nm===seenName) return;
          if(n<seenN&&nm!==seenName){ G.reeks=0; G.note=null; G.refill=false; if(G.phase==="vul") G.phase="gooi"; A.save(); }
          render();
        });
        obs.observe(el("players"),{childList:true});
      }
      /* een andere speler aangetikt: die is nu aan de beurt en begint een verse beurt (een open bijvulbeurt gaat mee) */
      this.onPlayer=function(){ G.reeks=0; G.note=null; G.refill=false; A.save(); render(); };
    },
    destroy:function(){ tick++; if(obs){ obs.disconnect(); obs=null; } }
  });
})();
