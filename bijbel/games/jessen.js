/* ===== Jessen =====
   Iedere speler heeft één eigen steen en iedereen gooit tegelijk. De telefoon ligt op tafel in plaats van het dienblad:
   "Gooi allemaal" gooit voor iedereen één digitale steen, of je tikt per speler de echte worp in.
   De app telt de vaste slokken (laagste, dubbelen, straten) en vraagt bij Jes, Suk a kok en de muur wie de laatste was.

   Keuzes waar de bijbel ruimte laat:
   - Laagste (2.I): ligt de laagste worp er vaker, dan drinkt ieder met die worp één slok.
   - Dubbel (2.II): geldt per paar; twee paren op tafel is vier spelers die elk twee extra drinken. Bij drie of meer
     dezelfde geldt 2.III (muur) en niet ook nog de twee extra slokken.
   - Muur (2.III): één ronde muur per groep van drie of meer dezelfde ogen (twee groepen kan pas vanaf zes spelers).
   - Jes (2.IV): bij twee zessen roept iedereen twee keer Jes; er is één laatste en die drinkt één slok (niet per 6).
   - Suk a kok (2.V): vanaf drie zessen komt dit in de plaats van Jes roepen. De drie zessen zijn ook drie dezelfde,
     dus de muur van 2.III geldt daarnaast gewoon.
   - Straat (2.VI en VII): voor elke drie opeenvolgende ogen die op tafel liggen drinkt wie de middelste waarde gooide
     één slok; ligt die waarde er twee keer, dan drinken beiden. Het tweede voorbeeld in de bijbel laat daarnaast
     speler D (de 3, de laagste van de straat) drinken. Besluit van Stijn (15 nov 2026): "bij jessen drinkt de middelste
     of middelsten van een straat, maar ook de laagste. er wordt daar gewoon heel veel gedronken." Dus per hele straat
     (de langste rij opeenvolgende ogen, drie of meer) drinkt ook ieder met de laagste waarde van die straat één slok,
     bovenop 2.I: bij 6-4-5-3 drinkt de 3 er twee (laagste worp + laagste van de straat 3-4-5-6), de 4 en de 5 elk één.
     Omdat de zin ook als alleen 2.I te lezen is, staat het als schakelaar onderaan ("Straat: ook de laagste van de
     straat drinkt", standaard aan, G.straatLaag); hij geldt vanaf de volgende worp, een getelde worp onthoudt in
     r.laag waarmee hij geboekt is.
   - Half adtje = 0,5 adtje (glas van 8 slokken, dus 4 slokken), geboekt zoals bij de andere spellen.
   - Er zijn geen beurten: iedereen gooit tegelijk, dus de actieve speler in de balk verandert niet.
   - Geen adtje kruk: dat is voor spellen met precies twee stenen, hier is het één steen per speler.
   - Wie de laatste was tik je zelf aan; "Verkeerd getikt" draait die boeking terug (negatieve boeking via A.drink / A.atje). */
