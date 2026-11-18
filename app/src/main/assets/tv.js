/* ihlauncher • Canlı TV v4.3 — tam ekran video, HDMI kaynak seçimi ve kumanda öncelikli arayüz.
 * Video (TvView) hiç yeniden boyutlanmaz; liste/rehber/seçenekler videonun ÜSTÜNE çizilir.
 * Tuşlar tamamen burada yönetilir (launcher'ın odak tahmini kullanılmaz); seçim JS durumundadır (.sel).
 * Kanal düzenleme (gizle/sil, taşı, adlandır, favori) S.tvx içinde kalıcıdır; sistem kanal veritabanı değiştirilmez. */
(function(){
'use strict';
/* Stiller bu dosyaya gömülüdür; launcher'a ek stil dosyası gerekmez. */
const TV_DESIGN=`
#tv[data-tv-design]{
  --ink:#eef7f3;--sub:#b9ccc6;--muted:#a3bbb4;--mint:#9af0d5;--line:#36534e;
  --surface:#10211f;--lower:#152b27;--focus:#254740;--edge:clamp(14px,3vw,54px);
  --pad:clamp(15px,1.7vw,32px);--micro:clamp(11px,.87vw,17px);--small:clamp(13px,1.05vw,21px);
  --body:clamp(15px,1.22vw,24px);--title:clamp(24px,2.3vw,46px);
  position:fixed;inset:0;display:none;background:transparent;color:var(--ink);
  font:500 var(--body)/1.25 system-ui,Roboto,sans-serif;pointer-events:none;
  -webkit-text-size-adjust:100%;text-size-adjust:100%;
}
#tv[data-tv-design]{z-index:110}
body.tvon #tv[data-tv-design]{display:block}
#tv[data-tv-design] *{box-sizing:border-box}
#tv[data-tv-design] :is(.ihtv-lp,.ihtv-gd,.ihtv-op,.ihtv-su,.ihtv-src,.ihtv-ctx,.ihtv-cnf,.ihtv-ban,.ihtv-ck2,.ihtv-numbox,.ihtv-stat,.ihtv-tip){display:none}
#tv[data-tv-design] :is(.ihtv-lp,.ihtv-gd,.ihtv-op,.ihtv-su,.ihtv-src,.ihtv-ctx,.ihtv-cb,.ihtv-ban,.ihtv-ck2,.ihtv-stat,.ihtv-numbox,.ihtv-tip){
  color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:14px;
  box-shadow:0 20px 55px #07110f73;
}
#tv[data-tv-design] :is(.ihtv-lp,.ihtv-gd,.ihtv-op,.ihtv-su,.ihtv-src,.ihtv-ctx){position:absolute;padding:var(--pad);pointer-events:auto;overflow:auto;scrollbar-width:thin;scrollbar-color:var(--line) transparent}
#tv[data-tv-design] :is(.ihtv-lp,.ihtv-op){top:var(--edge);right:var(--edge);bottom:var(--edge);left:auto;width:min(100% - 2 * var(--edge),clamp(365px,37vw,720px));}
#tv[data-tv-design] .ihtv-lp{background:linear-gradient(155deg,#142826fa,#0f201efa 65%)}
#tv[data-tv-design].v-list .ihtv-lp,#tv[data-tv-design].v-guide .ihtv-gd,#tv[data-tv-design].v-opts .ihtv-op{display:flex;flex-direction:column}
#tv[data-tv-design] :is(.ihtv-lp,.ihtv-gd,.ihtv-op)>*{flex:none}
#tv[data-tv-design].v-setup .ihtv-su,#tv[data-tv-design].v-ctx .ihtv-ctx{display:block}
#tv[data-tv-design] :is(.ihtv-head,.ihtv-listmeta,.ihtv-guidegroup){display:flex;align-items:center;justify-content:space-between;gap:10px}
#tv[data-tv-design] .ihtv-head{padding:0 0 clamp(11px,1.3vh,20px);margin:0 0 clamp(9px,1.15vh,16px);border-bottom:1px solid var(--line)}
#tv[data-tv-design] .ihtv-headcopy{min-width:0}
#tv[data-tv-design] .ihtv-kicker{color:var(--mint);font-size:var(--micro);font-weight:750;letter-spacing:.13em}
#tv[data-tv-design] .ihtv-lt{margin:3px 0 0;color:var(--ink);font-size:var(--title);font-weight:720;letter-spacing:-.045em;line-height:1.05}
#tv[data-tv-design] .ihtv-headmeta{display:flex;align-items:center;gap:clamp(6px,1vw,16px);flex:none}
#tv[data-tv-design] :is(.ihtv-clk,.ihtv-lc,.ihtv-rn,.ihtv-bn,.ihtv-bm,.ihtv-dm,.ihtv-up b,.ihtv-ckt,.ihtv-guidegroup){font-variant-numeric:tabular-nums}
#tv[data-tv-design] :is(.ihtv-clk,.ihtv-lc,.ihtv-rn,.ihtv-listlabel){color:var(--sub);font-size:var(--small);font-weight:650}
#tv[data-tv-design] .ihtv-clk{color:var(--ink);font-weight:750}
#tv[data-tv-design] :is(.ihtv-navbtn,.ihtv-chip){white-space:nowrap;font:inherit;font-size:var(--micro);font-weight:700;padding:.53em .77em;border:1px solid var(--line);border-radius:6px;color:var(--ink);background:#1c3631;cursor:pointer}
#tv[data-tv-design] :is(.ihtv-navbtn,.ihtv-chip):is(:hover,:focus-visible){outline:2px solid var(--mint);outline-offset:1px}
#tv[data-tv-design] .ihtv-chip:disabled{opacity:.65;cursor:default}
#tv[data-tv-design] .ihtv-listmeta{margin-bottom:8px}
#tv[data-tv-design] .ihtv-chips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:clamp(8px,1.2vh,18px)}
#tv[data-tv-design] .ihtv-chip.on{color:#12332b;background:var(--mint);border-color:var(--mint)}
#tv[data-tv-design] .ihtv-rowsw{position:relative;padding-right:10px}
#tv[data-tv-design] .ihtv-rows{display:grid;gap:clamp(3px,.48vh,8px)}
#tv[data-tv-design] .ihtv-sb{position:absolute;inset:0 0 0 auto;width:3px;background:#2a463f;border-radius:5px}
#tv[data-tv-design] .ihtv-sb i{position:absolute;left:0;width:100%;border-radius:5px;background:#78ac9e}
#tv[data-tv-design] :is(.ihtv-r,.ihtv-gr,.ihtv-ci,.ihtv-oi,.ihtv-sbn,.ihtv-cbn){border:1px solid transparent;border-radius:7px;cursor:pointer}
#tv[data-tv-design] :is(.ihtv-r,.ihtv-gr,.ihtv-ci,.ihtv-oi,.ihtv-sbn,.ihtv-cbn):hover{border-color:#668f84}
#tv[data-tv-design] :is(.ihtv-r,.ihtv-gr,.ihtv-ci,.ihtv-oi,.ihtv-sbn,.ihtv-cbn).sel{
  background:var(--focus);border-color:var(--mint);box-shadow:inset 3px 0 var(--mint);color:var(--ink)
}
#tv[data-tv-design] .ihtv-r{display:flex;align-items:center;gap:clamp(7px,.72vw,15px);min-height:clamp(45px,6.55vh,104px);padding:4px clamp(7px,.65vw,15px);background:#19302c}
#tv[data-tv-design] .ihtv-rn{min-width:2.1em;text-align:right;flex:none}
#tv[data-tv-design] .ihtv-rl,#row-tv[data-tv-design] .tvc-lg{
  display:grid;place-items:center;flex:none;width:clamp(31px,3vw,63px);aspect-ratio:1.12;
  color:white;border:1px solid #ffffff2c;border-radius:6px;
  background:linear-gradient(140deg,var(--cc2,#284b42),#101d1eea),var(--cc,#2d534b);
  font-size:var(--micro,12px);font-weight:800;letter-spacing:.05em;overflow:hidden
}
#tv[data-tv-design] .ihtv-rl img,#row-tv[data-tv-design] .tvc-lg img{width:100%;height:100%;object-fit:contain;padding:3px}
#tv[data-tv-design] .ihtv-rt{flex:1;min-width:0}
#tv[data-tv-design] :is(.ihtv-rc,.ihtv-rg,.ihtv-bname,.ihtv-bt,.ihtv-gc,.ihtv-gp .x,.ihtv-up span,.ihtv-dn){overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
#tv[data-tv-design] .ihtv-rc{font-weight:750}
#tv[data-tv-design] .ihtv-rg{color:var(--sub);font-size:var(--small)}
#tv[data-tv-design] :is(.ihtv-hd,.ihtv-tag,.ihtv-mu){display:inline-block;margin-left:.45em;padding:.12em .32em;border:1px solid #709e91;border-radius:4px;color:var(--ink);font-size:var(--micro);font-weight:700;vertical-align:.11em}
#tv[data-tv-design] .ihtv-fv{margin-left:.4em;color:#ffe297}
#tv[data-tv-design] :is(.ihtv-rp,.ihtv-bp,.ihtv-gp .z){height:3px;margin-top:4px;overflow:hidden;border-radius:3px;background:#53746a}
#tv[data-tv-design] :is(.ihtv-rp,.ihtv-bp,.ihtv-gp .z) i{display:block;height:100%;background:var(--mint);border-radius:inherit}
#tv[data-tv-design] .ihtv-eq{display:flex;align-items:end;gap:2px;height:12px}
#tv[data-tv-design] .ihtv-eq i{display:block;width:3px;height:60%;background:var(--mint);border-radius:2px}
#tv[data-tv-design] .ihtv-eq i:nth-child(2){height:100%}
#tv[data-tv-design] .ihtv-eq i:nth-child(3){height:42%}
#tv[data-tv-design] :is(.ihtv-grip,.ihtv-mvi,.ihtv-ck.on,.ihtv-dn b){color:var(--mint)}
#tv[data-tv-design] .ihtv-ck{flex:none;width:1.05em;height:1.05em;line-height:1;border-radius:3px;border:1px solid #91b3a9;text-align:center}
#tv[data-tv-design] .ihtv-det{margin-top:clamp(8px,1vh,16px);padding:clamp(8px,1vh,15px) clamp(9px,1vw,18px);border-left:2px solid #7ab0a1;background:#172f2a;border-radius:0 7px 7px 0}
#tv[data-tv-design] .ihtv-det:empty{display:none}
#tv[data-tv-design] :is(.ihtv-dt,.ihtv-gdt){font-weight:750;color:var(--ink);overflow-wrap:anywhere}
#tv[data-tv-design] :is(.ihtv-dm,.ihtv-dd,.ihtv-dn,.ihtv-gdm,.ihtv-gdd,.ihtv-gp .y,.ihtv-empty){font-size:var(--small);color:var(--sub)}
#tv[data-tv-design] .ihtv-dn{margin-top:4px}
#tv[data-tv-design] .ihtv-hints{display:flex;flex-wrap:wrap;gap:.38em 1em;border-top:1px solid var(--line);padding-top:.7em;margin-top:.75em;color:var(--sub);font-size:var(--micro)}
#tv[data-tv-design] :is(.ihtv-lp,.ihtv-gd,.ihtv-op)>.ihtv-hints{margin-top:auto;position:relative;top:.5em}
#tv[data-tv-design] .ihtv-h{display:inline-flex;align-items:center;gap:.35em;white-space:nowrap}
#tv[data-tv-design] .ihtv-h b{color:var(--ink)}
#tv[data-tv-design] .ihtv-h i{width:.64em;height:.64em;border-radius:50%;display:inline-block}
#tv[data-tv-design] .ihtv-h .r{background:#ff8583}#tv[data-tv-design] .ihtv-h .g{background:#8ce19a}
#tv[data-tv-design] .ihtv-h .y{background:#ffe285}#tv[data-tv-design] .ihtv-h .b{background:#92c5ff}
#tv[data-tv-design] .ihtv-empty{padding:1em .55em}
#tv[data-tv-design] .ihtv-gd{inset:var(--edge);background:#10211ff7}
#tv[data-tv-design] .ihtv-guidegroup{margin-bottom:.65em;color:var(--sub);font-size:var(--small);font-weight:650}
#tv[data-tv-design] .ihtv-gb{display:grid;grid-template-columns:minmax(0,2.5fr) minmax(0,1fr);gap:clamp(10px,1.65vw,34px)}
#tv[data-tv-design] :is(.ihtv-gcols,.ihtv-gr){display:grid;grid-template-columns:2.4em minmax(0,1.04fr) minmax(0,1.3fr) minmax(0,1fr);align-items:center;gap:.65em;padding:0 .6em}
#tv[data-tv-design] .ihtv-gcols{height:1.35em;align-items:start;color:var(--muted);letter-spacing:.11em;font-weight:750}
#tv[data-tv-design] .ihtv-gcols span{font-size:var(--micro)}
#tv[data-tv-design] .ihtv-gr{min-height:clamp(38px,6.35vh,90px);margin-bottom:clamp(3px,.45vh,8px);background:#19302b}
#tv[data-tv-design] .ihtv-gr.on .ihtv-rn{color:var(--mint)}
#tv[data-tv-design] .ihtv-gcols span:first-child{text-align:right}
#tv[data-tv-design] .ihtv-gc{font-weight:700}
#tv[data-tv-design] .ihtv-gp .x{font-size:var(--small)}
#tv[data-tv-design] .ihtv-gp.nx{color:var(--sub)}
#tv[data-tv-design] .ihtv-gdet{min-width:0;padding:clamp(11px,1.25vw,24px);background:#172e29;border:1px solid var(--line);border-radius:9px}
#tv[data-tv-design] :is(.ihtv-gdn,.ihtv-gul){color:var(--mint);font-size:var(--micro);font-weight:750;letter-spacing:.08em;overflow-wrap:anywhere}
#tv[data-tv-design] .ihtv-gdt{font-size:clamp(20px,1.8vw,38px);line-height:1.1;margin:.35em 0}
#tv[data-tv-design] .ihtv-gdd{margin-top:.55em;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;overflow-wrap:anywhere}
#tv[data-tv-design] .ihtv-gul{margin-top:1.2em;padding-bottom:.55em}
#tv[data-tv-design] .ihtv-up{display:flex;gap:.7em;border-top:1px solid var(--line);padding:.52em 0;font-size:var(--small)}
#tv[data-tv-design] .ihtv-up b{color:var(--sub);flex:none}
#tv[data-tv-design] .ihtv-oi,#tv[data-tv-design] .ihtv-sbn,#tv[data-tv-design] .ihtv-ci{padding:.45em .7em;margin-bottom:4px;background:#19302b}
#tv[data-tv-design] .ihtv-oi .a{font-weight:750}
#tv[data-tv-design] .ihtv-oi .b{font-size:var(--small);color:var(--sub)}
#tv[data-tv-design] .ihtv-more{min-height:.9em;color:var(--mint);text-align:center;font-size:var(--micro)}
#tv[data-tv-design] .ihtv-su{inset:50% auto auto 50%;transform:translate(-50%,-50%);width:min(620px,100% - 2 * var(--edge));max-height:calc(100% - 2 * var(--edge))}
#tv[data-tv-design] .ihtv-sbx p{color:var(--sub);margin:.7em 0 1em;line-height:1.5}
#tv[data-tv-design] .ihtv-ctx{top:50%;left:calc(var(--edge) + 5vw);transform:translateY(-50%);width:min(395px,100% - 2 * var(--edge));max-height:calc(100% - 2 * var(--edge));z-index:2}
#tv[data-tv-design] .ihtv-ct{font-weight:750;font-size:1.2em;margin-bottom:.7em;overflow-wrap:anywhere}
#tv[data-tv-design] .ihtv-ci span{display:inline-block;width:1.8em;color:var(--mint)}
#tv[data-tv-design].v-cnf .ihtv-cnf{position:absolute;inset:0;display:grid;place-items:center;z-index:3;background:#081413b5;pointer-events:auto}
#tv[data-tv-design] .ihtv-cb{max-width:min(535px,100% - 2 * var(--edge));padding:var(--pad)}
#tv[data-tv-design] .ihtv-cq{font-size:clamp(20px,2vw,33px);font-weight:750;overflow-wrap:anywhere}
#tv[data-tv-design] .ihtv-cs{margin:.65em 0 1em;color:var(--sub)}
#tv[data-tv-design] .ihtv-cbs{display:flex;flex-wrap:wrap;gap:8px}
#tv[data-tv-design] .ihtv-cbn{padding:.55em .7em;background:#19302b}
#tv[data-tv-design].v-ctx .ihtv-lp,#tv[data-tv-design].v-cnf .ihtv-lp{pointer-events:none}
#tv[data-tv-design].ban .ihtv-ban{
  position:absolute;inset:auto var(--edge) var(--edge);display:grid;grid-template-columns:auto minmax(0,1.45fr) minmax(0,.68fr);
  gap:clamp(12px,2vw,36px);align-items:center;padding:var(--pad);background:#102421f5;
  border-top:2px solid var(--mint);pointer-events:auto
}
#tv[data-tv-design] .ihtv-channel{background:#203b34;border-radius:8px;padding:.65em .85em;min-width:4.1em;text-align:center}
#tv[data-tv-design] .ihtv-bn{font-size:clamp(29px,4.1vw,80px);line-height:.98;font-weight:750;letter-spacing:-.06em}
#tv[data-tv-design] .ihtv-bc{display:flex;align-items:center;gap:.45em}
#tv[data-tv-design] .ihtv-bc .ihtv-hd,#tv[data-tv-design] .ihtv-bc .ihtv-fv,#tv[data-tv-design] .ihtv-bc .ihtv-mu{margin-left:0}
#tv[data-tv-design] .ihtv-live{display:inline-flex;align-items:center;gap:.4em;color:#0d3329;background:var(--mint);padding:.25em .46em;border-radius:4px;font-size:var(--micro);font-weight:800;letter-spacing:.08em}
#tv[data-tv-design] .ihtv-live::before{content:'';width:.5em;height:.5em;background:currentColor;border-radius:50%}
#tv[data-tv-design] .ihtv-bname{color:var(--sub);font-weight:700}
#tv[data-tv-design] .ihtv-bt{margin:.17em 0 .2em;font-size:var(--title);font-weight:740;line-height:1.12;letter-spacing:-.035em}
#tv[data-tv-design] .ihtv-bp{height:4px}
#tv[data-tv-design] .ihtv-bm{display:flex;justify-content:space-between;margin-top:5px;color:var(--sub);font-size:var(--micro)}
#tv[data-tv-design] .ihtv-bside{min-width:0;border-left:1px solid var(--line);padding-left:clamp(9px,1.3vw,22px)}
#tv[data-tv-design] .ihtv-bx div{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700;margin:.25em 0 .62em}
#tv[data-tv-design] .ihtv-bk{display:flex;flex-wrap:wrap;gap:5px}
#tv[data-tv-design].clk .ihtv-ck2{position:absolute;top:var(--edge);right:var(--edge);display:block;text-align:right;padding:.65em .9em;background:#102421ec}
#tv[data-tv-design] .ihtv-ckt{font-size:var(--title);font-weight:740;line-height:1}
#tv[data-tv-design] :is(.ihtv-ckd,.ihtv-ckm){font-size:var(--micro);color:var(--sub);margin-top:.25em}
#tv[data-tv-design] .ihtv-stat.show{position:absolute;top:47%;left:50%;transform:translate(-50%,-50%);display:block;text-align:center;background:#102421f5;padding:1em;max-width:90%;width:max-content}
#tv[data-tv-design] .ihtv-sx{font-weight:750}
#tv[data-tv-design] .ihtv-ss{font-size:var(--small);color:var(--sub);margin-top:.45em;max-width:38em}
#tv[data-tv-design] .ihtv-sp{width:1em;height:1em;border-radius:50%;border:2px solid var(--line);border-top-color:var(--mint);margin:0 auto .6em;animation:tvDesignSpin 1s linear infinite}
#tv[data-tv-design] .ihtv-numbox.show,#tv[data-tv-design] .ihtv-tip.show{position:absolute;display:block;z-index:4;padding:.44em .65em;background:#173832}
#tv[data-tv-design] .ihtv-numbox{top:var(--edge);left:var(--edge);font-size:var(--title);font-weight:740}
#tv[data-tv-design] .ihtv-tip{bottom:var(--edge);left:var(--edge);max-width:calc(100% - 2 * var(--edge))}
#tv[data-tv-design].ban .ihtv-tip{bottom:auto;top:var(--edge)}
#row-tv[data-tv-design] #tvHead{display:flex;gap:.65em;align-items:center}
#row-tv[data-tv-design] .tvh-c{color:#b9ccc6;font-size:.78em}
#row-tv[data-tv-design] .tvh-t{color:#9af0d5;font-size:.78em}
#row-tv[data-tv-design].tvcol #tvRow{display:none}
#row-tv[data-tv-design] .tvc{min-height:115px;color:#eef7f3;background:#172f2a;border:1px solid #3d6158;border-radius:9px;padding:11px;cursor:pointer}
#row-tv[data-tv-design] .tvc:is(:focus-visible,:hover,.sel,.on){outline:2px solid #9af0d5;outline-offset:-2px}
#row-tv[data-tv-design] .tvc-top{display:flex;align-items:center;gap:.4em;margin-bottom:6px}
#row-tv[data-tv-design] .tvc-n{color:#b9ccc6;font-size:.82em;font-variant-numeric:tabular-nums}
#row-tv[data-tv-design] .tvc-f{color:#ffe297}
#row-tv[data-tv-design] .tvc-h{font-size:.65em}
#row-tv[data-tv-design] :is(.tvc-nm,.tvc-pg){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#row-tv[data-tv-design] .tvc-nm{font-weight:750}
#row-tv[data-tv-design] .tvc-pg{font-size:.78em;color:#b9ccc6}
#row-tv[data-tv-design] .tvc-bar{height:3px;margin-top:7px;background:#53746a;border-radius:3px;overflow:hidden}
#row-tv[data-tv-design] .tvc-bar i{display:block;height:100%;background:#9af0d5}
#row-tv[data-tv-design] .tvo-i .i{width:27px;height:27px;fill:none;stroke:#9af0d5;stroke-width:1.6}
body[data-theme=studio] #row-tv[data-tv-design] .tvc{background:#242035;border-color:#9e88c860;border-radius:13px;box-shadow:none}
body[data-theme=studio] #row-tv[data-tv-design] .tvc:is(:focus-visible,:hover,.sel,.on){outline-color:#e7d9ff}
body[data-theme=studio] #row-tv[data-tv-design] :is(.tvc-n,.tvc-pg){color:#c3bdd7}
body[data-theme=studio] #row-tv[data-tv-design] .tvc-bar{background:#554967}
body[data-theme=studio] #row-tv[data-tv-design] .tvc-bar i{background:var(--accent)}
body[data-theme=studio] #row-tv[data-tv-design] .tvo-i .i{stroke:var(--accent)}
@keyframes tvDesignSpin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){#tv[data-tv-design] .ihtv-sp{animation:none}}
@media(max-width:720px){
  #tv[data-tv-design] .ihtv-gb{grid-template-columns:minmax(0,1fr)}
  #tv[data-tv-design] .ihtv-gd{top:max(var(--edge),34px)}
  #tv[data-tv-design] :is(.ihtv-lp,.ihtv-op){top:max(var(--edge),34px)}
  #tv[data-tv-design] .ihtv-ctx{left:var(--edge)}
}
@media(max-width:520px){
  #tv[data-tv-design].ban .ihtv-ban{grid-template-columns:auto minmax(0,1fr);gap:10px}
  #tv[data-tv-design] .ihtv-bside{grid-column:1/-1;border-left:0;border-top:1px solid var(--line);padding:.52em 0 0}
  #tv[data-tv-design] .ihtv-bx div{margin:.1em 0 .44em}
  #tv[data-tv-design] .ihtv-bn{font-size:34px}
  #tv[data-tv-design] .ihtv-bname{font-size:var(--small)}
  #tv[data-tv-design] :is(.ihtv-gcols,.ihtv-gr){grid-template-columns:2em minmax(0,1fr) minmax(0,1.3fr)}
  #tv[data-tv-design] :is(.ihtv-gcols,.ihtv-gr) .nx{display:none}
}

/* Kanal seçimi: koyu yayın paneli, mor odak ve ayrı yeşil canlı işareti. */
#tv[data-tv-design] #ihtv-tList{
  --ink:#f5f5fc;--sub:#c3c5d6;--muted:#aeb2c9;--mint:#c4c4ff;
  --line:#34354a;--surface:#141522;--focus:#393961;
  top:50%;bottom:auto;transform:translateY(-50%);
  width:min(calc(100% - 2 * var(--edge)),clamp(392px,37.5vw,790px));
  max-height:calc(100% - 2 * var(--edge));padding:clamp(17px,1.95vw,36px);
  overflow:hidden;
  border-radius:22px;border-color:#464760;
  background:radial-gradient(ellipse at 100% -15%,#343454 0%,transparent 49%),#151624;
  box-shadow:0 32px 90px #090a13b8,0 0 0 1px #0b0c13a0;
}
#tv[data-tv-design] #ihtv-tList .ihtv-head{padding:0;margin:0 0 clamp(12px,2vh,25px);border-bottom:0;align-items:flex-start}
#tv[data-tv-design] #ihtv-tList .ihtv-headcopy{min-width:0}
#tv[data-tv-design] #ihtv-tList .ihtv-headcopy .ihtv-kicker{display:flex;align-items:center;gap:7px;margin-bottom:.5em;color:#d2d2f8}
#tv[data-tv-design] #ihtv-tList .ihtv-headcopy .ihtv-kicker::before{content:'';width:15px;height:9px;border-left:2px solid #c4c4ff;border-right:2px solid #c4c4ff;background:linear-gradient(#c4c4ff,#c4c4ff) center/2px 100% no-repeat;transform:skewX(-16deg)}
#tv[data-tv-design] #ihtv-tList .ihtv-lt{font-size:clamp(32px,3.8vw,68px);letter-spacing:-.054em;line-height:1.01;font-weight:760}
#tv[data-tv-design] #ihtv-tList .ihtv-headmeta{gap:8px}
#tv[data-tv-design] #ihtv-tList .ihtv-clk{color:var(--sub);font-variant-numeric:tabular-nums}
#tv[data-tv-design] #ihtv-tList .ihtv-navbtn{background:#1e2031;border-color:#51526d;padding:.55em .8em;border-radius:8px}
#tv[data-tv-design] #ihtv-tList .ihtv-navbtn[data-action=source]{background:#373655;border-color:#74749c}
#tv[data-tv-design] #ihtv-tList .ihtv-navbtn.is-remote-focus{background:#c4c4ff;border-color:#eeeeff;color:#181830;outline:2px solid #e0dfff;outline-offset:2px}
#tv[data-tv-design] #ihtv-tList .ihtv-chips{margin:0 0 clamp(12px,1.55vh,20px);gap:5px}
#tv[data-tv-design] #ihtv-tList .ihtv-chip{border-radius:7px;padding:.56em .85em;background:#222337;border-color:#373850;font-size:var(--small);line-height:1}
#tv[data-tv-design] #ihtv-tList .ihtv-chip.on{background:#c4c4ff;color:#181830;border-color:#c4c4ff}
#tv[data-tv-design] #ihtv-tList .ihtv-listmeta{margin-bottom:7px;gap:8px}
#tv[data-tv-design] #ihtv-tList :is(.ihtv-listlabel,.ihtv-lc){font-size:var(--micro);line-height:1.3;color:var(--muted);font-weight:690;letter-spacing:.05em}
#tv[data-tv-design] #ihtv-tList .ihtv-listlabel{text-transform:uppercase}
#tv[data-tv-design] #ihtv-tList .ihtv-lc{white-space:nowrap}
#tv[data-tv-design] #ihtv-tList .ihtv-rowsw{padding-right:6px;flex:1 1 auto;min-height:0;overflow:auto}
#tv[data-tv-design] #ihtv-tList .ihtv-rows{gap:3px}
#tv[data-tv-design] #ihtv-tList .ihtv-sb{right:0;width:2px;background:#292a40;pointer-events:none}
#tv[data-tv-design] #ihtv-tList .ihtv-sb i{background:#7778a0}
#tv[data-tv-design] #ihtv-tList .ihtv-sb[hidden]{display:none}
#tv[data-tv-design] #ihtv-tList .ihtv-r{min-height:clamp(34px,5vh,65px);padding:2px 8px;gap:clamp(6px,.78vw,14px);border-radius:7px;background:#1d1e2e;border-color:transparent}
#tv[data-tv-design] #ihtv-tList .ihtv-r:hover{border-color:#76779d}
#tv[data-tv-design] #ihtv-tList .ihtv-r.sel{border-color:#c4c4ff;background:linear-gradient(96deg,#3b3b65,#2f304e);box-shadow:inset 3px 0 0 #c4c4ff}
#tv[data-tv-design] #ihtv-tList.head-focus .ihtv-r.sel{border-color:transparent;background:#1d1e2e;box-shadow:none}
#tv[data-tv-design] #ihtv-tList .ihtv-r.on:not(.sel){background:#242639}
#tv[data-tv-design] #ihtv-tList .ihtv-rn{color:#b9bad2;min-width:1.65em;font-variant-numeric:tabular-nums}
#tv[data-tv-design] #ihtv-tList .ihtv-r.sel .ihtv-rn{color:#efeeff}
#tv[data-tv-design] #ihtv-tList .ihtv-rl{width:clamp(25px,3.65vh,50px);aspect-ratio:1;border-radius:6px;border-color:#ffffff2b;background:linear-gradient(150deg,var(--cc2,#3d405d),#24263abf)}
#tv[data-tv-design] #ihtv-tList .ihtv-rc{font-weight:725;letter-spacing:-.018em;line-height:1.16}
#tv[data-tv-design] #ihtv-tList .ihtv-rg{color:#c3c5da;line-height:1.15;margin-top:2px}
#tv[data-tv-design] #ihtv-tList .ihtv-hd{color:#e3e3f5;border-color:#72738c;vertical-align:1px;font-size:.62em}
#tv[data-tv-design] #ihtv-tList .ihtv-rp{display:none}
#tv[data-tv-design] #ihtv-tList .ihtv-rowstate{display:flex;flex:none;align-items:center;gap:5px;color:#c0f2d2;font-size:var(--micro);font-weight:760;letter-spacing:.045em}
#tv[data-tv-design] #ihtv-tList .ihtv-eq{height:9px}
#tv[data-tv-design] #ihtv-tList .ihtv-eq i{width:2px;background:#a3edbc}
#tv[data-tv-design] #ihtv-tList .ihtv-det{background:#202139;border:1px solid #383a56;border-radius:10px;margin:clamp(9px,1.2vh,17px) 0 0;padding:clamp(9px,1.05vw,16px)}
#tv[data-tv-design] #ihtv-tList .ihtv-det:empty{display:none}
#tv[data-tv-design] #ihtv-tList .ihtv-nowgrid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr)}
#tv[data-tv-design] #ihtv-tList .ihtv-nowgrid>div{min-width:0}
#tv[data-tv-design] #ihtv-tList .ihtv-nowgrid>div:only-child{grid-column:1/-1}
#tv[data-tv-design] #ihtv-tList .ihtv-detnext{padding-left:12px;margin-left:12px;border-left:1px solid #484965}
#tv[data-tv-design] #ihtv-tList .ihtv-nowgrid .ihtv-kicker{font-weight:720;letter-spacing:.09em;margin-bottom:4px}
#tv[data-tv-design] #ihtv-tList .ihtv-nowgrid .ihtv-dt{font-size:var(--small);line-height:1.23;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
#tv[data-tv-design] #ihtv-tList .ihtv-detmeta{display:flex;gap:5px;justify-content:space-between;margin-top:4px;color:var(--sub);font-size:var(--micro);font-variant-numeric:tabular-nums}
#tv[data-tv-design] #ihtv-tList .ihtv-detmeter{height:3px;margin-top:5px;border-radius:4px;background:#505270;overflow:hidden}
#tv[data-tv-design] #ihtv-tList .ihtv-detmeter i{display:block;height:100%;background:#bbbbfa}
#tv[data-tv-design] #ihtv-tList>.ihtv-hints{position:static;top:auto;bottom:auto;margin-top:clamp(10px,1.6vh,18px);padding-top:.65em;border-color:#35364d}
#tv[data-tv-design] #ihtv-tList .ihtv-quick{display:flex;width:100%;gap:4px;align-items:center;flex-wrap:wrap}
#tv[data-tv-design] #ihtv-tList .ihtv-quick button{display:flex;align-items:center;gap:5px;padding:.46em .55em;cursor:pointer;border-radius:6px;border:1px solid #454660;background:#22233a;color:var(--ink);font:inherit;line-height:1}
#tv[data-tv-design] #ihtv-tList .ihtv-quick button:is(:hover,:focus-visible){outline:2px solid #c4c4ff;outline-offset:1px}
#tv[data-tv-design] #ihtv-tList .ihtv-quick button:disabled{opacity:.45;cursor:default}
#tv[data-tv-design] #ihtv-tList .ihtv-quick .ihtv-watchkey{background:#c4c4ff;color:#181830;border-color:#c4c4ff;font-weight:750;padding-inline:.72em}
#tv[data-tv-design] #ihtv-tList .ihtv-watchkey b{padding:.16em .26em;color:#eaeaff;background:#353558;border-radius:3px;font-size:.86em}
#tv[data-tv-design] #ihtv-tList .ihtv-groupkey{margin-left:auto;color:var(--muted);white-space:nowrap}
#tv[data-tv-design] #ihtv-tList .ihtv-groupkey b{margin-right:2px;color:var(--ink)}
#tv[data-tv-design].v-source .ihtv-src{
  --ink:#f5f5fc;--sub:#c3c5d6;--mint:#c4c4ff;--line:#464760;--focus:#393961;
  display:block;top:50%;right:var(--edge);transform:translateY(-50%);
  width:min(calc(100% - 2 * var(--edge)),clamp(355px,34vw,640px));max-height:calc(100% - 2 * var(--edge));
  background:radial-gradient(ellipse at 100% -15%,#343454 0%,transparent 56%),#151624;border-radius:19px;
}
#tv[data-tv-design] .ihtv-src .ihtv-navbtn{background:#222337}
#tv[data-tv-design] .ihtv-srcintro{margin:.55em 0 .82em;color:var(--sub);font-size:var(--small)}
#tv[data-tv-design] .ihtv-src .ihtv-oi{display:flex;align-items:center;gap:.7em;background:#222338;width:100%;color:inherit;text-align:left;font:inherit}
#tv[data-tv-design] .ihtv-src .ihtv-oi.sel{background:var(--focus)}
#tv[data-tv-design] .ihtv-srcicon{display:grid;place-items:center;flex:none;font-size:var(--micro);font-weight:800;width:3.65em;height:2.6em;border-radius:6px;background:#30324c;color:#dedfff}
#tv[data-tv-design] .ihtv-srccopy{flex:1;min-width:0;overflow-wrap:anywhere}
#tv[data-tv-design] .ihtv-srcactive{color:#b9f0cf;font-size:var(--micro);font-weight:750}
#tv[data-tv-design] .ihtv-srcmsg{color:#ffdaa3;margin:.75em 0;font-size:var(--small);overflow-wrap:anywhere}
#tv[data-tv-design].v-hdmi.ban .ihtv-ban{grid-template-columns:auto minmax(0,1fr) auto}
@media(max-height:800px) and (min-width:721px){
  #tv[data-tv-design] #ihtv-tList{padding:clamp(12px,2.4vh,19px);max-height:calc(100% - 32px)}
  #tv[data-tv-design] #ihtv-tList .ihtv-head{margin-bottom:9px}
  #tv[data-tv-design] #ihtv-tList .ihtv-lt{font-size:clamp(31px,5.25vh,43px)}
  #tv[data-tv-design] #ihtv-tList .ihtv-chips{margin-bottom:8px}
  #tv[data-tv-design] #ihtv-tList .ihtv-rows{gap:2px}
  #tv[data-tv-design] #ihtv-tList .ihtv-r{padding-block:1px;font-size:clamp(14px,2.05vh,17px)}
  #tv[data-tv-design] #ihtv-tList .ihtv-rg{font-size:clamp(11px,1.65vh,14px)}
  #tv[data-tv-design] #ihtv-tList .ihtv-det{padding:7px 10px}
  #tv[data-tv-design] #ihtv-tList>.ihtv-hints{margin-top:8px;padding-top:6px}
}
@media(max-width:720px){
  #tv[data-tv-design] #ihtv-tList{top:max(var(--edge),36px);transform:none;max-height:calc(100% - max(var(--edge),36px) - var(--edge))}
}
@media(max-height:590px) and (orientation:landscape){
  #tv[data-tv-design] #ihtv-tList{padding:10px 12px}
  #tv[data-tv-design] #ihtv-tList .ihtv-head{margin-bottom:7px}
  #tv[data-tv-design] #ihtv-tList .ihtv-lt{font-size:25px}
  #tv[data-tv-design] #ihtv-tList .ihtv-kicker{font-size:10px}
  #tv[data-tv-design] #ihtv-tList .ihtv-chips{margin-bottom:5px}
  #tv[data-tv-design] #ihtv-tList .ihtv-chip{font-size:11px;padding:.43em .64em}
  #tv[data-tv-design] #ihtv-tList .ihtv-listmeta{margin-bottom:4px}
  #tv[data-tv-design] #ihtv-tList .ihtv-rows{gap:2px}
  #tv[data-tv-design] #ihtv-tList .ihtv-r{min-height:27px;font-size:13px;padding:0 6px}
  #tv[data-tv-design] #ihtv-tList .ihtv-rl{width:22px}
  #tv[data-tv-design] #ihtv-tList .ihtv-rg{font-size:10px;margin-top:0}
  #tv[data-tv-design]:not(.ed) #ihtv-tList .ihtv-det{display:none}
  #tv[data-tv-design] #ihtv-tList .ihtv-groupkey{display:none}
  #tv[data-tv-design] #ihtv-tList>.ihtv-hints{margin-top:5px;padding-top:5px}
}
@media(max-height:500px) and (orientation:landscape){
  #tv[data-tv-design] #ihtv-tList .ihtv-head{margin-bottom:4px}
  #tv[data-tv-design] #ihtv-tList .ihtv-r{font-size:12px}
}
@media(max-width:425px){
  #tv[data-tv-design] #ihtv-tList{padding:14px;border-radius:15px}
  #tv[data-tv-design] #ihtv-tList .ihtv-clk{display:none}
  #tv[data-tv-design] #ihtv-tList .ihtv-chip{padding:.48em .68em}
  #tv[data-tv-design] #ihtv-tList .ihtv-rowstate span{font-size:9px}
  #tv[data-tv-design] #ihtv-tList .ihtv-groupkey{display:none}
  #tv[data-tv-design].v-hdmi.ban .ihtv-ban{grid-template-columns:auto minmax(0,1fr)}
}
`;
const $t=id=>document.getElementById(id);
const TV={on:false,mode:'watch',all:[],sorted:[],vis:[],list:[],curKey:null,prevKey:null,tuned:false,vid:false,reason:1,fail:'',muted:false,
 filter:'all',sel:0,top:0,prog:{},logos:{},st:null,num:'',loading:false,move:null,multi:false,msel:{},csel:0,cbtn:1,cnf:null,gsel:0,gtop:0,osel:0,ssel:0,sitems:[],last:'',
 hdmi:null,srcBack:'watch',srcSel:0,srcReq:0,srcLoading:false,srcMsg:'',srcHasError:false,hdmiSeq:0,srcNoBridge:false};
const VIS=10,GVIS=8;
const FILT=[['all','Tümü'],['fav','★ Favori'],['hd','HD'],['tv','TV'],['radio','Radyo']];
const hue=s=>{let h=0;s=String(s);for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h)%360};
const col=c=>{const h=hue(c.name||c.id);return{c1:'hsl('+h+',66%,46%)',c2:'hsl('+((h+55)%360)+',58%,26%)'}};
const fmt=ms=>new Date(ms).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
const pct=p=>(p&&p.e>p.s)?Math.max(0,Math.min(100,(Date.now()-p.s)/(p.e-p.s)*100)):0;
const REASON={0:'Görüntü yok',1:'Kanal ayarlanıyor…',2:'Sinyal zayıf veya yok',3:'Arabelleğe alınıyor…',4:'Yalnızca ses (radyo)'};
const isHd=c=>/720|1080|2160|4320/.test(c.vf||'');
const tname=t=>String(t||'').replace('TYPE_','').replace(/_/g,'-')||'—';
const ini=s=>String(s||'?').replace(/\s+/g,'').slice(0,3).toUpperCase();
const X=()=>S.tvx||(S.tvx={hide:{},order:[],name:{},fav:{},last:''});
const curCh=()=>TV.all.find(c=>c.key===TV.curKey)||null;
const selCh=()=>TV.list[TV.sel]||null;
const EDITM=['edit','move','ctx','cnf'];
const NUMM=['watch','list','edit','guide','opts'];
const inList=()=>TV.mode==='list'||EDITM.indexOf(TV.mode)>=0;
const logoSrc=id=>/^[A-Za-z0-9+/]+={0,2}$/.test(TV.logos[id]||'')?'data:image/png;base64,'+TV.logos[id]:'';
const logoHtml=c=>{const src=logoSrc(c.id);return src?'<img src="'+src+'" alt="">':esc(ini(c.dn))};

/* ---------- Program (EPG) ---------- */
function nowNext(c){const p=c&&TV.prog[c.id],l=p?p.l:[],n=Date.now(),i=l.findIndex(x=>x.s<=n&&x.e>n);return{now:i>=0?l[i]:null,next:i>=0?(l[i+1]||null):(l.find(x=>x.s>n)||null),all:l}}
async function loadProgs(ids){
  ids=ids.filter(id=>{const p=TV.prog[id];return !p||Date.now()-p.t>300000});if(!ids.length)return;
  ids.forEach(id=>{TV.prog[id]={t:Date.now(),l:(TV.prog[id]||{l:[]}).l}});
  const r=await N('tvPrograms',{ids,from:Date.now()-2*3600e3,to:Date.now()+12*3600e3});
  const m=(r&&r.map)||{};for(const k in m)TV.prog[k]={t:Date.now(),l:m[k]};
  if(TV.on)refresh();stripRender()}
async function loadLogos(sl){
  const need=sl.filter(c=>TV.logos[c.id]===undefined).map(c=>c.id);if(!need.length)return;
  need.forEach(id=>{TV.logos[id]=0});
  try{const r=await N('tvLogos',{ids:need}),m=(r&&r.map)||{};
    for(const id of need){const d=m[id];TV.logos[id]=d||0;
      const src=logoSrc(id);
      if(src)document.querySelectorAll('[data-lg]').forEach(e=>{
        if(e.dataset.lg!==String(id))return;
        const img=document.createElement('img');img.src=src;img.alt='';e.textContent='';e.appendChild(img)})}}
  catch(e){need.forEach(id=>{delete TV.logos[id]})}}

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
function installDesign(){
  if($t('tvDesign'))return;
  const style=document.createElement('style');style.id='tvDesign';
  style.textContent=TV_DESIGN;document.head.appendChild(style)}
function navBtn(action,label){
  return '<button class="ihtv-navbtn" type="button" data-action="'+action+'" onclick="TVUI.nav(\''+action+'\')">'+label+'</button>'}
function panelHead(kicker,title,meta,actions){
  return '<header class="ihtv-head"><div class="ihtv-headcopy"><div class="ihtv-kicker">'+kicker+'</div><h2 class="ihtv-lt">'+title+'</h2></div>'+
    '<div class="ihtv-headmeta">'+(meta||'')+(actions||'')+'</div></header>'}
function build(){
  if($t('tv'))return;
  installDesign();
  const d=document.createElement('div');d.id='tv';d.dataset.m='watch';d.dataset.tvDesign='4';
  d.innerHTML=
  '<div class="ihtv-ban" id="ihtv-tBan"></div><div class="ihtv-ck2" id="ihtv-tClk"></div>'+
  '<section class="ihtv-lp" id="ihtv-tList" aria-labelledby="ihtv-lTitle">'+
   panelHead('CANLI TV','<span id="ihtv-lTitle">Kanallar</span>','<span class="ihtv-clk" id="ihtv-lClk"></span>',navBtn('source','Kaynaklar')+navBtn('back','Geri'))+
   '<div class="ihtv-chips" id="ihtv-lChips"></div><div class="ihtv-listmeta"><span class="ihtv-listlabel" id="ihtv-lMode">Kanal listesi</span><span class="ihtv-lc" id="ihtv-lCnt"></span></div>'+
   '<div class="ihtv-rowsw"><div class="ihtv-rows" id="ihtv-lRows"></div><div class="ihtv-sb" aria-hidden="true"><i id="ihtv-lBar"></i></div></div>'+
   '<div class="ihtv-det" id="ihtv-lDet"></div><div class="ihtv-hints" id="ihtv-lHints"></div></section>'+
  '<div class="ihtv-gd" id="ihtv-tGuide"></div>'+
  '<div class="ihtv-op" id="ihtv-tOpts"></div>'+
  '<div class="ihtv-su" id="ihtv-tSetup"></div>'+
  '<section class="ihtv-src" id="ihtv-tSrc" aria-label="Kaynaklar"></section>'+
  '<div class="ihtv-ctx" id="ihtv-tCtx"></div><div class="ihtv-cnf" id="ihtv-tCnf"></div>'+
  '<div class="ihtv-numbox" id="ihtv-tNum" role="status"></div><div class="ihtv-stat" id="ihtv-tStat"></div><div class="ihtv-tip" id="ihtv-tTip" role="status"></div>';
  document.body.appendChild(d)}
function setMode(m){
  if(m!=='source'&&TV.mode!=='source')TV.listHead=false;
  TV.mode=m;if(EDITM.indexOf(m)<0){TV.multi=false;TV.msel={}}const T=$t('tv');T.dataset.m=m;
  T.classList.toggle('v-list',inList());T.classList.toggle('ed',EDITM.indexOf(m)>=0);
  T.classList.toggle('v-guide',m==='guide');T.classList.toggle('v-opts',m==='opts');T.classList.toggle('v-setup',m==='setup');
  T.classList.toggle('v-ctx',m==='ctx');T.classList.toggle('v-cnf',m==='cnf');
  T.classList.toggle('v-source',m==='source');T.classList.toggle('v-hdmi',m==='hdmi');
  if(m!=='watch'&&m!=='hdmi')T.classList.remove('ban','clk');
  render();sig()}
function render(){
  if(inList())renderList();else if(TV.mode==='guide')renderGuide();else if(TV.mode==='opts')renderOpts();else if(TV.mode==='setup')renderSetup();else if(TV.mode==='source')renderSources();
  if(TV.mode==='ctx')renderCtx();if(TV.mode==='cnf')renderCnf()}
function refresh(){if(!TV.on)return;render();if(TV.mode==='watch'&&$t('tv').classList.contains('ban'))banner()}
function tip(t){const e=$t('ihtv-tTip');e.textContent=t;e.classList.add('show');clearTimeout(TV.tpt);TV.tpt=setTimeout(()=>e.classList.remove('show'),2400)}

/* ---------- Kanal listesi ---------- */
function rowHtml(c,i){
  const k=col(c),n=nowNext(c).now,x=X(),on=c.key===TV.curKey,mv=TV.move&&(TV.move.key===c.key||(TV.move.keys&&TV.move.keys.indexOf(c.key)>=0));
  const lg=logoHtml(c),ed=EDITM.indexOf(TV.mode)>=0;
  return '<div class="ihtv-r'+(i===TV.sel?' sel':'')+(on?' on':'')+(mv?' mv':'')+(TV.multi&&TV.msel[c.key]?' msel':'')+'" style="--cc:'+k.c1+';--cc2:'+k.c2+'" onclick="TVUI.row('+i+')">'+(ed?(TV.multi?'<div class="ihtv-ck'+(TV.msel[c.key]?' on':'')+'">'+(TV.msel[c.key]?'✓':'')+'</div>':'<div class="ihtv-grip">⠿</div>'):'')+'<div class="ihtv-rn">'+c.n+'</div><div class="ihtv-rl" data-lg="'+esc(c.id)+'">'+lg+'</div>'+
   '<div class="ihtv-rt"><div class="ihtv-rc">'+esc(c.dn)+(isHd(c)?'<span class="ihtv-hd">HD</span>':'')+(x.fav[c.key]?'<span class="ihtv-fv">★</span>':'')+(ed&&x.name[c.key]?'<span class="ihtv-tag">✎ özel ad</span>':'')+(ed&&c.radio?'<span class="ihtv-tag">RADYO</span>':'')+'</div><div class="ihtv-rg">'+esc(n?n.t:(c.radio?'Radyo yayını':'Program bilgisi yok'))+'</div></div>'+
   (mv?'<div class="ihtv-mvi" aria-label="Taşınıyor">↕</div>':(on?'<div class="ihtv-rowstate"><div class="ihtv-eq" aria-hidden="true"><i></i><i></i><i></i></div><span>YAYINDA</span></div>':''))+'</div>'}
function hint(c,txt){return '<span class="ihtv-h">'+(c?'<i class="'+c+'"></i>':'')+txt+'</span>'}
function listProgram(c,nn){
  if(!c)return '';
  const n=nn.now,x=nn.next;
  return '<div class="ihtv-nowgrid"><div><div class="ihtv-kicker">ŞİMDİ</div><div class="ihtv-dt">'+esc(n?n.t:(c.radio?'Radyo yayını':'Program bilgisi yok'))+'</div>'+
    (n?'<div class="ihtv-detmeta"><span>'+fmt(n.s)+' – '+fmt(n.e)+'</span><span>%'+Math.round(pct(n))+'</span></div><div class="ihtv-detmeter" aria-hidden="true"><i style="width:'+pct(n)+'%"></i></div>':'')+'</div>'+
    (x?'<div class="ihtv-detnext"><div class="ihtv-kicker">SONRA</div><div class="ihtv-dt">'+esc(x.t)+'</div><div class="ihtv-detmeta">'+fmt(x.s)+'</div></div>':'')+'</div>'}
function listQuick(c){
  const actions=[['red','r','Favori'],['green','g','Düzenle'],['yellow','y','Rehber'],['blue','b','Seçenekler']];
  return '<div class="ihtv-quick"><button type="button" class="ihtv-watchkey"'+(c?'':' disabled')+' onclick="TVUI.nav(\'ok\')"><b>OK</b> İzle</button>'+
    actions.map(([key,color,label])=>'<button type="button"'+(!c&&key==='red'?' disabled':'')+' onclick="TVUI.nav(\''+key+'\')">'+hint(color,label)+'</button>').join('')+
    '<span class="ihtv-groupkey"><b>Menü</b> Kaynaklar</span></div>'}
function renderList(){
  const L=TV.list;
  if(TV.sel>=L.length)TV.sel=Math.max(0,L.length-1);if(TV.sel<0)TV.sel=0;
  if(TV.sel<TV.top)TV.top=TV.sel;else if(TV.sel>=TV.top+VIS)TV.top=TV.sel-VIS+1;
  TV.top=Math.max(0,Math.min(TV.top,Math.max(0,L.length-VIS)));
  const sl=L.slice(TV.top,TV.top+VIS);
  $t('ihtv-lRows').innerHTML=L.length?sl.map((c,j)=>rowHtml(c,TV.top+j)).join(''):'<div class="ihtv-empty">'+(TV.filter==='fav'?'Favori kanal yok. Kırmızı tuşla ekle.':'Bu grupta kanal yok')+'</div>';
  const locked=TV.mode==='move'||TV.mode==='ctx'||TV.mode==='cnf';
  $t('ihtv-lChips').innerHTML=FILT.map(f=>'<button type="button" class="ihtv-chip'+(TV.filter===f[0]?' on':'')+'" aria-pressed="'+(TV.filter===f[0])+'"'+(locked?' disabled':'')+' onclick="TVUI.chip(\''+f[0]+'\')">'+f[1]+'</button>').join('');
  $t('ihtv-lCnt').textContent=L.length?(TV.sel+1)+' / '+L.length:'0';
  const bar=$t('ihtv-lBar');bar.parentElement.hidden=L.length<=VIS;bar.style.height=Math.max(8,Math.min(100,VIS/Math.max(VIS,L.length)*100))+'%';bar.style.top=(L.length>VIS?TV.top/(L.length-VIS)*(100-parseFloat(bar.style.height)):0)+'%';
  const c=selCh(),nn=c?nowNext(c):{now:null,next:null};
  const hidn=Object.keys(X().hide).length,edm=EDITM.indexOf(TV.mode)>=0;
  $t('ihtv-lTitle').textContent=edm?'Kanal düzenleme':'Kanallar';
  $t('ihtv-lMode').textContent=TV.mode==='move'?'Sıralama':TV.multi?'Çoklu seçim':'Kanal listesi';
  if(edm&&TV.multi&&TV.mode!=='move'){const n=mKeys().length;
    $t('ihtv-lDet').innerHTML='<div class="ihtv-dt">'+n+' kanal seçili</div><div class="ihtv-dm">Toplam '+TV.vis.length+' kanal'+(hidn?'  ·  Kaldırılan: '+hidn:'')+'</div><div class="ihtv-dd">OK: işaretle ve ilerle  ·  Kırmızı: seçilenleri sil  ·  Yeşil: seçilenleri taşı  ·  Sarı: tümünü seç / temizle  ·  Mavi: favori  ·  Menü: daha fazla</div>'}
  else if(edm&&c){const inp=((TV.st&&TV.st.inputs)||[]).find(i=>i.id===c.in);
    $t('ihtv-lDet').innerHTML='<div class="ihtv-dt">'+(TV.move&&TV.move.keys?TV.move.keys.length+' kanal (blok)':esc(c.dn))+'</div><div class="ihtv-dm">Kanal '+c.n+'  ·  '+(c.radio?'Radyo':'TV')+(isHd(c)?'  ·  HD':'')+(c.dn!==c.name?'  ·  özgün: '+esc(c.name):'')+'</div><div class="ihtv-dd">Kaynak: '+esc(inp?inp.label:(c.in||'—'))+(hidn?'  ·  Kaldırılan kanal: '+hidn:'')+'</div><div class="ihtv-dn">'+(TV.mode==='move'?'▲▼ ile yeni yerine taşı, OK ile bırak, Geri ile iptal':'OK: işlem menüsü  ·  Kırmızı: sil  ·  Yeşil: taşı  ·  Menü: çoklu seçim')+'</div>'}
  else $t('ihtv-lDet').innerHTML=listProgram(c,nn);
  const m=TV.mode;
  $t('ihtv-lHints').innerHTML=m==='move'?hint('', '<b>▲▼</b> Taşı')+hint('','<b>OK</b> Bırak')+hint('','<b>Geri</b> İptal')
   :(m==='list'?listQuick(c)
   :(TV.multi?hint('','<b>OK</b> İşaretle')+hint('r','Sil')+hint('g','Taşı')+hint('y','Tümü')+hint('b','Favori')+hint('','<b>Menü</b> Daha fazla')+hint('','<b>Geri</b> Çık')
    :hint('','<b>OK</b> İşlemler')+hint('r','Sil')+hint('g','Taşı')+hint('y','Adlandır')+hint('b','Favori')+hint('','<b>Menü</b> Çoklu seçim')+hint('','<b>Geri</b> Bitir')));
  const list=$t('ihtv-tList'),head=m==='list'&&!!TV.listHead;
  list.classList.toggle('head-focus',head);
  list.querySelector('[data-action=source]').classList.toggle('is-remote-focus',head);
  ensureVisible($t('ihtv-lRows').parentElement);loadProgs(sl.map(q=>q.id));loadLogos(sl);clock()}
function ensureVisible(panel){
  const el=panel.querySelector('.sel');if(!el||panel.scrollHeight<=panel.clientHeight)return;
  const a=el.getBoundingClientRect(),b=panel.getBoundingClientRect();
  if(a.bottom>b.bottom-12)panel.scrollTop+=a.bottom-b.bottom+12;
  else if(a.top<b.top+12)panel.scrollTop-=b.top-a.top+12}
function setFilter(f){TV.filter=f;filterList();const i=TV.list.findIndex(c=>c.key===TV.curKey);TV.sel=i>=0?i:0;TV.top=0;render()}
function moveSel(d){const n=TV.list.length;if(!n)return;TV.sel=(TV.sel+d+n)%n;render()}

/* ---------- Düzenleme ---------- */
function editFav(c){const x=X();if(x.fav[c.key]){delete x.fav[c.key];tip('Favorilerden çıkarıldı')}else{x.fav[c.key]=1;tip('★ Favorilere eklendi')}save();filterList();render()}
function startMove(c){setFilter('all');const x=X();TV.move={key:c.key,snap:x.order.slice()};TV.sel=TV.list.findIndex(q=>q.key===c.key);setMode('move')}
function doMove(d){
  const x=X(),mv=TV.move,set=new Set(mv.keys||[mv.key]),v=TV.vis.map(c=>c.key);let ch=false;
  if(d<0){for(let i=1;i<v.length;i++)if(set.has(v[i])&&!set.has(v[i-1])){const t=v[i-1];v[i-1]=v[i];v[i]=t;ch=true}}
  else{for(let i=v.length-2;i>=0;i--)if(set.has(v[i])&&!set.has(v[i+1])){const t=v[i+1];v[i+1]=v[i];v[i]=t;ch=true}}
  if(!ch)return;x.order=v.concat(TV.sorted.filter(c=>x.hide[c.key]).map(c=>c.key));rebuild();
  const ks=v.filter(k=>set.has(k));TV.sel=TV.list.findIndex(c=>c.key===(d<0?ks[0]:ks[ks.length-1]));render()}
function endMove(ok){const x=X(),mv=TV.move;if(!ok&&mv)x.order=mv.snap;TV.move=null;if(ok)save();rebuild();if(!ok&&mv)TV.sel=Math.max(0,TV.list.findIndex(c=>c.key===mv.key));setMode('edit');if(ok)tip('Sıra kaydedildi')}
function toTop(c){const x=X();x.order=TV.sorted.map(q=>q.key).filter(k=>k!==c.key);x.order.unshift(c.key);save();rebuild();TV.sel=Math.max(0,TV.list.findIndex(q=>q.key===c.key));setMode('edit');tip('En üste alındı')}
async function toPos(c){const v=await ask('Yeni kanal numarası (1–'+TV.vis.length+')',String(c.n));if(v===null)return;let n=parseInt(v,10);if(!(n>=1)){tip('Geçersiz numara');return}n=Math.min(n,TV.vis.length);
  const x=X(),keys=TV.vis.map(q=>q.key).filter(k=>k!==c.key);keys.splice(n-1,0,c.key);x.order=keys.concat(TV.sorted.filter(q=>x.hide[q.key]).map(q=>q.key));save();rebuild();TV.sel=Math.max(0,TV.list.findIndex(q=>q.key===c.key));render();tip('Kanal '+n+' numarasına taşındı')}
function origName(c){const x=X();delete x.name[c.key];save();rebuild();render();tip('Özgün ada dönüldü')}
function sortAz(){const x=X();x.order=TV.sorted.slice().sort((a,b)=>String(a.dn).localeCompare(String(b.dn),'tr')).map(c=>c.key);save();rebuild();TV.sel=0;TV.top=0;tip('A→Z sıralandı')}
function favsFirst(){const x=X(),k=TV.sorted.map(c=>c.key);x.order=k.filter(a=>x.fav[a]).concat(k.filter(a=>!x.fav[a]));save();rebuild();TV.sel=0;TV.top=0;tip('Favoriler üste alındı')}
function clearFavs(){const x=X(),n=Object.keys(x.fav).length;x.fav={};save();rebuild();tip(n?n+' favori temizlendi':'Favori yok')}
/* ---------- Çoklu seçim ---------- */
const mKeys=()=>TV.vis.filter(c=>TV.msel[c.key]).map(c=>c.key);
function mStart(c){TV.multi=true;TV.msel={};if(c)TV.msel[c.key]=1;setMode('edit');tip('Çoklu seçim: OK ile işaretle, ilerle')}
function mEnd(){TV.multi=false;TV.msel={};render();tip('Çoklu seçimden çıkıldı')}
function mSel(c){if(TV.msel[c.key])delete TV.msel[c.key];else TV.msel[c.key]=1;render()}
function mAll(){const L=TV.list,all=L.length&&L.every(c=>TV.msel[c.key]);L.forEach(c=>{if(all)delete TV.msel[c.key];else TV.msel[c.key]=1});render();tip(all?'Seçim temizlendi':L.length+' kanal seçildi')}
function mRange(dir){const L=TV.list;if(!L.length){tip('Bu grupta kanal yok');return}const a=dir>0?TV.sel:0,b=dir>0?L.length-1:TV.sel;for(let i=a;i<=b;i++)TV.msel[L[i].key]=1;render();tip(mKeys().length+' kanal seçili')}
function mDel(){const n=mKeys().length;if(!n){tip('Önce kanal seç');setMode('edit');return}
  TV.cnf={t:n+' kanal listeden kaldırılsın mı?',s:'Sistem kanal veritabanından silinmez; Seçenekler’den geri getirilebilir.',yes:mDelDo};TV.cbtn=1;setMode('cnf')}
function mDelDo(){const x=X(),ks=mKeys(),cur=TV.curKey,wasCur=ks.indexOf(cur)>=0;ks.forEach(k=>{x.hide[k]=1});save();TV.msel={};rebuild();
  if(wasCur){const nx=TV.vis[0];if(nx)tune(nx);else{stopTv();TV.tuned=false;TV.curKey=null}}
  setMode('edit');tip(ks.length+' kanal kaldırıldı')}
function mFav(){const ks=mKeys();if(!ks.length){tip('Önce kanal seç');return}const x=X(),all=ks.every(k=>x.fav[k]);ks.forEach(k=>{if(all)delete x.fav[k];else x.fav[k]=1});save();filterList();render();tip(all?'Favoriden çıkarıldı':'★ Favorilere eklendi')}
function mEdge(top){const ks=mKeys();if(!ks.length){tip('Önce kanal seç');setMode('edit');return}const x=X(),set=new Set(ks),rest=TV.vis.map(c=>c.key).filter(k=>!set.has(k));
  x.order=(top?ks.concat(rest):rest.concat(ks)).concat(TV.sorted.filter(c=>x.hide[c.key]).map(c=>c.key));save();rebuild();TV.sel=Math.max(0,TV.list.findIndex(c=>c.key===ks[0]));setMode('edit');tip(ks.length+' kanal '+(top?'en üste':'en alta')+' alındı')}
function mMoveStart(){const ks=mKeys();if(!ks.length){tip('Önce kanal seç');setMode('edit');return}setFilter('all');const x=X();
  TV.move={key:ks[0],keys:ks,snap:x.order.slice()};TV.sel=Math.max(0,TV.list.findIndex(q=>q.key===ks[0]));setMode('move')}
function askDelete(c){TV.cnf={t:'“'+c.dn+'” listeden kaldırılsın mı?',s:'Sistem kanal veritabanından silinmez; Seçenekler’den geri getirilebilir.',yes:()=>delCh(c)};TV.cbtn=1;setMode('cnf')}
function delCh(c){
  const x=X(),wasCur=c.key===TV.curKey;x.hide[c.key]=1;save();rebuild();
  if(wasCur){const nx=TV.vis[Math.min(TV.sel,TV.vis.length-1)];if(nx)tune(nx);else{stopTv();TV.tuned=false;TV.curKey=null}}
  setMode('edit');tip('Kanal kaldırıldı')}
async function rename(c){
  const v=await ask('Kanal adı',c.dn);if(v===null)return;const x=X(),t=String(v).trim();
  if(t&&t!==c.name)x.name[c.key]=t;else delete x.name[c.key];save();rebuild();render();tip('Ad güncellendi')}
function restoreAll(){const x=X(),n=Object.keys(x.hide).length;x.hide={};save();rebuild();tip(n?n+' kanal geri getirildi':'Gizli kanal yok')}
function resetOrder(){const x=X();x.order=[];x.name={};save();rebuild();tip('Sıra ve adlar sıfırlandı')}
const CTX=()=>{if(TV.multi){const n=mKeys().length;return [[n+' seçili kanalı sil','🗑',()=>mDel()],['Seçilenleri taşı (blok)','↕',()=>mMoveStart()],['Seçilenleri en üste al','⤒',()=>mEdge(true)],['Seçilenleri en alta al','⤓',()=>mEdge(false)],['Seçilenleri favori yap / çıkar','★',()=>{setMode('edit');mFav()}],['Buradan sona kadar seç','⇩',()=>{setMode('edit');mRange(1)}],['Baştan buraya kadar seç','⇧',()=>{setMode('edit');mRange(-1)}],['Tümünü seç / temizle','☑',()=>{setMode('edit');mAll()}],['Çoklu seçimden çık','✖',()=>{setMode('edit');mEnd()}]]}
  const c=selCh(),x=X(),f=c&&x.fav[c.key],rn=c&&x.name[c.key];
  const it=[['Taşı','↕',()=>startMove(c)],['Çoklu seçim','☑',()=>mStart(c)],['En üste al','⤒',()=>toTop(c)],['Numara ver…','#',()=>{setMode('edit');toPos(c)}],['Adını değiştir','✎',()=>{setMode('edit');rename(c)}]];
  if(rn)it.push(['Özgün ada dön','↺',()=>{setMode('edit');origName(c)}]);
  it.push([f?'Favoriden çıkar':'Favorilere ekle','★',()=>{setMode('edit');editFav(c)}],['Listeden kaldır','🗑',()=>askDelete(c)]);return it};
function renderCtx(){const c=selCh(),it=CTX();$t('ihtv-tCtx').innerHTML='<div class="ihtv-ct">'+esc(TV.multi?'Çoklu seçim · '+mKeys().length+' kanal':(c?c.dn:''))+'</div>'+it.map((a,i)=>'<div class="ihtv-ci'+(i===TV.csel?' sel':'')+'" onclick="TVUI.ctx('+i+')"><span>'+a[1]+'</span>'+a[0]+'</div>').join('')}
function renderCnf(){const k=TV.cnf||{t:'',s:''};$t('ihtv-tCnf').innerHTML='<div class="ihtv-cb"><div class="ihtv-cq">'+esc(k.t)+'</div><div class="ihtv-cs">'+esc(k.s||'')+'</div><div class="ihtv-cbs"><div class="ihtv-cbn'+(TV.cbtn===0?' sel':'')+'" onclick="TVUI.cnfPick(0)">Evet, kaldır</div><div class="ihtv-cbn'+(TV.cbtn===1?' sel':'')+'" onclick="TVUI.cnfPick(1)">Vazgeç</div></div></div>'}

/* ---------- Rehber (EPG) ---------- */
function openGuide(){const i=TV.list.findIndex(c=>c.key===TV.curKey);TV.gsel=i>=0?i:0;TV.gtop=0;setMode('guide')}
function renderGuide(){
  const L=TV.list,group=FILT.find(f=>f[0]===TV.filter)[1];
  const header=panelHead('YAYIN AKIŞI','Program Rehberi','<span class="ihtv-clk" id="ihtv-gClk"></span>',navBtn('back','Geri'));
  const footer='<div class="ihtv-hints">'+hint('','<b>▲▼</b> Kanal')+hint('','<b>◀▶</b> Grup')+hint('','<b>OK</b> İzle')+hint('g','Düzenle')+hint('b','Seçenekler')+hint('','<b>Geri</b> Kapat')+'</div>';
  if(!L.length){$t('ihtv-tGuide').innerHTML=header+'<div class="ihtv-guidegroup">'+esc(group)+'</div><div class="ihtv-empty">Bu grupta kanal yok.</div>'+footer;clock();return}
  if(TV.gsel>=L.length)TV.gsel=L.length-1;if(TV.gsel<TV.gtop)TV.gtop=TV.gsel;else if(TV.gsel>=TV.gtop+GVIS)TV.gtop=TV.gsel-GVIS+1;
  TV.gtop=Math.max(0,Math.min(TV.gtop,Math.max(0,L.length-GVIS)));
  const sl=L.slice(TV.gtop,TV.gtop+GVIS),c=L[TV.gsel],nn=nowNext(c);
  const rows=sl.map((q,j)=>{const i=TV.gtop+j,a=nowNext(q),n=a.now,x=a.next;
    return '<div class="ihtv-gr'+(i===TV.gsel?' sel':'')+(q.key===TV.curKey?' on':'')+'" onclick="TVUI.grow('+i+')"><div class="ihtv-rn">'+q.n+'</div><div class="ihtv-gc">'+esc(q.dn)+'</div><div class="ihtv-gp"><div class="x">'+esc(n?n.t:'Program bilgisi yok')+'</div>'+(n?'<div class="y">'+fmt(n.s)+' – '+fmt(n.e)+'</div><div class="z"><i style="width:'+pct(n)+'%"></i></div>':'')+'</div><div class="ihtv-gp nx"><div class="x">'+esc(x?x.t:'')+'</div>'+(x?'<div class="y">'+fmt(x.s)+'</div>':'')+'</div></div>'}).join('');
  const up=nn.all.filter(p=>p.s>Date.now()).slice(0,8).map(p=>'<div class="ihtv-up"><b>'+fmt(p.s)+'</b><span>'+esc(p.t)+'</span></div>').join('')||'<div class="ihtv-empty">Bu kanal için sonraki program bilgisi yok.</div>';
  $t('ihtv-tGuide').innerHTML=header+'<div class="ihtv-guidegroup"><span>'+esc(group)+'</span><span>'+(TV.gsel+1)+' / '+L.length+'</span></div>'+
    '<div class="ihtv-gb"><div class="ihtv-gl"><div class="ihtv-gcols"><span>NO</span><span>KANAL</span><span>ŞİMDİ</span><span class="nx">SONRA</span></div>'+rows+'</div><div class="ihtv-gdet"><div class="ihtv-gdn">'+c.n+' · '+esc(c.dn)+'</div>'+
    (nn.now?'<div class="ihtv-gdt">'+esc(nn.now.t)+'</div><div class="ihtv-gdm">'+fmt(nn.now.s)+' – '+fmt(nn.now.e)+'</div><div class="ihtv-gdd">'+esc(nn.now.d||'')+'</div>':'<div class="ihtv-gdt">Program bilgisi yok</div>')+'<div class="ihtv-gul">Sıradaki programlar</div>'+up+'</div></div>'+
    footer;
  ensureVisible($t('ihtv-tGuide'));loadProgs(sl.map(q=>q.id).concat([c.id]));clock()}

/* ---------- Seçenekler ---------- */
function optItems(){
  const hid=Object.keys(X().hide).length;
  return[
   {t:'Kaynaklar',s:'Canlı TV ve HDMI girişleri',fn:openSources},
   {t:TV.muted?'Sesi aç':'Sessiz',s:'Yayın sesini kapat / aç',fn:muteT},
   {t:'Kanal listesi',s:'Kanalları gez ve seç',fn:()=>setMode('list')},
   {t:'Program rehberi',s:'Şimdi / sonraki programlar',fn:openGuide},
   {t:'Kanalları düzenle',s:'Taşı · adlandır · kaldır · favori',fn:()=>setMode('edit')},
   {t:'Kanal tara',s:'Uydu ayarları ve kanal arama',fn:scan},
   {t:'Kanalları toplu düzenle',s:'Çoklu seçim: toplu sil, taşı, favori',fn:()=>{setMode('edit');mStart(null)}},
   {t:'A→Z sırala',s:'Tüm kanalları ada göre diz',fn:()=>{sortAz();setMode('list')}},
   {t:'Favorileri üste al',s:'Favori kanalları listenin başına taşı',fn:()=>{favsFirst();setMode('list')}},
   {t:'Favorileri temizle',s:'Tüm yıldızları kaldır',fn:clearFavs},
   {t:SX().open?'Ana ekran şeridini gizle':'Ana ekran şeridini göster',s:'Ana ekrandaki Canlı TV kanal şeridi',fn:()=>{const x=SX();x.open=!x.open;save();stripRender();tip(x.open?'Şerit gösterilecek':'Şerit gizlendi');if(TV.mode==='opts')render()}},
   {t:'Kaldırılanları geri getir'+(hid?' ('+hid+')':''),s:'Gizlenen kanalları listeye ekle',fn:restoreAll},
   {t:'Sırayı ve adları sıfırla',s:'Sistem sırasına dön',fn:resetOrder},
   {t:'Sistem TV uygulamasında aç',s:'Bu kanalı cihazın kendi TV ekranında göster',fn:()=>{const c=curCh();if(c)N('tvExternal',{id:c.id})}},
   {t:'Tanı',s:'İzin, giriş ve sinyal bilgisi',fn:diag},
   {t:'Canlı TV’den çık',s:'Ana ekrana dön',fn:close}]}
function renderOpts(){
  const it=optItems(),OV=8;if(TV.osel>=it.length)TV.osel=it.length-1;
  let top=TV.otop||0;if(TV.osel<top)top=TV.osel;else if(TV.osel>=top+OV)top=TV.osel-OV+1;top=Math.max(0,Math.min(top,Math.max(0,it.length-OV)));TV.otop=top;
  const sl=it.slice(top,top+OV);
  $t('ihtv-tOpts').innerHTML=panelHead('CANLI TV','Seçenekler','<span class="ihtv-lc">'+(TV.osel+1)+' / '+it.length+'</span>',navBtn('back','Geri'))+(top>0?'<div class="ihtv-more">▲</div>':'<div class="ihtv-more"></div>')+sl.map((o,j)=>{const i=top+j;return '<div class="ihtv-oi'+(i===TV.osel?' sel':'')+'" onclick="TVUI.opt('+i+')"><div class="a">'+esc(o.t)+'</div><div class="b">'+esc(o.s)+'</div></div>'}).join('')+(top+OV<it.length?'<div class="ihtv-more">▼</div>':'<div class="ihtv-more"></div>')+'<div class="ihtv-hints">'+hint('','<b>▲▼</b> Seç')+hint('','<b>OK</b> Uygula')+hint('','<b>Geri</b> Kapat')+'</div>';
  ensureVisible($t('ihtv-tOpts'))}
function muteT(){TV.muted=!TV.muted;N('tvMute',{m:TV.muted});tip(TV.muted?'🔇 Ses kapalı':'🔊 Ses açık');if(TV.mode==='opts')render()}
function scan(){
  const tu=((TV.st&&TV.st.inputs)||[]).filter(i=>i.tuner&&i.setup);
  if(!tu.length){tip('Kurulum ekranı sunan tuner girişi yok');return}
  if(tu.length===1)scanIn(tu[0].id);else menu('Kanal tara',tu.map(i=>[i.label,()=>scanIn(i.id)]))}
async function scanIn(id){const r=await N('tvSetup',{input:id});if(!r||!r.ok)tip((r&&r.error)||'Açılamadı')}
async function diag(){
  const st=await N('tvState');let d='İzin (READ_TV_LISTINGS): '+(st.perm?'var':'YOK')+'\nTV girişleri: '+((st.inputs||[]).map(i=>i.label+' ['+(i.tuner?'TUNER':i.type)+'] '+i.id).join('; ')||'yok')+'\nKanal sayısı: '+TV.all.length+'\nSon TvView olayı: '+(TV.last||'yok');
  try{if(await adbReady()){const r=await N('adb',{c:'dumpsys tv_input | head -n 25'});d+='\n\n'+String(r.out||'').slice(0,700)}}catch(e){}info('Canlı TV tanı',d)}

/* ---------- HDMI / kaynaklar ---------- */
function hdmiPorts(){
  if(Array.isArray(TV.launcherPorts))return TV.launcherPorts;
  const all=TV.st&&Array.isArray(TV.st.inputs)?TV.st.inputs:[];
  const unique=new Set();
  return all.filter(i=>{
    if(!i||typeof i.id!=='string'||!i.id||i.tuner||unique.has(i.id))return false;
    const type=String(i.type||'').toUpperCase(), label=String(i.label||'');
    if(type!=='1007'&&type!=='TYPE_HDMI'&&type!=='HDMI'&&!/^\s*HDMI(?=$|[\s-]|\d)/i.test(label))return false;
    unique.add(i.id);return true;
  }).sort((a,b)=>String(a.label||'').localeCompare(String(b.label||''),'tr',{numeric:true}))}
function srcItems(){
  return [{key:'live',label:'Canlı TV',sub:'TV ve radyo kanalları',icon:'TV'}]
    .concat(hdmiPorts().map(i=>({key:i.id,label:i.label||'HDMI',sub:[i.portLabel||'HDMI girişi',i.status].filter(Boolean).join(' · '),icon:'HDMI',hdmi:true})))
    .concat([{key:'fallback',label:typeof window.__ihHdmiInputs==='function'?'Alternatif giriş menüsü':'Cihazın giriş menüsü',sub:'Diğer cihaz kaynakları',icon:'GİRİŞ'}])}
function openSources(){
  if(!TV.on){open(true);return}
  if(TV.mode==='move'||TV.mode==='ctx'||TV.mode==='cnf')return;
  if(TV.mode==='source'){leaveSources();return}
  clearTimeout(TV.nt);TV.num='';$t('ihtv-tNum').classList.remove('show');
  TV.srcBack=TV.mode;TV.srcMsg='';TV.srcHasError=false;TV.srcLoading=true;
  TV.srcSel=Math.max(0,srcItems().findIndex(i=>TV.hdmi?(i.hdmi&&i.key===TV.hdmi.key):i.key==='live'));
  setMode('source');readSources()}
async function readSources(){
  const req=++TV.srcReq;
  try{
    const useLauncher=typeof window.__ihHdmiInputs==='function';
    const r=useLauncher?await window.__ihHdmiInputs():await N('tvState');
    if(req!==TV.srcReq||!TV.on||TV.mode!=='source')return;
    const selected=srcItems()[TV.srcSel];
    if(useLauncher?Array.isArray(r):(r&&Array.isArray(r.inputs))){
      if(useLauncher)TV.launcherPorts=r;else TV.st=r;
      const items=srcItems();TV.srcSel=Math.max(0,items.findIndex(i=>selected&&i.key===selected.key&&i.hdmi===selected.hdmi))}
    else TV.srcHasError=true;
  }catch(e){if(req===TV.srcReq&&TV.on&&TV.mode==='source')TV.srcHasError=true}
  if(req===TV.srcReq&&TV.on&&TV.mode==='source'){TV.srcLoading=false;renderSources()}}
function renderSources(){
  const items=srcItems(), panel=$t('ihtv-tSrc'), ports=items.length-2;
  TV.srcSel=Math.max(0,Math.min(TV.srcSel,items.length-1));
  const intro=TV.srcLoading?'HDMI girişleri aranıyor…':TV.srcHasError?'Cihazdan kaynak bilgisi alınamadı.':ports?ports+' HDMI girişi':'Cihaz uygulamaya bir HDMI girişi bildirmedi.';
  panel.innerHTML=panelHead('CANLI TV','Kaynaklar','',navBtn('back','Geri'))+'<p class="ihtv-srcintro">'+intro+'</p>'+
    items.map((i,j)=>{
      const live=i.hdmi?TV.hdmi&&TV.hdmi.key===i.key:(!TV.hdmi&&TV.tuned&&i.key==='live');
      return '<button type="button" class="ihtv-oi'+(j===TV.srcSel?' sel':'')+'" tabindex="'+(j===TV.srcSel?'0':'-1')+'" onclick="TVUI.sourcePick('+j+')">'+
        '<span class="ihtv-srcicon">'+i.icon+'</span><span class="ihtv-srccopy"><span class="a">'+esc(i.label)+'</span><br><span class="b">'+esc(i.sub)+'</span></span>'+
        (live?'<span class="ihtv-srcactive">AÇIK</span>':'')+'</button>'
    }).join('')+(TV.srcMsg?'<p class="ihtv-srcmsg" role="status">'+esc(TV.srcMsg)+'</p>':'')+
    '<div class="ihtv-hints">'+hint('','<b>▲▼</b> Seç')+hint('','<b>OK</b> Aç')+hint('','<b>Geri</b> Kapat')+'</div>';
  const sel=panel.querySelector('.sel');if(sel)try{sel.focus({preventScroll:true})}catch(e){}
  ensureVisible(panel)}
function leaveSources(){
  if(TV.hdmi){setMode('hdmi');hdmiBanner();return}
  if(TV.srcBack==='cold'){close();return}
  if(TV.srcBack==='watch'&&!TV.tuned){returnToTv();return}
  setMode(TV.srcBack)}
function returnToTv(){
  ++TV.hdmiSeq;
  if(TV.hdmi){clearTimeout(TV.tt);TV.hdmi=null;TV.tuned=false;TV.vid=false;TV.fail='';stopTv()}
  if($t('tv'))$t('tv').classList.remove('ban');
  setMode('watch');
  if(TV.tuned){banner();return}
  if(TV.vis.length)startWatch();else load()}
function sourcePick(i){
  if(TV.mode!=='source')return;
  const item=srcItems()[i];if(!item)return;TV.srcSel=i;
  if(item.hdmi){if(TV.hdmi&&TV.hdmi.key===item.key&&!TV.fail){leaveSources();return}playHdmi(item);return}
  if(item.key==='live'){returnToTv();return}
  close();try{runAct('inputs')}catch(e){}}
async function playHdmi(item){
  if(!TV.on)return;
  if(TV.srcNoBridge&&TV.mode==='source'){TV.srcMsg='Uygulama içi HDMI için Android köprüsü güncellenmeli. Alternatif olarak cihazın giriş menüsünü kullan.';renderSources();return}
  const prev={hdmi:TV.hdmi,tuned:TV.tuned,vid:TV.vid,reason:TV.reason,fail:TV.fail};
  const seq=++TV.hdmiSeq;
  clearTimeout(NT.tm);NT.p=null;clearTimeout(TV.tt);
  TV.hdmi=item;TV.tuned=false;TV.vid=false;TV.reason=1;TV.fail='';
  setMode('hdmi');hdmiBanner();
  let r;
  try{r=typeof window.__ihTuneHdmi==='function'?await window.__ihTuneHdmi(item.key):await N('tvHdmiTune',{input:item.key})}catch(e){}
  if(seq!==TV.hdmiSeq||!TV.on)return;
  if(!r||r.ok!==true||r.mode!=='hdmi'){
    Object.assign(TV,prev);
    TV.srcNoBridge=!r||r.mode!=='hdmi';
    TV.srcMsg=TV.srcNoBridge?'Uygulama içi HDMI için Android köprüsü güncellenmeli. Alternatif olarak cihazın giriş menüsünü kullan.':(r.error||'Bu HDMI girişi açılamadı.');
    setMode('source');if(TV.srcLoading)readSources();return
  }
  if(!TV.vid&&!TV.fail)TV.tt=setTimeout(()=>{if(seq===TV.hdmiSeq&&TV.on&&!TV.vid){TV.fail='timeout';sig()}},8000)}
function hdmiBanner(){
  const item=TV.hdmi,T=$t('tv');if(!item||!T||TV.mode!=='hdmi')return;
  $t('ihtv-tBan').innerHTML='<div class="ihtv-channel"><span class="ihtv-kicker">KAYNAK</span><div>HDMI</div></div>'+
    '<div class="ihtv-bi"><div class="ihtv-bt">'+esc(item.label)+'</div></div>'+
    '<div class="ihtv-bside"><div class="ihtv-bk">'+navBtn('source','Kaynaklar')+navBtn('live','Canlı TV')+'</div></div>';
  T.classList.add('ban');clearTimeout(TV.bt);TV.bt=setTimeout(()=>{T.classList.remove('ban')},5000)}

/* ---------- Kurulum / hata ekranı ---------- */
function showSetup(kind){
  const inp=(TV.st&&TV.st.inputs)||[],tu=inp.filter(i=>i.tuner);let t='',p='',it=[];
  if(kind==='perm'){t='İzin gerekli';p='Kanal ve program listesini okumak için “TV listelerini oku” izni gerekir. ADB/Shizuku bağlıysa tek dokunuşla verilir; değilse sistem izin penceresi açılır.';it=[['İzin ver',grant],['Tekrar dene',load],['Kapat',close]]}
  else if(kind==='scan'){t='Kanal listesi boş';p='Tuner girişi var ama kanal bulunamadı. Sistemin kanal tarama ekranı açılır; uydu ayarları (LNB, DiSEqC, transponder) orada yapılır. Bitince bu ekrana dönülür.';
    it=tu.map(i=>['Kanal tara: '+i.label,()=>scanIn(i.id)]).concat([['Yenile',load],['Tanı',diag],['Kapat',close]])}
  else{t='Tuner bulunamadı';p='Uygulamaların kullanabildiği bir TV tuner girişi görünmüyor. Gerçek uydu yayını için cihazın dahili tuner’ı olmalı ve üretici TV Input servisini sunmalı.'+(inp.length?'\nGörünen girişler: '+inp.map(i=>i.label).join(', '):'');it=[['Tekrar dene',load],['Tanı',diag],['Kapat',close]]}
  it.splice(Math.max(0,it.length-1),0,['Kaynaklar (HDMI)',openSources]);
  TV.sitems=it;TV.ssel=0;TV.stitle=t;TV.stext=p;setMode('setup')}
function renderSetup(){
  $t('ihtv-tSetup').innerHTML='<div class="ihtv-sbx">'+panelHead('TV KURULUMU',esc(TV.stitle),'',navBtn('back','Geri'))+'<p>'+esc(TV.stext).replace(/\n/g,'<br>')+'</p>'+TV.sitems.map((a,i)=>'<div class="ihtv-sbn'+(i===TV.ssel?' sel':'')+'" onclick="TVUI.setup('+i+')">'+esc(a[0])+'</div>').join('')+'</div>';
  ensureVisible($t('ihtv-tSetup'))}
async function grant(){
  let ok=false;try{if(await adbReady()){await N('adb',{c:'pm grant com.ihlauncher.tv android.permission.READ_TV_LISTINGS'});ok=true}}catch(e){}
  if(ok){load();return}N('tvPerm');tip('İzin penceresi açılıyor…')}

/* ---------- Yükleme ---------- */
function applyItems(it){
  it.sort((a,b)=>{const x=parseFloat(a.num),y=parseFloat(b.num);return((isNaN(x)?1e9:x)-(isNaN(y)?1e9:y))||String(a.name).localeCompare(String(b.name),'tr')});
  prep(it);TV.all=it;migrate();rebuild()}
async function load(){if(TV.loading)return;TV.loading=true;try{await load0()}finally{TV.loading=false}}
/* Açılış: önbellekteki liste varsa bekleme yok — hemen son kanala ayarlanır; taze liste arkada gelir ve görüntüyü kesmeden güncellenir. */
async function load0(){
  N('tvState').then(st=>{if(st&&!TV.st)TV.st=st}).catch(()=>{});
  let first=false;
  if(!TV.all.length){const c=await N('tvChannelsCached');if(c&&c.items&&c.items.length){applyItems(c.items);first=true}}
  else first=true;
  if(!TV.on)return;
  if(first&&TV.vis.length){if(TV.mode!=='source'&&!TV.hdmi)startWatch();freshRefresh();return}
  const r=await N('tvChannels');
  if(!TV.st)TV.st=await N('tvState');
  if(!TV.on)return;
  const tunerView=TV.mode!=='source'&&!TV.hdmi;
  if(!r||!r.perm){if(tunerView)showSetup('perm');return}
  const it=(r&&r.items)||[];
  if(!it.length){TV.all=[];if(tunerView)showSetup(((TV.st&&TV.st.inputs)||[]).some(i=>i.tuner)?'scan':'notuner');return}
  applyItems(it);stripRender();if(tunerView)startWatch()}
function startWatch(){
  const x=X(),c=TV.all.find(q=>q.key===x.last&&!x.hide[q.key])||TV.vis[0];
  if(!c){setMode('opts');tip('Tüm kanallar kaldırılmış');return}
  setMode('watch');tune(c)}
async function freshRefresh(){
  try{const r=await N('tvChannels');
    if(!r)return;
    if(!r.perm){if(TV.on&&!TV.hdmi&&TV.mode!=='source'){TV.all=[];TV.vis=[];TV.list=[];stopTv();if(!TV.st)TV.st=await N('tvState');if(TV.on&&!TV.hdmi&&TV.mode!=='source')showSetup('perm')}stripRender();return}
    const it=r.items||[];if(!it.length)return;
    if(TV.sig===r.items.length+'|'+it[0].id+'|'+it[it.length-1].id&&TV.all.length===it.length)return;
    TV.sig=it.length+'|'+it[0].id+'|'+it[it.length-1].id;
    const cur=TV.curKey;applyItems(it);
    if(TV.on){if(!TV.hdmi&&TV.mode!=='source'&&cur&&!curCh()){const nx=TV.vis[0];if(nx)tune(nx)}refresh()}
    stripRender()}catch(e){}}

/* ---------- Ayarlama / izleme ---------- */
/* Hızlı kanal geçişi: boştayken ilk basış ANINDA tuner'a gider; art arda basışlar birleştirilir (ara kanallar açılmaz). */
const NT={t:0,p:null,tm:0};
function nativeTune(c){
  clearTimeout(NT.tm);
  const go=k=>{NT.t=Date.now();N('tvTune',{id:k.id,input:k.in})};
  if(Date.now()-NT.t>450){NT.p=null;go(c)}
  else{NT.p=c;NT.tm=setTimeout(()=>{const k=NT.p;NT.p=null;if(k&&TV.on&&TV.tuned)go(k)},180)}}
function stopTv(){clearTimeout(NT.tm);NT.p=null;N('tvStop')}
/* Program bilgisi sorgusu zapping bitince çalışır; tuner komutunu ve arayüzü geciktirmez. */
function progSoon(id){clearTimeout(TV.pt);TV.pt=setTimeout(()=>loadProgs([id]),250)}
function tune(c){
  if(!c)return;if(TV.curKey!==c.key)TV.prevKey=TV.curKey;TV.curKey=c.key;TV.tuned=true;TV.vid=false;TV.reason=1;TV.fail='';X().last=c.key;save();
  nativeTune(c);progSoon(c.id);sig();if(TV.mode==='watch'){banner();showClock()}else render();
  clearTimeout(TV.tt);TV.tt=setTimeout(()=>{if(TV.on&&!TV.vid&&!TV.fail&&TV.reason!==4){TV.fail='timeout';sig()}},8000)}
function step(d){const L=TV.list.some(c=>c.key===TV.curKey)?TV.list:TV.vis;if(!L.length)return;let i=L.findIndex(c=>c.key===TV.curKey);i=i<0?0:(i+d+L.length)%L.length;tune(L[i])}
function recall(){const c=TV.all.find(q=>q.key===TV.prevKey&&!X().hide[q.key]);if(c)tune(c)}
function showClock(){
  const e=$t('ihtv-tClk'),T=$t('tv');if(!e||!T)return;
  const d=new Date();
  e.innerHTML='<div class="ihtv-ckt">'+d.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})+'</div><div class="ihtv-ckd">'+d.toLocaleDateString('tr-TR',{weekday:'long'})+'</div><div class="ihtv-ckm">'+d.toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})+'</div>';
  T.classList.add('clk');clearTimeout(TV.ct);TV.ct=setTimeout(()=>T.classList.remove('clk'),3000)}
