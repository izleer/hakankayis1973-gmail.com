package app.varlikhafizasi.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** AlarmManager tarafından zamanı gelince çalışır ve bildirimi gösterir. */
class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val entryId = intent.getStringExtra(EXTRA_ENTRY_ID) ?: return
        val assetId = intent.getStringExtra(EXTRA_ASSET_ID) ?: return
        ReminderNotifier.show(
            context = context,
            entryId = entryId,
            assetId = assetId,
            assetTitle = intent.getStringExtra(EXTRA_ASSET_TITLE),
            title = intent.getStringExtra(EXTRA_TITLE),
            body = intent.getStringExtra(EXTRA_BODY),
        )
        ReminderScheduler.markDelivered(context, entryId)
    }

    companion object {
        const val EXTRA_ENTRY_ID = "reminder_entry_id"
        const val EXTRA_ASSET_ID = "reminder_asset_id"
        const val EXTRA_ASSET_TITLE = "reminder_asset_title"
        const val EXTRA_TITLE = "reminder_title"
        const val EXTRA_BODY = "reminder_body"
    }
}
