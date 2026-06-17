package com.streetsentinel.ui.contacts

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.textfield.TextInputEditText
import com.streetsentinel.R
import com.streetsentinel.data.models.Contact
import com.streetsentinel.databinding.FragmentContactsBinding
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class ContactsFragment : Fragment() {

    private var _binding: FragmentContactsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ContactsViewModel by viewModels()
    private lateinit var adapter: ContactsAdapter

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentContactsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupRecyclerView()
        setupUI()
        observeViewModel()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    private fun setupRecyclerView() {
        adapter = ContactsAdapter(
            onEdit = { contact -> showEditContactDialog(contact) },
            onDelete = { contact ->
                AlertDialog.Builder(requireContext())
                    .setTitle("Delete Contact")
                    .setMessage("Remove ${contact.name}?")
                    .setPositiveButton("Delete") { _, _ -> viewModel.deleteContact(contact) }
                    .setNegativeButton("Cancel", null)
                    .show()
            },
            onSetPrimary = { contact -> viewModel.setPrimaryContact(contact) }
        )
        binding.rvContacts.layoutManager = LinearLayoutManager(requireContext())
        binding.rvContacts.adapter = adapter
    }

    private fun setupUI() {
        binding.fabAddContact.setOnClickListener {
            showAddContactDialog()
        }
    }

    private fun observeViewModel() {
        viewModel.contacts.observe(viewLifecycleOwner) { contacts ->
            adapter.submitList(contacts)
            binding.tvEmptyContacts.visibility = if (contacts.isEmpty()) View.VISIBLE else View.GONE
        }

        viewModel.toastMessage.observe(viewLifecycleOwner) { msg ->
            Toast.makeText(requireContext(), msg, Toast.LENGTH_SHORT).show()
        }
    }

    private fun showAddContactDialog() {
        val dialogView = LayoutInflater.from(requireContext())
            .inflate(R.layout.dialog_add_contact, null)

        AlertDialog.Builder(requireContext())
            .setTitle("Add Emergency Contact")
            .setView(dialogView)
            .setPositiveButton("Add") { _, _ ->
                val name = dialogView.findViewById<TextInputEditText>(R.id.etContactName)
                    .text.toString().trim()
                val phone = dialogView.findViewById<TextInputEditText>(R.id.etContactPhone)
                    .text.toString().trim()
                val email = dialogView.findViewById<TextInputEditText>(R.id.etContactEmail)
                    .text.toString().trim()

                if (name.isNotEmpty() && phone.isNotEmpty()) {
                    viewModel.addContact(name, phone, email)
                } else {
                    Toast.makeText(requireContext(), "Name and phone required", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showEditContactDialog(contact: Contact) {
        val dialogView = LayoutInflater.from(requireContext())
            .inflate(R.layout.dialog_add_contact, null)

        dialogView.findViewById<TextInputEditText>(R.id.etContactName).setText(contact.name)
        dialogView.findViewById<TextInputEditText>(R.id.etContactPhone).setText(contact.phone)
        dialogView.findViewById<TextInputEditText>(R.id.etContactEmail).setText(contact.email)

        AlertDialog.Builder(requireContext())
            .setTitle("Edit Contact")
            .setView(dialogView)
            .setPositiveButton("Save") { _, _ ->
                val name = dialogView.findViewById<TextInputEditText>(R.id.etContactName)
                    .text.toString().trim()
                val phone = dialogView.findViewById<TextInputEditText>(R.id.etContactPhone)
                    .text.toString().trim()
                val email = dialogView.findViewById<TextInputEditText>(R.id.etContactEmail)
                    .text.toString().trim()

                if (name.isNotEmpty() && phone.isNotEmpty()) {
                    viewModel.updateContact(contact.copy(name = name, phone = phone, email = email))
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
}
