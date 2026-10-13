package com.ihlauncher.tv

import android.content.Context
import android.content.SharedPreferences

object Store {
    fun sp(c: Context): SharedPreferences = c.getSharedPreferences("ihl", Context.MODE_PRIVATE)
}
