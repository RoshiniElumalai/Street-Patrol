package com.streetsentinel.ui.contacts

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import android.view.LayoutInflater
import android.view.ViewGroup
import com.streetsentinel.data.models.Contact
import com.streetsentinel.data.repository.ContactRepository
import com.streetsentinel.databinding.ItemContactBinding
import com.streetsentinel.utils.PreferencesManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.UUID
import javax.inject.Inject

// ==================== ViewModel ====================

@HiltViewModel
class ContactsViewModel @Inject constructor(
    private val contactRepository: ContactRepository,
    private val preferencesManager: PreferencesManager
) : ViewModel() {

    private val _contacts = MutableLiveData<List<Contact>>(emptyList())
    val contacts: LiveData<List<Contact>> = _contacts

    private val _toastMessage = MutableLiveData<String>()
    val toastMessage: LiveData<String> = _toastMessage

    init {
        loadContacts()
    }

    private fun loadContacts() {
        viewModelScope.launch {
            try {
                contactRepository.getContacts(preferencesManager.getUserId())
                    .collect { contacts ->
                        _contacts.postValue(contacts)
                    }
            } catch (e: Exception) {
                Timber.e(e, "ContactsViewModel: Error loading contacts")
            }
        }
    }

    fun addContact(name: String, phone: String, email: String) {
        viewModelScope.launch {
            try {
                val contact = Contact(
                    contactId = UUID.randomUUID().toString(),
                    userId = preferencesManager.getUserId(),
                    name = name,
                    phone = phone,
                    email = email,
                    isPrimary = _contacts.value.isNullOrEmpty(), // first contact is primary
                    canReceiveAlerts = true
                )
                contactRepository.addContact(contact)
                _toastMessage.postValue("${name} added as emergency contact")
                Timber.d("ContactsViewModel: Contact added: $name")
            } catch (e: Exception) {
                Timber.e(e, "ContactsViewModel: Error adding contact")
                _toastMessage.postValue("Failed to add contact")
            }
        }
    }

    fun updateContact(contact: Contact) {
        viewModelScope.launch {
            try {
                contactRepository.updateContact(contact)
                _toastMessage.postValue("Contact updated")
            } catch (e: Exception) {
                Timber.e(e, "ContactsViewModel: Error updating contact")
                _toastMessage.postValue("Failed to update contact")
            }
        }
    }

    fun deleteContact(contact: Contact) {
        viewModelScope.launch {
            try {
                contactRepository.deleteContact(contact)
                _toastMessage.postValue("${contact.name} removed")
            } catch (e: Exception) {
                Timber.e(e, "ContactsViewModel: Error deleting contact")
            }
        }
    }

    fun setPrimaryContact(contact: Contact) {
        viewModelScope.launch {
            try {
                // Clear existing primary
                _contacts.value?.forEach { c ->
                    if (c.isPrimary && c.contactId != contact.contactId) {
                        contactRepository.updateContact(c.copy(isPrimary = false))
                    }
                }
                // Set new primary
                contactRepository.updateContact(contact.copy(isPrimary = true))
                _toastMessage.postValue("${contact.name} set as primary contact")
            } catch (e: Exception) {
                Timber.e(e, "ContactsViewModel: Error setting primary contact")
            }
        }
    }
}

// ==================== Adapter ====================

class ContactsAdapter(
    private val onEdit: (Contact) -> Unit,
    private val onDelete: (Contact) -> Unit,
    private val onSetPrimary: (Contact) -> Unit
) : ListAdapter<Contact, ContactsAdapter.ContactViewHolder>(ContactDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ContactViewHolder {
        val binding = ItemContactBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return ContactViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ContactViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class ContactViewHolder(private val binding: ItemContactBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(contact: Contact) {
            with(binding) {
                tvContactName.text = contact.name
                tvContactPhone.text = contact.phone
                tvContactEmail.text = contact.email.ifEmpty { "No email" }

                if (contact.isPrimary) {
                    tvPrimaryBadge.visibility = android.view.View.VISIBLE
                } else {
                    tvPrimaryBadge.visibility = android.view.View.GONE
                }

                if (contact.isGuardian) {
                    tvGuardianBadge.visibility = android.view.View.VISIBLE
                } else {
                    tvGuardianBadge.visibility = android.view.View.GONE
                }

                btnEdit.setOnClickListener { onEdit(contact) }
                btnDelete.setOnClickListener { onDelete(contact) }
                btnSetPrimary.setOnClickListener { onSetPrimary(contact) }
            }
        }
    }

    class ContactDiffCallback : DiffUtil.ItemCallback<Contact>() {
        override fun areItemsTheSame(oldItem: Contact, newItem: Contact) =
            oldItem.contactId == newItem.contactId
        override fun areContentsTheSame(oldItem: Contact, newItem: Contact) =
            oldItem == newItem
    }
}