function banner(){
  const c=curCh(),T=$t('tv');if(!c||!T)return;const nn=nowNext(c),n=nn.now,x=nn.next,k=col(c),fv=X().fav[c.key];
  T.style.setProperty('--c1',k.c1);T.style.setProperty('--c2',k.c2);
  $t('ihtv-tBan').innerHTML='<div class="ihtv-channel"><span class="ihtv-kicker">KANAL</span><div class="ihtv-bn">'+(c.n||'')+'</div></div><div class="ihtv-bi"><div class="ihtv-bc"><span class="ihtv-live">'+(c.radio?'RADYO':'CANLI')+'</span><span class="ihtv-bname">'+esc(c.dn)+'</span>'+(isHd(c)?'<span class="ihtv-hd">HD</span>':'')+(fv?'<span class="ihtv-fv">★</span>':'')+(TV.muted?'<span class="ihtv-mu">Sessiz</span>':'')+'</div>'+
   '<div class="ihtv-bt">'+esc(n?n.t:(c.radio?'Radyo yayını':'Program bilgisi yok'))+'</div>'+
   (n?'<div class="ihtv-bp"><i style="width:'+pct(n)+'%"></i></div><div class="ihtv-bm"><span>'+fmt(n.s)+'</span><span>'+fmt(n.e)+'</span></div>':'')+
   '</div><div class="ihtv-bside">'+(x?'<div class="ihtv-bx"><span class="ihtv-kicker">SIRADA · '+fmt(x.s)+'</span><div>'+esc(x.t)+'</div></div>':'')+
   '<div class="ihtv-bk">'+navBtn('ok','Kanallar')+navBtn('guide','Rehber')+navBtn('source','Kaynaklar ▶')+navBtn('blue','Seçenekler')+'</div></div>';
  T.classList.add('ban');clearTimeout(TV.bt);TV.bt=setTimeout(()=>T.classList.remove('ban'),5500)}
