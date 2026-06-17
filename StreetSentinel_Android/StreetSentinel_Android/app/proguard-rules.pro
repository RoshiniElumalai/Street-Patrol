# ProGuard rules for StreetSentinel

# Keep all classes in com.streetsentinel package
-keep class com.streetsentinel.** { *; }
-keep interface com.streetsentinel.** { *; }

# Keep data classes
-keep class com.streetsentinel.data.models.** { *; }

# Keep Kotlin data classes and sealed classes
-keepclassmembers class com.streetsentinel.data.models.** {
    *;
}

# Keep enum classes
-keepclassmembers enum com.streetsentinel.data.models.** {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Firebase
-keep class com.google.firebase.** { *; }
-keep interface com.google.firebase.** { *; }
-keepclassmembers class com.google.firebase.** {
    *;
}

# Google Play Services
-keep class com.google.android.gms.** { *; }
-keep interface com.google.android.gms.** { *; }

# Room Database
-keep class androidx.room.** { *; }
-keep interface androidx.room.** { *; }
-keepclassmembers @androidx.room.Entity class ** {
    *;
}

# Retrofit
-keep class retrofit2.** { *; }
-keep interface retrofit2.** { *; }
-keepattributes Exceptions
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses

# OkHttp
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Gson
-keep class com.google.gson.** { *; }
-keep interface com.google.gson.** { *; }
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer
-keepattributes *Annotation*

# Timber
-keep class timber.log.** { *; }

# Hilt/Dagger
-keep class dagger.hilt.** { *; }
-keep interface dagger.hilt.** { *; }
-keepclassmembers class ** {
    @javax.inject.* *;
    @dagger.hilt.* *;
}

# ViewModel
-keep class androidx.lifecycle.** { *; }

# Coroutines
-keep class kotlin.coroutines.** { *; }

# TensorFlow Lite
-keep class org.tensorflow.lite.** { *; }

# Serialization
-keep class kotlin.serialization.** { *; }
-keep class kotlinx.serialization.** { *; }

# Custom application classes
-keepclasseswithmembernames class * {
    native <methods>;
}

# Application classes that use reflection
-keep public class com.streetsentinel.StreetSentinelApp
-keep public class com.streetsentinel.ui.MainActivity
-keep public class com.streetsentinel.ui.auth.** { *; }
-keep public class com.streetsentinel.ui.emergency.** { *; }
-keep public class com.streetsentinel.services.** { *; }
-keep public class com.streetsentinel.receivers.** { *; }

# Annotations
-keepattributes *Annotation*,EnclosingMethod,Signature,InnerClasses
-renamesourcefileattribute SourceFile
-keepattributes SourceFile,LineNumberTable

# Remove logging in release builds
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}

# Timber debug logging
-assumenosideeffects class timber.log.Timber {
    public static *** d(...);
    public static *** v(...);
}

# Optimization
-optimizationpasses 5
-dontusemixedcaseclassnames
-verbose

# Exceptions
-keepattributes Exceptions
-keepattributes *Annotation*

# Methods
-keepclasseswithmembers class * {
    public <init>(...);
}
