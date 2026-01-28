import React, { useState, useEffect, useMemo } from 'react';
import { createOrderService } from '../services/createOrderService';
import { Search, User, MapPin, Users, Phone, Loader2, Fingerprint } from 'lucide-react';
import toast from 'react-hot-toast';

const CreateOrder = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerSites, setCustomerSites] = useState([]);
    const [influencers, setInfluencers] = useState({});
    const [searching, setSearching] = useState(false);

    // Initial load of recent sites
    useEffect(() => {
        loadInitialSites();
    }, []);

    const loadInitialSites = async () => {
        try {
            const results = await createOrderService.searchSites('');
            setSearchResults(results);
        } catch (error) {
            console.error('Failed to load sites:', error);
        }
    };

    // Search Debounce
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchTerm.length > 0) {
                setSearching(true);
                try {
                    const results = await createOrderService.searchSites(searchTerm);
                    setSearchResults(results);
                } catch (error) {
                    toast.error('Failed to search');
                } finally {
                    setSearching(false);
                }
            } else {
                // If search is cleared, show initial list again
                loadInitialSites();
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleSelectCustomer = async (customer) => {
        if (!customer) return;

        setSelectedCustomer(customer);
        setSearchTerm(''); // Clear search input
        setSearchResults([]);
        setLoading(true);

        try {
            const sites = await createOrderService.getCustomerSites(customer.customer_id);
            setCustomerSites(sites);

            // Collect all influencer IDs from all sites
            const influencerIds = new Set();
            sites.forEach(site => {
                if (site.main_influencer_id) influencerIds.add(site.main_influencer_id);
                if (site.assigned_influencers && Array.isArray(site.assigned_influencers)) {
                    site.assigned_influencers.forEach(id => influencerIds.add(id));
                }
            });

            if (influencerIds.size > 0) {
                const influencersData = await createOrderService.getInfluencers(Array.from(influencerIds));

                // Create a lookup map for easy access in render
                const infMap = {};
                influencersData.forEach(inf => {
                    infMap[inf.contractor_id] = inf;
                });
                setInfluencers(infMap);
            } else {
                setInfluencers({});
            }

        } catch (error) {
            toast.error('Failed to fetch customer details');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Group results by customer
    const groupedResults = useMemo(() => {
        const groups = {};
        searchResults.forEach(site => {
            if (!site.customers) return;
            const custId = site.customers.customer_id;

            if (!groups[custId]) {
                groups[custId] = {
                    customer: site.customers,
                    sites: [],
                    influencers: []
                };
            }
            groups[custId].sites.push(site);

            if (site.main_influencer) {
                const exists = groups[custId].influencers.some(
                    inf => inf.contractor_name === site.main_influencer.contractor_name
                );
                if (!exists) {
                    groups[custId].influencers.push(site.main_influencer);
                }
            }
        });
        return Object.values(groups);
    }, [searchResults]);

    const clearSelection = () => {
        setSelectedCustomer(null);
        setCustomerSites([]);
        setInfluencers({});
        setSearchTerm('');
        loadInitialSites(); // Reload list so it's ready if they search again
    };

    return (
        <div className="flex flex-col gap-6 p-6 w-full mx-auto min-h-screen bg-slate-50/50">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Order</h1>

            {/* Search Section */}
            {!selectedCustomer && (
                <div className="w-full mt-8 mx-auto">
                    <label className="block text-sm font-medium text-slate-700 mb-2 pl-1">Select Customer or Site</label>
                    <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <Search className="h-6 w-6" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by customer name, phone, or influencer..."
                            className="w-full pl-12 pr-4 py-4 text-base md:text-lg rounded-xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white placeholder:text-slate-400 font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                        {searching && (
                            <Loader2 className="absolute right-6 top-1/2 -translate-y-1/2 text-blue-500 h-6 w-6 animate-spin" />
                        )}
                    </div>

                    {/* Results Dropdown */}
                    <div className="mt-3 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden max-h-[60vh] overflow-y-auto">
                        {groupedResults.length > 0 ? (
                            <div className="divide-y divide-slate-50">
                                {groupedResults.map((group) => {
                                    const { customer, sites, influencers } = group;
                                    const distinctCities = [...new Set(sites.map(s => s.city).filter(Boolean))];

                                    return (
                                        <button
                                            key={customer.customer_id}
                                            onClick={() => handleSelectCustomer(customer)}
                                            className="w-full text-left px-5 py-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex items-start gap-4 transition-all duration-200 group"
                                        >
                                            <div className="h-12 w-12 mt-1 rounded-full bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 text-slate-400 flex items-center justify-center flex-shrink-0 transition-colors border border-slate-200 group-hover:border-blue-100">
                                                <User className="h-6 w-6" />
                                            </div>

                                            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                                {/* Top Row: Name, ID and Sites */}
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-slate-900 text-base shrink-0">
                                                            {customer.customer_name}
                                                        </span>
                                                        <span className="shrink-0 flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/50">
                                                            <Fingerprint className="w-3 h-3" />
                                                            {customer.customer_id}
                                                        </span>

                                                        {/* Site Addresses - Right side of ID */}
                                                        <div className="hidden sm:flex items-center min-w-0 px-2 border-l border-slate-300 ml-1">
                                                            <MapPin className="w-3 h-3 text-slate-400 mr-1.5 shrink-0" />
                                                            <div className="flex items-center overflow-hidden gap-1">
                                                                {sites.map((s, index) => (
                                                                    <div key={index} className="flex items-center shrink-0">
                                                                        {index > 0 && <MapPin className="w-3 h-3 text-slate-300 mx-2 shrink-0" />}
                                                                        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                                                                            {[s.address_plot_house_flat_building, s.address_area_street_locality, s.city].filter(Boolean).join(', ')}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Mobile Site View (fallback) & Firm Name */}
                                                    <div className="flex flex-col gap-0.5">
                                                        {sites.length > 0 && (
                                                            <div className="sm:hidden flex items-center gap-1 text-xs text-slate-500 mb-0.5">
                                                                <MapPin className="w-3 h-3 shrink-0" />
                                                                <span className="truncate">
                                                                    {sites.length} Site{sites.length > 1 ? 's' : ''} &bull; {distinctCities.join(', ')}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Firm name moved to bottom row */}
                                                    </div>
                                                </div>

                                                {/* Bottom Row: Phone & Influencer */}
                                                <div className="flex items-center justify-between gap-4 pt-1">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {customer.firm_name && (
                                                            <>
                                                                <span className="text-sm font-bold text-slate-700 truncate max-w-[200px]" title={customer.firm_name}>
                                                                    {customer.firm_name}
                                                                </span>
                                                                <span className="text-slate-300">|</span>
                                                            </>
                                                        )}
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                            <span className="text-sm font-semibold text-slate-600">
                                                                {customer.primary_phone}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {influencers.length > 0 ? (
                                                        <div className="flex items-center gap-1.5 pl-2 pr-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100/50">
                                                            <Users className="w-3 h-3" />
                                                            <span className="text-xs font-bold max-w-[120px] truncate">
                                                                {influencers.length === 1 ? influencers[0].contractor_name : `${influencers.length} Influencers`}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic px-2">No Influencer</span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                {searchTerm ? 'No matching sites or customers found.' : 'Search for a customer, site, or influencer...'}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Selected Customer View */}
            {selectedCustomer && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-8">
                    {/* Customer Header */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg ring-4 ring-blue-50">
                                <User className="h-8 w-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">{selectedCustomer.customer_name}</h2>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 mt-1">
                                    <div className="flex items-center gap-1.5">
                                        <Phone className="h-4 w-4" />
                                        <span className="font-medium">{selectedCustomer.primary_phone}</span>
                                    </div>
                                    {selectedCustomer.city && (
                                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                                            <MapPin className="h-3 w-3" />
                                            <span>{selectedCustomer.city}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={clearSelection}
                            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors border border-slate-200"
                        >
                            Change Customer
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <MapPin className="text-slate-400 h-5 w-5" />
                            <h3 className="text-lg font-bold text-slate-900">Customer Sites</h3>
                            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{customerSites.length}</span>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {loading ? (
                                <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
                                    <Loader2 className="h-10 w-10 animate-spin mb-3 text-blue-500" />
                                    <p>Loading details...</p>
                                </div>
                            ) : customerSites.length === 0 ? (
                                <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 mb-3">
                                        <MapPin className="h-6 w-6 text-slate-400" />
                                    </div>
                                    <p className="text-slate-900 font-medium">No sites found</p>
                                    <p className="text-sm text-slate-500">This customer has no registered sites yet.</p>
                                </div>
                            ) : (
                                customerSites.map(site => (
                                    <div key={site.site_id} className="group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col">
                                        {/* Site Header */}
                                        <div className="bg-slate-50/50 p-5 border-b border-slate-100">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xl font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                                                    {site.site_id}
                                                </span>
                                            </div>
                                            <p className="text-base font-semibold text-slate-900 leading-snug mb-1">
                                                {site.address_plot_house_flat_building}, {site.address_area_street_locality}
                                            </p>
                                            <div className="flex items-center gap-1 text-sm text-slate-500">
                                                <span>{site.city}, {site.state}</span>
                                            </div>
                                        </div>

                                        {/* Influencers Section */}
                                        <div className="p-5 flex-1 flex flex-col">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Users className="h-4 w-4 text-blue-500" />
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Team</h4>
                                            </div>

                                            <div className="space-y-4 flex-1">
                                                {/* Main Influencer */}
                                                {site.main_influencer_id ? (
                                                    itemsOrNull(influencers[site.main_influencer_id], (inf) => (
                                                        <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100/50 relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-100 rounded-full blur-2xl -mr-8 -mt-8 opacity-50"></div>
                                                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1 block relative z-10">Main Influencer</span>
                                                            <div className="relative z-10">
                                                                <p className="font-semibold text-slate-900">{inf.contractor_name}</p>
                                                                <p className="text-xs text-slate-500">{inf.customer_type}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="bg-slate-50 rounded-xl p-3 border border-dashed border-slate-200">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Main Influencer</span>
                                                        <p className="text-sm text-slate-400 italic">Not assigned</p>
                                                    </div>
                                                )}

                                                {/* Additional Influencers */}
                                                {site.assigned_influencers && site.assigned_influencers.length > 0 && (
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block pl-1">Additional</span>
                                                        <div className="space-y-2">
                                                            {site.assigned_influencers.map(id => {
                                                                const inf = influencers[id];
                                                                if (!inf) return null;
                                                                return (
                                                                    <div key={id} className="flex items-center justify-between text-sm p-2.5 rounded-lg bg-white border border-slate-100 shadow-sm">
                                                                        <span className="text-slate-700 font-medium truncate pr-2">{inf.contractor_name}</span>
                                                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">{inf.customer_type}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper for conditional rendering only if item exists
const itemsOrNull = (item, renderFn) => {
    if (!item) return null;
    return renderFn(item);
};

export default CreateOrder;
