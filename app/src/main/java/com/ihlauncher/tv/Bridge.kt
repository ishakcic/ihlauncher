package com.ihlauncher.tv

import android.app.ActivityManager
import android.app.AppOpsManager
import android.app.PendingIntent
import android.app.UiModeManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageInfo
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.content.pm.PermissionInfo
import android.content.pm.ResolveInfo
import android.content.res.Configuration
import android.media.tv.TvContract
import android.media.tv.TvInputManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.TrafficStats
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.os.StatFs
import android.os.SystemClock
import android.provider.Settings
import android.speech.RecognizerIntent
import android.view.KeyEvent
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject
import rikka.shizuku.Shizuku
import java.io.File
import java.net.NetworkInterface
import java.util.concurrent.Executors

class Bridge(private val act: MainActivity) {
    companion object {
        val CRIT = setOf(
            "android", "com.android.systemui", "com.android.settings", "com.ihlauncher.tv", "com.android.shell",
            "com.android.providers.settings", "com.google.android.gms", "com.android.packageinstaller",
            "com.google.android.packageinstaller", "com.android.inputdevices", "com.android.tv.settings"
        )
        /** CRIT + önek kuralları: bu paketlere dondur/kaldır/temizle uygulanamaz (JS tarafındaki liste ile aynı tutulmalı). */
        private val PROT_PREFIX = listOf(
            "com.android.providers.", "com.android.server.", "com.android.location.", "com.android.bluetooth",
            "com.android.inputmethod.", "com.android.networkstack", "com.android.permissioncontroller",
            "com.google.android.permissioncontroller", "com.android.modulemetadata", "com.google.android.modulemetadata",
            "com.android.webview", "com.google.android.webview", "com.android.vending", "com.google.android.gsf",
            "com.android.keychain", "com.android.certinstaller", "com.android.vpndialogs", "com.android.tv.settings"
        )
        fun isProtected(p: String): Boolean = p in CRIT || PROT_PREFIX.any { p.startsWith(it) }
        private val PKG_RE = Regex("^[A-Za-z0-9._]+$")
        private const val ME = "com.ihlauncher.tv"
        private const val ACT_INSTALL = "com.ihlauncher.tv.INSTALL_STATUS"

        private val mainH = Handler(Looper.getMainLooper())
        private var wmTask: Runnable? = null

        private fun wmCancel() { wmTask?.let { mainH.removeCallbacks(it) }; wmTask = null }

        /** Süre dolunca (Activity ne durumda olursa olsun) önceki ekran ayarına dön. */
        fun wmSchedule(c: Context, ms: Long) {
            val app = c.applicationContext
            wmCancel()
            val t = Runnable { wmRevertNow(app) }
            wmTask = t
            mainH.postDelayed(t, ms)
        }

        fun wmKeep(c: Context) {
            wmCancel()
            Store.sp(c).edit().putBoolean("wm_pending", false).apply()
            MainActivity.cur?.js("window.__toast('✅','Ekran ayarı korundu')")
            MainActivity.cur?.js("window.__wmDone&&window.__wmDone()")
        }

        private fun wmRestoreCmd(raw: String): String {
            val sz = Regex("Override size:\\s*(\\d+x\\d+)").find(raw)?.groupValues?.get(1)
            val dn = Regex("Override density:\\s*(\\d+)").find(raw)?.groupValues?.get(1)
            return (if (sz != null) "wm size $sz" else "wm size reset") + "; " + (if (dn != null) "wm density $dn" else "wm density reset")
        }

        fun wmRevertNow(c: Context) {
            wmCancel()
            val app = c.applicationContext
            val sp = Store.sp(app)
            if (!sp.getBoolean("wm_pending", false)) return
            val prev = sp.getString("wm_prev", "") ?: ""
            sp.edit().putBoolean("wm_pending", false).apply()
            Thread {
                Adb.shell(app, wmRestoreCmd(prev))
                MainActivity.cur?.js("window.__toast('↩️','Önceki ekran ayarına dönüldü')")
                MainActivity.cur?.js("window.__wmDone&&window.__wmDone()")
            }.start()
        }

        fun launchPkg(c: Context, pkg: String): Boolean {
            val pm = c.packageManager
            val i = pm.getLeanbackLaunchIntentForPackage(pkg) ?: pm.getLaunchIntentForPackage(pkg) ?: return false
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            return try { c.startActivity(i); true } catch (e: Exception) { false }
        }
    }

    private val exec = Executors.newFixedThreadPool(4)
    private val ui = Handler(Looper.getMainLooper())
    private val sp get() = Store.sp(act)

    private var lastRx = 0L
    private var lastT = 0L
    private var lastCpu: LongArray? = null
    private var tempCache = -1.0
    private var tempT = 0L

    private fun obj(vararg p: Pair<String, Any?>): JSONObject {
        val o = JSONObject()
        for (x in p) o.put(x.first, x.second)
        return o
    }

    @JavascriptInterface
    fun call(id: String, method: String, args: String) {
        exec.execute {
            val res = try { dispatch(method, JSONObject(args)) } catch (e: Throwable) {
                obj("error" to (e.message ?: e.toString())).toString()
            }
            act.js("window.__res(" + JSONObject.quote(id) + "," + JSONObject.quote(res) + ")")
        }
    }

