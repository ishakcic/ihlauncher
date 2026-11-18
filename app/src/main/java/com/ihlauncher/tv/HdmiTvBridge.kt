import android.content.Context
import android.media.tv.TvContract
import android.media.tv.TvInputInfo
import android.media.tv.TvInputManager
import android.media.tv.TvView
import android.os.Looper
import org.json.JSONArray
import org.json.JSONObject

/**
 * ihlauncher v4.2: HDMI için Android tarafındaki köprü yardımcısı.
 *
 * Bu dosyayı launcher'ın Kotlin kaynaklarına ekleyin ve gerekiyorsa başına projenin
 * package satırını koyun. Var olan Canlı TV TvView nesnesini kullanın.
 *
 * 1. N('tvHdmiTune', {input}) komutunu Android köprüsünde kaydedin.
 *    Ana iş parçacığında tune(context, mevcutTvView, args.optString("input"))
 *    çalıştırın ve sonucu diğer N yanıtları gibi JSON olarak döndürün.
 * 2. tvState yanıtı zaten HDMI girişlerini döndürüyorsa değiştirmeyin. Aksi halde
 *    appendMissingInputs(context, mevcutInputs) ile eksik HDMI girişlerini ekleyin.
 *    Kanal listesi izni verilmemiş olsa bile tvState.inputs alanını sağlayın.
 * 3. Mevcut TvView video var/yok, bağlantı hatası ve kopma bildirimlerini
 *    window.__tvEv üzerinden HDMI için de iletin. Giriş kimliği callback'te
 *    mevcutsa, artık etkin olmayan girişlerden gelen eski olayları yok sayın.
 * 4. Aynı TvView tam ekran yüzeyi, tvMode/tvRect ve tvStop akışı korunmalı.
 *    Bu yardımcı herhangi bir sistem APK'sını başlatmaz, kaldırmaz veya yüklemez.
 *
 * Kotlin kaynakları ve cihaz sağlanmadığı için buradan APK'ye entegre edilmedi.
 */
object HdmiTvBridge {
    private fun manager(context: Context): TvInputManager? =
        context.getSystemService(Context.TV_INPUT_SERVICE) as? TvInputManager

    private fun isHdmi(input: TvInputInfo): Boolean =
        input.type == TvInputInfo.TYPE_HDMI && input.isPassthroughInput

    private fun result(ok: Boolean, error: String? = null): JSONObject =
        JSONObject().put("ok", ok).put("mode", "hdmi").apply {
            if (error != null) put("error", error)
        }

    fun appendMissingInputs(context: Context, inputs: JSONArray): JSONArray {
        val tvInputManager = manager(context) ?: return inputs
        val seen = mutableSetOf<String>()
        for (index in 0 until inputs.length()) {
            inputs.optJSONObject(index)?.optString("id")?.let { seen.add(it) }
        }
        val ports = try {
            tvInputManager.tvInputList
        } catch (_: SecurityException) {
            return inputs
        }
        for (info in ports) {
            if (!isHdmi(info) || !seen.add(info.id)) continue
            val label = try {
                info.loadCustomLabel(context)?.toString()?.takeIf { it.isNotBlank() }
                    ?: info.loadLabel(context)?.toString()?.takeIf { it.isNotBlank() }
                    ?: "HDMI"
            } catch (_: RuntimeException) {
                "HDMI"
            }
            inputs.put(
                JSONObject().put("id", info.id).put("label", label)
                    .put("type", "TYPE_HDMI").put("tuner", false)
            )
        }
        return inputs
    }

    fun tune(context: Context, tvView: TvView, inputId: String): JSONObject {
        if (Looper.myLooper() != Looper.getMainLooper()) {
            return result(false, "HDMI işlemi Android ana iş parçacığında yapılmalı.")
        }
        if (inputId.isBlank()) return result(false, "HDMI girişi belirtilmedi.")
        return try {
            val info = manager(context)?.getTvInputInfo(inputId)
            if (info == null || !isHdmi(info)) {
                result(false, "Cihaz bu HDMI girişini uygulamaya sunmuyor.")
            } else {
                tvView.tune(info.id, TvContract.buildChannelUriForPassthroughInput(info.id))
                // Bu yalnızca isteğin kabul edildiğini söyler. Görüntüyü TvView callback'i doğrular.
                result(true)
            }
        } catch (_: SecurityException) {
            result(false, "Cihaz uygulama içi HDMI erişimine izin vermedi.")
        } catch (_: RuntimeException) {
            result(false, "Android HDMI girişini açamadı.")
        }
    }
}
