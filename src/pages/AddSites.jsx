import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabase';
import {
    Search, Phone,
    Loader2, Save,
    ChevronDown,
    User,
    MapPin,
    X,
    Navigation,
    Building
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { INDIAN_LOCATIONS } from '../data/indianLocations';
import { idGenerator } from '../services/orderService';

// -- Reusable Components --

const SectionHeader = ({ title, icon: Icon }) => (
    <div className="flex items-center gap-3 mb-6 mt-10 first:mt-2">
        <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-primary" />}
            <h3 className="text-lg font-semibold text-foreground tracking-tight whitespace-nowrap">{title}</h3>
        </div>
        <div className="h-px flex-1 bg-border"></div>
    </div>
);

const InputGroup = ({ label, required, children, className = "" }) => (
    <div className={`space-y-1.5 ${className}`}>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider ml-0.5">
            {label} {required && <span className="text-destructive">*</span>}
        </label>
        {children}
    </div>
);

const TextInput = ({ className = "", ...props }) => (
    <input
        className={`flex h-11 w-full rounded-xl border border-input bg-background/50 px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-ring/50 hover:bg-background ${className}`}
        {...props}
    />
);

const SelectInput = ({ className = "", ...props }) => (
    <div className="relative">
        <select
            className={`flex h-11 w-full appearance-none rounded-xl border border-input bg-background/50 px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-ring/50 hover:bg-background cursor-pointer ${className}`}
            {...props}
        />
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
    </div>
);

const SearchableInput = ({ options = [], onSelect, ...props }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);
    const dropdownRef = useRef(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, bottom: 0 });
    const [openUpwards, setOpenUpwards] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            const isOutsideWrapper = wrapperRef.current && !wrapperRef.current.contains(event.target);
            const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target);

            if (isOutsideWrapper && isOutsideDropdown) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const updatePosition = () => {
        if (!wrapperRef.current) return;
        const rect = wrapperRef.current.getBoundingClientRect();

        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropdownHeight = 250; // max-height buffer

        // Open upwards if space below is tight and space above is better
        const shouldOpenUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

        setCoords({
            left: rect.left,
            top: rect.bottom + 4,
            bottom: rect.top - 4,
            width: rect.width
        });
        setOpenUpwards(shouldOpenUp);
    };

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
        }
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen]);

    const filteredOptions = useMemo(() => {
        if (!props.value) return options;
        return options.filter(opt =>
            opt.toLowerCase().includes(props.value.toLowerCase())
        );
    }, [options, props.value]);

    const dropdown = isOpen && filteredOptions.length > 0 ? (
        <div
            ref={dropdownRef}
            style={{
                position: 'fixed',
                left: coords.left,
                top: openUpwards ? 'auto' : coords.top,
                bottom: openUpwards ? (window.innerHeight - coords.bottom) : 'auto',
                width: coords.width,
                zIndex: 9999
            }}
            className="bg-popover text-popover-foreground border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto custom-scrollbar ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100"
        >
            {filteredOptions.map((option) => (
                <button
                    key={option}
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors first:rounded-t-lg last:rounded-b-lg"
                    onClick={() => {
                        onSelect(option);
                        setIsOpen(false);
                    }}
                >
                    {option}
                </button>
            ))}
        </div>
    ) : null;

    const handleClear = (e) => {
        e.stopPropagation();
        const event = {
            target: {
                name: props.name,
                value: ''
            }
        };
        props.onChange(event);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <TextInput
                {...props}
                className={`${props.className || ''} pr-10`}
                onFocus={() => {
                    setIsOpen(true);
                    updatePosition();
                }}
                onChange={(e) => {
                    props.onChange(e);
                    setIsOpen(true);
                }}
                autoComplete="off"
            />
            {props.value && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
                    tabIndex={-1}
                >
                    <X size={16} />
                </button>
            )}
            {createPortal(dropdown, document.body)}
        </div>
    );
};

// -- Constants --

const INITIAL_FORM_STATE = {
    address_plot_house_flat_building: '',
    address_area_street_locality: '',
    address_landmark: '',
    city: '',
    state: '',
    map_link: '',
    onsite_contact_name: '',
    onsite_contact_mobile: '',
    main_influencer_status: '',
    secondary_influencer_status: ''
};

