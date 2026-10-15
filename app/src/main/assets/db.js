/* ihlauncher • Kontrol Odası bilgi tabanı
 * Risk: safe = güvenli (dondurunca bir şey kaybetmezsin) • caution = dikkat (bir özellik kaybolabilir)
 *       risky = riskli (sistem/arayüz bozulabilir) • critical = kritik (asla önerilmez, Bridge de engeller)
 * Not: Liste "tüm" cihazları kapsamaz; yalnızca cihazda GERÇEKTEN kurulu olanlar gösterilir.
 * Listede olmayan sistem paketleri "Bilinmiyor" sayılır ve otomatik hiçbir işlem yapılmaz. */
const RISK={safe:{t:'Güvenli',c:'a'},caution:{t:'Dikkat',c:'w'},risky:{t:'Riskli',c:'u'},critical:{t:'Kritik',c:'u'},unknown:{t:'Bilinmiyor',c:'f'}};
const CATS={tele:'Telemetri & Reklam',google:'Google',vendor:'Üretici',promo:'Tanıtım & Öneri',demo:'Demo / Mağaza',unused:'Kullanılmayan',core:'Sistem çekirdeği',unk:'Tanımsız'};
/* [paket, ad, kategori, risk, not] */
const DB=[
['com.google.android.youtube.tvkids','YouTube Kids','google','safe',''],
['com.google.android.youtube.tvmusic','YouTube Music (TV)','google','safe',''],
['com.google.android.music','Play Müzik (kullanımdan kalktı)','google','safe',''],
['com.google.android.play.games','Play Games','google','safe',''],
['com.google.android.videos','Google TV / Play Filmler','google','caution','Google TV arayüzünde içerik mağazası olarak kullanılır.'],
['com.google.android.feedback','Google geri bildirim aracısı','tele','safe','Hata/geri bildirim verisi gönderir.'],
['com.google.android.tv.bugreportsender','Hata raporu gönderici','tele','safe',''],
['com.google.android.backdrop','Google ekran koruyucu (Ambient)','google','safe','ihlauncher kendi saat ekran koruyucusunu kullanır.'],
['com.google.android.apps.tv.dreamx','Google TV ekran koruyucu','google','caution',''],
['com.google.android.leanbacklauncher.recommendations','Öneri servisi','promo','caution','Stok ana ekran önerileri için.'],
['com.google.android.tvrecommendations','TV önerileri','promo','caution','Stok ana ekran için gerekir.'],
['com.google.android.katniss','Google Asistan / sesli arama','google','risky','Kumandadaki mikrofon tuşu çalışmaz.'],
['com.google.android.tvlauncher','Stok Android TV ana ekranı','google','risky','Önce ihlauncher varsayılan ana ekran olmalı.'],
['com.google.android.apps.tv.launcherx','Stok Google TV ana ekranı','google','risky','Önce ihlauncher varsayılan ana ekran olmalı.'],
['com.google.android.leanbacklauncher','Eski stok ana ekran','google','risky','Önce ihlauncher varsayılan ana ekran olmalı.'],
['com.google.android.partnersetup','Google ortak kurulumu','tele','caution',''],
['com.google.android.onetimeinitializer','İlk kurulum başlatıcısı','unused','caution',''],
['com.google.android.tungsten.setupwraith','Kurulum sihirbazı','unused','caution','Fabrika ayarı sonrası kurulum için gerekir.'],
['com.google.android.syncadapters.calendar','Takvim eşitleme','unused','safe',''],
['com.google.android.syncadapters.contacts','Kişi eşitleme','unused','safe',''],
['com.google.android.printservice.recommendation','Yazıcı önerileri','unused','safe',''],
['com.google.android.apps.mediashell','Chromecast yerleşik','google','caution','Telefondan yayın (cast) kullanıyorsan kalsın.'],
['com.google.android.tv.remote.service','Android TV uzaktan kumanda hizmeti','google','caution','Telefondan kumanda uygulaması için.'],
['com.google.android.tts','Google Konuşma Sentezi','google','caution',''],
['com.google.android.marvin.talkback','TalkBack','google','caution','Erişilebilirlik gerekiyorsa kalsın.'],
['com.google.android.configupdater','Yapılandırma güncelleyici','google','risky',''],
['com.android.hotwordenrollment.okgoogle','"Ok Google" kaydı','google','caution',''],
['com.android.hotwordenrollment.xgoogle','"Ok Google" kaydı','google','caution',''],
['com.android.egg','Android Easter Egg','unused','safe',''],
['com.android.htmlviewer','HTML görüntüleyici','unused','safe',''],
['com.android.printspooler','Yazdırma servisi','unused','safe',''],
['com.android.bips','Yazdırma servisi (BIPS)','unused','safe',''],
['com.android.bookmarkprovider','Yer imi sağlayıcı','unused','safe',''],
['com.android.stk','SIM araç seti','unused','safe',''],
['com.android.simappdialog','SIM uygulama penceresi','unused','safe',''],
['com.android.carrierdefaultapp','Operatör varsayılan uygulaması','unused','caution',''],
['com.android.cellbroadcastreceiver','Acil durum yayını alıcısı','unused','caution','Acil durum uyarıları gelmez.'],
['com.android.dreams.basic','Temel ekran koruyucu','unused','safe',''],
['com.android.dreams.phototable','Foto masası ekran koruyucu','unused','safe',''],
['com.android.traceur','Sistem izleme (Traceur)','tele','safe',''],
['com.android.dynsystem','Dinamik sistem güncellemesi','unused','safe',''],
['com.android.wallpaper.livepicker','Canlı duvar kağıdı seçici','unused','safe',''],
['com.android.wallpaperbackup','Duvar kağıdı yedeği','unused','caution',''],
['com.android.musicfx','Müzik efektleri','unused','caution',''],
['com.android.managedprovisioning','Cihaz yönetimi hazırlığı','unused','caution',''],
['com.android.backupconfirm','Yedek onayı','unused','caution',''],
['com.android.sharedstoragebackup','Paylaşılan depolama yedeği','unused','caution',''],
['com.android.emergency','Acil durum bilgisi','unused','caution',''],
['com.android.companiondevicemanager','Eşlik cihaz yöneticisi','unused','caution',''],
['com.android.documentsui','Dosya seçici (DocumentsUI)','core','risky','Duvar kağıdı ve yedek seçimi bu pakete bağlı.'],
['com.android.captiveportallogin','Wi-Fi giriş sayfası','core','risky','Otel/halka açık Wi-Fi girişi için.'],
['com.facebook.system','Facebook sistem uygulaması','tele','safe',''],
['com.facebook.appmanager','Facebook uygulama yöneticisi','tele','safe',''],
['com.facebook.services','Facebook servisleri','tele','safe',''],
['com.netflix.partner.activation','Netflix ortak aktivasyonu','promo','caution','Netflix kısayol/önerileri için.'],
/* Amazon / Fire TV */
['com.amazon.client.metrics','Amazon istemci metrikleri','tele','safe','Kullanım verisi toplar.'],
['com.amazon.client.metrics.api','Amazon metrik API','tele','safe',''],
['com.amazon.device.logmanager','Amazon log yöneticisi','tele','safe',''],
['com.amazon.imdb.tv.android.app','IMDb TV / Freevee','promo','safe',''],
['com.amazon.tv.csapp','Amazon müşteri desteği','unused','safe',''],
['com.amazon.tv.legal.notices','Amazon yasal bildirimler','unused','safe',''],
['com.amazon.tv.launcher','Fire TV stok ana ekranı','vendor','risky','Başka launcher\'a geçtikten sonra bile bazı cihazlarda gereklidir.'],
/* NVIDIA Shield */
['com.nvidia.stats','NVIDIA istatistikleri','tele','safe',''],
['com.nvidia.feedback','NVIDIA geri bildirim','tele','safe',''],
['com.nvidia.diagtools','NVIDIA tanılama araçları','tele','safe',''],
['com.nvidia.tegrazone3','NVIDIA Games / GeForce NOW','vendor','caution','Oyun akışı kullanıyorsan kalsın.'],
['com.nvidia.ota','NVIDIA sistem güncelleme','vendor','risky','Güncellemeler gelmez.'],
/* Xiaomi / MiBox */
['com.miui.analytics','MIUI Analytics','tele','safe',''],
['com.miui.msa.global','MIUI reklam servisi (MSA)','tele','safe',''],
['com.xiaomi.xmsf','Xiaomi push servisi','tele','caution','Bazı Xiaomi uygulamalarının bildirimleri için.'],
['com.mitv.tvhome.atv','Mi TV ana ekranı (PatchWall)','vendor','risky','Önce ihlauncher varsayılan ana ekran olmalı.']
];
const DBM={};DB.forEach(d=>DBM[d[0]]=d);
/* Üretici ailesi önekleri: bilinmeyen ama tanıdık paketleri uyarılı gösterir (otomatik seçilmez). [önek, ad, risk, not] */
const FAM=[
['org.droidtv.','Philips / TP Vision sistem paketi','risky','TV çekirdeği (kaynaklar, kanallar, ayarlar). Dokunma.'],
['com.sony.dtv.','Sony Bravia sistem paketi','risky','TV çekirdeği. Yalnızca ne olduğunu biliyorsan.'],
['com.droidlogic.','Amlogic sistem paketi','risky','Kutu donanım/ayar servisi.'],
['com.amlogic.','Amlogic sistem paketi','risky',''],
['com.mediatek.','MediaTek sistem paketi','risky','Yonga seti servisi.'],
['com.rockchip.','Rockchip sistem paketi','risky',''],
['com.vestel.','Vestel / Telefunken / Toshiba yazılımı','caution','Kaynak seçimi, TV arayüzü ve ayarlar buna bağlı olabilir.'],
['com.arcelik.','Arçelik / Beko / Grundig yazılımı','caution',''],
['com.tcl.','TCL yazılımı','caution',''],
['com.hisense.','Hisense yazılımı','caution',''],
['com.skyworth.','Skyworth yazılımı','caution',''],
['com.xiaomi.','Xiaomi yazılımı','caution',''],
['com.mitv.','Mi TV yazılımı','caution',''],
['com.realme.','Realme yazılımı','caution',''],
['com.oppo.','OPPO yazılımı','caution',''],
['com.nvidia.','NVIDIA yazılımı','caution',''],
['com.amazon.','Amazon / Fire OS yazılımı','caution','']
];
const TELE_RE=/(analytics|telemetry|tracking|tracker|adservice|adservices|\.ads(\.|$)|crashlytics|metrics|usagereport|bugreport|diagnos|feedback)/i;
const DEMO_RE=/(retaildemo|demomode|storemode|store_mode|kiosk|\.demo(\.|$))/i;
/* Sert korumalı paketler (Bridge.kt içindeki CRIT + PROT_PREFIX ile aynı) */
const CRIT=['android','com.android.systemui','com.android.settings','com.ihlauncher.tv','com.android.shell','com.android.providers.settings','com.google.android.gms','com.android.packageinstaller','com.google.android.packageinstaller','com.android.inputdevices','com.android.tv.settings'];
const PROT_PREFIX=['com.android.providers.','com.android.server.','com.android.location.','com.android.bluetooth','com.android.inputmethod.','com.android.networkstack','com.android.permissioncontroller','com.google.android.permissioncontroller','com.android.modulemetadata','com.google.android.modulemetadata','com.android.webview','com.google.android.webview','com.android.vending','com.google.android.gsf','com.android.keychain','com.android.certinstaller','com.android.vpndialogs','com.android.tv.settings'];
const isProt=p=>CRIT.includes(p)||PROT_PREFIX.some(x=>p.startsWith(x));
const LAUNCHERS=['com.google.android.tvlauncher','com.google.android.apps.tv.launcherx','com.google.android.leanbacklauncher','com.mitv.tvhome.atv','com.amazon.tv.launcher'];
/* Paketi sınıflandır → {risk,cat,title,note,src:'db'|'prot'|'fam'|'heur'|'none'} */
function classify(p,label){
 const d=DBM[p];if(d)return{risk:d[3],cat:d[2],title:d[1],note:d[4],src:'db',remote:!!d[5]};
 if(isProt(p))return{risk:'critical',cat:'core',title:label||p,note:'Sistemin çalışması için gerekli.',src:'prot'};
 for(const f of FAM)if(p.startsWith(f[0]))return{risk:f[2],cat:'vendor',title:label||f[1],note:f[1]+(f[3]?' — '+f[3]:''),src:'fam',remote:!!f[4]};
 if(DEMO_RE.test(p))return{risk:'caution',cat:'demo',title:label||p,note:'Demo/mağaza modu paketi gibi görünüyor — incele.',src:'heur'};
 if(TELE_RE.test(p))return{risk:'caution',cat:'tele',title:label||p,note:'Adı telemetri/reklam/analitik içeriyor — incele.',src:'heur'};
 return{risk:'unknown',cat:'unk',title:label||p,note:'',src:'none'};
}
/* Cihaz ailesi tespiti */
function vendorOf(pr){
 const s=[pr.man,pr.brand,pr.model,pr.device,pr.product,pr.hw,pr.board].join(' ').toLowerCase();
 const T=[['Amazon Fire TV',/amazon|\baft[a-z]\b/],['NVIDIA Shield',/nvidia|shield/],['Sony Bravia',/sony|bravia/],['Philips / TP Vision',/philips|tp.?vision|droidtv/],['Xiaomi Mi TV',/xiaomi|mitv|mibox|redmi/],['TCL',/\btcl\b/],['Hisense',/hisense|vidaa/],['Vestel / Telefunken / Toshiba',/vestel|telefunken|grundig|toshiba|jvc|regal|arcelik|beko|hitachi|finlux|nordmende|sunny/],['Google Chromecast / ADT',/google|chromecast|sabrina|boreal/],['Realme / OPPO',/realme|oppo|oneplus/],['Amlogic kutu',/amlogic|meson|g12a|sm1|gxl|s905|s922|droidlogic/],['Rockchip kutu',/rockchip|rk3\d/],['MediaTek',/mediatek|mt\d{4}/]];
 for(const t of T)if(t[1].test(s))return t[0];
 return 'Genel Android TV';
}