function sig(){
  const T=$t('tv');if(!T)return;T.classList.toggle('vid',TV.vid);
  const e=$t('ihtv-tStat');if(!e)return;
  const hd=TV.mode==='hdmi',show=!TV.vid&&((TV.mode==='watch'&&TV.tuned)||hd);
  let h='';
  if(TV.fail){h='<div class="ihtv-sx">Görüntü gelmedi</div><div class="ihtv-ss">'+(hd?'HDMI cihazını ve kabloyu kontrol et. Başka bir giriş seçmek için Kaynak tuşuna bas.':'Sinyal yok olabilir ya da cihaz uygulama içi oynatmaya izin vermiyor.<br>Mavi tuş › Seçenekler › “Sistem TV uygulamasında aç” / “Tanı”')+'</div>'}
  else h=(TV.reason===1||TV.reason===3?'<div class="ihtv-sp"></div>':'')+'<div class="ihtv-sx">'+esc(hd?(TV.reason===1?'HDMI açılıyor…':'HDMI sinyali bekleniyor…'):(REASON[TV.reason]||'Kanal ayarlanıyor…'))+'</div>';
  e.innerHTML=h;e.classList.toggle('show',show)}
function commitNum(){
  clearTimeout(TV.nt);if(!TV.num)return;
  const v=parseInt(TV.num,10),b=$t('ihtv-tNum');TV.num='';b.classList.remove('show');
  const c=TV.vis.find(x=>x.n===v);
  if(c){tune(c);const m=TV.mode;
    if(m==='list'||m==='guide'||m==='opts'){setMode('watch');banner()}
    else if(m!=='watch'){TV.sel=Math.max(0,TV.list.findIndex(q=>q.key===c.key));render()}}
  else tip('Kanal bulunamadı: '+v)}
