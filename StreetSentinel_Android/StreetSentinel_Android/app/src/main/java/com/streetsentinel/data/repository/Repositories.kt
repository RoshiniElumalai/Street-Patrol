package com.streetsentinel.data.repository

import android.content.Context
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.streetsentinel.data.local.AppDatabase
import com.streetsentinel.data.models.Alert
import com.streetsentinel.data.models.Contact
import com.streetsentinel.data.models.LocationSnapshot
import com.streetsentinel.data.models.SafeWalkSession
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.tasks.await
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

// ==================== Alert Repository ====================

@Singleton
class AlertRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val database: AppDatabase,
    private val firestore: FirebaseFirestore
) {

    private val alertDao = database.alertDao()

    suspend fun saveAlert(alert: Alert) {
        try {
            alertDao.insertAlert(alert)
            // Also save to Firebase
            firestore.collection("alerts")
                .document(alert.alertId)
                .set(alert)
                .await()
            Timber.d("AlertRepository: Alert saved - ${alert.alertId}")
        } catch (e: Exception) {
            Timber.e(e, "AlertRepository: Error saving alert")
            throw e
        }
    }

    suspend fun getAlertById(alertId: String): Alert? {
        return try {
            alertDao.getAlertById(alertId)
        } catch (e: Exception) {
            Timber.e(e, "AlertRepository: Error getting alert by ID")
            null
        }
    }

    fun getAlerts(userId: String): Flow<List<Alert>> {
        return alertDao.getAlertsByUser(userId)
    }

    suspend fun getRecentAlerts(userId: String): List<Alert> {
        return try {
            alertDao.getRecentAlerts(userId)
        } catch (e: Exception) {
            Timber.e(e, "AlertRepository: Error getting recent alerts")
            emptyList()
        }
    }

    suspend fun updateAlertStatus(alertId: String, status: String) {
        try {
            val alert = alertDao.getAlertById(alertId) ?: return
            alertDao.updateAlert(alert.copy(status = status))
            firestore.collection("alerts").document(alertId)
                .update("status", status)
                .await()
            Timber.d("AlertRepository: Alert status updated - $status")
        } catch (e: Exception) {
            Timber.e(e, "AlertRepository: Error updating alert status")
        }
    }

    suspend fun addContactNotification(
        alertId: String,
        contactId: String,
        method: String,
        timestamp: Long
    ) {
        try {
            firestore.collection("alerts").document(alertId)
                .collection("notifications")
                .document(contactId)
                .set(mapOf(
                    "contactId" to contactId,
                    "method" to method,
                    "timestamp" to timestamp
                ))
                .await()
            Timber.d("AlertRepository: Contact notification recorded")
        } catch (e: Exception) {
            Timber.e(e, "AlertRepository: Error recording contact notification")
        }
    }

    suspend fun getAlertCount(userId: String): Int {
        return try {
            alertDao.getAlertCount(userId)
        } catch (e: Exception) {
            Timber.e(e, "AlertRepository: Error getting alert count")
            0
        }
    }

    suspend fun clearAlerts(userId: String) {
        try {
            val alerts = alertDao.getAlertsByUser(userId)
            alerts.collect { list ->
                list.forEach { alertDao.deleteAlert(it) }
            }
        } catch (e: Exception) {
            Timber.e(e, "AlertRepository: Error clearing alerts")
        }
    }
}

// ==================== Location Repository ====================

