/* ===== Vierkanten ===== */
(function(){
  "use strict";
  var A=App, esc=A.esc, pct=A.pct, ID="vierkanten", N=16;
  var docH=null; /* luistert mee of de spelers bovenin veranderen (zie init) */

  /* Keuzes waar de bijbel niets over zegt (zie ook de opmerkingen bij guess, chain en deal):
     - De aas is hoog en een gelijke kaart is fout. Zo staat het in de bijbel bij de andere hoger/lager-spellen
       (Magic Bussen, Piramide Spel, Fuck the Dealer: "de Aas is hoog"; Total Black-Out: "gelijke kaart = fout").
     - Een omgedraaide kaart blijft open liggen, goed of fout: alleen zo wordt het "moeilijker voor de volgende speler". */
  function val(c){ return c.r===1?14:c.r; }
  function slok(n){ return n+" "+(n===1?"slok":"slokken"); }
  /* ring van 16 kaarten met de klok mee, 0 = linksboven; de hoeken zijn 0, 4, 8 en 12 */
  function pos(i){ if(i<=4)return [1,i+1]; if(i<=7)return [i-3,5]; if(i<=12)return [5,13-i]; return [17-i,1]; }

  if(!document.getElementById("vierkanten-style")){
    var st=document.createElement("style"); st.id="vierkanten-style";
    st.textContent=
      ".vierkanten-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;max-width:380px;margin:0 auto;}"+
      ".vierkanten-cell{display:block;align-self:start;width:100%;min-width:0;border:0;background:none;padding:0;margin:0;border-radius:7px;}"+
      ".vierkanten-cell .card{display:flex;width:100%;height:auto;aspect-ratio:3/4;}"+
      ".vierkanten-cell .card b,.vierkanten-cell .card i{font-size:22px;}"+
      "button.vierkanten-cell .card.back{box-shadow:0 0 0 2px var(--gold),0 3px 0 #4f1a14,0 4px 8px rgba(0,0,0,.3);}"+
      ".vierkanten-cell .card.sel{transform:scale(1.07);outline-offset:1px;}"+
      ".vierkanten-dim{opacity:.5;}"+
      ".vierkanten-ref .card{outline:3px solid var(--gold);outline-offset:1px;}"+
      ".vierkanten-new .card{animation:popin .35s cubic-bezier(.2,1.4,.4,1);}"+
      ".vierkanten-mid{grid-row:2/5;grid-column:2/5;display:flex;flex-direction:column;justify-content:center;gap:6px;padding:2px 6px;text-align:center;min-width:0;}"+
      ".vierkanten-who{font-size:16px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}"+
      ".vierkanten-streak{font-size:12px;color:var(--ivory-dim);}"+
      ".vierkanten-streak i{display:inline-block;width:10px;height:10px;border-radius:50%;border:1.5px solid var(--gold);margin:0 2px;vertical-align:-1px;}"+
      ".vierkanten-streak i.on{background:var(--gold);}"+
      ".vierkanten-msg{font-size:13px;line-height:1.3;}"+
      ".vierkanten-fee{font-size:12px;color:var(--ivory-dim);}"+
      ".vierkanten-g{min-height:44px;width:100%;border-radius:10px;border:1.5px solid var(--gold);background:rgba(0,0,0,.25);color:var(--ivory);font-size:17px;font-weight:900;line-height:1.15;padding:6px 8px;display:flex;align-items:center;justify-content:center;gap:8px;}"+
      ".vierkanten-g.vierkanten-gold{background:var(--gold);color:var(--ink);font-size:15px;}"+
      ".vierkanten-g small{font-size:12px;font-weight:700;color:var(--ivory-dim);}"+
      ".vierkanten-last{margin:10px 0 0;padding:10px 12px;border-radius:10px;font-size:14px;line-height:1.35;text-align:center;border:1.5px solid rgba(243,233,210,.25);background:rgba(0,0,0,.2);}"+
      ".vierkanten-last.vierkanten-ok{border-color:var(--gold);background:rgba(231,184,79,.14);}"+
      ".vierkanten-last.vierkanten-fout{border-color:var(--red);background:rgba(200,75,58,.2);}";
    document.head.appendChild(st);
  }

  A.register({ id:ID, beta:true, title:"Vierkanten", level:"app", kans:true, sub:"Legt het vierkant, keurt hoger/lager en binnen/buiten, telt drie op rij en de slokken",
    init:function(root){
      var G=A.gs(ID), sel=null, drawn="";

      /* ook een bewaard spel uit een oudere versie moet zestien echte kaarten hebben, anders wordt er opnieuw gelegd */
      function valid(){
        return Array.isArray(G.board)&&G.board.length===N&&Array.isArray(G.open)&&G.open.length===N&&
          G.board.every(function(c){ return c&&typeof c.r==="number"&&c.r>=1&&c.r<=13&&typeof c.s==="number"&&c.s>=0&&c.s<=3; });
      }
      /* wat er van de spelersbalk op het scherm staat: aantal, wie aan de beurt is en de namen */
      function sig(){ return A.S.active+"|"+A.S.players.map(function(q){return q.name;}).join("|"); }
      /* Nieuw vierkant: 16 kaarten uit een geschud spel, de vier hoeken open (regel 1).
         keepTurn: het vierkant was op; wie aan de beurt is gaat verder en houdt zijn reeks, want drie op rij is nog
         steeds de voorwaarde om door te geven (de bijbel zegt niet wat er gebeurt als alle kaarten open liggen). */
      function deal(keepTurn){
        G.board=A.deck(0).slice(0,N); G.open=[]; for(var i=0;i<N;i++)G.open.push(i%4===0);
        if(!keepTurn||G.who!==A.S.active){ G.streak=0; }
        G.who=A.S.active; G.np=A.S.players.length; G.last=null; sel=null; A.save();
      }
      /* Houdt G.who gelijk aan A.S.active. Core roept het spel niet aan als er een speler wordt verwijderd, dus dat
         wordt hier gemerkt aan het aantal spelers: de reeks van iemand die weg is gaat niet over op een ander. */
      function sync(){
        var np=A.S.players.length, turn=false, dirty=false;
        if(!(A.S.active>=0&&A.S.active<np)){ A.S.active=0; dirty=true; A.renderPlayers(); } /* beurt buiten de lijst (oude opslag) */
        if(G.who!==A.S.active||(typeof G.np==="number"&&np<G.np)){ G.who=A.S.active; G.streak=0; sel=null; turn=true; dirty=true; }
        if(G.np!==np){ G.np=np; dirty=true; }
        if(dirty)A.save();
        return turn; /* true = de beurt is van iemand anders geworden */
      }
      function openN(i){ return [(i+N-1)%N,(i+1)%N].filter(function(j){return G.open[j];}); }
      function guessable(i){ return !G.open[i]&&openN(i).length>0; }
      function closedLeft(){ return G.open.filter(function(o){return !o;}).length; }
      /* Regel 5: het aantal open kaarten dat aaneengesloten aan kaart i ligt, langs de rand van het vierkant, in beide
         richtingen. De geraden kaart zelf telt niet mee ("open kaarten aan de fout geraden kaart"). */
      function chain(i){
        var seen={}, n=0, j;
        for(j=(i+1)%N; j!==i&&G.open[j]; j=(j+1)%N){ seen[j]=1; n++; }
        for(j=(i+N-1)%N; j!==i&&G.open[j]&&!seen[j]; j=(j+N-1)%N){ n++; }
        return n;
      }
      /* kansen op basis van alle kaarten die nog niet open liggen (rest van het spel plus de dichte kaarten) */
      function probs(i){
        var cnt=[], r, k, nb=openN(i), a=0, b=0, tot=0, v, x, y, lo, hi;
        for(r=1;r<=13;r++)cnt[r]=4;
        for(k=0;k<N;k++) if(G.open[k]) cnt[G.board[k].r]--;
        if(nb.length===2){ x=val(G.board[nb[0]]); y=val(G.board[nb[1]]); lo=Math.min(x,y); hi=Math.max(x,y); }
        else { x=val(G.board[nb[0]]); }
        for(r=1;r<=13;r++){ v=r===1?14:r; tot+=cnt[r];
          if(nb.length===2){ if(v>lo&&v<hi)a+=cnt[r]; else if(v<lo||v>hi)b+=cnt[r]; }
          else { if(v>x)a+=cnt[r]; else if(v<x)b+=cnt[r]; } }
        return [a/tot,b/tot];
      }

      function guess(choice){
        if(sync()){ render(); return; } /* de beurt is van een ander geworden sinds het scherm getekend is */
        var i=sel; if(i===null||!guessable(i))return;
        var who=G.who, c=G.board[i], v=val(c), nb=openN(i), ok, detail, a, b, lo, hi, n=chain(i);
        if(nb.length===1){ /* regel 2: hoger of lager dan de ene open buurkaart; gelijk is fout */
          a=G.board[nb[0]];
          ok=choice==="hoger"?v>val(a):v<val(a);
          detail=v===val(a)?A.cardName(c)+" is gelijk aan "+A.cardName(a)+", en gelijk is fout.":A.cardName(c)+" is "+(v>val(a)?"hoger":"lager")+" dan "+A.cardName(a)+".";
        } else { /* regel 3: binnen of buiten de twee open buurkaarten; precies op een van de twee is fout */
          a=G.board[nb[0]]; b=G.board[nb[1]]; lo=Math.min(val(a),val(b)); hi=Math.max(val(a),val(b));
          ok=choice==="binnen"?(v>lo&&v<hi):(v<lo||v>hi);
          detail=(v===lo||v===hi)?A.cardName(c)+" is gelijk aan "+A.cardName(v===val(a)?a:b)+", en gelijk is fout.":A.cardName(c)+" valt "+(v>lo&&v<hi?"binnen":"buiten")+" "+A.cardName(a)+" en "+A.cardName(b)+".";
        }
        G.open[i]=true; sel=null;
        if(ok){
          G.streak=(G.streak||0)+1;
          G.last={ok:true,text:A.name(who)+" zei "+choice+": goed. "+detail};
          A.save();
          if(G.streak===3){ A.play("win"); A.toast("Drie op rij!",A.name(who)+(A.S.players.length>1?" mag de beurt doorgeven aan "+A.name((who+1)%A.S.players.length)+", of doorspelen.":" mag stoppen of doorspelen."),3800); }
          else A.play("ding");
        } else {
          /* Regel 4 vraagt drie keer achter elkaar goed: een fout breekt de reeks, ook als de speler al drie goed had
             en vrijwillig doorspeelde. Dan moet hij opnieuw drie op rij halen voor hij mag doorgeven. */
          G.streak=0;
          G.last={ok:false,text:A.name(who)+" zei "+choice+": fout. "+detail+" "+A.name(who)+" drinkt "+slok(n)+" ("+(n===1?"één open kaart":n+" open kaarten")+" aaneengesloten)."};
          A.drink(who,n); A.play("dood");
          A.overlay("dood","Fout!",[A.name(who)+" drinkt "+slok(n)+".",detail],0,'<div class="cards">'+A.cardHtml(c,"big")+'</div>');
          A.onOverlayClose(null);
        }
        A.save(); render(i);
      }
      function pass(){
        if(sync()||G.streak<3){ render(); return; } /* regel 4: doorgeven mag pas na drie op rij, en alleen door wie aan de beurt is */
        G.streak=0; G.last=null; sel=null; A.nextPlayer(); G.who=A.S.active; A.save(); render();
      }

      function render(fresh){
        var p=A.S.players, i, h="", nb, rc, cls, pr, n, left, ref={};
        sync(); /* andere speler aangetikt of speler verwijderd */
        if(sel!==null&&!guessable(sel))sel=null;
        if(sel!==null)openN(sel).forEach(function(j){ref[j]=1;});
        left=closedLeft();
        if(p.length<2||p.length>6) h+='<p class="hint">De bijbel speelt Vierkanten met 2 tot 6 spelers, nu '+(p.length===1?'is er 1 speler':'zijn er '+p.length+' spelers')+'. Het werkt wel, pas de spelers hierboven aan als je wilt.</p>';
        h+='<div class="board"><div class="vierkanten-grid">';
        for(i=0;i<N;i++){
          rc=pos(i); cls='vierkanten-cell'+(fresh===i?' vierkanten-new':'')+(ref[i]?' vierkanten-ref':'');
          if(G.open[i]) h+='<div class="'+cls+'" style="grid-row:'+rc[0]+';grid-column:'+rc[1]+'">'+A.cardHtml(G.board[i],"")+'</div>';
          else if(guessable(i)) h+='<button class="'+cls+'" data-i="'+i+'" style="grid-row:'+rc[0]+';grid-column:'+rc[1]+'" aria-label="Dichte kaart, tik om te raden" aria-pressed="'+(sel===i)+'">'+A.cardHtml(null,sel===i?"sel":"back")+'</button>';
          else h+='<div class="'+cls+' vierkanten-dim" style="grid-row:'+rc[0]+';grid-column:'+rc[1]+'">'+A.cardHtml(null,"back")+'</div>';
        }
        /* het midden van het vierkant: wie is aan de beurt, de reeks en de keuze */
        h+='<div class="vierkanten-mid"><span class="vierkanten-who">'+esc(A.name(G.who))+'</span><span class="vierkanten-streak">';
        for(i=0;i<3;i++)h+='<i'+(i<G.streak?' class="on"':'')+'></i>';
        h+=' '+(G.streak>3?G.streak+' goed op rij':Math.min(G.streak,3)+' van 3 goed')+'</span>';
        if(!left){
          h+='<span class="vierkanten-msg">Alle kaarten liggen open: het vierkant is op.</span><button class="vierkanten-g vierkanten-gold" data-act="new">Nieuw vierkant</button>';
          if(G.streak>=3&&p.length>1) h+='<button class="vierkanten-g" data-act="pass">Geef door aan '+esc(A.name((G.who+1)%p.length))+'</button>';
        } else if(sel!==null){
          nb=openN(sel); pr=probs(sel); n=chain(sel);
          if(nb.length===1){
            h+='<span class="vierkanten-msg">Hoger of lager dan '+esc(A.cardName(G.board[nb[0]]))+'?</span>'+
              '<button class="vierkanten-g" data-g="hoger">Hoger<small class="kans">'+pct(pr[0],0)+'</small></button>'+
              '<button class="vierkanten-g" data-g="lager">Lager<small class="kans">'+pct(pr[1],0)+'</small></button>';
          } else {
            h+='<span class="vierkanten-msg">Binnen of buiten '+esc(A.cardName(G.board[nb[0]]))+' en '+esc(A.cardName(G.board[nb[1]]))+'?</span>'+
              '<button class="vierkanten-g" data-g="binnen">Binnen<small class="kans">'+pct(pr[0],0)+'</small></button>'+
              '<button class="vierkanten-g" data-g="buiten">Buiten<small class="kans">'+pct(pr[1],0)+'</small></button>';
          }
          h+='<span class="vierkanten-fee">Fout kost '+slok(n)+'</span>';
        } else {
          if(G.streak>=3){
            h+='<button class="vierkanten-g vierkanten-gold" data-act="pass">'+(p.length>1?'Geef door aan '+esc(A.name((G.who+1)%p.length)):'Beurt klaar')+'</button>'+
              '<span class="vierkanten-msg">Of speel door en maak het zwaarder voor de volgende: tik een dichte kaart.</span>';
          } else {
            h+='<span class="vierkanten-msg">Tik een dichte kaart naast een open kaart.</span><span class="vierkanten-fee">Drie op rij goed, dan mag je doorgeven.</span>';
          }
        }
        h+='</div></div></div>';
        if(G.last&&typeof G.last.text==="string") h+='<p class="vierkanten-last '+(G.last.ok?'vierkanten-ok':'vierkanten-fout')+'">'+esc(G.last.text)+'</p>';
        h+='<p class="hint">Naast één open kaart: hoger of lager. Tussen twee open kaarten: binnen of buiten. De aas is hoog, gelijk is fout. Fout: één slok per open kaart die aaneengesloten aan jouw kaart ligt.</p>';
        h+='<div class="btnrow"><button class="btn" data-act="reset">Nieuw spel</button></div>';
        root.innerHTML=h; drawn=sig();
        root.querySelectorAll("[data-i]").forEach(function(b){ b.onclick=function(){ var k=+b.getAttribute("data-i"); sel=(sel===k?null:k); A.play("tick"); render(); }; });
        root.querySelectorAll("[data-g]").forEach(function(b){ b.onclick=function(){ guess(b.getAttribute("data-g")); }; });
        root.querySelectorAll("[data-act]").forEach(function(b){ b.onclick=function(){
          var act=b.getAttribute("data-act");
          if(act==="pass") pass();
          else { deal(act==="new"); render(); }
        }; });
      }

      if(!valid()||typeof G.streak!=="number"||!(G.streak>=0)) deal(false);
      render();
      /* Core meldt het niet als er een speler bij komt, weggaat of een andere naam krijgt. Daarom na elke tik even
         kijken of de spelersbalk nog klopt met wat er getekend is, en anders opnieuw tekenen. */
      if(docH&&document.removeEventListener)document.removeEventListener("click",docH);
      docH=function(){ if(sig()!==drawn) render(); };
      if(document.addEventListener)document.addEventListener("click",docH);
      this.refresh=function(){ render(); };
      this.onPlayer=function(){ G.who=A.S.active; G.streak=0; sel=null; A.save(); render(); };
    },
    destroy:function(){ if(docH&&document.removeEventListener)document.removeEventListener("click",docH); docH=null; }
  });
})();
