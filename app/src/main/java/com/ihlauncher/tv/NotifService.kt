package com.ihlauncher.tv

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject
import java.util.concurrent.CopyOnWriteArrayList

class NotifService : NotificationListenerService() {
    companion object {
        val items = CopyOnWriteArrayList<JSONObject>()
        @Volatile var inst: NotifService? = null
    }

    override fun onListenerConnected() { inst = this; refresh() }
    override fun onListenerDisconnected() { inst = null }
    override fun onNotificationPosted(sbn: StatusBarNotification?) { refresh() }
    override fun onNotificationRemoved(sbn: StatusBarNotification?) { refresh() }

    private fun refresh() {
        try {
            val list = activeNotifications ?: return
            val tmp = ArrayList<JSONObject>()
            for (s in list.sortedByDescending { it.postTime }) {
                val n = s.notification
                if (n.flags and Notification.FLAG_GROUP_SUMMARY != 0) continue
                if (n.flags and Notification.FLAG_ONGOING_EVENT != 0) continue
                val title = n.extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
                val text = n.extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
                if (title.isEmpty() && text.isEmpty()) continue
                val label = try {
                    packageManager.getApplicationLabel(packageManager.getApplicationInfo(s.packageName, 0)).toString()
                } catch (e: Exception) { s.packageName }
                tmp.add(JSONObject().put("k", s.key).put("p", s.packageName).put("a", label)
                    .put("t", title).put("x", text).put("w", s.postTime))
            }
            items.clear(); items.addAll(tmp)
        } catch (e: Exception) { }
    }
}
