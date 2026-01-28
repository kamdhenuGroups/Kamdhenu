import React, { useState, useEffect } from 'react';
import { influencerDashboardService } from '../services/influencerDashboard';
import { Users, UserCheck, MapPin, Phone, Mail, Building2, Briefcase, BadgeCheck, Search, ArrowRight, ChevronDown, Filter } from 'lucide-react';
import useAuthStore from '../store/authStore';

const InfluencerDashboardPage = () => {
    const user = useAuthStore((state) => state.user);
    const [rms, setRms] = useState([]);
    const [selectedRm, setSelectedRm] = useState('');
    const [influencers, setInfluencers] = useState([]);
    const [loadingRms, setLoadingRms] = useState(true);
    const [loadingInfluencers, setLoadingInfluencers] = useState(false);
    const [contractorTypeFilter, setContractorTypeFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const isAdmin = user?.role?.toLowerCase() === 'admin';

    useEffect(() => {
        if (isAdmin) {
            fetchRMs();
        } else if (user) {
            setRms([user]);
            setSelectedRm(user.user_id);
            fetchInfluencers(user.user_id);
            setLoadingRms(false);
        }
    }, [user, isAdmin]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [contractorTypeFilter, selectedRm, searchQuery]);

    const fetchRMs = async () => {
        setLoadingRms(true);
        const { data } = await influencerDashboardService.getRMs();
        setRms(data || []);
        setLoadingRms(false);
    };

    const handleRmChange = (e) => {
        const userId = e.target.value;
        setSelectedRm(userId);
        if (userId) {
            fetchInfluencers(userId);
        } else {
            setInfluencers([]);
        }
    };

    const fetchInfluencers = async (userId) => {
        setLoadingInfluencers(true);
        const { data } = await influencerDashboardService.getAssignedInfluencers(userId);
        setInfluencers(data || []);
        setLoadingInfluencers(false);
    };

    const selectedRmDetails = rms.find(rm => rm.user_id === selectedRm);

    // Filter Logic
    const contractorTypes = ['All', ...new Set(influencers.map(i => i.customer_type).filter(Boolean))];

    const filteredInfluencers = influencers.filter(influencer => {
        const matchesType = contractorTypeFilter === 'All' || influencer.customer_type === contractorTypeFilter;

        const searchLower = searchQuery.toLowerCase();
        const name = (influencer.customer_type === 'Mistry' ? influencer.mistry_name : influencer.contractor_name) || '';

        const matchesSearch = searchQuery === '' ||
            String(influencer.contractor_id || '').toLowerCase().includes(searchLower) ||
            String(name || '').toLowerCase().includes(searchLower) ||
            String(influencer.customer_phone || '').toLowerCase().includes(searchLower) ||
            String(influencer.city || '').toLowerCase().includes(searchLower) ||
            String(influencer.state || '').toLowerCase().includes(searchLower);

        return matchesType && matchesSearch;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredInfluencers.length / itemsPerPage);
    const paginatedInfluencers = filteredInfluencers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Count Breakdown Logic
    const getCountSummary = () => {
        if (influencers.length === 0) return '0 Contractors';

        const counts = influencers.reduce((acc, curr) => {
            const type = curr.customer_type || 'Unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(counts)
            .map(([type, count]) => `${count} ${type}`)
            .join(', ');
    };

    return (
        <div className="h-full flex flex-col gap-6 max-w-screen-2xl mx-auto w-full p-4 lg:p-8">

            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-light text-slate-800 tracking-tight flex items-center gap-2">
                        Influencer's Dashboard
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Manage relationship managers and review their assigned network.</p>
                </div>

                {isAdmin && (
                    <div className="w-full md:w-80">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">Select Relationship Manager</label>
                        <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                <Users size={18} />
                            </div>
                            <select
                                className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-xl py-3 pl-10 pr-10 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-sm hover:border-indigo-300 appearance-none font-medium"
                                value={selectedRm}
                                onChange={handleRmChange}
                                disabled={loadingRms}
                            >
                                <option value="">Choose an RM...</option>
                                {rms.map((rm) => (
                                    <option key={rm.user_id} value={rm.user_id}>
                                        {rm.full_name}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                                <ChevronDown size={16} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-6">

                {/* Width Wise RM Profile Card */}
                {selectedRm && selectedRmDetails && (
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">

                            {/* Identity Section */}
                            <div className="flex items-center gap-5">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600 flex items-center justify-center font-bold text-3xl border border-indigo-100/50 shadow-inner flex-shrink-0">
                                    {selectedRmDetails.full_name?.charAt(0)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-bold text-slate-900 text-xl leading-tight">{selectedRmDetails.full_name}</h3>
                                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 tracking-wide">
                                            <BadgeCheck size={12} />
                                            <span>Active</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-500 text-sm mt-1.5 font-medium">
                                        <Briefcase size={14} className="text-slate-400" />
                                        <span>{selectedRmDetails.designation || 'Designation N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-500 text-sm mt-0.5">
                                        <Building2 size={14} className="text-slate-400" />
                                        <span>{selectedRmDetails.department || '-'} • {selectedRmDetails.role || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Divider for large screens */}
                            <div className="hidden lg:block w-px h-16 bg-slate-100 mx-4"></div>

                            {/* Contact Grid Section - Takes up available space */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-8 w-full lg:w-auto flex-1">
                                <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 text-indigo-500 flex items-center justify-center flex-shrink-0">
                                        <Mail size={18} />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Email Address</span>
                                        <span className="text-slate-700 font-medium text-sm break-all" title={selectedRmDetails.email}>{selectedRmDetails.email || '-'}</span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 text-emerald-500 flex items-center justify-center flex-shrink-0">
                                        <Phone size={18} />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Phone Number</span>
                                        <span className="text-slate-700 font-medium text-sm">{selectedRmDetails.phone_number || '-'}</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* Full Width Influencer List */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[600px]">
                    <div className="px-6 py-5 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
                        <div className="flex flex-col gap-1">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <UserCheck size={18} className="text-indigo-500" />
                                Assigned Influencers
                            </h3>
                            {!loadingInfluencers && influencers.length > 0 && (
                                <span className="text-xs text-slate-500 font-medium">
                                    {getCountSummary()}
                                </span>
                            )}
                        </div>

                        {/* Search & Filter Controls */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                            {/* Search Field */}
                            <div className="relative w-full sm:w-64">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                    <Search size={14} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search by name, ID, phone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg py-2 pl-9 pr-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                />
                            </div>

                            {/* Type Filter */}
                            <div className="relative w-full sm:w-auto">
                                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                    <Filter size={14} />
                                </div>
                                <select
                                    value={contractorTypeFilter}
                                    onChange={(e) => setContractorTypeFilter(e.target.value)}
                                    className="w-full sm:w-auto bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg py-2 pl-8 pr-8 appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all min-w-[140px]"
                                >
                                    {contractorTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                    <ChevronDown size={14} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table container with horizontal scroll ONLY for the table */}
                    <div className="flex-1 flex flex-col">
                        <div className="flex-1 relative">
                            <div className="absolute inset-0 overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-full">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-semibold uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                                            <th className="px-4 py-3 whitespace-nowrap min-w-[150px]">ID</th>
                                            <th className="px-4 py-3 text-left min-w-[300px]">Name</th>
                                            <th className="px-4 py-3 whitespace-nowrap min-w-[150px]">Phone</th>
                                            <th className="px-4 py-3 whitespace-nowrap min-w-[120px]">Type</th>
                                            <th className="px-4 py-3 text-left min-w-[250px]">Location</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm divide-y divide-slate-50">
                                        {loadingInfluencers ? (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-20 text-center">
                                                    <div className="flex flex-col items-center justify-center gap-3">
                                                        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                                        <span className="text-slate-500 font-medium">Fetching Influencers...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : paginatedInfluencers.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-20 text-center">
                                                    <div className="flex flex-col items-center justify-center gap-3 max-w-xs mx-auto">
                                                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                                            {selectedRm ? <Search size={24} /> : <Users size={24} />}
                                                        </div>
                                                        <h4 className="text-slate-900 font-medium">
                                                            {selectedRm ? "No results found" : "Select a Relationship Manager"}
                                                        </h4>
                                                        <p className="text-slate-500 text-xs">
                                                            {selectedRm
                                                                ? (influencers.length > 0 ? "Try adjusting your filters." : "This RM does not have any assigned contractors yet.")
                                                                : "Please select a Relationship Manager from the dropdown above to view their assigned Influencers."
                                                            }
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            <>
                                                {paginatedInfluencers.map((influencer) => (
                                                    <tr key={influencer.contractor_id} className="group hover:bg-slate-50/60 transition-colors">
                                                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                                                            <span className="px-2 py-1 rounded bg-slate-100 group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-slate-200 inline-block min-w-[120px] max-w-full overflow-hidden text-ellipsis">
                                                                {influencer.contractor_id}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 font-medium text-slate-900 min-w-[280px] max-w-full">
                                                            <div className="truncate" title={influencer.customer_type === 'Mistry' ? influencer.mistry_name : influencer.contractor_name}>
                                                                {influencer.customer_type === 'Mistry' ? (influencer.mistry_name || '-') : (influencer.contractor_name || '-')}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap min-w-[140px]">
                                                            <div className="truncate">
                                                                {influencer.customer_phone || '-'}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap min-w-[110px]">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                                {influencer.customer_type || '-'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600 min-w-[240px] max-w-full">
                                                            <div className="flex items-start gap-1.5">
                                                                <MapPin size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                                                                <span className="truncate" title={`${influencer.city || ''}, ${influencer.state || ''}`}>
                                                                    {influencer.city || '-'}{influencer.city && influencer.state ? ', ' : ''}{influencer.state || '-'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {/* Fill remaining rows to maintain consistent height (10 items) */}
                                                {paginatedInfluencers.length < itemsPerPage && Array.from({ length: itemsPerPage - paginatedInfluencers.length }).map((_, index) => (
                                                    <tr key={`empty-${index}`} className="pointer-events-none">
                                                        <td className="px-4 py-3">&nbsp;</td>
                                                        <td className="px-4 py-3">&nbsp;</td>
                                                        <td className="px-4 py-3">&nbsp;</td>
                                                        <td className="px-4 py-3">&nbsp;</td>
                                                        <td className="px-4 py-3">&nbsp;</td>
                                                    </tr>
                                                ))}
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Pagination Footer */}
                    {!loadingInfluencers && (
                        <div className="px-6 py-4 border-t border-slate-50 flex items-center justify-between bg-white">
                            <span className="text-xs text-slate-500">
                                Showing <span className="font-semibold text-slate-700">{filteredInfluencers.length === 0 ? 0 : Math.min((currentPage - 1) * itemsPerPage + 1, filteredInfluencers.length)}</span> to <span className="font-semibold text-slate-700">{Math.min(currentPage * itemsPerPage, filteredInfluencers.length)}</span> of <span className="font-semibold text-slate-700">{filteredInfluencers.length}</span> Influencer
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage >= totalPages}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InfluencerDashboardPage;