function digit(n){
  TV.num=(TV.num+n).slice(-4);const b=$t('ihtv-tNum');b.textContent=TV.num;b.classList.add('show');clearTimeout(TV.nt);
  /* yazılan sayıyla başlayan daha uzun numaralı kanal yoksa beklemeden geç */
  const more=TV.vis.some(x=>{const s=String(x.n);return s.length>TV.num.length&&s.indexOf(TV.num)===0});
  TV.nt=setTimeout(commitNum,more?1500:350)}

/* ---------- Ana ekran kanal şeridi (açılır/kapanır) ---------- */
const SX=()=>S.tvStrip||(S.tvStrip={open:true});
function stripList(){const x=X(),v=TV.vis.filter(c=>!c.radio);return v.filter(c=>x.fav[c.key]).concat(v.filter(c=>!x.fav[c.key])).slice(0,40)}
function stripCard(c){
  const k=col(c),n=nowNext(c).now,fv=X().fav[c.key],lg=logoHtml(c);
  return '<div class="card tvc'+(c.key===TV.curKey&&TV.on?' on':'')+'" data-tvk="'+esc(c.key)+'" style="--cc:'+k.c1+';--cc2:'+k.c2+'" onclick="TVUI.play(this.dataset.tvk)">'+
   '<div class="tvc-top"><span class="tvc-n">'+c.n+'</span><span class="tvc-lg" data-lg="'+esc(c.id)+'">'+lg+'</span>'+(fv?'<b class="tvc-f">★</b>':'')+(isHd(c)?'<b class="tvc-h">HD</b>':'')+'</div>'+
   '<div class="tvc-nm">'+esc(c.dn)+'</div><div class="tvc-pg">'+esc(n?n.t:'Program bilgisi yok')+'</div>'+
   '<div class="tvc-bar"><i style="width:'+Math.round(pct(n))+'%"></i></div></div>'}