const AddSites = () => {
    const [activeTab, setActiveTab] = useState('new');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [sites, setSites] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [siteNumber, setSiteNumber] = useState(1);

    const [formData, setFormData] = useState(INITIAL_FORM_STATE);

    // Get current user for created_by
    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('user')) || {};
        } catch {
            return {};
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'all') {
            fetchSites();
        }
    }, [activeTab]);

    const fetchSites = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('sites')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSites(data || []);
        } catch (error) {
            console.error('Error fetching sites:', error);
            toast.error('Failed to fetch sites');
        } finally {
            setLoading(false);
        }
    };

    // Calculate Site Number based on existing sites for User + City
    useEffect(() => {
        const calculateSiteNumber = async () => {
            if (!user.user_id || !formData.city) {
                setSiteNumber(1);
                return;
            }

            try {
                // Fetch all sites created by this user in this city to find the max suffix
                const { data, error } = await supabase
                    .from('sites')
                    .select('site_id')
                    .eq('created_by_user_id', user.user_id)
                    .eq('city', formData.city);

                if (error) throw error;

                let maxNum = 0;
                if (data && data.length > 0) {
                    data.forEach(site => {
                        if (site.site_id) {
                            // Expected Format: MMYY/CITY/RM-XX
                            const parts = site.site_id.split('-');
                            if (parts.length > 1) {
                                const num = parseInt(parts[parts.length - 1]);
                                if (!isNaN(num) && num > maxNum) {
                                    maxNum = num;
                                }
                            }
                        }
                    });
                }
                setSiteNumber(maxNum + 1);
            } catch (err) {
                console.error('Error calculating site number:', err);
            }
        };

        calculateSiteNumber();
    }, [formData.city, user.user_id]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let finalValue = value;

        // Phone Number Validation: Only numbers, max 10 digits
        if (name === 'onsite_contact_mobile') {
            finalValue = value.replace(/\D/g, '').slice(0, 10);
        }

        setFormData(prev => {
            const newData = {
                ...prev,
                [name]: finalValue
            };

            // Clear City if State is changed/cleared
            if (name === 'state') {
                newData.city = '';
            }

            return newData;
        });
    };

    const validateForm = () => {
        if (!formData.address_plot_house_flat_building?.trim()) return 'Plot/House/Flat/Building is required';
        if (!formData.address_area_street_locality?.trim()) return 'Area/Street/Locality is required';
        if (!formData.state?.trim()) return 'State is required';
        if (!formData.city?.trim()) return 'City is required';
        if (!formData.onsite_contact_name?.trim()) return 'Onsite Contact Name is required';
        if (!formData.onsite_contact_mobile?.trim()) return 'Onsite Contact Mobile is required';
        if (formData.onsite_contact_mobile.length !== 10) return 'Contact Mobile must be exactly 10 digits';
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const error = validateForm();
        if (error) {
            toast.error(error);
            return;
        }

        if (!user.user_id) {
            toast.error('Unable to identify user. Please login again.');
            return;
        }

        setSubmitting(true);

        try {
            // Generate Site ID using standardized logic
            const cityCode = idGenerator.getCityCode(formData.city);
            const siteId = idGenerator.generateSiteId({
                user: user,
                cityCode: cityCode,
                siteCount: siteNumber,
                date: new Date()
            });

            const payload = {
                site_id: siteId,
                address_plot_house_flat_building: formData.address_plot_house_flat_building,
                address_area_street_locality: formData.address_area_street_locality,
                address_landmark: formData.address_landmark || null,
                city: formData.city,
                state: formData.state,
                map_link: formData.map_link || null,
                onsite_contact_name: formData.onsite_contact_name,
                onsite_contact_mobile: formData.onsite_contact_mobile,
                main_influencer_status: formData.main_influencer_status || null,
                secondary_influencer_status: formData.secondary_influencer_status || null,
                created_by_user_id: user.user_id,
            };

            const { error: insertError } = await supabase
                .from('sites')
                .insert([payload]);

            if (insertError) throw insertError;

            toast.success('Site added successfully!');
            setFormData(INITIAL_FORM_STATE);
        } catch (error) {
            console.error('Error adding site:', error);
            toast.error(`Error adding site: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredSites = useMemo(() => {
        const lowerTerm = searchTerm.toLowerCase();
        return sites.filter(site =>
            site.site_id?.toLowerCase().includes(lowerTerm) ||
            site.city?.toLowerCase().includes(lowerTerm) ||
            site.address_area_street_locality?.toLowerCase().includes(lowerTerm) ||
            site.onsite_contact_name?.toLowerCase().includes(lowerTerm) ||
            site.onsite_contact_mobile?.includes(lowerTerm)
        );
    }, [sites, searchTerm]);

    const generatedSiteId = useMemo(() => {
        if (!formData.city || !user.user_id) return '---';
        const cityCode = idGenerator.getCityCode(formData.city);
        return idGenerator.generateSiteId({
            user: user,
            cityCode: cityCode,
            siteCount: siteNumber,
            date: new Date()
        });
    }, [formData.city, user, siteNumber]);

    return (
        <div className="h-full flex flex-col gap-6 max-w-screen-2xl mx-auto w-full p-4 lg:p-8 bg-background/50">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-light text-foreground tracking-tight">Site Management</h1>
                    <p className="text-muted-foreground text-sm mt-1">Manage construction sites and locations.</p>
                </div>

                {/* Minimal Tab Switcher */}
                <div className="flex p-1 bg-muted/50 backdrop-blur rounded-full self-start sm:self-auto border border-border">
                    <button
                        onClick={() => setActiveTab('new')}
                        className={`flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-full transition-all duration-300 ${activeTab === 'new'
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                            }`}
                    >
                        New Site
                    </button>
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-full transition-all duration-300 ${activeTab === 'all'
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                            }`}
                    >
                        All Sites
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 bg-card rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col relative">
                {activeTab === 'new' ? (
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto p-6 md:p-10 pb-32">

                            {/* Generated ID Badge */}
                            <div className="mb-8 p-4 rounded-2xl bg-muted/30 border border-border flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">New Site ID</p>
                                        <p className="text-lg font-semibold text-foreground tracking-tight">{generatedSiteId}</p>
                                    </div>
                                </div>
                                <div className="hidden sm:block text-xs text-muted-foreground text-right">
                                    Auto-generated based on<br />location & contact
                                </div>
                            </div>

                            {/* Section 1: Site Address */}
                            <SectionHeader title="Site Address" icon={Building} />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <div className="md:col-span-2">
                                    <InputGroup label="Plot / House / Flat / Building No" required>
                                        <TextInput
                                            type="text"
                                            name="address_plot_house_flat_building"
                                            value={formData.address_plot_house_flat_building}
                                            onChange={handleInputChange}
                                            placeholder="e.g. Plot No 24, Sunshine Apartments..."
                                            required
                                        />
                                    </InputGroup>
                                </div>
                                <div className="md:col-span-2">
                                    <InputGroup label="Street / Colony / Area" required>
                                        <TextInput
                                            type="text"
                                            name="address_area_street_locality"
                                            value={formData.address_area_street_locality}
                                            onChange={handleInputChange}
                                            placeholder="e.g. Main Street, Sector 15..."
                                            required
                                        />
                                    </InputGroup>
                                </div>
                                <InputGroup label="Landmark">
                                    <TextInput
                                        type="text"
                                        name="address_landmark"
                                        value={formData.address_landmark}
                                        onChange={handleInputChange}
                                        placeholder="Near..."
                                    />
                                </InputGroup>
                                <InputGroup label="Google Maps Link">
                                    <TextInput
                                        type="url"
                                        name="map_link"
                                        value={formData.map_link}
                                        onChange={handleInputChange}
                                        placeholder="https://maps.google.com/..."
                                    />
                                </InputGroup>
                                <InputGroup label="State" required>
                                    <SearchableInput
                                        name="state"
                                        value={formData.state}
                                        onChange={(e) => {
                                            handleInputChange(e);
                                        }}
                                        onSelect={(val) => handleInputChange({ target: { name: 'state', value: val } })}
                                        options={Object.keys(INDIAN_LOCATIONS)}
                                        placeholder="Select State"
                                        required
                                    />
                                </InputGroup>
                                <InputGroup label="City" required>
                                    <SearchableInput
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        onSelect={(val) => handleInputChange({ target: { name: 'city', value: val } })}
                                        options={formData.state ? (INDIAN_LOCATIONS[formData.state] || []) : []}
                                        placeholder="Select City"
                                        required
                                        disabled={!formData.state}
                                    />
                                </InputGroup>
                            </div>

                            {/* Section 2: Contact Information */}
                            <SectionHeader title="Contact Information" icon={Phone} />

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-x-6 gap-y-6 mb-4">
                                <InputGroup label="Onsite Contact Name" required>
                                    <TextInput
                                        type="text"
                                        name="onsite_contact_name"
                                        value={formData.onsite_contact_name}
                                        onChange={handleInputChange}
                                        placeholder="Person Name"
                                        required
                                    />
                                </InputGroup>
                                <InputGroup label="Onsite Contact Mobile" required>
                                    <TextInput
                                        type="tel"
                                        name="onsite_contact_mobile"
                                        value={formData.onsite_contact_mobile}
                                        onChange={handleInputChange}
                                        placeholder="00000 00000"
                                        maxLength={10}
                                        required
                                    />
                                </InputGroup>
                            </div>

                            <SectionHeader title="Influencer Status" icon={User} />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                <InputGroup label="Main Influencer Status">
                                    <SelectInput
                                        name="main_influencer_status"
                                        value={formData.main_influencer_status}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select Status</option>
                                        <option value="Old">Old</option>
                                        <option value="New">New</option>
                                    </SelectInput>
                                </InputGroup>
                                <InputGroup label="Secondary Influencer Status">
                                    <SelectInput
                                        name="secondary_influencer_status"
                                        value={formData.secondary_influencer_status}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select Status</option>
                                        <option value="Old">Old</option>
                                        <option value="New">New</option>
                                    </SelectInput>
                                </InputGroup>
                            </div>

                            {/* Action Static Bar */}
                            <div className="mt-12 pt-6 border-t border-border flex items-center justify-end gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData(INITIAL_FORM_STATE)}
                                    className="px-6 py-2.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground font-medium transition-colors text-sm"
                                >
                                    Reset Form
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-2.5 rounded-xl hover:bg-primary/90 transition-all font-semibold disabled:opacity-50 text-sm shadow-sm"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {submitting ? 'Saving...' : 'Save Site'}
                                </button>
                            </div>
                        </form>
                    </div >
                ) : (
                    <div className="flex flex-col h-full bg-muted/10">
                        {/* Search Toolbar */}
                        <div className="p-4 border-b border-border bg-card flex flex-wrap gap-3 items-center justify-between sticky top-0 z-20">
                            <div className="relative flex-1 min-w-[280px] max-w-md group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search by Site ID, City, or Contact..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-muted/30 rounded-xl border border-transparent focus:bg-background focus:border-border focus:shadow-sm outline-none transition-all placeholder:text-muted-foreground/70"
                                />
                            </div>
                            <button
                                onClick={fetchSites}
                                className="p-2.5 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-all active:scale-95"
                                title="Refresh"
                            >
                                <Loader2 className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {/* List Content */}
                        <div className="flex-1 overflow-auto custom-scrollbar p-0">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground/50">
                                    <Loader2 className="w-8 h-8 animate-spin mb-3 text-muted-foreground" />
                                    <p className="text-sm">Loading sites...</p>
                                </div>
                            ) : filteredSites.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-muted/30 sticky top-0 z-10 backdrop-blur-sm">
                                        <tr className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold border-b border-border">
                                            <th className="px-4 py-3 whitespace-nowrap">Site ID</th>
                                            <th className="px-4 py-3 whitespace-nowrap">City</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Area / Location</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Address</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Contact Name</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Contact Mobile</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Main Inf. Status</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Sec. Inf. Status</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Created At</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40 bg-card">
                                        {filteredSites.map((site) => (
                                            <tr key={site.site_id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap font-medium">{site.site_id}</td>
                                                <td className="px-4 py-3 text-xs whitespace-nowrap">{site.city}</td>
                                                <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">{site.address_area_street_locality}</td>
                                                <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground max-w-[200px] truncate" title={site.address_plot_house_flat_building}>
                                                    {site.address_plot_house_flat_building}
                                                </td>
                                                <td className="px-4 py-3 text-xs whitespace-nowrap">{site.onsite_contact_name}</td>
                                                <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">{site.onsite_contact_mobile}</td>
                                                <td className="px-4 py-3 text-xs whitespace-nowrap">
                                                    {site.main_influencer_status && (
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${site.main_influencer_status === 'New'
                                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                                            }`}>
                                                            {site.main_influencer_status}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-xs whitespace-nowrap">
                                                    {site.secondary_influencer_status && (
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${site.secondary_influencer_status === 'New'
                                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                                            }`}>
                                                            {site.secondary_influencer_status}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                                                    {new Date(site.created_at).toLocaleDateString('en-GB')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-32 text-muted-foreground/30">
                                    <MapPin className="w-12 h-12 mb-4 opacity-50" />
                                    <p className="font-medium text-muted-foreground">No sites found</p>
                                    <p className="text-xs mt-1 text-muted-foreground/70">Try adjusting your search</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div >
        </div >
    );
};

export default AddSites;
