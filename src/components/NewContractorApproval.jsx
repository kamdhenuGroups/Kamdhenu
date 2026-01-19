import React, { useState, useEffect, useMemo } from 'react';
import {
    LayoutDashboard,
    Users,
    CheckCircle,
    XCircle,
    X,
    Loader2,
    Save,
    RefreshCw,
    Eye
} from 'lucide-react';
import { newContractorApprovalService } from '../services/newContractorApprovalService';
import { addContractorService } from '../services/addContractorService';
import { idGenerator, CUSTOMER_TYPES } from '../services/orderService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { INDIAN_LOCATIONS } from '../data/indianLocations';

// Simple reused Input/Select components for the modal
const ModalInput = ({ label, value, onChange, placeholder, required, readOnly, type = "text", error }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            readOnly={readOnly}
            placeholder={placeholder}
            className={`px-3 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 ${readOnly ? 'opacity-70 cursor-not-allowed bg-slate-100' : error ? 'border-red-500' : 'border-slate-200'}`}
        />
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
);

const ModalSelect = ({ label, value, onChange, options, required, disabled, showDefaultOption = true }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            <select
                value={value}
                onChange={onChange}
                disabled={disabled}
                className={`w-full appearance-none px-3 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed ${disabled ? 'bg-slate-100' : 'border-slate-200 cursor-pointer'}`}
            >
                {showDefaultOption && <option value="">Select...</option>}
                {options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        </div>
    </div>
);

const NewContractorApproval = () => {
    const [contractors, setContractors] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContractor, setEditingContractor] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form Data State
    const [formData, setFormData] = useState({
        contractor_name: '',
        customer_phone: '',
        customer_type: '',
        nickname: '',
        mistry_name: '',
        state: '',
        city: ''
    });

    // Validation State
    const [phoneError, setPhoneError] = useState('');
    const [isCheckingPhone, setIsCheckingPhone] = useState(false);

    const [cityCode, setCityCode] = useState('');

    useEffect(() => {
        if (formData.city) {
            try {
                const code = idGenerator.getCityCode(formData.city);
                setCityCode(code);
            } catch (e) {
                console.error('Error getting city code:', e);
                setCityCode('');
            }
        } else {
            setCityCode('');
        }
    }, [formData.city]);

    const generatedId = useMemo(() => {
        try {
            if (!formData.customer_phone && !formData.contractor_name) return '';

            return idGenerator.generateCustomerId({
                customerPhone: String(formData.customer_phone || ''),
                cityCode: cityCode || '',
                contractorName: String(formData.contractor_name || ''),
                customerType: formData.customer_type,
                nickname: formData.nickname,
                mistryName: formData.mistry_name
            });
        } catch (e) {
            console.error('Error generating ID:', e);
            return '';
        }
    }, [formData, cityCode]);

    // Check Phone Uniqueness on Change
    useEffect(() => {
        const checkPhone = async () => {
            if (formData.customer_phone && formData.customer_phone.length === 10) {
                // Don't check if it hasn't changed from the original (if we have reference to original data in editingContractor)
                // However, we are passing editingContractor.contractor_id to exclude it in the DB check.

                setIsCheckingPhone(true);
                const { exists, error } = await addContractorService.checkPhoneUnique(
                    formData.customer_phone,
                    editingContractor?.contractor_id // Exclude current contractor
                );
                setIsCheckingPhone(false);

                if (error) {
                    console.error('Phone check error:', error);
                    return;
                }

                if (exists) {
                    setPhoneError('Phone number already exists with another user');
                } else {
                    setPhoneError('');
                }
            } else {
                setPhoneError('');
            }
        };

        const timeoutId = setTimeout(() => {
            if (isModalOpen && formData.customer_phone) {
                checkPhone();
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [formData.customer_phone, isModalOpen, editingContractor]);

    useEffect(() => {
        fetchPendingContractors();
    }, []);

    const fetchPendingContractors = async () => {
        setLoading(true);
        const { data, error } = await newContractorApprovalService.getPendingContractors();
        if (error) {
            toast.error('Failed to fetch pending approvals');
        } else {
            setContractors(data || []);
        }
        setLoading(false);
    };

    const handleReject = async (contractorId) => {
        if (!confirm('Are you sure you want to reject this Influencer?')) return;

        const loadingToast = toast.loading('Rejecting Influencer...');
        const { error } = await newContractorApprovalService.updateContractorStatus(contractorId, 'Rejected');

        if (error) {
            toast.error('Failed to reject', { id: loadingToast });
        } else {
            toast.success('Influencer rejected successfully', { id: loadingToast });
            setContractors(prev => prev.filter(c => c.contractor_id !== contractorId));
            if (isModalOpen) closeApproveModal();
        }
    };

    const openApproveModal = (contractor) => {
        setEditingContractor(contractor);
        setFormData({
            contractor_name: contractor.contractor_name || '',
            customer_phone: contractor.customer_phone || '',
            customer_type: contractor.customer_type || '',
            nickname: contractor.nickname || '',
            mistry_name: contractor.mistry_name || '',
            state: contractor.state || '',
            city: contractor.city || ''
        });
        // Initialize city code for the existing city
        if (contractor.city) {
            setCityCode(idGenerator.getCityCode(contractor.city));
        }
        setIsModalOpen(true);
    };

    const closeApproveModal = () => {
        setIsModalOpen(false);
        setEditingContractor(null);
        setPhoneError('');
    };

    const handleFieldChange = (field, value) => {
        setFormData(prev => {
            const updates = { ...prev, [field]: value };
            // Reset city if state changes
            if (field === 'state') {
                updates.city = '';
            }
            return updates;
        });
    };

    const handleSaveAndApprove = async () => {
        // Validation
        if (!formData.contractor_name || !formData.customer_phone || !formData.customer_type || !formData.state || !formData.city) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (formData.customer_type === 'Mistry' && !formData.mistry_name) {
            toast.error('Mistry Name is required for Mistry type');
            return;
        }

        if (phoneError) {
            toast.error(phoneError);
            return;
        }
        if (isCheckingPhone) {
            toast.error('Verifying phone number...');
            return;
        }

        setIsSaving(true);
        const loadingToast = toast.loading('Updating and Approving...');

        try {
            // 1. Update Details
            // Only update ID if it changed and is valid
            const updates = { ...formData };
            let targetId = editingContractor.contractor_id;

            if (generatedId && generatedId !== editingContractor.contractor_id) {
                updates.contractor_id = generatedId;
                targetId = generatedId;
            }

            const { error: updateError } = await newContractorApprovalService.updateContractorDetails(
                editingContractor.contractor_id,
                updates
            );

            if (updateError) {
                // If it's a Foreign Key violation, we might be unable to update the ID directly
                if (updateError.code === '23503') { // foreign_key_violation
                    throw new Error(`Cannot update Influencer ID (${editingContractor.contractor_id} -> ${generatedId}) because it is used by other records.`);
                }
                throw updateError;
            }

            // 2. Approve (using the targetId)
            const { error: approveError } = await newContractorApprovalService.updateContractorStatus(
                targetId,
                'Approved'
            );

            if (approveError) throw approveError;

            toast.success('Influencer approved successfully', { id: loadingToast });
            // Remove from list
            setContractors(prev => prev.filter(c => c.contractor_id !== editingContractor.contractor_id));
            closeApproveModal();

        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Failed to process approval', { id: loadingToast });
        } finally {
            setIsSaving(false);
        }
    };

    // Use shared CUSTOMER_TYPES for consistency across the app
    // This ensures ID generation logic (prefixes) works correctly
    const customerTypes = CUSTOMER_TYPES.filter(type => type !== 'Customer');

    return (
        <div className="p-6 min-h-screen bg-slate-50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">New Influencer's Approval</h1>
                    <p className="text-slate-500 mt-1">Review, edit, and approve new Influencer's registrations</p>
                </div>
                <button
                    onClick={fetchPendingContractors}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm font-medium"
                >
                    <LayoutDashboard size={18} />
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : contractors.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <Users size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No Pending Approvals</h3>
                    <p className="text-slate-500 max-w-sm mt-2">
                        There are currently no new Influencer registrations waiting for approval.
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name / ID</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created By</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {contractors.map((c) => (
                                    <tr key={c.contractor_id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4" style={{ whiteSpace: 'nowrap' }}>
                                            <div className="font-medium text-slate-900">{c.contractor_name}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{c.contractor_id}</div>
                                        </td>
                                        <td className="px-6 py-4" style={{ whiteSpace: 'nowrap' }}>
                                            {c.created_by_user ? (
                                                <>
                                                    <div className="font-medium text-slate-900">{c.created_by_user.full_name}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">{c.created_by_user.user_id}</div>
                                                </>
                                            ) : (
                                                <span className="text-slate-400 italic">Unknown</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {c.customer_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{c.customer_phone}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {c.city}, {c.state}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {c.created_at ? format(new Date(c.created_at), 'MMM d, yyyy') : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openApproveModal(c)}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    <Eye size={16} />
                                                    Review
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Approval Modal */}
            {isModalOpen && editingContractor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Approve Influencer</h2>
                                <p className="text-sm text-slate-500">Review and edit details before final approval.</p>
                            </div>
                            <button
                                onClick={closeApproveModal}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Identity */}
                                <div className="md:col-span-2">
                                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                        Identity
                                        <div className="h-px bg-slate-100 flex-1"></div>
                                    </h3>
                                </div>

                                <div className="md:col-span-2 flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Created By</label>
                                    <div className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-700">
                                        {editingContractor.created_by_user ? (
                                            <div className="flex flex-col">
                                                <span className="font-medium">{editingContractor.created_by_user.full_name}</span>
                                                <span className="text-xs text-slate-500">{editingContractor.created_by_user.user_id}</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 italic">Unknown User</span>
                                        )}
                                    </div>
                                </div>

                                <div className="md:col-span-2 flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Influencer ID</label>
                                    <div className={`px-3 py-2 border rounded-lg text-sm flex justify-between items-center ${generatedId !== editingContractor.contractor_id ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-100 border-slate-200 text-slate-500'
                                        }`}>
                                        <span>{generatedId}</span>
                                        {generatedId !== editingContractor.contractor_id && (
                                            <span className="text-xs font-semibold px-2 py-0.5 bg-amber-200 text-amber-800 rounded">UPDATED</span>
                                        )}
                                    </div>
                                </div>

                                <ModalSelect
                                    label="Influencer Type"
                                    required
                                    value={formData.customer_type}
                                    onChange={(e) => handleFieldChange('customer_type', e.target.value)}
                                    options={customerTypes}
                                    showDefaultOption={false}
                                />

                                <ModalInput
                                    label="Full Name"
                                    required
                                    value={formData.contractor_name}
                                    onChange={(e) => handleFieldChange('contractor_name', e.target.value)}
                                    placeholder="Enter full name"
                                />

                                {formData.customer_type === 'Contractor' && (
                                    <ModalInput
                                        label="Nickname"
                                        value={formData.nickname}
                                        onChange={(e) => handleFieldChange('nickname', e.target.value)}
                                        placeholder="e.g. Raju"
                                    />
                                )}

                                {/* Conditional Mistry Name */}
                                {formData.customer_type === 'Mistry' && (
                                    <div className="md:col-span-2">
                                        <ModalInput
                                            label="Mistry Name"
                                            required
                                            value={formData.mistry_name}
                                            onChange={(e) => handleFieldChange('mistry_name', e.target.value)}
                                            placeholder="Enter Mistri Name"
                                        />
                                    </div>
                                )}

                                {/* Contact & Location */}
                                <div className="md:col-span-2 mt-2">
                                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                        Contact & Location
                                        <div className="h-px bg-slate-100 flex-1"></div>
                                    </h3>
                                </div>

                                <ModalInput
                                    label="Phone Number"
                                    required
                                    type="tel"
                                    value={formData.customer_phone}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        if (val.length <= 10) handleFieldChange('customer_phone', val);
                                    }}
                                    placeholder="9876543210"
                                    error={phoneError}
                                />

                                <div className="hidden md:block"></div> {/* Spacer */}

                                <ModalSelect
                                    label="State"
                                    required
                                    value={formData.state}
                                    onChange={(e) => handleFieldChange('state', e.target.value)}
                                    options={Object.keys(INDIAN_LOCATIONS)}
                                />

                                <ModalSelect
                                    label="City"
                                    required
                                    value={formData.city}
                                    onChange={(e) => handleFieldChange('city', e.target.value)}
                                    options={formData.state ? (INDIAN_LOCATIONS[formData.state] || []) : []}
                                    disabled={!formData.state}
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                            <button
                                onClick={() => handleReject(editingContractor.contractor_id)}
                                className="flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-rose-200"
                            >
                                <XCircle size={18} />
                                Reject
                            </button>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={closeApproveModal}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveAndApprove}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Approving...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle size={16} />
                                            Approve
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NewContractorApproval;