function stripRender(){
  const row=$t('row-tv'),head=$t('tvHead'),box=$t('tvRow');if(!row||!head||!box)return;
  installDesign();row.dataset.tvDesign='4';
  const L=stripList(),open=SX().open;
  row.classList.toggle('tvcol',!open);
  head.innerHTML='<span>Canlı TV</span><span class="tvh-c">'+(L.length?TV.vis.length+' kanal':'')+'</span><span class="tvh-t">'+(open?'Gizle ▴':'Göster ▾')+'</span>';
  if(!open){box.innerHTML='';if(typeof updateRowVis==='function')updateRowVis();return}
  const sl=L;
  box.innerHTML='<div class="card tvc tvopen" onclick="TVUI.open()"><div class="tvo-i"><svg class="i" viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="13" rx="2.5"/><path d="M8 21h8M12 18v3"/></svg></div><div class="tvc-nm">Tam ekran</div><div class="tvc-pg">Son kanaldan devam et</div></div>'+sl.map(stripCard).join('');
  if(typeof updateRowVis==='function')updateRowVis();
  const vis=sl.slice(0,14);loadLogos(vis);loadProgs(vis.map(c=>c.id))}
function stripToggle(){
  const x=SX();x.open=!x.open;save();stripRender();
  const h=$t('tvHead');if(h&&typeof focusEl==='function')focusEl(h)}
