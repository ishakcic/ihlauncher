package com.ihlauncher.tv

import android.content.Intent
import android.content.pm.PackageManager
import android.media.tv.TvContract
import android.media.tv.TvInputManager
import android.media.tv.TvView
import android.net.Uri
import android.util.Base64
import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import org.json.JSONArray
import org.json.JSONObject

/**
 * Canlı TV motoru: cihazın TV Input Framework (TIF) tuner girişini (DVB-S/S2 dahil) TvView ile uygulama içinde oynatır.
 * Kanal ve program listesi TvProvider'dan (TvContract) okunur. Kanal taraması sistemin kendi kurulum ekranıyla yapılır.
 * TvView, WebView'in ARKASINDA durur; arayüzdeki "hole" alanı şeffaf bırakılarak video görünür.
 */
class TvEngine(private val act: MainActivity, host: FrameLayout) {
    companion object {
        const val PERM = "android.permission.READ_TV_LISTINGS"
        const val REQ = 20
    }

    val view = TvView(act)
    @Volatile private var muted = false

    init {
        view.visibility = View.GONE
        view.isFocusable = false
        view.isFocusableInTouchMode = false
        view.descendantFocusability = android.view.ViewGroup.FOCUS_BLOCK_DESCENDANTS
        host.addView(view, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        view.setCallback(object : TvView.TvInputCallback() {
            override fun onConnectionFailed(inputId: String) { ev("conn_failed", inputId) }
            override fun onDisconnected(inputId: String) { ev("disconnected", inputId) }
            override fun onVideoAvailable(inputId: String) { ev("video", "ok") }
            override fun onVideoUnavailable(inputId: String, reason: Int) { ev("novideo", reason.toString()) }
        })
    }

    private fun ev(t: String, d: String) {
        act.js("window.__tvEv&&window.__tvEv(" + JSONObject.quote(t) + "," + JSONObject.quote(d) + ")")
    }

    private fun obj() = JSONObject()

    fun hasPerm(): Boolean = act.checkCallingOrSelfPermission(PERM) == PackageManager.PERMISSION_GRANTED

    fun requestPerm() {
        act.runOnUiThread {
            if (android.os.Build.VERSION.SDK_INT >= 23) { try { act.requestPermissions(arrayOf(PERM), REQ) } catch (e: Throwable) { } }
            else act.js("window.__tvPerm&&window.__tvPerm()")
        }
    }

    private fun tim(): TvInputManager? = act.getSystemService(android.content.Context.TV_INPUT_SERVICE) as? TvInputManager

    /** İzin durumu + sistemdeki (geçiş değil) TV girişleri; type 0 = TYPE_TUNER. */
    fun state(): String {
        val o = obj()
        o.put("perm", hasPerm())
        val arr = JSONArray()
        try {
            for (i in tim()?.tvInputList ?: emptyList()) {
                if (i.isPassthroughInput) continue
                val label = try { (i.loadCustomLabel(act) ?: i.loadLabel(act))?.toString() ?: i.id } catch (e: Throwable) { i.id }
                val setup = try { i.createSetupIntent() != null } catch (e: Throwable) { false }
                arr.put(obj().put("id", i.id).put("label", label).put("type", i.type)
                    .put("tuner", i.type == 0).put("setup", setup).put("pkg", i.serviceInfo?.packageName ?: ""))
            }
        } catch (e: Throwable) { }
        o.put("inputs", arr)
        return o.toString()
    }

    private fun s(c: android.database.Cursor, i: Int): String = if (i >= 0 && !c.isNull(i)) (c.getString(i) ?: "") else ""

    /** Tüm tarayıcı kanalları (READ_TV_LISTINGS ile diğer uygulamaların kanalları da görünür). */
    fun channels(): String {
        val o = obj()
        val arr = JSONArray()
        o.put("items", arr)
        if (!hasPerm()) { o.put("perm", false); return o.toString() }
        o.put("perm", true)
        val c = act.contentResolver.query(TvContract.Channels.CONTENT_URI, null, null, null, null) ?: return o.toString()
        c.use {
            val iId = it.getColumnIndex("_id")
            val iIn = it.getColumnIndex("input_id")
            val iNum = it.getColumnIndex("display_number")
            val iName = it.getColumnIndex("display_name")
            val iSvc = it.getColumnIndex("service_type")
            val iType = it.getColumnIndex("type")
            val iVf = it.getColumnIndex("video_format")
            val iBr = it.getColumnIndex("browsable")
            val iLock = it.getColumnIndex("locked")
            val iOn = it.getColumnIndex("original_network_id")
            val iTs = it.getColumnIndex("transport_stream_id")
            val iSv = it.getColumnIndex("service_id")
            while (it.moveToNext()) {
                if (iBr >= 0 && !it.isNull(iBr) && it.getInt(iBr) == 0) continue
                val svc = s(it, iSvc)
                if (svc == "SERVICE_TYPE_OTHER") continue // veri/teletext hizmetleri oynatılamaz
                arr.put(obj().put("id", it.getLong(iId)).put("in", s(it, iIn)).put("num", s(it, iNum)).put("name", s(it, iName))
                    .put("radio", svc == "SERVICE_TYPE_AUDIO").put("type", s(it, iType)).put("vf", s(it, iVf))
                    .put("lock", iLock >= 0 && !it.isNull(iLock) && it.getInt(iLock) == 1)
                    .put("onid", if (iOn >= 0 && !it.isNull(iOn)) it.getInt(iOn) else -1)
                    .put("tsid", if (iTs >= 0 && !it.isNull(iTs)) it.getInt(iTs) else -1)
                    .put("sid", if (iSv >= 0 && !it.isNull(iSv)) it.getInt(iSv) else -1))
            }
        }
        return o.toString()
    }

    /** Verilen kanallar için [from,to] aralığındaki programlar (kanal başına en çok 24). */
    fun programs(ids: JSONArray, from: Long, to: Long): String {
        val o = obj()
        val map = obj()
        o.put("map", map)
        if (!hasPerm()) return o.toString()
        for (k in 0 until minOf(ids.length(), 40)) {
            val id = ids.getLong(k)
            val list = JSONArray()
            try {
                val uri = TvContract.buildProgramsUriForChannel(id, from, to)
                act.contentResolver.query(uri, null, null, null, null)?.use {
                    val iT = it.getColumnIndex("title")
                    val iS = it.getColumnIndex("start_time_utc_millis")
                    val iE = it.getColumnIndex("end_time_utc_millis")
                    val iD = it.getColumnIndex("short_description")
                    val iL = it.getColumnIndex("long_description")
                    val iG = it.getColumnIndex("canonical_genre")
                    val rows = ArrayList<JSONObject>()
                    while (it.moveToNext()) {
                        val d = s(it, iD).ifEmpty { s(it, iL) }
                        rows.add(obj().put("t", s(it, iT)).put("s", it.getLong(iS)).put("e", it.getLong(iE)).put("d", d.take(400)).put("g", s(it, iG)))
                    }
                    rows.sortBy { r -> r.getLong("s") }
                    for (r in rows.take(24)) list.put(r)
                }
            } catch (e: Throwable) { }
            map.put(id.toString(), list)
        }
        return o.toString()
    }

    fun tune(id: Long, input: String) {
        act.runOnUiThread {
            try {
                view.visibility = View.VISIBLE
                view.tune(input, TvContract.buildChannelUri(id))
                act.web.requestFocus()
                view.setStreamVolume(if (muted) 0f else 1f)
            } catch (e: Throwable) { ev("conn_failed", e.message ?: "tune") }
        }
    }

    /** px cinsinden konum; w<=0 veya h<=0 => tam ekran. */
    fun rect(x: Int, y: Int, w: Int, h: Int) {
        act.runOnUiThread {
            val full = w <= 0 || h <= 0
            val lp = FrameLayout.LayoutParams(
                if (full) FrameLayout.LayoutParams.MATCH_PARENT else w,
                if (full) FrameLayout.LayoutParams.MATCH_PARENT else h)
            if (!full) { lp.leftMargin = x; lp.topMargin = y; lp.gravity = Gravity.TOP or Gravity.START }
            view.layoutParams = lp
        }
    }

    fun mute(m: Boolean) {
        muted = m
        act.runOnUiThread { try { view.setStreamVolume(if (m) 0f else 1f) } catch (e: Throwable) { } }
    }

    fun stop() {
        act.runOnUiThread { try { view.reset() } catch (e: Throwable) { }; view.visibility = View.GONE }
    }

    /** TV modu: WebView şeffaf olur (video arkadan görünür), ekran açık kalır. */
    fun mode(on: Boolean) {
        act.runOnUiThread {
            act.web.setBackgroundColor(if (on) 0 else 0xFF000000.toInt())
            if (on) act.web.requestFocus()
            if (on) act.window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            else act.window.clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }

    /** Sistemin kanal tarama (kurulum) ekranını açar; uydu ayarları (LNB, DiSEqC, transponder) orada yapılır. */
    fun setup(input: String): String {
        val tm = tim() ?: return obj().put("ok", false).put("error", "TV servisi yok").toString()
        val info = try { tm.tvInputList.firstOrNull { it.id == input } } catch (e: Throwable) { null }
            ?: return obj().put("ok", false).put("error", "Giriş bulunamadı").toString()
        val i = try { info.createSetupIntent() } catch (e: Throwable) { null }
            ?: return obj().put("ok", false).put("error", "Bu giriş kurulum ekranı sunmuyor; cihazın TV ayarlarından kanal tara").toString()
        return try {
            act.runOnUiThread { try { act.startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (e: Throwable) { act.js("window.__toast('❌','Kurulum ekranı açılamadı')") } }
            obj().put("ok", true).toString()
        } catch (e: Throwable) { obj().put("ok", false).put("error", e.message ?: "hata").toString() }
    }

    /** Uygulama içinde oynatma başarısızsa sistem TV uygulamasında aç. */
    fun external(id: Long): String {
        act.runOnUiThread {
            try { act.startActivity(Intent(Intent.ACTION_VIEW, TvContract.buildChannelUri(id)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
            catch (e: Throwable) { act.js("window.__toast('❌','Sistem TV uygulaması bulunamadı')") }
        }
        return "{\"ok\":true}"
    }

    fun logo(id: Long): String {
        return try {
            act.contentResolver.openInputStream(TvContract.buildChannelLogoUri(id))?.use {
                val b = it.readBytes()
                if (b.isEmpty() || b.size > 250_000) "{}" else obj().put("d", Base64.encodeToString(b, Base64.NO_WRAP)).toString()
            } ?: "{}"
        } catch (e: Throwable) { "{}" }
    }

    /** Activity arka plana giderken video kaynağını bırak (JS geri gelince yeniden ayarlar). */
    fun release() { try { view.reset() } catch (e: Throwable) { }; view.visibility = View.GONE }
}
