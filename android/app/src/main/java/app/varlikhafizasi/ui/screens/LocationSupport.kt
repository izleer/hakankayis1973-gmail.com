package app.varlikhafizasi.ui.screens

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Geocoder
import android.location.Location
import android.location.LocationManager
import android.net.Uri
import android.os.CancellationSignal
import androidx.core.content.ContextCompat
import androidx.core.location.LocationManagerCompat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.util.Locale
import kotlin.coroutines.resume

data class PickedLocation(
    val latitude: Double,
    val longitude: Double,
    val name: String?,
)

val locationPermissions = arrayOf(
    Manifest.permission.ACCESS_FINE_LOCATION,
    Manifest.permission.ACCESS_COARSE_LOCATION,
)

fun hasLocationPermission(context: Context): Boolean =
    ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
        PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
        PackageManager.PERMISSION_GRANTED

/**
 * Cihazın anlık konumunu alır. Önce GPS, olmazsa ağ sağlayıcısı denenir.
 * Konum adı, cihazın yerleşik Geocoder'ı ile (API anahtarı gerekmeden) çözülür.
 */
suspend fun fetchCurrentLocation(context: Context): PickedLocation = withContext(Dispatchers.IO) {
    val manager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    if (!LocationManagerCompat.isLocationEnabled(manager)) {
        throw IllegalStateException("location-disabled")
    }
    val providers = buildList {
        if (manager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
            add(LocationManager.GPS_PROVIDER)
        }
        if (manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
            add(LocationManager.NETWORK_PROVIDER)
        }
    }
    if (providers.isEmpty()) throw IllegalStateException("no-provider")

    for (provider in providers) {
        val location = withTimeoutOrNull(LOCATION_TIMEOUT_MS) {
            awaitLocation(context, manager, provider)
        } ?: continue
        val name = reverseGeocode(context, location.latitude, location.longitude)
        return@withContext PickedLocation(
            latitude = location.latitude,
            longitude = location.longitude,
            name = name,
        )
    }
    throw IllegalStateException("location-unavailable")
}

private suspend fun awaitLocation(
    context: Context,
    manager: LocationManager,
    provider: String,
): Location? = suspendCancellableCoroutine { continuation ->
    val signal = CancellationSignal()
    continuation.invokeOnCancellation { signal.cancel() }
    try {
        LocationManagerCompat.getCurrentLocation(
            manager,
            provider,
            signal,
            ContextCompat.getMainExecutor(context),
        ) { location ->
            if (continuation.isActive) continuation.resume(location)
        }
    } catch (_: Exception) {
        if (continuation.isActive) continuation.resume(null)
    }
}

/**
 * Verilen koordinatları cihazın yerleşik Geocoder'ı ile okunabilir bir adrese
 * çevirir. API anahtarı gerektirmez; sonuç bulunamazsa null döner.
 */
suspend fun reverseGeocodeLocation(
    context: Context,
    latitude: Double,
    longitude: Double,
): String? = withContext(Dispatchers.IO) { reverseGeocode(context, latitude, longitude) }

private fun reverseGeocode(context: Context, latitude: Double, longitude: Double): String? {
    if (!Geocoder.isPresent()) return null
    return runCatching {
        @Suppress("DEPRECATION")
        val address = Geocoder(context, Locale.getDefault())
            .getFromLocation(latitude, longitude, 1)
            ?.firstOrNull()
            ?: return@runCatching null
        listOfNotNull(
            address.thoroughfare ?: address.featureName,
            address.subLocality,
            address.locality ?: address.subAdminArea ?: address.adminArea,
        )
            .distinct()
            .joinToString(", ")
            .take(160)
            .takeIf { it.isNotBlank() }
    }.getOrNull()
}

/**
 * Koordinatları harita uygulamasında açar. Harita uygulaması yoksa web tarayıcısında
 * Google Maps bağlantısına düşer.
 */
fun openInMaps(context: Context, latitude: Double, longitude: Double, label: String?) {
    val place = Uri.encode(label?.takeIf { it.isNotBlank() } ?: "izleer")
    val geo = Uri.parse("geo:$latitude,$longitude?q=$latitude,$longitude($place)")
    val geoIntent = Intent(Intent.ACTION_VIEW, geo).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    val fallback = Intent(
        Intent.ACTION_VIEW,
        Uri.parse("https://www.google.com/maps/search/?api=1&query=$latitude,$longitude"),
    ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    if (runCatching { context.startActivity(geoIntent) }.isSuccess) return
    runCatching { context.startActivity(fallback) }
}

fun formatCoordinates(latitude: Double, longitude: Double): String =
    String.format(Locale.getDefault(), "%.5f, %.5f", latitude, longitude)

private const val LOCATION_TIMEOUT_MS = 12_000L
