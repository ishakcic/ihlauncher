/* ihlauncher • Canlı TV v3 — her zaman tam ekran video + kumanda öncelikli arayüz.
 * Video (TvView) hiç yeniden boyutlanmaz; liste/rehber/seçenekler videonun ÜSTÜNE çizilir.
 * Tuşlar tamamen burada yönetilir (launcher'ın odak tahmini kullanılmaz); seçim JS durumundadır (.sel).
 * Kanal düzenleme (gizle/sil, taşı, adlandır, favori) S.tvx içinde kalıcıdır; sistem kanal veritabanı değiştirilmez. */
(function(){
'use strict';
const $t=id=>document.getElementById(id);
const TV={on:false,mode:'watch',all:[],sorted:[],vis:[],list:[],curKey:null,prevKey:null,tuned:false,vid:false,reason:1,fail:'',muted:false,
 filter:'all',sel:0,top:0,prog:{},logos:{},st:null,num:'',loading:false,move:null,csel:0,cbtn:1,cnf:null,gsel:0,gtop:0,osel:0,ssel:0,sitems:[],last:''};
const VIS=8,GVIS=8;
const FILT=[['all','Tümü'],['fav','★ Favori'],['hd','HD'],['tv','TV'],['radio','Radyo']];
const hue=s=>{let h=0;s=String(s);for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h)%360};
const col=c=>{const h=hue(c.name||c.id);return{c1:'hsl('+h+',66%,46%)',c2:'hsl('+((h+55)%360)+',58%,26%)'}};
const fmt=ms=>new Date(ms).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
const pct=p=>p?Math.max(0,Math.min(100,(Date.now()-p.s)/(p.e-p.s)*100)):0;
const REASON={0:'Görüntü yok',1:'Kanal ayarlanıyor…',2:'Sinyal zayıf veya yok',3:'Arabelleğe alınıyor…',4:'Yalnızca ses (radyo)'};
const isHd=c=>/720|1080|2160|4320/.test(c.vf||'');
const tname=t=>String(t||'').replace('TYPE_','').replace(/_/g,'-')||'—';
const ini=s=>String(s||'?').replace(/\s+/g,'').slice(0,3).toUpperCase();
const X=()=>S.tvx||(S.tvx={hide:{},order:[],name:{},fav:{},last:''});
const curCh=()=>TV.all.find(c=>c.key===TV.curKey)||null;
const selCh=()=>TV.list[TV.sel]||null;
const EDITM=['edit','move','ctx','cnf'];
const inList=()=>TV.mode==='list'||EDITM.indexOf(TV.mode)>=0;

/* ---------- Program (EPG) ---------- */
function nowNext(c){const p=c&&TV.prog[c.id],l=p?p.l:[],n=Date.now(),i=l.findIndex(x=>x.s<=n&&x.e>n);return{now:i>=0?l[i]:null,next:i>=0?(l[i+1]||null):(l.find(x=>x.s>n)||null),all:l}}
async function loadProgs(ids){
  ids=ids.filter(id=>{const p=TV.prog[id];return !p||Date.now()-p.t>300000});if(!ids.length)return;
  ids.forEach(id=>{TV.prog[id]={t:Date.now(),l:(TV.prog[id]||{l:[]}).l}});
  const r=await N('tvPrograms',{ids,from:Date.now()-3*3600e3,to:Date.now()+14*3600e3});
  const m=(r&&r.map)||{};for(const k in m)TV.prog[k]={t:Date.now(),l:m[k]};
  if(TV.on)refresh()}
async function loadLogos(sl){
  if(TV.logoBusy)return;TV.logoBusy=true;
  try{for(const c of sl){if(!TV.on)break;if(TV.logos[c.id]!==undefined)continue;
    const r=await N('tvLogo',{id:c.id});TV.logos[c.id]=(r&&r.d)||0;
    if(r&&r.d)document.querySelectorAll('[data-lg="'+c.id+'"]').forEach(e=>e.innerHTML='<img src="data:image/png;base64,'+r.d+'" alt="">')}}
  catch(e){}TV.logoBusy=false}

/* ---------- Kanal modeli: anahtar, sıra, gizleme, ad, favori ---------- */
function prep(items){
  const seen={};
  items.forEach((c,i)=>{c.i=i;let k=(c.onid>=0&&c.tsid>=0&&c.sid>=0)?(c.onid+'-'+c.tsid+'-'+c.sid):((c.in||'')+'|'+c.name);
    if(seen[k]){seen[k]++;k+='#'+seen[k]}else seen[k]=1;c.key=k})}
function migrate(){const x=X();
  if(!x._m&&S.tvFav&&S.tvFav.length){S.tvFav.forEach(id=>{const c=TV.all.find(q=>q.id===id);if(c)x.fav[c.key]=1});
    if(S.tvLast&&!x.last){const c=TV.all.find(q=>q.id===S.tvLast);if(c)x.last=c.key}x._m=1;save()}}
function rebuild(){
  const x=X(),pos={};x.order.forEach((k,i)=>{pos[k]=i});
  TV.sorted=TV.all.slice().sort((a,b)=>{const pa=pos[a.key],pb=pos[b.key];if(pa!=null&&pb!=null)return pa-pb;if(pa!=null)return-1;if(pb!=null)return 1;return a.i-b.i});
  TV.all.forEach(c=>{c.dn=x.name[c.key]||c.name});
  TV.vis=TV.sorted.filter(c=>!x.hide[c.key]);TV.vis.forEach((c,i)=>{c.n=i+1});
  filterList()}
function filterList(){
  const f=TV.filter,x=X();
  TV.list=TV.vis.filter(c=>f==='fav'?x.fav[c.key]:f==='hd'?isHd(c):f==='radio'?c.radio:f==='tv'?!c.radio:true);
  if(TV.sel>=TV.list.length)TV.sel=Math.max(0,TV.list.length-1)}
function save2(){save()}

/* ---------- Oluşturma ---------- */
function build(){
  if($t('tv'))return;
  const d=document.createElement('div');d.id='tv';d.dataset.m='watch';
  d.innerHTML=
  '<div class="t-ban" id="tBan"></div>'+
  '<div class="t-lp" id="tList"><div class="t-lh"><div class="t-lt">Kanallar</div><div class="t-ledit">DÜZENLE</div><div class="t-lc" id="lCnt"></div><div class="t-clk" id="lClk"></div></div>'+
   '<div class="t-chips" id="lChips"></div><div class="t-rowsw"><div class="t-rows" id="lRows"></div><div class="t-sb"><i id="lBar"></i></div></div>'+
   '<div class="t-det" id="lDet"></div><div class="t-hints" id="lHints"></div></div>'+
  '<div class="t-gd" id="tGuide"></div>'+
  '<div class="t-op" id="tOpts"></div>'+
  '<div class="t-su" id="tSetup"></div>'+
  '<div class="t-ctx" id="tCtx"></div><div class="t-cnf" id="tCnf"></div>'+
  '<div class="t-numbox" id="tNum"></div><div class="t-stat" id="tStat"></div><div class="t-tip" id="tTip"></div>';
  document.body.appendChild(d)}
function setMode(m){
  TV.mode=m;const T=$t('tv');T.dataset.m=m;
  T.classList.toggle('v-list',inList());T.classList.toggle('ed',EDITM.indexOf(m)>=0);
  T.classList.toggle('v-guide',m==='guide');T.classList.toggle('v-opts',m==='opts');T.classList.toggle('v-setup',m==='setup');
  T.classList.toggle('v-ctx',m==='ctx');T.classList.toggle('v-cnf',m==='cnf');
  if(m!=='watch')T.classList.remove('ban');
  render();sig()}
function render(){
  if(inList())renderList();else if(TV.mode==='guide')renderGuide();else if(TV.mode==='opts')renderOpts();else if(TV.mode==='setup')renderSetup();
  if(TV.mode==='ctx')renderCtx();if(TV.mode==='cnf')renderCnf()}
function refresh(){if(!TV.on)return;render();if($t('tv').classList.contains('ban'))banner()}
function tip(t){const e=$t('tTip');e.textContent=t;e.classList.add('show');clearTimeout(TV.tpt);TV.tpt=setTimeout(()=>e.classList.remove('show'),2400)}

/* ---------- Kanal listesi ---------- */
function rowHtml(c,i){
  const k=col(c),n=nowNext(c).now,x=X(),on=c.key===TV.curKey,mv=TV.move&&TV.move.key===c.key;
  const lg=TV.logos[c.id]?'<img src="data:image/png;base64,'+TV.logos[c.id]+'" alt="">':esc(ini(c.dn));
  return '<div class="t-r'+(i===TV.sel?' sel':'')+(on?' on':'')+(mv?' mv':'')+'" style="--cc:'+k.c1+';--cc2:'+k.c2+'" onclick="TVUI.row('+i+')"><div class="t-rn">'+c.n+'</div><div class="t-rl" data-lg="'+c.id+'">'+lg+'</div>'+
   '<div class="t-rt"><div class="t-rc">'+esc(c.dn)+(isHd(c)?'<span class="t-hd">HD</span>':'')+(x.fav[c.key]?'<span class="t-fv">★</span>':'')+'</div><div class="t-rg">'+esc(n?n.t:(c.radio?'Radyo yayını':'Program bilgisi yok'))+'</div><div class="t-rp"><i style="width:'+pct(n)+'%"></i></div></div>'+
   (mv?'<div class="t-mvi">↕</div>':(on?'<div class="t-eq"><i></i><i></i><i></i></div>':''))+'</div>'}
function hint(c,txt){return '<span class="t-h">'+(c?'<i class="'+c+'"></i>':'')+txt+'</span>'}
function renderList(){
  const L=TV.list;
  if(TV.sel>=L.length)TV.sel=Math.max(0,L.length-1);if(TV.sel<0)TV.sel=0;
  if(TV.sel<TV.top)TV.top=TV.sel;else if(TV.sel>=TV.top+VIS)TV.top=TV.sel-VIS+1;
  TV.top=Math.max(0,Math.min(TV.top,Math.max(0,L.length-VIS)));
  const sl=L.slice(TV.top,TV.top+VIS);
  $t('lRows').innerHTML=L.length?sl.map((c,j)=>rowHtml(c,TV.top+j)).join(''):'<div class="t-empty">'+(TV.filter==='fav'?'Favori kanal yok. Kırmızı tuşla ekle.':'Bu grupta kanal yok')+'</div>';
  $t('lChips').innerHTML=FILT.map(f=>'<div class="t-chip'+(TV.filter===f[0]?' on':'')+'" onclick="TVUI.chip(\''+f[0]+'\')">'+f[1]+'</div>').join('');
  $t('lCnt').textContent=L.length?(TV.sel+1)+' / '+L.length:'0';
  const bar=$t('lBar');bar.style.height=Math.max(8,Math.min(100,VIS/Math.max(VIS,L.length)*100))+'%';bar.style.top=(L.length>VIS?TV.top/(L.length-VIS)*(100-parseFloat(bar.style.height)):0)+'%';
  const c=selCh(),nn=c?nowNext(c):{now:null,next:null};
  $t('lDet').innerHTML=c?'<div class="t-dt">'+esc(nn.now?nn.now.t:'Program bilgisi yok')+'</div>'+(nn.now?'<div class="t-dm">'+fmt(nn.now.s)+' – '+fmt(nn.now.e)+'  ·  %'+Math.round(pct(nn.now))+'</div><div class="t-dd">'+esc(nn.now.d||'')+'</div>':'')+(nn.next?'<div class="t-dn">Sonraki  '+fmt(nn.next.s)+'  '+esc(nn.next.t)+'</div>':''):'';
  const m=TV.mode;
  $t('lHints').innerHTML=m==='move'?hint('', '<b>▲▼</b> Taşı')+hint('','<b>OK</b> Bırak')+hint('','<b>Geri</b> İptal')
   :(m==='list'?hint('','<b>◀▶</b> Grup')+hint('','<b>OK</b> İzle')+hint('r','Favori')+hint('g','Düzenle')+hint('y','Rehber')+hint('b','Seçenekler')
   :hint('','<b>OK</b> İşlemler')+hint('r','Sil')+hint('g','Taşı')+hint('y','Adlandır')+hint('b','Favori')+hint('','<b>Geri</b> Bitir'));
  loadProgs(sl.map(q=>q.id));loadLogos(sl);clock()}
function setFilter(f){TV.filter=f;filterList();const i=TV.list.findIndex(c=>c.key===TV.curKey);TV.sel=i>=0?i:0;TV.top=0;render()}
function moveSel(d){const n=TV.list.length;if(!n)return;TV.sel=(TV.sel+d+n)%n;render()}

/* ---------- Düzenleme ---------- */
function editFav(c){const x=X();if(x.fav[c.key]){delete x.fav[c.key];tip('Favorilerden çıkarıldı')}else{x.fav[c.key]=1;tip('★ Favorilere eklendi')}save();filterList();render()}
function startMove(c){setFilter('all');const x=X();x.order=TV.sorted.map(q=>q.key);TV.move={key:c.key,snap:x.order.slice()};TV.sel=TV.list.findIndex(q=>q.key===c.key);setMode('move')}
function doMove(d){
  const x=X(),v=TV.vis,i=v.findIndex(c=>c.key===TV.move.key),j=i+d;if(i<0||j<0||j>=v.length)return;
  const a=v[i].key,b=v[j].key,ia=x.order.indexOf(a),ib=x.order.indexOf(b);x.order[ia]=b;x.order[ib]=a;rebuild();TV.sel=TV.list.findIndex(c=>c.key===a);render()}
function endMove(ok){const x=X();if(!ok&&TV.move)x.order=TV.move.snap;TV.move=null;if(ok)save();rebuild();setMode('edit');if(ok)tip('Sıra kaydedildi')}
function askDelete(c){TV.cnf={t:'“'+c.dn+'” listeden kaldırılsın mı?',s:'Sistem kanal veritabanından silinmez; Seçenekler’den geri getirilebilir.',yes:()=>delCh(c)};TV.cbtn=1;setMode('cnf')}
function delCh(c){
  const x=X(),wasCur=c.key===TV.curKey;x.hide[c.key]=1;save();rebuild();
  if(wasCur){const nx=TV.vis[Math.min(TV.sel,TV.vis.length-1)];if(nx)tune(nx);else{N('tvStop');TV.tuned=false;TV.curKey=null}}
  setMode('edit');tip('Kanal kaldırıldı')}
async function rename(c){
  const v=await ask('Kanal adı',c.dn);if(v===null)return;const x=X(),t=String(v).trim();
  if(t&&t!==c.name)x.name[c.key]=t;else delete x.name[c.key];save();rebuild();render();tip('Ad güncellendi')}
function restoreAll(){const x=X(),n=Object.keys(x.hide).length;x.hide={};save();rebuild();tip(n?n+' kanal geri getirildi':'Gizli kanal yok')}
function resetOrder(){const x=X();x.order=[];x.name={};save();rebuild();tip('Sıra ve adlar sıfırlandı')}
const CTX=()=>{const c=selCh(),f=c&&X().fav[c.key];return[['Taşı','↕',()=>startMove(c)],['Adını değiştir','✎',()=>{setMode('edit');rename(c)}],[f?'Favoriden çıkar':'Favorilere ekle','★',()=>{setMode('edit');editFav(c)}],['Listeden kaldır','🗑',()=>askDelete(c)]]};
function renderCtx(){const c=selCh(),it=CTX();$t('tCtx').innerHTML='<div class="t-ct">'+esc(c?c.dn:'')+'</div>'+it.map((a,i)=>'<div class="t-ci'+(i===TV.csel?' sel':'')+'" onclick="TVUI.ctx('+i+')"><span>'+a[1]+'</span>'+a[0]+'</div>').join('')}
function renderCnf(){const k=TV.cnf||{t:'',s:''};$t('tCnf').innerHTML='<div class="t-cb"><div class="t-cq">'+esc(k.t)+'</div><div class="t-cs">'+esc(k.s||'')+'</div><div class="t-cbs"><div class="t-cbn'+(TV.cbtn===0?' sel':'')+'" onclick="TVUI.cnfPick(0)">Evet, kaldır</div><div class="t-cbn'+(TV.cbtn===1?' sel':'')+'" onclick="TVUI.cnfPick(1)">Vazgeç</div></div></div>'}

/* ---------- Rehber (EPG) ---------- */
function openGuide(){const i=TV.list.findIndex(c=>c.key===TV.curKey);TV.gsel=i>=0?i:0;TV.gtop=0;setMode('guide')}
function renderGuide(){
  const L=TV.list;if(!L.length){$t('tGuide').innerHTML='<div class="t-empty">Kanal yok</div>';return}
  if(TV.gsel>=L.length)TV.gsel=L.length-1;if(TV.gsel<TV.gtop)TV.gtop=TV.gsel;else if(TV.gsel>=TV.gtop+GVIS)TV.gtop=TV.gsel-GVIS+1;
  TV.gtop=Math.max(0,Math.min(TV.gtop,Math.max(0,L.length-GVIS)));
  const sl=L.slice(TV.gtop,TV.gtop+GVIS),c=L[TV.gsel],nn=nowNext(c);
  const rows=sl.map((q,j)=>{const i=TV.gtop+j,a=nowNext(q),n=a.now,x=a.next;
    return '<div class="t-gr'+(i===TV.gsel?' sel':'')+(q.key===TV.curKey?' on':'')+'" onclick="TVUI.grow('+i+')"><div class="t-rn">'+q.n+'</div><div class="t-gc">'+esc(q.dn)+'</div><div class="t-gp"><div class="x">'+esc(n?n.t:'Program bilgisi yok')+'</div>'+(n?'<div class="y">'+fmt(n.s)+' – '+fmt(n.e)+'</div><div class="z"><i style="width:'+pct(n)+'%"></i></div>':'')+'</div><div class="t-gp nx"><div class="x">'+esc(x?x.t:'')+'</div>'+(x?'<div class="y">'+fmt(x.s)+'</div>':'')+'</div></div>'}).join('');
  const up=nn.all.filter(p=>p.e>Date.now()).slice(0,8).map((p,i)=>'<div class="t-up'+(i===0?' now':'')+'"><b>'+fmt(p.s)+'</b><span>'+esc(p.t)+'</span></div>').join('')||'<div class="t-empty" style="padding:10px 0">Bu kanal için program bilgisi yok</div>';
  $t('tGuide').innerHTML='<div class="t-gh"><div class="t-lt">Program Rehberi</div><div class="t-lc">'+(TV.gsel+1)+' / '+L.length+'</div><div class="t-clk" id="gClk"></div></div><div class="t-gb"><div class="t-gl">'+rows+'</div><div class="t-gdet"><div class="t-gdn">'+c.n+' · '+esc(c.dn)+'</div>'+
    (nn.now?'<div class="t-gdt">'+esc(nn.now.t)+'</div><div class="t-gdm">'+fmt(nn.now.s)+' – '+fmt(nn.now.e)+'</div><div class="t-gdd">'+esc(nn.now.d||'')+'</div>':'<div class="t-gdt">Program bilgisi yok</div>')+'<div class="t-gul">Sıradaki programlar</div>'+up+'</div></div>'+
    '<div class="t-hints">'+hint('','<b>▲▼</b> Kanal')+hint('','<b>◀▶</b> Grup')+hint('','<b>OK</b> İzle')+hint('g','Düzenle')+hint('b','Seçenekler')+hint('','<b>Geri</b> Kapat')+'</div>';
  loadProgs(sl.map(q=>q.id).concat([c.id]));clock()}

/* ---------- Seçenekler ---------- */
function optItems(){
  const hid=Object.keys(X().hide).length;
  return[
   {t:TV.muted?'Sesi aç':'Sessiz',s:'Yayın sesini kapat / aç',fn:muteT},
   {t:'Kanal listesi',s:'Kanalları gez ve seç',fn:()=>setMode('list')},
   {t:'Program rehberi',s:'Şimdi / sonraki programlar',fn:openGuide},
   {t:'Kanalları düzenle',s:'Taşı · adlandır · kaldır · favori',fn:()=>setMode('edit')},
   {t:'Kanal tara',s:'Uydu ayarları ve kanal arama',fn:scan},
   {t:'Kaldırılanları geri getir'+(hid?' ('+hid+')':''),s:'Gizlenen kanalları listeye ekle',fn:restoreAll},
   {t:'Sırayı ve adları sıfırla',s:'Sistem sırasına dön',fn:resetOrder},
   {t:'Sistem TV uygulamasında aç',s:'Bu kanalı cihazın kendi TV ekranında göster',fn:()=>{const c=curCh();if(c)N('tvExternal',{id:c.id})}},
   {t:'Tanı',s:'İzin, giriş ve sinyal bilgisi',fn:diag},
   {t:'Canlı TV’den çık',s:'Ana ekrana dön',fn:close}]}
function renderOpts(){
  const it=optItems();if(TV.osel>=it.length)TV.osel=it.length-1;
  $t('tOpts').innerHTML='<div class="t-lt" style="margin-bottom:18px">Seçenekler</div>'+it.map((o,i)=>'<div class="t-oi'+(i===TV.osel?' sel':'')+'" onclick="TVUI.opt('+i+')"><div class="a">'+esc(o.t)+'</div><div class="b">'+esc(o.s)+'</div></div>').join('')+'<div class="t-hints">'+hint('','<b>▲▼</b> Seç')+hint('','<b>OK</b> Uygula')+hint('','<b>Geri</b> Kapat')+'</div>'}
function muteT(){TV.muted=!TV.muted;N('tvMute',{m:TV.muted});tip(TV.muted?'🔇 Ses kapalı':'🔊 Ses açık');if(TV.mode==='opts')render()}
function scan(){
  const tu=((TV.st&&TV.st.inputs)||[]).filter(i=>i.tuner&&i.setup);
  if(!tu.length){tip('Kurulum ekranı sunan tuner girişi yok');return}
  if(tu.length===1)scanIn(tu[0].id);else menu('Kanal tara',tu.map(i=>[i.label,()=>scanIn(i.id)]))}
async function scanIn(id){const r=await N('tvSetup',{input:id});if(!r||!r.ok)tip((r&&r.error)||'Açılamadı')}
async function diag(){
  const st=await N('tvState');let d='İzin (READ_TV_LISTINGS): '+(st.perm?'var':'YOK')+'\nTV girişleri: '+((st.inputs||[]).map(i=>i.label+' ['+(i.tuner?'TUNER':i.type)+'] '+i.id).join('; ')||'yok')+'\nKanal sayısı: '+TV.all.length+'\nSon TvView olayı: '+(TV.last||'yok');
  try{if(await adbReady()){const r=await N('adb',{c:'dumpsys tv_input | head -n 25'});d+='\n\n'+String(r.out||'').slice(0,700)}}catch(e){}info('Canlı TV tanı',d)}

/* ---------- Kurulum / hata ekranı ---------- */
function showSetup(kind){
  const inp=(TV.st&&TV.st.inputs)||[],tu=inp.filter(i=>i.tuner);let t='',p='',it=[];
  if(kind==='perm'){t='İzin gerekli';p='Kanal ve program listesini okumak için “TV listelerini oku” izni gerekir. ADB/Shizuku bağlıysa tek dokunuşla verilir; değilse sistem izin penceresi açılır.';it=[['İzin ver',grant],['Tekrar dene',load],['Kapat',close]]}
  else if(kind==='scan'){t='Kanal listesi boş';p='Tuner girişi var ama kanal bulunamadı. Sistemin kanal tarama ekranı açılır; uydu ayarları (LNB, DiSEqC, transponder) orada yapılır. Bitince bu ekrana dönülür.';
    it=tu.map(i=>['Kanal tara: '+i.label,()=>scanIn(i.id)]).concat([['Yenile',load],['Tanı',diag],['Kapat',close]])}
  else{t='Tuner bulunamadı';p='Uygulamaların kullanabildiği bir TV tuner girişi görünmüyor. Gerçek uydu yayını için cihazın dahili tuner’ı olmalı ve üretici TV Input servisini sunmalı.'+(inp.length?'\nGörünen girişler: '+inp.map(i=>i.label).join(', '):'');it=[['Tekrar dene',load],['Tanı',diag],['Kapat',close]]}
  TV.sitems=it;TV.ssel=0;TV.stitle=t;TV.stext=p;setMode('setup')}
function renderSetup(){
  $t('tSetup').innerHTML='<div class="t-sbx"><div class="t-lt" style="margin-bottom:14px">'+esc(TV.stitle)+'</div><p>'+esc(TV.stext).replace(/\n/g,'<br>')+'</p>'+TV.sitems.map((a,i)=>'<div class="t-sbn'+(i===TV.ssel?' sel':'')+'" onclick="TVUI.setup('+i+')">'+esc(a[0])+'</div>').join('')+'</div>'}
async function grant(){
  let ok=false;try{if(await adbReady()){await N('adb',{c:'pm grant com.ihlauncher.tv android.permission.READ_TV_LISTINGS'});ok=true}}catch(e){}
  if(ok){load();return}N('tvPerm');tip('İzin penceresi açılıyor…')}

/* ---------- Yükleme ---------- */
async function load(){if(TV.loading)return;TV.loading=true;try{await load0()}finally{TV.loading=false}}
async function load0(){
  const st=await N('tvState');TV.st=st;
  if(!st||!st.perm){showSetup('perm');return}
  const r=await N('tvChannels'),it=(r&&r.items)||[];
  it.sort((a,b)=>{const x=parseFloat(a.num),y=parseFloat(b.num);return((isNaN(x)?1e9:x)-(isNaN(y)?1e9:y))||String(a.name).localeCompare(String(b.name),'tr')});
  if(!it.length){TV.all=[];showSetup((st.inputs||[]).some(i=>i.tuner)?'scan':'notuner');return}
  prep(it);TV.all=it;migrate();rebuild();N('tvRect',{x:0,y:0,w:0,h:0});
  const x=X(),c=TV.all.find(q=>q.key===x.last&&!x.hide[q.key])||TV.vis[0];
  if(!c){setMode('opts');tip('Tüm kanallar kaldırılmış');return}
  setMode('watch');tune(c)}

/* ---------- Ayarlama / izleme ---------- */
function tune(c){
  if(!c)return;if(TV.curKey!==c.key)TV.prevKey=TV.curKey;TV.curKey=c.key;TV.tuned=true;TV.vid=false;TV.reason=1;TV.fail='';X().last=c.key;save();
  N('tvTune',{id:c.id,input:c.in});loadProgs([c.id]);sig();if(TV.mode==='watch')banner();else render();
  clearTimeout(TV.tt);TV.tt=setTimeout(()=>{if(TV.on&&!TV.vid&&!TV.fail&&TV.reason!==4){TV.fail='timeout';sig()}},8000)}
function step(d){const L=TV.list.some(c=>c.key===TV.curKey)?TV.list:TV.vis;if(!L.length)return;let i=L.findIndex(c=>c.key===TV.curKey);i=i<0?0:(i+d+L.length)%L.length;tune(L[i])}
function recall(){const c=TV.all.find(q=>q.key===TV.prevKey&&!X().hide[q.key]);if(c)tune(c)}
function banner(){
  const c=curCh(),T=$t('tv');if(!c||!T)return;const nn=nowNext(c),n=nn.now,x=nn.next,k=col(c),fv=X().fav[c.key];
  T.style.setProperty('--c1',k.c1);T.style.setProperty('--c2',k.c2);
  $t('tBan').innerHTML='<div class="t-bn">'+(c.n||'')+'</div><div class="t-bi"><div class="t-bc"><span class="t-live">CANLI</span>'+esc(c.dn)+(isHd(c)?'<span class="t-hd">HD</span>':'')+(fv?'<span class="t-fv">★</span>':'')+(TV.muted?'<span class="t-mu">🔇</span>':'')+'</div>'+
   '<div class="t-bt">'+esc(n?n.t:(c.radio?'Radyo yayını':'Program bilgisi yok'))+'</div>'+
   (n?'<div class="t-bp"><i style="width:'+pct(n)+'%"></i></div><div class="t-bm"><span>'+fmt(n.s)+'</span><span>'+fmt(n.e)+'</span></div>':'')+
   (x?'<div class="t-bx">Sonraki  <b>'+fmt(x.s)+'</b>  '+esc(x.t)+'</div>':'')+'</div><div class="t-bk">'+hint('','<b>OK</b> Liste')+hint('','<b>▲▼</b> Kanal')+hint('b','Seçenek')+'</div>';
  T.classList.add('ban');clearTimeout(TV.bt);TV.bt=setTimeout(()=>T.classList.remove('ban'),5500)}
function sig(){
  const T=$t('tv');if(!T)return;T.classList.toggle('vid',TV.vid);
  const e=$t('tStat');if(!e)return;
  const show=!TV.vid&&TV.mode==='watch'&&TV.tuned;
  let h='';
  if(TV.fail){h='<div class="t-sx">Görüntü gelmedi</div><div class="t-ss">Sinyal yok olabilir ya da cihaz uygulama içi oynatmaya izin vermiyor.<br>Mavi tuş › Seçenekler › “Sistem TV uygulamasında aç” / “Tanı”</div>'}
  else h='<div class="t-sp"></div><div class="t-sx">'+esc(REASON[TV.reason]||'Kanal ayarlanıyor…')+'</div>';
  e.innerHTML=h;e.classList.toggle('show',show)}
function digit(n){
  TV.num=(TV.num+n).slice(-4);const b=$t('tNum');b.textContent=TV.num;b.classList.add('show');clearTimeout(TV.nt);
  TV.nt=setTimeout(()=>{const v=parseInt(TV.num,10);TV.num='';b.classList.remove('show');const c=TV.vis.find(x=>x.n===v);if(c){if(TV.mode==='watch')tune(c);else{tune(c);TV.sel=Math.max(0,TV.list.findIndex(q=>q.key===c.key));render()}}else tip('Kanal bulunamadı: '+v)},1700)}

/* ---------- Aç / kapat ---------- */
function open(){build();if(TV.on)return;TV.on=true;document.body.classList.add('tvon');$t('tv').className='';N('tvMode',{on:true});N('tvRect',{x:0,y:0,w:0,h:0});TV.mode='watch';clock();load()}
function close(){
  if(!TV.on)return;TV.on=false;TV.tuned=false;TV.vid=false;TV.move=null;clearTimeout(TV.tt);clearTimeout(TV.bt);
  document.body.classList.remove('tvon');N('tvStop');N('tvMode',{on:false});
  setTimeout(()=>{const b=document.querySelector('.topbar [data-tvbtn]');if(b)focusEl(b)},60)}
function clock(){const t=new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});['lClk','gClk'].forEach(i=>{const e=$t(i);if(e)e.textContent=t})}
setInterval(()=>{if(!TV.on)return;clock();if(TV.mode!=='setup')refresh()},20000);

