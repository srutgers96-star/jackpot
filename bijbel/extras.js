/* ===== Extra's: varianten die in Mexx zitten, en de installatie-uitleg op het beginscherm ===== */
(function(){
  var A=App;
  /* PowerMexx en Inverse Mexx zijn standen van het Mexx-spel; zo zijn ze ook vanaf het beginscherm te openen. */
  [["powermexx","PowerMexx","power","Mexx met één worp, 3 3 telt als twee Mexx"],["inversemexx","Inverse Mexx","inverse","Mexx andersom: laag is goed"]].forEach(function(v){
    A.register({ id:v[0], title:v[1], level:"app", beta:true, sub:v[3], init:function(){ A.gs("mexx").variant=v[2]; A.save(); A.openGame("mexx"); } });
  });
})();

/* Na App.init aanroepen: zet de installatie-uitleg onderaan het beginscherm (niet als de app al geïnstalleerd is). */
function bijbelInstallHint(){
  var standalone=false; try{ standalone=(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true; }catch(e){}
  if(standalone) return;
  var ua=navigator.userAgent||"", ios=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1);
  var chrome="Android, Chrome: menu (⋮) rechtsboven, tik op 'App installeren' of 'Toevoegen aan startscherm'.";
  var safari="iPhone, Safari: tik op Delen (het vierkant met de pijl omhoog), scrol naar beneden en tik op 'Zet op beginscherm'.";
  var d=document.createElement("div"); d.className="installhint";
  d.innerHTML='<b>Zet de Bierspelbijbel op je beginscherm</b><span></span><span class="other"></span>';
  d.children[1].textContent=ios?safari:chrome; d.children[2].textContent=ios?chrome:safari;
  var home=document.getElementById("view-home"), amen=home.querySelector(".amen");
  home.insertBefore(d,amen||null);
}
