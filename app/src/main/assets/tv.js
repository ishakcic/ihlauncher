/* ihlauncher • Canlı TV (gerçek tuner/uydu yayını: Android TV Input Framework + TvView)
 * Kotlin tarafı: TvEngine.kt (Bridge: tvState, tvChannels, tvPrograms, tvTune, tvRect, ...). Video, WebView'in arkasındaki TvView'de oynar;
 * "pHole" alanı şeffaf kalır. Bu dosya index.html'deki global yardımcıları (N, $, esc, S, save, toast, ask, menu, info, focusEl) kullanır. */
(function(){
'use strict';
const TV={on:false,watch:false,tab:'now',all:[],list:[],curId:null,prevId:null,tuned:false,filter:'all',prog:{},st:null,vid:false,reason:1,fail:'',muted:false,num:'',rf:0,logos:{},logoBusy:false,gs:-1,q:''};
const WIN=24,GWIN=11,$t=id=>document.getElementById(id);
const hue=s=>{let h=0;s=String(s);for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h)%360};
const col=c=>{const h=hue(c.name||c.id);return{c1:'hsl('+h+',62%,44%)',c2:'hsl('+((h+55)%360)+',55%,22%)',bg:'hsl('+h+',40%,7%)'}};
const fmt=ms=>new Date(ms).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
const pct=p=>p?Math.max(0,Math.min(100,(Date.now()-p.s)/(p.e-p.s)*100)):0;
const REASON={0:'Görüntü yok',1:'Kanal ayarlanıyor…',2:'Sinyal zayıf veya yok',3:'Arabelleğe alınıyor…',4:'Yalnızca ses (radyo)'};
const isHd=c=>/720|1080|2160|4320/.test(c.vf||'');
const tname=t=>String(t||'').replace('TYPE_','').replace(/_/g,'-')||'—';
const cur=()=>TV.all.find(c=>c.id===TV.curId)||null;
const curIdx=()=>TV.list.findIndex(c=>c.id===TV.curId);
const favs=()=>S.tvFav||(S.tvFav=[]);
const IC={star:'<path d="M12 3l2.6 6.9L22 10.5l-5.8 4.6 2.1 7.4L12 18.2 5.7 22.5l2.1-7.4L2 10.5l7.4-.6z"/>',mute:'<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>',vol:'<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>',full:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',scan:'<circle cx="12" cy="12" r="3"/><path d="M5 12a7 7 0 0 1 14 0M2 12a10 10 0 0 1 20 0"/>'};
const ic=k=>'<svg class="t-i" viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round">'+IC[k]+'</svg>';

/* ---------- Program (EPG) ---------- */
function nowNext(id){const p=TV.prog[id],l=p?p.l:[],n=Date.now(),i=l.findIndex(x=>x.s<=n&&x.e>n);return{now:i>=0?l[i]:null,next:i>=0?(l[i+1]||null):(l.find(x=>x.s>n)||null)}}
async function loadProgs(ids){
  ids=ids.filter(id=>{const p=TV.prog[id];return !p||Date.now()-p.t>300000});if(!ids.length)return;
  ids.forEach(id=>{TV.prog[id]={t:Date.now(),l:(TV.prog[id]||{l:[]}).l}});
  const r=await N('tvPrograms',{ids,from:Date.now()-3*3600e3,to:Date.now()+12*3600e3});
  const m=(r&&r.map)||{};for(const k in m)TV.prog[k]={t:Date.now(),l:m[k]};
  if(TV.on)refresh()}

/* ---------- Oluşturma ---------- */
function build(){
  if($t('tv'))return;
  const d=document.createElement('div');d.id='tv';d.className='tab-now';
  d.innerHTML=
  '<div class="t-top"><div class="t-brand"><i></i>CANLI TV</div>'+
   '<div class="t-tabs"><button class="t-tab on" data-t="now" onclick="TVUI.tab(\'now\')">Şimdi</button><button class="t-tab" data-t="guide" onclick="TVUI.tab(\'guide\')">Rehber</button><button class="t-tab" data-t="search" onclick="TVUI.tab(\'search\')">Ara</button></div>'+
   '<div class="t-meta"><span class="t-clk" id="tClk">--:--</span><div class="t-x" tabindex="0" onclick="TVUI.close()">✕</div></div></div>'+
  '<div class="t-stage"><div class="t-hole" id="pHole">'+
    '<div class="t-nosig"><div class="t-nlogo" id="pLogo"></div><div class="t-nst" id="pSt">Kanal ayarlanıyor…</div><div style="display:flex;gap:10px" id="pFailBox"><div class="t-btn b" id="pFail" tabindex="0" onclick="TVUI.ext()">Sistem TV uygulamasında aç</div><div class="t-btn" tabindex="0" onclick="TVUI.diag()">Tanı</div></div></div>'+
    '<div class="t-hm"><div class="t-lab">CANLI YAYIN</div><div class="t-pnum" id="pNum">--</div></div>'+
    '<div class="t-hb"><div class="t-cn" id="pName">—</div><div class="t-pt" id="pNow">—</div><div class="t-pd" id="pDesc"></div>'+
     '<div class="t-pbar"><i id="pBar"></i></div><div class="t-ptm"><span id="pStart"></span><span id="pEnd"></span></div>'+
     '<div class="t-acts"><button class="t-pa" id="bFav" onclick="TVUI.fav()">'+ic('star')+'Favori</button><button class="t-pa" id="bMute" onclick="TVUI.mute()">'+ic('vol')+'Sessiz</button><button class="t-pa" onclick="TVUI.watch()">'+ic('full')+'Tam ekran</button><button class="t-pa" onclick="TVUI.detail()">'+ic('info')+'Bilgi</button><button class="t-pa" onclick="TVUI.scan()">'+ic('scan')+'Kanal tara</button></div></div>'+
  '</div><div class="t-side">'+
    '<div class="t-sc" style="--cc:rgba(79,195,247,.6)"><div class="t-sl">ŞİMDİ OYNUYOR</div><div><div class="t-sb" id="sNum">--</div><div style="display:inline-block;width:calc(100% - 80px)"><div class="t-st" id="sNow">—</div><div class="t-ss" id="sDesc"></div><div class="t-tm" id="sTm">—</div></div></div></div>'+
    '<div class="t-sc" style="--cc:rgba(255,180,84,.6)"><div class="t-sl">SONRAKİ</div><div class="t-nx"><div class="t-nt" id="nTm">--:--</div><div><div class="t-st" id="nTt" style="font-size:14px;font-weight:500">—</div></div></div></div>'+
    '<div class="t-sc" style="--cc:rgba(61,220,151,.6)"><div class="t-sl">YAYIN BİLGİSİ</div><div id="iKv"></div></div>'+
  '</div></div>'+
  '<div class="t-pane" id="tPane"></div>'+
  '<div class="t-chs"><div class="t-ch"><div class="a">Kanallar</div><div class="b" id="tCount"></div><div class="t-fl" id="tFl">'+
    [['all','Tümü'],['fav','★ Favoriler'],['hd','HD'],['tv','TV'],['radio','Radyo']].map(a=>'<button class="t-chip'+(a[0]==='all'?' on':'')+'" data-f="'+a[0]+'" onclick="TVUI.filter(\''+a[0]+'\')">'+a[1]+'</button>').join('')+
  '</div></div><div class="t-rail" id="tRail"></div></div>'+
  '<div class="t-osd" id="tOsd"></div><div class="t-numbox" id="tNumBox"></div><div class="t-stat" id="tStat"></div>';
  document.body.appendChild(d)}

/* ---------- Önizleme / kartlar ---------- */
function upd(){
  const c=cur(),T=$t('tv');if(!c||!T)return;const k=col(c);
  T.style.setProperty('--c1',k.c1);T.style.setProperty('--c2',k.c2);T.style.setProperty('--bgc',k.bg);
  const nn=nowNext(c.id),n=nn.now,x=nn.next;
  $t('pNum').textContent=c.num;$t('pLogo').textContent=c.name;$t('pName').textContent=c.name+(isHd(c)?' · HD':'');
  $t('pNow').textContent=n?n.t:(c.radio?'Radyo yayını':'Program bilgisi yok');
  $t('pDesc').textContent=n?(n.d||''):'';
  $t('pStart').textContent=n?fmt(n.s):'';$t('pEnd').textContent=n?fmt(n.e):'';$t('pBar').style.width=pct(n)+'%';
  $t('sNum').textContent=c.num;$t('sNow').textContent=n?n.t:'—';$t('sDesc').textContent=n?(n.d||''):'';
  $t('sTm').textContent=n?fmt(n.s)+' – '+fmt(n.e)+' · %'+Math.round(pct(n)):'EPG verisi yok';
  $t('nTm').textContent=x?fmt(x.s):'--:--';$t('nTt').textContent=x?x.t:'—';
  const inp=((TV.st&&TV.st.inputs)||[]).find(i=>i.id===c.in);
  const kv=[['Kanal no',c.num],['Giriş',inp?inp.label:(c.in||'—').split('/').pop()],['Yayın türü',tname(c.type)],['Görüntü',(c.vf||'—').replace('VIDEO_FORMAT_','')],['Hizmet',c.radio?'Radyo':'TV'],['Kilit',c.lock?'Kilitli':'Açık']];
  $t('iKv').innerHTML=kv.map(a=>'<div class="t-kv"><span>'+a[0]+'</span><span>'+esc(a[1])+'</span></div>').join('');
  $t('bFav').classList.toggle('on',favs().includes(c.id));
  sig()}
function sig(){
  const T=$t('tv');if(!T)return;T.classList.toggle('vid',TV.vid);
  const m=TV.fail==='timeout'?'Görüntü gelmedi: sinyal yok ya da cihaz uygulama içi oynatmaya izin vermiyor':TV.fail?'Uygulama içinde açılamadı':(REASON[TV.reason]||'Kanal ayarlanıyor…');
  $t('pSt').textContent=m;$t('pFailBox').style.display=TV.vid?'none':'';
  const b=$t('tStat');b.textContent=TV.vid?'':m;b.classList.toggle('show',!TV.vid&&TV.watch)}
function focusFail(){if(TV.watch)return;const e=$t('pFail');if(e&&e.getClientRects().length)focusEl(e)}
function chanHtml(c){
  const k=col(c),n=nowNext(c.id).now,fav=favs().includes(c.id);
  const lg=TV.logos[c.id]?'<img src="data:image/png;base64,'+TV.logos[c.id]+'" alt="">':esc(c.name);
  return '<div class="t-chan'+(c.id===TV.curId?' on':'')+'" tabindex="0" data-id="'+c.id+'" style="--cc:'+k.c1+';--cc2:'+k.c2+'" onclick="TVUI.pick('+c.id+')">'+
   '<div class="t-r1"><div class="t-n">'+esc(c.num)+'</div>'+(fav?'<div class="t-fv">★</div>':'')+'</div><div class="t-lg" data-lg="'+c.id+'">'+lg+'</div>'+
   '<div><div class="t-now">'+esc(n?n.t:(c.radio?'Radyo':'Program bilgisi yok'))+'</div><div class="t-mini"><i style="--p:'+pct(n)+'%"></i></div></div></div>'}
function renderRail(focusId){
  const L=TV.list,ci=curIdx(),R=$t('tRail');if(!R)return;
  if(ci>=0&&(ci<TV.rf||ci>=TV.rf+WIN))TV.rf=Math.max(0,ci-4);
  TV.rf=Math.max(0,Math.min(TV.rf,Math.max(0,L.length-WIN)));
  const sl=L.slice(TV.rf,TV.rf+WIN);
  let h='';
  if(!L.length)h='<div class="t-empty">Bu filtrede kanal yok</div>';
  else{
    if(TV.rf>0)h+='<div class="t-chan" tabindex="0" onclick="TVUI.page(-1)"><div class="t-r1"><div class="t-n">‹</div></div><div class="t-lg">Önceki</div><div><div class="t-now">'+(TV.rf)+' kanal geride</div></div></div>';
    h+=sl.map(chanHtml).join('');
    if(TV.rf+WIN<L.length)h+='<div class="t-chan" tabindex="0" onclick="TVUI.page(1)"><div class="t-r1"><div class="t-n">›</div></div><div class="t-lg">Sonraki</div><div><div class="t-now">'+(L.length-TV.rf-WIN)+' kanal daha</div></div></div>'}
  R.innerHTML=h;
  $t('tCount').textContent=L.length+' KANAL · '+favs().length+' FAVORİ';
  loadProgs(sl.map(c=>c.id));loadLogos(sl);
  if(focusId!=null){const e=R.querySelector('[data-id="'+focusId+'"]');if(e)focusEl(e)}}
async function loadLogos(sl){
  if(TV.logoBusy)return;TV.logoBusy=true;
  try{for(const c of sl){if(!TV.on)break;if(TV.logos[c.id]!==undefined)continue;
    const r=await N('tvLogo',{id:c.id});TV.logos[c.id]=(r&&r.d)||0;
    if(r&&r.d){const e=document.querySelector('#tRail [data-lg="'+c.id+'"]');if(e)e.innerHTML='<img src="data:image/png;base64,'+r.d+'" alt="">'}}}
  catch(e){}TV.logoBusy=false}
function refresh(){
  document.querySelectorAll('#tRail .t-chan[data-id]').forEach(e=>{const id=+e.dataset.id,c=TV.all.find(x=>x.id===id);if(!c)return;const n=nowNext(id).now;
    e.querySelector('.t-now').textContent=n?n.t:(c.radio?'Radyo':'Program bilgisi yok');e.querySelector('.t-mini i').style.setProperty('--p',pct(n)+'%')});
  upd();if(TV.tab==='guide')renderGuide(true);if(TV.watch&&$t('tOsd').classList.contains('show'))osd()}

/* ---------- Kanal işlemleri ---------- */
function applyFilter(){const f=TV.filter,fv=favs();TV.list=TV.all.filter(c=>f==='fav'?fv.includes(c.id):f==='hd'?isHd(c):f==='radio'?c.radio:f==='tv'?!c.radio:true)}
function tune(id){
  const c=TV.all.find(x=>x.id===id);if(!c)return;
  if(TV.curId!==id)TV.prevId=TV.curId;TV.curId=id;TV.tuned=true;TV.vid=false;TV.reason=1;TV.fail='';
  S.tvLast=id;save();N('tvTune',{id:c.id,input:c.in});upd();loadProgs([id]);
  clearTimeout(TV.tt);TV.tt=setTimeout(()=>{if(TV.on&&!TV.vid&&!TV.fail&&TV.reason!==4){TV.fail='timeout';sig();focusFail()}},8000);
  document.querySelectorAll('#tRail .t-chan[data-id]').forEach(e=>e.classList.toggle('on',+e.dataset.id===id));
  if(TV.watch)osd()}
function step(d){const L=TV.list.length?TV.list:TV.all;if(!L.length)return;let i=L.findIndex(c=>c.id===TV.curId);i=i<0?0:(i+d+L.length)%L.length;tune(L[i].id)}
function focusCur(){const e=document.querySelector('#tRail .t-chan.on')||document.querySelector('#tRail .t-chan');if(e)focusEl(e)}

/* ---------- Tam ekran + OSD ---------- */
function enterWatch(){if(!TV.tuned)return;TV.watch=true;$t('tv').classList.add('watch');if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();sendRect();osd();sig()}
function exitWatch(){TV.watch=false;$t('tv').classList.remove('watch');$t('tOsd').classList.remove('show');$t('tStat').classList.remove('show');setTimeout(()=>{sendRect();renderRail(TV.curId)},80)}
function osd(){
  const c=cur(),e=$t('tOsd');if(!c||!e)return;const nn=nowNext(c.id),n=nn.now,x=nn.next;
  e.innerHTML='<div class="t-on">'+esc(c.num)+'</div><div class="t-oi"><div class="t-oc">'+esc(c.name)+(isHd(c)?'<span>HD</span>':'')+'</div><div class="t-ot">'+esc(n?n.t:'Program bilgisi yok')+'</div>'+
   (n?'<div class="t-ob"><i style="width:'+pct(n)+'%"></i></div><div class="t-os">'+fmt(n.s)+' – '+fmt(n.e)+(x?'   •   Sonraki: '+esc(x.t):'')+'</div>':'')+'</div>';
  e.classList.add('show');clearTimeout(TV.ot);TV.ot=setTimeout(()=>e.classList.remove('show'),4500)}
function digit(n){
  TV.num=(TV.num+n).slice(-4);const b=$t('tNumBox');b.textContent=TV.num;b.classList.add('show');clearTimeout(TV.nt);
  TV.nt=setTimeout(()=>{const v=TV.num;TV.num='';b.classList.remove('show');const c=TV.all.find(x=>String(x.num)===v)||TV.all.find(x=>String(x.num)===String(parseInt(v,10)));if(c)tune(c.id);else toast('❌','Kanal bulunamadı: '+v)},1800)}

/* ---------- Konum (video penceresi) ---------- */
function sendRect(){
  if(!TV.on)return;const d=window.devicePixelRatio||1;
  if(TV.watch){N('tvRect',{x:0,y:0,w:0,h:0});return}
  if(TV.tab==='now'){const h=$t('pHole');if(h){const r=h.getBoundingClientRect();if(r.width>10&&r.height>10){N('tvRect',{x:Math.round(r.left*d),y:Math.round(r.top*d),w:Math.round(r.width*d),h:Math.round(r.height*d)});return}}}
  N('tvRect',{x:0,y:0,w:2,h:2})}

/* ---------- Sekmeler ---------- */
function setTab(t){
  TV.tab=t;const T=$t('tv');T.classList.remove('tab-now','tab-guide','tab-search','tab-setup');T.classList.add('tab-'+t);
  T.querySelectorAll('.t-tab').forEach(e=>e.classList.toggle('on',e.dataset.t===t));
  if(t==='guide')renderGuide();else if(t==='search')renderSearch();
  requestAnimationFrame(()=>setTimeout(sendRect,60))}
function rowHtml(c,i){
  const nn=nowNext(c.id),n=nn.now,x=nn.next;
  return '<div class="t-row'+(c.id===TV.curId?' on':'')+'" tabindex="0" data-id="'+c.id+'" onclick="TVUI.gpick('+c.id+')"><div class="t-rn">'+esc(c.num)+'</div><div class="t-rc">'+esc(c.name)+'</div>'+
   '<div class="t-rp"><div class="x">'+esc(n?n.t:'Program bilgisi yok')+'</div>'+(n?'<div class="y">'+fmt(n.s)+' – '+fmt(n.e)+'</div><div class="z"><i style="width:'+pct(n)+'%"></i></div>':'')+'</div>'+
   '<div class="t-rp nx"><div class="x">'+esc(x?x.t:'')+'</div>'+(x?'<div class="y">'+fmt(x.s)+' – '+fmt(x.e)+'</div>':'')+'</div></div>'}
function renderGuide(keep){
  const L=TV.list,P=$t('tPane');let fid=null;
  if(keep){const a=document.activeElement;if(a&&a.classList&&a.classList.contains('t-row')&&a.dataset.id)fid=a.dataset.id;else if(a&&a.dataset&&a.dataset.pg)fid='pg'+a.dataset.pg}
  if(TV.gs<0||TV.gs>=L.length)TV.gs=Math.max(0,curIdx()-2);
  const sl=L.slice(TV.gs,TV.gs+GWIN);
  let h='<div class="t-ptt">Program Rehberi</div>';
  if(TV.gs>0)h+='<div class="t-row pg" tabindex="0" data-pg="-1" onclick="TVUI.gpage(-1)">‹ Önceki '+GWIN+' kanal</div>';
  h+=sl.map(rowHtml).join('');
  if(TV.gs+GWIN<L.length)h+='<div class="t-row pg" tabindex="0" data-pg="1" onclick="TVUI.gpage(1)">Sonraki '+GWIN+' kanal ›</div>';
  if(!L.length)h+='<div class="t-empty">Bu filtrede kanal yok</div>';
  P.innerHTML=h;loadProgs(sl.map(c=>c.id));
  if(fid){const e=fid.indexOf('pg')===0?P.querySelector('[data-pg="'+fid.slice(2)+'"]'):P.querySelector('[data-id="'+fid+'"]');if(e)focusEl(e)}
  else if(!keep){const e=P.querySelector('.t-row.on')||P.querySelector('.t-row');if(e)focusEl(e)}}
function renderSearch(){
  const q=(TV.q||'').toLowerCase().trim(),P=$t('tPane');let res='';
  if(q){
    const ch=TV.all.filter(c=>c.name.toLowerCase().includes(q)||String(c.num)===q).slice(0,25);
    res+=ch.map(rowHtml).join('');
    const seen={};let pr='';
    for(const id in TV.prog){const c=TV.all.find(x=>x.id===+id);if(!c)continue;for(const p of TV.prog[id].l){if(p.e>Date.now()&&p.t.toLowerCase().includes(q)&&!seen[id+p.s]&&Object.keys(seen).length<25){seen[id+p.s]=1;
      pr+='<div class="t-row" tabindex="0" onclick="TVUI.gpick('+c.id+')"><div class="t-rn">'+esc(c.num)+'</div><div class="t-rc">'+esc(c.name)+'</div><div class="t-rp"><div class="x">'+esc(p.t)+'</div><div class="y">'+fmt(p.s)+' – '+fmt(p.e)+'</div></div><div></div></div>'}}}
    res+=pr;if(!res)res='<div class="t-empty">Sonuç yok. Program araması yalnızca yüklenmiş rehber verisinde yapılır (Rehber sekmesinde gezdikçe dolar).</div>'}
  P.innerHTML='<div class="t-ptt">Ara</div><div class="t-btn b" id="tAsk" tabindex="0" onclick="TVUI.askQ()">'+esc(TV.q||'Kanal veya program adı yaz…')+'</div>'+res;
  const e=$t('tAsk');if(e)focusEl(e)}

/* ---------- Kurulum / hata ekranları ---------- */
function showSetup(kind){
  setTab('setup');const P=$t('tPane'),inp=(TV.st&&TV.st.inputs)||[],tu=inp.filter(i=>i.tuner);let h='<div class="t-box">';
  if(kind==='perm')h+='<h2>İzin gerekli</h2><p>Kanal ve program listesini okumak için “TV listelerini oku” (READ_TV_LISTINGS) izni gerekir. ADB/Shizuku bağlıysa tek dokunuşla verilir; değilse sistem izin penceresi açılır.</p><div class="t-btn b" tabindex="0" onclick="TVUI.grant()">İzin ver</div><div class="t-btn" tabindex="0" onclick="TVUI.retry()">Tekrar dene</div>';
  else if(kind==='scan')h+='<h2>Kanal listesi boş</h2><p>Bu cihazda tuner girişi var ama henüz kanal bulunamadı. Sistemin kanal tarama ekranı açılır; uydu ayarları (LNB, DiSEqC, transponder) ve tarama orada yapılır. İşin bitince bu ekrana dönülür.</p>'+
    tu.map(i=>'<div class="t-btn b" tabindex="0" onclick="TVUI.scanIn('+JSON.stringify(i.id).replace(/"/g,'&quot;')+')">Kanal tara: '+esc(i.label)+'</div>').join('')+'<div class="t-btn" tabindex="0" onclick="TVUI.retry()">Yenile</div>';
  else h+='<h2>Tuner bulunamadı</h2><p>Bu cihazda uygulamaların kullanabildiği bir TV tuner girişi (DVB-S/S2/T/C) görünmüyor. Gerçek uydu yayını için cihazın dahili tuner’ı olmalı ve üreticinin TV Input servisini sunması gerekir; harici USB tuner ya da yalnızca internet tabanlı Android TV kutularında bu bölüm çalışmaz.</p>'+
    (inp.length?'<p>Görünen girişler: '+inp.map(i=>esc(i.label)).join(', ')+'</p>':'')+'<div class="t-btn" tabindex="0" onclick="TVUI.retry()">Tekrar dene</div>';
  P.innerHTML=h+'<div class="t-btn" tabindex="0" onclick="TVUI.diag()">Tanı</div><div class="t-btn" tabindex="0" onclick="TVUI.close()">Kapat</div></div>';
  const e=P.querySelector('.t-btn');if(e)focusEl(e)}
async function load(){
  const st=await N('tvState');TV.st=st;
  if(!st||!st.perm){showSetup('perm');return}
  const r=await N('tvChannels'),it=(r&&r.items)||[];
  it.sort((a,b)=>{const x=parseFloat(a.num),y=parseFloat(b.num);return((isNaN(x)?1e9:x)-(isNaN(y)?1e9:y))||String(a.name).localeCompare(String(b.name),'tr')});
  TV.all=it;
  if(!it.length){showSetup((st.inputs||[]).some(i=>i.tuner)?'scan':'notuner');return}
  applyFilter();setTab('now');
  const c=it.find(x=>x.id===S.tvLast)||TV.list[0]||it[0];TV.curId=c.id;TV.rf=0;renderRail();upd();
  setTimeout(()=>{sendRect();tune(c.id);focusCur()},150)}

/* ---------- Aç / kapat ---------- */
function open(){build();if(TV.on)return;TV.on=true;TV.watch=false;document.body.classList.add('tvon');$t('tv').classList.remove('watch');N('tvMode',{on:true});clock();load()}
function close(){
  if(!TV.on)return;TV.on=false;TV.watch=false;TV.tuned=false;TV.vid=false;
  document.body.classList.remove('tvon');$t('tv').classList.remove('watch');N('tvStop');N('tvMode',{on:false});
  setTimeout(()=>{const b=document.querySelector('.topbar [data-tvbtn]');if(b)focusEl(b)},60)}
function clock(){const e=$t('tClk');if(e)e.textContent=new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}
setInterval(()=>{if(!TV.on)return;clock();const c=cur();if(c){const n=nowNext(c.id).now;if(n){$t('pBar').style.width=pct(n)+'%'}}document.querySelectorAll('#tRail .t-chan[data-id]').forEach(e=>{const n=nowNext(+e.dataset.id).now;e.querySelector('.t-mini i').style.setProperty('--p',pct(n)+'%')})},15000);
window.addEventListener('resize',()=>{if(TV.on)setTimeout(sendRect,300)});

/* ---------- Dışa açık işlemler ---------- */
window.TVUI={
  open,close,
  tab:t=>setTab(t),
  pick:id=>{if(id===TV.curId&&TV.tuned)enterWatch();else tune(id)},
  gpick:id=>{setTab('now');TV.rf=0;const i=TV.list.findIndex(c=>c.id===id);if(i<0){TV.filter='all';applyFilter()}tune(id);renderRail(id);setTimeout(enterWatch,200)},
  watch:enterWatch,
  page:d=>{TV.rf=Math.max(0,TV.rf+d*WIN);renderRail();const e=document.querySelector('#tRail .t-chan[data-id]');if(e)focusEl(e)},
  gpage:d=>{TV.gs=Math.max(0,TV.gs+d*GWIN);renderGuide();const e=$t('tPane').querySelector('.t-row[data-id]');if(e)focusEl(e)},
  filter:f=>{TV.filter=f;applyFilter();TV.rf=0;TV.gs=-1;document.querySelectorAll('#tv .t-chip').forEach(e=>e.classList.toggle('on',e.dataset.f===f));renderRail()},
  fav:()=>{const c=cur();if(!c)return;const a=favs(),i=a.indexOf(c.id);if(i>=0)a.splice(i,1);else a.push(c.id);save();applyFilter();renderRail();upd();toast('⭐',c.name+(i>=0?' favorilerden çıkarıldı':' favorilere eklendi'))},
  mute:()=>{TV.muted=!TV.muted;N('tvMute',{m:TV.muted});$t('bMute').innerHTML=ic(TV.muted?'mute':'vol')+(TV.muted?'Ses aç':'Sessiz')},
  detail:()=>{const c=cur();if(!c)return;const n=nowNext(c.id),p=n.now;info(c.num+' · '+c.name,(p?p.t+'\n'+fmt(p.s)+' – '+fmt(p.e)+(p.g?'  ('+p.g+')':'')+'\n\n'+(p.d||'Açıklama yok'):'Bu kanal için program bilgisi yok.')+'\n\nYayın: '+tname(c.type)+' • '+(c.vf||'-')+(n.next?'\nSonraki: '+fmt(n.next.s)+' '+n.next.t:''))},
  ext:()=>{const c=cur();if(c)N('tvExternal',{id:c.id})},
  scan:()=>{const tu=((TV.st&&TV.st.inputs)||[]).filter(i=>i.tuner&&i.setup);if(!tu.length){toast('❌','Kurulum ekranı sunan tuner girişi yok');return}if(tu.length===1)TVUI.scanIn(tu[0].id);else menu('Kanal tara',tu.map(i=>[i.label,()=>TVUI.scanIn(i.id)]))},
  scanIn:async id=>{const r=await N('tvSetup',{input:id});if(!r||!r.ok)toast('❌',(r&&r.error)||'Açılamadı')},
  diag:async()=>{const st=await N('tvState');let d='İzin (READ_TV_LISTINGS): '+(st.perm?'var':'YOK')+'\nTV girişleri: '+((st.inputs||[]).map(i=>i.label+' ['+(i.tuner?'TUNER':i.type)+'] '+i.id).join('; ')||'yok')+'\nKanal sayısı: '+TV.all.length+'\nSon TvView olayı: '+(TV.last||'yok');
    try{if(await adbReady()){const r=await N('adb',{c:'dumpsys tv_input | head -n 25'});d+='\n\n'+String(r.out||'').slice(0,700)}}catch(e){}info('Canlı TV tanı',d)},
  retry:()=>load(),
  grant:async()=>{let ok=false;try{if(await adbReady()){const r=await N('adb',{c:'pm grant com.ihlauncher.tv android.permission.READ_TV_LISTINGS'});ok=r.code===0}}catch(e){}if(ok){load();return}N('tvPerm');toast('⏳','İzin penceresi açılıyor…')},
  askQ:async()=>{const v=await ask('Kanal veya program adı',TV.q||'');if(v!==null){TV.q=v;renderSearch()}}
};
window.__tvPerm=()=>{if(TV.on)load()};
window.__tvEv=(t,d)=>{if(!TV.on)return;TV.last=t+':'+d;if(t==='video'){TV.vid=true;TV.fail='';clearTimeout(TV.tt)}else if(t==='novideo'){TV.vid=false;TV.reason=+d}else{TV.vid=false;TV.fail=t;clearTimeout(TV.tt);focusFail()}sig()};

/* ---------- Tuş yönetimi: tam ekran izlerken kanal değiştirme ---------- */
const COL={183:1,184:1,185:1,186:1,403:1,404:1,405:1,406:1};
window.addEventListener('keydown',e=>{
  if(!TV.on)return;
  if($('#dlg').classList.contains('show')||$('#modal').classList.contains('show'))return;
  const a=document.activeElement;if(a&&a.tagName==='INPUT'&&!a.readOnly)return;
  const k=e.key,c=e.keyCode;let h=true;
  if(/^[0-9]$/.test(k)&&!e.ctrlKey&&!e.altKey&&TV.all.length&&TV.tab==='now')digit(k);
  else if(TV.watch){
    if(k==='ArrowUp'||k==='ChannelUp'||k==='PageUp'||c===166||c===92)step(1);
    else if(k==='ArrowDown'||k==='ChannelDown'||k==='PageDown'||c===167||c===93)step(-1);
    else if(k==='ArrowLeft'){if(TV.prevId!=null)tune(TV.prevId)}
    else if(k==='ArrowRight'||k==='Info'||k==='i'||c===165)osd();
    else if(k==='Enter'||k==='MediaPlayPause')exitWatch();
    else if(COL[c])h=true;
    else h=false}
  else if(TV.tab==='now'&&(k==='ChannelUp'||c===166||k==='PageUp'||c===92)){step(1)}
  else if(TV.tab==='now'&&(k==='ChannelDown'||c===167||k==='PageDown'||c===93)){step(-1)}
  else h=false;
  if(h){e.preventDefault();e.stopImmediatePropagation()}},true);

/* ---------- Launcher'a bağlama ---------- */
const _layer=layer;layer=function(){const x=_layer();return x||(TV.on?$t('tv'):null)};
const _back=window.__back;
window.__back=function(){
  if($('#dlg').classList.contains('show')||$('#modal').classList.contains('show'))return _back();
  if(TV.on){if(TV.watch){exitWatch();return true}if(TV.tab==='guide'||TV.tab==='search'){setTab('now');setTimeout(focusCur,100);return true}close();return true}
  return _back()};
const _res=window.__resume;
window.__resume=function(){if(_res)_res();if(TV.on)setTimeout(()=>{if(TV.tab==='setup'||!TV.all.length)load();else{N('tvMode',{on:true});sendRect();if(TV.curId&&TV.tuned)tune(TV.curId)}},700)};
const _run=runAct;runAct=function(a){if(a==='tv'){closePanels();TVUI.open();return}_run(a)};
try{ACTS.tv=['','Canlı TV']}catch(e){}
(function(){const tr=document.querySelector('.topbar .tr');if(!tr)return;const b=document.createElement('div');b.className='ib';b.setAttribute('data-tvbtn','1');b.setAttribute('onclick','TVUI.open()');b.setAttribute('title','Canlı TV');
  b.innerHTML='<svg class="i" viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="13" rx="2.5"/><path d="M8 21h8M12 18v3"/></svg>';tr.insertBefore(b,tr.children[2]||null)})();
})();
