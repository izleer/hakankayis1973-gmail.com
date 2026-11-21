package app.varlikhafizasi.data

/**
 * Bulut planlarının istemci tarafındaki karşılığı.
 * Sunucu gerçek yetkiyi uygular; buradaki değerler yalnızca arayüzü önceden
 * uyarmak ve sınırları göstermek için kullanılır.
 */
object Plans {
    const val FREE = "free"
    const val PREMIUM = "premium"
    const val PLUS = "plus"

    const val FREE_MAX_ASSETS = 5
    const val FREE_MAX_ENTRIES = 10
    const val FREE_MAX_MEDIA = 1

    const val PREMIUM_MAX_ASSETS = 50
    const val PREMIUM_MAX_ENTRIES = 100
    const val PREMIUM_MAX_MEDIA = 10

    const val PLUS_MAX_ASSETS = 250
    const val PLUS_MAX_ENTRIES = 500
    const val PLUS_MAX_MEDIA = 25

    fun normalize(plan: String?): String = when (plan) {
        PLUS -> PLUS
        PREMIUM -> PREMIUM
        else -> FREE
    }

    /** Ücretli plan (Premium veya Plus). */
    fun isPremium(plan: String?): Boolean = normalize(plan) != FREE

    fun isPlus(plan: String?): Boolean = normalize(plan) == PLUS

    fun maxAssets(plan: String?): Int? = when (normalize(plan)) {
        PLUS -> PLUS_MAX_ASSETS
        PREMIUM -> PREMIUM_MAX_ASSETS
        else -> FREE_MAX_ASSETS
    }

    fun maxEntries(plan: String?): Int? = when (normalize(plan)) {
        PLUS -> PLUS_MAX_ENTRIES
        PREMIUM -> PREMIUM_MAX_ENTRIES
        else -> FREE_MAX_ENTRIES
    }

    fun maxMedia(plan: String?): Int = when (normalize(plan)) {
        PLUS -> PLUS_MAX_MEDIA
        PREMIUM -> PREMIUM_MAX_MEDIA
        else -> FREE_MAX_MEDIA
    }

    fun assetLimitReached(plan: String?, used: Int): Boolean {
        val max = maxAssets(plan) ?: return false
        return used >= max
    }

    fun entryLimitReached(plan: String?, used: Int): Boolean {
        val max = maxEntries(plan) ?: return false
        return used >= max
    }
}
