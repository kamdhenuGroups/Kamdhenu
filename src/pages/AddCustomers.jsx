import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabase';
import {
    Search, Phone,
    Loader2, Save,
    ChevronDown,
    User,
    MapPin,
    X
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

// -- Constants --

const INITIAL_FORM_STATE = {
    customer_name: '',
    primary_phone: '',
    secondary_phone: '',
    email: '',
    gst_number: '',
    is_gst_registered: false,
    pan_number: '',
    address_line1: '',
    area: '',
    locality: '',
    city: '',
    state: ''
};

const AddCustomers = () => {
    const [activeTab, setActiveTab] = useState('new');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [statusConfirmation, setStatusConfirmation] = useState({
        isOpen: false,
        customerId: null,
        newStatus: null,
        customerName: ''
    });

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
            fetchCustomers();
        }
    }, [activeTab]);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCustomers(data || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
            toast.error('Failed to fetch customers');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        let finalValue = type === 'checkbox' ? checked : value;

        // Phone Number Validation: Only numbers, max 10 digits
        if (name === 'primary_phone' || name === 'secondary_phone') {
            finalValue = value.replace(/\D/g, '').slice(0, 10);
        }

        // Capitalization for GSTIN and PAN
        if (name === 'pan_number' || name === 'gst_number') {
            finalValue = value.toUpperCase();
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

            // Clear GST Number if is_gst_registered is unchecked
            if (name === 'is_gst_registered' && !finalValue) {
                newData.gst_number = '';
            }

            return newData;
        });
    };

    const validateForm = () => {
        if (!formData.customer_name?.trim()) return 'Customer Name is required';
        if (!formData.primary_phone?.trim()) return 'Primary Phone is required';
        if (formData.primary_phone.length !== 10) return 'Primary Phone must be exactly 10 digits';
        if (formData.secondary_phone && formData.secondary_phone.length !== 10) return 'Secondary Phone must be exactly 10 digits';
        if (formData.is_gst_registered && !formData.gst_number?.trim()) return 'GST Number is required when GST Registered is selected';
        if (!formData.pan_number?.trim()) return 'PAN Number is required';
        if (!formData.address_line1?.trim()) return 'Address Line 1 is required';
        if (!formData.area?.trim()) return 'Area is required';
        if (!formData.locality?.trim()) return 'Locality is required';
        if (!formData.city?.trim()) return 'City is required';
        if (!formData.state?.trim()) return 'State is required';
        return null;
    };

    const getCityCode = (cityName) => {
        if (!cityName) return 'XXX';
        if (cityName.trim().toLowerCase() === 'raipur') return 'RPR';
        return cityName.length >= 3 ? cityName.substring(0, 3).toUpperCase() : 'XXX';
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
            // Generate Customer ID: CU/PhoneLast4/CityFirst3/Name
            const phoneLast4 = formData.primary_phone.slice(-4);
            const cityFirst3 = getCityCode(formData.city);
            const safeName = formData.customer_name.trim();
            const customId = `CU/${phoneLast4}/${cityFirst3}/${safeName}`;

            const payload = {
                customer_id: customId,
                customer_name: formData.customer_name,
                primary_phone: formData.primary_phone,
                secondary_phone: formData.secondary_phone || null,
                email: formData.email || null,
                gst_number: formData.gst_number || null,
                is_gst_registered: formData.is_gst_registered,
                pan_number: formData.pan_number || null,
                billing_address_line: formData.address_line1,
                billing_area: formData.area || null,
                billing_locality: formData.locality || null,
                billing_city: formData.city,
                billing_state: formData.state,
                created_by_user_id: user.user_id,
            };

            const { error: insertError } = await supabase
                .from('customers')
                .insert([payload]);

            if (insertError) throw insertError;

            toast.success('Customer added successfully!');
            setFormData(INITIAL_FORM_STATE);
        } catch (error) {
            console.error('Error adding customer:', error);
            toast.error(`Error adding customer: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const initiateStatusUpdate = (customer, newStatus) => {
        setStatusConfirmation({
            isOpen: true,
            customerId: customer.customer_id,
            newStatus,
            customerName: customer.customer_name
        });
    };

    const confirmStatusUpdate = async () => {
        const { customerId, newStatus } = statusConfirmation;
        if (!customerId || !newStatus) return;

        try {
            const { error } = await supabase
                .from('customers')
                .update({ customer_status: newStatus })
                .eq('customer_id', customerId);

            if (error) throw error;

            toast.success(`Status updated to ${newStatus}`);
            setCustomers(prev => prev.map(c =>
                c.customer_id === customerId ? { ...c, customer_status: newStatus } : c
            ));
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        } finally {
            setStatusConfirmation({ isOpen: false, customerId: null, newStatus: null, customerName: '' });
        }
    };

    const filteredCustomers = useMemo(() => {
        const lowerTerm = searchTerm.toLowerCase();
        return customers.filter(customer =>
            customer.customer_name?.toLowerCase().includes(lowerTerm) ||
            customer.primary_phone?.includes(lowerTerm) ||
            customer.billing_city?.toLowerCase().includes(lowerTerm)
        );
    }, [customers, searchTerm]);

    const generatedCustomerId = useMemo(() => {
        const phoneLast4 = formData.primary_phone?.length >= 4 ? formData.primary_phone.slice(-4) : 'XXXX';
        const cityFirst3 = getCityCode(formData.city);
        const safeName = formData.customer_name?.trim() || 'NAME';
        return `CU/${phoneLast4}/${cityFirst3}/${safeName}`;
    }, [formData.primary_phone, formData.city, formData.customer_name]);

    return (
        <div className="h-full flex flex-col gap-6 max-w-screen-2xl mx-auto w-full p-4 lg:p-8 bg-background/50">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-light text-foreground tracking-tight">Customer Management</h1>
                    <p className="text-muted-foreground text-sm mt-1">Manage your client database and relationships.</p>
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
                        New Customer
                    </button>
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-full transition-all duration-300 ${activeTab === 'all'
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                            }`}
                    >
                        All Customers
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
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">New Customer ID</p>
                                        <p className="text-lg font-semibold text-foreground tracking-tight">{generatedCustomerId}</p>
                                    </div>
                                </div>
                                <div className="hidden sm:block text-xs text-muted-foreground text-right">
                                    Auto-generated based on<br />contact & location
                                </div>
                            </div>

                            {/* Section 1: Basic Information */}
                            <SectionHeader title="Basic Information" icon={User} />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-4">
                                <InputGroup label="Full Name" required className="md:col-span-2">
                                    <TextInput
                                        type="text"
                                        name="customer_name"
                                        value={formData.customer_name}
                                        onChange={handleInputChange}
                                        placeholder="Enter customer's full name"
                                        required
                                        className="h-12 text-base"
                                    />
                                </InputGroup>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider ml-0.5">
                                        Is Customer GST Registered?
                                    </label>
                                    <div className="flex items-center h-11 px-4 rounded-xl border border-input bg-background/50 transition-all duration-200 hover:border-ring/50 hover:bg-background">
                                        <label className="flex items-center gap-3 text-sm cursor-pointer w-full select-none text-foreground">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.is_gst_registered ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 bg-background'}`}>
                                                <input
                                                    type="checkbox"
                                                    name="is_gst_registered"
                                                    checked={formData.is_gst_registered}
                                                    onChange={handleInputChange}
                                                    className="sr-only"
                                                />
                                                <svg className={`w-3.5 h-3.5 ${formData.is_gst_registered ? 'block' : 'hidden'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            </div>
                                            <span>Yes, Registered</span>
                                        </label>
                                    </div>
                                </div>

                                <InputGroup label="GST Number" required={formData.is_gst_registered}>
                                    <TextInput
                                        type="text"
                                        name="gst_number"
                                        value={formData.gst_number}
                                        onChange={handleInputChange}
                                        placeholder={formData.is_gst_registered ? "Enter GSTIN" : "Not Registered"}
                                        maxLength={15}
                                        disabled={!formData.is_gst_registered}
                                        className={!formData.is_gst_registered ? "opacity-50 cursor-not-allowed bg-muted/20" : ""}
                                    />
                                </InputGroup>

                                <InputGroup label="PAN Number" required>
                                    <TextInput
                                        type="text"
                                        name="pan_number"
                                        value={formData.pan_number}
                                        onChange={handleInputChange}
                                        placeholder="Enter PAN Number"
                                        maxLength={10}
                                        required
                                    />
                                </InputGroup>
                            </div>

                            {/* Section 2: Contact Details */}
                            <SectionHeader title="Contact Details" icon={Phone} />

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6 mb-4">
                                <InputGroup label="Primary Phone" required>
                                    <TextInput
                                        type="tel"
                                        name="primary_phone"
                                        value={formData.primary_phone}
                                        onChange={handleInputChange}
                                        placeholder="00000 00000"
                                        maxLength={10}
                                        required
                                    />
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

                            {/* Section 3: Address */}
                            <SectionHeader title="Billing Address" icon={MapPin} />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <div className="md:col-span-2">
                                    <InputGroup label="Address Line 1" required>
                                        <TextInput
                                            type="text"
                                            name="address_line1"
                                            value={formData.address_line1}
                                            onChange={handleInputChange}
                                            placeholder="Building, Street, Landmark..."
                                            required
                                        />
                                    </InputGroup>
                                </div>
                                <InputGroup label="Area" required>
                                    <TextInput
                                        type="text"
                                        name="area"
                                        value={formData.area}
                                        onChange={handleInputChange}
                                        placeholder="Area Name"
                                        required
                                    />
                                </InputGroup>
                                <InputGroup label="Locality" required>
                                    <TextInput
                                        type="text"
                                        name="locality"
                                        value={formData.locality}
                                        onChange={handleInputChange}
                                        placeholder="Locality Name"
                                        required
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
                ) : (
                    <div className="flex flex-col h-full bg-muted/10">
                        {/* Search Toolbar */}
                        <div className="p-4 border-b border-border bg-card flex flex-wrap gap-3 items-center justify-between sticky top-0 z-20">
                            <div className="relative flex-1 min-w-[280px] max-w-md group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search by Name, Phone, or City..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-muted/30 rounded-xl border border-transparent focus:bg-background focus:border-border focus:shadow-sm outline-none transition-all placeholder:text-muted-foreground/70"
                                />
                            </div>
                            <button
                                onClick={fetchCustomers}
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
                                    <p className="text-sm">Loading customers...</p>
                                </div>
                            ) : filteredCustomers.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-muted/30 sticky top-0 z-10 backdrop-blur-sm">
                                        <tr className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold border-b border-border">
                                            <th className="px-4 py-3 whitespace-nowrap">Customer ID</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Name</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Primary Phone</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Secondary Phone</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Email</th>
                                            <th className="px-4 py-3 whitespace-nowrap">GST Reg.</th>
                                            <th className="px-4 py-3 whitespace-nowrap">GST Number</th>
                                            <th className="px-4 py-3 whitespace-nowrap">PAN Number</th>
                                            <th className="px-4 py-3 whitespace-nowrap">City</th>
                                            <th className="px-4 py-3 whitespace-nowrap">State</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Area</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Locality</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Address</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Created At</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40 bg-card">
                                        {filteredCustomers.map((customer) => (
                                            <tr key={customer.customer_id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{customer.customer_id}</td>
                                                <td className="px-4 py-3 text-xs font-medium text-foreground whitespace-nowrap">{customer.customer_name}</td>
                                                <td className="px-4 py-3 text-xs whitespace-nowrap">{customer.primary_phone}</td>
                                                <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">{customer.secondary_phone || '-'}</td>
                                                <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">{customer.email || '-'}</td>
                                                <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">{customer.is_gst_registered ? 'Yes' : 'No'}</td>
                                                <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">{customer.gst_number || '-'}</td>
                                                <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">{customer.pan_number || '-'}</td>
                                                <td className="px-4 py-3 text-xs whitespace-nowrap">{customer.billing_city}</td>
                                                <td className="px-4 py-3 text-xs whitespace-nowrap">{customer.billing_state}</td>
                                                <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">{customer.billing_area || '-'}</td>
                                                <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">{customer.billing_locality || '-'}</td>
                                                <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground max-w-[200px] truncate" title={customer.billing_address_line}>
                                                    {customer.billing_address_line}
                                                </td>
                                                <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                                                    {new Date(customer.created_at).toLocaleDateString('en-GB')}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="relative inline-block group/status">
                                                        <select
                                                            value={customer.customer_status || 'Active'}
                                                            onChange={(e) => initiateStatusUpdate(customer, e.target.value)}
                                                            className={`appearance-none pl-2.5 pr-7 py-1 rounded-full text-[10px] font-medium border cursor-pointer outline-none focus:ring-1 focus:ring-ring transition-all ${customer.customer_status === 'Active'
                                                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20'
                                                                : customer.customer_status === 'Inactive'
                                                                    ? 'bg-slate-500/10 text-slate-600 border-slate-500/20 hover:bg-slate-500/20'
                                                                    : 'bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20'
                                                                }`}
                                                        >
                                                            <option value="Active">Active</option>
                                                            <option value="Inactive">Inactive</option>
                                                            <option value="Blacklisted">Blacklisted</option>
                                                        </select>
                                                        <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-50 group-hover/status:opacity-100 transition-opacity ${customer.customer_status === 'Active' ? 'text-emerald-600' :
                                                            customer.customer_status === 'Inactive' ? 'text-slate-600' : 'text-rose-600'
                                                            }`} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-32 text-muted-foreground/30">
                                    <Search className="w-12 h-12 mb-4 opacity-50" />
                                    <p className="font-medium text-muted-foreground">No customers found</p>
                                    <p className="text-xs mt-1 text-muted-foreground/70">Try adjusting your search</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div >

            {/* Status Confirmation Modal */}
            {statusConfirmation.isOpen && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-sm rounded-3xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${statusConfirmation.newStatus === 'Active' ? 'bg-emerald-100 text-emerald-600' :
                                statusConfirmation.newStatus === 'Inactive' ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-600'
                                }`}>
                                <User size={24} />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">Update Credentials?</h3>
                            <p className="text-muted-foreground text-sm">
                                Are you sure you want to change status for <span className="font-medium text-foreground">{statusConfirmation.customerName}</span> to <span className={`font-medium ${statusConfirmation.newStatus === 'Active' ? 'text-emerald-600' :
                                    statusConfirmation.newStatus === 'Inactive' ? 'text-slate-600' : 'text-rose-600'
                                    }`}>{statusConfirmation.newStatus}</span>?
                            </p>
                        </div>
                        <div className="flex border-t border-border bg-muted/30 p-4 gap-3">
                            <button
                                onClick={() => setStatusConfirmation({ isOpen: false, customerId: null, newStatus: null, customerName: '' })}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmStatusUpdate}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-500/20 transition-all active:scale-95"
                            >
                                Confirm Change
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div >
    );
};

export default AddCustomers;
