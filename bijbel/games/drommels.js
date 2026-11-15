/* ===== Drommels ===== */
(function(){
  "use strict";
  var A=App, el=A.el, esc=A.esc, pct=A.pct, ID="drommels";
  function css(){
    if(document.getElementById("drommels-css"))return;
    var s=document.createElement("style"); s.id="drommels-css";
    s.textContent=
      ".drommels-names{display:flex;justify-content:center;margin:12px 0 -6px}"+
      ".drommels-names span{flex:0 0 50%;max-width:150px;min-width:0;padding:0 4px;text-align:center;font-size:15px;font-weight:700;color:var(--ivory);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"+
      ".drommels-names small{display:block;font-size:12px;font-weight:400;color:var(--ivory-dim)}"+
      ".drommels-box .dice{gap:0}"+
      ".drommels-box .diewrap{flex:0 0 50%;max-width:150px}"+
      ".drommels-pick button,.drommels-btn{min-height:40px}"+
      ".drommels-worp{margin:0 0 8px}"+
      ".overlay.drommels-ov span.t{font-size:min(15vw,72px)}";
    document.head.appendChild(s);
  }
  function slok(n){ return n===1?"1 slok":n+" slokken"; }
  A.register({ id:ID, beta:true, title:"Drommels", level:"app", kans:true, sub:"Ieder één steen tegelijk: laagste roept drommels en drinkt, gelijk is uitdelen",
    init:function(root){
      css();
      var G=A.gs(ID), alive=true, seen="", obs=null;
      function sig(){ return A.S.players.map(function(q){return q.name;}).join("\n"); }
      function reset(a,b){ G.a=a; G.b=b; G.an=A.name(a); G.bn=A.name(b); G.np=A.S.players.length; G.rounds=0; G.sa=0; G.sb=0; G.dealt=0; G.pending=0; G.last=null; A.save(); }
      /* de twee spelers terugvinden als de spelerslijst is veranderd (naam gewijzigd, iemand erbij of eraf) */
      function find(idx,nm){
        var p=A.S.players, j;
        if(typeof idx!=="number")return -1;
        if(p[idx]&&p[idx].name===nm)return idx;
        for(j=0;j<p.length;j++) if(p[j].name===nm)return j;
        return (G.np===p.length&&p[idx])?idx:-1; /* zelfde aantal spelers: alleen hernoemd */
      }
      function fix(){
        var n=A.S.players.length, a, b;
        if(n<2)return false;
        a=find(G.a,G.an); b=find(G.b,G.bn);
        if(a<0||b<0||a===b){ reset(0,1); return true; }
        if(a!==G.a||b!==G.b||G.an!==A.name(a)||G.bn!==A.name(b)||G.np!==n){ G.a=a; G.b=b; G.an=A.name(a); G.bn=A.name(b); G.np=n; A.save(); }
        return true;
      }
      function bystanders(){ return A.others(G.a).filter(function(j){return j!==G.b;}); }
      function big(kind,title,lines,ms,extra){ var o=A.overlay(kind,title,lines,ms,extra); if(o&&o.classList)o.classList.add("drommels-ov"); }

      function onRoll(v){
        if(!alive||G.pending||A.S.players.length<2)return;
        var va=v[0], vb=v[1], a=G.a, b=G.b, low=va<vb?a:(vb<va?b:-1);
        /* Geen adtje kruk: ieder gooit hier maar één steen. De kruk-regel geldt alleen als één speler met twee stenen gooit. */
        G.rounds++;
        if(low>=0){
          /* regel 2: de laagste roept 'drommels' en neemt een slok */
          if(low===a)G.sa++; else G.sb++;
          G.last={k:"low",v:[va,vb],who:low===a?0:1};
          A.S.active=low; A.drink(low,1);
          A.play("ding");
          big("dood","Drommels!",[A.name(low)+" gooit het laagst en neemt een slok."],1700,A.dicerow([va,vb]));
        } else {
          /* regel 3: gelijke ogen, het totaal van beide stenen mag naar één persoon die niet meespeelt.
             "Het totaal aantal ogen" is gelezen als beide stenen samen (4 en 4 = 8 slokken). */
          G.pending=va+vb; G.last={k:"tie",v:[va,vb]}; A.save();
          A.play("special");
          /* blijft staan tot een tik: een tik om hem weg te halen mag niet op een uitdeelknop eronder terechtkomen */
          big("win","Gelijk!",[A.joinNames([a,b])+" gooien allebei "+va+".","Deel samen "+slok(va+vb)+" uit aan iemand die niet meespeelt."],0,A.dicerow([va,vb]));
        }
        render();
      }
      function deal(to){
        var n=G.pending, L=G.last||{k:"tie",v:[n/2,n/2]}, j;
        if(!n)return;
        G.pending=0; G.last=L;
        if(to==="none"){ L.d="none"; A.save(); A.play("tick"); }
        else if(to==="out"){ L.d="out"; G.dealt+=n; A.save(); A.play("ding"); }
        else {
          j=+to; if(!A.S.players[j]||j===G.a||j===G.b){ G.pending=n; return; }
          L.d="in"; L.to=A.name(j); G.dealt+=n; A.S.active=j; A.drink(j,n); A.play("dood");
          big("dood",slok(n),[A.name(j)+" drinkt "+slok(n)+".","Uitgedeeld door "+A.joinNames([G.a,G.b])+"."],0);
        }
        render();
      }

      function render(){
        if(!alive)return;
        seen=sig();
        if(!fix()){ root.innerHTML='<p class="hint">Drommels speel je met z’n tweeën. Voeg met “+ speler” een tweede speler toe.</p>'; return; }
        if(G.pending&&!(G.last&&G.last.v)){ G.pending=0; A.save(); } /* kapotte opslag: liever geen uitdeelscherm dan een fout */
        var p=A.S.players, a=G.a, b=G.b, L=G.last, by=bystanders(), n=G.pending, h="", who, other;
        h+='<div class="board"><div class="stat"><span>Worpen: <b>'+G.rounds+'</b></span><span>Uitgedeeld: <b>'+slok(G.dealt)+'</b></span></div></div>';
        if(n){
          h+='<div class="verdict win"><h2>Gelijk!</h2><div class="drommels-worp">'+A.dicerowSmall(L.v)+'</div><p>'+esc(A.joinNames([a,b]))+' gooien allebei '+L.v[0]+'. Jullie mogen samen <b>'+slok(n)+'</b> uitdelen aan één persoon in de ruimte die niet meespeelt. Tik hieronder wie ze krijgt.</p></div>';
          h+='<div class="opts">';
          by.forEach(function(j){ h+='<button class="opt" data-to="'+j+'"><span class="num">'+n+'</span><span class="lbl">'+esc(A.name(j))+'<small>drinkt '+slok(n)+'</small></span></button>'; });
          h+='<button class="opt" data-to="out"><span class="num">'+n+'</span><span class="lbl">Iemand anders in de ruimte<small>staat niet in de app, de slokken worden niet geteld</small></span></button>';
          h+='<button class="opt" data-to="none"><span class="num">–</span><span class="lbl">Niet uitdelen<small>uitdelen mag, het hoeft niet</small></span></button>';
          h+='</div>';
          if(!by.length) h+='<p class="hint">Zet de toekijkers er met “+ speler” bij, dan telt de app hun slokken mee.</p>';
        } else {
          if(L&&L.k==="low"){
            who=L.who===0?a:b; other=L.who===0?b:a;
            h+='<div class="verdict fout"><h2>Drommels!</h2><div class="drommels-worp">'+A.dicerowSmall(L.v)+'</div><p><b>'+esc(A.name(who))+'</b> gooit '+L.v[L.who]+', '+esc(A.name(other))+' gooit '+L.v[1-L.who]+'. '+esc(A.name(who))+' roept ‘drommels’ en neemt een slok.</p></div>';
          } else if(L&&L.k==="tie"){
            h+='<div class="verdict neutral"><h2>Gelijk</h2><div class="drommels-worp">'+A.dicerowSmall(L.v)+'</div><p>'+
              (L.d==="in"?'<b>'+esc(L.to)+'</b> drinkt '+slok(L.v[0]+L.v[1])+', uitgedeeld door '+esc(A.joinNames([a,b]))+'.':
               L.d==="out"?slok(L.v[0]+L.v[1])+' uitgedeeld aan iemand in de ruimte (niet geteld in de app).':
               'Allebei '+L.v[0]+', niets uitgedeeld.')+'</p></div>';
          }
          h+='<p class="hint">'+esc(A.joinNames([a,b]))+': gooi tegelijk ieder één steen. De laagste roept ‘drommels’ en neemt een slok; gooien jullie gelijk, dan delen jullie samen de ogen uit.</p>';
          h+='<div class="drommels-names"><span>'+esc(A.name(a))+'<small>'+slok(G.sa)+'</small></span><span>'+esc(A.name(b))+'<small>'+slok(G.sb)+'</small></span></div>';
          h+='<div id="drommels-dice" class="drommels-box"></div>';
          h+='<p class="hint">Echte stenen? Tik op de steen onder je naam en vul je ogen in.</p>';
          h+='<p class="hint kans">Per worp: '+pct(5/12)+' kans dat jij drommels roept, '+pct(1/6)+' kans op gelijk (gemiddeld 7 slokken uitdelen).</p>';
          if(p.length>2){
            h+='<p class="hint">Drommels is voor twee. Tik op een naam om die te laten meespelen (begint een nieuwe telling); de rest kijkt toe en kan bij gelijk slokken krijgen.</p><div class="seg drommels-pick">';
            p.forEach(function(q,i){ h+='<button data-pick="'+i+'" aria-pressed="'+(i===a||i===b)+'">'+esc(q.name)+'</button>'; });
            h+='</div>';
          }
        }
        h+='<div class="btnrow"><button class="btn drommels-btn" id="drommels-new">Nieuw spel</button></div>';
        root.innerHTML=h;
        if(!n) A.Dice(el("drommels-dice"),{n:2,onRoll:onRoll,label:"Gooi tegelijk"});
        root.querySelectorAll("[data-to]").forEach(function(btn){ btn.onclick=function(){ deal(btn.getAttribute("data-to")); }; });
        root.querySelectorAll("[data-pick]").forEach(function(btn){ btn.onclick=function(){
          var j=+btn.getAttribute("data-pick"); if(j===G.a||j===G.b||!A.S.players[j])return;
          reset(G.b,j); render(); /* de nieuwe speler vervangt wie het langst meespeelt; nieuw duo = nieuw spel */
        }; });
        el("drommels-new").onclick=function(){ reset(G.a,G.b); render(); };
      }

      /* de spelersbalk verandert zonder seintje naar het spel: zelf meekijken of er iemand bij, af of hernoemd is */
      var bar=el("players");
      if(bar&&window.MutationObserver){ obs=new MutationObserver(function(){ if(alive&&sig()!==seen)render(); }); obs.observe(bar,{childList:true}); }
      this.destroy=function(){ alive=false; if(obs){ obs.disconnect(); obs=null; } };
      this.refresh=render;
      render();
    }
  });
})();