/* ---------- Tuşlar ---------- */
function keyName(e){
  const k=e.key,c=e.keyCode;
  if(k==='ArrowUp'||c===19)return'up';if(k==='ArrowDown'||c===20)return'down';if(k==='ArrowLeft'||c===21)return'left';if(k==='ArrowRight'||c===22)return'right';
  if(k==='Enter'||c===13||c===23||c===66)return'ok';
  if(c===183||c===403||k==='ColorF0Red'||k==='r')return'red';if(c===184||c===404||k==='ColorF1Green'||k==='g')return'green';
  if(c===185||c===405||k==='ColorF2Yellow'||k==='y')return'yellow';if(c===186||c===406||k==='ColorF3Blue'||k==='b')return'blue';
  if(c===82||k==='ContextMenu'||k==='F1'||k==='m')return'menu';if(c===165||k==='Info'||k==='i')return'info';if(c===172||k==='Guide')return'guide';
  if(c===166||k==='ChannelUp'||k==='PageUp'||c===92)return'chup';if(c===167||k==='ChannelDown'||k==='PageDown'||c===93)return'chdn';
  if(c===85||c===179||k==='MediaPlayPause')return'play';
  if(/^[0-9]$/.test(k)&&!e.ctrlKey&&!e.altKey)return k;
  return null}
