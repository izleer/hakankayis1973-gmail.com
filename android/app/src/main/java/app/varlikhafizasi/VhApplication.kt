package app.varlikhafizasi

import android.app.Application
import android.content.Context
import app.varlikhafizasi.data.SessionStore
import app.varlikhafizasi.data.VhRepository
import app.varlikhafizasi.data.local.LocalExporter
import app.varlikhafizasi.data.local.LocalStore
import app.varlikhafizasi.data.local.ModeStore
import app.varlikhafizasi.reminders.ReminderNotifier
import com.google.android.gms.ads.MobileAds

object AppGraph {
    lateinit var repository: VhRepository
        private set

    lateinit var localStore: LocalStore
        private set

    lateinit var modeStore: ModeStore
        private set

    lateinit var localExporter: LocalExporter
        private set

    fun init(context: Context) {
        if (::repository.isInitialized) return
        val appContext = context.applicationContext
        repository = VhRepository(appContext, SessionStore(appContext))
        localStore = LocalStore(appContext)
        modeStore = ModeStore(appContext)
        localExporter = LocalExporter(appContext, localStore)
    }
}

class VhApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        AppGraph.init(this)
        ReminderNotifier.ensureChannel(this)
        // Ücretsiz plan banner'ları için AdMob'u bir kez başlat.
        MobileAds.initialize(this)
    }
}
