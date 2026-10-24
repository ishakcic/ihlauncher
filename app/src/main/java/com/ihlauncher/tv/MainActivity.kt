package com.ihlauncher.tv

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.content.DialogInterface
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.speech.RecognizerIntent
import android.util.LruCache
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File

class MainActivity : Activity() {
    companion object { @Volatile var cur: MainActivity? = null; @Volatile var fg = false }
    lateinit var web: WebView
    lateinit var tv: TvEngine
    private lateinit var bridge: Bridge
    private val cache = object : LruCache<String, ByteArray>(6 * 1024 * 1024) {
        override fun sizeOf(key: String, value: ByteArray): Int = value.size
    }
    private var pkgReceiver: BroadcastReceiver? = null

    @Volatile private var dead = false

    fun js(code: String) {
        if (dead) return
        runOnUiThread { if (!dead) web.evaluateJavascript(code, null) }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        cur = this
        if ((applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0) WebView.setWebContentsDebuggingEnabled(true)
        web = WebView(this)
        // Kök: önce TvView (arkada), üstte WebView. TV modunda WebView şeffaflaşır ve video "hole" alanından görünür.
        val root = android.widget.FrameLayout(this)
        root.setBackgroundColor(0xFF000000.toInt())
        tv = TvEngine(this, root)
        root.addView(web, android.widget.FrameLayout.LayoutParams(android.widget.FrameLayout.LayoutParams.MATCH_PARENT, android.widget.FrameLayout.LayoutParams.MATCH_PARENT))
        setContentView(root)
        web.setBackgroundColor(0xFF000000.toInt())
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            mediaPlaybackRequiresUserGesture = false
            // Yerel arayüz dışında dosya/içerik erişimi gerekmez: yalnızca kendi asset'ine ve wallpaper.jpg'ye izin ver
            setAllowFileAccessFromFileURLs(false)
            setAllowUniversalAccessFromFileURLs(false)
            setAllowContentAccess(false)
        }
        web.webViewClient = object : WebViewClient() {
            // Yerel arayüz dışına (http/https vb.) gezinmeyi engelle: Native köprüsü yalnızca file:// içeriğe açık kalsın
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = request.url.scheme != "file"
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                val u = request.url
                if (u.host == "appicon.local") {
                    val seg = u.pathSegments
                    if (seg.size >= 2) {
                        val key = seg[0] + "/" + seg[1]
                        val bytes = cache.get(key) ?: renderIcon(seg[1], seg[0] == "banner").also { cache.put(key, it) }
                        return WebResourceResponse("image/png", null, ByteArrayInputStream(bytes))
                    }
                }
                return null
            }
        }
        bridge = Bridge(this)
        web.addJavascriptInterface(bridge, "Native")
        web.isFocusable = true
        web.isFocusableInTouchMode = true
        web.requestFocus()
        web.loadUrl("file:///android_asset/index.html")