function onKey(e){
  if(!TV.on)return;
  if($('#dlg').classList.contains('show')||$('#modal').classList.contains('show'))return;
  const a=document.activeElement;if(a&&a.tagName==='INPUT'&&!a.readOnly)return;
  const n=keyName(e);if(!n)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(e.type!=='keydown')return;
  try{act(n,e.repeat)}catch(err){console.error(err)}}
function act(n,rep){
  const m=TV.mode,dg=/^[0-9]$/.test(n);
  if(dg){if(m==='watch'||m==='list'||m==='edit')digit(n);return}
  if(m==='watch'){
    if(n==='up'||n==='chup')step(1);else if(n==='down'||n==='chdn')step(-1);
    else if(n==='left')recall();else if(n==='right'||n==='info'||n==='play')banner();
    else if(n==='ok'){TV.sel=Math.max(0,TV.list.findIndex(q=>q.key===TV.curKey));setMode('list')}
    else if(n==='red'){const c=curCh();if(c){const x=X();if(x.fav[c.key])delete x.fav[c.key];else x.fav[c.key]=1;save();banner();tip(x.fav[c.key]?'★ Favorilere eklendi':'Favorilerden çıkarıldı')}}
    else if(n==='green'){TV.sel=Math.max(0,TV.list.findIndex(q=>q.key===TV.curKey));setMode('edit')}
    else if(n==='yellow'||n==='guide')openGuide();
    else if(n==='blue'||n==='menu'){TV.osel=0;setMode('opts')}
    return}
  if(m==='list'||m==='edit'){
    const ed=m==='edit';
    if(n==='up')moveSel(-1);else if(n==='down')moveSel(1);else if(n==='chup')moveSel(-VIS);else if(n==='chdn')moveSel(VIS);
    else if(n==='left'&&!ed)stepFilter(-1);else if(n==='right'&&!ed)stepFilter(1);
    else if(n==='ok'){const c=selCh();if(!c)return;if(ed){TV.csel=0;setMode('ctx')}else{tune(c);setMode('watch');banner()}}
    else if(n==='red'){const c=selCh();if(c){if(ed)askDelete(c);else editFav(c)}}
    else if(n==='green'){if(ed){const c=selCh();if(c)startMove(c)}else setMode('edit')}
    else if(n==='yellow'){if(ed){const c=selCh();if(c)rename(c)}else openGuide()}
    else if(n==='blue'){if(ed){const c=selCh();if(c)editFav(c)}else{TV.osel=0;setMode('opts')}}
    else if(n==='menu'){TV.osel=0;setMode('opts')}
    else if(n==='guide')openGuide();
    return}
  if(m==='move'){
    if(n==='up'||n==='chup')doMove(-1);else if(n==='down'||n==='chdn')doMove(1);else if(n==='ok'||n==='green')endMove(true);return}
  if(m==='ctx'){
    const it=CTX();if(n==='up')TV.csel=(TV.csel+it.length-1)%it.length;else if(n==='down')TV.csel=(TV.csel+1)%it.length;else if(n==='ok'){it[TV.csel][2]();return}
    renderCtx();return}
  if(m==='cnf'){
    if(n==='left'||n==='right'||n==='up'||n==='down')TV.cbtn=TV.cbtn?0:1;else if(n==='ok'){cnfPick(TV.cbtn);return}
    renderCnf();return}
  if(m==='guide'){
    const L=TV.list;
    if(n==='up'&&L.length)TV.gsel=(TV.gsel+L.length-1)%L.length;else if(n==='down'&&L.length)TV.gsel=(TV.gsel+1)%L.length;
    else if(n==='chup'&&L.length)TV.gsel=Math.min(L.length-1,TV.gsel+GVIS);else if(n==='chdn'&&L.length)TV.gsel=Math.max(0,TV.gsel-GVIS);
    else if(n==='left'||n==='right'){stepFilter(n==='left'?-1:1);TV.gsel=0;TV.gtop=0}
    else if(n==='ok'){const c=L[TV.gsel];if(c){tune(c);setMode('watch');banner()}return}
    else if(n==='green')setMode('edit');else if(n==='blue'||n==='menu'){TV.osel=0;setMode('opts');return}
    renderGuide();return}
  if(m==='opts'){
    const it=optItems();if(n==='up')TV.osel=(TV.osel+it.length-1)%it.length;else if(n==='down')TV.osel=(TV.osel+1)%it.length;else if(n==='ok'){it[TV.osel].fn();return}
    renderOpts();return}
  if(m==='setup'){
    const it=TV.sitems;if(n==='up')TV.ssel=(TV.ssel+it.length-1)%it.length;else if(n==='down')TV.ssel=(TV.ssel+1)%it.length;else if(n==='ok'){it[TV.ssel][1]();return}
    renderSetup()}}
