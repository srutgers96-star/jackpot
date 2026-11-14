/* ===== Chinees Roulette ===== */
/* Niveau "hulp": de zes shotglaasjes staan echt op tafel. De app is de dobbelsteen, onthoudt welke glaasjes
   vol zijn, zegt wie vult of drinkt en bewaakt de beurt.
   Keuzes waar de bijbel niets of iets dubbelzinnigs zegt:
   - Begin: alleen glaasje 2 is gevuld (regel 1 noemt alleen '2' als gevuld), de andere vijf zijn leeg.
   - Elk shotglaasje wordt in de stand als 1 slok geboekt (de bijbel noemt geen maat: "glas: niet van toepassing").
   - Regel 3 (roulette): de speler vult het laatste lege glaasje en drinkt daarna alle zes, dus 6 shotjes.
     Daarna zijn 1, 3, 4, 5 en 6 leeg en gaat '2' weer vol (regel 1: altijd gevuld).
   - Regel 4: "eerst '2' leegdrinken en daarna nog eens allemaal" is gelezen als: glaasje 2 drinken, dan alle
     zes vullen en alle zes leegdrinken, dus 7 shotjes. Daarna weer alleen '2' vol; de speler gooit door.
   - Eén dobbelsteen, dus geen adtje kruk (A.kruk is alleen voor spellen met twee stenen). */