function playKey(key){
  const c=TV.all.find(q=>q.key===key);if(!c)return;
  X().last=key;save();
  if(TV.on){if(TV.hdmi){++TV.hdmiSeq;TV.hdmi=null;stopTv()}tune(c);setMode('watch');banner();return}
  TVUI.open()}
window.__tvHas=()=>TV.vis.length>0;
/* Isınma: açılışta kanalları (önce önbellek, sonra taze) okuyup şeridi çiz — TV açıldığında liste hazır olsun. */
async function warm(){
  if(TV.warmed)return;TV.warmed=true;
  try{
    const c=await N('tvChannelsCached');
    if(c&&c.items&&c.items.length&&!TV.all.length){applyItems(c.items);stripRender()}
    const r=await N('tvChannels');
    if(r&&r.perm&&r.items&&r.items.length){TV.sig=r.items.length+'|'+r.items[0].id+'|'+r.items[r.items.length-1].id;applyItems(r.items)}
    stripRender()}catch(e){}}
setTimeout(warm,900);
/* Açılışta Canlı TV: yalnızca TV cihazında (dokunmatik yoksa), launcher ilk açıldığında; Ana ekran tuşu ana sayfaya döner */
setTimeout(()=>{if(S.tvBoot===true&&navigator.maxTouchPoints===0&&!TV.on)open()},350);
setInterval(()=>{if(!TV.on&&TV.all.length&&SX().open)loadProgs(stripList().slice(0,14).map(c=>c.id))},300000);

