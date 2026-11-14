/* ===== Streepjesspel ===== */
(function(){
  "use strict";
  var A=App, el=A.el, esc=A.esc;
  var ID="streepjesspel", P="streepjesspel-";
  var OGEN=["","enen","tweeën","drieën","vieren","vijven","zessen"];

  if(!document.getElementById(P+"css")){
    var css=document.createElement("style"); css.id=P+"css";
    css.textContent=[
      "."+P+"dice .dice{display:grid;grid-template-columns:repeat(3,1fr);gap:12px 8px;justify-items:center;max-width:320px;margin:14px auto 8px}",
      "."+P+"dice .keep{min-height:40px;min-width:92px;font-size:13px;padding:6px 10px}",
      "."+P+"wait .keep[aria-pressed=\"false\"]{display:none}",
      "."+P+"play .btn{min-height:40px}",
      "."+P+"play .hint b{color:var(--ivory)}",
      "."+P+"score{margin-top:14px}",
      "."+P+"score .btn{min-height:40px;padding:6px 14px;font-size:13px;white-space:nowrap}",
      "."+P+"score td b{font-size:18px}",
      "."+P+"score td:first-child{word-break:break-word}",
      "."+P+"over{display:block;font-size:11px;color:#ffb3a6}",
      "."+P+"opts .seg button{min-height:40px}",
      "."+P+"lbl{font-size:12px;color:var(--ivory-dim);align-self:center}",
      "."+P+"ov{margin-top:14px;text-align:center}"
    ].join("");
    document.head.appendChild(css);
  }

  function nulls(){ return [null,null,null,null,null,null]; }
  function falses(){ return [false,false,false,false,false,false]; }
  function count(mask){ var c=0; for(var i=0;i<mask.length;i++) if(mask[i]) c++; return c; }
  function sum(vals,mask){ var s=0; for(var i=0;i<vals.length;i++) if(!mask||mask[i]) s+=vals[i]||0; return s; }
  function strepen(x){ return x+" "+(x===1?"streep":"strepen"); }
  function stenen(x){ return x+" "+(x===1?"steen":"stenen"); }

  A.register({ id:ID, beta:true, title:"Streepjesspel", level:"app", sub:"Zes stenen wegleggen, sparen, strepen bijhouden en per 5 wegwerken",
    init:function(root){
      var G=A.gs(ID), dice=null, busy=false, dead=false, sure=false, gen=0;
      if(!Array.isArray(G.str)) G.str=[];
      if(!Array.isArray(G.log)) G.log=[];

      function n(){ return A.S.players.length; }
      /* Variërende regel 3: grens 15 en dan 10 erbij, in plaats van grens 10 en 15 erbij. */
      function limit(){ return G.ruim?15:10; }
      function pen(){ return G.ruim?10:15; }
      /* "De speler voor jou" lezen we als de speler die vlak voor jou aan de beurt was (de beurt schuift naar links,
         dus dat is je rechterbuur): de vorige in de spelersrij. */
      function prev(){ return (G.cur-1+n())%n(); }
      function log(s){ G.log.unshift(s); if(G.log.length>8) G.log.length=8; }
      function okTurn(t){ return !!t&&(t.ph==="check"||t.ph==="gooi"||t.ph==="spaar")&&Array.isArray(t.vals)&&t.vals.length===6&&Array.isArray(t.locked)&&t.locked.length===6&&Array.isArray(t.sel)&&t.sel.length===6&&Array.isArray(t.before)&&t.before.length===6; }
      function started(t){ return t.ph==="spaar"||t.rolls>0||!!t.pen||t.vals.some(function(v){return v!==null;}); }
      function rosterChanged(){ return (G.names||[]).length!==n(); }
      function startTurn(){ G.t={ph:(G.str[G.cur]||0)>limit()?"check":"gooi", vals:nulls(), locked:falses(), sel:falses(), before:falses(), rolls:0, wait:true, d:0, pen:false}; }

      /* Houdt de strepenlijst gelijk met de spelersbalk (speler erbij of eraf). Geeft true als de beurt opnieuw is begonnen. */
      function sync(){
        var now=A.S.players.map(function(q){return q.name;}), old=G.names||[], reset=false, i;
        if(old.length&&old.length!==now.length){
          var used={}, ns=[];
          now.forEach(function(nm){ var j=-1; for(var k=0;k<old.length;k++) if(old[k]===nm&&!used[k]){ j=k; break; } if(j>=0){ used[j]=1; ns.push(G.str[j]||0); } else ns.push(0); });
          G.str=ns; reset=true;
        }
        for(i=0;i<now.length;i++) if(typeof G.str[i]!=="number") G.str[i]=0;
        G.str.length=now.length; G.names=now;
        if(typeof G.cur!=="number"||G.cur<0||G.cur>=now.length) reset=true;
        if(reset||!okTurn(G.t)){ G.cur=A.S.active<now.length?A.S.active:0; startTurn(); reset=true; }
        if(A.S.active!==G.cur){ A.S.active=G.cur; A.renderPlayers(); }
        if(reset) A.save();
        return reset;
      }

      /* Sparen: voor elke extra goede steen verdubbelt het aantal (4 x 2 x 2 x 2); variërende regel 1 telt op (4 + 4 + 4 + 4). */
      function spaarStrepen(d,k){ return k?(G.add?d*k:d*Math.pow(2,k-1)):0; }
      function som(d,k){ var a=[], i; if(G.add){ for(i=0;i<k;i++) a.push(d); return a.join(" + "); } a.push(d); for(i=1;i<k;i++) a.push("2"); return a.join(" × "); }
      /* Het sparen stopt zodra een worp geen goede steen bevat. Liggen alle zes de stenen, dan stopt het ook: de bijbel
         zegt niets over opnieuw oppakken. Variërende regel 2 lezen we als precies drie worpen, raak of niet. */
      function spDone(t){ if(t.wait) return false; var k=count(t.locked); if(k===6) return true; if(G.drie) return t.rolls>=3; return k===count(t.before); }

      function show(kind,title,lines,vals){ A.overlay(kind,title,lines,0,vals?'<div class="'+P+'ov">'+A.dicerowSmall(vals)+'</div>':""); A.onOverlayClose(null); }

      /* "Tussen de 10 en de 30": 11 tot en met 30, het verschil met 30 in strepen. Precies 30 is dus 0 strepen;
         precies 10 is de genoemde uitzondering (niemand krijgt iets). */
      function uitkomst(tot,c,p){
        if(tot>30) return A.name(p)+" krijgt "+strepen(tot-30)+" en "+A.name(c)+" gaat "+OGEN[tot-30]+" sparen.";
        if(tot===30) return "Precies 30: geen strepen.";
        if(tot>10) return A.name(c)+" krijgt "+strepen(30-tot)+" erbij (30 − "+tot+").";
        if(tot===10) return "Precies 10: "+A.name(c)+" krijgt niets en de anderen ook niet.";
        return "Onder de 10: iedereen behalve "+A.name(c)+" krijgt 10 strepen.";
      }

      function advance(){ G.cur=(G.cur+1)%n(); A.S.active=G.cur; startTurn(); A.save(); A.renderPlayers(); render(); }

      /* ---- dobbelstenen ---- */
      function onRoll(v,digital){
        var t=G.t, i, hadHits;
        busy=false;
        if(t.ph==="gooi"){
          if(digital||t.wait){
            if(!t.wait){ /* digitale worp direct na het kiezen: de gekozen stenen liggen nu vast */
              if(count(t.sel)<=count(t.locked)||count(t.sel)===6){ renderPlay(); return; }
              t.locked=t.sel.slice();
            }
            for(i=0;i<6;i++) if(t.locked[i]) v[i]=t.vals[i];
            t.vals=v; t.rolls++; t.wait=false; t.sel=t.locked.slice();
            if(count(t.locked)===5) t.sel=[true,true,true,true,true,true]; /* de laatste steen moet je wel wegleggen */
          } else { /* een steen van de laatste worp verbeterd via de kiezer */
            for(i=0;i<6;i++) if(t.locked[i]) v[i]=t.vals[i];
            t.vals=v;
          }
        } else if(t.ph==="spaar"){
          if(digital||t.wait){
            if(!t.wait&&spDone(t)){ renderPlay(); return; }
            t.before=t.locked.slice(); t.rolls++; t.wait=false;
          }
          for(i=0;i<6;i++) if(t.before[i]) v[i]=t.d;
          t.vals=v; t.locked=v.map(function(x,j){ return t.before[j]||x===t.d; });
          hadHits=count(t.locked)>count(t.before);
          if(hadHits) A.play("ding");
        } else return;
        A.save(); renderPlay();
      }
      function onChange(v){ /* halve handmatige invoer bewaren; een complete worp komt via onRoll */
        var t=G.t, i, bad=false;
        if(t.ph==="check"||!t.wait) return;
        if(v.every(function(x){return x!==null;})) return;
        for(i=0;i<6;i++) if(t.locked[i]&&v[i]!==t.vals[i]){ v[i]=t.vals[i]; bad=true; }
        t.vals=v; A.save();
        if(bad&&dice){ dice.set(v); dice.setKept(t.locked); }
      }
      function onKeep(k){
        var t=G.t, i;
        if(busy||t.ph!=="gooi"||t.wait){ if(dice) dice.setKept(t.ph==="gooi"&&!t.wait?t.sel:t.locked); return; }
        for(i=0;i<6;i++) if(t.locked[i]||count(t.locked)===5) k[i]=true; /* weggelegd blijft weggelegd */
        t.sel=k; A.save(); renderPlay();
      }
      function manual(){ /* echte stenen: leg weg, daarna de nieuwe worp invullen */
        var t=G.t, i;
        if(busy||t.wait) return;
        if(t.ph==="gooi"){ if(count(t.sel)<=count(t.locked)||count(t.sel)===6) return; t.locked=t.sel.slice(); }
        else if(t.ph==="spaar"){ if(spDone(t)) return; }
        else return;
        for(i=0;i<6;i++) if(!t.locked[i]) t.vals[i]=null;
        t.sel=t.locked.slice(); t.wait=true; A.save(); renderPlay();
      }

      /* ---- boeken ---- */
      function weg(i){ /* strepen wegwerken mag alleen per 5; één streep is één slok */
        if(sync()){ render(); return; }
        if((G.str[i]||0)<5) return;
        var wasCheck=G.t.ph==="check";
        G.str[i]-=5; A.drink(i,5);
        log(A.name(i)+" drinkt 5 slokken en werkt 5 strepen weg (nog "+G.str[i]+").");
        A.play("tick"); A.toast(A.name(i)+" drinkt 5 slokken","5 strepen weggewerkt, nog "+strepen(G.str[i])+" open.",3200);
        A.save(); renderScore(); renderLog(); if(wasCheck) renderPlay();
      }
      function straf(){
        if(sync()){ render(); return; }
        var t=G.t, c=G.cur, q=pen();
        if(t.ph!=="check") return;
        G.str[c]+=q; t.ph="gooi"; t.pen=true;
        log(A.name(c)+" is aan de beurt met meer dan "+limit()+" strepen: "+q+" erbij (nu "+G.str[c]+").");
        A.save(); render(); A.play("dood");
        A.overlay("dood","+"+q,[A.name(c)+" zat boven de "+limit()+" strepen en krijgt er "+q+" bij."],2600);
      }
      function bookMain(){
        if(busy) return;
        if(sync()){ render(); return; }
        var t=G.t;
        if(t.ph!=="gooi"||t.wait||count(t.sel)!==6) return;
        var c=G.cur, p=prev(), tot=sum(t.vals,null), nm=A.name(c), pn=A.name(p), vals=t.vals.slice(), d, k;
        if(tot>30){
          d=tot-30; G.str[p]+=d;
          log(nm+" gooit "+tot+": "+pn+" krijgt "+strepen(d)+", "+nm+" gaat "+OGEN[d]+" sparen.");
          G.t={ph:"spaar", vals:nulls(), locked:falses(), sel:falses(), before:falses(), rolls:0, wait:true, d:d, pen:false};
          A.save(); render(); A.play("win");
          show("win",tot+"!",[pn+" krijgt alvast "+strepen(d)+".",nm+" pakt alle zes de stenen en spaart "+OGEN[d]+" voor "+pn+"."],vals);
          return;
        }
        if(tot<10){
          A.others(c).forEach(function(j){ G.str[j]+=10; });
          log(nm+" gooit "+tot+", onder de 10: iedereen behalve "+nm+" krijgt 10 strepen.");
          advance(); A.play("win");
          show("win","Onder 10!",[nm+" gooit "+tot+" ogen.",A.joinNames(A.others(c))+(n()>2?" krijgen elk":" krijgt")+" 10 strepen erbij."],vals);
          return;
        }
        if(tot===10||tot===30){
          log(nm+" gooit precies "+tot+": geen strepen.");
          advance(); A.play("ding");
          show("info","Precies "+tot,[tot===10?nm+" hoeft niet te drinken, en de anderen krijgen geen 10 strepen.":nm+" krijgt geen strepen (30 − 30)."],vals);
          return;
        }
        k=30-tot; G.str[c]+=k;
        log(nm+" gooit "+tot+": "+strepen(k)+" erbij (nu "+G.str[c]+").");
        advance(); A.play("dood");
        show("dood","+"+k,[nm+" gooit "+tot+" ogen en krijgt "+strepen(k)+" erbij (30 − "+tot+")."],vals);
      }
      function bookSpaar(){
        if(busy) return;
        if(sync()){ render(); return; }
        var t=G.t;
        if(t.ph!=="spaar"||!spDone(t)) return;
        var c=G.cur, p=prev(), d=t.d, k=count(t.locked), s=spaarStrepen(d,k), vals=t.vals.slice(), nm=A.name(c), pn=A.name(p);
        G.str[p]+=s;
        log(s?nm+" spaart "+k+" × "+d+": "+pn+" krijgt "+strepen(s)+" erbij (nu "+G.str[p]+").":nm+" spaart geen enkele "+d+": "+pn+" houdt het bij de eerste "+strepen(d)+".");
        advance();
        if(s){ A.play("win"); show("win","+"+s,[pn+" krijgt "+strepen(s)+" erbij: "+k+" × "+d+" gespaard"+(k>1?" ("+som(d,k)+")":"")+".","Met de eerste "+d+" erbij is dat "+(s+d)+"."],vals); }
        else { A.play("ding"); show("info","Niets",[nm+" gooit geen "+d+".",pn+" houdt het bij de eerste "+strepen(d)+"."],vals); }
      }

      /* ---- tekenen ---- */
      function renderPlay(){
        var box=el(P+"play"); if(!box||dead) return;
        var t=G.t, c=G.cur, p=prev(), nm=esc(A.name(c)), pn=esc(A.name(p)), h="", gooi, lbl="", lock=false;
        var nLocked, nSel, rest, all, ok, tot, k, m, d, klaar, s, my;
        dice=null; busy=false; my=++gen;
        if(t.ph==="check"&&G.str[c]<=limit()){ t.ph="gooi"; A.save(); }
        if(t.ph==="check"){
          /* De controle hoort bij het begin van de beurt. De app kan niet zien of er al gedronken is, dus de speler
             boekt hier wat al is weggewerkt, of neemt de straf. */
          h='<div class="verdict fout"><h2>Te veel strepen</h2><p><b>'+nm+'</b> is aan de beurt met <b>'+strepen(G.str[c])+'</b>; dat mogen er hooguit '+limit()+' zijn. Al weggewerkt? Boek het hier, per 5 (één streep is één slok). Anders komen er '+pen()+' strepen bij.</p>'+
            '<div class="btnrow"><button class="btn gold" id="'+P+'ck5">'+nm+' drinkt 5 weg</button><button class="btn danger" id="'+P+'ckpen">'+pen()+' strepen erbij</button></div></div>';
          box.innerHTML=h;
          el(P+"ck5").onclick=function(){ weg(G.cur); };
          el(P+"ckpen").onclick=straf;
          return;
        }
        gooi=t.ph==="gooi";
        if(gooi){
          nLocked=count(t.locked); nSel=count(t.sel); all=nSel===6; ok=nSel>nLocked; rest=6-(t.wait?nLocked:nSel);
          h='<p class="hint"><b>'+nm+'</b> is aan de beurt · worp '+(t.wait?t.rolls+1:t.rolls)+' van hooguit 6</p>';
          h+='<div class="'+P+'dice'+(t.wait?' '+P+'wait':'')+'" id="'+P+'dice"></div>';
          if(t.wait){
            h+='<p class="hint">'+(t.rolls?'Weggelegd: '+stenen(nLocked)+', samen '+sum(t.vals,t.locked)+' ogen. Gooi de overige '+rest+', of tik de vraagtekens aan om een echte worp in te vullen.':'Gooi alle zes de stenen, of tik de vraagtekens aan om een echte worp in te vullen. Doel: boven de 30 of onder de 10 ogen.')+'</p>';
            lbl=t.rolls?"Gooi de overige "+rest:"Gooi zes stenen";
          } else if(!all){
            h+='<div class="stat"><span>Weggelegd: <b>'+stenen(nSel)+'</b>, <b>'+sum(t.vals,t.sel)+'</b> ogen</span>'+(ok?'<span>Kan nog worden: <b>'+(sum(t.vals,t.sel)+rest)+' tot '+(sum(t.vals,t.sel)+rest*6)+'</b></span>':'')+'</div>';
            h+='<p class="hint">'+(ok?'Gooi de rest, of leg nog meer stenen weg.':'Leg minimaal één steen van deze worp weg: tik op “laat liggen”.')+' Wat eerder is weggelegd blijft liggen.</p>';
            h+='<div class="btnrow"><button class="btn" id="'+P+'manual"'+(ok?'':' disabled')+'>Zelf gooien: echte worp invullen</button></div>';
            lbl="Gooi de rest ("+rest+")"; lock=!ok;
          } else {
            tot=sum(t.vals,null);
            h+='<div class="verdict neutral"><h2>'+tot+' ogen</h2><p>'+esc(uitkomst(tot,c,p))+'</p><div class="btnrow"><button class="btn gold" id="'+P+'done">Boeken</button></div></div>';
            if(nLocked<5) h+='<p class="hint">Toch nog gooien? Tik “vast” uit bij een steen van deze worp.</p>';
            lbl="Alles ligt weg"; lock=true;
          }
        } else {
          d=t.d; k=count(t.locked); m=k-count(t.before); klaar=spDone(t); s=spaarStrepen(d,k); rest=6-k;
          h='<p class="hint"><b>'+nm+'</b> spaart <b>'+OGEN[d]+'</b> voor <b>'+pn+'</b> · worp '+(t.wait?t.rolls+1:t.rolls)+(G.drie?' van 3':'')+'</p>';
          h+='<div class="'+P+'dice" id="'+P+'dice"></div>';
          h+='<div class="stat"><span>Gespaard: <b>'+k+' × '+d+'</b></span><span>Voor '+pn+': <b>'+strepen(s)+'</b>'+(k>1?' ('+som(d,k)+')':'')+'</span></div>';
          if(klaar){
            h+='<div class="verdict '+(s?'win':'neutral')+'"><h2>'+(s?'+'+s:'Niets gespaard')+'</h2><p>'+(k===6?'Alle zes de stenen liggen.':(G.drie?'Drie worpen gehad.':'Geen '+d+' in deze worp, het sparen stopt.'))+' '+
              (s?pn+' krijgt '+strepen(s)+' erbij, bovenop de eerste '+d+'.':pn+' houdt het bij de eerste '+strepen(d)+'.')+'</p><div class="btnrow"><button class="btn gold" id="'+P+'spdone">Boeken en volgende speler</button></div></div>';
            lock=true;
          } else if(t.wait){
            h+='<p class="hint">'+(t.rolls?'Gooi de overige '+rest+', of tik de vraagtekens aan om een echte worp in te vullen.':'Gooi alle zes de stenen, of tik de vraagtekens aan om een echte worp in te vullen. Elke '+d+' blijft liggen en telt voor '+pn+'.')+'</p>';
          } else {
            h+='<p class="hint">'+(m?m+' × '+d+' erbij.':'Geen '+d+' in deze worp.')+' Gooi de overige '+rest+' opnieuw.</p><div class="btnrow"><button class="btn" id="'+P+'manual">Zelf gooien: echte worp invullen</button></div>';
          }
          lbl=rest<6?"Gooi de overige "+rest:"Gooi zes stenen";
        }
        box.innerHTML=h;
        dice=A.Dice(el(P+"dice"),{n:6, keepable:gooi, label:lbl,
          onRoll:function(v,dg){ if(my===gen&&!dead) onRoll(v,dg); },
          onChange:function(v){ if(my===gen&&!dead) onChange(v); },
          onKeep:function(kk){ if(my===gen&&!dead) onKeep(kk); }});
        dice.set(t.vals); dice.setKept(gooi&&!t.wait?t.sel:t.locked); dice.lock(lock);
        var rb=el(P+"dice").querySelector(".roll"); if(rb) rb.addEventListener("click",function(){ if(my===gen) busy=true; });
        var b=el(P+"manual"); if(b) b.onclick=manual;
        b=el(P+"done"); if(b) b.onclick=bookMain;
        b=el(P+"spdone"); if(b) b.onclick=bookSpaar;
      }
      function renderScore(){
        var box=el(P+"score"); if(!box) return;
        var lim=limit(), h='<table class="score"><tr><th>speler</th><th>strepen</th><th>wegwerken</th></tr>';
        A.S.players.forEach(function(q,i){ var s=G.str[i]||0;
          h+='<tr'+(i===G.cur?' class="cur"':'')+'><td>'+esc(q.name)+'</td><td><b>'+s+'</b>'+(s>lim?'<span class="'+P+'over">boven de '+lim+'</span>':'')+'</td><td><button class="btn" data-weg="'+i+'"'+(s<5?' disabled':'')+' aria-label="'+esc(q.name)+' drinkt 5 slokken">drinkt 5</button></td></tr>'; });
        h+='</table><div class="stat"><span>Eén streep is één slok, wegwerken per 5.</span><span>Aan de beurt met meer dan '+lim+': '+pen()+' erbij.</span></div>';
        box.innerHTML=h;
        box.querySelectorAll("[data-weg]").forEach(function(b){ b.onclick=function(){ weg(+b.getAttribute("data-weg")); }; });
      }
      function renderOpts(){
        var box=el(P+"opts"); if(!box) return;
        function seg(lbl,key,a,b){ return '<div class="seg"><span class="'+P+'lbl">'+lbl+'</span><button data-o="'+key+'" data-v="0" aria-pressed="'+!G[key]+'">'+a+'</button><button data-o="'+key+'" data-v="1" aria-pressed="'+!!G[key]+'">'+b+'</button></div>'; }
        var h=seg("sparen telt:","add","verdubbelen","optellen")+seg("sparen stopt:","drie","bij een misser","na drie worpen")+seg("aan de beurt:","ruim","hooguit 10, anders +15","hooguit 15, anders +10");
        h+='<div class="btnrow">'+(sure?'<button class="btn danger" id="'+P+'new">Zeker? Alle strepen vervallen</button><button class="btn" id="'+P+'nonew">Toch niet</button>':'<button class="btn" id="'+P+'new">Nieuw spel</button>')+'</div>';
        box.innerHTML=h;
        box.querySelectorAll("[data-o]").forEach(function(b){ b.onclick=function(){ if(busy) return; G[b.getAttribute("data-o")]=b.getAttribute("data-v")==="1"; A.save(); render(); }; });
        el(P+"new").onclick=function(){
          if(busy) return;
          if(!sure){ sure=true; renderOpts(); return; }
          sure=false; sync(); G.str=G.str.map(function(){return 0;}); G.log=[]; G.cur=A.S.active<n()?A.S.active:0; startTurn(); A.save(); render();
        };
        var no=el(P+"nonew"); if(no) no.onclick=function(){ sure=false; renderOpts(); };
      }
      function renderLog(){ var box=el(P+"log"); if(box) box.innerHTML=G.log.map(function(s){ return '<div>'+esc(s)+'</div>'; }).join(""); }
      function render(){
        if(dead) return;
        sync();
        if(n()<2){
          root.innerHTML='<p class="hint">Streepjesspel speel je met minimaal twee spelers: de strepen die je spaart gaan naar de speler voor jou. Voeg bovenaan een speler toe.</p><div class="btnrow"><button class="btn gold" id="'+P+'retry">Verder</button></div>';
          el(P+"retry").onclick=render; return;
        }
        root.innerHTML='<div class="'+P+'play" id="'+P+'play"></div><div class="board '+P+'score" id="'+P+'score"></div><div class="'+P+'opts" id="'+P+'opts"></div><div class="log" id="'+P+'log"></div>';
        renderPlay(); renderScore(); renderOpts(); renderLog();
      }

      /* Staat er nog een onbegonnen beurt klaar, dan begint wie nu in de spelersbalk actief is. */
      if(okTurn(G.t)&&!rosterChanged()&&!started(G.t)&&A.S.active<n()&&G.cur!==A.S.active){ G.cur=A.S.active; startTurn(); A.save(); }
      render();
      this.refresh=render;
      this.destroy=function(){ dead=true; };
      this.onPlayer=function(i){
        if(dead) return;
        if(rosterChanged()){ render(); return; }
        if(busy||started(G.t)){ A.S.active=G.cur; A.save(); A.renderPlayers(); A.toast("Beurt loopt nog",A.name(G.cur)+" maakt eerst de beurt af.",2600); return; }
        G.cur=i; startTurn(); A.save(); render();
      };
    }
  });
})();