function stepFilter(d){const i=FILT.findIndex(f=>f[0]===TV.filter);setFilter(FILT[(i+d+FILT.length)%FILT.length][0])}
function cnfPick(i){const k=TV.cnf;if(i===0&&k&&k.yes)k.yes();else setMode('edit')}
window.addEventListener('keydown',onKey,true);window.addEventListener('keyup',onKey,true);

/* ---------- Dış arayüz (fare/dokunmatik) ---------- */
window.TVUI={open,close,
  row:i=>{TV.sel=i;const m=TV.mode;if(m==='edit'){TV.csel=0;setMode('ctx')}else if(m==='list'){const c=selCh();if(c){tune(c);setMode('watch');banner()}}},
  grow:i=>{TV.gsel=i;act('ok')},chip:f=>setFilter(f),opt:i=>{TV.osel=i;act('ok')},ctx:i=>{TV.csel=i;act('ok')},cnfPick,setup:i=>{TV.ssel=i;act('ok')}};
window.__tvPerm=()=>{if(TV.on)load()};
window.__tvEv=(t,d)=>{if(!TV.on)return;TV.last=t+':'+d;if(t==='video'){TV.vid=true;TV.fail='';clearTimeout(TV.tt)}else if(t==='novideo'){TV.vid=false;TV.reason=+d}else{TV.vid=false;TV.fail=t;clearTimeout(TV.tt)}sig()};

