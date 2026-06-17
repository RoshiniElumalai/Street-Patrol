package com.streetsentinel.data.local

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.streetsentinel.data.models.Alert
import com.streetsentinel.data.models.LocationSnapshot
import com.streetsentinel.data.models.SafeWalkSession
import com.streetsentinel.data.models.CheckIn
import com.streetsentinel.data.models.Evidence
import kotlinx.coroutines.flow.Flow

// ==================== Alert DAO ====================

@Dao
interface AlertDao {
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAlert(alert: Alert)

    @Update
    suspend fun updateAlert(alert: Alert)

    @Delete
    suspend fun deleteAlert(alert: Alert)

    @Query("SELECT * FROM alerts WHERE alertId = :alertId")
    suspend fun getAlertById(alertId: String): Alert?

    @Query("SELECT * FROM alerts WHERE userId = :userId ORDER BY timestamp DESC")
    fun getAlertsByUser(userId: String): Flow<List<Alert>>

    @Query("SELECT * FROM alerts WHERE userId = :userId AND status = :status")
    suspend fun getAlertsByStatus(userId: String, status: String): List<Alert>

    @Query("SELECT * FROM alerts WHERE userId = :userId ORDER BY timestamp DESC LIMIT 10")
    suspend fun getRecentAlerts(userId: String): List<Alert>

    @Query("DELETE FROM alerts WHERE timestamp < :olderThan")
    suspend fun deleteOldAlerts(olderThan: Long)

    @Query("SELECT COUNT(*) FROM alerts WHERE userId = :userId")
    suspend fun getAlertCount(userId: String): Int
}

// ==================== Location DAO ====================

@Dao
interface LocationDao {
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLocation(location: LocationSnapshot)

    @Update
    suspend fun updateLocation(location: LocationSnapshot)

    @Delete
    suspend fun deleteLocation(location: LocationSnapshot)

    @Query("SELECT * FROM location_snapshots WHERE id = :id")
    suspend fun getLocationById(id: Int): LocationSnapshot?

    @Query("SELECT * FROM location_snapshots WHERE userId = :userId ORDER BY timestamp DESC")
    fun getLocationsByUser(userId: String): Flow<List<LocationSnapshot>>

    @Query("SELECT * FROM location_snapshots WHERE userId = :userId ORDER BY timestamp DESC LIMIT 1")
    suspend fun getLastLocation(userId: String): LocationSnapshot?

    @Query("SELECT * FROM location_snapshots WHERE userId = :userId AND timestamp BETWEEN :startTime AND :endTime")
    suspend fun getLocationsBetween(userId: String, startTime: Long, endTime: Long): List<LocationSnapshot>

    @Query("SELECT * FROM location_snapshots WHERE syncedToFirebase = 0")
    suspend fun getUnsyncedLocations(): List<LocationSnapshot>

    @Query("UPDATE location_snapshots SET syncedToFirebase = 1 WHERE id = :id")
    suspend fun markLocationSynced(id: Int)

    @Query("DELETE FROM location_snapshots WHERE timestamp < :olderThan")
    suspend fun deleteOldLocations(olderThan: Long)
}

// ==================== SafeWalk DAO ====================

@Dao
interface SafeWalkDao {
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSession(session: SafeWalkSession)

    @Update
    suspend fun updateSession(session: SafeWalkSession)

    @Delete
    suspend fun deleteSession(session: SafeWalkSession)

    @Query("SELECT * FROM safewalk_sessions WHERE sessionId = :sessionId")
    suspend fun getSessionById(sessionId: String): SafeWalkSession?

    @Query("SELECT * FROM safewalk_sessions WHERE userId = :userId ORDER BY startTime DESC")
    fun getSessionsByUser(userId: String): Flow<List<SafeWalkSession>>

    @Query("SELECT * FROM safewalk_sessions WHERE userId = :userId AND status = :status")
    suspend fun getSessionsByStatus(userId: String, status: String): List<SafeWalkSession>

    @Query("SELECT * FROM safewalk_sessions WHERE userId = :userId AND status = 'ACTIVE'")
    suspend fun getActiveSessions(userId: String): List<SafeWalkSession>

