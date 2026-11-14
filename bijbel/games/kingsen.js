/* ===== Kingsen =====
   Niveau "hulp": het glas in het midden (en bij echte kaarten de cirkel eromheen) blijft echt. De app trekt de kaart
   (of je tikt aan welke echte kaart getrokken is), zegt wat de kaart betekent, onthoudt wat de rest van het spel geldt,
   telt de heren en boekt de slokken.
   Keuzes waar de bijbel niets over zegt:
   - Snake eyes en Question Queen hebben in de tekst geen einde: ze gelden de rest van het spel, ook voor meer spelers tegelijk.
   - Waterval: niemand weet hoeveel slokken het worden, dus de app boekt daar niets.
   - "Beantwoordt de Question Queen een vraag dan moet hij/zij drinken": gelezen als een slok, net als bij de anderen.
   - Houding: "een slik" gelezen als een slok.
   - Laatste heer: het glas in het midden leegdrinken is geboekt als een adtje.
   - Cirkel verbroken: de app vraagt wie het deed (meestal de trekker) en boekt het adtje één keer per spel.
   - Aas: de straf hoort bij de bedachte regel zelf; de app biedt alleen een knop om er een slok voor te boeken. */
(function(){
  "use strict";
  var A=App, esc=A.esc;
  var NAAM={1:"Regel",3:"Waterval",4:"Fours, whores",5:"Snake eyes",6:"Six, dicks",7:"Juffen",8:"Plaskaart",9:"Nine, bust a rhyme",10:"Houding",11:"Jack of categories",12:"Question Queen",13:"Koningsadtje"};
  var LBL={snake:"Snake eyes",queen:"Question Queen",plas:"Plaskaart",houding:"Houding"};
  var SUB={snake:"Wie deze speler in de ogen kijkt, drinkt een slok.",queen:"Een vraag beantwoorden kost een slok. Een wedervraag mag.",plas:"Eén keer de tafel verlaten. Verkopen mag ook.",houding:"Eén keer een houding aannemen: wie als laatste volgt, drinkt een slok."};
  var KNOP={snake:"Aangekeken",queen:"Antwoord gegeven",houding:"Neemt houding aan"};
  var CSS=[
    ".kingsen-wrap .btn,.kingsen-wrap .seg button{min-height:40px}",
    ".kingsen-ring{position:relative;width:190px;height:190px;margin:2px auto 4px}",
    ".kingsen-ring i{position:absolute;left:50%;top:50%;width:14px;height:21px;margin:-10.5px 0 0 -7px;border-radius:3px;background:repeating-linear-gradient(45deg,#7a2b22 0 3px,#8f3a2f 3px 6px);border:1.5px solid #f3e9d2;box-shadow:0 1px 2px rgba(0,0,0,.45)}",
    ".kingsen-glas{position:absolute;left:50%;top:50%;width:46px;height:64px;margin:-32px 0 0 -23px;border:2.5px solid var(--ivory);border-top-width:1px;border-radius:3px 3px 10px 10px;overflow:hidden;background:rgba(255,255,255,.07)}",
    ".kingsen-glas b{position:absolute;left:0;right:0;bottom:0;background:var(--gold)}",
    ".kingsen-kaart{display:flex;gap:12px;align-items:center}",
    ".kingsen-uitleg{min-width:0;flex:1}",
    ".kingsen-uitleg h3{margin:0 0 4px;font-size:21px;font-weight:900;line-height:1.1}",
    ".kingsen-uitleg p{margin:0;font-size:14px;line-height:1.4;color:var(--ivory-dim)}",
    ".kingsen-uitleg p b{color:var(--ivory)}",
    ".kingsen-trek{display:block;width:100%;max-width:360px;margin:4px auto 10px;min-height:54px;font-size:21px;font-weight:900;border-radius:14px;border:0;background:var(--gold);color:var(--ink);box-shadow:0 5px 0 #a67c22,0 10px 20px rgba(0,0,0,.3)}",
    ".kingsen-trek:active{transform:translateY(3px);box-shadow:0 2px 0 #a67c22}",
    ".kingsen-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:4px 0 10px}",
    ".kingsen-grid button{min-height:50px;padding:2px;border:0;border-radius:9px;background:linear-gradient(#fffdf6,#efe7d2);color:var(--ink);box-shadow:0 3px 0 #c4b793;font-weight:900;font-size:19px;line-height:1.05}",
    ".kingsen-grid button.kingsen-rood{color:var(--red)}",
    ".kingsen-grid button small{display:block;font-size:10px;font-weight:700;opacity:.65;margin-top:2px}",
    ".kingsen-grid button:disabled{opacity:.3}",
    ".kingsen-wie{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:8px 0}",
    ".kingsen-wie .btn{min-height:44px}",
    ".kingsen-wie .btn[aria-pressed=\"true\"]{background:var(--ivory);color:var(--ink);border-color:var(--ivory)}",
    ".kingsen-res{padding:10px 12px}",
    ".kingsen-res p{margin:0;font-size:15px;color:var(--ivory)}",
    ".kingsen-kop{font-size:13px;font-weight:700;color:var(--ivory-dim);margin:16px 2px 6px}",
    ".kingsen-rij{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.18);border:1.5px solid rgba(243,233,210,.18);margin-bottom:6px;font-size:14px}",
    ".kingsen-rij>span:first-child{min-width:0;flex:1;overflow-wrap:anywhere}",
    ".kingsen-rij small{display:block;color:var(--ivory-dim);font-size:12px;margin-top:2px}",
    ".kingsen-knp{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;flex:none;max-width:56%}",
    ".kingsen-knp .btn{font-size:13px;padding:6px 11px}",
    ".kingsen-lbl{font-size:12px;color:var(--ivory-dim);align-self:center}",
    ".kingsen-regel{display:flex;gap:8px;margin:10px 0;flex-wrap:wrap}",
    ".kingsen-regel input{flex:1 1 180px}",
    ".kingsen-juf{font-size:13px;color:var(--ivory-dim);text-align:center;line-height:1.6;margin:0 0 8px}"
  ].join("\n");
  function css(){ if(document.getElementById("kingsen-css"))return; var s=document.createElement("style"); s.id="kingsen-css"; s.textContent=CSS; document.head.appendChild(s); }
  function namen(){ return A.S.players.map(function(p){ return p.name; }); }
  function leeg(){ return {d:[],a:[],t:[],r:[]}; }
  function sleutel(c){ return c.r===2?(A.isRed(c)?"2r":"2z"):String(c.r); }
  function titel(c){ return c.r===2?(A.isRed(c)?"Rode twee":"Zwarte twee"):NAAM[c.r]; }
  function isJuf(n){ return n%7===0||String(n).indexOf("7")>=0; }

  A.register({ id:"kingsen", title:"Kingsen", level:"hulp", beta:true, sub:"Trekt de kaart, zegt wat hij betekent, telt heren en slokken",
    init:function(root){
      css();
      var G=A.gs("kingsen"), pick=null, sure=false, jufOpen=false;
      root.innerHTML='<div class="kingsen-wrap"></div>'; var box=root.firstChild;

      function fresh(){
        var j; G.v=1; G.left=A.deck(0); G.slots=[]; for(j=0;j<52;j++)G.slots.push(1);
        G.kings=0; G.turn=null; G.tok=[]; G.regels=[]; G.broken=false; G.over=false; G.overNaam=""; G.log=[]; G.n=0; G.seq=0;
        G.names=namen(); G.cur=A.S.active; G.mode=G.mode||"digitaal"; G.vrouw=G.vrouw||{};
      }
      function changed(){ var now=namen(), old=G.names||[]; if(now.length!==old.length)return true; for(var i=0;i<now.length;i++)if(now[i]!==old[i])return true; return false; }
      /* Spelers kunnen tussendoor worden toegevoegd of verwijderd: zet dan alle spelernummers om via de namen.
         Zelfde aantal maar een naam op een andere plek = iemand weg en iemand erbij; alleen een andere naam = hernoemd. */
      function sync(){
        var now=namen(), old=G.names||now, n=now.length, j, schuif=old.length!==n;
        for(j=0;j<n&&!schuif;j++) if(old[j]!==now[j]&&now.indexOf(old[j])>=0) schuif=true;
        G.names=now;
        if(schuif){
          var map=function(i){ return (i>=0&&i<old.length&&now[i]===old[i])?i:(i>=0&&i<old.length?now.indexOf(old[i]):-1); };
          var om=function(lijst){ return (lijst||[]).filter(function(d){ d[0]=map(d[0]); return d[0]>=0; }); };
          G.tok=G.tok.filter(function(f){ f.p=map(f.p); return f.p>=0; });
          var c=map(G.cur); if(c>=0)G.cur=c; /* is de speler aan de beurt weg, dan schuift de volgende vanzelf op deze plek */
          if(G.turn){ var t=G.turn, tp=map(t.p), fx=t.fx||leeg();
            if(tp<0&&!G.over) G.turn=null; /* de trekker is weg: zijn kaart is gespeeld, de volgende trekt */
            else { t.p=tp; t.fx={d:om(fx.d),a:om(fx.a),t:fx.t||[],r:fx.r||[]}; if(t.sel&&!t.done)t.sel=voorkeur(t.c.r); } }
          pick=null;
        }
        if(!(G.cur>=0))G.cur=0; if(n)G.cur%=n; else G.cur=0;
      }
      function log(txt,q){ G.log.unshift({t:txt,q:q}); if(G.log.length>14)G.log.length=14; }
      function meld(msg){ A.toast("Drinken!",msg); A.play("ding"); }
      function boek(i,n){ A.drink(i,n); G.turn.fx.d.push([i,n]); }
      function kaartNaam(t){ return t.man?A.RANKS[t.c.r]+(t.c.r===2?(A.isRed(t.c)?" rood":" zwart"):""):A.cardName(t.c); }
      function klaar(t,msg,kind){ t.done=true; t.msg=msg; t.kind=kind; log(kaartNaam(t)+", "+titel(t.c)+": "+msg,t.q); }
      function fiche(k,p){
        if((k==="snake"||k==="queen")&&G.tok.some(function(f){ return f.k===k&&f.p===p; }))return;
        var id=++G.seq; G.tok.push({id:id,k:k,p:p}); G.turn.fx.t.push(id);
      }
      /* 4 en 6: de app onthoudt per naam wie er de vorige keer dronk, zodat je het maar één keer hoeft aan te tikken */
      function voorkeur(r){ var s={}; A.S.players.forEach(function(p,i){ var v=G.vrouw[p.name]; s[i]=(r===4)?v===true:v===false; }); return s; }

      function pasToe(c,man){
        var x=G.cur, nm=A.name(x), r=c.r, m;
        var t=G.turn={c:c,p:x,q:G.n,man:!!man,fx:leeg(),done:false,msg:"",kind:"neutral",draft:"",slot:-1};
        if(r===2){ if(A.isRed(c)){ boek(x,2); m=nm+" drinkt 2 slokken."; klaar(t,m,"fout"); meld(m); } else t.left=2; }
        else if(r===3) klaar(t,nm+" begint de waterval.","neutral");
        else if(r===4||r===6) t.sel=voorkeur(r);
        else if(r===5){ fiche("snake",x); klaar(t,nm+" is nu Snake eyes.","neutral"); }
        else if(r===8){ fiche("plas",x); klaar(t,nm+" heeft een plaskaart.","neutral"); }
        else if(r===10){ fiche("houding",x); klaar(t,nm+" mag één keer een houding aannemen.","neutral"); }
        else if(r===12){ fiche("queen",x); klaar(t,nm+" is nu Question Queen.","neutral"); }
        else if(r===13){
          G.kings++;
          if(G.kings<4){ klaar(t,nm+" mag het glas in het midden vullen (heer "+G.kings+" van 4).","neutral"); A.play("special");
            /* blijft staan tot een tik: een overlay die vanzelf verdwijnt laat tikken door naar de knoppen eronder */
            A.overlay("win","Heer "+G.kings,[nm+" mag het glas in het midden vullen met wat hij of zij wil.","Wie de vierde heer trekt, drinkt het leeg."],0); A.onOverlayClose(null); }
          else { A.atje(x,1); t.fx.a.push([x,1]); G.over=true; G.overNaam=nm; pick=null;
            klaar(t,nm+" trekt de laatste heer en drinkt het glas in het midden leeg. Het spel is afgelopen.","fout"); A.play("dood");
            /* korte titel: een lang woord past op een telefoon niet in de grote overlayletters */
            A.overlay("dood","Heer 4",["Koningsadtje! "+nm+" drinkt het glas in het midden leeg.","Het spel is afgelopen."],0); A.onOverlayClose(null); }
        }
        /* 1 (regel), 7, 9 en boer wachten op een keuze op het scherm */
      }
      function onthul(c,man){
        var open=[], j, s=-1; for(j=0;j<52;j++)if(G.slots[j])open.push(j);
        if(open.length){ s=open[A.rnd(open.length)-1]; G.slots[s]=0; }
        G.n++; A.play("clack"); pasToe(c,man); G.turn.slot=s;
      }
      /* maakt alles ongedaan wat de kaart van deze beurt heeft geboekt */
      function herstel(){
        var t=G.turn; if(!t)return; var fx=t.fx||leeg();
        fx.d.forEach(function(d){ if(A.S.players[d[0]])A.drink(d[0],-d[1]); });
        fx.a.forEach(function(d){ if(A.S.players[d[0]])A.atje(d[0],-d[1]); });
        G.tok=G.tok.filter(function(f){ return fx.t.indexOf(f.id)<0; });
        G.regels=G.regels.filter(function(g){ return fx.r.indexOf(g.id)<0; });
        if(t.c.r===13){ G.kings=Math.max(0,G.kings-1); G.over=false; }
        G.log=G.log.filter(function(l){ return l.q!==t.q; });
      }

      var ACT={
        ok:function(){},
        trek:function(){ if(G.turn||G.over||!G.left.length)return; onthul(G.left.splice(A.rnd(G.left.length)-1,1)[0],false); },
        rk:function(i,b){
          if(G.turn||G.over)return; var k=b.getAttribute("data-k"), idx=-1;
          G.left.some(function(c,j){ if(sleutel(c)===k){ idx=j; return true; } return false; });
          if(idx>=0) onthul(G.left.splice(idx,1)[0],true);
        },
        deel:function(i){
          var t=G.turn; if(!t||t.done||t.c.r!==2||!(t.left>0)||i===t.p||!A.S.players[i])return;
          boek(i,1); t.left--; t.picked=true;
          if(t.left>0){ meld(A.name(i)+" drinkt een slok, uitgedeeld door "+A.name(t.p)+"."); return; }
          var wie=[]; t.fx.d.forEach(function(d){ if(wie.indexOf(d[0])<0)wie.push(d[0]); });
          var m=(wie.length===1?A.name(wie[0])+" drinkt 2 slokken":A.joinNames(wie)+" drinken elk een slok")+", uitgedeeld door "+A.name(t.p)+".";
          klaar(t,m,"fout"); meld(m);
        },
        sel:function(i){ var t=G.turn; if(!t||t.done||!t.sel||!A.S.players[i])return; t.sel[i]=!t.sel[i]; },
        groep:function(){
          var t=G.turn; if(!t||t.done||(t.c.r!==4&&t.c.r!==6))return; var wie=[];
          A.S.players.forEach(function(p,i){ var on=!!(t.sel&&t.sel[i]); G.vrouw[p.name]=(t.c.r===4)?on:!on; if(on)wie.push(i); });
          wie.forEach(function(i){ boek(i,1); }); t.picked=true;
          var m=!wie.length?"Niemand drinkt.":wie.length===1?A.name(wie[0])+" drinkt een slok.":A.joinNames(wie)+" drinken elk een slok.";
          klaar(t,m,wie.length?"fout":"neutral"); if(wie.length)meld(m);
        },
        fout:function(i){
          var t=G.turn; if(!t||t.done||[7,9,11].indexOf(t.c.r)<0||!A.S.players[i])return;
          boek(i,1); t.picked=true;
          var m=A.name(i)+(t.c.r===7?" telt fout":t.c.r===9?" heeft geen nieuw rijmwoord":" heeft geen nieuw merk")+" en drinkt een slok.";
          klaar(t,m,"fout"); meld(m);
        },
        regel:function(){
          var t=G.turn; if(!t||t.done||t.c.r!==1)return;
          var inp=A.el("kingsen-regel"), tx=String(inp?inp.value:(t.draft||"")).replace(/\s+/g," ").trim(), id=++G.seq;
          G.regels.push({id:id,by:A.name(t.p),t:tx}); t.fx.r.push(id); t.picked=true;
          klaar(t,"Nieuwe regel van "+A.name(t.p)+(tx?": "+tx:" (niet opgeschreven)"),"neutral"); A.play("ding");
        },
        juf:function(){ jufOpen=!jufOpen; },
        volgende:function(){
          var t=G.turn; if(!t||!t.done||G.over)return;
          G.turn=null; jufOpen=false; G.cur=(G.cur+1)%A.S.players.length; /* de beurt gaat met de klok mee */
        },
        opnieuw:function(){ var t=G.turn; if(!t||G.over)return; var c=t.c, s=t.slot, man=t.man, d=t.draft||""; herstel(); pasToe(c,man); G.turn.slot=s; G.turn.draft=d; },
        terug:function(){
          var t=G.turn; if(!t||!t.man)return; herstel(); G.left.push(t.c); if(t.slot>=0)G.slots[t.slot]=1;
          G.n=Math.max(0,G.n-1); G.turn=null; pick=null; jufOpen=false;
        },
        mode:function(i,b){ var m=b.getAttribute("data-m"); if(m==="digitaal"||m==="echt")G.mode=m; },
        pk:function(i,b){
          var k=b.getAttribute("data-k"); if(G.over)return;
          if(LBL[k]&&!G.tok.some(function(f){ return f.k===k&&f.p===i; }))return;
          pick={k:k,p:i};
        },
        pkx:function(){ pick=null; },
        plasuse:function(i){
          var idx=-1; G.tok.some(function(f,j){ if(f.k==="plas"&&f.p===i){ idx=j; return true; } return false; }); if(idx<0)return;
          G.tok.splice(idx,1); var m=A.name(i)+" gebruikt de plaskaart en mag één keer van tafel."; log(m,-1); A.toast("Plaskaart",m); A.play("tick");
        },
        kies:function(i){
          var k=pick; if(!k||!A.S.players[i])return; pick=null;
          var nm=A.name(i), h=A.name(k.p), m, idx=-1;
          if(k.k==="snake"){ if(i===k.p)return; A.drink(i,1); m=nm+" kijkt "+h+" in de ogen en drinkt een slok."; meld(m); }
          else if(k.k==="queen"){ A.drink(i,1); m=(i===k.p?nm+" beantwoordt als Question Queen zelf een vraag":nm+" beantwoordt een vraag van "+h)+" en drinkt een slok."; meld(m); }
          else if(k.k==="houding"||k.k==="plas"){
            if(i===k.p)return; G.tok.some(function(f,j){ if(f.k===k.k&&f.p===k.p){ idx=j; return true; } return false; }); if(idx<0)return;
            if(k.k==="houding"){ G.tok.splice(idx,1); A.drink(i,1); m=nm+" neemt de houding van "+h+" als laatste aan en drinkt een slok."; meld(m); }
            else { G.tok[idx].p=i; m=h+" verkoopt de plaskaart aan "+nm+"."; A.toast("Plaskaart",m); A.play("tick"); }
          }
          else if(k.k==="kring"){
            if(G.broken)return; G.broken=true; A.atje(i,1); m=nm+" verbreekt de cirkel en trekt een adtje."; A.play("dood");
            A.overlay("dood","Adtje!",[nm+" verbreekt de cirkel en trekt een adtje.","Daarna maakt het niet meer uit of de cirkel nog eens breekt."],0); A.onOverlayClose(null);
          }
          else if(k.k==="slok"){ A.drink(i,1); m=nm+" overtreedt een regel en drinkt een slok."; meld(m); }
          else return;
          log(m,-1);
        },
        nieuw:function(){ if(G.n>0&&!G.over&&!sure){ sure=true; return; } sure=false; pick=null; jufOpen=false; fresh(); }
      };

      function wie(list,act,sel){
        return '<div class="kingsen-wie">'+list.map(function(i){ return '<button class="btn" data-a="'+act+'" data-i="'+i+'"'+(sel?' aria-pressed="'+!!sel[i]+'"':'')+'>'+esc(A.name(i))+'</button>'; }).join("")+'</div>';
      }
      function allen(){ return A.S.players.map(function(p,i){ return i; }); }
      function ringHtml(){
        var h='<div class="kingsen-ring" aria-hidden="true">', j;
        for(j=0;j<52;j++) if(G.slots[j]) h+='<i style="transform:rotate('+(j*360/52).toFixed(1)+'deg) translateY(-82px)"></i>';
        /* het glas op het scherm laat alleen zien hoeveel heren er al zijn getrokken; het echte glas staat op tafel */
        return h+'<span class="kingsen-glas"><b style="height:'+(G.kings>=4?0:Math.round(G.kings/3*88))+'%"></b></span></div>';
      }
      function uitleg(t){
        var c=t.c, b='<b>'+esc(G.over&&c.r===13&&G.overNaam?G.overNaam:A.name(t.p))+'</b>';
        switch(c.r){
          case 1: return b+' bedenkt een regel die de rest van het spel blijft gelden.';
          case 2: return A.isRed(c)?'Een rode twee: '+b+' moet twee slokken drinken.':'Een zwarte twee: '+b+' mag twee slokken uitdelen.';
          case 3: return 'Iedereen zet het glas aan de mond. Begint '+b+' te drinken, dan drinkt iedereen. '+b+' beslist wanneer hij of zij ophoudt; de rest drinkt door. Daarna mag de speler links ophouden, enzovoort.';
          case 4: return 'De vrouwen nemen een slok.';
          case 5: return b+' mag niet in de ogen worden aangekeken. Wie dat toch doet, drinkt een slok.';
          case 6: return 'De mannen nemen een slok.';
          case 7: return 'Er wordt geteld. Getallen met een 7 erin (7, 17, 27) en meervouden van 7 (7, 14, 21) zeg je niet: zeg iets willekeurigs of ‘Juf’. Wie als eerste een fout maakt, drinkt een slok.';
          case 8: return b+' mag met deze kaart één keer de tafel verlaten. Hint: je kunt de kaart ook verkopen.';
          case 9: return b+' zegt een zin. De volgende spelers zeggen een zin die daarop rijmt. Wie geen rijmwoord meer weet of een al gebruikt rijmwoord noemt, drinkt een slok.';
          case 10: return b+' mag één keer in het spel een houding aannemen. Wie die houding dan als laatste aanneemt, drinkt een slok.';
          case 11: return b+' noemt een productsoort (bijvoorbeeld bier) en begint met het eerste merk. Wie als eerste geen merk meer weet of een al gebruikt merk noemt, drinkt een slok.';
          case 12: return 'Niemand mag een vraag van '+b+' beantwoorden; wie dat wel doet, drinkt een slok. Een wedervraag mag. Beantwoordt '+b+' zelf een vraag, dan drinkt '+b+'.';
          case 13: return G.kings>=4?b+' trekt de laatste heer en moet het glas in het midden leegdrinken. Het spel is afgelopen.':'Heer '+G.kings+' van 4: '+b+' mag het glas in het midden vullen met wat hij of zij wil. Wie de laatste heer trekt, drinkt het leeg.';
        }
        return '';
      }
      function kaartHtml(t){
        var c=t.c, k;
        /* bij een echte kaart weet de app alleen de waarde (en bij de twee de kleur), dus geen verzonnen kaartsoort */
        if(t.man) k='<span class="card big'+(c.r===2&&A.isRed(c)?' red':'')+'"><b>'+A.RANKS[c.r]+'</b>'+(c.r===2?'<i>'+(A.isRed(c)?'♥♦':'♠♣')+'</i>':'')+'</span>';
        else k=A.cardHtml(c,"big");
        return '<div class="kingsen-kaart">'+k+'<div class="kingsen-uitleg"><h3>'+esc(titel(c))+'</h3><p>'+uitleg(t)+'</p></div></div>';
      }
      function trekHtml(){
        var h='<p class="hint"><b>'+esc(A.name(G.cur))+'</b> is aan de beurt en trekt een kaart uit de cirkel.</p>';
        if(G.mode==="echt"){
          var cnt={}; G.left.forEach(function(c){ var k=sleutel(c); cnt[k]=(cnt[k]||0)+1; });
          h+='<p class="hint" style="padding-top:0">Tik aan welke kaart er is getrokken.</p><div class="kingsen-grid">'+
            ["2z","2r","3","4","5","6","7","8","9","10","11","12","13","1"].map(function(k){
              var r=parseInt(k,10), n=cnt[k]||0, kleur=k==="2z"?"zwart":k==="2r"?"rood":"";
              return '<button data-a="rk" data-k="'+k+'"'+(k==="2r"?' class="kingsen-rood"':'')+(n?'':' disabled')+' aria-label="'+A.RANKS[r]+(kleur?' '+kleur:'')+', nog '+n+'"><span>'+A.RANKS[r]+'</span><small>'+(kleur?kleur+' '+n+'x':'nog '+n)+'</small></button>';
            }).join("")+'</div>';
        } else h+='<button class="kingsen-trek" data-a="trek"'+(G.left.length?'':' disabled')+'>Trek een kaart</button>';
        return h;
      }
      function beurtHtml(t){
        var x=t.p, r=t.c.r, n=A.S.players.length, h="", j;
        if(t.msg) h+='<div class="verdict '+(t.kind||"neutral")+' kingsen-res"><p>'+esc(t.msg)+'</p></div>';
        if(r===3){ var vol=[]; for(j=0;j<n;j++)vol.push(A.name((x+j)%n));
          h+='<p class="hint">Volgorde van ophouden: '+esc(vol.join(" → "))+'.<br>De app telt deze slokken niet: niemand weet hoeveel het er worden.</p>'; }
        if(r===13) h+='<p class="hint">Het glas in het midden is echt: vul het zelf, de app telt alleen de heren.</p>';
        if(!t.done){
          if(r===2) h+='<p class="hint">Tik wie een slok krijgt. Nog <b>'+t.left+'</b> uit te delen.</p>'+wie(A.others(x),"deel");
          else if(r===4||r===6) h+='<p class="hint">Tik '+(r===4?'de vrouwen':'de mannen')+' aan en tik dan op Laat drinken. De app onthoudt wie het zijn.</p>'+wie(allen(),"sel",t.sel)+'<div class="btnrow"><button class="btn gold" data-a="groep">Laat drinken</button></div>';
          else if(r===7||r===9||r===11){
            h+='<p class="hint">Speel het aan tafel. Wie maakt als eerste een fout? Tik de naam aan: die drinkt een slok.</p>'+wie(allen(),"fout");
            if(r===7){ h+='<div class="btnrow"><button class="btn" data-a="juf" aria-pressed="'+jufOpen+'">Spiekbriefje voor de scheidsrechter</button></div>';
              if(jufOpen){ var jl=[]; for(j=1;j<=100;j++)if(isJuf(j))jl.push(j); h+='<p class="kingsen-juf">Juf tot 100: '+jl.join(", ")+'</p>'; } }
          }
          else if(r===1) h+='<p class="hint">Typ de regel van '+esc(A.name(x))+' (mag leeg) en tik op Regel vastleggen.</p><div class="kingsen-regel"><input class="txt" id="kingsen-regel" type="text" maxlength="120" autocomplete="off" placeholder="Schrijf de regel op (mag leeg)" value="'+esc(t.draft||"")+'"><button class="btn gold" data-a="regel">Regel vastleggen</button></div>';
        }
        if(t.done&&!G.over){
          if(r===5||r===8||r===10||r===12) h+='<p class="hint">Dit staat nu onder ‘Geldt de rest van het spel’: tik daar aan als het gebeurt. Tik nu op Volgende.</p>';
          else h+='<p class="hint">Klaar? Tik op Volgende, dan trekt <b>'+esc(A.name((G.cur+1)%n))+'</b> een kaart.</p>';
        }
        h+='<div class="btnrow">';
        if(t.done) h+='<button class="btn gold" data-a="volgende">Volgende: '+esc(A.name((G.cur+1)%n))+'</button>';
        if(t.picked) h+='<button class="btn" data-a="opnieuw">Opnieuw invullen</button>';
        if(t.man) h+='<button class="btn" data-a="terug">Verkeerde kaart</button>';
        return h+'</div>';
      }
      function overHtml(){
        return '<div class="verdict fout"><h2>Koningsadtje</h2><p><b>'+esc(G.overNaam||"?")+'</b> trok de laatste heer en drinkt het glas in het midden leeg. Het spel is afgelopen.</p><div class="btnrow"><button class="btn gold" data-a="nieuw">Nieuw spel</button>'+
          (G.turn&&G.turn.man?'<button class="btn" data-a="terug">Verkeerde kaart</button>':'')+'</div></div>';
      }
      function pickHtml(){
        var k=pick.k, nm=A.name(pick.p), lijst=(k==="snake"||k==="houding"||k==="plas")?A.others(pick.p):allen(), v;
        if(k==="snake") v="Wie keek "+nm+" in de ogen? Die drinkt een slok.";
        else if(k==="queen") v="Wie beantwoordde een vraag? Die drinkt een slok. Tik "+nm+" als de Question Queen zelf antwoord gaf.";
        else if(k==="houding") v=nm+" neemt de houding aan. Wie deed het als laatste na? Die drinkt een slok.";
        else if(k==="plas") v="Aan wie verkoopt "+nm+" de plaskaart?";
        else if(k==="kring") v="Wie verbrak de cirkel? Die trekt een adtje.";
        else v="Wie overtrad een regel? Die drinkt een slok.";
        return '<div class="verdict neutral" id="kingsen-pick"><p><b>'+esc(v)+'</b></p>'+wie(lijst,"kies")+'<div class="btnrow"><button class="btn" data-a="pkx">Annuleren</button></div></div>';
      }
      function statusHtml(){
        if(G.over) return "";
        var rows="";
        ["snake","queen","plas","houding"].forEach(function(k){
          var gezien={};
          G.tok.forEach(function(f){
            if(f.k!==k||gezien[f.p]||!A.S.players[f.p])return; gezien[f.p]=1;
            var cnt=G.tok.filter(function(g){ return g.k===k&&g.p===f.p; }).length, d='data-k="'+k+'" data-i="'+f.p+'"';
            rows+='<div class="kingsen-rij"><span><b>'+LBL[k]+':</b> '+esc(A.name(f.p))+(cnt>1?' ('+cnt+'x)':'')+'<small>'+SUB[k]+'</small></span><span class="kingsen-knp">'+
              (k==="plas"?'<button class="btn" data-a="plasuse" '+d+'>Gebruikt</button><button class="btn" data-a="pk" '+d+'>Verkocht</button>':'<button class="btn" data-a="pk" '+d+'>'+KNOP[k]+'</button>')+'</span></div>';
          });
        });
        G.regels.forEach(function(g,j){ rows+='<div class="kingsen-rij"><span><b>Regel '+(j+1)+' van '+esc(g.by)+':</b> '+(g.t?esc(g.t):'<i>niet opgeschreven</i>')+'</span></div>'; });
        if(G.regels.length) rows+='<div class="btnrow"><button class="btn" data-a="pk" data-k="slok" data-i="-1">Regel overtreden: slok boeken</button></div>';
        return (pick?pickHtml():"")+(rows?'<p class="kingsen-kop">Geldt de rest van het spel</p>'+rows:"");
      }
      function render(){
        sync();
        var n=A.S.players.length, t=G.turn, h;
        if(n&&A.S.active!==G.cur){ A.S.active=G.cur; A.save(); A.renderPlayers(); }
        if(n<2){ box.innerHTML='<p class="hint">Kingsen speel je met minstens twee spelers: je deelt slokken uit en de beurt gaat de kring rond. Voeg hierboven een speler toe.</p><div class="btnrow"><button class="btn gold" data-a="ok">Verder</button></div>'; return; }
        h='<div class="board">'+(t?kaartHtml(t):ringHtml())+'<div class="stat"><span>Kaarten over: <b>'+G.left.length+'</b></span><span>Heren: <b>'+G.kings+'</b> van 4</span>'+(G.mode==="echt"?'<span>Cirkel: <b>'+(G.broken?"verbroken":"heel")+'</b></span>':'')+'</div></div>';
        h+=G.over?overHtml():t?beurtHtml(t):trekHtml();
        h+=statusHtml();
        h+='<div class="seg" style="margin-top:14px"><span class="kingsen-lbl">Kaarten:</span><button data-a="mode" data-m="digitaal" aria-pressed="'+(G.mode==="digitaal")+'">digitaal</button><button data-a="mode" data-m="echt" aria-pressed="'+(G.mode==="echt")+'">echte kaarten</button></div>';
        h+='<p class="hint" style="padding-top:0">'+(G.mode==="echt"?'Leg de kaarten in een cirkel om het glas en trek er om de beurt een. De app zegt wat de kaart betekent en houdt de stand bij.':'De app is de stapel. Het glas in het midden blijft echt. Een cirkel om te verbreken is er zo niet: kies daarvoor echte kaarten.')+'</p>';
        h+='<div class="btnrow">'+(G.mode==="echt"&&!G.broken&&!G.over?'<button class="btn danger" data-a="pk" data-k="kring" data-i="-1">Cirkel verbroken</button>':'')+(G.over?'':'<button class="btn" data-a="nieuw">'+(sure?"Zeker weten? Tik nog eens":"Nieuw spel")+'</button>')+'</div>'; /* na afloop staat Nieuw spel al bovenaan */
        if(G.log.length) h+='<div class="log">'+G.log.map(function(l){ return '<div>'+esc(l.t)+'</div>'; }).join("")+'</div>';
        box.innerHTML=h;
        var pp=A.el("kingsen-pick"); if(pp&&pp.scrollIntoView)pp.scrollIntoView({block:"nearest"});
      }

      box.addEventListener("click",function(e){
        var b=e.target&&e.target.closest?e.target.closest("[data-a]"):null; if(!b||b.disabled)return;
        if(changed()){ render(); return; } /* spelerslijst is veranderd: eerst opnieuw tekenen, de knop kan naar de verkeerde speler wijzen */
        var a=b.getAttribute("data-a"); if(!ACT[a])return; if(a!=="nieuw")sure=false;
        ACT[a](+b.getAttribute("data-i"),b); A.save(); render();
      });
      box.addEventListener("input",function(e){ if(e.target&&e.target.id==="kingsen-regel"&&G.turn)G.turn.draft=e.target.value; });
      box.addEventListener("keydown",function(e){ if(e.key==="Enter"&&e.target&&e.target.id==="kingsen-regel"&&!changed()){ ACT.regel(); A.save(); render(); } });

      /* een bewaard spel van een oudere versie of met een kapot onderdeel: begin schoon */
      var isA=Array.isArray;
      if(G.v!==1||!isA(G.left)||!isA(G.slots)||G.slots.length!==52||!isA(G.tok)||!isA(G.regels)||!isA(G.log)||!(G.kings>=0)||!(G.n>=0)||!G.vrouw||typeof G.vrouw!=="object"||
         (G.turn&&(!G.turn.c||!(G.turn.c.r>=1)||!G.turn.fx))||(!G.over&&!G.turn&&!G.left.length)) fresh();
      else if(G.n===0&&!G.turn) G.cur=A.S.active;
      if(G.mode!=="echt")G.mode="digitaal";
      A.save(); render();
      this.refresh=render;
      /* eerst de spelernummers bijwerken (er kan net iemand zijn toegevoegd of verwijderd), dan pas de beurt verzetten */
      this.onPlayer=function(i){ sync(); if((!G.turn||G.over)&&A.S.players.length>=2&&A.S.players[i]){ G.cur=i; A.save(); } render(); };
    }
  });
})();
