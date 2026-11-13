package app.varlikhafizasi.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** AlarmManager tarafından zamanı gelince çalışır ve bildirimi gösterir. */
class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val entryId = intent.getStringExtra(EXTRA_ENTRY_ID) ?: return
        val assetId = intent.getStringExtra(EXTRA_ASSET_ID) ?: return
        val assetTitle = intent.getStringExtra(EXTRA_ASSET_TITLE)
        val title = intent.getStringExtra(EXTRA_TITLE)
        val body = intent.getStringExtra(EXTRA_BODY)
        ReminderNotifier.show(
            context = context,
            entryId = entryId,
            assetId = assetId,
            assetTitle = assetTitle,
            title = title,
            body = body,
        )
        // Uygulama açıksa ekran uyarısı da gösterilir; kapalıysa yalnızca
        // bildirim kalır ve uyarı uygulama açıldığında yakalanır.
        val inApp = Intent(ACTION_DUE).apply {
            setPackage(context.packageName)
            putExtra(EXTRA_ENTRY_ID, entryId)
            putExtra(EXTRA_ASSET_ID, assetId)
            putExtra(EXTRA_ASSET_TITLE, assetTitle)
            putExtra(EXTRA_TITLE, title)
            putExtra(EXTRA_BODY, body)
        }
        context.sendBroadcast(inApp)
        ReminderScheduler.markDelivered(context, entryId)
    }

    companion object {
        const val ACTION_DUE = "app.varlikhafizasi.reminders.ACTION_DUE"
        const val EXTRA_ENTRY_ID = "reminder_entry_id"
        const val EXTRA_ASSET_ID = "reminder_asset_id"
        const val EXTRA_ASSET_TITLE = "reminder_asset_title"
        const val EXTRA_TITLE = "reminder_title"
        const val EXTRA_BODY = "reminder_body"
    }
}