/* ---------- Aç / kapat ---------- */
function open(sourcesOnly){
  build();if(TV.on)return;
  TV.on=true;document.body.classList.add('tvon');$t('tv').className='';N('tvMode',{on:true});N('tvRect',{x:0,y:0,w:0,h:0});
  setMode('watch');clock();if(sourcesOnly===true){openSources();TV.srcBack='cold'}else load()}
function close(){
  if(!TV.on)return;if(TV.move)endMove(false);TV.on=false;TV.hdmi=null;++TV.hdmiSeq;++TV.srcReq;TV.tuned=false;TV.vid=false;TV.num='';TV.fail='';clearTimeout(TV.tt);clearTimeout(TV.bt);clearTimeout(TV.ct);clearTimeout(TV.nt);clearTimeout(TV.tpt);{const T0=$t('tv');if(T0)T0.classList.remove('clk','ban');$t('ihtv-tNum').classList.remove('show');$t('ihtv-tTip').classList.remove('show')}
  document.body.classList.remove('tvon');stopTv();N('tvMode',{on:false});stripRender();
  setTimeout(()=>{if(TV.on||layer())return;const b=document.querySelector('body[data-theme=studio] #studio-tv')||document.querySelector('.topbar [data-tvbtn]');if(b)focusEl(b)},60)}
