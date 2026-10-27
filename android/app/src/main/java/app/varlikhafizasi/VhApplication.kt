package app.varlikhafizasi

import android.app.Application
import android.content.Context
import app.varlikhafizasi.data.SessionStore
import app.varlikhafizasi.data.VhRepository

object AppGraph {
    lateinit var repository: VhRepository
        private set

    fun init(context: Context) {
        if (::repository.isInitialized) return
        val appContext = context.applicationContext
        repository = VhRepository(appContext, SessionStore(appContext))
    }
}

class VhApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        AppGraph.init(this)
    }
}
