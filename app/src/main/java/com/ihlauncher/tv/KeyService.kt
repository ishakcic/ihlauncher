package com.ihlauncher.tv

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.content.SharedPreferences
import android.view.KeyEvent
import android.view.accessibility.AccessibilityEvent
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject

/**
 * Tuş atama servisi. keymap: tuş kimliği -> hedef
 *   "com.paket.adi"  uygulama aç
 *   "act:voice"      launcher eylemi
 *   "glb:back"       sistem eylemi (geri, home, recents, notif, quick, power)
 *   "none"           tuşu devre dışı bırak
 * Tuş kimliği: keyCode (örn. "183"); keyCode 0 ise tarama kodu ("s" + scanCode).
 */
class KeyService : AccessibilityService() {
    companion object {
        @Volatile var learn: ((String, String) -> Unit)? = null
        /** Öğrenme modu başlangıcı; arayüz kapanırsa/kilitlenirse kumanda sonsuza dek yutulmasın. */
        @Volatile var learnAt = 0L
        private const val LEARN_TIMEOUT_MS = 20_000L
        /** Gezinme tuşları: launcher ön plandayken atama çalışmaz, böylece ayarlara her zaman ulaşılır. */
        private val SAFE = setOf(3, 4, 19, 20, 21, 22, 23, 66, 82, 160)
        fun keyId(ev: KeyEvent): String = if (ev.keyCode == 0) "s" + ev.scanCode else ev.keyCode.toString()
    }

    private val ui = Handler(Looper.getMainLooper())
    private var dock: DockOverlay? = null
    private var dockId = ""
    private val dockTimeout = Runnable { dock?.hide() }

    private fun showDock(id: String) {
        dock?.hide()
        val list = ArrayList<DockOverlay.Item>()
        try {
            val arr = JSONArray(Store.sp(this).getString("docks", "[]") ?: "[]")
            for (i in 0 until arr.length()) {
                val d = arr.getJSONObject(i)
                if (d.getString("id") != id) continue
                val its = d.getJSONArray("items")
                for (j in 0 until its.length()) { val o = its.getJSONObject(j); list.add(DockOverlay.Item(o.getString("t"), o.optString("n"), o.optString("e"))) }
            }
        } catch (e: Exception) { }
        if (list.isEmpty()) { Toast.makeText(this, "Panel boş veya bulunamadı", Toast.LENGTH_SHORT).show(); return }
        dockId = id
        val d = DockOverlay(this, list, { run(it) }, { dock = null; dockId = ""; ui.removeCallbacks(dockTimeout) })
        dock = d
        d.show()
        ui.postDelayed(dockTimeout, 15_000)
    }

    /** Tuş ataması önbelleği: her tuş olayında SharedPreferences'tan JSON ayrıştırma yapılmaz. */
    @Volatile private var map = JSONObject()
    private val prefListener = SharedPreferences.OnSharedPreferenceChangeListener { _, k -> if (k == "keymap") loadMap() }

    private fun loadMap() {
        map = try { JSONObject(Store.sp(this).getString("keymap", "{}") ?: "{}") } catch (e: Exception) { JSONObject() }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        loadMap()
        Store.sp(this).registerOnSharedPreferenceChangeListener(prefListener)
    }

    override fun onUnbind(intent: Intent?): Boolean {
        dock?.hide()
        try { Store.sp(this).unregisterOnSharedPreferenceChangeListener(prefListener) } catch (e: Exception) { }
        return super.onUnbind(intent)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {}
    override fun onInterrupt() {}

    override fun onKeyEvent(ev: KeyEvent): Boolean {
        var l = learn
        if (l != null && SystemClock.elapsedRealtime() - learnAt > LEARN_TIMEOUT_MS) { learn = null; l = null }
        if (l != null) {
            if (ev.action == KeyEvent.ACTION_DOWN) {
                learn = null
                val name = if (ev.keyCode == 0) "TARAMA_" + ev.scanCode else KeyEvent.keyCodeToString(ev.keyCode)
                l(keyId(ev), name)
            }
            return true
        }
        val dk = dock
        if (dk != null) {
            val tg = map.optString(keyId(ev), "")
            val down = ev.action == KeyEvent.ACTION_DOWN
            ui.removeCallbacks(dockTimeout); ui.postDelayed(dockTimeout, 15_000)
            if (ev.keyCode == 3) { if (down) dk.hide(); return false }
            if (down) when {
                tg == "act:$dockId" || ev.keyCode == 4 || ev.keyCode == 111 -> dk.hide()
                ev.keyCode == 21 -> dk.move(-1)
                ev.keyCode == 22 -> dk.move(1)
                ev.keyCode == 23 || ev.keyCode == 66 || ev.keyCode == 160 -> dk.pick()
            }
            return true
        }
        val target = map.optString(keyId(ev), "")
        if (target.isEmpty()) return false
        if (ev.keyCode in SAFE && MainActivity.fg) return false
        if (ev.action == KeyEvent.ACTION_DOWN && ev.repeatCount == 0) run(target)
        return true
    }

    private fun run(t: String) {
        when {
            t == "none" -> {}
            t.startsWith("glb:") -> performGlobalAction(when (t.substring(4)) {
                "back" -> GLOBAL_ACTION_BACK
                "home" -> GLOBAL_ACTION_HOME
                "recents" -> GLOBAL_ACTION_RECENTS
                "notif" -> GLOBAL_ACTION_NOTIFICATIONS
                "quick" -> GLOBAL_ACTION_QUICK_SETTINGS
                "power" -> GLOBAL_ACTION_POWER_DIALOG
                else -> return
            })
            t.startsWith("act:dock") && !MainActivity.fg -> showDock(t.substring(4))
            t.startsWith("act:") -> {
                val a = t.substring(4).filter { it.isLetterOrDigit() }
                if (a.isEmpty()) return
                try {
                    startActivity(Intent(this, MainActivity::class.java)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP))
                } catch (e: Exception) { return }
                ui.postDelayed({ MainActivity.cur?.js("window.runAct&&runAct('$a')") }, 450)
            }
            else -> Bridge.launchPkg(this, t)
        }
    }
}
