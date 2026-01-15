import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronRight, X } from 'lucide-react';
import {
    getContractors,
    getUserAssignments,
    getAllUserAssignments,
    assignContractorToUser,
    revokeContractorAccess
} from '../services/contractorVisibilityService';
import toast from 'react-hot-toast';

const ContractorVisibility = ({ users }) => {
    // State Management
    const [contractors, setContractors] = useState([]);

    // Contractor Visibility Search States
    const [contractorSearchTerm, setContractorSearchTerm] = useState('');
    const [customerTypeFilter, setCustomerTypeFilter] = useState('All');
    const [userAccessSearchTerm, setUserAccessSearchTerm] = useState('');

    // Contractor Visibility Logic
    const [expandedUserId, setExpandedUserId] = useState(null);
    const [userAssignments, setUserAssignments] = useState({}); // { userId: [contractor_id, ...] }
    const [processingAssignment, setProcessingAssignment] = useState(false);

    // Fetch Contractors and Assignments on mount
    useEffect(() => {
        const loadInitData = async () => {
            try {
                const [contractorsData, assignmentsData] = await Promise.all([
                    getContractors(),
                    getAllUserAssignments()
                ]);
                setContractors(contractorsData);
                setUserAssignments(assignmentsData);
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Failed to load data');
            }
        };
        loadInitData();
    }, []);

    // Filtered Contractors
    const filteredContractors = useMemo(() => {
        let result = contractors;

        if (customerTypeFilter !== 'All') {
            result = result.filter(c => c.customer_type === customerTypeFilter);
        }

        if (contractorSearchTerm) {
            const lowerTerm = contractorSearchTerm.toLowerCase();
            result = result.filter(c =>
                c.contractor_name?.toLowerCase().includes(lowerTerm) ||
                c.contractor_id?.toString().toLowerCase().includes(lowerTerm) ||
                c.nickname?.toLowerCase().includes(lowerTerm) ||
                c.city?.toLowerCase().includes(lowerTerm)
            );
        }
        return result;
    }, [contractors, contractorSearchTerm, customerTypeFilter]);

    // Filtered Users
    const filteredAccessUsers = useMemo(() => {
        if (!userAccessSearchTerm) return users;
        const lowerTerm = userAccessSearchTerm.toLowerCase();
        return users.filter(u =>
            u.full_name?.toLowerCase().includes(lowerTerm) ||
            u.user_id?.toString().toLowerCase().includes(lowerTerm) ||
            u.role?.toLowerCase().includes(lowerTerm)
        );
    }, [users, userAccessSearchTerm]);

    const fetchAssignmentsForUser = async (userId) => {
        try {
            const assignedIds = await getUserAssignments(userId);
            setUserAssignments(prev => ({
                ...prev,
                [userId]: assignedIds
            }));
        } catch (error) {
            console.error('Error fetching assignments:', error);
            toast.error('Failed to load assignments');
        }
    };

    const toggleUserExpansion = (userId) => {
        if (expandedUserId === userId) {
            setExpandedUserId(null);
        } else {
            setExpandedUserId(userId);
        }
    };

    const handleDragStart = (e, contractorId) => {
        e.dataTransfer.setData('contractor_id', contractorId);
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDropOnUser = async (e, targetUserId) => {
        e.preventDefault();
        if (processingAssignment) return;

        const contractorId = e.dataTransfer.getData('contractor_id');
        if (!contractorId) return;

        const currentAssignments = userAssignments[targetUserId] || [];
        if (currentAssignments.includes(contractorId)) {
            toast('Contractor already assigned to this user', { icon: 'ℹ️' });
            return;
        }

        // Optimistic Update
        const previousAssignments = { ...userAssignments };
        setUserAssignments(prev => ({
            ...prev,
            [targetUserId]: [...(prev[targetUserId] || []), contractorId]
        }));

        // Temporarily expand to show the new addition
        setExpandedUserId(targetUserId);

        setProcessingAssignment(true);
        try {
            await assignContractorToUser(targetUserId, contractorId);
            toast.success('Access granted successfully');
        } catch (error) {
            // Check uniqueness constraint violation explicitly just in case
            if (error.code === '23505') {
                toast('Contractor already assigned');
            } else {
                console.error('Assignment error:', error);
                toast.error('Failed to assign contractor');
            }
            // Revert on error
            setUserAssignments(previousAssignments);
        } finally {
            setProcessingAssignment(false);
        }
    };

    const removeAssignment = async (userId, contractorId) => {
        if (!confirm('Are you sure you want to revoke access?')) return;

        // Optimistic Update
        const previousAssignments = { ...userAssignments };
        setUserAssignments(prev => ({
            ...prev,
            [userId]: prev[userId].filter(id => id !== contractorId)
        }));

        try {
            await revokeContractorAccess(userId, contractorId);
            toast.success('Access revoked');
        } catch (error) {
            console.error('Revoke error:', error);
            toast.error('Failed to revoke access');
            setUserAssignments(previousAssignments);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-250px)] min-h-[500px]">
            {/* Left Side: Contractors (Source) */}
            <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center sticky top-0 z-10 backdrop-blur-sm">
                    <div>
                        <h2 className="font-semibold text-slate-800">Available Contractors</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Drag to assign</p>
                    </div>
                    <div className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium">
                        {filteredContractors.length} found
                    </div>
                </div>
                <div className="px-4 py-2 border-b border-slate-100 bg-white flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search contractors..."
                            value={contractorSearchTerm}
                            onChange={(e) => setContractorSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    <select
                        value={customerTypeFilter}
                        onChange={(e) => setCustomerTypeFilter(e.target.value)}
                        className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white text-slate-700 min-w-[120px]"
                    >
                        <option value="All">All Types</option>
                        {[...new Set(contractors.map(c => c.customer_type).filter(Boolean))].map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                    {filteredContractors.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-sm">No contractors found.</div>
                    ) : (
                        filteredContractors.map(contractor => (
                            <div
                                key={contractor.contractor_id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, contractor.contractor_id)}
                                className="p-3 rounded-xl border border-slate-100 bg-white hover:border-blue-300 hover:shadow-md cursor-grab active:cursor-grabbing transition-all group"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-medium text-slate-900 line-clamp-1">{contractor.contractor_name} {contractor.nickname && <span className="text-slate-500 font-normal">({contractor.nickname})</span>}</h3>
                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${contractor.customer_type === 'New' ? 'bg-green-50 text-green-700 border-green-100' :
                                        'bg-slate-50 text-slate-600 border-slate-100'
                                        }`}>
                                        {contractor.customer_type}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span className="bg-slate-100 px-1 rounded">{contractor.contractor_id}</span>
                                    <span>•</span>
                                    <span className="truncate">{contractor.city || 'No City'}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Side: Users (Drop Targets) */}
            <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center sticky top-0 z-10 backdrop-blur-sm">
                    <div>
                        <h2 className="font-semibold text-slate-800">User Access Management</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Drop contractors on users to assign</p>
                    </div>
                    <div className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full text-xs font-medium">
                        {filteredAccessUsers.length} Users
                    </div>
                </div>
                <div className="px-4 py-2 border-b border-slate-100 bg-white">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={userAccessSearchTerm}
                            onChange={(e) => setUserAccessSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                    {filteredAccessUsers.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-sm">No users found.</div>
                    ) : (
                        filteredAccessUsers.map(user => {
                            const isExpanded = expandedUserId === user.user_id;
                            const assigned = userAssignments[user.user_id] || [];

                            return (
                                <div
                                    key={user.user_id}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDropOnUser(e, user.user_id)}
                                    className={`rounded-xl border transition-all duration-300 ${isExpanded
                                        ? 'border-purple-200 bg-purple-50/30'
                                        : 'border-slate-100 hover:border-purple-200 bg-white'
                                        }`}
                                >
                                    <div
                                        className="p-3 flex items-center justify-between cursor-pointer"
                                        onClick={() => toggleUserExpansion(user.user_id)}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-200 overflow-hidden shrink-0">
                                                {user.profile_picture ? (
                                                    <img src={user.profile_picture} alt={user.full_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    user.full_name?.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-medium text-slate-900 truncate">{user.full_name}</h3>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <span className="bg-white px-1 border border-slate-100 rounded">{user.user_id}</span>
                                                    <span className="truncate">{user.role}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${assigned.length > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {assigned.length} Granted
                                            </span>
                                            <div className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                                <ChevronRight size={18} className="rotate-90" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Area: Assigned Contractors */}
                                    {isExpanded && (
                                        <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-2">
                                            <div className="border-t border-purple-100 my-2"></div>
                                            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                                                Assigned Contractors {assigned.length === 0 && '(None)'}
                                            </p>
                                            {assigned.length === 0 ? (
                                                <div className="text-center py-4 border-2 border-dashed border-purple-100 rounded-lg bg-white/50">
                                                    <p className="text-xs text-purple-400">Drag contractors here to assign</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                                    {assigned.map(contrId => {
                                                        // Find full contractor details if available, else just ID
                                                        const contrInfo = contractors.find(c => c.contractor_id === contrId) || { contractor_name: 'Unknown', contractor_id: contrId };
                                                        return (
                                                            <div key={contrId} className="flex justify-between items-center p-2 bg-white rounded border border-purple-100 shadow-sm">
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-medium text-slate-800 truncate" title={contrInfo.contractor_name}>{contrInfo.contractor_name}</p>
                                                                    <p className="text-[10px] text-slate-400">{contrId}</p>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); removeAssignment(user.user_id, contrId); }}
                                                                    className="p-1 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded transition-colors"
                                                                    title="Revoke Access"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContractorVisibility;