/* Uzak (GitHub) liste: {"version":"1","entries":[[paket,ad,kategori,risk,not]],"family":[[önek.,ad,risk,not]]}
 * Güvenlik: kritik/korumalı paketler yok sayılır, yerleşik kayıtlar ezilmez, 'critical' risk kabul edilmez. */
function applyRemote(j){
 for(const k of Object.keys(DBM))if(DBM[k][5])delete DBM[k];
 for(let i=FAM.length-1;i>=0;i--)if(FAM[i][4])FAM.splice(i,1);
 let n=0,f=0;if(!j||typeof j!=='object')return{n,f};
 for(const e of (Array.isArray(j.entries)?j.entries:[]).slice(0,3000)){
  if(!Array.isArray(e)||!/^[A-Za-z0-9._]+$/.test(e[0]||'')||isProt(e[0]))continue;
  if(DBM[e[0]]&&!DBM[e[0]][5])continue;
  const cat=CATS[e[2]]&&e[2]!=='core'?e[2]:'unk',risk=['safe','caution','risky'].includes(e[3])?e[3]:'caution';
  DBM[e[0]]=[e[0],String(e[1]||e[0]).slice(0,80),cat,risk,String(e[4]||'').slice(0,160),true];n++}
 for(const x of (Array.isArray(j.family)?j.family:[]).slice(0,300)){
  if(!Array.isArray(x)||!/^[A-Za-z0-9._]+\.$/.test(x[0]||'')||x[0].length<6)continue;
  FAM.push([x[0],String(x[1]||x[0]).slice(0,60),x[2]==='risky'?'risky':'caution',String(x[3]||'').slice(0,160),true]);f++}
 return{n,f}}
