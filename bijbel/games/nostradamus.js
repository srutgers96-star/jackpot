/* ===== Nostradamus PowerMexx =====
   PowerMexx (Mexx met één worp, niets laten liggen, 3 3 = PowerMexx = twee Mexx) waarbij de gooier vóór elke worp
   twee spelers aanwijst die elk het aantal ogen van één dobbelsteen voorspellen.
   Keuzes waar de bijbel niets of iets dubbelzinnigs zegt:
   - Twee stenen, twee voorspellers: elke voorspeller hoort bij één steen. Een voorspelling die op tafel ligt is goed
     (de verdeling met de meeste goede voorspellingen wint). Blijven er dan nog twee verdelingen over waar de twee
     voorspellers elk een andere van willen (allebei hetzelfde getal en het ligt er één keer, of allebei mis en het
     verschil hangt af van de steen), dan geldt het N.B.: de oudste van de twee krijgt de gunstigste. De app vraagt
     dan één keer wie de oudste is en onthoudt dat.
   - De voorspellingen zijn open (hardop aan tafel); de bijbel noemt geen geheime voorspelling.
   - De gooier wijst twee ANDERE spelers aan, dus minstens drie spelers.
   - 31 "telt niet mee als worp": de voorspellingen blijven staan, de gooier deelt een slok uit en gooit opnieuw.
   - "Voordat een speler gooit" geldt ook in de extra ronde bij gelijk laag. Een Mexx in die extra ronde telt wel
     mee voor de straf (besluit Stijn; 3 3 ook daar als twee, ook bij Ogen), net als in het gewone Mexx-spel van de app.
   - PowerMexx (3 3) is als score hoger dan Mexx. De verliezer begint de volgende ronde.
   - De uitslag van een worp en de 31 staan in een overlay die blijft staan tot er getikt wordt: een overlay met
     een timer laat tikken door naar de knoppen eronder (wie krijgt het halve adtje / wie drinkt de slok). */
