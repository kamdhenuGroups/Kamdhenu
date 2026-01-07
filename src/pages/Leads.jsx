import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
    Plus,
    Search,
    Filter,
    Phone,
    FileText,
    User,
    X,
    Edit2,
    Trash2,
    MapPin,
    Calendar,
    MoreHorizontal
} from 'lucide-react';
import { leadService, LEAD_STATUSES } from '../services/leadService';
import { INDIAN_LOCATIONS } from '../data/indianLocations';

const Leads = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    // Form State
    const [formData, setFormData] = useState({
        customer_name: '',
        customer_phone: '',
        quotation: '',
        remarks: '',
        lead_status: 'New',
        state: '',
        city: ''
    });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        const { data, error } = await leadService.getLeads();
        if (error) {
            toast.error('Failed to fetch leads');
        } else {
            setLeads(data || []);
        }
        setLoading(false);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.customer_name || !formData.customer_phone) {
            toast.error('Name and Phone are required');
            return;
        }

        if (!editingId && (!formData.state || !formData.city)) {
            toast.error('State and City are required for ID generation');
            return;
        }

        const toastId = toast.loading(editingId ? 'Updating lead...' : 'Creating lead...');

        let result;
        if (editingId) {
            result = await leadService.updateLead(editingId, formData);
        } else {
            result = await leadService.createLead(formData);
        }

        if (result.error) {
            toast.error(result.error.message || 'Operation failed', { id: toastId });
        } else {
            toast.success(editingId ? 'Lead updated successfully' : 'Lead created successfully', { id: toastId });
            setShowModal(false);
            resetForm();
            fetchLeads();
        }
    };

    const handleEdit = (lead) => {
        setFormData({
            customer_name: lead.customer_name,
            customer_phone: lead.customer_phone,
            quotation: lead.quotation || '',
            remarks: lead.remarks || '',
            lead_status: lead.lead_status,
            state: lead.state || '',
            city: lead.city || ''
        });
        setEditingId(lead.lead_id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this lead?')) {
            const toastId = toast.loading('Deleting lead...');
            const { error } = await leadService.deleteLead(id);
            if (error) {
                toast.error('Failed to delete lead', { id: toastId });
            } else {
                toast.success('Lead deleted successfully', { id: toastId });
                fetchLeads();
            }
        }
    };

    const resetForm = () => {
        setFormData({
            customer_name: '',
            customer_phone: '',
            quotation: '',
            remarks: '',
            lead_status: 'New',
            state: '',
            city: ''
        });
        setEditingId(null);
    };

    const filteredLeads = leads.filter(lead => {
        const matchesSearch = lead.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.customer_phone.includes(searchTerm) ||
            lead.lead_id?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || lead.lead_status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'New': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'Contacted': return 'bg-yellow-50 text-yellow-700 border-yellow-100';
            case 'Qualified': return 'bg-purple-50 text-purple-700 border-purple-100';
            case 'Won': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'Lost': return 'bg-red-50 text-red-700 border-red-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    return (
        <div className="h-full flex flex-col gap-6 overflow-hidden p-6 max-w-[1600px] mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Leads Management</h1>
                    <p className="text-slate-500 mt-1 text-sm">Track and manage potential customers</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                >
                    <Plus size={18} />
                    New Lead
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row items-center gap-4 shrink-0">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search by name, phone or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Filter size={16} className="text-slate-400 shrink-0" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary cursor-pointer w-full md:w-48"
                    >
                        <option value="All">All Statuses</option>
                        {LEAD_STATUSES.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Leads Table */}
            <div className="flex-1 overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-200/60 flex flex-col">
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 animate-pulse">
                        <div className="w-12 h-12 bg-slate-100 rounded-full mb-4"></div>
                        <div className="h-4 bg-slate-100 rounded w-48 mb-2"></div>
                        <div className="h-4 bg-slate-100 rounded w-32"></div>
                    </div>
                ) : filteredLeads.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500">
                        <div className="bg-slate-50 p-4 rounded-full mb-4">
                            <User size={32} className="text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">No leads found</h3>
                        <p className="max-w-xs text-center text-sm mt-1 text-slate-400">
                            {searchTerm || statusFilter !== 'All'
                                ? 'No matching leads found. Try adjusting your filters.'
                                : 'Get started by creating your first lead.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar flex-1">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-700 whitespace-nowrap">Lead ID</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700 whitespace-nowrap">Date</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700 whitespace-nowrap">Customer Name</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700 whitespace-nowrap">Phone</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700 whitespace-nowrap">Location</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700 text-center whitespace-nowrap">Status</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700 whitespace-nowrap">Quotation</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700 whitespace-nowrap">Source</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700 whitespace-nowrap">Remarks</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700 text-right whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredLeads.map((lead) => (
                                    <tr key={lead.lead_id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                onClick={() => handleEdit(lead)}
                                                className="font-bold text-primary cursor-pointer hover:underline"
                                            >
                                                {lead.lead_id}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-slate-400" />
                                                {new Date(lead.created_at).toLocaleDateString('en-GB')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap">
                                            {lead.customer_name}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap font-medium">
                                            <div className="flex items-center gap-2">
                                                <Phone size={14} className="text-slate-400" />
                                                {lead.customer_phone}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap text-xs">
                                            {(lead.city || lead.state) ? (
                                                <div className="flex items-center gap-1">
                                                    <MapPin size={12} className="text-slate-400" />
                                                    <span>{lead.city}{lead.city && lead.state ? ', ' : ''}{lead.state}</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(lead.lead_status)}`}>
                                                {lead.lead_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 max-w-[200px] truncate text-xs" title={lead.quotation}>
                                            {lead.quotation ? (
                                                <div className="flex items-center gap-1.5">
                                                    <FileText size={12} className="text-slate-400 shrink-0" />
                                                    <span className="truncate">{lead.quotation}</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 text-xs whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <User size={12} className="text-slate-400" />
                                                {lead.lead_source_user_name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 max-w-[200px] truncate text-xs" title={lead.remarks}>
                                            {lead.remarks || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(lead)}
                                                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(lead.lead_id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setShowModal(false)}
                    />
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl relative z-10 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 ring-1 ring-slate-900/5">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Edit Lead' : 'New Lead'}</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Enter lead details below</p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <form id="leadForm" onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Name *</label>
                                        <input
                                            type="text"
                                            name="customer_name"
                                            value={formData.customer_name}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-medium"
                                            placeholder="Enter name"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number *</label>
                                        <input
                                            type="tel"
                                            name="customer_phone"
                                            value={formData.customer_phone}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-medium"
                                            placeholder="Enter phone"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">State *</label>
                                        <div className="relative">
                                            <select
                                                name="state"
                                                value={formData.state}
                                                onChange={(e) => {
                                                    const newState = e.target.value;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        state: newState,
                                                        city: ''
                                                    }));
                                                }}
                                                disabled={!!editingId}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none appearance-none disabled:opacity-50 font-medium text-slate-700"
                                                required
                                            >
                                                <option value="">Select State</option>
                                                {Object.keys(INDIAN_LOCATIONS).map(state => (
                                                    <option key={state} value={state}>{state}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <MoreHorizontal size={16} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">City *</label>
                                        <div className="relative">
                                            <select
                                                name="city"
                                                value={formData.city}
                                                onChange={handleInputChange}
                                                disabled={!formData.state || !!editingId}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none appearance-none disabled:opacity-50 font-medium text-slate-700"
                                                required
                                            >
                                                <option value="">Select City</option>
                                                {formData.state && INDIAN_LOCATIONS[formData.state]?.map(city => (
                                                    <option key={city} value={city}>{city}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <MoreHorizontal size={16} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                                    <div className="flex flex-wrap gap-2">
                                        {LEAD_STATUSES.map(status => (
                                            <button
                                                type="button"
                                                key={status}
                                                onClick={() => setFormData(prev => ({ ...prev, lead_status: status }))}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${formData.lead_status === status
                                                        ? 'bg-slate-800 text-white shadow-md'
                                                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
                                                    }`}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quotation Details</label>
                                    <textarea
                                        name="quotation"
                                        value={formData.quotation}
                                        onChange={handleInputChange}
                                        rows="3"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none placeholder:text-slate-400 text-sm"
                                        placeholder="Add quotation details..."
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Remarks</label>
                                    <textarea
                                        name="remarks"
                                        value={formData.remarks}
                                        onChange={handleInputChange}
                                        rows="2"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none placeholder:text-slate-400 text-sm"
                                        placeholder="Any additional notes..."
                                    />
                                </div>
                            </form>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3 rounded-b-2xl">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="leadForm"
                                className="px-6 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                            >
                                {editingId ? 'Update Lead' : 'Create Lead'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Leads;
