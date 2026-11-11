package app.varlikhafizasi.reminders

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import app.varlikhafizasi.data.ReminderItem
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import java.time.Instant

/**
 * Hatırlatmaları cihazda AlarmManager ile planlar.
 *
 * Sunucudaki hatırlatma listesi her açılışta yeniden çekilir; planlanan
 * zamanlar ayrıca yerelde saklanır ki cihaz yeniden başladığında sunucuya
 * gerek kalmadan alarmlar geri kurulabilsin.
 */
object ReminderScheduler {
    private const val PREFS = "vh_reminder_alarms"
    private const val KEY_PENDING = "pending"

    private val json = Json { ignoreUnknownKeys = true }
    private val serializer = ListSerializer(ReminderItem.serializer())

    /** Sunucudan gelen listeyi tek doğruluk kaynağı olarak alır. */
    fun sync(context: Context, items: List<ReminderItem>) {
        val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        read(prefs).forEach { cancel(context, it.id) }

        val pending = items.filter { !it.dueAt.isNullOrBlank() && it.doneAt.isNullOrBlank() }
        prefs.edit().putString(KEY_PENDING, json.encodeToString(serializer, pending)).apply()
        pending.forEach { schedule(context, it) }
    }

    /** Açılış, yeniden başlatma ve saat dilimi değişimlerinde alarmları geri kurar. */
    fun restore(context: Context) {
        val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        read(prefs)
            .filter { !it.dueAt.isNullOrBlank() && it.doneAt.isNullOrBlank() }
            .filter { dueMillis(it)?.let { due -> due > System.currentTimeMillis() } == true }
            .forEach { schedule(context, it) }
    }

    /** Çıkışta bütün alarmları ve yerel kayıtları temizler. */
    fun cancelAll(context: Context) {
        val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        read(prefs).forEach { cancel(context, it.id) }
        prefs.edit().clear().apply()
    }

    /** Bildirim gösterildikten sonra kaydı yerel listeden düşürür. */
    fun markDelivered(context: Context, entryId: String) {
        val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val remaining = read(prefs).filterNot { it.id == entryId }
        prefs.edit().putString(KEY_PENDING, json.encodeToString(serializer, remaining)).apply()
    }

    private fun read(prefs: android.content.SharedPreferences): List<ReminderItem> {
        val raw = prefs.getString(KEY_PENDING, null) ?: return emptyList()
        return runCatching { json.decodeFromString(serializer, raw) }.getOrDefault(emptyList())
    }

    private fun dueMillis(item: ReminderItem): Long? =
        item.dueAt?.let { runCatching { Instant.parse(it).toEpochMilli() }.getOrNull() }

    private fun schedule(context: Context, item: ReminderItem) {
        val due = dueMillis(item) ?: return
        if (due <= System.currentTimeMillis()) return

        val alarms = context.getSystemService(AlarmManager::class.java) ?: return
        val intent = Intent(context, ReminderReceiver::class.java).apply {
            putExtra(ReminderReceiver.EXTRA_ENTRY_ID, item.id)
            putExtra(ReminderReceiver.EXTRA_ASSET_ID, item.assetId)
            putExtra(ReminderReceiver.EXTRA_ASSET_TITLE, item.assetTitle)
            putExtra(ReminderReceiver.EXTRA_TITLE, item.title)
            putExtra(ReminderReceiver.EXTRA_BODY, item.body)
        }
        val pending = PendingIntent.getBroadcast(
            context,
            requestCode(item.id),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        try {
            if (canScheduleExact(alarms)) {
                alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, due, pending)
            } else {
                alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, due, pending)
            }
        } catch (_: SecurityException) {
            // Bazı üreticiler tam saat kısıtını çalışma anında uygular.
            runCatching { alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, due, pending) }
        }
    }

    private fun cancel(context: Context, entryId: String) {
        val alarms = context.getSystemService(AlarmManager::class.java) ?: return
        val intent = Intent(context, ReminderReceiver::class.java)
        val pending = PendingIntent.getBroadcast(
            context,
            requestCode(entryId),
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE,
        ) ?: return
        alarms.cancel(pending)
        pending.cancel()
    }

    private fun canScheduleExact(alarms: AlarmManager): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms()

    private fun requestCode(entryId: String): Int = entryId.hashCode()
}
