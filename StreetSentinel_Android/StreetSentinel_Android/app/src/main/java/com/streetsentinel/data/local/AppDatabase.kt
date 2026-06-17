package com.streetsentinel.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.streetsentinel.data.models.Alert
import com.streetsentinel.data.models.LocationSnapshot
import com.streetsentinel.data.models.SafeWalkSession
import com.streetsentinel.data.models.CheckIn
import com.streetsentinel.data.models.Evidence
import androidx.room.TypeConverter
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.streetsentinel.data.models.ThreatLevel

/**
 * Room Database for StreetSentinel
 * 
 * Stores local data for offline functionality:
 * - Alerts
 * - Location snapshots
 * - SafeWalk sessions
 * - Check-ins
 * - Evidence vault
 */
@Database(
    entities = [
        Alert::class,
        LocationSnapshot::class,
        SafeWalkSession::class,
        CheckIn::class,
        Evidence::class
    ],
    version = 1,
    exportSchema = true
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {

    abstract fun alertDao(): AlertDao
    abstract fun locationDao(): LocationDao
    abstract fun safeWalkDao(): SafeWalkDao
    abstract fun checkInDao(): CheckInDao
    abstract fun evidenceDao(): EvidenceDao

    companion object {
        private const val DATABASE_NAME = "streetsentinel.db"
        
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    DATABASE_NAME
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}

/**
 * Type converters for Room
 */
class Converters {
    
    @TypeConverter
    fun fromThreatLevel(value: ThreatLevel): String = value.name

    @TypeConverter
    fun toThreatLevel(value: String): ThreatLevel = ThreatLevel.valueOf(value)

    @TypeConverter
    fun fromListString(value: List<String>?): String = Gson().toJson(value)

    @TypeConverter
    fun toListString(value: String): List<String> {
        val listType = object : TypeToken<List<String>>() {}.type
        return Gson().fromJson(value, listType)
    }
}
