/* ===== Oude Bami, Nieuwe Bami =====
   Eén dobbelsteen. Wie meedoet gooit om de beurt één keer; van wie het gegooide getal is, die drinkt één slok.

   TAFELREGELS VAN STIJN (15 nov 2026), waar ze afwijken van de bijbel:
   - De zes ogen worden eerlijk verdeeld, dus het spel is voor precies 2, 3 of 6 spelers:
       2 spelers: oude bami = 1, 2, 3 en nieuwe bami = 4, 5, 6 (zo staat het ook in de bijbel);
       3 spelers: linker bami = 1, 2 · midden bami = 3, 4 · rechter bami = 5, 6. Dit VERVANGT de midden bami uit de
                  bijbel (regel 5, die bij 3 en 4 meedronk): niemand deelt een getal;
       6 spelers: iedereen pakt één getal, 1 tot en met 6.
     Met 4 of 5 spelers kan het niet: dan spelen er twee of drie en kijkt de rest toe.
   - Adtje kruk telt hier WEL, ook al is het één steen: drie keer op rij hetzelfde getal, door de beurten heen, is een
     adtje voor wie de derde gooit (A.kruk bij elke worp). Dat gebeurt dus vaak.
   - Na een worp staat alleen de NAAM van wie moet drinken groot in beeld. Geen "Slok!" en geen uitleg: het is een snel
     spel en niemand moet een zin hoeven lezen (en regel 6 van de bijbel: de regels mogen niet worden uitgelegd).

   Reeksen (Stijn en Daan, 15 nov 2026), alleen met twee spelers: de derde keer op rij drinken is 2 slokken, daarna
   telkens één meer. Voor 3 en 6 spelers is dat nog niet bekend (TODO); alle slokken komen uit sipsFor() hieronder.

   Keuzes waar de bijbel en Stijn niets over zeggen:
   - Volgorde van gooien: de volgorde van de spelersbalk onder de deelnemers; de actieve speler begint als hij meedoet.
   - Het spel heeft geen einde: het loopt tot iemand op "Nieuw spel" tikt (terug naar de opstelling, zelfde keuzes).
   - Deelnemers worden op NAAM teruggevonden als de spelersbalk verandert. Staat de naam er niet meer en is de balk
     even lang gebleven, dan is de speler hernoemd; anders is hij weg en gaat het spel terug naar de opstelling. */
