/* ===== Piramide Spel ===== */
(function(){
  "use strict";
  var A=App, esc=A.esc, pct=A.pct;
  var ID="piramide", V=1;
  var SUITNAME=["schoppen","harten","ruiten","klaveren"];
  var RANKNAME=["","aas","2","3","4","5","6","7","8","9","10","boer","vrouw","heer"];
  /* piramide van vier rijen: onderste rij 4 kaarten (1 slok per kaart), dan 3 (2), 2 (3) en de top 1 (4) */
  var ROWS=[4,3,2,1], START=[0,4,7,9], NPYR=10, MAXP=Math.floor((52-NPYR)/4);
  var VRAAG=["Rood of zwart?","Hoger of lager dan je eerste kaart?","Binnen of buiten je eerste twee kaarten?","Welke soort?"];
  var PICKORDER=[2,3,4,5,6,7,8,9,10,11,12,13,1];

  function val(c){ return c.r===1?14:c.r; } /* de aas is hoog */
  function slok(n){ return n+" "+(n===1?"slok":"slokken"); }
  function een(c){ return "een "+RANKNAME[c.r]; }
  function cname(c){ return SUITNAME[c.s]+" "+RANKNAME[c.r]; }
  function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
  function rowOf(idx){ return idx<4?0:idx<7?1:idx<9?2:3; }
  function full(x){ return x.r!==null&&x.s!==null; }

  function css(){
    if(document.getElementById("piramide-style"))return;
    var s=document.createElement("style"); s.id="piramide-style";
    s.textContent=
      ".piramide-box .btn{min-height:42px}"+
      ".piramide-box .seg button{min-height:40px}"+
      ".piramide-txt{margin:0;font-size:14px;line-height:1.45}"+
      ".piramide-seglbl{font-size:12px;color:var(--ivory-dim);align-self:center}"+
      ".piramide-q{text-align:center;font-size:20px;font-weight:900;margin-bottom:4px}"+
      ".piramide-hands{display:grid;grid-template-columns:repeat(auto-fill,minmax(152px,1fr));gap:8px}"+
      ".piramide-hand{background:rgba(0,0,0,.2);border-radius:10px;padding:6px 4px 9px;text-align:center;min-width:0}"+
      ".piramide-hand.piramide-cur{outline:2px solid var(--gold)}"+
      ".piramide-nm{font-size:13px;font-weight:700;display:block;margin-bottom:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"+
      ".piramide-hand .cards{margin:0;gap:4px;flex-wrap:nowrap}"+
      ".piramide-slot{display:inline-block;width:32px;height:46px;border-radius:5px;border:1.5px dashed rgba(243,233,210,.3);flex:none}"+
      ".piramide-pyr{display:flex;flex-direction:column;align-items:center;gap:9px;padding:6px 0 2px}"+
      ".piramide-row{display:flex;align-items:center;justify-content:center;gap:6px;position:relative;width:100%}"+
      ".piramide-lbl{position:absolute;right:0;font-size:11px;color:var(--ivory-dim)}"+
      ".piramide-now{display:flex;align-items:center;gap:12px;margin-top:12px;font-size:14px;line-height:1.4;color:var(--ivory-dim)}"+
      ".piramide-now b{color:var(--ivory);font-size:17px}"+
      ".piramide-panel{margin-top:10px;padding:12px 10px;border-radius:12px;background:rgba(0,0,0,.2);border:1.5px solid rgba(243,233,210,.25);text-align:center}"+
      ".piramide-panel h2{margin:0 0 4px;font-size:22px;font-weight:900}"+
      ".piramide-panel p{margin:6px 0;color:var(--ivory-dim);font-size:14px}"+
      ".piramide-panel p b{color:var(--ivory)}"+
      ".piramide-panel .btn b{color:var(--gold)}"+
      ".piramide-panel .opt{text-align:left}"+
      ".piramide-pos{display:inline-flex;flex-direction:column;align-items:center;gap:5px;font-size:11px;color:var(--ivory-dim);padding-top:6px}"+
      ".piramide-count{font-size:72px;font-weight:900;text-align:center;color:var(--gold);line-height:1.1}"+
      ".piramide-slots{display:flex;justify-content:center;gap:6px;margin:8px 0}"+
      ".piramide-rslot{background:none;border:0;padding:5px;display:inline-flex;flex-direction:column;align-items:center;gap:4px;border-radius:10px;font-size:11px;color:var(--ivory-dim)}"+
      ".piramide-rslot.piramide-on{background:rgba(231,184,79,.2);outline:2px solid var(--gold)}"+
      ".piramide-ph{display:inline-flex;align-items:center;justify-content:center;width:46px;height:66px;border-radius:7px;border:1.5px dashed rgba(243,233,210,.4);font-size:20px;font-weight:900;color:var(--ivory)}"+
      ".piramide-pick{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin:8px 0}"+
      ".piramide-pick.piramide-suits{grid-template-columns:repeat(4,1fr);gap:6px}"+
      ".piramide-pick button{min-height:44px;border-radius:9px;border:1.5px solid rgba(243,233,210,.35);background:rgba(0,0,0,.18);font-weight:900;font-size:17px;padding:0}"+
      ".piramide-pick.piramide-suits button{font-size:24px}"+
      ".piramide-pick button[aria-pressed=\"true\"]{background:var(--ivory);color:var(--ink);border-color:var(--ivory)}"+
      ".piramide-cmp{display:flex;justify-content:center;gap:10px;margin:10px 0}"+
      ".piramide-col{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px;color:var(--ivory-dim)}"+
      ".piramide-ok{color:var(--green);font-size:13px;font-weight:700}"+
      ".piramide-nok{color:#ffb4a6;font-size:13px;font-weight:700}";
    document.head.appendChild(s);
  }

  A.register({ id:ID, title:"Piramide Spel", level:"app", beta:true, kans:true, sub:"Deelt de kaarten, legt de piramide, regelt bluffen en opnoemen",
    init:function(root){
      css();
      var G=A.gs(ID); G.spiek=G.spiek||"uit";
      var box=document.createElement("div"); box.className="piramide-box"; root.innerHTML=""; root.appendChild(box);
      /* niet bewaard: aftellen, wie er spiekt, bevestiging van Nieuw spel */
      var timer=null, count=0, peek=null, peekPick=false, sure=false, alive=true, lockUntil=0, lastKey=null;
      /* Tikken die een nieuw scherm openen: daarna telt een tik heel even niet, zodat een dubbele tik niet per ongeluk
         een kaart overslaat, voor de volgende speler antwoordt of het spel wist. */
      var SLOW={start:1,ans:1,give1:1,next:1,memo:1,flip:1,claim:1,deal:1,believe:1,doubt:1,show:1,done:1,check:1,rnext:1,peek:1,peekoff:1,"new":1,reset:1};

      function stopTimer(){ if(timer){ clearInterval(timer); timer=null; } }
      function log(g,t){ g.log.unshift(t); if(g.log.length>8)g.log.pop(); }

      /* wie de telefoon nu "heeft": de speler die moet raden, uitdelen, geloven of opnoemen */
      function holder(g){
        if(g.phase==="deal")return g.cur;
        if(g.phase==="pyr"&&g.claim)return g.claim.step==="geloof"?g.claim.order[g.claim.k]:g.claim.by;
        if(g.phase==="recite")return g.rc;
        return null;
      }
      function sync(){ var g=G.g, h=g?holder(g):null; if(h!==null&&h!==undefined&&h<A.S.players.length&&A.S.active!==h){ A.S.active=h; A.save(); A.renderPlayers(); } }

      function newGame(){
        var n=A.S.players.length, start=A.S.active<n?A.S.active:0, hands=[], i;
        for(i=0;i<n;i++)hands.push([]);
        stopTimer(); peek=null; peekPick=false; sure=false;
        G.g={v:V,n:n,phase:"deal",start:start,cur:start,q:0,hands:hands,stock:A.deck(0),res:null,pyr:[],open:0,claimed:[],claim:null,rc:null,say:null,slot:0,chk:null,errs:[],log:[]};
      }

      /* ---------- fase 1: vier kaarten, per kaart een vraag ---------- */
      /* Lezing: er wordt gedeeld zoals je kaarten deelt, dus met de klok mee één kaart per speler per rondje;
         eerst beantwoordt iedereen vraag I, dan iedereen vraag II, enzovoort. */
      function options(g){
        var hand=g.hands[g.cur], st=g.stock, o, lo, hi, f;
        function p(fn){ var k=0,i; for(i=0;i<st.length;i++) if(fn(st[i]))k++; return st.length?k/st.length:0; }
        if(g.q===0) o=[{a:"rood",num:"♥♦",red:true,lbl:"Rood",p:p(A.isRed)},{a:"zwart",num:"♠♣",lbl:"Zwart",p:p(function(c){return !A.isRed(c);})}];
        else if(g.q===1){ f=val(hand[0]);
          o=[{a:"hoger",num:"▲",lbl:"Hoger",small:"dan "+een(hand[0])+" (de aas is hoog)",p:p(function(c){return val(c)>f;})},
             {a:"lager",num:"▼",lbl:"Lager",small:"even hoog telt als fout",p:p(function(c){return val(c)<f;})}]; }
        else if(g.q===2){ lo=Math.min(val(hand[0]),val(hand[1])); hi=Math.max(val(hand[0]),val(hand[1]));
          var a0=val(hand[0])<=val(hand[1])?hand[0]:hand[1], a1=a0===hand[0]?hand[1]:hand[0];
          o=[{a:"binnen",num:"→←",lbl:"Binnen",small:lo===hi?"je eerste twee zijn even hoog: binnen kan niet":"tussen "+RANKNAME[a0.r]+" en "+RANKNAME[a1.r],p:p(function(c){return val(c)>lo&&val(c)<hi;})},
             {a:"buiten",num:"←→",lbl:"Buiten",small:"op de paal telt als fout",p:p(function(c){return val(c)<lo||val(c)>hi;})}]; }
        else o=[0,1,2,3].map(function(s){ return {a:String(s),num:A.SUITS[s],red:s===1||s===2,lbl:cap(SUITNAME[s]),p:p(function(c){return c.s===s;})}; });
        return o;
      }
      function answer(a){
        var g=G.g, i=g.cur, hand=g.hands[i], c=g.stock.pop(), v=val(c), ok, paal=false, lo, hi;
        if(g.q===0) ok=(a==="rood")===A.isRed(c);
        /* Even hoog als de eerste kaart is hoger noch lager, en een kaart met dezelfde waarde als één van de
           eerste twee ligt er niet tussen en niet buiten ("op de paal"): in beide gevallen is het antwoord fout. */
        else if(g.q===1){ paal=v===val(hand[0]); ok=a==="hoger"?v>val(hand[0]):v<val(hand[0]); }
        else if(g.q===2){ lo=Math.min(val(hand[0]),val(hand[1])); hi=Math.max(val(hand[0]),val(hand[1])); paal=v===lo||v===hi; ok=a==="binnen"?(v>lo&&v<hi):(v<lo||v>hi); }
        else ok=c.s===+a;
        hand.push(c); g.res={a:a,ok:ok,paal:paal};
        if(ok){ A.play("ding"); }
        else { A.drink(i,1); A.play("dood"); log(g,A.name(i)+" zegt "+said(g.q,a)+", het is "+cname(c)+": fout, "+A.name(i)+" drinkt 1 slok."); }
      }
      function said(q,a){ return q===3?SUITNAME[+a]:a; }
      function advance(){
        var g=G.g, nxt=(g.cur+1)%g.n;
        g.res=null; g.cur=nxt;
        if(nxt===g.start){ g.q++; if(g.q>3){ g.phase="memo"; } }
      }
      function handsHtml(g,open,cur){
        var h='<div class="piramide-hands">';
        A.S.players.forEach(function(p,i){
          var hand=g.hands[i]||[], c="", k;
          for(k=0;k<4;k++) c+=hand[k]?(open?A.cardHtml(hand[k],"small"):A.cardHtml(null,"back small")):'<span class="piramide-slot"></span>';
          h+='<div class="piramide-hand'+(i===cur?' piramide-cur':'')+'"><span class="piramide-nm">'+esc(p.name)+'</span><div class="cards">'+c+'</div></div>';
        });
        return h+'</div>';
      }
      function dealHtml(g){
        var i=g.cur, hand=g.hands[i], res=g.res, h='<p class="hint">Kaart '+(g.q+1)+' van 4 · '+esc(A.name(i))+(res?' kreeg een kaart':' raadt eerst, dan komt de kaart. Fout: zelf 1 slok. Goed: 1 slok uitdelen.')+'</p>';
        if(res){
          var c=hand[hand.length-1];
          if(res.ok){
            h+='<div class="verdict win"><h2>Goed!</h2><div class="cards">'+A.cardHtml(c,"big")+'</div><p>'+esc(A.name(i)+" zei "+said(g.q,res.a)+" en het is "+cname(c)+".")+' <b>'+esc(A.name(i))+' mag één slok uitdelen.</b> Wie drinkt hem?</p><div class="btnrow">'+
              A.others(i).map(function(j){ return '<button class="btn primary" data-a="give1" data-v="'+j+'">'+esc(A.name(j))+'</button>'; }).join("")+'</div></div>';
          } else {
            h+='<div class="verdict fout"><h2>Fout</h2><div class="cards">'+A.cardHtml(c,"big")+'</div><p>'+esc(A.name(i)+" zei "+said(g.q,res.a)+", het is "+cname(c)+(res.paal?" (op de paal)":"")+".")+' <b>'+esc(A.name(i))+' drinkt één slok.</b></p><div class="btnrow"><button class="btn primary" data-a="next">Verder</button></div></div>';
          }
        } else {
          var o=options(g), best=0; o.forEach(function(x){ if(x.p>best)best=x.p; });
          h+='<div class="board"><div class="piramide-q">'+esc(VRAAG[g.q])+'</div>'+(hand.length?'<div class="cards">'+hand.map(function(c){return A.cardHtml(c);}).join("")+'</div>':'')+'</div><div class="opts">'+
            o.map(function(x){ return '<button class="opt'+(x.p===best?' best':'')+'" data-a="ans" data-v="'+x.a+'"><span class="num"'+(x.red?' style="color:#ff8f7d"':'')+'>'+x.num+'</span><span class="lbl">'+esc(x.lbl)+(x.small?'<small>'+esc(x.small)+'</small>':'')+'</span><span class="odds kans"><b>'+pct(x.p,0)+'</b>kans</span></button>'; }).join("")+'</div>';
        }
        return h+'<p class="hint">De gedeelde kaarten liggen nog open</p>'+handsHtml(g,true,i);
      }

      /* ---------- fase 2: vijf seconden onthouden ---------- */
      function memoHtml(g){
        var h=timer?'<div class="piramide-count">'+count+'</div><p class="hint">Onthoud je vier kaarten: waarde, soort en volgorde.</p>':
          '<div class="verdict neutral"><h2>Onthouden</h2><p>Iedereen heeft vier kaarten. Je krijgt nog vijf seconden om ze te onthouden (waarde, soort en volgorde). Daarna gaan ze dicht en komt de piramide op tafel.</p><div class="btnrow"><button class="btn gold" data-a="memo">Start de 5 seconden</button></div></div>';
        return h+handsHtml(g,true,null);
      }
      function startMemo(){
        if(timer)return; count=5; A.play("tick");
        timer=setInterval(function(){
          var g=G.g; count--;
          if(!g||g.phase!=="memo"){ stopTimer(); return; }
          if(count<=0){ stopTimer(); g.pyr=g.stock.splice(0,NPYR); g.phase="pyr"; g.open=0; g.claimed=[]; g.claim=null; log(g,"De kaarten liggen dicht, de piramide ligt op tafel."); A.play("clack"); A.save(); }
          else A.play("tick");
          render();
        },1000);
      }

      /* ---------- fase 3 en 4: de piramide ---------- */
      function pyrHtml(g){
        var h='<div class="board"><div class="piramide-pyr">', r, k, idx;
        for(r=3;r>=0;r--){
          h+='<div class="piramide-row">';
          for(k=0;k<ROWS[r];k++){ idx=START[r]+k; h+=idx<g.open?A.cardHtml(g.pyr[idx],"small"+(idx===g.open-1?" sel":"")):A.cardHtml(null,"back small"); }
          h+='<span class="piramide-lbl">'+slok(r+1)+'</span></div>';
        }
        return h+'</div></div>';
      }
      function given(cl){ var s=0,k; for(k in cl.give) if(Object.prototype.hasOwnProperty.call(cl.give,k)) s+=cl.give[k]; return s; }
      function spiekPrijs(){ return G.spiek==="adtje"?"een adtje":"een slok"; }
      function spiekSeg(){
        return '<div class="seg"><span class="piramide-seglbl">Spieken kost:</span><button data-a="spiek" data-v="uit" aria-pressed="'+(G.spiek==="uit")+'">niet afgesproken</button><button data-a="spiek" data-v="slok" aria-pressed="'+(G.spiek==="slok")+'">een slok</button><button data-a="spiek" data-v="adtje" aria-pressed="'+(G.spiek==="adtje")+'">een adtje</button></div>';
      }
      function pyrPhase(g){
        var h=pyrHtml(g), c=g.open?g.pyr[g.open-1]:null, n=c?rowOf(g.open-1)+1:0, cl=g.claim, by, tot, giv, j, m;
        if(peek!==null&&g.hands[peek]){
          return h+'<div class="verdict neutral"><h2>Spieken</h2><p>De kaarten van <b>'+esc(A.name(peek))+'</b>, op volgorde. Dit kostte '+spiekPrijs()+'.</p><div class="cards">'+g.hands[peek].map(function(x){return A.cardHtml(x);}).join("")+'</div><div class="btnrow"><button class="btn primary" data-a="peekoff">Kaarten weer dicht</button></div></div>';
        }
        if(!c){
          return h+'<p class="hint">De piramide ligt. De kaarten gaan één voor één om, te beginnen bij de onderste rij.</p><div class="btnrow"><button class="btn gold" data-a="flip">Draai de eerste kaart om</button></div>';
        }
        if(!cl){
          h+='<div class="piramide-now">'+A.cardHtml(c)+'<div><b>'+esc(cap(cname(c)))+'</b><br>Rij '+n+': wie '+esc(een(c))+' heeft, of bluft, deelt '+slok(n)+' uit. Met twee keer '+esc(een(c))+' het dubbele: '+slok(2*n)+'.</div></div>';
          h+='<p class="hint">Wie deelt uit? Tik je naam aan. Je eigen kaarten blijven dicht, dus bluffen mag.</p><div class="btnrow">'+A.S.players.map(function(p,i){ return '<button class="btn" data-a="claim" data-v="'+i+'"'+(g.claimed.indexOf(i)>=0?' disabled':'')+'>'+esc(p.name)+'</button>'; }).join("")+'</div>';
          h+='<div class="btnrow"><button class="btn gold" data-a="flip">'+(g.open<NPYR?"Niemand meer: volgende kaart":"Piramide klaar: kaarten opnoemen")+'</button></div>';
          if(G.spiek!=="uit"){
            if(peekPick) h+='<div class="piramide-panel"><p>Wie spiekt naar zijn of haar kaarten? Dat kost '+spiekPrijs()+'.</p><div class="btnrow">'+A.S.players.map(function(p,i){ return '<button class="btn" data-a="peek" data-v="'+i+'">'+esc(p.name)+'</button>'; }).join("")+'<button class="btn" data-a="peekpick">Toch niet</button></div></div>';
            else h+='<div class="btnrow"><button class="btn" data-a="peekpick">Spieken (kost '+spiekPrijs()+')</button></div>';
          }
          return h;
        }
        by=cl.by;
        if(cl.step==="verdeel"){
          tot=n*cl.times; giv=given(cl);
          h+='<div class="piramide-panel"><h2>'+esc(A.name(by))+' deelt uit</h2><p>Hoe vaak heb je '+esc(een(c))+' voor je liggen?</p>'+
            '<div class="seg"><button data-a="times" data-v="1" aria-pressed="'+(cl.times===1)+'">één keer: '+slok(n)+'</button><button data-a="times" data-v="2" aria-pressed="'+(cl.times===2)+'">twee keer: '+slok(2*n)+'</button></div>'+
            '<p>Tik per slok aan wie hem krijgt. Nog <b>'+(tot-giv)+'</b> uit te delen.</p><div class="btnrow">'+
            A.others(by).map(function(x){ return '<button class="btn" data-a="give" data-v="'+x+'"'+(giv>=tot?' disabled':'')+'>'+esc(A.name(x))+(cl.give[x]?' <b>+'+cl.give[x]+'</b>':'')+'</button>'; }).join("")+'</div>'+
            '<div class="btnrow"><button class="btn gold" data-a="deal"'+(giv?'':' disabled')+'>Deel uit</button><button class="btn" data-a="wis"'+(giv?'':' disabled')+'>Wis</button><button class="btn" data-a="noclaim">Toch niet</button></div></div>';
          return h;
        }
        if(cl.step==="geloof"){
          j=cl.order[cl.k]; m=cl.give[j];
          h+='<div class="piramide-panel"><h2>'+esc(A.name(j))+': geloof je het?</h2><p><b>'+esc(A.name(by))+'</b> zegt '+(cl.times===2?'twee keer ':'')+esc(een(c))+' te hebben en geeft jou <b>'+slok(m)+'</b>.</p><div class="opts">'+
            '<button class="opt" data-a="believe"><span class="num">'+m+'</span><span class="lbl">Ik geloof het<small>ik drink '+slok(m)+'</small></span></button>'+
            '<button class="opt" data-a="doubt"><span class="num">?</span><span class="lbl">Ik geloof het niet<small>'+esc(A.name(by))+' draait '+(cl.times===2?'twee kaarten':'één kaart')+' om. Klopt het: ik drink '+slok(2*m)+'. Klopt het niet: '+esc(A.name(by))+' drinkt er '+m+'.</small></span></button>'+
            '</div>'+(cl.order.length>1?'<p>'+(cl.k+1)+' van '+cl.order.length+'</p>':'')+'</div>';
          return h;
        }
        if(cl.step==="bewijs"){
          var twijfel=cl.order.filter(function(x){return cl.ans[x]==="n";});
          h+='<div class="piramide-panel"><h2>'+esc(A.name(by))+': laat zien</h2><p>'+esc(A.joinNames(twijfel))+(twijfel.length>1?' geloven':' gelooft')+' het niet. Tik '+(cl.times===2?'de twee kaarten':'de kaart')+' aan waar '+esc(een(c))+' ligt (1 is je eerste kaart) en draai om. Je hebt één kans.</p><div class="cards">'+
            [0,1,2,3].map(function(k){ return '<span class="piramide-pos"><button class="card back'+(cl.picks.indexOf(k)>=0?' sel':'')+'" data-a="pick" data-v="'+k+'" aria-label="Kaart '+(k+1)+'"></button>'+(k+1)+'</span>'; }).join("")+
            '</div><div class="btnrow"><button class="btn gold" data-a="show"'+(cl.picks.length===cl.times?'':' disabled')+'>Draai om</button></div></div>';
          return h;
        }
        /* uitslag */
        h+='<div class="verdict '+(cl.ok?"win":"fout")+'"><h2>'+(cl.ok?"Het klopt!":"Mis!")+'</h2><div class="cards">'+
          [0,1,2,3].map(function(k){ return '<span class="piramide-pos">'+(cl.picks.indexOf(k)>=0?A.cardHtml(g.hands[by][k]):A.cardHtml(null,"back"))+(k+1)+'</span>'; }).join("")+'</div>'+
          cl.msg.map(function(t,x){ return '<p>'+(x?'<b>'+esc(t)+'</b>':esc(t))+'</p>'; }).join("")+
          '<p>'+(cl.picks.length>1?"De kaarten gaan":"De kaart gaat")+' weer dicht.</p><div class="btnrow"><button class="btn primary" data-a="done">Verder</button></div></div>';
        return h;
      }
      function resolve(g){
        var cl=g.claim, target=g.pyr[g.open-1], hand=g.hands[cl.by], sum=0, msg=[],
          ok=cl.picks.every(function(k){return hand[k].r===target.r;}),
          twijfel=cl.order.filter(function(j){return cl.ans[j]==="n";});
        msg.push(A.name(cl.by)+" draait "+A.joinNames(cl.picks.slice().sort().map(function(k){return cname(hand[k]);}))+" om.");
        if(ok){
          twijfel.forEach(function(j){ var m=2*cl.give[j]; A.drink(j,m); msg.push(A.name(j)+" geloofde het niet en drinkt het dubbele: "+slok(m)+"."); });
          A.play("win");
        } else {
          twijfel.forEach(function(j){ sum+=cl.give[j]; });
          A.drink(cl.by,sum); msg.push(A.name(cl.by)+" kan het niet laten zien en drinkt zelf "+slok(sum)+"."); A.play("dood");
        }
        cl.ok=ok; cl.msg=msg; cl.step="uitslag";
        msg.slice(1).forEach(function(t){ log(g,t); });
      }

      /* ---------- fase 6: de vier kaarten opnoemen ---------- */
      function resetSay(g){ g.say=[{r:null,s:null},{r:null,s:null},{r:null,s:null},{r:null,s:null}]; g.slot=0; g.chk=null; }
      function autoNext(g){ var k,j; if(!full(g.say[g.slot]))return; for(k=1;k<4;k++){ j=(g.slot+k)%4; if(!full(g.say[j])){ g.slot=j; return; } } }
      function reciteHtml(g){
        var i=g.rc, hand=g.hands[i], h, cur=g.say[g.slot], nxt=(i+1)%g.n;
        if(g.chk){
          var e=g.chk.e;
          return '<div class="verdict '+(e?"fout":"win")+'"><h2>'+(e?e+" fout":"Alles goed!")+'</h2><p><b>'+esc(A.name(i))+(e?" drinkt "+slok(e)+".":" hoeft niet te drinken.")+'</b></p><div class="piramide-cmp">'+
            [0,1,2,3].map(function(k){ return '<div class="piramide-col"><span>gezegd</span>'+A.cardHtml(g.say[k],"small")+'<span>ligt er</span>'+A.cardHtml(hand[k])+(g.chk.wrong[k]?'<span class="piramide-nok">✗ fout</span>':'<span class="piramide-ok">✓ goed</span>')+'</div>'; }).join("")+
            '</div><div class="btnrow"><button class="btn primary" data-a="rnext">'+(nxt===g.start?"Naar de uitslag":"Volgende: "+esc(A.name(nxt)))+'</button></div></div>';
        }
        h='<div class="piramide-panel"><h2>'+esc(A.name(i))+' noemt op</h2><p>Zonder te kijken, in volgorde, met waarde én soort. Tik aan wat '+esc(A.name(i))+' zegt. Elke kaart die niet klopt is één slok.</p><div class="piramide-slots">'+
          [0,1,2,3].map(function(k){ var x=g.say[k]; return '<button class="piramide-rslot'+(k===g.slot?' piramide-on':'')+'" data-a="slot" data-v="'+k+'" aria-label="Kaart '+(k+1)+'">'+(full(x)?A.cardHtml(x):'<span class="piramide-ph">'+(x.r!==null?A.RANKS[x.r]:x.s!==null?A.SUITS[x.s]:"?")+'</span>')+(k+1)+'</button>'; }).join("")+'</div>'+
          '<div class="piramide-pick">'+PICKORDER.map(function(r){ return '<button data-a="rk" data-v="'+r+'" aria-pressed="'+(cur.r===r)+'">'+A.RANKS[r]+'</button>'; }).join("")+'</div>'+
          '<div class="piramide-pick piramide-suits">'+[0,1,2,3].map(function(s){ return '<button data-a="st" data-v="'+s+'" aria-pressed="'+(cur.s===s)+'" aria-label="'+SUITNAME[s]+'"'+((s===1||s===2)&&cur.s!==s?' style="color:#ff8f7d"':(s===1||s===2)?' style="color:var(--red)"':'')+'>'+A.SUITS[s]+'</button>'; }).join("")+'</div>'+
          '<div class="btnrow"><button class="btn gold" data-a="check"'+(g.say.every(full)?'':' disabled')+'>Draai de kaarten om</button></div></div>';
        return h;
      }
      function check(g){
        var i=g.rc, hand=g.hands[i], wrong=g.say.map(function(x,k){ return x.r!==hand[k].r||x.s!==hand[k].s; }), e=wrong.filter(function(w){return w;}).length;
        if(e)A.drink(i,e);
        g.chk={e:e,wrong:wrong}; g.errs[i]=e;
        log(g,A.name(i)+" noemt de kaarten op: "+(e?e+" fout, drinkt "+slok(e)+".":"alles goed, geen slok."));
        A.play(e?"dood":"win");
      }
      function eindeHtml(g){
        return '<div class="verdict neutral"><h2>Spel klaar</h2><p>De piramide is om en iedereen heeft zijn kaarten opgenoemd.</p><div class="btnrow"><button class="btn gold" data-a="new">Nieuw spel</button></div></div>'+
          '<div class="board"><table class="score"><tr><th>speler</th><th>fout bij opnoemen</th></tr>'+A.S.players.map(function(p,i){ return '<tr><td>'+esc(p.name)+'</td><td>'+(g.errs[i]||0)+'</td></tr>'; }).join("")+'</table></div>'+
          '<p class="hint">Alle kaarten</p>'+handsHtml(g,true,null);
      }

      /* ---------- scherm ---------- */
      function setupHtml(np){
        var h='<div class="board"><p class="piramide-txt">Iedereen krijgt vier kaarten en raadt er per kaart iets over: rood of zwart, hoger of lager, binnen of buiten, de soort. Fout is zelf een slok, goed is een slok uitdelen. Daarna gaan de kaarten dicht en komt de piramide: wie de omgedraaide kaart heeft, of bluft, deelt slokken uit. Aan het eind noemt iedereen zijn vier kaarten op.</p></div>';
        if(np<2) h+='<p class="hint">Dit spel heeft minstens twee spelers nodig: je moet slokken kunnen uitdelen. Voeg hierboven een speler toe.</p>';
        else if(np>MAXP) h+='<p class="hint">Met één spel kaarten kunnen er hoogstens '+MAXP+' spelers meedoen (vier kaarten per speler en tien voor de piramide). Nu zijn er '+np+'.</p>';
        else h+='<p class="hint">'+esc(A.name(A.S.active))+' krijgt de eerste kaart, daarna met de klok mee. Tik hierboven een andere speler aan om te wisselen.</p><div class="btnrow"><button class="btn gold" data-a="start">Deel de kaarten</button></div>';
        return h+spiekSeg();
      }
      function render(){
        var g=G.g, np=A.S.players.length, h, key;
        if(g&&g.v!==V){ G.g=g=null; }
        key=g?g.phase:"setup"; if(key!==lastKey){ lastKey=key; root.scrollTop=0; }
        if(!g){ box.innerHTML=setupHtml(np); return; }
        if(g.n!==np){ box.innerHTML='<p class="hint">Het aantal spelers is veranderd terwijl er een spel liep ('+g.n+' bij het delen, nu '+np+'). De kaarten kloppen niet meer bij de spelers.</p><div class="btnrow"><button class="btn gold" data-a="reset">Nieuw spel</button></div>'; return; }
        sync();
        h=g.phase==="deal"?dealHtml(g):g.phase==="memo"?memoHtml(g):g.phase==="pyr"?pyrPhase(g):g.phase==="recite"?reciteHtml(g):eindeHtml(g);
        if(g.phase==="pyr"&&!g.claim&&peek===null) h+=spiekSeg();
        if(g.log.length) h+='<div class="log">'+g.log.map(function(t){return '<div>'+esc(t)+'</div>';}).join("")+'</div>';
        if(g.phase!=="einde") h+='<div class="btnrow"><button class="btn'+(sure?' danger':'')+'" data-a="new">'+(sure?"Zeker weten? Tik nog eens":"Nieuw spel")+'</button></div>';
        box.innerHTML=h;
      }

      function act(a,v){
        var g=G.g, np=A.S.players.length, cl=g?g.claim:null, i, j, m, c, n, d;
        if(a!=="new")sure=false;
        if(a==="spiek"){ G.spiek=v; if(v==="uit")peekPick=false; }
        else if(a==="start"){ if(!g&&np>=2&&np<=MAXP)newGame(); }
        else if(a==="reset"){ stopTimer(); peek=null; G.g=null; }
        else if(a==="new"){ if(!g||g.phase==="einde"||sure){ stopTimer(); peek=null; peekPick=false; sure=false; G.g=null; } else sure=true; }
        else if(!g||g.n!==np){ /* geen geldig spel: niets doen */ }
        else if(g.phase==="deal"){
          if(a==="ans"&&!g.res) answer(v);
          else if(a==="give1"&&g.res&&g.res.ok){ j=+v; i=g.cur; if(j!==i&&A.S.players[j]){ A.drink(j,1); c=g.hands[i][g.hands[i].length-1]; log(g,A.name(i)+" heeft "+cname(c)+" goed en deelt uit: "+A.name(j)+" drinkt 1 slok."); A.toast(A.name(j)+" drinkt 1 slok","Uitgedeeld door "+A.name(i)+"."); advance(); } }
          else if(a==="next"&&g.res&&!g.res.ok) advance();
        }
        else if(g.phase==="memo"){ if(a==="memo") startMemo(); }
        else if(g.phase==="pyr"){
          c=g.open?g.pyr[g.open-1]:null; n=c?rowOf(g.open-1)+1:0;
          if(a==="peekoff"){ peek=null; }
          else if(peek!==null){ /* eerst de kaarten weer dicht */ }
          else if(!cl){
            if(a==="flip"){ peekPick=false;
              if(g.open<NPYR){ g.open++; g.claimed=[]; A.play("clack"); c=g.pyr[g.open-1]; log(g,"Piramide, rij "+(rowOf(g.open-1)+1)+": "+cname(c)+" ligt open."); }
              else { g.phase="recite"; g.rc=g.start; g.errs=[]; resetSay(g); } }
            else if(a==="claim"&&c){ i=+v; if(g.claimed.indexOf(i)<0&&A.S.players[i]){ peekPick=false; g.claim={by:i,times:1,give:{},step:"verdeel"}; } }
            else if(a==="peekpick"&&G.spiek!=="uit"){ peekPick=!peekPick; }
            else if(a==="peek"&&G.spiek!=="uit"){ i=+v; peekPick=false;
              /* Variërende regel: spieken kost een slok of een adtje, naar afspraak. De kaarten komen pas na het doorgeven in beeld. */
              if(A.S.players[i]) A.handover(i,"Alleen jij kijkt. Spieken kost "+spiekPrijs()+".",function(){
                if(!alive||G.g!==g||g.phase!=="pyr"||g.claim||g.n!==A.S.players.length||!A.S.players[i])return;
                if(G.spiek==="adtje"){ A.atje(i,1); log(g,A.name(i)+" spiekt en trekt een adtje."); } else { A.drink(i,1); log(g,A.name(i)+" spiekt en drinkt 1 slok."); }
                peek=i; A.save(); render();
              }); }
          }
          else if(cl.step==="verdeel"){
            if(a==="times"){ cl.times=+v===2?2:1; if(given(cl)>n*cl.times)cl.give={}; }
            else if(a==="give"){ j=+v; if(j!==cl.by&&A.S.players[j]&&given(cl)<n*cl.times){ cl.give[j]=(cl.give[j]||0)+1; A.play("tick"); } }
            else if(a==="wis"){ cl.give={}; }
            else if(a==="noclaim"){ g.claim=null; }
            else if(a==="deal"&&given(cl)>0){
              /* de ontvangers beslissen met de klok mee, te beginnen links van de uitdeler */
              cl.order=[]; for(d=1;d<g.n;d++){ j=(cl.by+d)%g.n; if(cl.give[j])cl.order.push(j); }
              cl.k=0; cl.ans={}; cl.picks=[]; cl.step="geloof"; g.claimed.push(cl.by);
              log(g,A.name(cl.by)+" zegt "+(cl.times===2?"twee keer ":"")+een(c)+" te hebben en deelt uit: "+A.joinNames(cl.order.map(function(x){return A.name(x)+" "+cl.give[x];}))+".");
            }
          }
          else if(cl.step==="geloof"){
            j=cl.order[cl.k]; m=cl.give[j];
            if(a==="believe"||a==="doubt"){
              if(a==="believe"){ cl.ans[j]="g"; A.drink(j,m); log(g,A.name(j)+" gelooft "+A.name(cl.by)+" en drinkt "+slok(m)+"."); A.toast(A.name(j)+" drinkt "+slok(m),"Gelooft "+A.name(cl.by)+"."); }
              else { cl.ans[j]="n"; log(g,A.name(j)+" gelooft "+A.name(cl.by)+" niet."); }
              cl.k++;
              /* Iedereen kiest eerst, pas daarna gaat er een kaart om: anders weet de volgende ontvanger het antwoord al. */
              if(cl.k>=cl.order.length){ if(cl.order.some(function(x){return cl.ans[x]==="n";})){ cl.step="bewijs"; cl.picks=[]; } else g.claim=null; }
            }
          }
          else if(cl.step==="bewijs"){
            /* Lezing: wie "twee keer" claimde moet bij twijfel in zijn ene kans beide kaarten laten zien; de tekst beschrijft alleen één kaart. */
            if(a==="pick"){ d=+v; i=cl.picks.indexOf(d); if(i>=0)cl.picks.splice(i,1); else if(d>=0&&d<4){ cl.picks.push(d); if(cl.picks.length>cl.times)cl.picks.shift(); } A.play("tick"); }
            else if(a==="show"&&cl.picks.length===cl.times) resolve(g);
          }
          else if(cl.step==="uitslag"){ if(a==="done") g.claim=null; }
        }
        else if(g.phase==="recite"){
          if(g.chk){ if(a==="rnext"){ g.rc=(g.rc+1)%g.n; if(g.rc===g.start){ g.phase="einde"; g.rc=null; } else resetSay(g); } }
          else if(a==="slot"){ d=+v; if(d>=0&&d<4)g.slot=d; }
          else if(a==="rk"){ g.say[g.slot].r=+v; autoNext(g); }
          else if(a==="st"){ g.say[g.slot].s=+v; autoNext(g); }
          else if(a==="check"&&g.say.every(full)) check(g);
        }
        A.save(); render();
      }
      box.addEventListener("click",function(e){
        var b=e.target.closest?e.target.closest("[data-a]"):null, now=Date.now(), a; if(!b||b.disabled)return;
        a=b.getAttribute("data-a"); if(now<lockUntil)return; if(SLOW[a])lockUntil=now+400;
        act(b.getAttribute("data-a"),b.getAttribute("data-v"));
      });

      this.refresh=render;
      this.onPlayer=function(){ render(); }; /* in het spel bepaalt de beurt wie actief is; render zet dat terug */
      this.destroy=function(){ alive=false; stopTimer(); peek=null; };
      render();
    }
  });
})();