function clock(){const t=new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});['ihtv-lClk','ihtv-gClk'].forEach(i=>{const e=$t(i);if(e)e.textContent=t})}
setInterval(()=>{if(!TV.on)return;clock();if(TV.mode!=='setup')refresh()},20000);

/* ---------- Tuşlar ---------- */
function keyName(e){
  const k=e.key,c=e.keyCode;
  if(k==='TVInput'||k==='Input'||k==='s'||c===178)return'source';
  if(k==='ArrowUp'||c===19)return'up';if(k==='ArrowDown'||c===20)return'down';if(k==='ArrowLeft'||c===21)return'left';if(k==='ArrowRight'||c===22)return'right';
  if(k==='Enter'||c===13||c===23||(c===66&&(!k||k==='Unidentified')))return'ok';
  if(c===183||c===403||k==='ColorF0Red'||k==='r')return'red';if(c===184||c===404||k==='ColorF1Green'||k==='g')return'green';
  if(c===185||c===405||k==='ColorF2Yellow'||k==='y')return'yellow';if(c===186||c===406||k==='ColorF3Blue'||k==='b')return'blue';
  if(c===82||k==='ContextMenu'||k==='F1'||k==='m')return'menu';if(c===165||k==='Info'||k==='i')return'info';if(c===172||k==='Guide')return'guide';
  if(c===166||k==='ChannelUp'||k==='PageUp'||c===92)return'chup';if(c===167||k==='ChannelDown'||k==='PageDown'||c===93)return'chdn';
  if(c===85||c===179||k==='MediaPlayPause')return'play';
  if(!e.ctrlKey&&!e.altKey&&!e.metaKey){
    if(/^[0-9]$/.test(k))return k;
    if(c>=48&&c<=57)return String(c-48);if(c>=96&&c<=105)return String(c-96);
    const m=/^(?:Digit|Numpad)([0-9])$/.exec(e.code||'');if(m)return m[1]}
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
  if(n==='source'){if(!rep&&m!=='source')openSources();return}
  if(n==='live'){returnToTv();return}
  if(m==='hdmi'){if(n==='ok'||n==='menu'||n==='blue')openSources();else if(n==='info'||n==='right')hdmiBanner();return}
  if(m==='source'){
    const len=srcItems().length;
    if(n==='up'||n==='chup')TV.srcSel=(TV.srcSel+len-1)%len;
    else if(n==='down'||n==='chdn')TV.srcSel=(TV.srcSel+1)%len;
    else if(n==='ok'){if(!rep)sourcePick(TV.srcSel);return}
    else return;
    renderSources();return}
  if(dg){if(NUMM.indexOf(m)>=0&&!(m==='edit'&&TV.multi))digit(n);return}
  if(n==='ok'&&TV.num&&NUMM.indexOf(m)>=0){commitNum();return}
  if(m==='watch'){
    if(n==='up'||n==='chup')step(1);else if(n==='down'||n==='chdn')step(-1);
    else if(n==='left')recall();else if(n==='info'||n==='play')banner();
    else if(n==='right'||n==='menu'){if(!rep)openSources()}
    else if(n==='ok'){TV.sel=Math.max(0,TV.list.findIndex(q=>q.key===TV.curKey));setMode('list')}
    else if(n==='red'){const c=curCh();if(c){editFav(c);banner()}}
    else if(n==='green'){TV.sel=Math.max(0,TV.list.findIndex(q=>q.key===TV.curKey));setMode('edit')}
    else if(n==='yellow'||n==='guide')openGuide();
    else if(n==='blue'){TV.osel=0;TV.otop=0;setMode('opts')}
    return}
  if(m==='list'||m==='edit'){
    const ed=m==='edit';
    if(!ed&&n==='menu'){if(!rep)openSources();return}
    if(!ed&&TV.listHead){
      if(n==='ok'){if(!rep)openSources();return}
      if(n==='down'||n==='chdn'||n==='up'||n==='chup'){TV.listHead=false;render();return}
    }
    if(!ed&&n==='up'&&TV.sel===0){TV.listHead=true;render();return}
    if(ed&&TV.multi){const c=selCh();
      if(n==='up')moveSel(-1);else if(n==='down')moveSel(1);else if(n==='chup')moveSel(-VIS);else if(n==='chdn')moveSel(VIS);
      else if(n==='ok'){if(c){mSel(c);moveSel(1)}}
      else if(n==='red')mDel();else if(n==='green')mMoveStart();else if(n==='yellow')mAll();else if(n==='blue')mFav();
      else if(n==='menu'||n==='right'){TV.csel=0;setMode('ctx')}
      return}
    if(n==='up')moveSel(-1);else if(n==='down')moveSel(1);else if(n==='chup')moveSel(-VIS);else if(n==='chdn')moveSel(VIS);
    else if(n==='left'&&!ed)stepFilter(-1);else if(n==='right'&&!ed)stepFilter(1);
    else if(n==='ok'){const c=selCh();if(!c)return;if(ed){TV.csel=0;setMode('ctx')}else{tune(c);setMode('watch');banner()}}
    else if(n==='red'){const c=selCh();if(c){if(ed)askDelete(c);else editFav(c)}}
    else if(n==='green'){if(ed){const c=selCh();if(c)startMove(c)}else setMode('edit')}
    else if(n==='yellow'){if(ed){const c=selCh();if(c)rename(c)}else openGuide()}
    else if(n==='blue'){if(ed){const c=selCh();if(c)editFav(c)}else{TV.osel=0;TV.otop=0;setMode('opts')}}
    else if(n==='menu'){if(ed){mStart(selCh())}else{TV.osel=0;TV.otop=0;setMode('opts')}}
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
    else if(n==='green'){TV.sel=TV.gsel;setMode('edit');return}else if(n==='blue'||n==='menu'){TV.osel=0;TV.otop=0;setMode('opts');return}
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
window.TVUI={open,close,strip:stripToggle,play:playKey,sources:openSources,sourcePick,nav:n=>{if(!TV.on)return;if(n==='back')window.__back();else act(n,false)},
  row:i=>{TV.sel=i;const m=TV.mode;if(m==='edit'){if(TV.multi){const c=selCh();if(c)mSel(c)}else{TV.csel=0;setMode('ctx')}}else if(m==='list'){const c=selCh();if(c){tune(c);setMode('watch');banner()}}},
  grow:i=>{TV.gsel=i;act('ok')},chip:f=>setFilter(f),opt:i=>{TV.osel=i;act('ok')},ctx:i=>{TV.csel=i;act('ok')},cnfPick,setup:i=>{TV.ssel=i;act('ok')}};
window.__tvPerm=()=>{if(TV.on)load()};
/* Kumanda donanım tuşları (Kotlin dispatchKeyEvent'ten): CH+/CH-, TV, Kaynak (kare içinde ok), Rehber, Bilgi */
window.__hwkey=function(code){
  code=Number(code);
  if(window.__hdmiOn&&window.__hdmiOn()){if(code===178||code===170)window.__hdmiExit();else return}
  if($('#dlg').classList.contains('show')||$('#modal').classList.contains('show'))return;
  if(code===178){if(TV.mode!=='source'||!TV.on)openSources();return}
  if(code===170){if(!TV.on)open();else if(TV.hdmi||TV.mode==='source')returnToTv();else if(TV.mode==='watch')banner();return}
  const n={19:'up',20:'down',21:'left',22:'right',23:'ok',66:'ok',82:'menu',166:'chup',167:'chdn',172:'guide',165:'info'}[code];if(!n)return;
  if(!TV.on){
    if(n!=='chup'&&n!=='chdn'&&n!=='guide')return;
    open();if(n==='guide')setTimeout(()=>{if(TV.on&&TV.mode==='watch')act('guide')},1200);return}
  try{act(n,false)}catch(e){console.error(e)}};
window.__tvEv=(t,d)=>{if(!TV.on){if(window.__hdmiEv)window.__hdmiEv(t,d);return}TV.last=t+':'+d;if(t==='video'){TV.vid=true;TV.fail='';clearTimeout(TV.tt)}else if(t==='novideo'){TV.vid=false;TV.reason=+d}else{TV.vid=false;TV.fail=t;clearTimeout(TV.tt)}sig()};

/* ---------- Launcher'a bağlama ---------- */
const _layer=layer;layer=function(){const x=_layer();return x||(TV.on?$t('tv'):null)};
const _back=window.__back;
window.__back=function(){
  if(window.__hdmiExit&&window.__hdmiExit())return true;
  if($('#dlg').classList.contains('show')||$('#modal').classList.contains('show'))return _back();
  if(!TV.on)return _back();
  const m=TV.mode;
  if(m==='source')leaveSources();else if(m==='hdmi')returnToTv();
  else if(m==='move')endMove(false);else if(m==='ctx'||m==='cnf')setMode('edit');else if(m==='edit'){if(TV.multi)mEnd();else setMode('list')}
  else if(m==='list'||m==='guide'||m==='opts')setMode('watch');else close();
  return true};
const _home=window.__home;window.__home=function(){if(TV.on)close();if(_home)_home()};
const _res=window.__resume;
window.__resume=function(){if(_res)_res();if(TV.on)setTimeout(()=>{if(!TV.on)return;N('tvMode',{on:true});N('tvRect',{x:0,y:0,w:0,h:0});if(TV.mode==='source'){readSources();return}if(TV.hdmi){playHdmi(TV.hdmi);return}if(TV.mode==='setup'||!TV.all.length)load();else{const c=curCh();if(c&&TV.tuned)tune(c);freshRefresh()}},700)};
const _run=runAct;runAct=function(a){if(a==='tv'){closePanels();TVUI.open();return}_run(a)};
try{ACTS.tv=['','Canlı TV']}catch(e){}
(function(){const tr=document.querySelector('.topbar .tr');if(!tr)return;const b=document.createElement('div');b.className='ib';b.setAttribute('data-tvbtn','1');b.setAttribute('onclick','TVUI.open()');b.setAttribute('title','Canlı TV');
  b.innerHTML='<svg class="i" viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="13" rx="2.5"/><path d="M8 21h8M12 18v3"/></svg>';tr.insertBefore(b,tr.children[2]||null)})();
})();
