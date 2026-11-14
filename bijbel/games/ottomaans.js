/* ===== Ottomaans Mexx ===== */
(function(){
  "use strict";
  var A=App, el=A.el, esc=A.esc, ID="ottomaans";
  /* tick: elke render en elke destroy hoogt hem op, zodat een worp die nog uitrolt nooit op een oud scherm landt */
  var tick=0, poll=null;
  if(!document.getElementById("ottomaans-style")){
    var css=document.createElement("style"); css.id="ottomaans-style";
    css.textContent=
      ".ottomaans-who{color:var(--gold);font-size:17px;}"+
      ".ottomaans-throw{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:4px 0 2px;}"+
      ".ottomaans-die{display:inline-grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);width:46px;height:46px;padding:6px;border-radius:10px;background:linear-gradient(#fffdf6,#efe7d2);box-shadow:0 3px 0 #c4b793;vertical-align:middle;flex:none;}"+
      ".ottomaans-die .pip{width:8px;height:8px;}"+
      ".ottomaans-opt .num{min-width:46px;line-height:1;}"+
      ".ottomaans-opt .odds{color:var(--gold);font-weight:700;}"+
      ".ottomaans-on{border-color:var(--gold) !important;background:rgba(231,184,79,.12) !important;}"+
      ".ottomaans-faces{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px;}"+
      ".ottomaans-faces button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:86px;min-width:0;padding:10px 4px;border-radius:10px;border:1.5px solid rgba(243,233,210,.25);background:rgba(0,0,0,.18);}"+
      ".ottomaans-faces button small{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--ivory-dim);}"+
      ".ottomaans-faces button:disabled{opacity:.45;}"+
      ".ottomaans-tag{display:inline-block;font-size:11px;font-weight:700;padding:1px 7px;border-radius:999px;background:var(--red);color:#fff;margin-left:4px;vertical-align:middle;}"+
      ".ottomaans-last{margin-top:10px;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.2);font-size:13px;color:var(--ivory-dim);line-height:1.4;text-align:center;}"+
      ".ottomaans-last b{color:var(--ivory);}"+
      ".ottomaans-last span{display:block;}"+
      ".ottomaans-legend{font-size:12px;padding:2px 0;}"+
      ".ottomaans-seg button{min-height:40px;}"+
      ".ottomaans-board td:first-child{word-break:break-word;}";
    document.head.appendChild(css);
  }
  function sl(n){ return n+" "+(n===1?"slok":"slokken"); }
  function die(v){ return '<span class="ottomaans-die">'+A.pips(v)+'</span>'; }
  function count(arr,v){ var c=0,i; for(i=0;i<arr.length;i++) if(arr[i]===v)c++; return c; }
  function lowest(arr){ var lo=null,i; for(i=0;i<arr.length;i++) if(lo===null||arr[i]<lo)lo=arr[i]; return lo; }
  function tally(o){ return Object.keys(o).map(function(i){ return A.name(+i)+" "+sl(o[i]); }).join(", "); }
  function face(x){ return x===1||x===2||x===3||x===4||x===5||x===6; }
  function sig(){ return A.S.players.map(function(q){return q.name;}).join("\n"); }

  A.register({ id:ID, beta:true, title:"Ottomaans Mexx", level:"app", sub:"Eén steen per speler: van oud naar jong gooien en kiezen, laagste drinkt",
    init:function(root){
      /* G.order = spelers van oud naar jong (indexen in A.S.players), G.nums = gekozen getal per speler (variant 1),
         G.R = de lopende ronde {k: hoeveelste aan de beurt, picks: gekozen stenen op volgorde, roll: de worp die op tafel ligt, dr: slokken deze ronde} */
      var G=A.gs(ID); G.v1=!!G.v1; G.v2=!!G.v2; G.v3=!!G.v3;
      var tmp=[], shown="";
      function n(){ return A.S.players.length; }
      function perm(o,N){ var seen={}, i; if(!Array.isArray(o)||o.length!==N) return false; for(i=0;i<N;i++){ if(typeof o[i]!=="number"||o[i]!==Math.floor(o[i])||!(o[i]>=0&&o[i]<N)||seen[o[i]]) return false; seen[o[i]]=1; } return true; }
      function orderOk(){ return perm(G.order,n()); }
      /* Variant 1: "alle spelers hebben een ander getal", dus hoogstens zes spelers */
      function v1on(){ return G.v1&&n()<=6; }
      function numsOk(){ var m=G.nums, N=n(), seen={}, i; if(!Array.isArray(m)||m.length!==N) return false; for(i=0;i<N;i++){ if(!face(m[i])||seen[m[i]]) return false; seen[m[i]]=1; } return true; }
      /* half ingevulde keuze: 0 = nog niet gekozen, de rest geldige en verschillende getallen */
      function numsPartial(){ var m=G.nums, N=n(), seen={}, i, open=false; if(!Array.isArray(m)||m.length!==N) return false; for(i=0;i<N;i++){ if(m[i]===0){ open=true; continue; } if(!face(m[i])||seen[m[i]]) return false; seen[m[i]]=1; } return open; }
      /* een ronde uit een oudere versie of met een ander aantal spelers wordt weggegooid in plaats van half getoond */
      function roundOk(R){
        var N=n(), i;
        if(!R||typeof R!=="object"||!Array.isArray(R.picks)||!Array.isArray(R.log)||!R.dr||typeof R.dr!=="object") return false;
        if(R.picks.length!==R.k||R.k>N||(R.done?R.k!==N:R.k>=N)) return false;
        for(i=0;i<R.picks.length;i++) if(!face(R.picks[i])) return false;
        if(R.done&&!Array.isArray(R.losers)) return false;
        if(R.last&&!(Array.isArray(R.last.lines)&&face(R.last.v))) R.last=null;
        if(R.roll&&!(Array.isArray(R.roll)&&R.roll.length===N-R.k&&R.roll.every(face))) R.roll=null;
        return true;
      }
      function setActive(i){ if(A.S.active!==i){ A.S.active=i; A.save(); A.renderPlayers(); } }
      function newRound(){ G.R={k:0,picks:[],roll:null,digital:false,krDone:false,krHit:false,dr:{},log:[],last:null,done:false,losers:null}; A.save(); }
      /* De app kent geen leeftijden: de volgorde hangt aan de spelerslijst. Eén gewijzigde naam is hernoemen (volgorde blijft),
         alles wat meer verandert (speler erbij of eraf) vraagt de leeftijdsvolgorde opnieuw. */
      function sync(){
        var names=A.S.players.map(function(q){return q.name;}), old=G.names, diff=0, i, reset=false;
        if(old&&old.length===names.length){ for(i=0;i<names.length;i++) if(old[i]!==names[i]) diff++; } else diff=99;
        if(diff>1||(G.order&&!orderOk())){ reset=!!(G.order||tmp.length); G.order=null; G.nums=null; G.R=null; tmp=[]; }
        if(diff||reset){ G.names=names; A.save(); }
        return reset;
      }
      function stale(){ return sig()!==shown; }
      function phase(){
        var R;
        if(n()<2) return "few";
        if(!orderOk()) return "order";
        if(v1on()&&!numsOk()) return "nums";
        R=G.R;
        if(!roundOk(R)) newRound();
        R=G.R;
        if(R.done) return "done";
        return R.roll?"pick":"roll";
      }
      function settingsHtml(){
        var h='<p class="hint ottomaans-legend" style="margin-top:14px;padding-bottom:0">Variërende regels: tik aan wat jullie hebben afgesproken.</p><div class="seg ottomaans-seg"><button data-var="v1" aria-pressed="'+G.v1+'">getal kiezen</button><button data-var="v2" aria-pressed="'+G.v2+'">zelfde weggelegd</button><button data-var="v3" aria-pressed="'+G.v3+'">zelfde gegooid</button></div>';
        h+='<p class="hint ottomaans-legend">De laagste steen drinkt 1 slok; bij gelijkspel drinken ze allemaal.';
        if(G.v1) h+=(n()>6?'<br>Getal kiezen kan met hoogstens zes spelers (ieder een ander getal) en staat nu dus uit.':'<br>Getal kiezen: wordt een steen met jouw getal weggelegd, dan drink jij 1 slok.');
        if(G.v2) h+='<br>Zelfde weggelegd: legt een ander dezelfde ogen weg als jij, dan drink je 1 slok.';
        if(G.v3) h+='<br>Zelfde gegooid: voor elke steen die een ander daarna gooit met de ogen van jouw steen, 1 slok.';
        return h+'</p>';
      }
      function bindSettings(){
        root.querySelectorAll("[data-var]").forEach(function(b){ b.onclick=function(){
          var key=b.getAttribute("data-var"); G[key]=!G[key];
          /* getallen worden "aan het begin" gekozen: wie de variant aanzet, kiest eerst en begint dan een verse ronde */
          if(key==="v1"&&G.v1&&!numsOk()) G.nums=null;
          A.save(); render();
        }; });
      }
      function boardHtml(){
        var R=G.R, o=G.order, lo=lowest(R.picks), v1=v1on(), left=o.length-R.k;
        var h='<div class="board"><table class="score ottomaans-board"><tr><th>van oud naar jong</th><th>steen</th>'+(v1?'<th>getal</th>':'')+'<th>slokken</th></tr>';
        o.forEach(function(pi,j){
          var has=j<R.k, cur=!R.done&&j===R.k, low=has&&R.picks[j]===lo&&(R.done||R.k>1);
          h+='<tr'+(cur?' class="cur"':'')+'><td>'+(j+1)+'. '+esc(A.name(pi))+'</td><td>'+(has?A.dicerowSmall([R.picks[j]])+(low?'<span class="ottomaans-tag">laag</span>':''):(cur?'aan de beurt':'–'))+'</td>'+(v1?'<td>'+G.nums[pi]+'</td>':'')+'<td>'+(R.dr[pi]||'')+'</td></tr>';
        });
        h+='</table><div class="stat">'+(R.done?'<span>Laagste steen: <b>'+lo+'</b></span>':'<span>Stenen nog in de worp: <b>'+left+'</b></span>'+(lo!==null?'<span>Laagste tot nu toe: <b>'+lo+'</b></span>':''))+'</div></div>';
        return h;
      }
      function lastHtml(){
        var L=G.R.last; if(!L) return "";
        return '<div class="ottomaans-last"><span><b>'+esc(L.who)+'</b> legde een '+L.v+' apart.</span>'+L.lines.map(function(x){return '<span>'+esc(x)+'</span>';}).join("")+'</div>';
      }
      function playButtons(done){
        return '<div class="btnrow"><button class="btn'+(done?' gold':'')+'" id="ottomaansNew">Nieuwe ronde</button><button class="btn" id="ottomaansAge">Leeftijd opnieuw</button>'+(v1on()?'<button class="btn" id="ottomaansNums">Getallen opnieuw</button>':'')+'</div>';
      }
      function bindPlayButtons(){
        el("ottomaansNew").onclick=function(){ newRound(); render(); };
        el("ottomaansAge").onclick=function(){ G.order=null; G.R=null; tmp=[]; A.save(); render(); };
        var nb=el("ottomaansNums"); if(nb) nb.onclick=function(){ G.nums=null; G.R=null; A.save(); render(); };
      }

      /* Een steen apart leggen. Hier wordt alles van deze beurt geboekt (ook de slokken van de worp zelf), zodat een verkeerd
         ingevoerde echte worp nog verbeterd kan worden zonder dat er slokken dubbel staan. */
      function pick(v){
        var R=G.R, o=G.order, k=R.k, me=o[k], roll=R.roll, lines=[], ev={}, j, c, ow, same=[], kr=false, krNow=false;
        function give(i,cnt,line){ A.drink(i,cnt); R.dr[i]=(R.dr[i]||0)+cnt; ev[i]=(ev[i]||0)+cnt; lines.push(line); R.log.push(line); }
        if(!roll||roll.indexOf(v)<0) return;
        /* Variant 3: wie al een steen heeft liggen, drinkt 1 slok voor elke steen met die ogen in de worp van een latere speler */
        if(G.v3) for(j=0;j<k;j++){ c=count(roll,R.picks[j]); if(c) give(o[j],c,A.name(o[j])+" drinkt "+sl(c)+": "+A.name(me)+" gooit "+(c===1?"een":c+" keer een")+" "+R.picks[j]+", net als de steen van "+A.name(o[j])+"."); }
        /* Variant 1: de speler die dit getal koos drinkt 1 slok, ook als hij het zelf weglegt */
        if(v1on()){ ow=G.nums.indexOf(v); if(ow>=0) give(ow,1,A.name(ow)+" drinkt 1 slok: er wordt een "+v+" weggelegd, het getal van "+A.name(ow)+"."); }
        /* Variant 2, gekozen lezing: iedereen wiens ogen ook door een ander zijn weggelegd drinkt daar precies één slok voor,
           hoeveel anderen het ook zijn. De eerste van het groepje drinkt dus zodra de tweede erbij komt. */
        if(G.v2){ for(j=0;j<k;j++) if(R.picks[j]===v) same.push(o[j]);
          if(same.length){ give(me,1,A.name(me)+" drinkt 1 slok: "+A.joinNames(same)+(same.length===1?" legde":" legden")+" ook een "+v+" weg.");
            if(same.length===1) give(same[0],1,A.name(same[0])+" drinkt 1 slok: "+A.name(me)+" legt ook een "+v+" weg."); } }
        /* Adtje kruk (huisregel): geldt bij elke worp van precies twee stenen, hier dus de worp van de voorlaatste speler.
           Een digitale worp is al bij het gooien geteld (ligt vast); een ingevoerde worp telt hier, zodat verbeteren niet dubbel telt. */
        if(roll.length===2){ if(R.krDone) kr=!!R.krHit; else { kr=A.kruk(ID,roll,me); krNow=kr; }
          if(kr){ lines.push(A.name(me)+" doet een adtje op de kruk: drie keer op rij dezelfde worp."); R.log.push(lines[lines.length-1]); } }
        R.krDone=false; R.krHit=false;
        R.picks[k]=v; R.roll=null; R.k=k+1; R.last={who:A.name(me),v:v,lines:lines};
        if(R.k>=o.length){ finish(ev); return; }
        A.save();
        if(Object.keys(ev).length){ A.play("ding"); if(!krNow) A.toast("Slokken!",lines.join(" "),5200); } else A.play("tick");
        render();
      }
      /* Einde ronde. De bijbel noemt geen aantal; Ottomaans is een Mexx-variant en zonder Mexx drinkt de verliezer daar één slok.
         Bij gelijkspel drinken alle laagsten, er komt geen extra ronde. */
      function finish(ev){
        var R=G.R, o=G.order, lo=lowest(R.picks), losers=[], extra=Object.keys(ev).length?"Verder deze beurt: "+tally(ev)+".":null, msg;
        o.forEach(function(pi,j){ if(R.picks[j]===lo) losers.push(pi); });
        losers.forEach(function(pi){ var line=A.name(pi)+" drinkt 1 slok: laagste steen ("+lo+")."; A.drink(pi,1); R.dr[pi]=(R.dr[pi]||0)+1; R.log.push(line); });
        R.done=true; R.losers=losers; A.save();
        msg=losers.length===1?A.name(losers[0])+" heeft de laagste steen en drinkt 1 slok.":A.joinNames(losers)+" hebben "+(losers.length===2?"allebei":"allemaal")+" een "+lo+" en drinken ieder 1 slok.";
        A.play("dood");
        A.overlay("dood","Laag!",extra?[msg,extra]:[msg],0,A.dicerow([lo]));
        A.onOverlayClose(null);
        render();
      }

      function render(){
        var token=++tick, reset=sync(), ph=phase(), p=A.S.players, N=p.length, R=G.R, o=G.order, h="", j, v, me, left, lo, ch, cost, vals;
        shown=sig();
        if(ph==="few"){ root.innerHTML='<p class="hint">Ottomaans Mexx speel je met minstens twee spelers: ieder krijgt één dobbelsteen. Voeg iemand toe met + speler hierboven.</p>'; return; }

        if(!(A.S.active>=0&&A.S.active<N)) setActive(0);

        if(ph==="order"){
          tmp=tmp.filter(function(i){return i<N;});
          h+='<div class="verdict neutral"><h2>Wie is het oudst?</h2><p>'+(reset?'De spelers zijn veranderd. ':'')+'De ronde gaat op leeftijd: de oudste gooit alle stenen en kiest als eerste. Tik de spelers aan van oud naar jong.</p></div><div class="opts">';
          p.forEach(function(q,i){ var pos=tmp.indexOf(i);
            h+='<button class="opt'+(pos>=0?' ottomaans-on':'')+'" data-o="'+i+'"><span class="num">'+(pos>=0?pos+1:'?')+'</span><span class="lbl">'+esc(q.name)+'<small>'+(pos===0?'de oudste, gooit als eerste':pos>=0?'nummer '+(pos+1)+' op leeftijd':'tik om in te delen')+'</small></span><span class="odds"></span></button>'; });
          h+='</div><div class="btnrow">'+(tmp.length?'<button class="btn" id="ottomaansClear">Opnieuw</button>':'')+'<button class="btn" id="ottomaansList">Volgorde van de spelerslijst</button></div>';
          root.innerHTML=h+settingsHtml();
          root.querySelectorAll("[data-o]").forEach(function(b){ b.onclick=function(){
            if(stale()){ render(); return; }
            var i=+b.getAttribute("data-o"), pos=tmp.indexOf(i);
            if(pos>=0) tmp.splice(pos,1); else tmp.push(i);
            A.play("tick");
            if(tmp.length===N){ G.order=tmp.slice(); tmp=[]; G.R=null; A.save(); }
            render();
          }; });
          var cl=el("ottomaansClear"); if(cl) cl.onclick=function(){ tmp=[]; render(); };
          el("ottomaansList").onclick=function(){ if(stale()){ render(); return; } G.order=p.map(function(q,i){return i;}); tmp=[]; G.R=null; A.save(); render(); };
          bindSettings(); return;
        }

        if(ph==="nums"){
          if(!numsPartial()){ G.nums=[]; for(j=0;j<N;j++) G.nums.push(0); }
          ch=o[0]; for(j=0;j<N;j++) if(!G.nums[o[j]]){ ch=o[j]; break; }
          setActive(ch);
          h+='<div class="verdict neutral"><h2>Kies een getal</h2><p><b>'+esc(A.name(ch))+'</b> kiest een getal van de dobbelsteen. De oudste kiest eerst, iedereen een ander getal. Wordt er een steen met jouw getal weggelegd, dan drink jij 1 slok.</p></div><div class="ottomaans-faces">';
          for(v=1;v<=6;v++){ j=G.nums.indexOf(v); h+='<button data-n="'+v+'"'+(j>=0?' disabled':'')+' aria-label="Getal '+v+'">'+die(v)+'<small>'+(j>=0?esc(A.name(j)):'vrij')+'</small></button>'; }
          h+='</div>'+(G.nums.some(function(x){return x;})?'<div class="btnrow"><button class="btn" id="ottomaansClear">Opnieuw kiezen</button></div>':'');
          root.innerHTML=h+settingsHtml();
          root.querySelectorAll("[data-n]").forEach(function(b){ b.onclick=function(){
            if(stale()){ render(); return; }
            G.nums[ch]=+b.getAttribute("data-n"); A.play("tick");
            if(numsOk()) G.R=null; /* getallen staan: verse ronde */
            A.save(); render();
          }; });
          var cn=el("ottomaansClear"); if(cn) cn.onclick=function(){ G.nums=null; A.save(); render(); };
          bindSettings(); return;
        }

        if(ph==="done"){
          lo=lowest(R.picks);
          h+=boardHtml();
          h+='<div class="verdict fout"><h2>Laag: '+lo+'</h2><p><b>'+esc(A.joinNames(R.losers||[]))+'</b> '+((R.losers||[]).length===1?'heeft de laagste steen en drinkt 1 slok.':'hebben de laagste steen en drinken ieder 1 slok.')+'</p><p>Deze ronde in totaal: '+esc(tally(R.dr))+'.</p></div>';
          h+='<p class="hint">Ronde klaar. Tik op Nieuwe ronde: '+esc(A.name(o[0]))+' gooit dan weer alle '+N+' stenen.</p>';
          h+=playButtons(true);
          if(R.log.length>(R.losers||[]).length) h+='<div class="log">'+R.log.map(function(x){return '<div>'+esc(x)+'</div>';}).join("")+'</div>';
          root.innerHTML=h+settingsHtml();
          bindPlayButtons(); bindSettings(); return;
        }

        me=o[R.k]; left=N-R.k; lo=lowest(R.picks);
        setActive(me);
        h+=boardHtml();
        if(ph==="roll"){
          h+=lastHtml();
          h+='<p class="hint"><b class="ottomaans-who">'+esc(A.name(me))+'</b> '+(left===1?'gooit de laatste steen':'gooit '+left+' stenen en legt er daarna één apart')+'</p><div id="ottomaansDice"></div>';
          h+='<p class="hint ottomaans-legend">Echte stenen? Tik op een steen en voer de ogen in.</p>';
        } else {
          h+='<p class="hint"><b class="ottomaans-who">'+esc(A.name(me))+'</b> '+(left===1?'gooide de laatste steen':'kiest één steen uit de worp')+'</p><div class="ottomaans-throw">'+R.roll.map(die).join("")+'</div>';
          cost=[]; if(G.v3) for(j=0;j<R.k;j++){ v=count(R.roll,R.picks[j]); if(v) cost.push(A.name(o[j])+" "+sl(v)); }
          if(cost.length) h+='<p class="hint ottomaans-legend">Zelfde gegooid, deze worp kost: '+esc(cost.join(", "))+'.</p>';
          vals=[]; for(v=6;v>=1;v--) if(R.roll.indexOf(v)>=0) vals.push(v);
          h+='<div class="opts">';
          vals.forEach(function(x){
            var c=count(R.roll,x), notes=[], ow, same=[], jj;
            if(c>1) notes.push("ligt er "+c+" keer");
            if(v1on()){ ow=G.nums.indexOf(x); if(ow>=0) notes.push(ow===me?"je eigen getal: jij drinkt 1 slok":"het getal van "+A.name(ow)+": "+A.name(ow)+" drinkt 1 slok"); }
            if(G.v2){ for(jj=0;jj<R.k;jj++) if(R.picks[jj]===x) same.push(o[jj]);
              if(same.length) notes.push(A.joinNames(same)+(same.length===1?" legde":" legden")+" ook een "+x+" weg: "+(same.length===1?"jullie drinken allebei 1 slok":"jij drinkt 1 slok")); }
            h+='<button class="opt ottomaans-opt" data-pick="'+x+'"><span class="num">'+die(x)+'</span><span class="lbl">'+(left===1?'Dit is jouw steen':'Leg de '+x+' apart')+'<small>'+esc(notes.join(" · "))+'</small></span><span class="odds">'+(lo===null?'':x<lo?'laagste':x===lo?'gelijk laag':'')+'</span></button>';
          });
          h+='</div>';
          /* alleen een zelf ingevoerde worp mag verbeterd worden; een digitale worp ligt vast */
          if(!R.digital) h+='<div class="btnrow"><button class="btn" id="ottomaansRedo">Worp opnieuw invoeren</button></div>';
        }
        h+=playButtons(false);
        root.innerHTML=h+settingsHtml();
        if(ph==="roll"){
          /* De volgende speler gooit de overgebleven stenen opnieuw (variant 3 spreekt van stenen die "andere spelers gooien") */
          A.Dice(el("ottomaansDice"),{n:left,label:left===1?"Gooi de steen":"Gooi "+left+" stenen",onRoll:function(vv,digital){
            if(token!==tick) return;
            if(stale()){ render(); return; }
            R.roll=vv.slice(); R.digital=!!digital; R.krDone=false; R.krHit=false;
            if(digital&&vv.length===2){ R.krHit=A.kruk(ID,vv,me); R.krDone=true; }
            A.save(); render();
          }});
        } else {
          root.querySelectorAll("[data-pick]").forEach(function(b){ b.onclick=function(){ if(stale()){ render(); return; } pick(+b.getAttribute("data-pick")); }; });
          var rd=el("ottomaansRedo"); if(rd) rd.onclick=function(){ R.roll=null; R.krDone=false; R.krHit=false; A.save(); render(); };
        }
        bindPlayButtons(); bindSettings();
      }

      render();
      /* de kern meldt niet dat er een speler bij of af is: kijk zelf of de spelerslijst nog klopt met wat er op het scherm staat */
      clearInterval(poll);
      poll=setInterval(function(){ if(stale()) render(); },700);
      /* de beurt gaat op leeftijd, niet op wie er in de balk wordt aangetikt: render zet de juiste speler weer actief */
      this.onPlayer=function(){ render(); };
    },
    destroy:function(){ tick++; clearInterval(poll); poll=null; }
  });
})();
