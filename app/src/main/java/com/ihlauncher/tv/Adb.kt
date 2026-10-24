package com.ihlauncher.tv

import android.content.Context
import android.content.pm.PackageManager
import dadb.AdbKeyPair
import dadb.Dadb
import rikka.shizuku.Shizuku
import java.io.File

/** ADB motoru: önce Shizuku (varsa ve izinliyse), yoksa Dadb ile 127.0.0.1:5555. */
object Adb {
    @Volatile var dadb: Dadb? = null
    @Volatile var mode = "none"
    @Volatile var info = ""

    fun shizukuRunning(): Boolean = try { Shizuku.pingBinder() } catch (e: Throwable) { false }
    fun shizukuReady(): Boolean = try {
        Shizuku.pingBinder() && Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED
    } catch (e: Throwable) { false }

    fun ready(): Boolean = shizukuReady() || dadb != null

    private fun keyPair(ctx: Context): AdbKeyPair {
        val priv = File(ctx.filesDir, "adbkey")
        val pub = File(ctx.filesDir, "adbkey.pub")
        if (!priv.exists() || !pub.exists()) AdbKeyPair.generate(priv, pub)
        return AdbKeyPair.read(priv, pub)
    }

    @Synchronized
    fun connect(ctx: Context, host: String, port: Int): String {
        if (shizukuReady()) { mode = "shizuku"; info = "Shizuku"; return "ok" }
        try { dadb?.close() } catch (e: Throwable) { }
        dadb = null
        var last = ""
        val kp = try { keyPair(ctx) } catch (e: Throwable) { return "error: anahtar: " + (e.message ?: e.toString()) }
        for (p in listOf(port, 5555).distinct()) {
            // Ulaşılamayan adreste dakikalarca beklemesin: önce 3 sn zaman aşımlı yoklama
            try { java.net.Socket().use { it.connect(java.net.InetSocketAddress(host, p), 3000) } }
            catch (e: Throwable) { last = e.message ?: e.toString(); continue }
            try {
                val d = Dadb.create(host, p, kp)
                val r = d.shell("echo ihl_ok")
                if (r.output.contains("ihl_ok")) {
                    dadb = d; mode = "dadb"; info = "$host:$p"
                    return "ok"
                }
                d.close()
            } catch (e: Throwable) { last = e.message ?: e.toString() }
        }
        mode = "none"; info = ""
        return "error: $last"
    }

    fun close() {
        try { dadb?.close() } catch (e: Throwable) { }
        dadb = null
        if (!shizukuReady()) mode = "none"
    }

    /** Birden çok thread aynı anda bağlanmaya kalkmasın: kilit altında yalnızca bağlı değilse bağlan. */
    private fun ensure(ctx: Context): String {
        synchronized(this) {
            if (dadb != null) return "ok"
            val sp = Store.sp(ctx)
            return connect(ctx, sp.getString("adb_host", "127.0.0.1")!!, sp.getInt("adb_port", 5555))
        }
    }

    private fun run(d: Dadb, cmd: String): Pair<Int, String> {
        val r = d.shell(cmd)
        return Pair(r.exitCode, (r.output + r.errorOutput).trim())
    }

    fun shell(ctx: Context, cmd: String, autoConnect: Boolean = true): Pair<Int, String> {
        if (shizukuReady()) return shizukuShell(cmd)
        if (dadb == null) {
            if (!autoConnect) return Pair(-1, "ADB bağlı değil")
            val r = ensure(ctx)
            if (r != "ok") return Pair(-1, r)
        }
        val d = dadb ?: return Pair(-1, "ADB bağlı değil")
        return try {
            run(d, cmd)
        } catch (e: Throwable) {
            // bağlantı kopmuş olabilir: yalnızca hâlâ aynı bağlantıysa kapat (başkası yenilemiş olabilir), bir kez yeniden dene
            synchronized(this) {
                if (dadb === d) { try { d.close() } catch (x: Throwable) { }; dadb = null }
            }
            if (!autoConnect) return Pair(-1, e.message ?: e.toString())
            val r = ensure(ctx)
            if (r != "ok") return Pair(-1, r)
            val d2 = dadb ?: return Pair(-1, "ADB bağlı değil")
            try { run(d2, cmd) } catch (e2: Throwable) { Pair(-1, e2.message ?: e2.toString()) }
        }
    }

    private fun shizukuShell(cmd: String): Pair<Int, String> {
        return try {
            val m = Shizuku::class.java.getDeclaredMethod(
                "newProcess", Array<String>::class.java, Array<String>::class.java, String::class.java
            )
            m.isAccessible = true
            val p = m.invoke(null, arrayOf("sh", "-c", cmd), null, null) as Process
            val err = StringBuilder()
            val t = Thread { try { err.append(p.errorStream.bufferedReader().readText()) } catch (e: Throwable) { } }
            t.start()
            val out = p.inputStream.bufferedReader().readText()
            val code = p.waitFor()
            t.join(2000)
            Pair(code, (out + err.toString()).trim())
        } catch (e: Throwable) {
            Pair(-1, "Shizuku: " + (e.cause?.message ?: e.message ?: e.toString()))
        }
    }
}