    @JavascriptInterface
    fun sync(method: String, args: String): String = try {
        dispatch(method, JSONObject(args))
    } catch (e: Throwable) { obj("error" to (e.message ?: e.toString())).toString() }

    private fun okJ() = "{\"ok\":true}"

    private fun dispatch(m: String, a: JSONObject): String = when (m) {
        "getState" -> sp.getString("state", "{}") ?: "{}"
        "setState" -> { sp.edit().putString("state", a.getString("s")).apply(); okJ() }
        "setKeymap" -> { sp.edit().putString("keymap", a.getString("m")).apply(); okJ() }
        "apps" -> apps()
        "allPkgs" -> allPkgs()
        "launch" -> obj("ok" to launchPkg(act, a.getString("p"))).toString()
        "openSettings" -> openSettings(a.getString("k"))
        "appSettings" -> appSettings(a.getString("p"))
        "adb" -> { val r = Adb.shell(act, a.getString("c")); obj("code" to r.first, "out" to r.second).toString() }
        "adbStatus" -> adbStatus()
        "adbConnect" -> {
            sp.edit().putString("adb_host", a.optString("host", "127.0.0.1")).putInt("adb_port", a.optInt("port", 5555)).apply()
            obj("r" to Adb.connect(act, a.optString("host", "127.0.0.1"), a.optInt("port", 5555))).toString()
        }
        "adbClose" -> { Adb.close(); okJ() }
        "shizukuRequest" -> { ui.post { try { Shizuku.requestPermission(1001) } catch (e: Throwable) { } }; okJ() }
        "pm" -> pm(a.getString("op"), a.getString("p"))
        "perms" -> perms(a.getString("p"))
        "permSet" -> permSet(a.getString("p"), a.getString("perm"), a.getBoolean("g"))
        "stats" -> stats(a.optBoolean("full", true))
        "deviceInfo" -> deviceInfo()
        "notifs" -> notifs()
        "notifCancel" -> { val k = a.optString("k"); if (k.isEmpty()) NotifService.inst?.cancelAllNotifications() else NotifService.inst?.cancelNotification(k); okJ() }
        "inputs" -> inputs()
        "switchInput" -> {
            val uri = TvContract.buildChannelUriForPassthroughInput(a.getString("id"))
            ui.post { try { act.startActivity(Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (e: Exception) { act.js("window.__toast('❌','Giriş değiştirilemedi')") } }
            okJ()
        }
        "setup" -> setup()
        "setDns" -> setDns(a.getString("mode"), a.optString("host"))
        "getDns" -> { val r = Adb.shell(act, "settings get global private_dns_mode; settings get global private_dns_specifier"); obj("code" to r.first, "out" to r.second).toString() }
        "perf" -> perf(a.getString("v"))
        "wmGet" -> { val r = Adb.shell(act, "wm size; wm density"); obj("code" to r.first, "out" to r.second).toString() }
        "wmSet" -> {
            val cmd = a.getString("c")
            if (!Regex("^wm (size|density) [0-9x]+$").matches(cmd)) throw Exception("geçersiz komut")
            val secs = a.optInt("t", 30).coerceIn(10, 120)
            if (!sp.getBoolean("wm_pending", false)) {
                // İlk uygulamada mevcut durumu sakla; geri alınca "sıfırla" değil bu duruma dönülür.
                sp.edit().putString("wm_prev", Adb.shell(act, "wm size; wm density").second).apply()
            }
            val r = Adb.shell(act, cmd)
            if (r.first == 0) {
                sp.edit().putBoolean("wm_pending", true).putLong("wm_deadline", System.currentTimeMillis() + secs * 1000L).apply()
                wmSchedule(act, secs * 1000L)
                act.runOnUiThread { act.showWmConfirm() }
            }
            obj("code" to r.first, "out" to r.second).toString()
        }
        "wmConfirm" -> { wmKeep(act); okJ() }
        "wmReset" -> {
            wmCancel()
            sp.edit().putBoolean("wm_pending", false).apply()
            val r = Adb.shell(act, "wm size reset; wm density reset")
            obj("code" to r.first, "out" to r.second).toString()
        }
        "ime" -> {
            val show = a.optInt("v", 0) == 1
            ui.post {
                val imm = act.getSystemService(Context.INPUT_METHOD_SERVICE) as android.view.inputmethod.InputMethodManager
                if (show) imm.showSoftInput(act.web, android.view.inputmethod.InputMethodManager.SHOW_IMPLICIT)
                else imm.hideSoftInputFromWindow(act.web.windowToken, 0)
            }
            okJ()
        }
        "screensaver" -> {
            val c = "$ME/$ME.Dream"
            val r = Adb.shell(act, "settings put secure screensaver_components $c; settings put secure screensaver_default_component $c; settings put secure screensaver_enabled 1")
            obj("code" to r.first, "out" to r.second).toString()
        }
        "setHome" -> { val r = Adb.shell(act, "cmd package set-home-activity $ME/$ME.MainActivity"); obj("code" to r.first, "out" to r.second).toString() }
        "pickWallpaper" -> {
            ui.post { try {
                act.startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("image/*"), 1)
            } catch (e: Exception) { act.js("window.__toast('❌','Dosya seçici bulunamadı')") } }
            okJ()
        }
        "exportBackup" -> {
            ui.post { try {
                act.startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                    .setType("application/json").putExtra(Intent.EXTRA_TITLE, "ihlauncher-backup.json"), 2)
            } catch (e: Exception) {
                try {
                    val f = File(act.getExternalFilesDir(null), "ihlauncher-backup.json")
                    f.writeText(sp.getString("state", "{}") ?: "{}")
                    act.js("window.__toast('💾'," + JSONObject.quote(f.absolutePath) + ")")
                } catch (e2: Exception) { act.js("window.__toast('❌','Yedek yazılamadı')") }
            } }
            okJ()
        }
        "importBackup" -> {
            ui.post { try {
                act.startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*"), 3)
            } catch (e: Exception) {
                val f = File(act.getExternalFilesDir(null), "ihlauncher-backup.json")
                if (f.exists()) {
                    try { val t = f.readText(); JSONObject(t); sp.edit().putString("state", t).apply(); act.js("window.__reload&&window.__reload()") }
                    catch (e2: Exception) { act.js("window.__toast('❌','Geçersiz yedek')") }
                } else act.js("window.__toast('❌','Dosya seçici yok, yedek bulunamadı')")
            } }
            okJ()
        }
        "voice" -> {
            ui.post { try {
                act.startActivityForResult(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                    .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "tr-TR"), 4)
            } catch (e: Exception) { act.js("window.__toast('❌','Sesli arama servisi bulunamadı')") } }
            okJ()
        }
        "keyLearn" -> {
            KeyService.learn = { code ->
                act.js("window.__key(" + code + "," + JSONObject.quote(KeyEvent.keyCodeToString(code)) + ")")
            }
            okJ()
        }
        "keyLearnStop" -> { KeyService.learn = null; okJ() }
        "keyAccess" -> obj("v" to enabledA11y()).toString()
        "notifAccess" -> obj("v" to (NotifService.inst != null)).toString()
        "appInfo" -> appInfo(a.getString("p"))
        "usage" -> usage(a.optInt("days", 60))
        "backupTree" -> {
            ui.post { try {
                act.startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).addFlags(
                    Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION), 5)
            } catch (e: Exception) { act.js("window.__toast('❌','Klasör seçici bulunamadı')") } }
            okJ()
        }
        "backupInfo" -> {
            val t = sp.getString("backupTree", null)
            obj("set" to (t != null), "label" to (if (t != null) android.net.Uri.decode(android.net.Uri.parse(t).lastPathSegment ?: "") else "")).toString()
        }
        "backupNow" -> backupNow()
        "profile" -> profile()
        "audit" -> audit()
        "startAction" -> startAction(a.getString("a"))
        "market" -> market(a.getString("p"))
        "openUrl" -> openUrl(a.getString("u"))
        "canInstall" -> obj("ok" to act.packageManager.canRequestPackageInstalls()).toString()
        "installApk" -> installApk(a.getString("url"), a.optString("sha", ""))
        "unknownSources" -> {
            ui.post { try {
                act.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, android.net.Uri.parse("package:$ME")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            } catch (e: Exception) { act.js("window.__toast('❌','Ayar ekranı açılamadı')") } }
            okJ()
        }
        "uninstallUi" -> uninstallUi(a.getString("p"))
        "trimCaches" -> { val r = Adb.shell(act, "pm trim-caches 999999999999"); obj("code" to r.first, "out" to r.second, "ok" to (r.first == 0)).toString() }
        else -> obj("error" to "unknown: $m").toString()
    }

    // ---------- Uygulamalar ----------
    private fun apps(): String {
        val pm = act.packageManager
        val seen = HashSet<String>()
        val arr = JSONArray()
        val list = ArrayList<ResolveInfo>()
        list.addAll(pm.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER), 0))
        list.addAll(pm.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), 0))
        for (ri in list) {
            val p = ri.activityInfo.packageName
            if (!seen.add(p)) continue
            val ai = ri.activityInfo.applicationInfo
            val hasB = ai.banner != 0 || ri.activityInfo.banner != 0
            arr.put(obj("p" to p, "l" to ri.loadLabel(pm).toString(),
                "s" to ((ai.flags and ApplicationInfo.FLAG_SYSTEM) != 0), "b" to hasB))
        }
        return arr.toString()
    }

    private fun allPkgs(): String {
        val pm = act.packageManager
        val arr = JSONArray()
        for (ai in pm.getInstalledApplications(PackageManager.MATCH_UNINSTALLED_PACKAGES)) {
            val label = try { ai.loadLabel(pm).toString() } catch (e: Exception) { ai.packageName }
            arr.put(obj("p" to ai.packageName, "l" to label,
                "s" to ((ai.flags and (ApplicationInfo.FLAG_SYSTEM or ApplicationInfo.FLAG_UPDATED_SYSTEM_APP)) != 0),
                "en" to ai.enabled, "inst" to ((ai.flags and ApplicationInfo.FLAG_INSTALLED) != 0)))
        }
        return arr.toString()
    }

    private fun openSettings(k: String): String {
        val action = when (k) {
            "android" -> Settings.ACTION_SETTINGS
            "wifi" -> Settings.ACTION_WIFI_SETTINGS
            "bt" -> Settings.ACTION_BLUETOOTH_SETTINGS
            "display" -> Settings.ACTION_DISPLAY_SETTINGS
            "sound" -> Settings.ACTION_SOUND_SETTINGS
            "net" -> Settings.ACTION_WIRELESS_SETTINGS
            "date" -> Settings.ACTION_DATE_SETTINGS
            "apps" -> Settings.ACTION_APPLICATION_SETTINGS
            "input" -> Settings.ACTION_INPUT_METHOD_SETTINGS
            "dev" -> Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS
            "info" -> Settings.ACTION_DEVICE_INFO_SETTINGS
            "usage" -> Settings.ACTION_USAGE_ACCESS_SETTINGS
            "notif" -> Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS
            "a11y" -> Settings.ACTION_ACCESSIBILITY_SETTINGS
            "dream" -> Settings.ACTION_DREAM_SETTINGS
            "home" -> Settings.ACTION_HOME_SETTINGS
            "storage" -> Settings.ACTION_INTERNAL_STORAGE_SETTINGS
            else -> Settings.ACTION_SETTINGS
        }
        ui.post {
            try { act.startActivity(Intent(action).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
            catch (e: Exception) {
                try { act.startActivity(Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
                catch (e2: Exception) { act.js("window.__toast('❌','Ayarlar açılamadı')") }
            }
        }
        return okJ()
    }

    private fun appSettings(p: String): String {
        ui.post {
            try {
                act.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, android.net.Uri.parse("package:$p"))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            } catch (e: Exception) { act.js("window.__toast('❌','Uygulama bilgisi açılamadı')") }
        }
        return okJ()
    }

    // ---------- ADB ----------
    private fun adbStatus(): String {
        return obj(
            "mode" to Adb.mode, "info" to Adb.info, "ready" to Adb.ready(),
            "host" to (sp.getString("adb_host", "127.0.0.1") ?: "127.0.0.1"), "port" to sp.getInt("adb_port", 5555),
            "shizukuRunning" to Adb.shizukuRunning(), "shizukuReady" to Adb.shizukuReady()
        ).toString()
    }

    private fun pm(op: String, p: String): String {
        if (!PKG_RE.matches(p)) throw Exception("geçersiz paket adı")
        if (isProtected(p) && op != "unfreeze" && op != "restore" && op != "stop" && op != "bgAllow") throw Exception("Kritik paket korunuyor")
        val cmd = when (op) {
            "freeze" -> "pm disable-user --user 0 $p"
            "unfreeze" -> "pm enable $p"
            "uninstall" -> if (isSys(p)) "pm uninstall -k --user 0 $p" else "pm uninstall $p"
            "restore" -> "cmd package install-existing --user 0 $p"
            "stop" -> "am force-stop $p"
            "clear" -> "pm clear $p"
            "bgRestrict" -> "cmd appops set $p RUN_IN_BACKGROUND ignore; cmd appops set $p RUN_ANY_IN_BACKGROUND ignore"
            "bgAllow" -> "cmd appops set $p RUN_IN_BACKGROUND allow; cmd appops set $p RUN_ANY_IN_BACKGROUND allow"
            else -> throw Exception("bilinmeyen işlem")
        }
        val r = Adb.shell(act, cmd)
        val ok = r.first == 0 && !r.second.contains("Exception") && !r.second.contains("Failure") && !r.second.contains("Error")
        return obj("code" to r.first, "out" to r.second, "ok" to ok).toString()
    }

    private fun perms(p: String): String {
        val pm = act.packageManager
        val arr = JSONArray()
        @Suppress("DEPRECATION")
        val pi = pm.getPackageInfo(p, PackageManager.GET_PERMISSIONS)
        val req = pi.requestedPermissions ?: return arr.toString()
        val fl = pi.requestedPermissionsFlags
        for (i in req.indices) {
            val dangerous = try {
                (pm.getPermissionInfo(req[i], 0).protectionLevel and PermissionInfo.PROTECTION_MASK_BASE) == PermissionInfo.PROTECTION_DANGEROUS
            } catch (e: Exception) { false }
            if (!dangerous) continue
            val g = fl != null && (fl[i] and PackageInfo.REQUESTED_PERMISSION_GRANTED) != 0
            arr.put(obj("n" to req[i], "g" to g))
        }
        return arr.toString()
    }

    private fun permSet(p: String, perm: String, g: Boolean): String {
        if (!PKG_RE.matches(p) || !PKG_RE.matches(perm)) throw Exception("geçersiz ad")
        val r = Adb.shell(act, (if (g) "pm grant " else "pm revoke ") + "$p $perm")
        return obj("code" to r.first, "out" to r.second, "ok" to (r.first == 0)).toString()
    }

    private fun setup(): String {
        val cls = "$ME/$ME.KeyService"
        val cmds = listOf(
            "pm grant $ME android.permission.WRITE_SECURE_SETTINGS",
            "pm grant $ME android.permission.ACCESS_FINE_LOCATION",
            "appops set $ME GET_USAGE_STATS allow",
            "appops set $ME REQUEST_INSTALL_PACKAGES allow",
            "cmd notification allow_listener $ME/$ME.NotifService",
            "cur=\$(settings get secure enabled_accessibility_services); " +
                "case \"\$cur\" in *$cls*) ;; null|\"\") settings put secure enabled_accessibility_services $cls ;; " +
                "*) settings put secure enabled_accessibility_services \"\$cur:$cls\" ;; esac; " +
                "settings put secure accessibility_enabled 1"
        )
        val arr = JSONArray()
        for (c in cmds) {
            val r = Adb.shell(act, c)
            arr.put(obj("c" to c.take(70), "code" to r.first, "out" to r.second))
        }
        return arr.toString()
    }

    private fun setDns(mode: String, host: String): String {
        val cmd = when (mode) {
            "off" -> "settings put global private_dns_mode off"
            "opportunistic" -> "settings put global private_dns_mode opportunistic"
            "hostname" -> {
                if (!Regex("^[A-Za-z0-9.-]+$").matches(host)) throw Exception("geçersiz host")
                "settings put global private_dns_specifier $host; settings put global private_dns_mode hostname"
            }
            else -> throw Exception("geçersiz mod")
        }
        val r = Adb.shell(act, cmd)
        return obj("code" to r.first, "out" to r.second, "ok" to (r.first == 0)).toString()
    }

    private fun perf(v: String): String {
        val cmd = when (v) {
            "1" -> "settings put global window_animation_scale 1.0; settings put global transition_animation_scale 1.0; settings put global animator_duration_scale 1.0"
            "0.5" -> "settings put global window_animation_scale 0.5; settings put global transition_animation_scale 0.5; settings put global animator_duration_scale 0.5"
            "0" -> "settings put global window_animation_scale 0; settings put global transition_animation_scale 0; settings put global animator_duration_scale 0"
            "kill" -> "am kill-all"
            else -> throw Exception("geçersiz")
        }
        val r = Adb.shell(act, cmd)
        return obj("code" to r.first, "out" to r.second, "ok" to (r.first == 0)).toString()
    }

    // ---------- Sistem ----------
    private fun stats(full: Boolean): String {
        if (!full) {
            val n = netInfo()
            return JSONObject().put("net", n.first).put("lvl", n.second).toString()
        }
        val am = act.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val mi = ActivityManager.MemoryInfo(); am.getMemoryInfo(mi)
        val st = StatFs(Environment.getDataDirectory().path)
        val o = JSONObject()
        o.put("ramT", mi.totalMem); o.put("ramF", mi.availMem)
        o.put("stT", st.totalBytes); o.put("stF", st.availableBytes)
        val now = SystemClock.elapsedRealtime()
        val rx = TrafficStats.getTotalRxBytes()
        val spd = if (lastT > 0 && rx >= 0 && lastRx > 0 && now > lastT) (rx - lastRx) * 1000.0 / (now - lastT) else 0.0
        lastRx = rx; lastT = now
        o.put("rxBps", spd)
        o.put("cpu", cpu())
        o.put("temp", temp())
        val net = netInfo()
        o.put("net", net.first); o.put("lvl", net.second)
        return o.toString()
    }

    private fun cpu(): Double {
        if (!Adb.ready()) return -1.0
        val r = Adb.shell(act, "head -n 1 /proc/stat", false)
        val p = r.second.trim().split(Regex("\\s+"))
        if (r.first != 0 || p.size < 9 || p[0] != "cpu") return -1.0
        val v = try { p.drop(1).take(8).map { it.toLong() }.toLongArray() } catch (e: Exception) { return -1.0 }
        val prev = lastCpu; lastCpu = v
        if (prev == null) return -2.0
        val idle = (v[3] + v[4]) - (prev[3] + prev[4])
        val tot = v.sum() - prev.sum()
        return if (tot > 0) (1.0 - idle.toDouble() / tot) * 100.0 else 0.0
    }

    private fun temp(): Double {
        val n = SystemClock.elapsedRealtime()
        if (n - tempT < 10000) return tempCache
        tempT = n
        var best = -1.0
        fun consider(raw: Double) {
            val v = if (raw > 1000) raw / 1000.0 else raw
            if (v in 10.0..120.0 && v > best) best = v
        }
        try {
            File("/sys/class/thermal").listFiles()?.filter { it.name.startsWith("thermal_zone") }?.forEach { f ->
                try { File(f, "temp").readText().trim().toDoubleOrNull()?.let { consider(it) } } catch (e: Exception) { }
            }
        } catch (e: Exception) { }
        if (best < 0 && Adb.ready()) {
            val r = Adb.shell(act, "cat /sys/class/thermal/thermal_zone*/temp", false)
            r.second.lines().forEach { l -> l.trim().toDoubleOrNull()?.let { consider(it) } }
        }
        tempCache = best
        return best
    }

    private fun netInfo(): Pair<String, Int> {
        return try {
            val cm = act.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val nw = cm.activeNetwork ?: return Pair("Bağlantı yok", -1)
            val caps = cm.getNetworkCapabilities(nw) ?: return Pair("Bağlantı yok", -1)
            when {
                caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> Pair("Ethernet", 4)
                caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> {
                    val wm = act.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
                    @Suppress("DEPRECATION")
                    val ci = wm.connectionInfo
                    var name = ci?.ssid?.replace("\"", "") ?: "Wi-Fi"
                    if (name.isEmpty() || name.contains("unknown ssid")) name = "Wi-Fi"
                    @Suppress("DEPRECATION")
                    val lvl = if (ci != null) WifiManager.calculateSignalLevel(ci.rssi, 5) else 3
                    Pair(name, lvl)
                }
                else -> Pair("Ağ", 3)
            }
        } catch (e: Exception) { Pair("Ağ", 3) }
    }

    private fun deviceInfo(): String {
        val dm = act.resources.displayMetrics
        var ip = ""
        try {
            for (ni in NetworkInterface.getNetworkInterfaces()) for (ad in ni.inetAddresses) {
                if (!ad.isLoopbackAddress && ad.hostAddress != null && !ad.hostAddress!!.contains(":")) ip = ad.hostAddress!!
            }
        } catch (e: Exception) { }
        val home = act.packageManager.resolveActivity(
            Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), PackageManager.MATCH_DEFAULT_ONLY
        )?.activityInfo?.packageName ?: "-"
        val arr = JSONArray()
        fun add(k: String, v: String) { arr.put(obj("k" to k, "v" to v)) }
        add("Üretici / Model", Build.MANUFACTURER + " " + Build.MODEL)
        add("Cihaz kodu", Build.DEVICE)
        add("Android", Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ")")
        add("Güvenlik yaması", Build.VERSION.SECURITY_PATCH)
        add("Mimari", Build.SUPPORTED_ABIS.firstOrNull() ?: "-")
        add("Ekran", dm.widthPixels.toString() + "x" + dm.heightPixels + " @" + dm.densityDpi + "dpi")
        add("IP adresi", ip.ifEmpty { "-" })
        add("Varsayılan ana ekran", home)
        add("ADB", if (Adb.ready()) Adb.mode + " " + Adb.info else "bağlı değil")
        return arr.toString()
    }

    private fun notifs(): String {
        val arr = JSONArray()
        for (o in NotifService.items) arr.put(o)
        return obj("access" to (NotifService.inst != null), "items" to arr).toString()
    }

    private fun inputs(): String {
        val arr = JSONArray()
        val tim = act.getSystemService(Context.TV_INPUT_SERVICE) as? TvInputManager ?: return arr.toString()
        try {
            for (i in tim.tvInputList) {
                if (!i.isPassthroughInput) continue
                val hdmi = try { i.hdmiDeviceInfo } catch (e: Throwable) { null }
                val label = try { (i.loadCustomLabel(act) ?: i.loadLabel(act))?.toString() ?: i.id } catch (e: Throwable) { i.id }
                arr.put(obj("id" to i.id, "label" to label, "type" to i.type,
                    "cec" to (hdmi?.displayName ?: ""), "port" to (hdmi?.portId ?: -1),
                    "state" to tim.getInputState(i.id)))
            }
        } catch (e: Throwable) { }
        return arr.toString()
    }

    private fun enabledA11y(): Boolean {
        val s = Settings.Secure.getString(act.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: ""
        return s.contains("$ME/")
    }

    @Suppress("DEPRECATION")
    private fun usageAccess(): Boolean = try {
        val ao = act.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        ao.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), ME) == AppOpsManager.MODE_ALLOWED
    } catch (e: Exception) { false }

    /** Kullanıcı (sistem olmayan) uygulamaları: kurulum zamanı, son kullanım ve ön plan süresi. */
    @Suppress("DEPRECATION")
    private fun usage(days: Int): String {
        val ok = usageAccess()
        val pm = act.packageManager
        val last = HashMap<String, Long>()
        val fg = HashMap<String, Long>()
        if (ok) {
            val um = act.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val end = System.currentTimeMillis()
            for ((k, u) in um.queryAndAggregateUsageStats(end - days.coerceIn(1, 365) * 86400000L, end)) {
                last[k] = u.lastTimeUsed; fg[k] = u.totalTimeInForeground
            }
        }
        val arr = JSONArray()
        for (pi in pm.getInstalledPackages(0)) {
            val ai = pi.applicationInfo ?: continue
            if ((ai.flags and (ApplicationInfo.FLAG_SYSTEM or ApplicationInfo.FLAG_UPDATED_SYSTEM_APP)) != 0) continue
            if (pi.packageName == ME || !ai.enabled) continue
            arr.put(obj("p" to pi.packageName, "l" to ai.loadLabel(pm).toString(), "ins" to pi.firstInstallTime,
                "last" to (last[pi.packageName] ?: 0L), "fg" to (fg[pi.packageName] ?: 0L)))
        }
        return obj("access" to ok, "items" to arr).toString()
    }

    private fun backupNow(): String {
        val t = sp.getString("backupTree", null) ?: throw Exception("Önce yedek klasörü seç")
        val tree = android.net.Uri.parse(t)
        val dir = android.provider.DocumentsContract.buildDocumentUriUsingTree(tree, android.provider.DocumentsContract.getTreeDocumentId(tree))
        val name = "ihlauncher-yedek-" + java.text.SimpleDateFormat("yyyyMMdd-HHmm", java.util.Locale.US).format(java.util.Date()) + ".json"
        val doc = android.provider.DocumentsContract.createDocument(act.contentResolver, dir, "application/json", name)
            ?: throw Exception("Dosya oluşturulamadı (USB takılı mı?)")
        val out = act.contentResolver.openOutputStream(doc) ?: throw Exception("Yazma açılamadı")
        out.use { it.write((sp.getString("state", "{}") ?: "{}").toByteArray()) }
        return obj("ok" to true, "name" to name).toString()
    }

    private fun isSys(p: String): Boolean = try {
        (act.packageManager.getApplicationInfo(p, 0).flags and ApplicationInfo.FLAG_SYSTEM) != 0
    } catch (e: Exception) { false }

    @Suppress("DEPRECATION")
    private fun verCode(pi: PackageInfo): Long = if (Build.VERSION.SDK_INT >= 28) pi.longVersionCode else pi.versionCode.toLong()

    private fun appInfo(p: String): String {
        if (!PKG_RE.matches(p)) throw Exception("geçersiz paket adı")
        @Suppress("DEPRECATION")
        val pi = act.packageManager.getPackageInfo(p, 0)
        val ai = pi.applicationInfo
        return obj(
            "p" to p, "v" to (pi.versionName ?: "-"), "c" to verCode(pi), "first" to pi.firstInstallTime,
            "upd" to pi.lastUpdateTime, "sys" to (ai != null && (ai.flags and ApplicationInfo.FLAG_SYSTEM) != 0),
            "sdk" to (ai?.targetSdkVersion ?: 0), "apk" to (ai?.sourceDir ?: "-"), "enabled" to (ai?.enabled ?: true)
        ).toString()
    }

    @Suppress("DEPRECATION")
    private fun profile(): String {
        val pm = act.packageManager
        fun has(p: String): Boolean = try { pm.getPackageInfo(p, 0); true } catch (e: Exception) { false }
        val um = act.getSystemService(Context.UI_MODE_SERVICE) as UiModeManager
        val am = act.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val mi = ActivityManager.MemoryInfo(); am.getMemoryInfo(mi)
        val home = pm.resolveActivity(
            Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), PackageManager.MATCH_DEFAULT_ONLY
        )?.activityInfo?.packageName ?: ""
        return obj(
            "man" to Build.MANUFACTURER, "brand" to Build.BRAND, "model" to Build.MODEL, "device" to Build.DEVICE,
            "product" to Build.PRODUCT, "hw" to Build.HARDWARE, "board" to Build.BOARD, "fp" to Build.FINGERPRINT,
            "type" to Build.TYPE, "sdk" to Build.VERSION.SDK_INT, "rel" to Build.VERSION.RELEASE,
            "patch" to Build.VERSION.SECURITY_PATCH, "abi" to (Build.SUPPORTED_ABIS.firstOrNull() ?: "-"),
            "tv" to (um.currentModeType == Configuration.UI_MODE_TYPE_TELEVISION), "ramT" to mi.totalMem,
            "gms" to has("com.google.android.gms"), "gtv" to has("com.google.android.apps.tv.launcherx"),
            "atv" to has("com.google.android.tvlauncher"), "home" to home
        ).toString()
    }

    private fun audit(): String {
        val cr = act.contentResolver
        val pm = act.packageManager
        fun lab(p: String): String = try { pm.getApplicationLabel(pm.getApplicationInfo(p, 0)).toString() } catch (e: Exception) { p }
        fun comps(key: String): JSONArray {
            val arr = JSONArray()
            val s = Settings.Secure.getString(cr, key) ?: ""
            for (c in s.split(":")) {
                if (c.isBlank()) continue
                val p = c.substringBefore("/")
                arr.put(obj("p" to p, "c" to c, "l" to lab(p), "s" to isSys(p)))
            }
            return arr
        }
        val risky = JSONArray()
        @Suppress("DEPRECATION")
        val pkgs = pm.getInstalledPackages(PackageManager.GET_PERMISSIONS)
        for (pi in pkgs) {
            val ai = pi.applicationInfo ?: continue
            if ((ai.flags and (ApplicationInfo.FLAG_SYSTEM or ApplicationInfo.FLAG_UPDATED_SYSTEM_APP)) != 0) continue
            if (pi.packageName == ME) continue
            val req = pi.requestedPermissions ?: continue
            val fl = pi.requestedPermissionsFlags ?: continue
            val g = JSONArray()
            for (i in req.indices) {
                if ((fl[i] and PackageInfo.REQUESTED_PERMISSION_GRANTED) == 0) continue
                val dangerous = try {
                    (pm.getPermissionInfo(req[i], 0).protectionLevel and PermissionInfo.PROTECTION_MASK_BASE) == PermissionInfo.PROTECTION_DANGEROUS
                } catch (e: Exception) { false }
                if (dangerous) g.put(req[i].removePrefix("android.permission."))
            }
            if (g.length() > 0) risky.put(obj("p" to pi.packageName, "l" to lab(pi.packageName), "perms" to g))
        }
        return obj(
            "a11y" to comps(Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES),
            "listeners" to comps("enabled_notification_listeners"),
            "apps" to risky,
            "adb" to (Settings.Global.getInt(cr, Settings.Global.ADB_ENABLED, 0) == 1),
            "dev" to (Settings.Global.getInt(cr, Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0) == 1)
        ).toString()
    }

    private fun startAction(action: String): String {
        if (!PKG_RE.matches(action)) throw Exception("geçersiz")
        ui.post {
            try { act.startActivity(Intent(action).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
            catch (e: Exception) { act.js("window.__toast('❌','Bu cihazda açılamadı')") }
        }
        return okJ()
    }

    private fun market(p: String): String {
        if (!PKG_RE.matches(p)) throw Exception("geçersiz paket adı")
        ui.post {
            try {
                act.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse("market://details?id=$p")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            } catch (e: Exception) { act.js("window.__toast('❌','Mağaza açılamadı')") }
        }
        return okJ()
    }

    private var installRx: android.content.BroadcastReceiver? = null
    @Volatile private var installSession = -1

    /** GitHub sürüm APK'sını indirir, (varsa) SHA-256 doğrular ve PackageInstaller ile kurar. İmza aynı olmalıdır. */
    private fun installApk(url: String, sha: String): String {
        if (!url.startsWith("https://github.com/") || !url.contains("/releases/download/")) throw Exception("Yalnızca GitHub sürüm adresleri kabul edilir")
        if (!act.packageManager.canRequestPackageInstalls()) throw Exception("NEED_PERM")
        val f = File(act.cacheDir, "update.apk")
        val conn = java.net.URL(url).openConnection() as java.net.HttpURLConnection
        conn.connectTimeout = 15000; conn.readTimeout = 30000
        val total = conn.contentLengthLong
        val md = java.security.MessageDigest.getInstance("SHA-256")
        conn.inputStream.use { ins ->
            f.outputStream().use { out ->
                val buf = ByteArray(64 * 1024)
                var done = 0L
                var lastPct = -1
                while (true) {
                    val n = ins.read(buf)
                    if (n < 0) break
                    out.write(buf, 0, n); md.update(buf, 0, n); done += n
                    if (total > 0) {
                        val pct = (done * 100 / total).toInt()
                        if (pct != lastPct && pct % 5 == 0) { lastPct = pct; act.js("window.__dl&&window.__dl($pct)") }
                    }
                }
            }
        }
        if (f.length() < 100_000) { f.delete(); throw Exception("İndirilen dosya geçersiz") }
        val got = md.digest().joinToString("") { "%02x".format(it) }
        if (sha.isNotBlank() && !got.equals(sha.removePrefix("sha256:"), ignoreCase = true)) { f.delete(); throw Exception("SHA-256 uyuşmuyor, kurulum iptal edildi") }
        val inst = act.packageManager.packageInstaller
        val id = inst.createSession(PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL))
        installSession = id
        inst.openSession(id).use { ses ->
            f.inputStream().use { i -> ses.openWrite("update", 0, f.length()).use { o -> i.copyTo(o); ses.fsync(o) } }
            registerInstallRx()
            val pend = PendingIntent.getBroadcast(act, id, Intent(ACT_INSTALL).setPackage(ME),
                PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0))
            ses.commit(pend.intentSender)
        }
        return obj("ok" to true, "sha" to got).toString()
    }

    private fun registerInstallRx() {
        if (installRx != null) return
        val rx = object : android.content.BroadcastReceiver() {
            @Suppress("DEPRECATION")
            override fun onReceive(c: Context, i: Intent) {
                if (i.getIntExtra(PackageInstaller.EXTRA_SESSION_ID, -1) != installSession) return
                when (i.getIntExtra(PackageInstaller.EXTRA_STATUS, -999)) {
                    PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                        val confirm = i.getParcelableExtra<Intent>(Intent.EXTRA_INTENT)
                        val ok = confirm != null && ((confirm.component?.packageName ?: "").contains("packageinstaller") ||
                            confirm.action == "android.content.pm.action.CONFIRM_INSTALL")
                        if (ok) try { act.startActivity(confirm!!.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (e: Exception) {}
                    }
                    PackageInstaller.STATUS_SUCCESS -> act.js("window.__toast('✅','Güncelleme kuruldu')")
                    else -> act.js("window.__toast('❌'," + JSONObject.quote(i.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: "Kurulum başarısız") + ")")
                }
            }
        }
        val flt = android.content.IntentFilter(ACT_INSTALL)
        if (Build.VERSION.SDK_INT >= 33) act.registerReceiver(rx, flt, Context.RECEIVER_NOT_EXPORTED) else act.registerReceiver(rx, flt)
        installRx = rx
    }

    private fun openUrl(u: String): String {
        if (!u.startsWith("https://")) throw Exception("yalnızca https adresleri açılır")
        ui.post {
            try { act.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse(u)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
            catch (e: Exception) { act.js("window.__toast('❌','Tarayıcı bulunamadı — adresi Downloader ile aç')") }
        }
        return okJ()
    }

    private fun uninstallUi(p: String): String {
        if (!PKG_RE.matches(p)) throw Exception("geçersiz paket adı")
        if (isProtected(p)) throw Exception("Kritik paket korunuyor")
        ui.post {
            try {
                act.startActivity(Intent(Intent.ACTION_DELETE, android.net.Uri.parse("package:$p")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            } catch (e: Exception) { act.js("window.__toast('❌','Kaldırma ekranı açılamadı')") }
        }
        return okJ()
    }

}