(function(){
  "use strict";
  var A=App, el=A.el, esc=A.esc, ID="oudebami";
  var SIZES=[2,3,6];
  var ROLES={ 2:["Oude bami","Nieuwe bami"], 3:["Linker bami","Midden bami","Rechter bami"], 6:["1","2","3","4","5","6"] };
  /* de zes ogen eerlijk verdeeld over 2, 3 of 6 plekken: bij welke plek (0, 1, …) hoort het getal v */
  function ownerOf(form,v){ return Math.floor((v-1)*form/6); }

  /* Hoeveel slokken drinkt de eigenaar van het gegooide getal bij deze worp?
     owner = de plek (0, 1, …) van wie het getal is, value = het gegooide getal, history = de eerdere worpen van dit
     spel, de nieuwste eerst, elk {v: getal, o: plek die dronk, t: plek die gooide, s: slokken}, form = 2, 3 of 6.
     Reeksregel van Stijn en Daan (15 nov 2026), voor het spel met TWEE spelers: moet je voor de derde keer op rij
     drinken, dan zijn het 2 slokken; daarna bij elke verlenging één meer (3, 4, 5, …). De eerste twee keer is 1 slok.
     TODO: voor 3 en 6 spelers is de reeksregel nog niet bekend; daar blijft elke worp één slok. */
  function sipsFor(owner,value,history,form){
    var streak=1, i;
    if(form!==2) return 1;
    for(i=0;i<history.length&&history[i].o===owner;i++) streak++;
    return streak<3?1:streak-1;
  }

  function css(){
    if(el("oudebami-style")) return;
    var s=document.createElement("style"); s.id="oudebami-style";
    s.textContent=".oudebami-forms button,.oudebami-pl button{min-height:42px;padding:6px 14px;font-size:15px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"+
      ".oudebami-note{text-align:center;font-size:14px;line-height:1.4;margin:6px 0 10px}"+
      ".oudebami-h{margin:14px 0 6px;font-size:13px;font-weight:500;color:var(--ivory-dim);text-align:center}"+
      ".oudebami-slots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}"+
      ".oudebami-slots.oudebami-n2{grid-template-columns:repeat(2,minmax(0,1fr))}"+
      ".oudebami-slot{min-width:0;min-height:68px;padding:6px 6px;border-radius:10px;border:1.5px solid rgba(243,233,210,.3);background:rgba(0,0,0,.18);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-align:center}"+
      ".oudebami-slot[aria-pressed=\"true\"]{border-color:var(--gold);background:rgba(231,184,79,.16);box-shadow:0 0 0 1.5px var(--gold)}"+
      ".oudebami-rt{font-size:14px;font-weight:700;color:var(--ivory-dim);max-width:100%}"+
      ".oudebami-rn{display:block;width:100%;font-size:16px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"+
      ".oudebami-rn.oudebami-none{font-weight:500;font-size:13px;font-style:italic;color:var(--ivory-dim)}"+
      ".oudebami-btn{min-height:44px}"+
      ".oudebami-go{min-height:50px;font-size:18px;padding:10px 26px}"+
      ".oudebami-zwijg{font-size:12px;font-style:italic}"+
      /* het naamvak: de naam van wie drinkt, zo groot als past (lettergrootte komt uit fit()) */
      ".oudebami-who{min-height:136px;padding:10px 12px;border-radius:14px;border:1.5px solid var(--red);background:rgba(200,75,58,.3);display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}"+
      ".oudebami-who.oudebami-leeg{border-color:rgba(243,233,210,.25);background:rgba(0,0,0,.2)}"+
      ".oudebami-name{width:100%;display:flex;flex-direction:column;font-weight:900;line-height:1.04;text-align:center;color:#fff;text-shadow:0 3px 14px rgba(0,0,0,.4);animation:popin .3s cubic-bezier(.2,1.4,.4,1)}"+
      /* de regels staan strak op elkaar (1.04), maar een staart (de j van Stijn, g, p) of een accent mag niet worden afgesneden:
         de marge naar binnen en evenveel naar buiten geeft het afsnijvak ruimte zonder dat de regel hoger wordt */
      ".oudebami-name span{display:block;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:.12em 0 .22em;margin:-.12em 0 -.22em}"+
      ".oudebami-more{margin-top:6px;font-size:20px;font-weight:900;color:#fff}"+
      ".oudebami-wait{max-width:100%;font-size:20px;color:var(--ivory-dim);text-align:center;overflow-wrap:anywhere}"+
      ".oudebami-wait b{color:var(--ivory)}"+
      ".oudebami-turn{margin:10px 0 0;font-size:17px;text-align:center;color:var(--ivory-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"+
      ".oudebami-turn b{color:var(--gold)}"+
      ".oudebami-tip{padding:0 0 10px;font-size:12px}"+
      ".oudebami-tbl td{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"+
      ".oudebami-hist{display:flex;flex-wrap:wrap;align-items:center;gap:4px 2px;margin:10px 4px 0;font-size:13px;color:var(--ivory-dim)}"+
      ".oudebami-hist .oudebami-lbl{margin-right:4px}"+
      ".oudebami-measure{position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;font-weight:900;font-size:100px;line-height:1;pointer-events:none}"+
      /* de naam in de overlay: breekt nooit buiten beeld, de lettergrootte zet het spel zelf */
      ".overlay.oudebami-ov span.t{max-width:100%;overflow-wrap:anywhere}";
    document.head.appendChild(s);
  }

  /* ---- een naam zo groot als past ---- */
  /* schatting van de breedte in em (vet schreefletter), voor als meten niet kan */
  function estW(line){
    var w=0, i, c;
    for(i=0;i<line.length;i++){
      c=line.charAt(i);
      if(c===" ") w+=0.3; else if("ijlI.,'’|!:;-ftr".indexOf(c)>=0) w+=0.45; else if("mwMW".indexOf(c)>=0) w+=1.05;
      else if((c>="A"&&c<="Z")||(c>="0"&&c<="9")) w+=0.8; else if(c>"\u2000") w+=1.2; else w+=0.68;   /* boven U+2000: emoji en andere brede tekens */
    }
    return w;
  }
  /* een lange naam met een spatie mag over twee regels: breek bij de spatie het dichtst bij het midden */
  function twoLines(nm){
    var mid=nm.length/2, best=-1, i;
    for(i=1;i<nm.length-1;i++) if(nm.charAt(i)===" "&&(best<0||Math.abs(i-mid)<Math.abs(best-mid))) best=i;
    return best<0?null:[nm.slice(0,best),nm.slice(best+1)];
  }

  function validState(G){
    var s, st, ok=function(n){ return typeof n==="number"&&n>=0&&n===Math.floor(n); };
    if(G.v!==2||(G.phase!=="setup"&&G.phase!=="play")) return false;
    if(G.form!==null&&SIZES.indexOf(G.form)<0) return false;
    if(!Array.isArray(G.seat)||!Array.isArray(G.sips)||!Array.isArray(G.adt)||!Array.isArray(G.log)||!ok(G.rolls)) return false;
    if(G.seat.length!==(G.form||0)||G.sips.length!==G.seat.length||G.adt.length!==G.seat.length) return false;
    for(s=0;s<G.seat.length;s++){
      st=G.seat[s];
      if(st!==null&&(typeof st!=="object"||!ok(st.i)||typeof st.n!=="string")) return false;
      if(!ok(G.sips[s])||!ok(G.adt[s])) return false;
      if(G.phase==="play"&&st===null) return false;
    }
    for(s=0;s<G.log.length;s++) if(!G.log[s]||!(G.log[s].v>=1&&G.log[s].v<=6)) return false;
    if(G.last!==null&&(typeof G.last!=="object"||!(G.last.v>=1&&G.last.v<=6)||typeof G.last.n!=="string")) return false;
    if(G.phase==="play"&&(G.form===null||!ok(G.turn)||G.turn>=G.form)) return false;
    return true;
  }
  /* schone lei; ook voor een bewaarde stand van de vorige versie (rollen oude/nieuwe/midden): die begint bij de opstelling */
  function freshState(G){
    var k; for(k in G) if(Object.prototype.hasOwnProperty.call(G,k)&&k!=="_kruk") delete G[k];
    G.v=2; G.phase="setup"; G.form=null; G.seat=[]; G.sips=[]; G.adt=[]; G.log=[]; G.rolls=0; G.turn=0; G.last=null;
  }

  A.register({ id:ID, beta:true, title:"Oude Bami, Nieuwe Bami", level:"app", sub:"Eén steen: wie zijn getal valt, drinkt. Voor 2, 3 of 6 spelers",
    init:function(root){
      css();
      var G=A.gs(ID), gen=0, dead=false, sel=null, meas=null, wcache={};
      if(!G||typeof G!=="object"||Array.isArray(G)){ A.S.gs[ID]={}; G=A.gs(ID); }
      if(!validState(G)) freshState(G);

      /* ---- meten ---- */
      if(document.body&&document.createElement){
        meas=el("oudebami-measure");
        if(!meas){ meas=document.createElement("span"); meas.id="oudebami-measure"; meas.className="oudebami-measure"; meas.setAttribute("aria-hidden","true"); document.body.appendChild(meas); }
      }
      /* breedte van één regel in em bij lettergrootte px: gemeten in een onzichtbaar vakje, anders geschat */
      function emW(line,px){
        var key=px+"|"+line, w=0;
        if(wcache[key]) return wcache[key];
        if(meas&&meas.style){ meas.style.fontSize=px+"px"; meas.textContent=line; w=meas.offsetWidth/px; }
        if(w>0){ wcache[key]=w; return w; }
        return estW(line);
      }
      function widest(lines,px){ var m=0, i; for(i=0;i<lines.length;i++) m=Math.max(m,emW(lines[i],px)); return m||1; }
      function fontFor(lines,avail,cap){
        var px=Math.max(14,Math.floor(Math.min(cap,avail*0.96/widest(lines,100))));
        /* Fraunces verandert van vorm met de grootte (optische grootte): klein gezet is hij breder.
           Daarom nog één keer meten op de gekozen grootte; de naam wordt daar alleen kleiner van, nooit groter. */
        return Math.min(px,Math.max(14,Math.floor(Math.min(cap,avail*0.96/widest(lines,px)))));
      }
      /* {lines, px}: één regel, of twee als de naam daar duidelijk groter van wordt */
      function fit(nm,avail,cap1,cap2){
        var one=fontFor([nm],avail,cap1), tl=twoLines(nm), two=tl?fontFor(tl,avail,cap2):0;
        return two>one*1.15?{lines:tl,px:two}:{lines:[nm],px:one};
      }
      function winW(){ return window.innerWidth||(document.documentElement&&document.documentElement.clientWidth)||360; }
      function fitPage(nm){
        var w=root.clientWidth||Math.min(winW(),520);     /* #view-game: 14 px rand links en rechts, het naamvak nog eens 13,5 */
        return fit(nm,Math.max(120,w-58),96,54);   /* twee regels van 54 px passen nog net in het naamvak */
      }
      function fitOverlay(o,nm){
        var t=o&&o.querySelector?o.querySelector(".t"):null, w=winW(), f;
        if(!t||!t.style) return;
        f=fit(nm,Math.max(120,(w-40)*0.93),Math.min(w*0.3,140),Math.min(w*0.2,84)); /* 0,93: de titel staat 5 graden schuin */
        t.style.fontSize=f.px+"px";
      }
      function refit(){
        var n=el("oudebami-name"), f;
        if(dead||!n||G.phase!=="play"||!G.last) return;
        f=fitPage(G.last.n);
        n.style.fontSize=f.px+"px";
        n.innerHTML=f.lines.map(function(l){ return "<span>"+esc(l)+"</span>"; }).join("");
      }
      function onResize(){ refit(); }
      if(window.addEventListener) window.addEventListener("resize",onResize);
      /* het lettertype kan na de eerste meting binnenkomen (ook later nog, voor een naam met een bijzonder teken): dan opnieuw passen */
      function onFonts(){ wcache={}; refit(); }
      if(document.fonts){
        if(document.fonts.ready&&document.fonts.ready.then) document.fonts.ready.then(onFonts);
        if(document.fonts.addEventListener) document.fonts.addEventListener("loadingdone",onFonts);
      }

      /* ---- opstelling ---- */
      function allowed(){ var P=A.S.players.length; return SIZES.filter(function(f){ return f<=P; }); }
      function setForm(f){
        var s;
        G.form=f; G.seat=[]; G.sips=[]; G.adt=[];
        for(s=0;s<(f||0);s++){ G.seat.push(null); G.sips.push(0); G.adt.push(0); }
      }
      function prefill(){ var s; for(s=0;s<G.form;s++) G.seat[s]={i:s,n:A.name(s)}; } /* in de volgorde van de spelersbalk */
      function seatOf(i){ for(var s=0;s<G.seat.length;s++) if(G.seat[s]&&G.seat[s].i===i) return s; return -1; }
      function firstEmpty(){ for(var s=0;s<G.seat.length;s++) if(!G.seat[s]) return s; return null; }
      function ready(){ return G.form!==null&&G.seat.length===G.form&&firstEmpty()===null; }
      /* de plekken in de volgorde van de spelersbalk: zo gaat de beurt rond */
      function order(){
        var o=[], s; for(s=0;s<G.seat.length;s++) if(G.seat[s]) o.push(s);
        return o.sort(function(a,b){ return G.seat[a].i-G.seat[b].i; });
      }
      function zero(){ var s; for(s=0;s<G.seat.length;s++){ G.sips[s]=0; G.adt[s]=0; } G.rolls=0; G.log=[]; G.last=null; }
      function roleText(s){ return G.form===6?"getal "+(s+1):ROLES[G.form][s].toLowerCase(); }

      /* De spelersbalk kan tussendoor veranderen (speler erbij, weg, hernoemd): elke plek weer aan de juiste speler hangen. */
      function sync(){
        var p=A.S.players, P=p.length, same=G.np===P, used={}, hit=[], gone=[], before=JSON.stringify([G.phase,G.form,G.seat,G.np]), s, x, st;
        for(s=0;s<G.seat.length;s++){ st=G.seat[s]; hit[s]=-1; if(st&&p[st.i]&&p[st.i].name===st.n&&!used[st.i]){ hit[s]=st.i; used[st.i]=true; } }
        /* op naam terugvinden (de speler is opgeschoven doordat een ander wegging) */
        for(s=0;s<G.seat.length;s++){ st=G.seat[s]; if(!st||hit[s]>=0) continue; for(x=0;x<P;x++) if(!used[x]&&p[x].name===st.n){ hit[s]=x; used[x]=true; break; } }
        /* naam nergens meer: bij een even lange balk is de speler hernoemd, anders is hij weg
           (dan mag wie op zijn plek schuift zijn getallen niet stilletjes erven) */
        for(s=0;s<G.seat.length;s++){ st=G.seat[s]; if(!st||hit[s]>=0) continue; if(same&&p[st.i]&&!used[st.i]){ hit[s]=st.i; used[st.i]=true; } }
        for(s=0;s<G.seat.length;s++){ st=G.seat[s]; if(!st) continue; if(hit[s]<0){ gone.push(st.n); G.seat[s]=null; } else { st.i=hit[s]; st.n=p[hit[s]].name; } }
        /* hernoemd terwijl zijn naam groot in beeld staat: de nieuwe naam tonen */
        if(G.phase==="play"&&G.last&&typeof G.last.o==="number"&&G.seat[G.last.o]) G.last.n=G.seat[G.last.o].n;
        G.np=P;
        if(G.phase==="play"&&gone.length){
          G.phase="setup"; zero(); A.krukReset(ID);
          A.toast(A.joinNames(gone)+(gone.length>1?" zijn weg":" is weg"),"Niet meer te vinden in de spelersbalk. Kies opnieuw wie meedoet.",5000);
        }
        if(G.phase==="setup"){
          if(G.form!==null&&G.form>P){ setForm(null); sel=null; }
          /* precies 2, 3 of 6 spelers in de balk: die vorm staat klaar, in de volgorde van de balk
             (behalve als die vorm al helemaal gekozen is: een zelf gekozen verdeling blijft dan staan) */
          if((G.form===null||!same)&&SIZES.indexOf(P)>=0&&!(G.form===P&&ready())){ setForm(P); prefill(); sel=null; }
        }
        if(JSON.stringify([G.phase,G.form,G.seat,G.np])!==before) A.save();
      }

      function pickForm(f){
        sync();
        if(G.phase!=="setup"||allowed().indexOf(f)<0){ render(); return; }
        if(G.form!==f){ setForm(f); if(A.S.players.length===f) prefill(); sel=firstEmpty(); A.save(); }
        render();
      }
      function pickSlot(s){ sel=(sel===s?null:s); render(); }
      function pickPlayer(i){
        var p=A.S.players, cur, prev;
        sync();
        if(G.phase!=="setup"||G.form===null||!p[i]){ render(); return; }
        cur=seatOf(i);
        if(sel===null||sel>=G.form){
          /* geen plek aangetikt: een speler die al meedoet gaat eruit en zijn plek staat klaar voor een ander */
          if(cur>=0){ G.seat[cur]=null; sel=cur; }
          else { A.toast("Tik eerst een plek aan","Daarna neemt "+A.name(i)+" die plek over.",2600); }
        } else if(cur===sel){ G.seat[sel]=null; }
        else {
          prev=G.seat[sel];
          G.seat[sel]={i:i,n:p[i].name};
          if(cur>=0) G.seat[cur]=prev||null;   /* hij had al een plek: de twee wisselen */
          sel=firstEmpty();
        }
        A.save(); render();
      }
      function start(){
        var a;
        sync();
        if(G.phase!=="setup"||!ready()){ render(); return; }
        G.phase="play"; zero(); A.krukReset(ID);
        /* wie begint: de actieve speler als die meedoet, anders de eerste deelnemer in de balk */
        a=seatOf(A.S.active); G.turn=a>=0?a:order()[0];
        A.save(); render();
      }
      function newGame(){
        G.phase="setup"; zero(); sel=null;
        A.krukReset(ID);      /* de reeks voor adtje kruk begint opnieuw */
        A.save(); render();
      }

      /* ---- een worp ---- */
      function roll(v){
        var n=v[0], t, ti, o, oi, s, nm, ord, kr, ov;
        sync();
        if(G.phase!=="play"||!(n>=1&&n<=6)){ render(); return; }
        t=G.turn; ti=G.seat[t].i;                 /* wie gooit */
        o=ownerOf(G.form,n); oi=G.seat[o].i;      /* van wie het getal is: die drinkt */
        s=sipsFor(o,n,G.log,G.form); nm=A.name(oi);
        A.drink(oi,s); G.sips[o]+=s;
        /* adtje kruk telt hier wél, met één steen: core boekt het adtje voor de gooier en toont zijn eigen melding */
        kr=A.kruk(ID,[n],ti); if(kr) G.adt[t]++;
        G.rolls++; G.log.unshift({v:n,o:o,t:t,s:s}); if(G.log.length>60) G.log.length=60;
        G.last={v:n,n:nm,s:s,o:o};
        /* om de beurt één worp: de volgende deelnemer in de balk */
        ord=order(); G.turn=ord[(ord.indexOf(t)+1)%ord.length];
        A.S.active=G.seat[G.turn].i; A.save(); A.renderPlayers();
        if(!kr) A.play("ding");
        /* alleen de naam, zo groot als past, met de steen eronder; geen "Slok!" en geen waarom (regel 6) */
        ov=A.overlay("dood oudebami-ov",nm,s>1?[s+" slokken"]:null,1500,A.dicerow([n]));
        fitOverlay(ov,nm);
        render();
      }

      /* ---- schermen ---- */
      function renderSetup(){
        var p=A.S.players, P=p.length, al=allowed(), h="", s, st, need, b;
        if(P<2){
          root.innerHTML='<p class="hint">Dit spel gaat met 2, 3 of 6 spelers. Voeg bovenaan spelers toe met “+ speler”.</p>';
          return;
        }
        if(P===4||P===5) h+='<p class="oudebami-note">Dit spel gaat alleen met 2, 3 of 6 spelers. Twee of drie van jullie kunnen spelen; de rest kijkt toe.</p>';
        else if(P>6) h+='<p class="oudebami-note">Dit spel gaat met 2, 3 of 6 spelers. Wie overblijft, kijkt toe.</p>';
        if(al.length>1){
          h+='<p class="oudebami-h">Met hoeveel spelen jullie?</p><div class="seg oudebami-forms">'+
            al.map(function(f){ return '<button data-form="'+f+'" aria-pressed="'+(G.form===f)+'">'+f+' spelers</button>'; }).join("")+'</div>';
        }
        if(G.form===null){
          h+='<p class="hint">Kies eerst met hoeveel jullie spelen.</p>';
        } else {
          if(sel!==null&&sel>=G.form) sel=null;
          if(sel===null) sel=firstEmpty();
          h+='<p class="oudebami-h">'+(G.form===6?'Wie pakt welk getal?':'Wie is welke bami?')+'</p><div class="oudebami-slots oudebami-n'+G.form+'">';
          for(s=0;s<G.form;s++){
            st=G.seat[s];
            h+='<button class="oudebami-slot" data-slot="'+s+'" aria-pressed="'+(sel===s)+'" aria-label="'+esc(roleText(s)+": "+(st?st.n:"nog niemand"))+'">'+
              '<span class="oudebami-rt">'+(G.form===6?A.dicerowSmall([s+1]):esc(ROLES[G.form][s]))+'</span>'+
              (st?'<span class="oudebami-rn">'+esc(st.n)+'</span>':'<span class="oudebami-rn oudebami-none">'+(sel===s?'tik een speler':'nog niemand')+'</span>')+'</button>';
          }
          h+='</div><div class="seg oudebami-pl">'+
            p.map(function(q,i){ return '<button data-pl="'+i+'" aria-pressed="'+(seatOf(i)>=0)+'">'+esc(q.name)+'</button>'; }).join("")+'</div>';
          need=G.seat.filter(function(x){ return !x; }).length;
          h+='<p class="hint oudebami-tip">'+(need?(sel!==null?'Tik de speler aan voor '+esc(roleText(sel))+'.':'Tik een plek aan en daarna een speler.')
            :'Wisselen? Tik '+(G.form===6?'een getal':'een bami')+' aan en daarna de speler.'+(P>G.form?' Wie overblijft, kijkt toe.':''))+'</p>';
          h+='<div class="btnrow"><button class="btn gold oudebami-go" id="oudebami-start"'+(need?' disabled':'')+'>Start het spel</button></div>';
          if(need) h+='<p class="hint">Nog '+need+' te kiezen.</p>';
        }
        h+='<p class="hint oudebami-zwijg">Regel 6: de regels mogen niet worden uitgelegd. De app zegt straks alleen wie er drinkt.</p>';
        root.innerHTML=h;
        root.querySelectorAll("[data-form]").forEach(function(x){ x.onclick=function(){ pickForm(+x.getAttribute("data-form")); }; });
        root.querySelectorAll("[data-slot]").forEach(function(x){ x.onclick=function(){ pickSlot(+x.getAttribute("data-slot")); }; });
        root.querySelectorAll("[data-pl]").forEach(function(x){ x.onclick=function(){ pickPlayer(+x.getAttribute("data-pl")); }; });
        b=el("oudebami-start"); if(b) b.onclick=start;
      }
      function renderPlay(){
        var my=gen, ti=G.seat[G.turn].i, L=G.last, anyAdt=G.adt.some(function(x){ return x>0; }), h, s, f, dice;
        if(A.S.active!==ti){ A.S.active=ti; A.save(); A.renderPlayers(); }
        if(L){
          f=fitPage(L.n);
          h='<div class="oudebami-who" aria-live="assertive"><div class="oudebami-name" id="oudebami-name" style="font-size:'+f.px+'px">'+
            f.lines.map(function(l){ return "<span>"+esc(l)+"</span>"; }).join("")+'</div>'+
            (L.s>1?'<div class="oudebami-more">'+L.s+' slokken</div>':'')+'</div>';
        } else {
          h='<div class="oudebami-who oudebami-leeg"><div class="oudebami-wait"><b>'+esc(A.name(ti))+'</b> begint</div></div>';
        }
        h+='<p class="oudebami-turn"><b>'+esc(A.name(ti))+'</b> gooit</p><div id="oudebami-dice"></div>';
        h+='<p class="hint oudebami-tip">Echte steen? Tik op de steen en kies wat er ligt.</p>';
        h+='<div class="board"><table class="score oudebami-tbl"><tr><th>'+(G.form===6?'getal':'bami')+'</th><th>speler</th><th>slokken</th>'+(anyAdt?'<th>adtjes</th>':'')+'</tr>';
        for(s=0;s<G.form;s++){
          h+='<tr'+(s===G.turn?' class="cur"':'')+'><td>'+(G.form===6?A.dicerowSmall([s+1]):esc(ROLES[G.form][s]))+'</td><td>'+esc(A.name(G.seat[s].i))+'</td><td>'+G.sips[s]+'</td>'+(anyAdt?'<td>'+G.adt[s]+'</td>':'')+'</tr>';
        }
        h+='</table><div class="stat"><span>Worpen: <b>'+G.rolls+'</b></span></div>';
        if(G.log.length) h+='<div class="oudebami-hist"><span class="oudebami-lbl">Laatste worpen:</span>'+A.dicerowSmall(G.log.slice(0,8).map(function(x){ return x.v; }))+'</div>';
        h+='</div><div class="btnrow"><button class="btn oudebami-btn" id="oudebami-new">Nieuw spel</button></div>';
        root.innerHTML=h;
        /* digitaal gooien of de echte steen intikken; een worp van een verouderd scherm telt niet */
        dice=A.Dice(el("oudebami-dice"),{n:1,label:"Dobbel",onRoll:function(v){ if(my!==gen||dead) return; roll(v); }});
        if(L&&dice&&dice.set) dice.set([L.v]);   /* de steen blijft liggen zoals hij viel */
        el("oudebami-new").onclick=newGame;
      }
      function render(){
        if(dead) return;
        sync(); gen++;
        if(G.phase==="play") renderPlay(); else renderSetup();
      }

      /* Tik op een speler in de balk: doet hij mee, dan is hij nu aan de beurt; anders blijft de beurt waar hij was.
         In de opstelling bepaalt de actieve speler alleen wie straks begint. */
      this.onPlayer=function(i){
        var s;
        sync();
        if(G.phase==="play"){
          s=seatOf(i);
          if(s>=0){ G.turn=s; A.save(); }
          else A.toast(A.name(i)+" doet niet mee","Tik op Nieuw spel om opnieuw te kiezen wie meedoet.",2600);
        }
        render();
      };
      /* core roept refresh aan als de spelersbalk verandert (speler erbij, weg, hernoemd) */
      this.refresh=render;
      this.destroy=function(){
        gen++; dead=true;
        if(window.removeEventListener) window.removeEventListener("resize",onResize);
        if(document.fonts&&document.fonts.removeEventListener) document.fonts.removeEventListener("loadingdone",onFonts);
        if(meas&&meas.parentNode) meas.parentNode.removeChild(meas);
        meas=null;
      };
      render();
    }
  });
})();
