package app.varlikhafizasi.reminders

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import app.varlikhafizasi.MainActivity
import app.varlikhafizasi.R
import app.varlikhafizasi.data.AppLanguage

/** Hatırlatma alarmının bildirim kanalını ve bildirimini üretir. */
object ReminderNotifier {
    const val CHANNEL_ID = "vh_reminders"
    const val EXTRA_ASSET_ID = "app.varlikhafizasi.extra.ASSET_ID"

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return

        val channel = NotificationChannel(
            CHANNEL_ID,
            AppLanguage.string(context, R.string.reminder_channel_name),
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = AppLanguage.string(context, R.string.reminder_channel_description)
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 400, 200, 400)
            setSound(
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build(),
            )
            lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
        }
        manager.createNotificationChannel(channel)
    }

    fun show(
        context: Context,
        entryId: String,
        assetId: String,
        assetTitle: String?,
        title: String?,
        body: String?,
    ) {
        val app = context.applicationContext
        ensureChannel(app)

        val asset = assetTitle?.trim()?.takeIf { it.isNotEmpty() }
            ?: AppLanguage.string(app, R.string.common_asset)
        val detail = title?.trim()?.takeIf { it.isNotEmpty() }
            ?: body?.trim()
                ?.replace(Regex("\\s+"), " ")
                ?.take(120)
                ?.takeIf { it.isNotEmpty() }
        val message = if (detail != null) {
            AppLanguage.string(app, R.string.reminder_notification_message, asset, detail)
        } else {
            AppLanguage.string(app, R.string.reminder_notification_fallback, asset)
        }

        val contentIntent = Intent(app, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(EXTRA_ASSET_ID, assetId)
        }
        val pending = PendingIntent.getActivity(
            app,
            entryId.hashCode(),
            contentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(app, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(asset)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setContentIntent(pending)
            .build()

        runCatching {
            NotificationManagerCompat.from(app).notify(entryId.hashCode(), notification)
        }
    }
}
