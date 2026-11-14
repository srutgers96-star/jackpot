/* ===== Sixteen ===== */
(function(){
  "use strict";
  var A=App, el=A.el, esc=A.esc;
  var MAXP=16; /* drie kaarten per speler plus twee open kaarten uit één spel van 52 */

  if(!document.getElementById("sixteen-style")){
    var css=document.createElement("style"); css.id="sixteen-style";
    css.textContent=
      ".sixteen-table{display:flex;justify-content:center;align-items:flex-start;gap:8px;}"+
      ".sixteen-pile{display:flex;flex-direction:column;align-items:center;gap:8px;padding:6px 4px;border:0;border-radius:14px;background:none;color:var(--ivory-dim);font-size:12px;line-height:1.2;min-width:0;}"+
      ".sixteen-lbl b{color:var(--ivory);font-size:14px;}"+
      "button.sixteen-pile.sixteen-target{outline:2px dashed var(--gold);outline-offset:-2px;background:rgba(231,184,79,.12);}"+
      ".sixteen-stock{align-self:center;}"+
      ".sixteen-sum{text-align:center;font-size:15px;color:var(--ivory-dim);margin-top:6px;}"+
      ".sixteen-sum b{color:var(--ivory);font-size:19px;}"+
      ".sixteen-sum b.sixteen-hit{color:var(--gold);}"+
      ".sixteen-hand{display:flex;justify-content:center;gap:12px;margin:16px 0 6px;min-height:104px;}"+
      ".sixteen-hand .card{width:68px;height:98px;border-radius:9px;}"+
      ".sixteen-hand .card b,.sixteen-hand .card i{font-size:28px;}"+
      ".sixteen-wrap .btn{min-height:42px;}"+
      ".sixteen-wrap .seg button{min-height:40px;}"+
      ".sixteen-seglbl{font-size:12px;color:var(--ivory-dim);align-self:center;}"+
      ".sixteen-note{font-size:12px;padding:2px 8px 8px;}";
    document.head.appendChild(css);
  }

  /* puntentelling: 2 t/m 10 = de kaart, boer 11, vrouw 12, heer 13, aas 14 */
  function val(c){ return c.r===1?14:c.r; }
  function rankOf(v){ return A.RANKS[v===14?1:v]; }
  function slok(n){ return n+" "+(n===1?"slok":"slokken"); }
  function newTurn(){ return {laid:0,six:0,sips:0,atjes:0,same:0,cards:[]}; }

  A.register({ id:"sixteen", beta:true, title:"Sixteen", level:"app", sub:"Deelt de kaarten, telt de stapels en zegt wie drinkt",
    init:function(root){
      var G=A.gs("sixteen"), sel=null, shuffled=false;

      function next(i){ return (i+1)%G.game.n; }
      function prev(i){ return (i-1+G.game.n)%G.game.n; }
      function top(p){ var s=G.game.piles[p]; return s[s.length-1]; }

      /* De regels noemen "twee open stapels": bij het delen draait de app voor elke stapel één kaart om.
         Zijn die twee toevallig samen zestien, dan drinkt niemand: niemand heeft die zestien gelegd. */
      function deal(){
        var n=A.S.players.length, d=A.deck(0), hands=[], i, k;
        for(i=0;i<n;i++) hands.push([]);
        for(k=0;k<3;k++) for(i=0;i<n;i++) hands[i].push(d.pop());
        var cur=A.S.active<n?A.S.active:0;
        G.game={n:n, deck:d, piles:[[d.pop()],[d.pop()]], hands:hands, cur:cur, phase:"wait", turn:newTurn(), last:""};
        sel=null; A.S.active=cur; A.save(); A.renderPlayers();
      }
      /* De regels zeggen niet wat er gebeurt als de gesloten stapel op is. Gewone kaartpraktijk:
         de open stapels worden, op de bovenste kaart na, geschud tot een nieuwe gesloten stapel. */
      function draw(){
        var g=G.game;
        if(!g.deck.length){
          var rest=[]; g.piles.forEach(function(p){ while(p.length>1) rest.push(p.shift()); });
          if(!rest.length) return null;
          g.deck=A.shuffle(rest); shuffled=true;
        }
        return g.deck.pop();
      }
      function refill(i){ var h=G.game.hands[i], c; while(h.length<3){ c=draw(); if(!c)break; h.push(c); } }
      /* kan speler i met een kaart uit de hand (nog) een zestien maken? */
      function canSix(i){
        var a=16-val(top(0)), b=16-val(top(1));
        return G.game.hands[i].some(function(c){ var v=val(c); return v===a||v===b; });
      }
      /* houdt het spel in de pas met de spelerslijst bovenin (die buiten dit bestand verandert) */
      function sync(){
        var n=A.S.players.length, g=G.game;
        if(n<2) return "few";
        if(n>MAXP) return "many";
        if(!g) return "none";
        if(g.n>n) return "gone";
        if(g.n<n){ while(g.n<n){ g.hands[g.n]=[]; g.n++; refill(g.n-1); } A.save(); } /* nieuwe speler schuift aan: drie kaarten van de stapel */
        if(g.cur>=g.n) g.cur=0;
        if(A.S.active!==g.cur){ A.S.active=g.cur; A.save(); A.renderPlayers(); }
        return "ok";
      }

      function reveal(sub){
        if(sync()!=="ok"){ render(); return; }
        var g=G.game, i=g.cur;
        A.handover(i,sub,function(){
          if(G.game!==g||g.cur!==i||sync()!=="ok"){ render(); return; }
          g.phase="play"; sel=null; A.save(); render();
        });
      }

      function lay(hi,pi){
        if(sync()!=="ok"){ render(); return; }
        var g=G.game, i=g.cur, T=g.turn, hand=g.hands[i], card=hand[hi]; if(!card||g.phase!=="play") return;
        var under=top(pi), other=top(1-pi);
        var six=val(card)+val(other)===16, dbl=six&&card.r===8, same=under.r===card.r;
        /* Variant 1: een extra kaart in dezelfde beurt mag alleen als de stapels daarmee weer zestien vormen. */
        if(T.laid>0&&!six){ A.toast("Dat wordt geen zestien","Een extra kaart mag alleen als de twee stapels samen weer zestien zijn. Kies anders of tik op Beurt klaar.",4500); return; }
        var nx=next(i), pv=prev(i);
        hand.splice(hi,1); g.piles[pi].push(card); sel=null; T.laid++; T.cards.push(A.cardName(card));
        if(six){
          T.six++;
          /* Regel 3.I gelezen als uitzondering op regel 3: bij twee achten drinkt niet de volgende een slok,
             maar trekt de vorige speler (de speler vóór wie de kaart legde) een adtje. */
          if(dbl){ A.atje(pv,1); T.atjes++; } else { A.drink(nx,1); T.sips++; }
        }
        /* Variant 2: zelfde waarde op elkaar gelegd, de volgende speler drinkt één slok (komt bovenop een zestien). */
        if(G.same&&same){ A.drink(nx,1); T.sips++; T.same++; }
        A.play("clack");
        /* Variant 1: wie nog een zestien kan maken mag doorleggen; elke zestien is een slok, twee keer zestien dus twee slokken. */
        if(G.multi&&six&&canSix(i)){
          A.save(); render(); A.play("ding");
          A.toast(dbl?"8 + 8!":"Zestien!",(dbl?A.name(pv)+" trekt een adtje.":A.name(nx)+" drinkt 1 slok.")+" Je kunt nog een zestien maken.",4000);
          return;
        }
        endTurn();
      }

      function endTurn(){
        var g=G.game, i=g.cur, T=g.turn, nx=next(i), pv=prev(i), t0=top(0), t1=top(1);
        shuffled=false; refill(i); /* regel 4: na het opleggen weer aanvullen tot drie kaarten */
        var what=A.name(i)+" legt "+A.joinNames(T.cards)+".", drinks=[], why=[], nSix=T.six-T.atjes;
        if(T.atjes) drinks.push(A.name(pv)+" trekt "+(T.atjes===1?"een adtje":T.atjes+" adtjes")+": zestien met twee achten.");
        if(nSix===1) why.push("zestien"); else if(nSix>1) why.push(nSix+" keer zestien");
        if(T.same) why.push(T.same===1?"zelfde waarde op elkaar":T.same+" keer zelfde waarde op elkaar");
        if(T.sips) drinks.push(A.name(nx)+" drinkt "+slok(T.sips)+": "+why.join(" en ")+".");
        g.last=what+" "+(drinks.length?drinks.join(" "):"Geen zestien.");
        g.cur=nx; g.phase="wait"; g.turn=newTurn(); sel=null; A.S.active=nx; A.save(); A.renderPlayers(); render();
        if(shuffled) A.toast("Stapel geschud","De gesloten stapel was op. De open stapels zijn, op de bovenste kaarten na, geschud tot een nieuwe gesloten stapel.",5000);
        if(!drinks.length){ reveal(g.last+" Laat niemand meekijken."); return; }
        var kind=T.atjes?"dood":T.six?"win":"info", title=T.atjes?"8 + 8!":T.six>1?T.six+"× 16!":T.six?"16!":"Dubbel";
        A.play(T.atjes?"dood":T.six>1?"special":T.six?"win":"ding");
        A.overlay(kind,title,drinks.concat([what]),0,'<div class="cards">'+A.cardHtml(t0,"big")+A.cardHtml(t1,"big")+'</div>');
        A.onOverlayClose(function(){ if(G.game===g&&g.cur===nx) reveal("Laat niemand meekijken."); else render(); });
      }

      function segHtml(){
        return '<div class="seg" style="margin-top:14px"><span class="sixteen-seglbl">varianten:</span>'+
          '<button id="sixteen-multi" aria-pressed="'+!!G.multi+'">twee keer zestien: doorleggen</button>'+
          '<button id="sixteen-same" aria-pressed="'+!!G.same+'">zelfde waarde: slok</button></div>'+
          /* Variant 3 (slok als je vergeet een derde kaart te pakken) kan hier niet voorkomen: de app vult de hand zelf aan. */
          '<p class="hint sixteen-note">De app pakt na je beurt vanzelf een nieuwe kaart; de strafslok voor vergeten te pakken (variant 3) speelt hier dus niet.</p>';
      }
      function handBtn(c,idx){
        return '<button class="card'+(A.isRed(c)?' red':'')+(sel===idx?' sel':'')+'" data-h="'+idx+'" aria-label="'+esc(A.cardName(c))+'" aria-pressed="'+(sel===idx)+'"><b>'+esc(A.RANKS[c.r])+'</b><i>'+esc(A.SUITS[c.s])+'</i></button>';
      }

      function render(){
        var st=sync(), g=G.game, h='<div class="sixteen-wrap">';
        if(st!=="ok"){
          h+='<p class="hint">'+(st==="few"?"Sixteen speel je met minstens twee spelers: de volgende speler drinkt. Voeg bovenin een speler toe en tik dan op Kaarten delen."
            :st==="many"?"Met drie kaarten per speler kunnen er hooguit "+MAXP+" spelers meedoen met één spel kaarten."
            :st==="gone"?"Er is een speler weggegaan, dus de handen kloppen niet meer. Deel opnieuw."
            :"Er zijn nog geen kaarten gedeeld.")+'</p><div class="btnrow"><button class="btn gold" id="sixteen-new">Kaarten delen</button></div>'+segHtml()+'</div>';
          root.innerHTML=h; bind(); return;
        }
        var i=g.cur, T=g.turn, play=g.phase==="play", hand=g.hands[i], t=[top(0),top(1)], sum=val(t[0])+val(t[1]);
        if(sel!==null&&!hand[sel]) sel=null;
        h+='<p class="hint">'+esc(g.last||"Gedeeld: ieder drie kaarten, twee open stapels. De twee bovenste kaarten moeten samen zestien worden.")+'</p>';
        h+='<div class="board"><div class="sixteen-table">';
        [0,1].forEach(function(p){
          var need=rankOf(16-val(t[1-p]));
          var inner=A.cardHtml(t[p],"big")+'<span class="sixteen-lbl">hier een <b>'+esc(need)+'</b> = 16</span>';
          h+=play?'<button class="sixteen-pile'+(sel!==null?' sixteen-target':'')+'" data-p="'+p+'" aria-label="Open stapel '+(p+1)+': '+esc(A.cardName(t[p]))+'">'+inner+'</button>'
                 :'<div class="sixteen-pile">'+inner+'</div>';
        });
        h+='<div class="sixteen-pile sixteen-stock">'+A.cardHtml(null,"back")+'<span class="sixteen-lbl">dicht: <b>'+g.deck.length+'</b></span></div></div>';
        h+='<div class="sixteen-sum">'+val(t[0])+' + '+val(t[1])+' = <b'+(sum===16?' class="sixteen-hit"':'')+'>'+sum+'</b></div>';
        h+='<div class="stat"><span>B <b>11</b> · V <b>12</b> · H <b>13</b> · A <b>14</b></span><span>zestien: volgende <b>1 slok</b> · 8 + 8: vorige <b>adtje</b></span></div></div>';
        if(!play){
          h+='<p class="hint"><b>'+esc(A.name(i))+'</b> is aan de beurt. Geef de telefoon door.</p>';
          h+='<div class="btnrow"><button class="btn gold" id="sixteen-show">Kaarten van '+esc(A.name(i))+' tonen</button></div>';
        } else {
          h+='<div class="sixteen-hand">'+hand.map(handBtn).join("")+'</div>';
          h+='<p class="hint">'+(sel!==null?'Tik de stapel waar <b>'+esc(A.cardName(hand[sel]))+'</b> op moet.'
            :T.laid>0?'Zestien! Leg nog een kaart die weer zestien maakt, of stop.'
            :'<b>'+esc(A.name(i))+'</b>, tik een kaart en daarna de stapel waar hij op moet.')+'</p>';
          if(T.laid>0) h+='<div class="btnrow"><button class="btn primary" id="sixteen-done">Beurt klaar</button></div>';
        }
        h+=segHtml()+'<div class="btnrow"><button class="btn" id="sixteen-new">Nieuw spel</button></div></div>';
        root.innerHTML=h; bind();
      }

      function bind(){
        var b=el("sixteen-new"); if(b) b.onclick=function(){ var n=A.S.players.length; if(n>=2&&n<=MAXP) deal(); render(); };
        b=el("sixteen-multi"); if(b) b.onclick=function(){
          G.multi=!G.multi; A.save(); var g=G.game;
          if(!G.multi&&g&&sync()==="ok"&&g.phase==="play"&&g.turn.laid>0){ endTurn(); return; } /* doorleggen uitgezet midden in een beurt: beurt klaar */
          render();
        };
        b=el("sixteen-same"); if(b) b.onclick=function(){ G.same=!G.same; A.save(); render(); };
        b=el("sixteen-show"); if(b) b.onclick=function(){ reveal("Laat niemand meekijken."); };
        b=el("sixteen-done"); if(b) b.onclick=function(){ if(sync()!=="ok"||G.game.phase!=="play"||!G.game.turn.laid){ render(); return; } endTurn(); };
        root.querySelectorAll("[data-h]").forEach(function(x){ x.onclick=function(){ var k=+x.getAttribute("data-h"); sel=(sel===k?null:k); A.play("tick"); render(); }; });
        root.querySelectorAll("[data-p]").forEach(function(x){ x.onclick=function(){
          if(sel===null){ A.toast("Kies eerst een kaart","Tik een kaart uit je hand en daarna de stapel.",2500); return; }
          lay(sel,+x.getAttribute("data-p"));
        }; });
      }

      /* herstel na herladen: een half gespeeld spel gaat verder, maar een hand staat nooit meteen open */
      var g0=G.game;
      if(g0&&!(g0.hands&&g0.deck&&g0.turn&&g0.turn.cards&&g0.piles&&g0.piles.length===2&&g0.piles[0].length&&g0.piles[1].length&&g0.hands.length===g0.n)) G.game=null;
      if(G.game&&G.game.phase==="play") G.game.phase="wait";
      if(!G.game&&A.S.players.length>=2&&A.S.players.length<=MAXP) deal();
      render();

      this.refresh=render;
      /* een andere speler aangetikt in de balk: die is nu aan de beurt, de open hand gaat dicht */
      this.onPlayer=function(i){
        var g=G.game;
        if(g&&g.n<=A.S.players.length&&i<A.S.players.length){
          if(g.turn.laid>0&&g.cur<g.n) refill(g.cur);
          g.turn=newTurn(); g.cur=i; g.phase="wait"; sel=null; A.save();
        }
        render();
      };
    }
  });
})();