(function(){
  "use strict";
  var A=App, esc=A.esc;
  var CSS='.jessen-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:14px 4px;padding:6px 0 2px}'+
    '.jessen-cell{width:72px;min-width:0;display:flex;flex-direction:column;align-items:center;gap:9px}'+
    '.jessen-nm{max-width:100%;font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
    '.jessen-sip{margin-top:-6px;font-size:11px;color:var(--ivory-dim);border-radius:999px;padding:1px 7px}'+
    '.jessen-sip.jessen-on{background:var(--gold);color:var(--ink);font-weight:700}'+
    '.jessen-act{margin-top:14px}'+
    '.jessen-btn{min-height:44px}'+
    '.jessen-seg{margin-top:14px}'+
    '.jessen-seg button{min-height:40px}'+
    '.jessen-log{margin-top:10px}';
  function addCss(){ if(document.getElementById("jessen-css"))return; var s=document.createElement("style"); s.id="jessen-css"; s.textContent=CSS; document.head.appendChild(s); }
  function slok(n){ return n===1?"1 slok":n+" slokken"; }

  /* De scheidsrechter: vals = ogen per speler (1..6). Geeft de vaste slokken per speler met de reden,
     en de momenten waarop de groep moet aanwijzen wie de laatste was. laag = ook de laagste van een straat drinkt. */
  function judge(vals,nameOf,laag){
    var n=vals.length, cnt=[0,0,0,0,0,0,0,0], sips=[], why=[], ev=[], low=7, i, v, k, s;
    for(i=0;i<n;i++){ cnt[vals[i]]++; if(vals[i]<low)low=vals[i]; sips.push(0); why.push([]); }
    for(i=0;i<n;i++){
      v=vals[i];
      if(v===low){ sips[i]+=1; why[i].push("laagste worp (1 slok)"); }
      if(cnt[v]===2){ for(k=0;k<n;k++) if(k!==i&&vals[k]===v) break; sips[i]+=2; why[i].push("zelfde worp als "+nameOf(k)+" (2 extra)"); }
      if(cnt[v-1]&&cnt[v+1]){ sips[i]+=1; why[i].push("midden van de straat "+(v-1)+"-"+v+"-"+(v+1)+" (1 slok)"); }
      /* v is het begin van een hele straat: niets eronder, minstens twee erboven */
      if(laag&&!cnt[v-1]&&cnt[v+1]&&cnt[v+2]){ s=""+v; for(k=v+1;cnt[k];k++) s+="-"+k; sips[i]+=1; why[i].push("laagste van de straat "+s+" (1 slok)"); }
    }
    if(cnt[6]>=3) ev.push({t:"suk",k:cnt[6],last:null}); else if(cnt[6]>0) ev.push({t:"jes",k:cnt[6],last:null});
    for(v=1;v<=6;v++) if(cnt[v]>=3) ev.push({t:"muur",k:v,c:cnt[v],last:null});
    return {sips:sips, why:why, ev:ev};
  }
  function evInfo(e){
    if(e.t==="jes") return { title:e.k===1?"Jes!":"Jes! Jes!",
      ask:(e.k===1?"Er ligt één zes: iedereen roept één keer ‘Jes’.":"Er liggen twee zessen: iedereen roept twee keer ‘Jes’.")+" Wie was de laatste? Die drinkt één slok.",
      done:" riep als laatste ‘Jes’ en drinkt één slok.", big:"Slok!" };
    if(e.t==="suk") return { title:"Suk a kok!",
      ask:"Er liggen "+e.k+" zessen: iedereen roept ‘Suk a kok’. Wie was de laatste? Die trekt een half adtje.",
      done:" riep als laatste ‘Suk a kok’ en trekt een half adtje (4 slokken).", big:"Half adtje" };
    return { title:"Muur!",
      ask:e.c+" spelers gooien "+e.k+": iedereen raakt een muur aan. Wie was de laatste? Die trekt een adtje.",
      done:" raakte als laatste een muur aan en trekt een adtje.", big:"Adtje!" };
  }

  A.register({ id:"jessen", beta:true, title:"Jessen", level:"app", sub:"Iedereen gooit tegelijk; laagste, dubbelen, straten, Jes en muur geteld",
    init:function(root){
      addCss();
      var G=A.gs("jessen"), box, pick=null, rolling=false, timer=null, tmp=[], side=null, sig="", obs=null;
      root.innerHTML='<div id="jessen-root"></div>'; box=root.firstChild;
      /* een bewaarde stand van voor deze keuze heeft het veld nog niet: standaard aan */
      if(typeof G.straatLaag!=="boolean") G.straatLaag=true;

      function blank(n){ var a=[]; for(var i=0;i<n;i++)a.push(null); return a; }
      function okVal(v){ return v===1||v===2||v===3||v===4||v===5||v===6; }
      function signature(){ return A.S.players.map(function(p){return p.name;}).join("\n"); }
      /* de lopende worp; begint schoon als het aantal spelers niet meer klopt of de bewaarde stand onleesbaar is */
      function round(){
        var n=A.S.players.length, r=G.r, ok=!!r&&Array.isArray(r.vals)&&r.vals.length===n&&Array.isArray(r.ev);
        if(typeof G.n!=="number"||!isFinite(G.n)||G.n<0) G.n=0;
        if(ok&&r.done) ok=r.vals.every(okVal)&&r.ev.every(function(e){ return e&&(e.t==="jes"||e.t==="suk"||e.t==="muur")&&(e.last===null||(typeof e.last==="number"&&e.last>=0&&e.last<n)); });
        if(ok&&!r.done) ok=r.vals.every(function(v){ return v===null||okVal(v); });
        if(!ok){ r=G.r={vals:blank(n),done:false,ev:[]}; pick=null; }
        return r;
      }
      function stop(){ if(timer){ clearInterval(timer); timer=null; } rolling=false; }

      function grid(vals,j){
        var h='<div class="jessen-grid">';
        A.S.players.forEach(function(p,i){
          var v=vals[i];
          h+='<div class="jessen-cell">'+
            (j?'<span class="die">'+A.pips(v)+'</span>'
              :'<button class="die'+(v?'':' blank')+(pick===i?' picking':'')+(rolling?' rolling':'')+'" data-d="'+i+'" aria-label="Steen van '+esc(p.name)+(v?': '+v:'')+'">'+(v?A.pips(v):'?')+'</button>')+
            '<span class="jessen-nm">'+esc(p.name)+'</span>'+
            (j?'<span class="jessen-sip'+(j.sips[i]?' jessen-on':'')+'">'+(j.sips[i]?slok(j.sips[i]):'–')+'</span>':'')+'</div>';
        });
        return h+'</div>';
      }
      function whoButtons(attr,pre){
        return A.S.players.map(function(p,i){ return '<button class="btn jessen-btn" '+attr+'="'+pre+i+'">'+esc(p.name)+'</button>'; }).join("");
      }

      function render(){
        var P=A.S.players, h="", r, v;
        sig=signature();
        if(P.length<2){ stop(); box.innerHTML='<p class="hint">Jessen speel je met minstens twee spelers, ieder met een eigen dobbelsteen. Voeg hierboven een speler toe.</p>'; return; }
        r=round();
        if(!r.done){
          var full=!rolling&&r.vals.every(function(x){return x;});
          h+='<p class="hint">Worp '+((G.n||0)+1)+'. '+(rolling?'De stenen rollen…'
            :full?'Alle stenen liggen er. Klopt het? Tik op <b>Tel deze worp</b>; een steen aantikken verbetert hem.'
            :pick!==null&&P[pick]?'Kies hieronder de ogen van '+esc(P[pick].name)+'; daarna komt vanzelf de volgende steen.'
            :'Iedereen gooit tegelijk: tik op <b>Gooi allemaal</b>, of tik een steen aan en vul de echte worp in.')+'</p>';
          h+='<div class="board">'+grid(rolling?tmp:r.vals,null)+'</div>';
          h+='<div class="jessen-act">';
          if(pick!==null&&P[pick]){
            h+='<p class="hint">Wat gooit '+esc(P[pick].name)+'?</p><div class="picker open">';
            for(v=1;v<=6;v++) h+='<button data-v="'+v+'" aria-label="'+v+'">'+A.pips(v)+'</button>';
            h+='</div>';
          }
          if(full) h+='<button class="roll" data-act="count">Tel deze worp</button><div class="btnrow"><button class="btn jessen-btn" data-act="wipe">Stenen wissen</button><button class="btn jessen-btn" data-act="roll">Toch digitaal gooien</button></div>';
          else h+='<button class="roll" data-act="roll"'+(rolling?' disabled':'')+'>Gooi allemaal</button>';
          h+='</div>';
        } else {
          var j=judge(r.vals,A.name,r.laag===true), open=0;
          var todo=r.ev.filter(function(e){ return e.last===null; }).length;
          h+='<p class="hint">Worp '+(G.n||1)+': de vaste slokken zijn geteld. '+(todo?'Tik hieronder aan wie de laatste was.':'Tik op <b>Volgende worp</b> om weer te gooien.')+'</p><div class="board">'+grid(r.vals,j)+'<div class="log jessen-log">';
          P.forEach(function(p,i){ if(j.sips[i]) h+='<div><b>'+esc(p.name)+'</b> drinkt '+slok(j.sips[i])+': '+esc(j.why[i].join(", "))+'</div>'; });
          h+='</div></div>';
          r.ev.forEach(function(e,k){
            var T=evInfo(e);
            if(e.last!==null) h+='<div class="verdict fout"><h2>'+esc(T.title)+'</h2><p><b>'+esc(A.name(e.last))+'</b>'+esc(T.done)+'</p><div class="btnrow"><button class="btn jessen-btn" data-undo="'+k+'">Verkeerd getikt</button></div></div>';
            else { open++; h+='<div class="verdict win"><h2>'+esc(T.title)+'</h2><p>'+esc(T.ask)+'</p><div class="btnrow">'+whoButtons("data-last",k+":")+'</div></div>'; }
          });
          if(open) h+='<p class="hint">Tik aan wie de laatste was, dan kan de volgende worp.</p>';
          else h+='<div class="jessen-act"><button class="roll" data-act="next">Volgende worp</button></div>';
        }
        /* regels over het spelverloop die iets te drinken geven */
        if(side){
          h+='<div class="verdict neutral"><h2>'+(side==="steen"?"Verkeerde steen":"Vrijwillig adtje")+'</h2><p>'+
            (side==="steen"?"Wie pakte de verkeerde dobbelsteen op? Die drinkt één slok.":"Wie trekt vrijwillig een adtje? Die mag de tafel verplaatsen.")+
            '</p><div class="btnrow">'+whoButtons("data-side","")+'<button class="btn jessen-btn danger" data-act="cancel">Annuleren</button></div></div>';
        } else {
          h+='<div class="btnrow" style="margin-top:16px"><button class="btn jessen-btn" data-act="steen">Verkeerde steen gepakt</button><button class="btn jessen-btn" data-act="vrij">Vrijwillig adtje</button></div>';
        }
        h+='<div class="seg jessen-seg"><button data-act="laag" aria-pressed="'+G.straatLaag+'">Straat: ook de laagste van de straat drinkt</button></div>';
        if(r.done&&(r.laag===true)!==G.straatLaag) h+='<p class="hint">Deze worp is al geteld; de keuze geldt vanaf de volgende worp.</p>';
        h+='<div class="btnrow"><button class="btn jessen-btn" data-act="new">Nieuw spel</button></div>';
        box.innerHTML=h;
      }

      /* de worp ligt: vaste slokken meteen boeken, de aanwijs-momenten klaarzetten */
      function settle(){
        var r=round(), j, i;
        if(r.done||!r.vals.every(okVal)){ render(); return; }
        r.laag=G.straatLaag!==false; j=judge(r.vals,A.name,r.laag); r.done=true; r.ev=j.ev; G.n=(G.n||0)+1; pick=null;
        for(i=0;i<j.sips.length;i++) if(j.sips[i]) A.drink(i,j.sips[i]);
        A.save(); A.play("clack",0.8); render();
      }
      function rollAll(){
        if(rolling||A.S.players.length<2) return;
        var r=round(), cnt=0; if(r.done) return;
        function shake(){ tmp=[]; for(var i=0;i<A.S.players.length;i++) tmp.push(A.rnd(6)); }
        rolling=true; pick=null; A.play("rattle"); shake(); render();
        timer=setInterval(function(){
          shake(); cnt++;
          if(cnt>=12){ stop(); if(A.S.players.length<2){ render(); return; } r=round(); r.vals=tmp.slice(); settle(); }
          else render();
        },70);
      }
      function resolve(k,i){
        var r=round(), e=r.done?r.ev[k]:null, T;
        if(!e||e.last!==null||!A.S.players[i]) return;
        e.last=i; T=evInfo(e);
        if(e.t==="jes") A.drink(i,1); else if(e.t==="suk") A.atje(i,0.5); else A.atje(i,1);
        A.save(); A.play("dood"); render();
        /* blijft staan tot er getikt wordt: een overlay op tijd laat tikken door naar de knoppen eronder */
        A.overlay("dood",T.big,[A.name(i)+T.done],0); A.onOverlayClose(null);
      }
      /* verkeerde speler aangetikt: de boeking terugdraaien en opnieuw laten aanwijzen */
      function undo(k){
        var r=round(), e=r.done?r.ev[k]:null, i;
        if(!e||e.last===null) return;
        i=e.last; e.last=null;
        if(A.S.players[i]){ if(e.t==="jes") A.drink(i,-1); else if(e.t==="suk") A.atje(i,-0.5); else A.atje(i,-1); }
        A.save(); A.toast("Teruggedraaid",A.name(i)+" krijgt "+(e.t==="jes"?"de slok":e.t==="suk"?"het halve adtje":"het adtje")+" terug van de teller. Tik opnieuw aan wie de laatste was.");
        render();
      }
      function sideHit(i){
        if(!side||!A.S.players[i]) return;
        if(side==="steen"){ A.drink(i,1); A.toast("Verkeerde steen",A.name(i)+" pakte de verkeerde dobbelsteen en drinkt één slok."); }
        else { A.atje(i,1); A.toast("Vrijwillig adtje",A.name(i)+" trekt een adtje en mag de tafel verplaatsen."); }
        A.play("ding"); side=null; render();
      }

      box.addEventListener("click",function(e){
        var b=e.target.closest("button"); if(!b||b.disabled) return;
        var act=b.getAttribute("data-act"), d=b.getAttribute("data-d"), v=b.getAttribute("data-v"), l=b.getAttribute("data-last"), s=b.getAttribute("data-side"), u=b.getAttribute("data-undo"), r, i, n, c;
        if(d!==null){ if(rolling) return; r=round(); if(r.done) return; i=+d; pick=(pick===i?null:i); render(); return; }
        if(v!==null){
          r=round(); n=r.vals.length; if(r.done||rolling||pick===null||pick>=n) return;
          r.vals[pick]=+v; A.play("tick"); c=null;
          for(i=1;i<=n;i++){ if(r.vals[(pick+i)%n]===null){ c=(pick+i)%n; break; } }
          pick=c; A.save(); render(); return;
        }
        if(l!==null){ l=l.split(":"); resolve(+l[0],+l[1]); return; }
        if(u!==null){ undo(+u); return; }
        if(s!==null){ sideHit(+s); return; }
        if(act==="roll"){ rollAll(); }
        else if(act==="count"){ if(!rolling) settle(); }
        else if(act==="wipe"){ if(rolling) return; r=round(); if(!r.done){ r.vals=blank(r.vals.length); pick=null; A.save(); render(); } }
        else if(act==="next"){ r=round(); if(r.done&&r.ev.every(function(x){return x.last!==null;})){ G.r=null; pick=null; A.save(); render(); } }
        else if(act==="steen"||act==="vrij"){ side=act; render(); }
        else if(act==="cancel"){ side=null; render(); }
        else if(act==="laag"){ G.straatLaag=!G.straatLaag; A.save(); render(); }
        else if(act==="new"){ stop(); G.n=0; G.r=null; pick=null; side=null; A.save(); render(); }
      });

      /* de spelersbalk meldt het niet als er iemand bijkomt, weggaat of anders gaat heten: zelf meekijken,
         zodat er altijd precies één steen per speler ligt */
      if(window.MutationObserver&&A.el("players")){
        obs=new MutationObserver(function(){ if(signature()!==sig) render(); });
        obs.observe(A.el("players"),{childList:true});
      }

      render();
      this.refresh=render;
      this.onPlayer=function(){ render(); };
      this.destroy=function(){ stop(); if(obs){ obs.disconnect(); obs=null; } };
    }
  });
})();
