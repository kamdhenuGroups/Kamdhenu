import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    User, Phone, MapPin, Save,
    Building, Users, ChevronDown,
    Search, Loader2, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { INDIAN_LOCATIONS } from '../data/indianLocations';
import { CUSTOMER_TYPES, idGenerator, orderService } from '../services/orderService';
import { addContractorService } from '../services/addContractorService';
import useAuthStore from '../store/authStore';

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
        if (props.readOnly) return options;
        if (!props.value) return options;

        const normalizedSearch = props.value.toLowerCase();

        // Show all options if the current value matches an option exactly
        // This allows users to change selection without clearing the input first
        const isExactMatch = options.some(opt => {
            const label = typeof opt === 'string' ? opt : opt.label;
            const value = typeof opt === 'string' ? opt : opt.value;
            return label.toLowerCase() === normalizedSearch ||
                (value && value.toString().toLowerCase() === normalizedSearch);
        });

        if (isExactMatch) return options;

        return options.filter(opt => {
            const label = typeof opt === 'string' ? opt : opt.label;
            return label.toLowerCase().includes(normalizedSearch);
        });
    }, [options, props.value, props.readOnly]);

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
            {filteredOptions.map((option) => {
                const isString = typeof option === 'string';
                const label = isString ? option : option.label;
                const value = isString ? option : option.value;

                return (
                    <button
                        key={value}
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors first:rounded-t-lg last:rounded-b-lg"
                        onClick={() => {
                            onSelect(option);
                            setIsOpen(false);
                        }}
                    >
                        {label}
                    </button>
                );
            })}
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
                className={`${props.className || ''} pr-10 ${props.readOnly ? 'cursor-pointer' : ''}`}
                onFocus={(e) => {
                    if (!props.readOnly) setIsOpen(true);
                    updatePosition();
                    props.onFocus && props.onFocus(e);
                }}
                onClick={(e) => {
                    if (props.readOnly) setIsOpen((prev) => !prev);
                    else setIsOpen(true);
                    props.onClick && props.onClick(e);
                }}
                onChange={(e) => {
                    props.onChange(e);
                    if (!props.readOnly) setIsOpen(true);
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
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);

    // Admin features
    const isAdmin = user?.Admin === 'Yes';
    const [usersList, setUsersList] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [userSearchText, setUserSearchText] = useState('');

    // Form State
    const [contractorName, setContractorName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerType, setCustomerType] = useState('');
    const [nickname, setNickname] = useState('');
    // const [mistryName, setMistryName] = useState(''); // Removed in favor of list
    const [mistriList, setMistriList] = useState([{ name: '', phone: '', error: '' }]);
    const [contractorsList, setContractorsList] = useState([]);

    // Location State
    const [selectedState, setSelectedState] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [cityCode, setCityCode] = useState('');

    // Validation State
    const [phoneError, setPhoneError] = useState('');
    const [isCheckingPhone, setIsCheckingPhone] = useState(false);
    const [idError, setIdError] = useState('');
    const [isCheckingId, setIsCheckingId] = useState(false);

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

    // Fetch users for admin
    useEffect(() => {
        if (isAdmin) {
            const fetchUsers = async () => {
                const { data } = await addContractorService.getUsers();
                if (data) setUsersList(data);
            };
            fetchUsers();
        }
    }, [isAdmin]);

    const userOptions = useMemo(() => {
        return usersList.map(u => ({
            label: `${u.full_name} (${u.user_id}) - ${u.role || 'User'}`,
            value: u.user_id,
            original: u
        }));
    }, [usersList]);

    // Fetch contractors for Mistry selection
    useEffect(() => {
        const fetchContractors = async () => {
            const { data } = await orderService.getContractorData();
            if (data) setContractorsList(data);
        };
        fetchContractors();
    }, []);

    const contractorOptions = useMemo(() => {
        const seenPhones = new Set();
        const options = [];

        contractorsList.forEach(c => {
            // Exclude Mistry type
            if (c.customer_type === 'Mistry') return;

            // Normalize phone
            const phone = c.customer_phone ? String(c.customer_phone).replace(/\D/g, '') : '';

            // Check uniqueness based on phone
            if (phone) {
                if (seenPhones.has(phone)) return;
                seenPhones.add(phone);
            }

            options.push({
                label: `${c.contractor_name} ${c.nickname ? `(${c.nickname})` : ''} - ${c.contractor_id || ''}`,
                value: c.contractor_name,
                nickname: c.nickname,
                state: c.state,
                city: c.city
            });
        });

        return options;
    }, [contractorsList]);

    // Check Phone Uniqueness & Validation
    useEffect(() => {
        const checkPhone = async () => {
            // Only check single phone if NOT Mistry (Mistry checks are done on list changes or submit)
            if (customerType === 'Mistry') return;

            if (customerPhone.length === 10) {
                setIsCheckingPhone(true);
                const { exists, error } = await addContractorService.checkPhoneUnique(customerPhone);
                setIsCheckingPhone(false);

                if (error) {
                    console.error('Phone check error:', error);
                    return;
                }

                if (exists) {
                    setPhoneError('Phone number is already available.');
                    setIdError('This number is registered with another user. Please verify or contact admin.');
                } else {
                    setPhoneError('');
                    setIdError('');
                }
            } else if (customerPhone.length > 0) {
                setPhoneError('Phone number must be exactly 10 digits.');
                setIdError('');
            } else {
                setPhoneError('');
                setIdError('');
            }
        };

        const timeoutId = setTimeout(() => {
            checkPhone();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [customerPhone, customerType]);

    // Generate ID for preview
    const generatedId = useMemo(() => {
        if (customerType === 'Mistry') {
            if (mistriList.some(m => m.name && m.phone.length === 10)) {
                return "Multiple (Auto-generated)";
            }
            return "Pending Details..."
        }
        return idGenerator.generateCustomerId({
            customerPhone,
            cityCode,
            contractorName,
            customerType,
            nickname,
            mistryName: ''
        });
    }, [customerPhone, cityCode, contractorName, customerType, nickname, mistriList]);

    // Check ID Uniqueness - REMOVED as per request, relied on Phone check
    // useEffect(() => {
    //     const checkId = async () => {
    //         if (generatedId && generatedId !== 'Pending...') {
    //             setIsCheckingId(true);
    //             const { exists, error } = await addContractorService.checkIdUnique(generatedId);
    //             setIsCheckingId(false);

    //             if (error) {
    //                 console.error('ID check error:', error);
    //                 return;
    //             }

    //             if (exists) {
    //                 setIdError('Contractor ID is already available.');
    //             } else {
    //                 setIdError('');
    //             }
    //         } else {
    //             setIdError('');
    //         }
    //     };

    //     const timeoutId = setTimeout(() => {
    //         if (generatedId) checkId();
    //     }, 500);

    //     return () => clearTimeout(timeoutId);
    // }, [generatedId]);

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

        if (customerType === 'Mistry') {
            // Validate Mistry List
            const validMistris = mistriList.filter(m => m.name && m.phone.length === 10);
            if (validMistris.length === 0) {
                toast.error('Please add at least one valid Mistri (Name & 10-digit Phone)');
                return;
            }
            if (mistriList.some(m => m.error)) {
                toast.error('Please resolve validation errors before submitting');
                return;
            }
        } else {
            if (!customerPhone || customerPhone.length < 10) {
                toast.error('Please enter a valid phone number');
                return;
            }
            let hasError = false;
            if (phoneError) {
                toast.error(phoneError);
                hasError = true;
            }
            if (idError) {
                toast.error(idError);
                hasError = true;
            }
            if (hasError) return;
        }

        if (isCheckingPhone || isCheckingId) {
            toast.error('Verifying details...');
            return;
        }
        if (customerType !== 'Mistry' && (!selectedState || !selectedCity)) {
            toast.error('Please select state and city');
            return;
        }
        if (isAdmin && !selectedUserId && customerType !== 'Mistry') {
            toast.error('Please assign to a user');
            return;
        }

        setLoading(true);

        try {
            const status = isAdmin ? 'Approved' : 'Pending';

            if (customerType === 'Mistry') {
                // Handle Multiple Mistris
                const promises = mistriList.map(async (mistri) => {
                    if (!mistri.name || mistri.phone.length !== 10) return null;

                    // Check Phone Uniqueness for each
                    // Note: We already checked on input, but re-verifying here is safer to avoid race conditions
                    const { exists } = await addContractorService.checkPhoneUnique(mistri.phone);
                    if (exists) {
                        // Update error state locally if needed, but toast is enough for submit failure
                        throw new Error(`Phone ${mistri.phone} exists`);
                    }

                    // Generate ID on the fly
                    // We need cityCode from the Contractor (Influencer). 
                    // The Contractor selection gives us 'state' and 'city' in options logic, but we store them in selectedState/City?
                    // Verify: onSelect set selectedState/City. 

                    // Re-derive cityCode if needed or use state
                    let currentCityCode = cityCode;
                    if (!currentCityCode && selectedCity) {
                        currentCityCode = idGenerator.getCityCode(selectedCity);
                    }

                    const tempId = idGenerator.generateCustomerId({
                        customerPhone: mistri.phone,
                        cityCode: currentCityCode,
                        contractorName: contractorName,
                        customerType,
                        nickname: null,
                        mistryName: mistri.name
                    });

                    const payload = {
                        contractor_id: tempId,
                        contractor_name: contractorName, // The Influencer
                        customer_phone: mistri.phone.replace(/\D/g, ''),
                        nickname: null,
                        customer_type: customerType,
                        state: selectedState,
                        city: selectedCity,
                        mistry_name: mistri.name,
                        status: status,
                        created_by_user_id: user?.user_id
                    };

                    return addContractorService.createContractor(payload);
                });

                const results = await Promise.all(promises);
                // Check errors
                const errors = results.filter(r => r && r.error);
                if (errors.length > 0) {
                    console.error(errors);
                    toast.error('Some entries failed. Phone numbers might be duplicates.');
                } else {
                    toast.success('Mistris added successfully!');
                    // Reset
                    setMistriList([{ name: '', phone: '', error: '' }]);
                    setContractorName(''); // Reset influencer selection too? Maybe keep it? 
                    // The user probably wants to add more, but let's reset for safety.
                    setContractorName('');
                    setSelectedState('');
                    setSelectedCity('');
                }

            } else {
                // Existing Single Add Logic (Contractor/Other)

                // Check Phone Uniqueness (Final verification)
                const { exists: phoneExists } = await addContractorService.checkPhoneUnique(customerPhone);
                if (phoneExists) {
                    toast.error('Phone number is already available.');
                    setLoading(false);
                    return;
                }

                const contractorPayload = {
                    contractor_id: generatedId,
                    contractor_name: contractorName,
                    customer_phone: customerPhone.replace(/\D/g, ''), // Ensure numeric
                    nickname: nickname || null,
                    customer_type: customerType,
                    state: selectedState,
                    city: selectedCity,
                    mistry_name: null, // No mistry name for non-mistry types
                    status: status,
                    created_by_user_id: user?.user_id
                };

                const { data, error } = await addContractorService.createContractor(contractorPayload);

                if (error) {
                    if (error.code === '23505') { // Unique violation
                        toast.error('This Phone Number or ID is already registered.');
                    } else {
                        throw error;
                    }
                } else {
                    // Assign to user logic
                    const targetUserId = isAdmin ? selectedUserId : user?.user_id;
                    if (targetUserId && status === 'Approved') {
                        await addContractorService.assignContractorToUser(targetUserId, contractorPayload.contractor_id);
                    }

                    if (status === 'Pending') {
                        toast.success('Submitted for approval!');
                    } else {
                        toast.success('Contractor added successfully!');
                    }

                    // Reset form
                    setContractorName('');
                    setCustomerPhone('');
                    setCustomerType('');
                    setNickname('');
                    setSelectedState('');
                    setSelectedCity('');
                    if (isAdmin) {
                        setSelectedUserId('');
                        setUserSearchText('');
                    }
                }
            }
        } catch (error) {
            console.error(error);
            if (!error.message.includes('exists')) {
                toast.error('Failed to add contractor');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setContractorName('');
        setCustomerPhone('');
        setCustomerType('');
        setNickname('');
        setMistryList([{ name: '', phone: '' }]);
        setSelectedState('');
        setSelectedCity('');

        // Reset autogenerated/validation states
        setCityCode('');
        setPhoneError('');
        setIdError('');

        if (isAdmin) {
            setSelectedUserId('');
            setUserSearchText('');
        }
    };

    return (
        <div className="h-full flex flex-col gap-6 max-w-screen-2xl mx-auto w-full p-4 lg:p-8 bg-background/50">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-light text-foreground tracking-tight">Influencer Management</h1>
                    <p className="text-muted-foreground text-sm mt-1">Register new partners and manage profiles.</p>
                </div>
            </div>

            <div className="flex-1 min-h-0 bg-card rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col relative">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto p-6 md:p-10 pb-32">

                        {/* Generated ID Badge */}
                        <div className={`mb-8 p-4 rounded-2xl border flex items-center justify-between gap-4 transition-colors ${idError
                            ? 'bg-destructive/5 border-destructive'
                            : 'bg-muted/30 border-border'
                            }`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${idError ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                                    }`}>
                                    {isCheckingId ? <Loader2 size={20} className="animate-spin" /> : <User size={20} />}
                                </div>
                                <div>
                                    <p className={`text-xs font-medium uppercase tracking-wider ${idError ? 'text-destructive' : 'text-muted-foreground'
                                        }`}>
                                        {idError ? 'Unavailable ID' : 'New Influencer ID'}
                                    </p>
                                    <p className={`text-lg font-semibold tracking-tight ${idError ? 'text-destructive' : 'text-foreground'
                                        }`}>
                                        {generatedId || 'Pending...'}
                                    </p>
                                    {idError && (
                                        <p className="text-xs text-destructive font-medium mt-1">
                                            {idError}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="hidden sm:block text-xs text-muted-foreground text-right">
                                Auto-generated based on<br />details provided
                            </div>
                        </div>

                        {/* Section 1: Identity */}
                        <SectionHeader title="Identity & Role" icon={User} />

                        {isAdmin && customerType !== 'Mistry' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-6">
                                <InputGroup label="Assign To User" required>
                                    <SearchableInput
                                        name="assignedUser"
                                        value={userSearchText}
                                        onChange={(e) => {
                                            setUserSearchText(e.target.value);
                                            setSelectedUserId(''); // Reset selection on change
                                        }}
                                        onSelect={(opt) => {
                                            setUserSearchText(opt.label);
                                            setSelectedUserId(opt.value);
                                        }}
                                        options={userOptions}
                                        placeholder="Search User..."
                                        required
                                        readOnly
                                    />
                                </InputGroup>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-4">
                            <InputGroup label="Type" required>
                                <SearchableInput
                                    name="customerType"
                                    value={customerType}
                                    onChange={(e) => setCustomerType(e.target.value)}
                                    onSelect={(val) => setCustomerType(val)}
                                    options={CUSTOMER_TYPES.filter(t => t !== 'Customer')}
                                    placeholder="Select Role"
                                    required
                                    readOnly
                                />
                            </InputGroup>

                            <InputGroup label="Influencer's Name" required>
                                {customerType === 'Mistry' ? (
                                    <SearchableInput
                                        name="contractorName"
                                        value={contractorName}
                                        onChange={(e) => setContractorName(e.target.value)}
                                        onSelect={(opt) => {
                                            setContractorName(opt.value);
                                            if (opt.nickname) setNickname(opt.nickname);
                                            if (opt.state) setSelectedState(opt.state);
                                            if (opt.city) setSelectedCity(opt.city);
                                        }}
                                        options={contractorOptions}
                                        placeholder="Select Contractor"
                                        required
                                    />
                                ) : (
                                    <TextInput
                                        type="text"
                                        value={contractorName}
                                        onChange={(e) => setContractorName(e.target.value)}
                                        placeholder="Enter full name"
                                        required
                                    />
                                )}
                            </InputGroup>
                        </div>

                        {/* Additional Info (Conditional) */}
                        {(['Contractor', 'Mistry'].includes(customerType)) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-4">
                                {customerType !== 'Mistry' && (
                                    <InputGroup label="Nickname">
                                        <TextInput
                                            type="text"
                                            value={nickname}
                                            onChange={(e) => setNickname(e.target.value)}
                                            placeholder="e.g. Raju"
                                        />
                                    </InputGroup>
                                )}

                                {customerType === 'Mistry' && (
                                    <div className="col-span-full space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-slate-700">Mistri Details</h4>
                                            <button
                                                type="button"
                                                onClick={() => setMistriList([...mistriList, { name: '', phone: '', error: '' }])}
                                                className="text-xs text-primary font-medium hover:underline"
                                            >
                                                + Add Another Mistri
                                            </button>
                                        </div>

                                        {mistriList.map((mistri, index) => {
                                            // Calculate ID for this specific Mistri
                                            const mistriId = (mistri.name && mistri.phone.length === 10 && cityCode)
                                                ? idGenerator.generateCustomerId({
                                                    customerPhone: mistri.phone,
                                                    cityCode: cityCode,
                                                    contractorName: contractorName,
                                                    customerType: 'Mistry',
                                                    nickname: null,
                                                    mistryName: mistri.name
                                                })
                                                : 'Pending Phone/Name...';

                                            return (
                                                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-4 bg-slate-50 rounded-xl relative group">
                                                    {mistriList.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setMistriList(mistriList.filter((_, i) => i !== index))}
                                                            className="absolute -top-2 -right-2 bg-red-100 text-red-500 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    )}

                                                    <InputGroup label={`Generated ID ${index + 1}`} className="md:col-span-5">
                                                        <div className="relative">
                                                            <TextInput
                                                                type="text"
                                                                value={mistriId}
                                                                readOnly
                                                                className="bg-slate-100/50 text-slate-500 cursor-default"
                                                            />
                                                        </div>
                                                    </InputGroup>

                                                    <InputGroup label={`Mistri Name ${index + 1}`} required className="md:col-span-4">
                                                        <TextInput
                                                            type="text"
                                                            value={mistri.name}
                                                            onChange={(e) => {
                                                                const newList = [...mistriList];
                                                                newList[index].name = e.target.value;
                                                                setMistriList(newList);
                                                            }}
                                                            placeholder="Partner's Name"
                                                        />
                                                    </InputGroup>

                                                    <InputGroup label={`Phone ${index + 1}`} required className="md:col-span-3">
                                                        <div className="relative">
                                                            <TextInput
                                                                type="tel"
                                                                value={mistri.phone}
                                                                onChange={async (e) => {
                                                                    const val = e.target.value.replace(/\D/g, '');
                                                                    if (val.length <= 10) {
                                                                        const newList = [...mistriList];
                                                                        newList[index].phone = val;

                                                                        // Reset error on change
                                                                        newList[index].error = '';

                                                                        // Check duplicates within local list
                                                                        const isDuplicateInList = newList.some((m, i) => m.phone === val && i !== index && val.length === 10);
                                                                        if (isDuplicateInList) {
                                                                            newList[index].error = 'Duplicate number in list';
                                                                        }

                                                                        setMistriList(newList);

                                                                        // Async check unique DB
                                                                        if (val.length === 10 && !isDuplicateInList) {
                                                                            const { exists } = await addContractorService.checkPhoneUnique(val);
                                                                            if (exists) {
                                                                                // Update state again to show error
                                                                                setMistriList(currentList => {
                                                                                    const updated = [...currentList];
                                                                                    // Ensure we are updating the correct index and value hasn't changed drastically race-condition wise
                                                                                    if (updated[index].phone === val) {
                                                                                        updated[index].error = 'Already registered';
                                                                                    }
                                                                                    return updated;
                                                                                });
                                                                            }
                                                                        }
                                                                    }
                                                                }}
                                                                placeholder="Phone No."
                                                                maxLength={10}
                                                                className={mistri.error ? "border-destructive focus-visible:ring-destructive" : ""}
                                                            />
                                                        </div>
                                                        {mistri.error && (
                                                            <p className="text-xs text-destructive font-medium mt-1 ml-1">{mistri.error}</p>
                                                        )}
                                                    </InputGroup>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Section 2: Contact */}
                        {customerType !== 'Mistry' && (
                            <>
                                <SectionHeader title="Contact Information" icon={Phone} />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-4">
                                    <InputGroup label="Primary Phone" required>
                                        <div className="relative">
                                            <TextInput
                                                type="tel"
                                                value={customerPhone}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    if (val.length <= 10) setCustomerPhone(val);
                                                }}
                                                placeholder="9876543210"
                                                maxLength={10}
                                                required
                                                className={phoneError ? "border-destructive focus-visible:ring-destructive pr-10" : ""}
                                            />
                                            {isCheckingPhone && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>
                                        {phoneError && (
                                            <p className="text-xs text-destructive font-medium mt-1 ml-1">{phoneError}</p>
                                        )}
                                    </InputGroup>
                                </div>
                            </>
                        )}

                        {/* Section 3: Region */}
                        {customerType !== 'Mistry' && (
                            <>
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
                                            readOnly
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
                                            readOnly
                                        />
                                    </InputGroup>
                                </div>
                            </>
                        )}

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
                                {loading ? 'Registering...' : 'Register Influencer'}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddContractors;
