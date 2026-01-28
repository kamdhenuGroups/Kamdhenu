import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createCustomer, fetchContractors, fetchUsers, getSiteCount, idGenerator, checkSiteIdExists, checkPhoneNumberExists } from '../services/addCustomerService';
import {
    Search, Phone,
    Loader2, Save,
    ChevronDown,
    User,
    MapPin,
    X,
    Building,
    Users
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { INDIAN_LOCATIONS } from '../data/indianLocations';

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

const InputGroup = ({ label, required, children, className = "", action }) => (
    <div className={`space-y-1.5 ${className}`}>
        <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider ml-0.5">
                {label} {required && <span className="text-destructive">*</span>}
            </label>
            {action}
        </div>
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

    useLayoutEffect(() => {
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
        if (options.includes(props.value)) return options;
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
        // Determine if we should close or keep open?
        // Usually clearing means "let me start over", but we can close it to be clean.
        // User can click again to search.
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

const MultiSearchableInput = ({ options = [], value = [], onSelect, onRemove, placeholder, maxSelected, ...props }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef(null);
    const dropdownRef = useRef(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, bottom: 0 });
    const [openUpwards, setOpenUpwards] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            const isOutsideWrapper = wrapperRef.current && !wrapperRef.current.contains(event.target);
            const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target);
            if (isOutsideWrapper && isOutsideDropdown) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const updatePosition = () => {
        if (!wrapperRef.current) return;
        const rect = wrapperRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropdownHeight = 250;
        const shouldOpenUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
        setCoords({ left: rect.left, top: rect.bottom + 4, bottom: rect.top - 4, width: rect.width });
        setOpenUpwards(shouldOpenUp);
    };

    useLayoutEffect(() => {
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

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !value.some(v => v.value === opt.value)
    );

    return (
        <div className="space-y-3" ref={wrapperRef}>
            {value.length > 0 && (
                <div className="flex flex-wrap gap-2 p-1">
                    {value.map(v => (
                        <span key={v.value} className="bg-primary/10 text-primary pl-3 pr-2 py-1 rounded-full text-sm flex items-center gap-2 border border-primary/20 animate-in fade-in zoom-in duration-200">
                            {v.label}
                            <button
                                type="button"
                                onClick={() => onRemove(v)}
                                className="bg-white/20 hover:bg-destructive hover:text-white text-primary rounded-full p-0.5 transition-all"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            {(!maxSelected || value.length < maxSelected) && (
                <div className="relative">
                    <TextInput
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setIsOpen(true); }}
                        onFocus={() => { setIsOpen(true); updatePosition(); }}
                        placeholder={value.length === 0 ? placeholder : "Add another..."}
                    />
                    {createPortal(
                        isOpen && filteredOptions.length > 0 ? (
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
                                        key={option.value}
                                        type="button"
                                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors first:rounded-t-lg last:rounded-b-lg"
                                        onClick={() => {
                                            onSelect(option);
                                            setSearchTerm('');
                                        }}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        ) : null,
                        document.body
                    )}
                </div>
            )}
        </div>
    );
};

const CustomSelect = ({ options = [], value, onChange, placeholder = "Select...", className = "" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);
    const dropdownRef = useRef(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, bottom: 0 });
    const [openUpwards, setOpenUpwards] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            const isOutsideWrapper = wrapperRef.current && !wrapperRef.current.contains(event.target);
            const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target);
            if (isOutsideWrapper && isOutsideDropdown) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const updatePosition = useCallback(() => {
        if (!wrapperRef.current) return;
        const rect = wrapperRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropdownHeight = 250;
        const shouldOpenUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

        setCoords({
            left: rect.left,
            top: rect.bottom + 4,
            bottom: rect.top - 4,
            width: rect.width
        });
        setOpenUpwards(shouldOpenUp);
    }, []);

    useLayoutEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
        }
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen, updatePosition]);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div ref={wrapperRef} className="relative">
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={`flex w-full items-center justify-between rounded-xl border border-input bg-background/50 px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-ring/50 hover:bg-background ${className}`}
            >
                <span className={`block truncate ${!selectedOption ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={`h-4 w-4 opacity-50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {createPortal(
                isOpen ? (
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
                        className="bg-popover text-popover-foreground border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto custom-scrollbar ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100 p-1"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`relative flex w-full cursor-pointer select-none items-center rounded-lg px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${value === option.value ? 'bg-accent text-accent-foreground font-medium' : ''}`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                ) : null,
                document.body
            )}
        </div>
    );
};

const SiteIdPreview = ({ rawId }) => {
    const [isDuplicate, setIsDuplicate] = useState(false);

    useEffect(() => {
        let active = true;
        const check = async () => {
            if (!rawId || rawId.includes('XX')) {
                if (active) setIsDuplicate(false);
                return;
            }
            try {
                const exists = await checkSiteIdExists(rawId);
                if (active) setIsDuplicate(exists);
            } catch (err) {
                console.error("Check failed", err);
            }
        };
        // Debounce slightly to prevent spamming while typing if logic depended on typing (it doesn't strongly, but safe practice)
        const timer = setTimeout(check, 300);
        return () => { active = false; clearTimeout(timer); };
    }, [rawId]);

    if (!rawId) {
        return (
            <div className="flex flex-col items-start sm:items-end gap-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Site ID (Preview)</span>
                <div className="flex items-center gap-2 text-base font-medium text-muted-foreground/50 px-3 py-1 select-none">
                    MMYY / City / RM - Site ID
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-start sm:items-end gap-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                Site ID (Preview)
                {isDuplicate && <span className="text-destructive font-bold text-[10px] animate-pulse ml-1">(EXISTS)</span>}
            </span>
            <div className={`flex items-center gap-3 text-lg font-bold px-4 py-1.5 rounded-xl border shadow-sm transition-all hover:shadow-md ${isDuplicate ? 'text-destructive bg-destructive/5 border-destructive/20' : 'text-primary bg-primary/5 border-primary/10 hover:bg-primary/10'}`}>
                <div className={`w-2.5 h-2.5 rounded-full animate-pulse shrink-0 ${isDuplicate ? 'bg-destructive shadow-[0_0_8px_rgba(var(--destructive),0.5)]' : 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]'}`}></div>
                <span className="truncate">{rawId.replace(/\//g, ' / ').replace(/-/g, ' - ')}</span>
            </div>
            {isDuplicate && <span className="text-[10px] text-destructive font-medium hidden sm:inline">ID already in database!</span>}
        </div>
    );
};

// -- Constants --

const INITIAL_SITE_STATE = {
    // -- Site Address Fields --
    address_plot_house_flat_building: '',
    address_area_street_locality: '',
    address_landmark: '',
    map_link: '',
    state: '',
    city: '',

    // -- Site Contact Fields --
    onsite_contact_name: '',
    onsite_contact_mobile: '',

    // -- Assigned Influencers --
    main_influencer: null,
    additional_influencers: [],

    // -- UI State --
    isCollapsed: true,
};

const INITIAL_FORM_STATE = {
    customer_name: '',
    firm_name: '',

    primary_phone: '',
    secondary_phone: '',
    email: '',
    gst_number: '',
    is_gst_registered: true,
    gst_billing_address: '',

    address_line1: '',
    area: '',
    locality: '',
    city: '',
    state: '',

    sites: [{ ...INITIAL_SITE_STATE, temp_id: 1 }]
};

const AddCustomers = () => {
    // Get current user for created_by
    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('user')) || {};
        } catch {
            return {};
        }
    }, []);

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [contractors, setContractors] = useState([]);
    const [users, setUsers] = useState([]);
    const [cityCounts, setCityCounts] = useState({});
    const scrollContainerRef = useRef(null);

    const [phoneError, setPhoneError] = useState('');
    const [isPhoneChecking, setIsPhoneChecking] = useState(false);

    useEffect(() => {
        const checkPhone = async () => {
            const phone = formData.primary_phone;
            if (!phone || phone.length < 10) {
                setPhoneError('');
                return;
            }

            setIsPhoneChecking(true);
            try {
                const exists = await checkPhoneNumberExists(phone);
                if (exists) {
                    setPhoneError('Phone number already exists in database');
                } else {
                    setPhoneError('');
                }
            } catch (error) {
                console.error("Phone check error", error);
            } finally {
                setIsPhoneChecking(false);
            }
        };

        const debounce = setTimeout(checkPhone, 500);
        return () => clearTimeout(debounce);
    }, [formData.primary_phone]);

    // Fetch site count for a city code (and user) if not already loaded
    const fetchCityCount = async (city, userId) => {
        if (!city || !userId) return;
        const cityCode = idGenerator.getCityCode(city);
        const key = `${userId}_${cityCode}`;

        if (cityCounts[key] !== undefined) return;

        try {
            const siteNumber = await getSiteCount(userId, city);
            setCityCounts(prev => ({
                ...prev,
                [key]: siteNumber
            }));
        } catch (error) {
            console.error(`Error fetching count for ${city}:`, error);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const [contractorData, userData] = await Promise.all([
                    fetchContractors(),
                    fetchUsers()
                ]);

                if (contractorData) {
                    const formatted = contractorData
                        .filter(c => c.customer_type !== 'Mistry')
                        .map(c => ({
                            value: c.contractor_id,
                            label: `${c.contractor_name || c.mistry_name || 'Unknown'} - ${c.customer_type} - ${c.contractor_id}`,
                            // Store type if needed for other logic, though we just filtered Mistry out
                            type: c.customer_type
                        }));
                    setContractors(formatted);
                }
                if (userData) {
                    setUsers(userData);
                }
            } catch (err) {
                console.error("Failed to load data", err);
                toast.error("Failed to load initial data");
            }
        };
        loadData();
    }, []);



    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        let finalValue = type === 'checkbox' ? checked : value;

        // Phone Number Validation: Only numbers, max 10 digits
        if (name === 'primary_phone' || name === 'secondary_phone' || name === 'onsite_contact_mobile') {
            finalValue = value.replace(/\D/g, '').slice(0, 10);
        }

        // Capitalization for GSTIN and PAN
        if (name === 'gst_number') {
            finalValue = value.toUpperCase();
        }

        setFormData(prev => {
            // If switching to Unregistered (No), reset the entire form
            if (name === 'is_gst_registered' && finalValue === false && prev.is_gst_registered === true) {
                return {
                    ...INITIAL_FORM_STATE,
                    is_gst_registered: false,
                    sites: [{ ...INITIAL_SITE_STATE, temp_id: Date.now() }]
                };
            }

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

    const handleSiteChange = (index, field, value) => {
        let selectedSiteUser = null;

        setFormData(prev => {
            const newSites = [...prev.sites];
            newSites[index] = {
                ...newSites[index],
                [field]: value
            };

            // Handle User selection special case
            if (field === 'selectedUserId') {
                const foundUser = users.find(u => u.user_id === value);
                newSites[index].selectedUser = foundUser;
                // Remove the temp field if desired, or keep it.
                selectedSiteUser = foundUser;
            } else {
                selectedSiteUser = newSites[index].selectedUser || user;
            }

            // Site-specific logic
            if (field === 'onsite_contact_mobile') {
                newSites[index][field] = value.replace(/\D/g, '').slice(0, 10);
            }
            if (field === 'state') {
                newSites[index].city = '';
            }

            return { ...prev, sites: newSites };
        });

        // Trigger fetch for city count if city changed or user changed
        if (field === 'city' && value) {
            const currentUserForSite = formData.sites[index].selectedUser || user;
            fetchCityCount(value, currentUserForSite.user_id);
        }
        if (field === 'selectedUserId' && selectedSiteUser && formData.sites[index].city) {
            fetchCityCount(formData.sites[index].city, selectedSiteUser.user_id);
        }
    };

    const addSite = () => {
        setFormData(prev => ({
            ...prev,
            sites: [...prev.sites, { ...INITIAL_SITE_STATE, temp_id: Date.now() }]
        }));
    };

    const removeSite = (index) => {
        if (formData.sites.length === 1) {
            toast.error("At least one site is required");
            return;
        }
        setFormData(prev => ({
            ...prev,
            sites: prev.sites.filter((_, i) => i !== index)
        }));
    };

    const toggleSiteCollapse = (index) => {
        setFormData(prev => {
            const newSites = [...prev.sites];
            newSites[index] = {
                ...newSites[index],
                isCollapsed: !newSites[index].isCollapsed
            };
            return { ...prev, sites: newSites };
        });
    };

    const getGeneratedSiteId = (site, index) => {
        const siteOwner = site.selectedUser || user;
        const date = new Date();
        const mm = (date.getMonth() + 1).toString().padStart(2, '0');
        const yy = date.getFullYear().toString().slice(-2);

        let rmCode = 'XXX';
        try {
            rmCode = idGenerator.getRMCode(siteOwner);
        } catch (e) {
            // Fallback
        }

        if (!site.city) return null;

        const cityCode = idGenerator.getCityCode(site.city);
        let siteCountSuffix = 'XX';

        const countKey = `${siteOwner.user_id}_${cityCode}`;
        const baseCount = cityCounts[countKey];

        if (baseCount !== undefined) {
            const offset = formData.sites
                .slice(0, index)
                .filter(s => {
                    const sOwner = s.selectedUser || user;
                    return idGenerator.getCityCode(s.city) === cityCode && sOwner.user_id === siteOwner.user_id;
                })
                .length;
            const currentCount = baseCount + offset;
            siteCountSuffix = currentCount < 10 ? `0${currentCount}` : currentCount;
        }

        return `${mm}${yy}/${cityCode}/${rmCode}-${siteCountSuffix}`;
    };

    const validateForm = () => {
        if (!formData.customer_name?.trim()) return 'Customer Name is required';
        if (!formData.primary_phone?.trim()) return 'Primary Phone is required';
        if (formData.primary_phone.length !== 10) return 'Primary Phone must be exactly 10 digits';
        if (phoneError) return phoneError;
        if (formData.secondary_phone && formData.secondary_phone.length !== 10) return 'Secondary Phone must be exactly 10 digits';
        if (formData.is_gst_registered && !formData.gst_number?.trim()) return 'GST Number is required when GST Registered is selected';
        if (formData.is_gst_registered && !formData.firm_name?.trim()) return 'Firm Name is required when GST Registered is selected';


        // Validate Sites
        const generatedSiteIds = new Set();
        for (let i = 0; i < formData.sites.length; i++) {
            const site = formData.sites[i];
            if (!site.address_plot_house_flat_building?.trim()) return `Site ${i + 1}: Address/Plot is required`;
            if (!site.address_area_street_locality?.trim()) return `Site ${i + 1}: Street/Locality is required`;
            if (!site.state?.trim()) return `Site ${i + 1}: State is required`;
            if (!site.city?.trim()) return `Site ${i + 1}: City is required`;
            if (!site.onsite_contact_name?.trim()) return `Site ${i + 1}: Contact Name is required`;
            if (!site.onsite_contact_mobile?.trim()) return `Site ${i + 1}: Contact Mobile is required`;
            if (site.onsite_contact_mobile.length !== 10) return `Site ${i + 1}: Contact Mobile must be 10 digits`;

            const siteId = getGeneratedSiteId(site, i);
            if (siteId && !siteId.includes('XX')) {
                if (generatedSiteIds.has(siteId)) {
                    return `Duplicate Site ID detected in form: ${siteId}. Please check city and user assignments.`;
                }
                generatedSiteIds.add(siteId);
            }
        }

        return null;
    };



    const handleSubmit = async (e) => {
        e.preventDefault();

        const error = validateForm();
        if (error) {
            toast.error(error);
            return;
        }

        setSubmitting(true);

        try {

            await createCustomer(formData, user);



            toast.success('Customer added successfully!');
            setFormData(INITIAL_FORM_STATE);
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (error) {
            console.error('Error adding customer:', error);
            toast.error(`Error adding customer: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };



    const customerIdPreview = useMemo(() => {
        const phone = formData.primary_phone || '';
        const phonePart = phone.length >= 4 ? phone.slice(-4) : 'Last 4 Digit Phone';

        const primarySite = formData.sites[0];
        const city = primarySite?.city || '';

        let cityPart = 'City';
        if (city) {
            if (city.trim().toLowerCase() === 'raipur') {
                cityPart = 'RPR';
            } else if (city.length >= 3) {
                cityPart = city.substring(0, 3).toUpperCase();
            }
        }

        const namePart = formData.customer_name?.trim() || 'Name';

        return `CU/${phonePart}/${cityPart}/${namePart}`;
    }, [formData.primary_phone, formData.sites, formData.customer_name]);

    return (
        <div className="h-full flex flex-col gap-6 max-w-screen-2xl mx-auto w-full p-4 lg:p-8 bg-background/50">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-light text-foreground tracking-tight">Customer Management</h1>
                    <p className="text-muted-foreground text-sm mt-1">Manage your client database and relationships.</p>
                </div>


            </div>

            <div className="flex-1 min-h-0 bg-card rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col relative">

                <div className="flex-1 overflow-auto custom-scrollbar" ref={scrollContainerRef}>
                    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto p-6 md:p-10 pb-32">



                        {/* Registration Status & Customer ID Preview */}
                        <div className="flex flex-col sm:flex-row gap-6 mb-6">
                            {/* Registration Status */}
                            <div className="shrink-0">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider ml-0.5 mb-2 block">
                                    Is Customer GST Registered?
                                </label>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleInputChange({ target: { name: 'is_gst_registered', value: true, type: 'checkbox', checked: true } })}
                                        className={`h-9 px-4 rounded-xl border transition-all flex items-center justify-center gap-2 min-w-[140px] ${formData.is_gst_registered
                                            ? 'border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/20'
                                            : 'border-input hover:border-primary/50 text-muted-foreground bg-background/50'
                                            }`}
                                    >
                                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${formData.is_gst_registered ? 'border-primary' : 'border-muted-foreground'}`}>
                                            {formData.is_gst_registered && <div className="w-2 h-2 rounded-full bg-primary" />}
                                        </div>
                                        <span className="font-medium text-sm">Yes, Registered</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleInputChange({ target: { name: 'is_gst_registered', value: false, type: 'checkbox', checked: false } })}
                                        className={`h-9 px-4 rounded-xl border transition-all flex items-center justify-center gap-2 min-w-[140px] ${!formData.is_gst_registered
                                            ? 'border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/20'
                                            : 'border-input hover:border-primary/50 text-muted-foreground bg-background/50'
                                            }`}
                                    >
                                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${!formData.is_gst_registered ? 'border-primary' : 'border-muted-foreground'}`}>
                                            {!formData.is_gst_registered && <div className="w-2 h-2 rounded-full bg-primary" />}
                                        </div>
                                        <span className="font-medium text-sm">No, Unregistered</span>
                                    </button>
                                </div>
                            </div>

                            {/* Customer ID Preview */}
                            <div className="flex-1 flex flex-col items-start sm:items-end justify-end">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider ml-0.5 mb-2 block">
                                    Customer ID (Preview)
                                </label>
                                <div className="flex items-center gap-3 text-lg font-bold text-primary bg-primary/5 px-4 py-1.5 rounded-xl border border-primary/10 shadow-sm transition-all hover:bg-primary/10 hover:shadow-md max-w-full">
                                    <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)] shrink-0"></div>
                                    <span className="truncate">{customerIdPreview.replace(/\//g, ' / ')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Section 1: Identity & GST */}
                        <SectionHeader
                            title={formData.is_gst_registered ? "Business Details" : "Basic Information"}
                            icon={User}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-4">
                            {/* GST Number - First if Registered */}
                            {formData.is_gst_registered && (
                                <InputGroup label="GST Number" required>
                                    <div className="relative">
                                        <TextInput
                                            type="text"
                                            name="gst_number"
                                            value={formData.gst_number}
                                            onChange={(e) => {
                                                handleInputChange(e);
                                                // Placeholder for API Fetch
                                                if (e.target.value.length === 15) {
                                                    toast('Fetching details...', { icon: '🔄', duration: 1500 });
                                                }
                                            }}
                                            placeholder="Enter 15-digit GSTIN"
                                            maxLength={15}
                                            className="uppercase"
                                        />
                                        {/* Visual indicator for API Fetch */}
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary font-medium pointer-events-none opacity-0 transition-opacity">
                                            Auto-fetching...
                                        </div>
                                    </div>
                                </InputGroup>
                            )}

                            <InputGroup label={formData.is_gst_registered ? "Firm Name" : "Customer Name"} required>
                                <TextInput
                                    type="text"
                                    name={formData.is_gst_registered ? "firm_name" : "customer_name"}
                                    value={formData.is_gst_registered ? formData.firm_name : formData.customer_name}
                                    onChange={handleInputChange}
                                    placeholder={formData.is_gst_registered ? "Enter Firm Name" : "Enter Customer Name"}
                                    required
                                    className="h-12 text-base"
                                />
                            </InputGroup>



                            {formData.is_gst_registered && (
                                <InputGroup label="Billing Address">
                                    <TextInput
                                        type="text"
                                        name="gst_billing_address"
                                        value={formData.gst_billing_address || ''}
                                        onChange={handleInputChange}
                                        placeholder="Building, Street, Landmark, Area Address..."
                                    />
                                </InputGroup>
                            )}

                            {!formData.is_gst_registered && (
                                <>
                                    <InputGroup label="Primary Phone" required>
                                        <TextInput
                                            type="tel"
                                            name="primary_phone"
                                            value={formData.primary_phone}
                                            onChange={handleInputChange}
                                            placeholder="00000 00000"
                                            maxLength={10}
                                            required
                                            className={phoneError ? "border-destructive focus-visible:ring-destructive" : ""}
                                        />
                                        {phoneError && <span className="text-xs text-destructive font-bold animate-pulse">{phoneError}</span>}
                                        {isPhoneChecking && <span className="text-xs text-muted-foreground font-medium animate-pulse">Checking availability...</span>}
                                    </InputGroup>
                                    <InputGroup label="Secondary Phone">
                                        <TextInput
                                            type="tel"
                                            name="secondary_phone"
                                            value={formData.secondary_phone}
                                            onChange={handleInputChange}
                                            placeholder="00000 00000"
                                            maxLength={10}
                                        />
                                    </InputGroup>
                                    <InputGroup label="Email Address">
                                        <TextInput
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            placeholder="name@example.com"
                                        />
                                    </InputGroup>
                                </>
                            )}
                        </div>



                        {/* Section 3: Contact Details */}
                        {formData.is_gst_registered && (
                            <>
                                <SectionHeader title="Contact Information" icon={Phone} />

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                                    {formData.is_gst_registered && (
                                        <InputGroup label="Customer Name" required>
                                            <TextInput
                                                type="text"
                                                name="customer_name"
                                                value={formData.customer_name}
                                                onChange={handleInputChange}
                                                placeholder="Enter Customer Name"
                                                required
                                            />
                                        </InputGroup>
                                    )}
                                    <InputGroup label="Primary Phone" required>
                                        <TextInput
                                            type="tel"
                                            name="primary_phone"
                                            value={formData.primary_phone}
                                            onChange={handleInputChange}
                                            placeholder="00000 00000"
                                            maxLength={10}
                                            required
                                            className={phoneError ? "border-destructive focus-visible:ring-destructive" : ""}
                                        />
                                        {phoneError && <span className="text-xs text-destructive font-bold animate-pulse">{phoneError}</span>}
                                        {isPhoneChecking && <span className="text-xs text-muted-foreground font-medium animate-pulse">Checking availability...</span>}
                                    </InputGroup>
                                    <InputGroup label="Secondary Phone">
                                        <TextInput
                                            type="tel"
                                            name="secondary_phone"
                                            value={formData.secondary_phone}
                                            onChange={handleInputChange}
                                            placeholder="00000 00000"
                                            maxLength={10}
                                        />
                                    </InputGroup>
                                    <InputGroup label="Email Address">
                                        <TextInput
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            placeholder="name@example.com"
                                        />
                                    </InputGroup>
                                </div>
                            </>
                        )}

                        {/* Sites Section */}
                        <SectionHeader title="Site Assignment" icon={MapPin} />
                        <div className="space-y-8">
                            {formData.sites.map((site, index) => (
                                <div key={site.temp_id} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden transition-all hover:shadow-md">
                                    {/* Site Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/30 border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleSiteCollapse(index)}>
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                                                {index + 1}
                                            </div>

                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1">
                                                <span className="font-semibold text-foreground/80 whitespace-nowrap">Site Details</span>

                                                {/* Separator */}
                                                <div className="hidden sm:block h-4 w-px bg-border/60"></div>

                                                {/* User Selection Dropdown */}
                                                {user.Admin === 'Yes' && (
                                                    <div className="w-full sm:w-64" onClick={(e) => e.stopPropagation()}>
                                                        <CustomSelect
                                                            value={site.selectedUser ? site.selectedUser.user_id : user.user_id}
                                                            onChange={(val) => handleSiteChange(index, 'selectedUserId', val)}
                                                            className="h-9 text-sm bg-background"
                                                            placeholder="Select User"
                                                            options={[
                                                                { value: user.user_id, label: `Me (${user.full_name || user.Name})` },
                                                                ...users.filter(u => u.user_id !== user.user_id && u.role === 'RM' && u.department === 'SALES').map(u => ({
                                                                    value: u.user_id,
                                                                    label: u.full_name || u.username
                                                                }))
                                                            ]}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pl-12 sm:pl-0">
                                            {(() => {
                                                const rawId = getGeneratedSiteId(site, index);
                                                return <SiteIdPreview rawId={rawId} />;
                                            })()}

                                            <div className="h-4 w-px bg-border mx-1"></div>

                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); toggleSiteCollapse(index); }}
                                                className="p-1.5 hover:bg-background rounded-lg transition-all text-muted-foreground hover:text-foreground border border-transparent hover:border-border/50"
                                                title={site.isCollapsed ? "Expand" : "Collapse"}
                                            >
                                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${site.isCollapsed ? '' : 'rotate-180'}`} />
                                            </button>

                                            {formData.sites.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); removeSite(index); }}
                                                    className="p-1.5 hover:bg-destructive/10 rounded-lg transition-all text-muted-foreground hover:text-destructive border border-transparent hover:border-destructive/20"
                                                    title="Remove Site"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {!site.isCollapsed && (
                                        <div className="p-6 md:p-8 animate-in slide-in-from-top-2 duration-200">
                                            {/* Section 4: Site Address */}
                                            <SectionHeader title="Site Address" icon={Building} />

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                                <div className="md:col-span-2">
                                                    {/* Site ID Input from body removed as requested */}

                                                </div>
                                                <div className="md:col-span-2">
                                                    <InputGroup label="Plot / House / Flat / Building No" required>
                                                        <TextInput
                                                            type="text"
                                                            value={site.address_plot_house_flat_building}
                                                            onChange={(e) => handleSiteChange(index, 'address_plot_house_flat_building', e.target.value)}
                                                            placeholder="e.g. Plot No 24, Sunshine Apartments..."
                                                            required
                                                        />
                                                    </InputGroup>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <InputGroup label="Street / Colony / Area" required>
                                                        <TextInput
                                                            type="text"
                                                            value={site.address_area_street_locality}
                                                            onChange={(e) => handleSiteChange(index, 'address_area_street_locality', e.target.value)}
                                                            placeholder="e.g. Main Street, Sector 15..."
                                                            required
                                                        />
                                                    </InputGroup>
                                                </div>
                                                <InputGroup label="Landmark">
                                                    <TextInput
                                                        type="text"
                                                        value={site.address_landmark}
                                                        onChange={(e) => handleSiteChange(index, 'address_landmark', e.target.value)}
                                                        placeholder="Near..."
                                                    />
                                                </InputGroup>
                                                <InputGroup label="Google Maps Link">
                                                    <TextInput
                                                        type="url"
                                                        value={site.map_link}
                                                        onChange={(e) => handleSiteChange(index, 'map_link', e.target.value)}
                                                        placeholder="https://maps.google.com/..."
                                                    />
                                                </InputGroup>
                                                <InputGroup label="State" required>
                                                    <SearchableInput
                                                        name="state"
                                                        value={site.state}
                                                        onChange={(e) => {
                                                            handleSiteChange(index, 'state', e.target.value);
                                                        }}
                                                        onSelect={(val) => handleSiteChange(index, 'state', val)}
                                                        options={Object.keys(INDIAN_LOCATIONS)}
                                                        placeholder="Select State"
                                                        required
                                                    />
                                                </InputGroup>
                                                <InputGroup label="City" required>
                                                    <SearchableInput
                                                        name="city"
                                                        value={site.city}
                                                        onChange={(e) => handleSiteChange(index, 'city', e.target.value)}
                                                        onSelect={(val) => handleSiteChange(index, 'city', val)}
                                                        options={site.state ? (INDIAN_LOCATIONS[site.state] || []) : []}
                                                        placeholder="Select City"
                                                        required
                                                        disabled={!site.state}
                                                    />
                                                </InputGroup>
                                            </div>

                                            {/* Section 5: Onsite Contact */}
                                            <SectionHeader title="Onsite Contact Information" icon={Phone} />

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-x-6 gap-y-6 mb-4">
                                                <InputGroup label="Onsite Contact Name" required>
                                                    <TextInput
                                                        type="text"
                                                        value={site.onsite_contact_name}
                                                        onChange={(e) => handleSiteChange(index, 'onsite_contact_name', e.target.value)}
                                                        placeholder="Person Name"
                                                        required
                                                    />
                                                </InputGroup>
                                                <InputGroup label="Onsite Contact Mobile" required>
                                                    <TextInput
                                                        type="tel"
                                                        value={site.onsite_contact_mobile}
                                                        onChange={(e) => handleSiteChange(index, 'onsite_contact_mobile', e.target.value)}
                                                        placeholder="00000 00000"
                                                        maxLength={10}
                                                        required
                                                    />
                                                </InputGroup>
                                            </div>

                                            {/* Section 6: Assign Influencers */}
                                            <SectionHeader title="Assign Influencers" icon={Users} />

                                            <div className="grid grid-cols-1 gap-6 mb-4">
                                                <InputGroup
                                                    label="Select Main Influencer"
                                                    action={
                                                        site.main_influencer && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSiteChange(index, 'main_influencer', null)}
                                                                className="text-xs text-destructive hover:text-destructive/80 font-medium px-2 py-0.5 rounded hover:bg-destructive/10 transition-colors"
                                                            >
                                                                Clear
                                                            </button>
                                                        )
                                                    }
                                                >
                                                    <MultiSearchableInput
                                                        options={contractors.filter(c => !site.additional_influencers?.some(ai => ai.value === c.value))}
                                                        value={site.main_influencer ? [site.main_influencer] : []}
                                                        onSelect={(option) => {
                                                            handleSiteChange(index, 'main_influencer', option);
                                                        }}
                                                        onRemove={() => {
                                                            handleSiteChange(index, 'main_influencer', null);
                                                        }}
                                                        placeholder="Select Main Influencer..."
                                                        maxSelected={1}
                                                    />
                                                </InputGroup>

                                                <InputGroup
                                                    label="Add Additional Influencers"
                                                    action={
                                                        site.additional_influencers?.length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSiteChange(index, 'additional_influencers', [])}
                                                                className="text-xs text-destructive hover:text-destructive/80 font-medium px-2 py-0.5 rounded hover:bg-destructive/10 transition-colors"
                                                            >
                                                                Clear All
                                                            </button>
                                                        )
                                                    }
                                                >
                                                    <MultiSearchableInput
                                                        options={contractors.filter(c => c.value !== site.main_influencer?.value)}
                                                        value={site.additional_influencers}
                                                        onSelect={(option) => {
                                                            const currentInfluencers = site.additional_influencers || [];
                                                            handleSiteChange(index, 'additional_influencers', [...currentInfluencers, option]);
                                                        }}
                                                        onRemove={(option) => {
                                                            const currentInfluencers = site.additional_influencers || [];
                                                            handleSiteChange(index, 'additional_influencers', currentInfluencers.filter(i => i.value !== option.value));
                                                        }}
                                                        placeholder="Search to add more influencers..."
                                                    />
                                                </InputGroup>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={addSite}
                                className="w-full py-4 border-2 border-dashed border-primary/20 rounded-2xl text-primary font-medium hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="text-2xl">+</span> Add Another Site
                            </button>
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
                                {submitting ? 'Saving...' : 'Save Customer'}
                            </button>
                        </div>
                    </form>
                </div >

            </div >

            {/* Status Confirmation Modal */}

        </div >
    );
};

export default AddCustomers;