        val sp = Store.sp(this)
        if (android.os.Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
            !sp.getBoolean("asked_loc", false)) {
            sp.edit().putBoolean("asked_loc", true).apply()
            try { requestPermissions(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION), 10) } catch (e: Exception) { }
        }
        runBootApps()

        val f = IntentFilter().apply {
            addAction(Intent.ACTION_PACKAGE_ADDED); addAction(Intent.ACTION_PACKAGE_REMOVED)
            addAction(Intent.ACTION_PACKAGE_CHANGED); addDataScheme("package")
        }
        pkgReceiver = object : BroadcastReceiver() {
            override fun onReceive(c: Context?, i: Intent?) { js("window.__pkgChanged&&window.__pkgChanged()") }
        }
        registerReceiver(pkgReceiver, f)
    }

    override fun onPause() { fg = false; try { tv.release() } catch (e: Exception) { }; super.onPause() }

    override fun onResume() {
        super.onResume()
        fg = true
        cur = this
        web.requestFocus()
        js("window.__resume&&window.__resume()")
        wmCheckPending()
    }

    // ---- Çözünürlük onayı (yerel pencere: WebView yeniden çizilse / Activity yeniden yaratılsa bile kaybolmaz) ----
    private var wmDialog: AlertDialog? = null
    private val wmH = Handler(Looper.getMainLooper())
    private val wmTick = Runnable { wmUpdate() }

    private fun wmCheckPending() {
        val sp = Store.sp(this)
        if (!sp.getBoolean("wm_pending", false)) return
        val left = sp.getLong("wm_deadline", 0L) - System.currentTimeMillis()
        if (left <= 0) { Bridge.wmRevertNow(this); return }
        Bridge.wmSchedule(this, left)
        showWmConfirm()
    }

    fun showWmConfirm() {
        if (isFinishing) return
        if (!Store.sp(this).getBoolean("wm_pending", false)) return
        if (wmDialog?.isShowing == true) return
        val d = AlertDialog.Builder(this, AlertDialog.THEME_DEVICE_DEFAULT_DARK)
            .setTitle("Ekran ayarı")
            .setMessage("…")
            .setCancelable(false)
            .setPositiveButton("Koru", DialogInterface.OnClickListener { _, _ -> Bridge.wmKeep(this) })
            .setNegativeButton("Geri al", DialogInterface.OnClickListener { _, _ -> Bridge.wmRevertNow(this) })
            .create()
        d.setOnShowListener { d.getButton(AlertDialog.BUTTON_POSITIVE).requestFocus() }
        wmDialog = d
        d.show()
        wmUpdate()
    }

    private fun wmUpdate() {
        val d = wmDialog ?: return
        if (!d.isShowing) { wmDialog = null; return }
        val sp = Store.sp(this)
        if (!sp.getBoolean("wm_pending", false)) { d.dismiss(); wmDialog = null; return }
        val left = ((sp.getLong("wm_deadline", 0L) - System.currentTimeMillis()) / 1000).toInt()
        if (left <= 0) { d.dismiss(); wmDialog = null; return }
        d.setMessage("Ekran düzgün görünüyorsa “Koru”yu seç.\n" + left + " sn içinde onaylamazsan önceki ayara dönülür.")
        wmH.removeCallbacks(wmTick)
        wmH.postDelayed(wmTick, 1000)
    }

    override fun onDestroy() {
        dead = true
        if (cur === this) cur = null
        wmH.removeCallbacks(wmTick)
        try { bridge.cleanup() } catch (e: Exception) { }
        try { tv.release() } catch (e: Exception) { }
        try { wmDialog?.dismiss() } catch (e: Exception) { }
        wmDialog = null
        try { unregisterReceiver(pkgReceiver) } catch (e: Exception) { }
        // WebView'i serbest bırak: aksi halde sızar ve yok edilmiş köprüye JS çağrısı gelebilir
        try {
            (web.parent as? android.view.ViewGroup)?.removeView(web)
            web.removeJavascriptInterface("Native")
            web.destroy()
        } catch (e: Throwable) { }
        super.onDestroy()
    }

    @Deprecated("Deprecated in Java")
    /** Kumandanın kanal/TV/kaynak/rehber tuşları: WebView'e güvenmeden doğrudan arayüze ilet. */
    override fun dispatchKeyEvent(ev: android.view.KeyEvent): Boolean {
        when (ev.keyCode) {
            166, 167, 170, 172, 178, 165 -> {
                val rep = ev.repeatCount
                if (ev.action == android.view.KeyEvent.ACTION_DOWN && (rep == 0 || ((ev.keyCode == 166 || ev.keyCode == 167) && rep % 3 == 0)))
                    js("window.__hwkey&&window.__hwkey(" + ev.keyCode + ")")
                return true
            }
        }
        return super.dispatchKeyEvent(ev)
    }

    override fun onBackPressed() {
        web.evaluateJavascript("(window.__back&&window.__back())||false", null)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == TvEngine.REQ) js("window.__tvPerm&&window.__tvPerm()")
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        if (intent?.action == Intent.ACTION_MAIN) js("window.__home&&window.__home()")
    }

    private fun renderIcon(pkg: String, banner: Boolean): ByteArray {
        val pm = packageManager
        val d: Drawable = try {
            (if (banner) pm.getApplicationBanner(pkg) else null) ?: pm.getApplicationIcon(pkg)
        } catch (e: Exception) { pm.defaultActivityIcon }
        val w = if (banner) 320 else 192
        val h = if (banner) 180 else 192
        val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        d.setBounds(0, 0, w, h)
        d.draw(Canvas(bmp))
        val bo = ByteArrayOutputStream()
        bmp.compress(Bitmap.CompressFormat.PNG, 100, bo)
        bmp.recycle()
        return bo.toByteArray()
    }

    private fun runBootApps() {
        val sp = Store.sp(this)
        // BOOT_COUNT saat atlamalarından (NTP) etkilenmez; yoksa eski yönteme dön.
        val bc = try { android.provider.Settings.Global.getInt(contentResolver, android.provider.Settings.Global.BOOT_COUNT, -1) } catch (e: Exception) { -1 }
        if (bc >= 0) {
            if (sp.getInt("boot_count", -1) == bc) return
            sp.edit().putInt("boot_count", bc).apply()
        } else {
            val bootTime = System.currentTimeMillis() - SystemClock.elapsedRealtime()
            val last = sp.getLong("boot_time", 0L)
            if (Math.abs(bootTime - last) < 120000L) return
            sp.edit().putLong("boot_time", bootTime).apply()
        }
        val arr = (try { JSONObject(sp.getString("state", "{}") ?: "{}").optJSONArray("bootApps") } catch (e: Exception) { null }) ?: return
        val h = Handler(Looper.getMainLooper())
        for (i in 0 until arr.length()) {
            val p = arr.optString(i)
            h.postDelayed({ Bridge.launchPkg(this, p) }, 3000L * (i + 1))
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (resultCode != RESULT_OK || data == null) return
        try {
            when (requestCode) {
                1 -> { val uri = data.data ?: return; saveWallpaper(uri) }
                2 -> {
                    val uri = data.data ?: return
                    contentResolver.openOutputStream(uri, "wt")?.use { it.write((Store.sp(this).getString("state", "{}") ?: "{}").toByteArray()) }
                    js("window.__toast('💾','Yedek kaydedildi')")
                }
                3 -> {
                    val uri = data.data ?: return
                    val t = contentResolver.openInputStream(uri)!!.use { it.readBytes().toString(Charsets.UTF_8) }
                    JSONObject(t)
                    Store.sp(this).edit().putString("state", t).apply()
                    js("window.__reload&&window.__reload()")
                }
                5 -> {
                    val uri = data.data ?: return
                    contentResolver.takePersistableUriPermission(uri, data.flags and (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION))
                    Store.sp(this).edit().putString("backupTree", uri.toString()).apply()
                    js("window.__backupTree&&window.__backupTree()")
                }
                4 -> {
                    val l = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
                    js("window.__voice(" + JSONObject.quote(l?.firstOrNull() ?: "") + ")")
                }
            }
        } catch (e: Exception) {
            js("window.__toast('❌'," + JSONObject.quote(e.message ?: "hata") + ")")
        }
    }

    private fun saveWallpaper(uri: Uri) {
        val o = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, o) }
        var ss = 1
        while (o.outWidth / ss > 2400 || o.outHeight / ss > 2400) ss *= 2
        val o2 = BitmapFactory.Options().apply { inSampleSize = ss }
        var bmp = contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, o2) }
            ?: throw Exception("Görsel okunamadı")
        val ori = try {
            contentResolver.openInputStream(uri)?.use { android.media.ExifInterface(it).getAttributeInt(android.media.ExifInterface.TAG_ORIENTATION, 1) } ?: 1
        } catch (e: Exception) { 1 }
        val deg = when (ori) { 3 -> 180f; 6 -> 90f; 8 -> 270f; else -> 0f }
        if (deg != 0f) {
            val m = android.graphics.Matrix().apply { postRotate(deg) }
            val r = Bitmap.createBitmap(bmp, 0, 0, bmp.width, bmp.height, m, true)
            if (r !== bmp) bmp.recycle()
            bmp = r
        }
        val f = File(filesDir, "wallpaper.jpg")
        f.outputStream().use { bmp.compress(Bitmap.CompressFormat.JPEG, 90, it) }
        js("window.__wall(" + JSONObject.quote("file://" + f.absolutePath + "?t=" + System.currentTimeMillis()) + ")")
    }
}