@Singleton
class LocationRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val database: AppDatabase,
    private val firestore: FirebaseFirestore
) {

    private val locationDao = database.locationDao()
    private val safeWalkDao = database.safeWalkDao()

    suspend fun saveLocationSnapshot(location: LocationSnapshot) {
        try {
            locationDao.insertLocation(location)
            // Save to Firebase
            firestore.collection("locations")
                .document(location.id.toString())
                .set(location)
                .await()
            locationDao.markLocationSynced(location.id)
        } catch (e: Exception) {
            Timber.e(e, "LocationRepository: Error saving location")
        }
    }

    suspend fun createSafeWalkSession(session: SafeWalkSession) {
        try {
            safeWalkDao.insertSession(session)
            firestore.collection("safewalk_sessions")
                .document(session.sessionId)
                .set(session)
                .await()
            Timber.d("LocationRepository: SafeWalk session created")
        } catch (e: Exception) {
            Timber.e(e, "LocationRepository: Error creating SafeWalk session")
            throw e
        }
    }

    suspend fun updateSafeWalkSession(session: SafeWalkSession) {
        try {
            safeWalkDao.updateSession(session)
            firestore.collection("safewalk_sessions")
                .document(session.sessionId)
                .set(session)
                .await()
        } catch (e: Exception) {
            Timber.e(e, "LocationRepository: Error updating SafeWalk session")
        }
    }

    suspend fun markSafeWalkAsCompleted(sessionId: String) {
        try {
            safeWalkDao.updateSessionStatus(sessionId, "COMPLETED")
            firestore.collection("safewalk_sessions")
                .document(sessionId)
                .update("status", "COMPLETED")
                .await()
        } catch (e: Exception) {
            Timber.e(e, "LocationRepository: Error marking SafeWalk as completed")
        }
    }

    fun getLocationsByUser(userId: String): Flow<List<LocationSnapshot>> {
        return locationDao.getLocationsByUser(userId)
    }
}

// ==================== Contact Repository ====================

@Singleton
class ContactRepository @Inject constructor(
    private val firestore: FirebaseFirestore
) {

    suspend fun addContact(contact: Contact) {
        try {
            firestore.collection("contacts")
                .document(contact.contactId)
                .set(contact)
                .await()
            Timber.d("ContactRepository: Contact added - ${contact.name}")
        } catch (e: Exception) {
            Timber.e(e, "ContactRepository: Error adding contact")
            throw e
        }
    }

    suspend fun updateContact(contact: Contact) {
        try {
            firestore.collection("contacts")
                .document(contact.contactId)
                .set(contact)
                .await()
        } catch (e: Exception) {
            Timber.e(e, "ContactRepository: Error updating contact")
        }
    }

    suspend fun deleteContact(contact: Contact) {
        try {
            firestore.collection("contacts")
                .document(contact.contactId)
                .delete()
                .await()
        } catch (e: Exception) {
            Timber.e(e, "ContactRepository: Error deleting contact")
        }
    }

    fun getContacts(userId: String): Flow<List<Contact>> {
        return kotlinx.coroutines.flow.flow {
            try {
                val snapshot = firestore.collection("contacts")
                    .whereEqualTo("userId", userId)
                    .get()
                    .await()
                val contacts = snapshot.toObjects(Contact::class.java)
                emit(contacts)
            } catch (e: Exception) {
                Timber.e(e, "ContactRepository: Error getting contacts")
                emit(emptyList())
            }
        }
    }

    suspend fun getEmergencyContacts(): List<Contact> {
        return try {
            val snapshot = firestore.collection("contacts")
                .whereEqualTo("canReceiveAlerts", true)
                .get()
                .await()
            snapshot.toObjects(Contact::class.java)
        } catch (e: Exception) {
            Timber.e(e, "ContactRepository: Error getting emergency contacts")
            emptyList()
        }
    }
}

// ==================== User Repository ====================

@Singleton
class UserRepository @Inject constructor(
    private val firestore: FirebaseFirestore
) {

    suspend fun updateUserProfile(userId: String, data: Map<String, Any>) {
        try {
            firestore.collection("users")
                .document(userId)
                .update(data)
                .await()
            Timber.d("UserRepository: User profile updated")
        } catch (e: Exception) {
            Timber.e(e, "UserRepository: Error updating user profile")
        }
    }

    suspend fun getUserData(userId: String): Map<String, Any>? {
        return try {
            val doc = firestore.collection("users")
                .document(userId)
                .get()
                .await()
            doc.data
        } catch (e: Exception) {
            Timber.e(e, "UserRepository: Error getting user data")
            null
        }
    }
}
