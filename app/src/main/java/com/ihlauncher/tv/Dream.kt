package com.ihlauncher.tv

import android.graphics.Color
import android.graphics.Typeface
import android.os.Handler
import android.os.Looper
import android.service.dreams.DreamService
import android.view.Gravity
import android.widget.FrameLayout
import android.widget.TextView
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class Dream : DreamService() {
    private val h = Handler(Looper.getMainLooper())
    private var tv: TextView? = null
    private val fmt = SimpleDateFormat("HH:mm\nd MMMM EEEE", Locale("tr"))
    private val tick = object : Runnable {
        override fun run() {
            tv?.let {
                it.text = fmt.format(Date())
                it.translationX = ((Math.random() - 0.5) * 240).toFloat()
                it.translationY = ((Math.random() - 0.5) * 160).toFloat()
            }
            h.postDelayed(this, 30000)
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        isInteractive = false
        isFullscreen = true
        val root = FrameLayout(this)
        root.setBackgroundColor(Color.BLACK)
        val t = TextView(this)
        t.setTextColor(Color.WHITE)
        t.textSize = 64f
        t.gravity = Gravity.CENTER
        t.typeface = Typeface.create("sans-serif-thin", Typeface.NORMAL)
        root.addView(t, FrameLayout.LayoutParams(-1, -1))
        tv = t
        setContentView(root)
    }

    override fun onDreamingStarted() { super.onDreamingStarted(); h.post(tick) }
    override fun onDreamingStopped() { h.removeCallbacks(tick); super.onDreamingStopped() }
}