/* ---------- Launcher'a bağlama ---------- */
const _layer=layer;layer=function(){const x=_layer();return x||(TV.on?$t('tv'):null)};
const _back=window.__back;
window.__back=function(){
  if($('#dlg').classList.contains('show')||$('#modal').classList.contains('show'))return _back();
  if(!TV.on)return _back();
  const m=TV.mode;
  if(m==='move')endMove(false);else if(m==='ctx'||m==='cnf')setMode('edit');else if(m==='edit')setMode('list');
  else if(m==='list'||m==='guide'||m==='opts')setMode('watch');else close();
  return true};
const _home=window.__home;window.__home=function(){if(TV.on)close();if(_home)_home()};
const _res=window.__resume;
window.__resume=function(){if(_res)_res();if(TV.on)setTimeout(()=>{if(TV.mode==='setup'||!TV.all.length)load();else{N('tvMode',{on:true});N('tvRect',{x:0,y:0,w:0,h:0});const c=curCh();if(c&&TV.tuned)tune(c)}},700)};
const _run=runAct;runAct=function(a){if(a==='tv'){closePanels();TVUI.open();return}_run(a)};
try{ACTS.tv=['','Canlı TV']}catch(e){}
(function(){const tr=document.querySelector('.topbar .tr');if(!tr)return;const b=document.createElement('div');b.className='ib';b.setAttribute('data-tvbtn','1');b.setAttribute('onclick','TVUI.open()');b.setAttribute('title','Canlı TV');
  b.innerHTML='<svg class="i" viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="13" rx="2.5"/><path d="M8 21h8M12 18v3"/></svg>';tr.insertBefore(b,tr.children[2]||null)})();
})();
