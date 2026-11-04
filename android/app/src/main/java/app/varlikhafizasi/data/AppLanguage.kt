package app.varlikhafizasi.data

import android.app.LocaleManager
import android.content.Context
import android.content.res.Configuration
import android.os.Build
import android.os.LocaleList
import java.util.Locale

/**
 * Uygulama dili yönetimi.
 *
 * Öncelik sırası:
 * 1. Android 13+ sistem dil ayarı (per-app language)
 * 2. Uygulama içinde seçilen dil (yerel tercih)
 * 3. Cihaz dili (destekleniyorsa)
 * 4. Türkçe
 */
object AppLanguage {
    val supportedTags = listOf("tr", "en", "de", "fr", "es")

    /** Tam etiketler: Intl/Accept-Language ve tarih biçimlendirme için. */
    val fullTags = mapOf(
        "tr" to "tr-TR",
        "en" to "en-US",
        "de" to "de-DE",
        "fr" to "fr-FR",
        "es" to "es-ES",
    )

    /** Dil seçicide gösterilen adlar (her zaman kendi dilinde). */
    val nativeNames = mapOf(
        "tr" to "Türkçe",
        "en" to "English",
        "de" to "Deutsch",
        "fr" to "Français",
        "es" to "Español",
    )

    private const val PREFS = "vh_prefs"
    private const val KEY = "locale"

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun normalize(tag: String?): String? {
        val base = tag?.trim()?.lowercase()?.substringBefore('-')?.substringBefore('_')
        return base?.takeIf { it in supportedTags }
    }

    private fun frameworkTag(context: Context): String? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return null
        val manager = context.getSystemService(LocaleManager::class.java) ?: return null
        val first = manager.applicationLocales.takeIf { !it.isEmpty }?.get(0) ?: return null
        return normalize(first.language)
    }

    private fun systemTag(context: Context): String? {
        val configuration = context.applicationContext.resources.configuration
        return normalize(configuration.locales.takeIf { it.size() > 0 }?.get(0)?.language)
    }

    fun currentTag(context: Context): String =
        frameworkTag(context)
            ?: normalize(prefs(context).getString(KEY, null))
            ?: systemTag(context)
            ?: "tr"

    fun currentLocale(context: Context): Locale =
        Locale.forLanguageTag(fullTags[currentTag(context)] ?: "tr-TR")

    /** API isteklerinde gönderilecek Accept-Language değeri. */
    fun acceptLanguage(context: Context): String =
        fullTags[currentTag(context)] ?: "tr-TR"

    /** Kullanıcı seçimini hem yerel tercihe hem sistem per-app diline yazar. */
    fun set(context: Context, tag: String) {
        val normalized = normalize(tag) ?: return
        prefs(context).edit().putString(KEY, normalized).apply()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val manager = context.getSystemService(LocaleManager::class.java)
            manager?.applicationLocales =
                LocaleList.forLanguageTags(fullTags[normalized] ?: normalized)
        }
    }

    /** Activity taban context'ini seçili dile göre sarar. */
    fun wrap(base: Context): Context {
        val locale = currentLocale(base)
        Locale.setDefault(locale)
        val configuration = Configuration(base.resources.configuration)
        configuration.setLocale(locale)
        configuration.setLocales(LocaleList(locale))
        return base.createConfigurationContext(configuration)
    }

    private var cachedContext: Pair<String, Context>? = null

    /** Seçili dile göre sarılmış uygulama context'i (ViewModel/hata mesajları için). */
    fun localized(context: Context): Context {
        val tag = currentTag(context)
        cachedContext?.let { (cachedTag, cached) -> if (cachedTag == tag) return cached }
        return wrap(context.applicationContext).also { cachedContext = tag to it }
    }

    /** Seçili dilde metin kaynağı okur. */
    fun string(context: Context, id: Int, vararg args: Any): String =
        localized(context).getString(id, *args)
}
