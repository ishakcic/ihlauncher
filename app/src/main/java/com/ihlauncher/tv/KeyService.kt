package com.ihlauncher.tv

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.accessibility.AccessibilityEvent
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
        /** Gezinme tuşları: launcher ön plandayken atama çalışmaz, böylece ayarlara her zaman ulaşılır. */
        private val SAFE = setOf(3, 4, 19, 20, 21, 22, 23, 66, 82, 160)
        fun keyId(ev: KeyEvent): String = if (ev.keyCode == 0) "s" + ev.scanCode else ev.keyCode.toString()
    }

    private val ui = Handler(Looper.getMainLooper())

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {}
    override fun onInterrupt() {}

    override fun onKeyEvent(ev: KeyEvent): Boolean {
        val l = learn
        if (l != null) {
            if (ev.action == KeyEvent.ACTION_DOWN) {
                learn = null
                val name = if (ev.keyCode == 0) "TARAMA_" + ev.scanCode else KeyEvent.keyCodeToString(ev.keyCode)
                l(keyId(ev), name)
            }
            return true
        }
        val map = try { JSONObject(Store.sp(this).getString("keymap", "{}") ?: "{}") } catch (e: Exception) { return false }
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
            t.startsWith("act:") -> {
                val a = t.substring(4).filter { it.isLetter() }
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
