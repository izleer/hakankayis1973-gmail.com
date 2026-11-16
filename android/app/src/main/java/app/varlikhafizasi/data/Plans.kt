package app.varlikhafizasi.data

/**
 * Bulut planlarının istemci tarafındaki karşılığı.
 * Sunucu gerçek yetkiyi uygular; buradaki değerler yalnızca arayüzü önceden
 * uyarmak ve sınırları göstermek için kullanılır.
 */
object Plans {
    const val FREE = "free"
    const val PREMIUM = "premium"

    const val FREE_MAX_ASSETS = 5
    const val FREE_MAX_ENTRIES = 10
    const val FREE_MAX_MEDIA = 1
    const val PREMIUM_MAX_MEDIA = 10

    fun normalize(plan: String?): String = if (plan == PREMIUM) PREMIUM else FREE

    fun isPremium(plan: String?): Boolean = plan == PREMIUM

    fun maxAssets(plan: String?): Int? = if (isPremium(plan)) null else FREE_MAX_ASSETS

    fun maxEntries(plan: String?): Int? = if (isPremium(plan)) null else FREE_MAX_ENTRIES

    fun maxMedia(plan: String?): Int = if (isPremium(plan)) PREMIUM_MAX_MEDIA else FREE_MAX_MEDIA

    fun assetLimitReached(plan: String?, used: Int): Boolean {
        val max = maxAssets(plan) ?: return false
        return used >= max
    }

    fun entryLimitReached(plan: String?, used: Int): Boolean {
        val max = maxEntries(plan) ?: return false
        return used >= max
    }
}