(function(){
  "use strict";
  var A=App, el=A.el, esc=A.esc, ID="chineesroulette";

  if(!document.getElementById(ID+"-style")){
    var css=document.createElement("style"); css.id=ID+"-style";
    css.textContent=
      ".chineesroulette-row{display:flex;gap:4px;align-items:flex-start;}"+
      ".chineesroulette-g{flex:1 1 0;min-width:0;min-height:104px;margin:0;padding:6px 0 4px;border:1.5px solid transparent;border-radius:10px;background:transparent;color:var(--ivory);display:flex;flex-direction:column;align-items:center;gap:5px;font:inherit;}"+
      ".chineesroulette-cup{position:relative;display:block;width:30px;height:40px;border:2px solid var(--ivory-dim);border-top:0;border-bottom-width:6px;border-radius:0 0 7px 7px;overflow:hidden;background:rgba(0,0,0,.18);}"+
      ".chineesroulette-cup i{position:absolute;left:0;right:0;bottom:0;height:0;background:var(--gold);transition:height .3s;}"+
      ".chineesroulette-vol .chineesroulette-cup i{height:82%;}"+
      ".chineesroulette-g small{display:block;font-size:10px;line-height:1.15;text-align:center;color:var(--ivory-dim);}"+
      ".chineesroulette-hit{background:rgba(243,233,210,.14);border-color:var(--gold);}"+
      ".chineesroulette-edit{border:1.5px dashed var(--ivory-dim);cursor:pointer;}"+
      ".chineesroulette-now{font-size:16px;color:var(--ivory);}"+
      ".overlay span.chineesroulette-t{font-size:min(14vw,64px);}";
    document.head.appendChild(css);
  }

  function fresh(G){ G.vol=[false,true,false,false,false,false]; G.fase="gooi"; G.last=null; G.log=[]; G.shots={}; }

  A.register({ id:ID, beta:true, title:"Chinees Roulette", level:"hulp", sub:"Dobbelt, onthoudt welke glaasjes vol zijn, zegt wie vult of drinkt",
    init:function(root){
      var G=A.gs(ID), edit=false, sure=false, gen=0, dead=false, obs=null;
      if(!Array.isArray(G.vol)||G.vol.length!==6) fresh(G);
      G.vol[1]=true; if(!Array.isArray(G.log)) G.log=[]; if(!G.shots||typeof G.shots!=="object") G.shots={}; if(G.fase!=="door") G.fase="gooi";
      if(G.fase==="door"&&!G.last) G.fase="gooi";

      function leeg(){ return G.vol.filter(function(x){return !x;}).length; }
      function alleen2(){ G.vol=[false,true,false,false,false,false]; }
      function names(){ return A.S.players.map(function(q){return q.name;}); }
      /* Spelers kunnen midden in het spel bijkomen of weggaan (core meldt dat niet aan het spel). De shotjes
         staan per plek; komt of gaat er iemand, dan schuiven ze mee op naam. Gaat er iemand weg, dan is dat
         altijd de speler die aan de beurt was (alleen die kun je in de balk verwijderen): core zet de beurt
         dan al op de volgende, dus die begint gewoon met gooien. */
      function syncPlayers(){
        var N=names(), O=G.names, s, k, j, f;
        if(Array.isArray(O)&&O.length!==N.length){
          s={}; k=0;
          for(j=0;j<N.length;j++){ f=O.indexOf(N[j],k); if(f>=0){ if(G.shots[f]) s[j]=G.shots[f]; k=f+1; } }
          G.shots=s;
          if(N.length<O.length){ G.fase="gooi"; G.last=null; }
          G.names=N; A.save();
        } else G.names=N;
        if(!(A.S.active>=0&&A.S.active<A.S.players.length)){ A.S.active=0; A.save(); A.renderPlayers(); }
      }
      /* n shotglaasjes voor speler i: telt in het spel en als n slokken in de stand */
      function shot(i,n){ G.shots[i]=(G.shots[i]||0)+n; A.drink(i,n); }
      function note(kind,v,title,text){ G.last={kind:kind,v:v,title:title,text:text}; G.log.unshift({v:v,text:text}); if(G.log.length>25) G.log.length=25; }
      /* groot moment: eigen titelgrootte, want één lang woord past niet in de standaard overlay-titel */
      function big(title,lines){
        A.play("dood");
        A.overlay("dood","",null,0,'<span class="t chineesroulette-t">'+esc(title)+'</span>'+lines.map(function(l){return "<small>"+esc(l)+"</small>";}).join(""));
      }

      function roll(vals){
        var v=vals[0], k, i, nm, nLeeg;
        if(!(v>=1&&v<=6)) return;
        syncPlayers();
        k=v-1; i=A.S.active; nm=A.name(i); nLeeg=leeg();
        if(v===2){
          if(nLeeg===5){
            /* regel 4: alles behalve '2' is leeg en er valt een 2 */
            shot(i,7); alleen2();
            note("alles",v,"Nog eens allemaal!",nm+" gooit 2 terwijl alle andere glaasjes leeg zijn. "+nm+" drinkt eerst glaasje 2; daarna gaan alle zes vol en drinkt "+nm+" ze allemaal leeg: 7 shotjes. Vul daarna alleen glaasje 2 weer bij. "+nm+" gooit opnieuw.");
            big("Nog eens allemaal!",[nm+" gooit 2 en al het andere is leeg.","Eerst glaasje 2 leegdrinken. Dan alle zes vullen en allemaal leegdrinken: 7 shotjes.","Vul daarna alleen glaasje 2 weer bij. "+nm+" gooit opnieuw."]);
          } else {
            /* regel 2.II: '2' is altijd vol, drinken en meteen weer bijvullen */
            shot(i,1);
            note("drink",v,"Glaasje 2",nm+" gooit 2. "+nm+" drinkt glaasje 2 (1 shotje), vult het meteen weer bij en gooit opnieuw.");
            A.play("ding");
          }
        } else if(G.vol[k]){
          /* regel 2.II: vol glaasje, drinken en opnieuw gooien */
          G.vol[k]=false; shot(i,1);
          note("drink",v,"Drinken",nm+" gooit "+v+": glaasje "+v+" is vol. "+nm+" drinkt het leeg (1 shotje) en gooit opnieuw.");
          A.play("ding");
        } else if(nLeeg===1){
          /* regel 3: het laatste lege glaasje moet gevuld worden: roulette */
          shot(i,6); alleen2();
          note("roulette",v,"Roulette!",nm+" gooit "+v+", het laatste lege glaasje. "+nm+" vult het en drinkt alle zes de shotglaasjes leeg: 6 shotjes. Vul daarna alleen glaasje 2 weer bij. "+nm+" blijft aan de beurt.");
          big("Roulette!",[nm+" moet het laatste lege glaasje ("+v+") vullen.","Vullen en dan alle zes de shotglaasjes leegdrinken: 6 shotjes.","Vul daarna alleen glaasje 2 weer bij. "+nm+" blijft aan de beurt."]);
        } else {
          /* regel 2.I: leeg glaasje, bijvullen, beurt voorbij */
          G.vol[k]=true; G.fase="door";
          note("vul",v,"Bijvullen",nm+" gooit "+v+": glaasje "+v+" is leeg. "+nm+" vult het bij (niet drinken). Beurt voorbij.");
          A.play("tick");
        }
        A.save(); render();
      }

      function glass(k,hit){
        var vol=G.vol[k], canEdit=edit&&k!==1;
        var cls="chineesroulette-g"+(vol?" chineesroulette-vol":"")+(hit?" chineesroulette-hit":"")+(canEdit?" chineesroulette-edit":"");
        var inner='<span class="chineesroulette-cup"><i></i></span>'+A.dicerowSmall([k+1])+'<small>'+(k===1?"altijd vol":vol?"vol":"leeg")+'</small>';
        return canEdit?'<button class="'+cls+'" data-g="'+k+'" aria-label="Glaasje '+(k+1)+': '+(vol?"vol":"leeg")+', tik om te wisselen">'+inner+'</button>'
                      :'<div class="'+cls+'">'+inner+'</div>';
      }

      function render(){
        if(dead) return;
        syncPlayers();
        var p=A.S.players, i=A.S.active, nxt=(i+1)%p.length, L=G.last, nLeeg=leeg(), h="", k, my=++gen;
        if(edit) h+='<p class="hint">Tik op een glaasje om het vol of leeg te zetten, zoals het op tafel staat. Glaasje 2 is altijd vol.</p>';
        else if(!G.log.length) h+='<p class="hint">Zet zes shotglaasjes op een rij, van 1 tot en met 6, en vul alleen glaasje 2.</p>';
        h+='<div class="board"><div class="chineesroulette-row">';
        for(k=0;k<6;k++) h+=glass(k,!edit&&L&&L.v===k+1);
        h+='</div><div class="stat"><span>Vol: <b>'+(6-nLeeg)+'</b> van 6</span>';
        if(nLeeg===1) h+='<span>Nog één leeg: wie <b>'+(G.vol.indexOf(false)+1)+'</b> gooit heeft roulette</span>';
        else if(nLeeg===5) h+='<span>Alleen 2 is vol: wie <b>2</b> gooit drinkt 7 shotjes</span>';
        h+='</div></div>';

        if(edit){
          h+='<div class="btnrow"><button class="btn gold" id="chineesroulette-edit">Klaar</button></div>';
        } else {
          if(L){
            h+='<div class="verdict '+(L.kind==="vul"?"neutral":"fout")+'"><h2>'+esc(L.title)+'</h2><p>'+A.dicerowSmall([L.v])+' '+esc(L.text)+'</p>';
            if(G.fase==="door") h+='<div class="btnrow"><button class="btn gold" id="chineesroulette-next">Gevuld, volgende: '+esc(A.name(nxt))+'</button></div>';
            h+='</div>';
          }
          if(G.fase==="gooi") h+='<p class="hint chineesroulette-now"><b>'+esc(A.name(i))+'</b>'+(L?' gooit opnieuw':' gooit de dobbelsteen')+'</p><div id="chineesroulette-dice"></div>'+
            '<p class="hint">Echte dobbelsteen? Tik op het vraagteken en kies wat er gegooid is.</p>';
          h+='<div class="stat"><span>Shotjes dit spel:</span>'+p.map(function(q,j){ return '<span>'+esc(q.name)+' <b>'+(G.shots[j]||0)+'</b></span>'; }).join("")+'</div>';
          h+='<div class="btnrow"><button class="btn" id="chineesroulette-edit">Glaasjes rechtzetten</button><button class="btn'+(sure?' danger':'')+'" id="chineesroulette-new">'+(sure?'Zeker? Tik nog eens':'Nieuw spel')+'</button></div>';
          h+='<p class="hint">Leeg glaasje gegooid: bijvullen, beurt voorbij. Vol glaasje gegooid: leegdrinken en opnieuw gooien. Glaasje 2 wordt na het drinken meteen weer gevuld. Elk shotje telt in de stand als 1 slok.</p>';
          h+='<div class="log">'+G.log.map(function(x){ return '<div><b>'+esc(x.v)+'</b> '+esc(x.text)+'</div>'; }).join("")+'</div>';
        }
        root.innerHTML=h;

        /* een worp telt alleen als dit nog het scherm is waarop hij begon: wisselt de beurt, begint een nieuw
           spel of gaat het spel dicht terwijl de digitale steen nog rolt, dan vervalt die worp */
        var box=el("chineesroulette-dice"); if(box) A.Dice(box,{n:1,onRoll:function(v){ if(dead||my!==gen) return; sure=false; roll(v); },label:L?"Gooi opnieuw":"Dobbel"});
        var nx=el("chineesroulette-next"); if(nx) nx.onclick=function(){ sure=false; G.fase="gooi"; G.last=null; A.nextPlayer(); A.save(); render(); };
        var ed=el("chineesroulette-edit"); if(ed) ed.onclick=function(){ sure=false; edit=!edit; render(); };
        var nw=el("chineesroulette-new"); if(nw) nw.onclick=function(){ if(!sure&&G.log.length){ sure=true; render(); return; } sure=false; fresh(G); A.save(); render(); };
        root.querySelectorAll("[data-g]").forEach(function(b){ b.onclick=function(){ var g=+b.getAttribute("data-g"); if(g===1) return; G.vol[g]=!G.vol[g]; A.save(); render(); }; });
      }

      render();
      this.refresh=render;
      /* een andere speler aantikken geeft die speler de beurt */
      this.onPlayer=function(){ sure=false; G.fase="gooi"; G.last=null; A.save(); render(); };
      this.destroy=function(){ dead=true; gen++; if(obs){ obs.disconnect(); obs=null; } };

      /* speler toegevoegd, hernoemd of verwijderd in de balk: scherm bijwerken (core roept het spel daar niet voor aan) */
      var bar=el("players");
      if(bar&&typeof MutationObserver!=="undefined"){
        obs=new MutationObserver(function(){ if(!dead&&JSON.stringify(names())!==JSON.stringify(G.names||[])) render(); });
        obs.observe(bar,{childList:true});
      }
    }
  });
})();
