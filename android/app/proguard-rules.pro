# Kotlinx serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class app.varlikhafizasi.data.** {
    *** Companion;
}
-keepclasseswithmembers class app.varlikhafizasi.data.** {
    kotlinx.serialization.KSerializer serializer(...);
}
