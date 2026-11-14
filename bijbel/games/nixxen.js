/* ===== Nixxen =====
   Vijf stenen, per worp leg je er één weg (drieën vrij), een 3 telt 0. Hoogste score drinkt de laagste score.
   Keuzes waar de bijbel niets of iets dubbelzinnigs zegt:
   - "Slechts één dobbelsteen laten liggen, met uitzondering van de drie": per worp minstens één steen weg,
     hooguit één steen die geen 3 is, en daarnaast zoveel drieën als je wilt (alleen drieën wegleggen mag dus ook).
   - Double or nothing eindigt opnieuw gelijk bovenaan: die spelers spelen nog een keer, de inzet blijft twee keer.
   - Vijf gelijke stenen in een double or nothing ronde: "de regels zijn hetzelfde", dus elke andere speler aan tafel een adtje.
   - Wie de volgende ronde begint staat er niet: de start schuift met de klok mee een speler op (tik op een naam om het anders te doen).
   Vijf stenen, dus geen adtje kruk (dat is alleen voor spellen met twee stenen). */
(function(){
  "use strict";
  var A=App, el=A.el, esc=A.esc, ID="nixxen";
  if(!document.getElementById("nixxen-style")){
    var css=document.createElement("style"); css.id="nixxen-style";
    css.textContent=".nixxen-dice .dice,.dice.nixxen-dice{gap:8px}"+
      ".nixxen-dice .die{width:54px;height:54px;padding:8px;border-radius:11px}"+
      ".nixxen-dice .die.blank{font-size:26px}"+
      ".nixxen-dice .die .pip{width:9px;height:9px}"+
      ".nixxen-tag{font-size:11px;line-height:1.2;min-height:14px;color:var(--ivory-dim)}"+
      ".nixxen-tag.on{color:var(--gold);font-weight:700}"+
      ".nixxen-t td{white-space:nowrap}"+
      ".nixxen-t td:first-child{white-space:normal;word-break:break-word}"+
      ".nixxen-t .dsmall{width:24px;height:24px;padding:3px;margin:0 1px;border-radius:6px}"+
      ".nixxen-t .dsmall .pip{width:5px;height:5px}"+
      ".nixxen-act .btn{min-height:44px}"+
      ".nixxen-first{font-size:12px;padding:8px 0 0}"+
      ".nixxen-uitleg{font-size:12px}";
    document.head.appendChild(css);
  }
  function pts(d){ var s=0; for(var i=0;i<d.length;i++) if(d[i]!==3) s+=d[i]; return s; } /* de 3 telt 0 */
  function allSame(d){ return d.length===5&&d.every(function(v){ return v===d[0]; }); }
  function slok(n){ return n+(n===1?" slok":" slokken"); }
  function punt(n){ return n+(n===1?" punt":" punten"); }
  function steen(n){ return n+(n===1?" steen":" stenen"); }
  function newTurn(){ return {aside:[], roll:null, sel:[], fix:false}; }

  A.register({ id:ID, beta:true, title:"Nixxen", level:"app", sub:"Vijf stenen wegleggen, punten tellen, double or nothing",
    init:function(root){
      var G=A.gs(ID), R=G.R||null, alive=true, obs=null, seen=-1;

      function ok(r,n){
        return !!(r&&r.n===n&&Array.isArray(r.order)&&r.order.length>=2&&r.res&&r.t&&Array.isArray(r.t.aside)&&
          r.pos>=0&&r.pos<r.order.length&&r.order.every(function(i){ return i>=0&&i<n; })&&
          (r.phase==="play"||(r.phase==="done"&&r.out)));
      }
      function cur(){ return R.order[R.pos]; }
      function sync(){ A.S.active=cur(); A.save(); A.renderPlayers(); }
      function fresh(){ return R.phase==="play"&&R.mult===1&&R.pos===0&&!R.t.aside.length&&!R.t.roll; }
      function newRound(start){
        var n=A.S.players.length, order=[], k; start=(((start||0)%n)+n)%n;
        for(k=0;k<n;k++) order.push((start+k)%n); /* de beurt gaat met de klok mee */
        R=G.R={n:n, start:start, order:order, pos:0, res:{}, mult:1, first:null, phase:"play", t:newTurn(), out:null};
        sync(); render();
      }
      function extremes(){ /* hoogste en laagste score van wie al geweest is in deze (deel)ronde */
        var done=R.order.filter(function(i){ return R.res[i]; }); if(!done.length) return null;
        var hi=-1, lo=1e9; done.forEach(function(i){ var p=R.res[i].pts; if(p>hi)hi=p; if(p<lo)lo=p; });
        return {hi:hi, lo:lo, his:done.filter(function(i){ return R.res[i].pts===hi; }), los:done.filter(function(i){ return R.res[i].pts===lo; })};
      }

      function onRoll(v,turn){
        if(!alive||!R||R.t!==turn||R.phase!=="play"||v.length!==5-turn.aside.length) return;
        turn.roll=v.slice();
        if(turn.fix){ A.save(); return; } /* ogen verbeteren: scherm laten staan tot Klaar */
        turn.sel=v.map(function(){ return false; });
        if(v.length===1) turn.sel=[true]; /* de laatste steen moet weg */
        A.save(); render();
      }
      function toggle(i){
        var t=R.t; if(!t.roll) return;
        if(t.sel[i]) t.sel[i]=false;
        else { /* hooguit één steen die geen 3 is: een nieuwe keuze vervangt de vorige */
          if(t.roll[i]!==3) t.roll.forEach(function(v,j){ if(v!==3) t.sel[j]=false; });
          t.sel[i]=true;
        }
        A.play("tick"); A.save(); render();
      }
      function commit(){
        var t=R.t; if(!t.roll) return;
        var chosen=t.roll.filter(function(v,i){ return t.sel[i]; });
        if(!chosen.length||chosen.filter(function(v){ return v!==3; }).length>1) return;
        t.aside=t.aside.concat(chosen); t.roll=null; t.sel=[]; t.fix=false; A.play("clack");
        if(t.aside.length>=5){ endTurn(); return; }
        A.save(); render();
      }
      function endTurn(){
        var i=cur(), d=R.t.aside.slice(0,5), p=pts(d);
        R.res[i]={dice:d, pts:p};
        if(allSame(d)){ fiveKind(i,d); return; }
        if(R.pos+1<R.order.length){
          R.pos++; R.t=newTurn(); sync(); render();
          A.toast(A.name(i)+": "+punt(p), A.name(cur())+" is aan de beurt.", 2800);
          return;
        }
        finishRound();
      }
      /* bijzondere regel 2: vijf gelijke stenen weggelegd, ronde meteen afgelopen, elke andere speler een adtje */
      function fiveKind(i,d){
        var oth=A.others(i);
        oth.forEach(function(j){ A.atje(j,1); });
        R.phase="done"; R.out={kind:"vijf", who:i, v:d[0], others:oth}; G.next=(R.start+1)%R.n; A.save();
        A.play("special");
        A.overlay("win","Vijf gelijk!",[A.name(i)+" legt vijf keer een "+d[0]+" weg. De ronde is afgelopen.",
          A.joinNames(oth)+(oth.length===1?" trekt":" trekken")+" een adtje."],0,A.dicerow(d));
        A.onOverlayClose(null);
        render();
      }
      function finishRound(){
        var x=extremes(), tied=x.his;
        if(tied.length>1){
          /* bijzondere regel 1: gelijk bovenaan, die spelers spelen double or nothing (inzet twee keer de laagste score van die ronde) */
          var again=R.mult===2;
          if(!R.first) R.first={order:R.order.slice(), res:R.res};
          R.order=tied.slice(); R.pos=0; R.res={}; R.mult=2; R.t=newTurn();
          sync(); render();
          A.play("ding");
          A.overlay("info","Double or nothing!",[A.joinNames(tied)+" hebben "+(tied.length===2?"allebei ":"allemaal ")+punt(x.hi)+(again?", weer gelijk.":"."),
            "Zij spelen "+(again?"nog een keer":"opnieuw")+". De verliezer drinkt twee keer de laagste score."],0);
          A.onOverlayClose(null);
          return;
        }
        var loser=tied[0], sips=x.lo*R.mult;
        A.drink(loser,sips);
        R.phase="done"; R.out={kind:"drink", loser:loser, sips:sips, hi:x.hi, lo:x.lo, los:x.los, mult:R.mult}; G.next=(R.start+1)%R.n; A.save();
        A.play("dood");
        A.overlay("dood","Drinken!",[A.name(loser)+" heeft de meeste punten ("+x.hi+") en drinkt "+slok(sips)+".",
          (R.mult===2?"Double or nothing: 2 × "+x.lo+", de laagste score (":"De laagste score is "+x.lo+" (")+A.joinNames(x.los)+")."],0);
        A.onOverlayClose(null);
        render();
      }

      function render(){
        if(!alive) return;
        var P=A.S.players, n=P.length, h="", t, rem, x; seen=n;
        if(n<2){ root.innerHTML='<p class="hint">Nixxen speel je met minstens twee spelers: wie de meeste punten heeft drinkt de score van wie de minste heeft. Voeg hierboven een speler toe.</p>'; return; }
        if(!ok(R,n)){ newRound(R&&R.n===n?R.start:A.S.active); return; }
        t=R.t; rem=5-t.aside.length; x=extremes();
        var playing=R.phase==="play", c=cur();

        /* stand */
        h+='<div class="board">';
        if(R.mult===2) h+='<div class="stat" style="margin:0 4px 8px"><span><b>Double or nothing</b></span><span>verliezer drinkt <b>2 ×</b> de laagste score</span></div>';
        h+='<table class="score nixxen-t"><tr><th>speler</th><th>weggelegd</th><th>punten</th></tr>';
        R.order.forEach(function(i){
          var r=R.res[i], me=playing&&i===c, d=r?r.dice:(me&&t.aside.length?t.aside:null);
          h+='<tr'+(me?' class="cur"':'')+'><td>'+esc(A.name(i))+'</td><td>'+(d?A.dicerowSmall(d):'–')+'</td><td>'+(d?pts(d)+(r?'':' …'):'–')+'</td></tr>';
        });
        h+='</table>';
        if(x) h+='<div class="stat"><span>Hoogste: <b>'+x.hi+'</b> '+esc(A.joinNames(x.his))+'</span><span>Laagste: <b>'+x.lo+'</b> '+esc(A.joinNames(x.los))+'</span></div>';
        if(R.first) h+='<p class="hint nixxen-first">Eerste ronde: '+R.first.order.map(function(i){ var r=R.first.res[i]; return esc(A.name(i))+' '+(r?r.pts:'–'); }).join(' · ')+'</p>';
        h+='</div>';

        if(playing){
          h+='<p class="hint"><b>'+esc(A.name(c))+'</b> is aan de beurt'+(t.aside.length?': '+punt(pts(t.aside))+' weggelegd, nog '+steen(rem):'')+'</p>';
          if(!t.roll||t.fix){
            h+='<div id="nixxen-box" class="nixxen-dice"></div>';
            if(t.fix) h+='<p class="hint">Tik op een steen en kies de juiste ogen.</p><div class="btnrow nixxen-act"><button class="btn gold" id="nixxen-fixok">Klaar</button></div>';
            else h+='<p class="hint">'+(rem===5?'Gooi alle vijf de stenen':'Gooi de '+(rem===1?'laatste steen':'overige '+rem+' stenen'))+': met de knop, of gooi echt en tik op de stenen om de ogen in te voeren.</p>';
          } else {
            var nsel=0, total=pts(t.aside);
            h+='<div class="dice nixxen-dice">'+t.roll.map(function(v,i){ var s=!!t.sel[i]; if(s){ nsel++; if(v!==3) total+=v; }
              return '<div class="diewrap"><button class="die'+(s?' kept':'')+'" data-sel="'+i+'" aria-pressed="'+s+'" aria-label="Steen met '+v+(s?', ligt weg':'')+'">'+A.pips(v)+'</button><span class="nixxen-tag'+(s?' on':'')+'">'+(s?'weg':(v===3?'telt 0':'&nbsp;'))+'</span></div>'; }).join("")+'</div>';
            h+='<p class="hint">'+(rem===1?'De laatste steen moet weg.':'Tik op de steen die je weglegt: één per worp. Drieën tellen 0, daarvan mag je er zoveel wegleggen als je wilt.')+'</p>';
            var left=rem-nsel;
            h+='<div class="btnrow nixxen-act"><button class="btn gold" id="nixxen-commit"'+(nsel?'':' disabled')+'>'+
              (!nsel?'Kies een steen':left===0?'Leg weg, beurt klaar ('+punt(total)+')':'Leg weg en gooi '+steen(left))+'</button>'+
              '<button class="btn" id="nixxen-fix">Worp verbeteren</button></div>';
          }
          h+='<div class="btnrow nixxen-act"><button class="btn" id="nixxen-new">Nieuwe ronde</button></div>';
        } else {
          var o=R.out;
          if(o.kind==="vijf"){
            h+='<div class="verdict win"><h2>Vijf gelijk</h2><p><b>'+esc(A.name(o.who))+'</b> legde vijf keer een '+o.v+' weg. De ronde is afgelopen: <b>'+esc(A.joinNames(o.others))+'</b> '+(o.others.length===1?'trekt':'trekken')+' een adtje.</p>';
          } else {
            h+='<div class="verdict fout"><h2>'+esc(A.name(o.loser))+' drinkt '+slok(o.sips)+'</h2><p>Meeste punten: <b>'+o.hi+'</b>. Laagste score: <b>'+o.lo+'</b> ('+esc(A.joinNames(o.los))+').'+(o.mult===2?' Double or nothing: 2 × '+o.lo+' = '+o.sips+'.':'')+'</p>';
          }
          h+='<div class="btnrow nixxen-act"><button class="btn gold" id="nixxen-new">Nieuwe ronde</button></div></div>';
        }
        h+='<p class="hint nixxen-uitleg">Een 3 telt 0, de rest telt zijn ogen. Wie de meeste punten heeft drinkt de laagste score in slokken. Gelijk bovenaan: double or nothing. Vijf gelijke stenen: alle anderen een adtje.</p>';
        root.innerHTML=h;

        if(playing&&(!t.roll||t.fix)){
          var dice=A.Dice(el("nixxen-box"),{n:rem, noRoll:!!t.fix, label:rem===5?"Dobbel":"Dobbel "+steen(rem), onRoll:function(v){ onRoll(v,t); }});
          if(t.fix&&t.roll) dice.set(t.roll);
        }
        root.querySelectorAll("[data-sel]").forEach(function(b){ b.onclick=function(){ toggle(+b.getAttribute("data-sel")); }; });
        var b1=el("nixxen-commit"); if(b1) b1.onclick=commit;
        var b2=el("nixxen-fix"); if(b2) b2.onclick=function(){ t.fix=true; A.save(); render(); };
        var b3=el("nixxen-fixok"); if(b3) b3.onclick=function(){ t.fix=false; t.sel=t.roll.map(function(){ return false; }); if(t.roll.length===1) t.sel=[true]; A.save(); render(); };
        var b4=el("nixxen-new"); if(b4) b4.onclick=function(){ newRound(R.phase==="done"?(typeof G.next==="number"?G.next:R.start+1):R.start); };
      }

      /* spelers erbij of eraf: opnieuw tekenen (een lopende ronde begint dan opnieuw) */
      var bar=el("players");
      if(bar&&window.MutationObserver){ obs=new window.MutationObserver(function(){ if(alive&&A.S.players.length!==seen) render(); }); obs.observe(bar,{childList:true}); }
      this.destroy=function(){ alive=false; if(obs){ obs.disconnect(); obs=null; } };
      this.refresh=render;
      /* op een naam tikken: voor de eerste worp of na afloop begint die speler een ronde; midden in een ronde blijft de beurt waar hij is */
      this.onPlayer=function(i){
        if(A.S.players.length<2||!ok(R,A.S.players.length)){ render(); return; }
        if(R.phase==="done"||fresh()){ newRound(i); return; }
        sync();
        A.toast("De ronde loopt nog",A.name(cur())+" is aan de beurt. Opnieuw beginnen kan met Nieuwe ronde.",3200);
      };
      render();
    }
  });
})();
