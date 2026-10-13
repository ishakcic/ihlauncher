package com.ihlauncher.tv

import android.accessibilityservice.AccessibilityService
import android.view.KeyEvent
import android.view.accessibility.AccessibilityEvent
import org.json.JSONObject

/** Kumanda tuşu remap: kayıtlı keyCode -> paket eşlemesi. */
class KeyService : AccessibilityService() {
    companion object {
        @Volatile var learn: ((Int) -> Unit)? = null
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {}
    override fun onInterrupt() {}

    override fun onKeyEvent(ev: KeyEvent): Boolean {
        val l = learn
        if (l != null) {
            if (ev.action == KeyEvent.ACTION_DOWN) { learn = null; l(ev.keyCode) }
            return true
        }
        val map = try { JSONObject(Store.sp(this).getString("keymap", "{}") ?: "{}") } catch (e: Exception) { return false }
        val target = map.optString(ev.keyCode.toString(), "")
        if (target.isEmpty()) return false
        if (ev.action == KeyEvent.ACTION_DOWN && ev.repeatCount == 0) Bridge.launchPkg(this, target)
        return true
    }
}
