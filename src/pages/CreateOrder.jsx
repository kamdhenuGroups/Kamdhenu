import React, { useState, useEffect } from 'react';
import { ShoppingBag, ArrowRight, User, ChevronDown, MapPin, Phone, Fingerprint, Search, X, Loader2, Building2, GripVertical, Trash2, CheckCircle2 } from 'lucide-react';
import { fetchActiveCustomers, fetchSites } from '../services/createOrderService';

const CreateOrder = () => {
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Site Selection State
    const [sites, setSites] = useState([]);
    const [selectedSiteId, setSelectedSiteId] = useState('');
    const [assignedSite, setAssignedSite] = useState(null);
    const [siteSearchTerm, setSiteSearchTerm] = useState('');
    const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false);
    const siteDropdownRef = React.useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const selectedSiteData = sites.find(s => s.site_id === selectedSiteId);

    // Filter sites
    const filteredSites = sites.filter(site =>
        site.site_id.toLowerCase().includes(siteSearchTerm.toLowerCase()) ||
        site.address_area_street_locality.toLowerCase().includes(siteSearchTerm.toLowerCase()) ||
        site.onsite_contact_name.toLowerCase().includes(siteSearchTerm.toLowerCase())
    );

    const handleSiteDragStart = (e, site) => {
        e.dataTransfer.setData('site', JSON.stringify(site));
        setIsDragging(true);
    };

    const handleSiteDragEnd = () => {
        setIsDragging(false);
    };

    const handleSiteDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const siteData = e.dataTransfer.getData('site');
        if (siteData) {
            setAssignedSite(JSON.parse(siteData));
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [customersData, sitesData] = await Promise.all([
                fetchActiveCustomers(),
                fetchSites()
            ]);
            setCustomers(customersData);
            setSites(sitesData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const selectedCustomerData = customers.find(c => c.customer_id === selectedCustomer);

    // Filter customers for search
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = React.useRef(null);

    // Handle click outside to close dropdowns
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
            if (siteDropdownRef.current && !siteDropdownRef.current.contains(event.target)) {
                setIsSiteDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update search term when customer is selected/deselected or initially loaded
    useEffect(() => {
        if (selectedCustomer) {
            const customer = customers.find(c => c.customer_id === selectedCustomer);
            if (customer) setSearchTerm(customer.customer_name);
        } else {
            setSearchTerm('');
        }
    }, [selectedCustomer, customers]);

    const filteredCustomers = customers.filter(customer =>
        customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.primary_phone.includes(searchTerm)
    );

    const handleSelectCustomer = (customerId) => {
        setSelectedCustomer(customerId);
        setIsDropdownOpen(false);
    };

    const handleClearSelection = (e) => {
        e.stopPropagation();
        setSelectedCustomer('');
        setSearchTerm('');
        setIsDropdownOpen(false);
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto w-full pb-20 p-4 sm:p-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Create Order</h1>
                <p className="text-slate-500 mt-1 text-sm">Create and manage new orders for customers.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Customer Selection - Takes up 4 columns on large screens */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 h-full">
                        <label htmlFor="customer" className="block text-sm font-semibold text-slate-900 mb-3 tracking-wide">
                            Find Customer
                        </label>
                        <div className="relative" ref={dropdownRef}>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                    <Search size={20} />
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        if (!isDropdownOpen) setIsDropdownOpen(true);
                                        if (selectedCustomer && e.target.value !== selectedCustomerData?.customer_name) {
                                            setSelectedCustomer('');
                                        }
                                    }}
                                    onClick={() => setIsDropdownOpen(true)}
                                    placeholder="Name or Phone..."
                                    className="w-full pl-12 pr-10 py-3.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all shadow-sm placeholder:text-slate-400"
                                    disabled={loading}
                                />
                                {selectedCustomer ? (
                                    <button
                                        onClick={handleClearSelection}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                ) : (
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                                )}
                            </div>

                            {/* Dropdown Menu */}
                            {isDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl max-h-[400px] overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-100">
                                    {loading ? (
                                        <div className="p-4 flex items-center justify-center text-slate-500 gap-2">
                                            <Loader2 className="animate-spin" size={20} />
                                            <span>Loading...</span>
                                        </div>
                                    ) : filteredCustomers.length > 0 ? (
                                        <div className="py-1">
                                            {filteredCustomers.map((customer) => (
                                                <button
                                                    key={customer.customer_id}
                                                    onClick={() => handleSelectCustomer(customer.customer_id)}
                                                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex flex-col gap-0.5 border-b border-slate-50 last:border-0 ${selectedCustomer === customer.customer_id ? 'bg-primary/5' : ''}`}
                                                >
                                                    <span className="font-medium text-slate-900">{customer.customer_name}</span>
                                                    <span className="text-xs text-slate-500 flex items-center gap-2">
                                                        <span>{customer.primary_phone}</span>
                                                        {customer.billing_city && (
                                                            <>
                                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                                <span>{customer.billing_city}</span>
                                                            </>
                                                        )}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center text-slate-500">
                                            <p>No customers found</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {error && (
                            <p className="mt-2 text-sm text-red-500 font-medium">{error}</p>
                        )}

                        {/* Quick Stats or Tips could go here in future */}

                    </div>
                </div>

                {/* Customer Details - Takes up 8 columns */}
                <div className="lg:col-span-8 flex flex-col gap-6 h-full">
                    {selectedCustomerData ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden h-full">
                            <div className="bg-slate-50/50 border-b border-slate-100 p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <Fingerprint size={16} />
                                    </div>
                                    <h2 className="font-semibold text-slate-900 tracking-wide">{selectedCustomerData.customer_id}</h2>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium border border-green-200">
                                    Active
                                </span>
                            </div>
                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8">
                                <div className="group col-span-1 lg:col-span-1">
                                    <div className="flex items-center gap-2 mb-1.5 text-slate-500 group-hover:text-primary transition-colors">
                                        <User size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Name</span>
                                    </div>
                                    <p className="text-slate-900 font-medium pl-6 text-lg truncate" title={selectedCustomerData.customer_name}>
                                        {selectedCustomerData.customer_name}
                                    </p>
                                </div>

                                <div className="group col-span-1 lg:col-span-1">
                                    <div className="flex items-center gap-2 mb-1.5 text-slate-500 group-hover:text-primary transition-colors">
                                        <Phone size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Mobile</span>
                                    </div>
                                    <p className="text-slate-900 font-medium pl-6">{selectedCustomerData.primary_phone}</p>
                                </div>



                                <div className="group col-span-1 lg:col-span-1">
                                    <div className="flex items-center gap-2 mb-1.5 text-slate-500 group-hover:text-primary transition-colors">
                                        <MapPin size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Area / Locality</span>
                                    </div>
                                    <p className="text-slate-900 font-medium pl-6 text-sm sm:text-base">
                                        {[selectedCustomerData.billing_area, selectedCustomerData.billing_locality].filter(Boolean).join(', ') || '-'}
                                    </p>
                                </div>

                                <div className="group col-span-1 lg:col-span-1">
                                    <div className="flex items-center gap-2 mb-1.5 text-slate-500 group-hover:text-primary transition-colors">
                                        <MapPin size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">City / State</span>
                                    </div>
                                    <p className="text-slate-900 font-medium pl-6 text-sm sm:text-base">
                                        {[selectedCustomerData.billing_city, selectedCustomerData.billing_state].filter(Boolean).join(', ') || '-'}
                                    </p>
                                </div>

                                <div className="group col-span-1 sm:col-span-2 lg:col-span-2">
                                    <div className="flex items-center gap-2 mb-1.5 text-slate-500 group-hover:text-primary transition-colors">
                                        <MapPin size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Address Line</span>
                                    </div>
                                    <p className="text-slate-900 font-medium pl-6 text-sm sm:text-base">
                                        {selectedCustomerData.billing_address_line || '-'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 h-full min-h-[250px] flex flex-col items-center justify-center text-center p-8 transition-colors hover:bg-slate-50">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                                <User className="text-slate-300" size={32} />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">No Customer Selected</h3>
                            <p className="text-slate-500 text-sm max-w-xs mx-auto">
                                Select a Customer Dropdown panel to view their details and start an order.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Site Selection & Assignment Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-12">
                    <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <MapPin size={24} className="text-slate-400" />
                        Site Assignment
                    </h2>
                </div>

                {/* Left Section: Source (Dropdown & Draggable) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 h-full">
                        <label className="block text-sm font-semibold text-slate-900 mb-3 tracking-wide">
                            1. Select Site
                        </label>

                        {/* Site Dropdown */}
                        <div className="relative mb-6" ref={siteDropdownRef}>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                    <Search size={20} />
                                </div>
                                <input
                                    type="text"
                                    value={siteSearchTerm}
                                    onChange={(e) => {
                                        setSiteSearchTerm(e.target.value);
                                        if (!isSiteDropdownOpen) setIsSiteDropdownOpen(true);
                                        if (selectedSiteId && e.target.value !== selectedSiteData?.site_id) {
                                            // Optional: clear selection if typing new search? 
                                            // For now let's keep it simple
                                        }
                                    }}
                                    onClick={() => setIsSiteDropdownOpen(true)}
                                    placeholder="Search Site ID or Area..."
                                    className="w-full pl-12 pr-10 py-3.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all shadow-sm placeholder:text-slate-400"
                                />
                                {selectedSiteId ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedSiteId('');
                                            setSiteSearchTerm('');
                                        }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                ) : (
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                                )}
                            </div>

                            {/* Dropdown Menu */}
                            {isSiteDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl max-h-[300px] overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-100">
                                    {filteredSites.length > 0 ? (
                                        <div className="py-1">
                                            {filteredSites.map((site) => (
                                                <button
                                                    key={site.site_id}
                                                    onClick={() => {
                                                        setSelectedSiteId(site.site_id);
                                                        setSiteSearchTerm(site.address_area_street_locality ? `${site.site_id} - ${site.address_area_street_locality}` : site.site_id);
                                                        setIsSiteDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex flex-col gap-0.5 border-b border-slate-50 last:border-0 ${selectedSiteId === site.site_id ? 'bg-primary/5' : ''}`}
                                                >
                                                    <span className="font-medium text-slate-900">{site.site_id}</span>
                                                    <span className="text-xs text-slate-500 truncate">
                                                        {site.address_plot_house_flat_building}, {site.address_area_street_locality}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center text-slate-500 text-sm">No sites found</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Draggable Source Card */}
                        {selectedSiteData && (
                            <div className="animate-in slide-in-from-top-4 fade-in duration-300">
                                <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
                                    Drag this card to assign
                                </label>
                                <div
                                    draggable
                                    onDragStart={(e) => handleSiteDragStart(e, selectedSiteData)}
                                    onDragEnd={handleSiteDragEnd}
                                    className="bg-white border-2 border-primary/20 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-primary/40 cursor-grab active:cursor-grabbing group transition-all relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-primary/20 group-hover:bg-primary transition-colors"></div>
                                    <div className="flex items-start gap-3 pl-2">
                                        <div className="mt-1 text-slate-400 group-hover:text-primary transition-colors">
                                            <GripVertical size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-slate-900 truncate">{selectedSiteData.site_id}</h3>
                                            <p className="text-sm text-slate-500 mt-0.5">{selectedSiteData.address_plot_house_flat_building}</p>
                                            <p className="text-xs text-slate-400 mt-1 truncate">{selectedSiteData.address_area_street_locality}, {selectedSiteData.city}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {!selectedSiteData && (
                            <div className="p-8 border-2 border-dashed border-slate-100 rounded-xl text-center">
                                <Building2 className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                                <p className="text-sm text-slate-400">Select a site above to enable assignment</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Section: Target (Drop Zone) */}
                <div className="lg:col-span-7 flex flex-col gap-6 h-full">
                    <div
                        onDragOver={handleDragOver}
                        onDrop={handleSiteDrop}
                        className={`bg-white rounded-2xl shadow-sm border-2 transition-all duration-300 flex flex-col h-full min-h-[300px] relative overflow-hidden ${isDragging
                                ? 'border-primary/50 bg-primary/5 border-dashed scale-[1.01]'
                                : 'border-slate-200/60'
                            }`}
                    >
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <label className="block text-sm font-semibold text-slate-900 tracking-wide">
                                2. Assigned Site
                            </label>
                            {assignedSite && (
                                <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                                    <CheckCircle2 size={12} />
                                    Assigned
                                </span>
                            )}
                        </div>

                        <div className="flex-1 p-6 flex flex-col justify-center">
                            {assignedSite ? (
                                <div className="animate-in zoom-in-95 duration-300">
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6 relative group overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setAssignedSite(null)}
                                                className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                                                title="Remove Assignment"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>

                                        <div className="flex items-start gap-5">
                                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                                <Building2 size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-slate-900 mb-1">{assignedSite.site_id}</h3>
                                                <p className="text-slate-600 font-medium mb-3">{assignedSite.address_plot_house_flat_building}</p>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                                                    <div>
                                                        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">Location</span>
                                                        <p className="text-sm text-slate-800">{assignedSite.address_area_street_locality}</p>
                                                        <p className="text-sm text-slate-600">{assignedSite.city}, {assignedSite.state}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">Site Contact</span>
                                                        <p className="text-sm text-slate-800 font-medium">{assignedSite.onsite_contact_name}</p>
                                                        <p className="text-sm text-slate-600">{assignedSite.onsite_contact_mobile}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className={`text-center transition-all duration-300 ${isDragging ? 'scale-110' : ''}`}>
                                    <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 transition-colors ${isDragging ? 'bg-primary/20 text-primary' : 'bg-slate-100 text-slate-300'
                                        }`}>
                                        <MapPin size={32} className={isDragging ? 'animate-bounce' : ''} />
                                    </div>
                                    <h3 className={`text-lg font-semibold mb-2 ${isDragging ? 'text-primary' : 'text-slate-900'}`}>
                                        {isDragging ? 'Drop Site Here' : 'No Site Assigned'}
                                    </h3>
                                    <p className="text-slate-500 text-sm max-w-xs mx-auto">
                                        {isDragging
                                            ? 'Release the mouse button to assign this site to the order.'
                                            : 'Drag a selected site from the left panel and drop it here to assign.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateOrder;