(function(){
  "use strict";
  var A=App, el=A.el, esc=A.esc, ID="nostradamus", GLAS=8;

  function score(a,b){ var hi=Math.max(a,b), lo=Math.min(a,b); if(hi===2&&lo===1)return 1000; if(a===3&&b===3)return 2000; if(a===b)return a*100; return hi*10+lo; }
  function label(a,b){ var s=score(a,b); return s===2000?"PowerMexx":s===1000?"Mexx":String(s); }
  function slok(n){ return n+" "+(n===1?"slok":"slokken"); }
  function halfTxt(n){ return n===1?"een half adtje":n+" halve adtjes"; }

  /* Hoe gunstig is een uitkomst voor een voorspeller: alleen goed = uitdelen (+1), mis = -verschil, allebei goed = adtje (-glas). */
  function util(right,other,diff){ return right?(other?-GLAS:1):-diff; }
  /* x, y = voorspellingen van voorspeller 0 en 1; d1, d2 = de stenen. Geeft {pick:verdeling} of, als de oudste moet
     beslissen, {ask:true, best:[verdeling die 0 wil, verdeling die 1 wil]}. */
  function judge(x,y,d1,d2){
    var ms=[[d1,d2],[d2,d1]].map(function(m){
      var ra=x===m[0], rb=y===m[1], da=Math.abs(x-m[0]), db=Math.abs(y-m[1]);
      return { die:m, right:[ra,rb], diff:[da,db], cnt:(ra?1:0)+(rb?1:0), u:[util(ra,rb,da),util(rb,ra,db)] };
    });
    var m1=ms[0], m2=ms[1];
    if(m1.cnt!==m2.cnt) return { pick:m1.cnt>m2.cnt?m1:m2 };
    if(m1.u[0]>=m2.u[0]&&m1.u[1]>=m2.u[1]) return { pick:m1 };
    if(m2.u[0]>=m1.u[0]&&m2.u[1]>=m1.u[1]) return { pick:m2 };
    return { ask:true, best:[m1.u[0]>m2.u[0]?m1:m2, m1.u[1]>m2.u[1]?m1:m2] };
  }

  function css(){
    if(el("nostradamus-style")) return;
    var s=document.createElement("style"); s.id="nostradamus-style";
    s.textContent=
      ".nostradamus-who{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0;}"+
      ".nostradamus-who button{min-height:46px;min-width:0;padding:8px 10px;border-radius:10px;border:1.5px solid rgba(243,233,210,.3);background:rgba(0,0,0,.18);font-size:16px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}"+
      ".nostradamus-who button[aria-pressed=\"true\"]{border-color:var(--gold);background:rgba(231,184,79,.2);}"+
      ".nostradamus-hint b{color:var(--ivory);}"+
      ".nostradamus-laag{color:var(--ivory-dim);font-size:11px;font-weight:500;}"+
      ".nostradamus-pred{justify-content:space-around;align-items:center;margin:12px 0 0;font-size:14px;}"+
      ".nostradamus-box{margin-top:10px;padding:10px 12px;border-radius:12px;background:rgba(0,0,0,.2);border:1.5px solid rgba(243,233,210,.25);font-size:14px;line-height:1.45;text-align:center;color:var(--ivory-dim);}"+
      ".nostradamus-box b.nostradamus-kop{display:block;font-size:20px;font-weight:900;color:var(--ivory);margin-bottom:2px;}"+
      ".nostradamus-box .nostradamus-rolls{margin-top:6px;color:var(--ivory);}"+
      ".nostradamus-roll{display:flex;justify-content:center;align-items:center;gap:8px;font-size:24px;font-weight:900;margin-bottom:8px;}"+
      ".nostradamus-lines{margin:0 0 10px;padding:0;list-style:none;font-size:15px;line-height:1.45;text-align:left;}"+
      ".nostradamus-lines li{padding:6px 0;border-top:1px solid rgba(243,233,210,.16);}"+
      ".nostradamus-lines li:first-child{border-top:0;}"+
      ".nostradamus-root .btn{min-height:44px;}"+
      ".nostradamus-set{margin-top:16px;}"+
      ".nostradamus-set .seg button{min-height:40px;}"+
      ".nostradamus-set .seg span{font-size:12px;color:var(--ivory-dim);align-self:center;}";
    document.head.appendChild(s);
  }

  A.register({ id:ID, beta:true, title:"Nostradamus PowerMexx", level:"app", sub:"Voorspellers aanwijzen, voorspellingen afrekenen, PowerMexx-ronde en kruk",
    init:function(root){
      css();
      var G=A.gs(ID), seq=0;
      if(G.straf!==2&&G.straf!==3&&G.straf!==4) G.straf=2; /* per Mexx: 2 slokken, 3 slokken of (4) een half adtje */
      if(G.tb!=="ogen") G.tb="mexx";                      /* extra ronde bij gelijk laag: Mexx-score of ogen */
      G.dubbel=!!G.dubbel; if(!G.oud||typeof G.oud!=="object"||Array.isArray(G.oud)) G.oud={};

      function P(){ return A.S.players; }
      function idx(i){ return typeof i==="number"&&i>=0&&i<P().length&&i===Math.floor(i); }
      function die(v){ return typeof v==="number"&&v>=1&&v<=6&&v===Math.floor(v); }
      /* Klopt de bewaarde ronde nog met de spelers en met deze versie? Zo niet, dan begint er een nieuwe ronde
         (ander aantal spelers, een oude of beschadigde A.gs). */
      function ok(){
        var R=G.R, t, n=P().length;
        if(n<3||!R||typeof R!=="object"||R.n!==n||!R.t||typeof R.t!=="object"||!R.turns||typeof R.turns!=="object"||!idx(R.start)||typeof R.mexx!=="number") return false;
        /* Zelfde aantal maar andere mensen (iemand weg en iemand erbij): de nummers kloppen niet meer. Eén andere naam
           op dezelfde plek is een hernoemde speler en mag door. */
        if(!Array.isArray(R.names)||R.names.length!==n) return false;
        var nu=P().map(function(q){ return q.name; }), anders=nu.filter(function(x,i){ return x!==R.names[i]; }).length;
        if(anders>1) return false;
        if(anders===1) R.names=nu;
        if(!Object.keys(R.turns).every(function(i){ var x=R.turns[i]; return idx(+i)&&!!x&&die(x.a)&&die(x.b)&&typeof x.score==="number"; })) return false;
        t=R.t;
        if(!idx(t.who)||!Array.isArray(t.pr)||!Array.isArray(t.gok)||t.gok.length!==2||t.pr.length>2) return false;
        if(t.pr.some(function(i){ return !idx(i)||i===t.who; })||(t.pr.length===2&&t.pr[0]===t.pr[1])) return false;
        if(R.tie&&(!Array.isArray(R.tie.players)||!R.tie.players.length||!R.tie.players.every(idx)||!R.tie.rolls||typeof R.tie.rolls!=="object")) return false;
        if(R.done) return idx(R.done.loser)&&typeof R.done.txt==="string";
        if(t.ph==="wijs") return t.pr.length<2;
        if(t.pr.length!==2) return false;
        if(t.ph==="voorspel") return (t.gok[0]===null||die(t.gok[0]))&&t.gok[1]===null;
        if(!die(t.gok[0])||!die(t.gok[1])) return false;
        if(t.ph==="gooi") return true;
        if(!die(t.a)||!die(t.b)) return false;
        if(t.ph==="deel31"||t.ph==="oudste") return true;
        return t.ph==="uitslag"&&!!t.res&&Array.isArray(t.res.right)&&Array.isArray(t.res.diff)&&Array.isArray(t.res.die)&&typeof t.res.dealer==="number"&&(t.res.dealt===null||typeof t.res.dealt==="number");
      }
      function cur(){ return idx(A.S.active)?A.S.active:0; }
      /* blijft staan tot er getikt wordt, zodat een tik niet op een knop eronder belandt */
      function show(kind,title,lines,extra){ A.overlay(kind,title,lines,0,extra); A.onOverlayClose(null); }
      function setActive(i){ A.S.active=i; A.save(); A.renderPlayers(); }
      function strafTxt(n){ return !n?"1 slok":G.straf===4?halfTxt(n):slok(n*G.straf); }
      function lowest(){ var R=G.R, lo=null; Object.keys(R.turns).forEach(function(i){ var s=R.turns[i].score; if(lo===null||s<lo)lo=s; }); return lo; }

      /* wie van twee voorspellers is de oudste: 0, 1 of -1 (nog niet gevraagd) */
      function ageKey(i,j){ var a=A.name(i), b=A.name(j); return a<b?a+"\n"+b:b+"\n"+a; }
      function oldest(i,j){ var v=G.oud[ageKey(i,j)]; return v===undefined?-1:v===A.name(i)?0:v===A.name(j)?1:-1; }

      function newRound(start){ G.R={ n:P().length, names:P().map(function(q){ return q.name; }), start:start, turns:{}, mexx:0, tie:null, done:null, t:null }; beginThrow(start); }
      function beginThrow(who){
        var o=A.others(who), forced=o.length===2; /* met drie spelers valt er niets te kiezen */
        G.R.t={ who:who, ph:forced?"voorspel":"wijs", pr:forced?o:[], gok:[null,null], a:null, b:null, n31:0, note:"", res:null };
        setActive(who); render();
      }
      function restart(){ if(P().length>=3) A.toast("Spelers gewijzigd","Er begint een nieuwe ronde.",3000); G.R=null; A.save(); render(); }

      function onRoll(v){
        if(!ok()){ restart(); return; }
        var R=G.R, t=R.t; if(t.ph!=="gooi") return;
        var a=v[0], b=v[1]; t.a=a; t.b=b;
        A.kruk(ID,[a,b],t.who); /* adtje kruk: elke worp van de twee stenen telt, ook een 31 en de extra ronde */
        if(Math.max(a,b)===3&&Math.min(a,b)===1){
          t.n31++; t.ph="deel31"; A.play("ding");
          A.save(); render();
          show("info","31!",[A.name(t.who)+" mag één slok uitdelen. Telt niet als worp: daarna opnieuw gooien."],A.dicerow([a,b]));
          return;
        }
        var j=judge(t.gok[0],t.gok[1],a,b);
        if(j.ask){ var o=oldest(t.pr[0],t.pr[1]); if(o<0){ t.ph="oudste"; A.save(); render(); return; } resolve(j.best[o],o); return; }
        resolve(j.pick,-1);
      }
      /* m = de gekozen verdeling van stenen over voorspellers; oud = 0/1 als de oudste de doorslag gaf, anders -1 */
      function resolve(m,oud){
        var R=G.R, t=R.t, a=t.a, b=t.b, p=t.pr, both=m.right[0]&&m.right[1], lines=[];
        var res={ die:m.die, right:m.right, diff:m.diff, oud:oud, both:both, dealer:-1, dealt:null, dubbel:false, mexx:0 };
        if(both){ A.atje(p[0],1); A.atje(p[1],1); lines.push(A.joinNames(p)+" voorspellen allebei goed: allebei een adtje."); }
        else [0,1].forEach(function(k){
          if(m.right[k]){ res.dealer=k; lines.push(A.name(p[k])+" voorspelt goed en mag een half adtje uitdelen."); }
          else { A.drink(p[k],m.diff[k]); lines.push(A.name(p[k])+" zit er "+m.diff[k]+" naast: drink "+slok(m.diff[k])+"."); }
        });
        if(G.dubbel&&a===b){ res.dubbel=true; A.drink(t.who,1); lines.push(A.name(t.who)+" gooit dubbel: zelf 1 slok."); }
        /* besluit Stijn: ook een Mexx in de extra ronde telt mee voor de straf (bij Mexx-score en bij Ogen) */
        var s=score(a,b); res.mexx=s===2000?2:s===1000?1:0; R.mexx+=res.mexx;
        if(res.mexx) lines.push(A.name(t.who)+" gooit "+label(a,b)+(res.mexx===2?", telt als twee Mexx":"")+(R.tie?(res.mexx===2?", ook in de extra ronde.":": telt ook in de extra ronde mee."):"."));
        t.res=res; t.ph="uitslag";
        A.save(); render();
        if(both){ A.play("dood"); show("dood","Adtje!",lines,A.dicerow([a,b])); }
        else if(res.mexx){ A.play("win"); show("win",label(a,b)+"!",lines,A.dicerow([a,b])); }
        else if(res.dealer>=0){ A.play("ding"); show("win","Raak!",lines,A.dicerow([a,b])); }
        else { A.play("tick"); show("dood","Mis!",lines,A.dicerow([a,b])); }
      }
      function commit(){
        var R=G.R, t=R.t;
        if(R.tie){
          R.tie.rolls[t.who]={ a:t.a, b:t.b };
          var nx=R.tie.players.filter(function(i){ return !R.tie.rolls[i]; })[0];
          if(nx===undefined) finishTie(); else beginThrow(nx);
          return;
        }
        R.turns[t.who]={ a:t.a, b:t.b, score:score(t.a,t.b) };
        var nxt=(t.who+1)%P().length;
        if(nxt===R.start) finishRound(); else beginThrow(nxt);
      }
      function finishRound(){
        var R=G.R, lo=lowest(), losers=Object.keys(R.turns).map(Number).filter(function(i){ return R.turns[i].score===lo; });
        if(losers.length>1) startTie(losers); else settle(losers[0]);
      }
      function tieVal(r,mode){ return mode==="ogen"?r.a+r.b:score(r.a,r.b); }
      function startTie(list){ G.R.tie={ players:list, rolls:{}, mode:G.tb }; beginThrow(list[0]); }
      function finishTie(){
        var T=G.R.tie, lo=null;
        T.players.forEach(function(i){ var x=tieVal(T.rolls[i],T.mode); if(lo===null||x<lo)lo=x; });
        var losers=T.players.filter(function(i){ return tieVal(T.rolls[i],T.mode)===lo; });
        if(losers.length>1) startTie(losers); else settle(losers[0]);
      }
      function settle(loser){
        var R=G.R, n=R.mexx, txt=strafTxt(n);
        if(!n) A.drink(loser,1); else if(G.straf===4) A.atje(loser,n*0.5); else A.drink(loser,n*G.straf);
        R.done={ loser:loser, txt:txt }; R.t.ph="klaar"; setActive(loser);
        A.save(); render();
        A.play("dood");
        show("dood","Dood!",[A.name(loser)+" is laag. Drink "+txt+".",n?n+"x Mexx deze ronde.":"Geen Mexx deze ronde."]);
      }

      function who(list,attr,pressed){
        return '<div class="nostradamus-who">'+list.map(function(i){ return '<button data-'+attr+'="'+i+'" aria-pressed="'+(!!pressed&&pressed.indexOf(i)>=0)+'">'+esc(A.name(i))+'</button>'; }).join("")+'</div>';
      }
      function predRow(t,k){ return '<span>'+esc(A.name(t.pr[k]))+' voorspelt '+A.dicerowSmall([t.gok[k]])+'</span>'; }
      function tap(node,fn){ if(node) node.onclick=function(){ if(!ok()){ restart(); return; } fn(node); }; }
      function tapAll(sel,fn){ Array.prototype.forEach.call(root.querySelectorAll(sel),function(n){ tap(n,fn); }); }

      function render(){
        seq++;
        if(P().length<3){
          root.innerHTML='<div class="nostradamus-root"><p class="hint">Nostradamus PowerMexx speel je met minstens drie spelers: één gooit en wijst twee anderen aan die elk een dobbelsteen voorspellen. Voeg hierboven met + speler iemand toe en tik dan op Begin.</p><div class="btnrow"><button class="btn gold" id="nos-go">Begin</button></div></div>';
          el("nos-go").onclick=function(){ if(P().length<3) A.toast("Nog te weinig spelers","Er zijn er minstens drie nodig.",2500); render(); };
          return;
        }
        if(!ok()){ newRound(cur()); return; }
        var R=G.R, t=R.t, nm=A.name(t.who), lo=lowest(), h="", beurt=R.done?R.done.loser:t.who;
        if(A.S.active!==beurt) setActive(beurt); /* de balk blijft bij wie er aan de beurt is */

        h+='<div class="board"><table class="score"><tr><th>speler</th><th>worp</th><th>score</th></tr>';
        P().forEach(function(q,i){
          var tr=R.turns[i], d=tr||(!R.tie&&i===t.who&&t.ph==="uitslag"?t:null);
          h+='<tr'+(i===t.who&&!R.done?' class="cur"':'')+'><td>'+esc(q.name)+'</td><td>'+(d?A.dicerowSmall([d.a,d.b]):"–")+'</td><td>'+(d?label(d.a,d.b):"–")+(tr&&tr.score===lo?' <span class="nostradamus-laag">laag</span>':'')+'</td></tr>';
        });
        h+='</table><div class="stat"><span>Mexx deze ronde: <b>'+R.mexx+'</b></span><span>Verliezer drinkt: <b>'+esc(strafTxt(R.mexx))+'</b></span></div></div>';

        if(R.tie&&!R.done){
          var T=R.tie;
          h+='<div class="nostradamus-box"><b class="nostradamus-kop">Gelijk laag</b>'+esc(A.joinNames(T.players))+' gooien elk nog één keer. '+(T.mode==="ogen"?"Wie de minste ogen gooit, verliest.":"Wie de laagste Mexx-score gooit, verliest.")+" Een Mexx telt ook nu mee voor de straf.";
          T.players.forEach(function(i){ var r=T.rolls[i]; if(r) h+='<div class="nostradamus-rolls">'+esc(A.name(i))+': '+A.dicerowSmall([r.a,r.b])+' '+(T.mode==="ogen"?(r.a+r.b)+" ogen":label(r.a,r.b))+'</div>'; });
          h+='</div>';
        }

        if(R.done){
          var L=R.done.loser, lt=R.turns[L];
          h+='<div class="verdict fout"><h2>Dood!</h2><p><b>'+esc(A.name(L))+'</b> is laag'+(lt?' met '+label(lt.a,lt.b):'')+' en drinkt <b>'+esc(R.done.txt)+'</b>. '+(R.mexx?R.mexx+'x Mexx deze ronde.':'Geen Mexx deze ronde.')+'</p><div class="btnrow"><button class="btn gold" id="nos-nextround">Volgende ronde</button></div></div>';
        } else if(t.ph==="wijs"){
          h+='<p class="hint nostradamus-hint"><b>'+esc(nm)+'</b> gooit zo. Tik eerst de twee spelers aan die elk één dobbelsteen voorspellen'+(t.pr.length===1?' (nog één)':'')+'.</p>'+who(A.others(t.who),"pr",t.pr);
        } else if(t.ph==="voorspel"){
          var k=t.gok[0]===null?0:1;
          if(k===1) h+='<div class="stat nostradamus-pred">'+predRow(t,0)+'</div>';
          h+='<p class="hint nostradamus-hint"><b>'+esc(A.name(t.pr[k]))+'</b> voorspelt hardop één dobbelsteen van '+esc(nm)+'. Tik het aantal ogen aan.</p><div class="picker open">';
          for(var v=1;v<=6;v++) h+='<button data-g="'+v+'" aria-label="'+v+'">'+A.pips(v)+'</button>';
          h+='</div>';
          if(k===1||A.others(t.who).length>2) h+='<div class="btnrow"><button class="btn" id="nos-back">'+(A.others(t.who).length>2?"Anders aanwijzen":"Opnieuw voorspellen")+'</button></div>';
        } else if(t.ph==="gooi"){
          h+='<div class="stat nostradamus-pred">'+predRow(t,0)+predRow(t,1)+'</div>';
          h+='<p class="hint nostradamus-hint">'+(t.note?esc(t.note)+'<br>':'')+'<b>'+esc(nm)+'</b> gooit één keer, niets laten liggen. Tik op Dobbel, of tik op een steen en vul de echte worp in.</p><div id="nos-dice"></div>';
          if(!t.n31) h+='<div class="btnrow"><button class="btn" id="nos-back">Voorspellingen aanpassen</button></div>';
        } else if(t.ph==="deel31"){
          h+='<div class="nostradamus-box"><b class="nostradamus-kop">31</b>'+esc(nm)+' gooit '+A.dicerowSmall([t.a,t.b])+'. Dat telt niet als worp: de voorspellingen blijven staan en '+esc(nm)+' mag één slok uitdelen. Wie drinkt?</div>'+who(A.others(t.who),"d31")+'<div class="btnrow"><button class="btn" id="nos-no31">Niet uitdelen</button></div>';
        } else if(t.ph==="oudste"){
          h+='<div class="nostradamus-box"><b class="nostradamus-kop">Wie is de oudste?</b>'+A.dicerowSmall([t.a,t.b])+' past op twee manieren bij de voorspellingen ('+esc(A.name(t.pr[0]))+': '+t.gok[0]+', '+esc(A.name(t.pr[1]))+': '+t.gok[1]+'). Bij twijfel heeft de oudste speler de gunstigste positie. Tik de oudste van de twee aan.</div>'+who(t.pr,"oud");
        } else if(t.ph==="uitslag"){
          var r=t.res, p=t.pr, li="";
          if(r.oud>=0) li+='<li>De stenen pasten op twee manieren. <b>'+esc(A.name(p[r.oud]))+'</b> is de oudste en krijgt de gunstigste.</li>';
          if(r.both) li+='<li><b>'+esc(A.name(p[0]))+'</b> en <b>'+esc(A.name(p[1]))+'</b> voorspellen allebei goed. Allebei een <b>adtje</b>.</li>';
          else [0,1].forEach(function(k){
            if(r.right[k]) li+='<li><b>'+esc(A.name(p[k]))+'</b> voorspelde '+t.gok[k]+': goed. '+(r.dealt===null?'Mag een half adtje uitdelen.':r.dealt<0?'Deelt niets uit.':'<b>'+esc(A.name(r.dealt))+'</b> drinkt een <b>half adtje</b>.')+'</li>';
            else li+='<li><b>'+esc(A.name(p[k]))+'</b> voorspelde '+t.gok[k]+', de steen is '+r.die[k]+': drinkt <b>'+slok(r.diff[k])+'</b>.</li>';
          });
          if(r.dubbel) li+='<li><b>'+esc(nm)+'</b> gooit dubbel en neemt zelf <b>1 slok</b>.</li>';
          if(r.mexx) li+='<li><b>'+esc(nm)+'</b> gooit '+label(t.a,t.b)+(r.mexx===2?' (telt als twee Mexx)':'')+(R.tie?', ook in de extra ronde telt dat mee':'')+'. De verliezer drinkt nu '+esc(strafTxt(R.mexx))+'.</li>';
          var pending=r.dealer>=0&&r.dealt===null;
          h+='<div class="verdict '+(r.both?"fout":r.dealer>=0?"win":"neutral")+'"><div class="nostradamus-roll">'+A.dicerowSmall([t.a,t.b])+'<span>'+(R.tie&&R.tie.mode==="ogen"?(t.a+t.b)+" ogen":label(t.a,t.b))+'</span></div><ul class="nostradamus-lines">'+li+'</ul>';
          if(pending) h+='<p>Wie krijgt het halve adtje van <b>'+esc(A.name(p[r.dealer]))+'</b>?</p>'+who(A.others(p[r.dealer]),"deal")+'<div class="btnrow"><button class="btn" id="nos-nodeal">Niet uitdelen</button></div>';
          else h+='<div class="btnrow"><button class="btn gold" id="nos-next">Verder</button></div>';
          h+='</div>';
        }

        h+='<div class="nostradamus-set">';
        h+='<div class="seg"><span>per Mexx:</span><button data-s="2" aria-pressed="'+(G.straf===2)+'">2 slokken</button><button data-s="3" aria-pressed="'+(G.straf===3)+'">3 slokken</button><button data-s="4" aria-pressed="'+(G.straf===4)+'">half adtje</button></div>';
        h+='<div class="seg"><span>gelijk laag:</span><button data-tb="mexx" aria-pressed="'+(G.tb==="mexx")+'">Mexx</button><button data-tb="ogen" aria-pressed="'+(G.tb==="ogen")+'">Ogen</button></div>';
        h+='<div class="seg"><button id="nos-dub" aria-pressed="'+G.dubbel+'">dubbel gooien = zelf 1 slok</button></div>';
        h+='<div class="btnrow"><button class="btn" id="nos-new">Nieuwe ronde</button>'+(Object.keys(G.oud).length?'<button class="btn" id="nos-age">Leeftijden vergeten</button>':'')+'</div></div>';
        root.innerHTML='<div class="nostradamus-root">'+h+'</div>';

        /* aanwijzen */
        tapAll("[data-pr]",function(n){
          var i=+n.getAttribute("data-pr"), at=t.pr.indexOf(i);
          if(at>=0) t.pr.splice(at,1); else if(t.pr.length<2) t.pr.push(i);
          if(t.pr.length===2) t.ph="voorspel";
          A.save(); render();
        });
        /* voorspellen */
        tapAll("[data-g]",function(n){
          var kk=t.gok[0]===null?0:1; t.gok[kk]=+n.getAttribute("data-g"); A.play("tick");
          if(kk===1) t.ph="gooi";
          A.save(); render();
        });
        tap(el("nos-back"),function(){
          t.gok=[null,null];
          if(t.ph==="voorspel"&&A.others(t.who).length>2){ t.pr=[]; t.ph="wijs"; } else t.ph="voorspel";
          A.save(); render();
        });
        /* gooien: digitaal of de echte stenen intikken */
        if(!R.done&&t.ph==="gooi"){ var my=seq; A.Dice(el("nos-dice"),{ n:2, label:"Dobbel", onRoll:function(vals){ if(my===seq) onRoll(vals); } }); }
        /* 31: één slok uitdelen, daarna opnieuw gooien met dezelfde voorspellingen */
        function after31(note){ t.note=note; t.a=null; t.b=null; t.ph="gooi"; A.save(); render(); }
        tapAll("[data-d31]",function(n){ var j=+n.getAttribute("data-d31"); A.drink(j,1); after31(A.name(j)+" drinkt 1 slok van "+A.name(t.who)+" (31)."); });
        tap(el("nos-no31"),function(){ after31(A.name(t.who)+" gooide 31 en deelt niets uit."); });
        /* de oudste beslist */
        tapAll("[data-oud]",function(n){
          var i=+n.getAttribute("data-oud"), o=t.pr.indexOf(i), j=judge(t.gok[0],t.gok[1],t.a,t.b);
          G.oud[ageKey(t.pr[0],t.pr[1])]=A.name(i);
          if(j.ask) resolve(j.best[o],o); else resolve(j.pick,-1);
        });
        /* half adtje uitdelen */
        tapAll("[data-deal]",function(n){ var j=+n.getAttribute("data-deal"); t.res.dealt=j; A.atje(j,0.5); A.play("ding"); A.save(); render(); });
        tap(el("nos-nodeal"),function(){ t.res.dealt=-1; A.save(); render(); });
        tap(el("nos-next"),function(){ commit(); });
        tap(el("nos-nextround"),function(){ newRound(R.done.loser); });
        /* afspraken */
        tapAll("[data-s]",function(n){ G.straf=+n.getAttribute("data-s"); A.save(); render(); });
        tapAll("[data-tb]",function(n){
          G.tb=n.getAttribute("data-tb");
          if(R.tie&&!R.done&&!Object.keys(R.tie.rolls).length) R.tie.mode=G.tb; /* een lopende extra ronde houdt zijn afspraak */
          A.save(); render();
        });
        tap(el("nos-dub"),function(){ G.dubbel=!G.dubbel; A.save(); render(); });
        tap(el("nos-new"),function(){ newRound(cur()); });
        tap(el("nos-age"),function(){ G.oud={}; A.save(); render(); });
      }

      if(ok()) setActive(G.R.done?G.R.done.loser:G.R.t.who);
      render();
      this.refresh=render;
      this.destroy=function(){ seq++; };
      /* Tik op een andere speler in de balk: vóór de eerste worp (of na afloop) begint die speler de ronde, anders blijft de beurt waar hij is. */
      this.onPlayer=function(i){
        if(!ok()){ render(); return; }
        var R=G.R, t=R.t, fresh=!R.tie&&!Object.keys(R.turns).length&&t.a===null&&!t.n31;
        if(R.done||fresh){ newRound(i); return; }
        setActive(t.who); A.toast(A.name(t.who)+" is aan de beurt","De ronde loopt nog. Onderaan staat Nieuwe ronde.",2600);
      };
    }
  });
})();
