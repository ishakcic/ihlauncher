package com.ihlauncher.tv

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView

/** Diğer uygulamaların üstünde açılan panel (dock). Erişilebilirlik overlay'i: ek izin gerekmez. */
class DockOverlay(
    private val svc: AccessibilityService,
    private val items: List<Item>,
    private val onPick: (String) -> Unit,
    private val onClose: () -> Unit
) {
    data class Item(val t: String, val n: String, val e: String)

    private val wm = svc.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private val dm = svc.resources.displayMetrics
    private val root = FrameLayout(svc)
    private val title = TextView(svc)
    private val cells = ArrayList<FrameLayout>()
    private var sel = 0
    private var shown = false

    private fun dp(v: Float) = (v * dm.density).toInt()

    fun show() {
        if (shown || items.isEmpty()) return
        root.clipChildren = false
        root.background = GradientDrawable(GradientDrawable.Orientation.BOTTOM_TOP, intArrayOf(0xA6000000.toInt(), 0x1F000000, 0x00000000))
        root.setOnClickListener { hide() }

        val col = LinearLayout(svc).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER_HORIZONTAL; clipChildren = false; clipToPadding = false }
        title.apply { setTextColor(Color.WHITE); setTextSize(TypedValue.COMPLEX_UNIT_SP, 24f); typeface = android.graphics.Typeface.DEFAULT_BOLD; gravity = Gravity.CENTER; setShadowLayer(12f, 0f, 2f, 0xB0000000.toInt()) }
        col.addView(title, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(36f)).apply { bottomMargin = dp(34f) })

        val n = items.size
        val gap = dp(14f)
        val size = minOf(dp(98f), ((dm.widthPixels * 0.9f - dp(64f)) / n).toInt() - gap)
        val bar = LinearLayout(svc).apply {
            orientation = LinearLayout.HORIZONTAL; clipChildren = false; clipToPadding = false; isClickable = true
            setPadding(dp(22f), dp(20f), dp(22f), dp(18f))
            background = GradientDrawable().apply { setColor(0xA01C1E26.toInt()); cornerRadius = dp(34f).toFloat(); setStroke(dp(1f), 0x33FFFFFF) }
            elevation = dp(16f).toFloat()
        }
        items.forEachIndexed { i, it ->
            val cell = FrameLayout(svc).apply { clipChildren = false }
            val child: View = if (it.t.startsWith("act:")) {
                TextView(svc).apply {
                    text = it.e.ifEmpty { "🚀" }; gravity = Gravity.CENTER
                    setTextSize(TypedValue.COMPLEX_UNIT_PX, size * 0.5f)
                    background = GradientDrawable(GradientDrawable.Orientation.TL_BR, intArrayOf(0xFF3B82F6.toInt(), 0xFF6366F1.toInt())).apply { cornerRadius = size * 0.22f }
                }
            } else {
                ImageView(svc).apply {
                    scaleType = ImageView.ScaleType.FIT_CENTER
                    try { setImageDrawable(svc.packageManager.getApplicationIcon(it.t)) } catch (e: Exception) { }
                }
            }
            cell.addView(child, FrameLayout.LayoutParams(size, size))
            cell.setOnClickListener { sel = i; pick() }
            bar.addView(cell, LinearLayout.LayoutParams(size, size).apply { if (i > 0) leftMargin = gap })
            cells.add(cell)
        }
        col.addView(bar, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        root.addView(col, FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL).apply { bottomMargin = (dm.heightPixels * 0.06f).toInt() })

        val lp = WindowManager.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT)
        try { wm.addView(root, lp); shown = true } catch (e: Exception) { onClose(); return }
        root.alpha = 0f; root.animate().alpha(1f).setDuration(160).start()
        render()
    }

    private fun render() {
        cells.forEachIndexed { i, c ->
            val on = i == sel
            c.animate().scaleX(if (on) 1.32f else 1f).scaleY(if (on) 1.32f else 1f).translationY(if (on) -dp(22f).toFloat() else 0f).setDuration(150).start()
            c.elevation = if (on) dp(8f).toFloat() else 0f
            c.foreground = if (on) GradientDrawable().apply { setColor(Color.TRANSPARENT); cornerRadius = dp(22f).toFloat(); setStroke(dp(3f), Color.WHITE) } else null
        }
        title.text = items[sel].n
    }

    fun move(d: Int) { if (!shown) return; sel = (sel + d).coerceIn(0, items.size - 1); render() }

    fun pick() { val t = items.getOrNull(sel)?.t ?: return; hide(); onPick(t) }

    fun hide() {
        if (!shown) return
        shown = false
        try { wm.removeView(root) } catch (e: Exception) { }
        onClose()
    }
}
