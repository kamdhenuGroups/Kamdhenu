import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    User, Phone, MapPin, Save,
    Building, Users, ChevronDown,
    Search, Loader2, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { INDIAN_LOCATIONS } from '../data/indianLocations';
import { CUSTOMER_TYPES, idGenerator } from '../services/orderService';
import { addContractorService } from '../services/addContractorService';

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
        const dropdownHeight = 250;

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

const AddContractors = () => {
    const [loading, setLoading] = useState(false);

    // Form State
    const [contractorName, setContractorName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerType, setCustomerType] = useState('');
    const [nickname, setNickname] = useState('');
    const [mistryName, setMistryName] = useState('');

    // Location State
    const [selectedState, setSelectedState] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [cityCode, setCityCode] = useState('');

    // Filtered lists
    const states = Object.keys(INDIAN_LOCATIONS);

    // Update City Code when city changes
    useEffect(() => {
        if (selectedCity) {
            const code = idGenerator.getCityCode(selectedCity);
            setCityCode(code);
        } else {
            setCityCode('');
        }
    }, [selectedCity]);

    // Generate ID for preview
    const generatedId = useMemo(() => {
        return idGenerator.generateCustomerId({
            customerPhone,
            cityCode,
            contractorName,
            customerType,
            nickname,
            mistryName
        });
    }, [customerPhone, cityCode, contractorName, customerType, nickname, mistryName]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!customerType) {
            toast.error('Please select a customer type');
            return;
        }
        if (!contractorName) {
            toast.error('Please enter a name');
            return;
        }
        if (!customerPhone || customerPhone.length < 10) {
            toast.error('Please enter a valid phone number');
            return;
        }
        if (!selectedState || !selectedCity) {
            toast.error('Please select state and city');
            return;
        }
        if ((customerType === 'Contractor' || customerType === 'Mistry') && !nickname) {
            toast.error('Please enter a nickname');
            return;
        }
        if (customerType === 'Mistry' && !mistryName) {
            toast.error('Please enter a mistry name');
            return;
        }

        setLoading(true);

        try {
            const contractorPayload = {
                contractor_id: generatedId,
                contractor_name: contractorName,
                customer_phone: customerPhone.replace(/\D/g, ''), // Ensure numeric
                nickname: nickname || null,
                customer_type: customerType,
                state: selectedState,
                city: selectedCity,
                mistry_name: mistryName || null
            };

            const { data, error } = await addContractorService.createContractor(contractorPayload);

            if (error) {
                if (error.code === '23505') { // Unique violation
                    toast.error('A contractor with this ID or Nickname already exists.');
                } else {
                    throw error;
                }
            } else {
                toast.success('Contractor added successfully!');
                // Reset form
                setContractorName('');
                setCustomerPhone('');
                setCustomerType('');
                setNickname('');
                setMistryName('');
                setSelectedState('');
                setSelectedCity('');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to add contractor');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setContractorName('');
        setCustomerPhone('');
        setCustomerType('');
        setNickname('');
        setMistryName('');
        setSelectedState('');
        setSelectedCity('');
    };

    return (
        <div className="h-full flex flex-col gap-6 max-w-screen-2xl mx-auto w-full p-4 lg:p-8 bg-background/50">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-light text-foreground tracking-tight">Contractor Management</h1>
                    <p className="text-muted-foreground text-sm mt-1">Register new partners and manage profiles.</p>
                </div>
            </div>

            <div className="flex-1 min-h-0 bg-card rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col relative">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto p-6 md:p-10 pb-32">

                        {/* Generated ID Badge */}
                        <div className="mb-8 p-4 rounded-2xl bg-muted/30 border border-border flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <User size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">New Contractor ID</p>
                                    <p className="text-lg font-semibold text-foreground tracking-tight">
                                        {generatedId || 'Pending...'}
                                    </p>
                                </div>
                            </div>
                            <div className="hidden sm:block text-xs text-muted-foreground text-right">
                                Auto-generated based on<br />details provided
                            </div>
                        </div>

                        {/* Section 1: Identity */}
                        <SectionHeader title="Identity & Role" icon={User} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-4">
                            <InputGroup label="Type" required>
                                <SelectInput
                                    value={customerType}
                                    onChange={(e) => setCustomerType(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>Select Role...</option>
                                    {CUSTOMER_TYPES.filter(t => t !== 'Customer').map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </SelectInput>
                            </InputGroup>

                            <InputGroup label="Contractor's Name" required>
                                <TextInput
                                    type="text"
                                    value={contractorName}
                                    onChange={(e) => setContractorName(e.target.value)}
                                    placeholder="Enter full name"
                                    required
                                />
                            </InputGroup>
                        </div>

                        {/* Additional Info (Conditional) */}
                        {(['Contractor', 'Mistry'].includes(customerType)) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-4">
                                <InputGroup label="Nickname" required>
                                    <TextInput
                                        type="text"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        placeholder="e.g. Raju"
                                    />
                                </InputGroup>

                                {customerType === 'Mistry' && (
                                    <InputGroup label="Mistri Name" required>
                                        <TextInput
                                            type="text"
                                            value={mistryName}
                                            onChange={(e) => setMistryName(e.target.value)}
                                            placeholder="Partner's Name"
                                        />
                                    </InputGroup>
                                )}
                            </div>
                        )}

                        {/* Section 2: Contact */}
                        <SectionHeader title="Contact Information" icon={Phone} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-4">
                            <InputGroup label="Primary Phone" required>
                                <TextInput
                                    type="tel"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="9876543210"
                                    maxLength={10}
                                    required
                                />
                            </InputGroup>
                        </div>

                        {/* Section 3: Region */}
                        <SectionHeader title="Regional Details" icon={MapPin} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-4">
                            <InputGroup label="State" required>
                                <SearchableInput
                                    name="state"
                                    value={selectedState}
                                    onChange={(e) => {
                                        setSelectedState(e.target.value);
                                        setSelectedCity(''); // Reset city when state changes
                                    }}
                                    onSelect={(val) => {
                                        setSelectedState(val);
                                        setSelectedCity('');
                                    }}
                                    options={states}
                                    placeholder="Select State"
                                    required
                                />
                            </InputGroup>

                            <InputGroup label="City" required>
                                <SearchableInput
                                    name="city"
                                    value={selectedCity}
                                    onChange={(e) => setSelectedCity(e.target.value)}
                                    onSelect={(val) => setSelectedCity(val)}
                                    options={selectedState ? (INDIAN_LOCATIONS[selectedState] || []) : []}
                                    placeholder="Select City"
                                    required
                                    disabled={!selectedState}
                                />
                            </InputGroup>
                        </div>

                        {/* Action Bar */}
                        <div className="mt-12 pt-6 border-t border-border flex items-center justify-end gap-4">
                            <button
                                type="button"
                                onClick={handleReset}
                                className="px-6 py-2.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground font-medium transition-colors text-sm"
                            >
                                Reset Form
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !generatedId}
                                className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-2.5 rounded-xl hover:bg-primary/90 transition-all font-semibold disabled:opacity-50 text-sm shadow-sm"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {loading ? 'Registering...' : 'Register Contractor'}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddContractors;
