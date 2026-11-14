/* ===== Total Black-Out ===== */
(function(){
  "use strict";
  var A=App, el=A.el, esc=A.esc, pct=A.pct;
  var ID="blackout", ROWS=5, NEED=3;
  var WOORD={hoger:"hoger dan",lager:"lager dan",gelijk:"gelijk aan"};

  if(!document.getElementById("blackout-style")){
    var css=document.createElement("style"); css.id="blackout-style";
    css.textContent=
      ".blackout-who b{color:var(--ivory)}"+
      ".blackout-row{display:flex;align-items:center;gap:8px;padding:2px 0;border-top:1px solid rgba(243,233,210,.12)}"+
      ".blackout-row:first-child{border-top:0}"+
      ".blackout-n{flex:none;width:30px;text-align:center;font-size:10px;line-height:1.1;color:var(--ivory-dim)}"+
      ".blackout-n b{display:block;font-size:20px;color:var(--ivory)}"+
      ".blackout-strip{flex:1;min-width:0;display:flex;justify-content:center;align-items:center;height:62px}"+
      /* middelste kaarten schuiven onder elkaar als de rij lang wordt; de twee uiteinden blijven helemaal zichtbaar */
      ".blackout-slot{flex:1 1 0;min-width:0;max-width:44px;height:56px;position:relative}"+
      ".blackout-slot.blackout-end{flex:0 0 44px}"+
      ".blackout-slot .card{position:absolute;left:2px;top:0;width:40px;height:56px;border-radius:6px}"+
      ".blackout-slot .card b,.blackout-slot .card i{font-size:17px}"+
      /* volle rij: de waarde van de tussenliggende kaarten in de linkerhoek, zodat het zichtbare randje leesbaar blijft */
      ".blackout-tight .blackout-slot:not(.blackout-end) .card{align-items:flex-start;justify-content:flex-start;padding:5px 0 0 3px}"+
      ".blackout-tight .blackout-slot:not(.blackout-end) .card b,.blackout-tight .blackout-slot:not(.blackout-end) .card i{font-size:12px}"+
      ".blackout-slot .card.blackout-fresh{box-shadow:0 0 0 3px var(--gold),0 4px 8px rgba(0,0,0,.3)}"+
      ".blackout-slot .card.sel{transform:translateY(-4px)}"+
      ".blackout-ch{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:4px}"+
      ".blackout-ch button{min-height:66px;padding:8px 4px;border-radius:10px;border:1.5px solid rgba(243,233,210,.25);background:rgba(0,0,0,.18);text-align:center;line-height:1.2}"+
      ".blackout-ch button.blackout-best{border-color:var(--gold);background:rgba(231,184,79,.12)}"+
      ".blackout-ch b{display:block;font-size:19px;font-weight:900}"+
      ".blackout-ch small{display:block;font-size:12px;color:var(--ivory-dim)}"+
      ".blackout-v p{margin:0;display:flex;align-items:center;gap:10px;text-align:left}"+
      ".blackout-note{font-size:12px;padding:6px 0 0}";
    document.head.appendChild(css);
  }

  /* De Aas is hoog: zo staat het bij elk ander hoger-of-lager-spel in de bijbel; Total Black-Out zegt er zelf niets over. */
  function val(c){ return c.r===1?14:c.r; }
  function cardBtn(c,r,e,cls){ return '<button class="card'+(A.isRed(c)?' red':'')+(cls||'')+'" data-r="'+r+'" data-e="'+e+'" aria-label="Rij '+(r+1)+', '+(e==="L"?"linker":"rechter")+' uiteinde: '+esc(A.cardName(c))+'"><b>'+A.RANKS[c.r]+'</b><i>'+A.SUITS[c.s]+'</i></button>'; }
  function slok(n){ return n+" "+(n===1?"slok":"slokken"); }

  A.register({ id:ID, beta:true, title:"Total Black-Out", level:"app", kans:true, sub:"Vijf rijen, hoger of lager: de app deelt, keurt en telt de slokken",
    init:function(root){
      var G=A.gs(ID), sure=false;
      function cur(){ if(!(A.S.active>=0&&A.S.active<A.S.players.length)){ A.S.active=0; } return A.S.active; }
      function valid(){ return Array.isArray(G.rows)&&G.rows.length===ROWS&&Array.isArray(G.deck)&&G.rows.every(function(r){return Array.isArray(r)&&r.length>0;}); }
      function newGame(){
        var d=A.deck(0), i; G.rows=[]; for(i=0;i<ROWS;i++)G.rows.push([d.pop()]);
        G.deck=d; G.streak=0; G.sel=null; G.last=null; G.fresh=null; G.log=[]; G.over=false; sure=false; A.save(); render();
      }
      function baseOf(sel){ var row=G.rows[sel.r]; return sel.e==="L"?row[0]:row[row.length-1]; }
      function odds(base){ var o={hoger:0,lager:0,gelijk:0}; G.deck.forEach(function(c){ var d=val(c)-val(base); o[d>0?"hoger":d<0?"lager":"gelijk"]++; }); return o; }
      function log(t){ G.log=G.log||[]; G.log.unshift(t); if(G.log.length>6)G.log.length=6; }

      function guess(kind){
        if(G.over||!G.sel||!G.deck.length) return;
        var i=cur(), sel=G.sel, row=G.rows[sel.r], base=baseOf(sel), c=G.deck.pop();
        if(sel.e==="L") row.unshift(c); else row.push(c);
        var d=val(c)-val(base), res=d>0?"hoger":d<0?"lager":"gelijk", ok=res===kind;
        /* Slokken = aantal kaarten van de rij. De bijbel zegt niet of de fout geraden kaart meetelt; die ligt dan al in de rij, dus hij telt mee. */
        var n=row.length, who=A.name(i), zin=who+" zei "+WOORD[kind]+" "+A.cardName(base)+" en trok "+A.cardName(c)+".";
        G.fresh={r:sel.r,e:sel.e}; G.sel=null; sure=false;
        var leeg=G.deck.length===0;
        /* De bijbel zegt niet wat er gebeurt als de stapel op is: dan is het spel uit. */
        if(leeg) G.over=true;
        if(ok){
          G.streak=(G.streak||0)+1;
          if(G.streak>=NEED){
            /* Drie keer achter elkaar goed: de beurt schuift door. */
            G.streak=0; G.last={ok:true,c:c,t:zin+" Drie op rij, de beurt schuift door."}; log(who+": "+A.cardName(c)+" op "+A.cardName(base)+", goed (3 van 3), beurt door.");
            var nxt=A.nextPlayer();
            A.play("win");
            A.onOverlayClose(null); A.overlay("win","Drie goed!",[zin,leeg?"De stapel is op: het spel is uit.":(A.S.players.length>1?"De beurt gaat naar "+A.name(nxt)+".":"Op naar de volgende drie.")],0,'<div class="cards">'+A.cardHtml(c,"big")+'</div>');
          } else {
            G.last={ok:true,c:c,t:zin+" Goed, "+G.streak+" van "+NEED+"."}; log(who+": "+A.cardName(c)+" op "+A.cardName(base)+", goed ("+G.streak+" van "+NEED+").");
            A.save(); A.play("ding");
          }
        } else {
          /* Fout: drinken en de telling van drie begint opnieuw. De beurt gaat pas door na drie keer achter elkaar goed (regel 3),
             dus wie fout zit blijft aan de beurt. */
          G.streak=0;
          G.last={ok:false,c:c,t:zin+(res==="gelijk"?" Gelijk telt als fout.":" Fout.")+" "+who+" drinkt "+slok(n)+"."}; log(who+": "+A.cardName(c)+" op "+A.cardName(base)+", fout, "+slok(n)+".");
          A.drink(i,n); A.play("dood");
          A.onOverlayClose(null); A.overlay("dood","Mis!",[zin+(res==="gelijk"?" Gelijk telt als fout.":""),who+" drinkt "+slok(n)+": de rij telt "+n+" kaarten."+(leeg?" De stapel is op: het spel is uit.":" Je blijft aan de beurt.")],0,'<div class="cards">'+A.cardHtml(c,"big")+'</div>');
        }
        A.save(); render();
      }

      function render(){
        if(!valid()){ newGame(); return; }
        var i=cur(), k=A.S.kans, h='', np=A.S.players.length, nm=A.name(i);
        /* stapel leeg = spel uit (ook als een oude opgeslagen stand dat vlaggetje mist) */
        if(!G.deck.length) G.over=true;
        if(G.sel&&(G.over||!G.rows[G.sel.r])) G.sel=null;
        /* speler verwijderd terwijl het spel liep en er staat nu iemand anders op deze plek: die begint op nul */
        if(G.np&&G.np!==np&&G.who!==nm) G.streak=0;
        G.np=np; G.who=nm;
        h+='<p class="hint blackout-who">'+(G.over?'Het spel is uit':'<b>'+esc(A.name(i))+'</b> is aan de beurt · goed op rij: <b>'+(G.streak||0)+'</b> van '+NEED)+'</p>';
        h+='<div class="board">';
        G.rows.forEach(function(row,r){
          var n=row.length;
          h+='<div class="blackout-row"><span class="blackout-n"><b>'+n+'</b>'+(n===1?'kaart':'krt')+'</span><div class="blackout-strip'+(n>6?' blackout-tight':'')+'">';
          row.forEach(function(c,j){
            var end=j===0||j===n-1, e=(j===0&&n>1)?"L":"R";
            var cls=(G.fresh&&!G.sel&&G.fresh.r===r&&end&&(n===1||G.fresh.e===e)?' blackout-fresh':'')+(G.sel&&G.sel.r===r&&end&&(n===1||G.sel.e===e)?' sel':'');
            h+='<span class="blackout-slot'+(end?' blackout-end':'')+'">'+(end&&!G.over?cardBtn(c,r,e,cls):A.cardHtml(c,cls))+'</span>';
          });
          h+='</div></div>';
        });
        h+='<div class="stat"><span>Stapel: <b>'+G.deck.length+'</b></span><span>Aas is hoog</span><span>Fout = kaarten in de rij</span></div></div>';

        if(G.over){
          h+='<div class="verdict neutral"><h2>De stapel is op</h2><p>'+(G.last?esc(G.last.t)+' ':'')+'Alle kaarten liggen op tafel.</p><div class="btnrow"><button class="btn gold" id="blackout-new">Nieuw spel</button></div></div>';
        } else if(G.sel){
          var base=baseOf(G.sel), o=odds(base), tot=G.deck.length, kost=G.rows[G.sel.r].length+1, best="hoger";
          ["lager","gelijk"].forEach(function(x){ if(o[x]>o[best])best=x; });
          h+='<p class="hint blackout-who" id="blackout-ask">Aangewezen: <b>'+esc(A.cardName(base))+'</b> (rij '+(G.sel.r+1)+'). Is de bovenste kaart van de stapel hoger, gelijk of lager? Fout kost '+slok(kost)+'.</p><div class="blackout-ch">';
          [["hoger","▲ Hoger"],["gelijk","= Gelijk"],["lager","▼ Lager"]].forEach(function(x){
            h+='<button data-g="'+x[0]+'"'+(k&&best===x[0]?' class="blackout-best"':'')+'><b>'+x[1]+'</b><small>'+WOORD[x[0]]+' '+esc(A.cardName(base))+'</small><small class="kans">'+pct(tot?o[x[0]]/tot:0,0)+' · '+o[x[0]]+' van '+tot+'</small></button>';
          });
          h+='</div>';
        } else {
          if(G.last) h+='<div class="verdict '+(G.last.ok?'win':'fout')+' blackout-v"><p>'+A.cardHtml(G.last.c,"small")+'<span>'+esc(G.last.t)+'</span></p></div>';
          h+='<p class="hint">'+esc(A.name(i))+': tik op de buitenste kaart van een rij (links of rechts) en raad daarna of de volgende kaart van de stapel hoger of lager is.</p>';
        }
        h+='<p class="hint blackout-note">Bij een fout drink je zoveel slokken als de rij dan kaarten telt, de nieuwe kaart meegeteld. Na drie keer achter elkaar goed gaat de beurt door.</p>';
        if(!G.over) h+='<div class="btnrow"><button class="btn'+(sure?' danger':'')+'" id="blackout-new">'+(sure?'Zeker weten? Tik nog eens':'Nieuw spel')+'</button></div>';
        if(G.log&&G.log.length) h+='<div class="log">'+G.log.map(function(t){return '<div>'+esc(t)+'</div>';}).join("")+'</div>';
        root.innerHTML=h;

        root.querySelectorAll("button[data-r]").forEach(function(b){ b.onclick=function(){
          var r=+b.getAttribute("data-r"), e=b.getAttribute("data-e");
          G.sel=(G.sel&&G.sel.r===r&&G.sel.e===e)?null:{r:r,e:e}; sure=false; A.save(); A.play("tick"); render();
          var ask=el("blackout-ask"); if(ask&&ask.scrollIntoView) try{ ask.scrollIntoView({block:"nearest"}); var ch=root.querySelector(".blackout-ch"); if(ch)ch.scrollIntoView({block:"nearest"}); }catch(x){}
        }; });
        root.querySelectorAll("button[data-g]").forEach(function(b){ b.onclick=function(){ guess(b.getAttribute("data-g")); }; });
        var nw=el("blackout-new"); if(nw) nw.onclick=function(){
          /* een lopend spel niet per ongeluk weggooien: tweede tik bevestigt */
          if(!G.over&&G.deck.length<52-ROWS&&!sure){ sure=true; render(); return; }
          newGame();
        };
      }

      this.refresh=render;
      /* een andere speler aantikken in de balk = die is aan de beurt; zijn telling begint op nul */
      this.onPlayer=function(){ G.streak=0; G.sel=null; sure=false; A.save(); render(); };
      if(valid()) render(); else newGame();
    }
  });
})();