    @Query("SELECT * FROM safewalk_sessions WHERE userId = :userId ORDER BY startTime DESC LIMIT 1")
    suspend fun getLastSession(userId: String): SafeWalkSession?

    @Query("UPDATE safewalk_sessions SET checkInDone = 1 WHERE sessionId = :sessionId")
    suspend fun markCheckInDone(sessionId: String)

    @Query("UPDATE safewalk_sessions SET status = :status WHERE sessionId = :sessionId")
    suspend fun updateSessionStatus(sessionId: String, status: String)

    @Query("DELETE FROM safewalk_sessions WHERE startTime < :olderThan")
    suspend fun deleteOldSessions(olderThan: Long)

    @Query("SELECT COUNT(*) FROM safewalk_sessions WHERE userId = :userId AND status = 'COMPLETED'")
    suspend fun getCompletedSessionCount(userId: String): Int
}

// ==================== Check-In DAO ====================

@Dao
interface CheckInDao {
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCheckIn(checkIn: CheckIn)

    @Update
    suspend fun updateCheckIn(checkIn: CheckIn)

    @Delete
    suspend fun deleteCheckIn(checkIn: CheckIn)

    @Query("SELECT * FROM checkins WHERE checkInId = :checkInId")
    suspend fun getCheckInById(checkInId: String): CheckIn?

    @Query("SELECT * FROM checkins WHERE userId = :userId ORDER BY timestamp DESC")
    fun getCheckInsByUser(userId: String): Flow<List<CheckIn>>

    @Query("SELECT * FROM checkins WHERE sessionId = :sessionId")
    suspend fun getCheckInsBySession(sessionId: String): List<CheckIn>

    @Query("SELECT * FROM checkins WHERE userId = :userId ORDER BY timestamp DESC LIMIT 10")
    suspend fun getRecentCheckIns(userId: String): List<CheckIn>

    @Query("SELECT COUNT(*) FROM checkins WHERE userId = :userId AND confirmedSafe = 1")
    suspend fun getConfirmedCheckInCount(userId: String): Int

    @Query("DELETE FROM checkins WHERE timestamp < :olderThan")
    suspend fun deleteOldCheckIns(olderThan: Long)
}

// ==================== Evidence DAO ====================

@Dao
interface EvidenceDao {
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEvidence(evidence: Evidence)

    @Update
    suspend fun updateEvidence(evidence: Evidence)

    @Delete
    suspend fun deleteEvidence(evidence: Evidence)

    @Query("SELECT * FROM evidence_vault WHERE evidenceId = :evidenceId")
    suspend fun getEvidenceById(evidenceId: String): Evidence?

    @Query("SELECT * FROM evidence_vault WHERE userId = :userId ORDER BY timestamp DESC")
    fun getEvidenceByUser(userId: String): Flow<List<Evidence>>

    @Query("SELECT * FROM evidence_vault WHERE alertId = :alertId")
    suspend fun getEvidenceByAlert(alertId: String): List<Evidence>

    @Query("SELECT * FROM evidence_vault WHERE type = :type AND userId = :userId")
    suspend fun getEvidenceByType(userId: String, type: String): List<Evidence>

    @Query("SELECT * FROM evidence_vault WHERE syncedToFirebase = 0")
    suspend fun getUnsyncedEvidence(): List<Evidence>

    @Query("UPDATE evidence_vault SET syncedToFirebase = 1 WHERE evidenceId = :evidenceId")
    suspend fun markEvidenceSynced(evidenceId: String)

    @Query("DELETE FROM evidence_vault WHERE timestamp < :olderThan")
    suspend fun deleteOldEvidence(olderThan: Long)

    @Query("SELECT SUM(fileSize) FROM evidence_vault WHERE userId = :userId")
    suspend fun getTotalEvidenceSize(userId: String): Long

    @Query("SELECT COUNT(*) FROM evidence_vault WHERE userId = :userId")
    suspend fun getEvidenceCount(userId: String): Int
}
