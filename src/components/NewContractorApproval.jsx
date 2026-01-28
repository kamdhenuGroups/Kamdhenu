import React, { useState, useEffect, useMemo } from 'react';
import {
    LayoutDashboard,
    Search,
    Users,
    CheckCircle,
    XCircle,
    X,
    Loader2,
    Save,
    RefreshCw,

    Eye,
    History,
    ListFilter,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { newContractorApprovalService } from '../services/newContractorApprovalService';
import { addContractorService } from '../services/addContractorService';
import { idGenerator, CUSTOMER_TYPES } from '../services/orderService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { INDIAN_LOCATIONS } from '../data/indianLocations';
import TableFilterHeader from './TableFilterHeader';

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
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
    const [contractors, setContractors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter State
    const [filters, setFilters] = useState({
        created_by: [],
        customer_type: [],
        city: [],
        status: []
    });

    // Reset filters when tab changes
    useEffect(() => {
        setFilters({
            created_by: [],
            customer_type: [],
            city: [],
            status: []
        });
    }, [activeTab]);

    const handleFilterChange = (key, values) => {
        setFilters(prev => ({ ...prev, [key]: values }));
    };

    const getUniqueOptions = (field) => {
        const unique = new Set(contractors.map(c => {
            if (field === 'created_by') return c.created_by_user?.full_name || 'Super Admin';
            return c[field];
        }).filter(Boolean));
        return Array.from(unique).sort();
    };

    const filteredContractors = useMemo(() => {
        return contractors.filter(c => {
            if (filters.created_by.length > 0) {
                const name = c.created_by_user?.full_name || 'Super Admin';
                if (!filters.created_by.includes(name)) return false;
            }
            if (filters.customer_type.length > 0 && (!c.customer_type || !filters.customer_type.includes(c.customer_type))) return false;
            if (filters.city.length > 0 && (!c.city || !filters.city.includes(c.city))) return false;
            if (filters.status.length > 0 && (!c.status || !filters.status.includes(c.status))) return false;

            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                const matchesSearch = (
                    (c.contractor_name?.toLowerCase().includes(searchLower)) ||
                    (c.contractor_id?.toLowerCase().includes(searchLower)) ||
                    (String(c.customer_phone || '').includes(searchTerm)) || // Phone is usually numeric, but string match works
                    (c.city?.toLowerCase().includes(searchLower)) ||
                    (c.state?.toLowerCase().includes(searchLower)) ||
                    (c.customer_type?.toLowerCase().includes(searchLower)) ||
                    (c.created_by_user?.full_name?.toLowerCase().includes(searchLower))
                );
                if (!matchesSearch) return false;
            }

            return true;
        });
    }, [contractors, filters, searchTerm]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Reset page when tab or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, filters]);

    const paginatedContractors = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredContractors.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredContractors, currentPage]);

    const totalPages = Math.ceil(filteredContractors.length / itemsPerPage);

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
        fetchContractors();
    }, [activeTab]);

    const fetchContractors = async () => {
        setLoading(true);
        let result;

        if (activeTab === 'pending') {
            result = await newContractorApprovalService.getContractorsByStatus(['Pending']);
        } else {
            result = await newContractorApprovalService.getContractorsByStatus(['Approved', 'Rejected']);
        }

        const { data, error } = result;

        if (error) {
            toast.error('Failed to fetch contractors');
        } else {
            let sortedData = data || [];
            if (activeTab === 'history') {
                // Sort Rejected to the top, then by date desc
                sortedData.sort((a, b) => {
                    if (a.status === 'Rejected' && b.status !== 'Rejected') return -1;
                    if (a.status !== 'Rejected' && b.status === 'Rejected') return 1;
                    // Secondary sort by date
                    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                });
            } else {
                // Default sort by date desc
                sortedData.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            }
            setContractors(sortedData);
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

        // Final Phone Check
        const { exists: phoneExists } = await addContractorService.checkPhoneUnique(
            formData.customer_phone,
            editingContractor.contractor_id
        );

        if (phoneExists) {
            toast.error('Phone number already exists with another user');
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

            // 3. Assign to User (if applicable)
            if (editingContractor.created_by_user_id) {
                const { error: assignError } = await newContractorApprovalService.assignContractorToUser(
                    editingContractor.created_by_user_id,
                    targetId
                );
                if (assignError) {
                    console.error('Failed to assign to user:', assignError);
                    toast.error('Approved, but failed to assign to creator.');
                }
            }

            toast.success('Influencer approved successfully', { id: loadingToast });

            if (activeTab === 'history') {
                setContractors(prev => {
                    // Update the item
                    const updatedList = prev.map(c =>
                        c.contractor_id === editingContractor.contractor_id
                            ? { ...c, ...updates, contractor_id: targetId, status: 'Approved' }
                            : c
                    );

                    // Re-sort to move the now-approved item out of the top "Rejected" section
                    return updatedList.sort((a, b) => {
                        if (a.status === 'Rejected' && b.status !== 'Rejected') return -1;
                        if (a.status !== 'Rejected' && b.status === 'Rejected') return 1;
                        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                    });
                });
            } else {
                // If it was Pending, it moves to History tab, so remove from current view
                setContractors(prev => prev.filter(c => c.contractor_id !== editingContractor.contractor_id));
            }

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
                    onClick={fetchContractors}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm font-medium"
                >
                    <LayoutDashboard size={18} />
                    Refresh
                </button>
            </div>

            {/* Search and Filters Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Search */}
                <div className="relative w-full sm:max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by Name, ID, Phone, City..."
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 mb-6 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pending'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                >
                    <ListFilter size={18} />
                    Pending Approvals
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                >
                    <History size={18} />
                    History (Approved/Rejected)
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Name / ID</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                        <TableFilterHeader
                                            title="Created By"
                                            options={getUniqueOptions('created_by')}
                                            selectedValues={filters.created_by}
                                            onChange={(vals) => handleFilterChange('created_by', vals)}
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                        <TableFilterHeader
                                            title="Type"
                                            options={getUniqueOptions('customer_type')}
                                            selectedValues={filters.customer_type}
                                            onChange={(vals) => handleFilterChange('customer_type', vals)}
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Phone</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                        <TableFilterHeader
                                            title="Location"
                                            options={getUniqueOptions('city')}
                                            selectedValues={filters.city}
                                            onChange={(vals) => handleFilterChange('city', vals)}
                                        />
                                    </th>
                                    {activeTab === 'history' && (
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                            <TableFilterHeader
                                                title="Status"
                                                options={getUniqueOptions('status')}
                                                selectedValues={filters.status}
                                                onChange={(vals) => handleFilterChange('status', vals)}
                                            />
                                        </th>
                                    )}
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Registered</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedContractors.map((c) => (
                                    <tr key={c.contractor_id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-start gap-2">
                                                {activeTab === 'pending' ? (
                                                    <button
                                                        onClick={() => openApproveModal(c)}
                                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                                                    >
                                                        <Eye size={16} />
                                                        Review
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => openApproveModal(c)}
                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${c.status === 'Rejected'
                                                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                                            }`}
                                                    >
                                                        <Eye size={16} />
                                                        {c.status === 'Rejected' ? 'Edit' : 'View'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4" style={{ whiteSpace: 'nowrap' }}>
                                            <div className="font-medium text-slate-900">
                                                {c.contractor_name}
                                                {c.customer_type === 'Mistry' && c.mistry_name ? ` (${c.mistry_name})` : ''}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5">{c.contractor_id}</div>
                                        </td>
                                        <td className="px-6 py-4" style={{ whiteSpace: 'nowrap' }}>
                                            {c.created_by_user ? (
                                                <>
                                                    <div className="font-medium text-slate-900">{c.created_by_user.full_name}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">{c.created_by_user.user_id}</div>
                                                </>
                                            ) : (
                                                <span className="text-slate-400 italic">Super Admin</span>
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
                                        {activeTab === 'history' && (
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.status === 'Approved'
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : 'bg-rose-100 text-rose-800'
                                                    }`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {c.created_at ? format(new Date(c.created_at), 'MMM d, yyyy') : '-'}
                                        </td>
                                    </tr>
                                ))}
                                {/* Empty Rows to ensure 10 rows per page */}
                                {Array.from({ length: Math.max(0, itemsPerPage - paginatedContractors.length) }).map((_, index) => (
                                    <tr key={`empty-${index}`} className="border-b border-slate-100 h-[75px]">
                                        <td className="px-6 py-4">&nbsp;</td>
                                        <td className="px-6 py-4">&nbsp;</td>
                                        <td className="px-6 py-4">&nbsp;</td>
                                        <td className="px-6 py-4">&nbsp;</td>
                                        <td className="px-6 py-4">&nbsp;</td>
                                        <td className="px-6 py-4">&nbsp;</td>
                                        {activeTab === 'history' && <td className="px-6 py-4">&nbsp;</td>}
                                        <td className="px-6 py-4">&nbsp;</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
                        <div className="text-sm text-slate-500">
                            Showing {filteredContractors.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredContractors.length)} of {filteredContractors.length} entries
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-sm font-medium text-slate-700">
                                Page {filteredContractors.length === 0 ? 0 : currentPage} of {filteredContractors.length === 0 ? 0 : totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
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
                                {(() => {
                                    const isReadOnly = editingContractor?.status !== 'Pending' && editingContractor?.status !== 'Rejected';
                                    return (
                                        <>
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
                                                        <span className="text-slate-400 italic">Super Admin</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="md:col-span-2 flex flex-col gap-1.5">
                                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Influencer ID</label>
                                                <div className={`px-3 py-2 border rounded-lg text-sm flex justify-between items-center ${generatedId !== editingContractor.contractor_id ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-100 border-slate-200 text-slate-500'
                                                    }`}>
                                                    <span>{generatedId || editingContractor.contractor_id}</span>
                                                    {generatedId && generatedId !== editingContractor.contractor_id && (
                                                        <span className="text-xs font-semibold px-2 py-0.5 bg-amber-200 text-amber-800 rounded">UPDATED</span>
                                                    )}
                                                </div>
                                            </div>

                                            {editingContractor.status !== 'Pending' && (
                                                <div className="md:col-span-2">
                                                    <div className={`p-3 rounded-lg flex items-center gap-2 ${editingContractor.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                        }`}>
                                                        <span className="font-semibold">Status:</span>
                                                        <span>{editingContractor.status}</span>
                                                    </div>
                                                </div>
                                            )}

                                            <ModalSelect
                                                label="Influencer Type"
                                                required
                                                value={formData.customer_type}
                                                onChange={(e) => handleFieldChange('customer_type', e.target.value)}
                                                options={customerTypes}
                                                showDefaultOption={false}
                                                disabled={isReadOnly}
                                            />

                                            <ModalInput
                                                label="Full Name"
                                                required
                                                value={formData.contractor_name}
                                                onChange={(e) => handleFieldChange('contractor_name', e.target.value)}
                                                placeholder="Enter full name"
                                                readOnly={isReadOnly}
                                            />

                                            {formData.customer_type === 'Contractor' && (
                                                <ModalInput
                                                    label="Nickname"
                                                    value={formData.nickname}
                                                    onChange={(e) => handleFieldChange('nickname', e.target.value)}
                                                    placeholder="e.g. Raju"
                                                    readOnly={isReadOnly}
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
                                                        readOnly={isReadOnly}
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
                                                readOnly={isReadOnly}
                                            />

                                            <div className="hidden md:block"></div> {/* Spacer */}

                                            <ModalSelect
                                                label="State"
                                                required
                                                value={formData.state}
                                                onChange={(e) => handleFieldChange('state', e.target.value)}
                                                options={Object.keys(INDIAN_LOCATIONS)}
                                                disabled={isReadOnly}
                                            />

                                            <ModalSelect
                                                label="City"
                                                required
                                                value={formData.city}
                                                onChange={(e) => handleFieldChange('city', e.target.value)}
                                                options={formData.state ? (INDIAN_LOCATIONS[formData.state] || []) : []}
                                                disabled={!formData.state || isReadOnly}
                                            />
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                            {editingContractor.status === 'Pending' || editingContractor.status === 'Rejected' ? (
                                <>
                                    {editingContractor.status === 'Pending' ? (
                                        <button
                                            onClick={() => handleReject(editingContractor.contractor_id)}
                                            className="flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-rose-200"
                                        >
                                            <XCircle size={18} />
                                            Reject
                                        </button>
                                    ) : (
                                        <div></div>
                                    )}
                                    <div className="flex items-center gap-3 ml-auto">
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
                                                    {editingContractor.status === 'Rejected' ? 'Re-Approving...' : 'Approving...'}
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle size={16} />
                                                    Approve
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex justify-end w-full">
                                    <button
                                        onClick={closeApproveModal}
                                        className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NewContractorApproval;
