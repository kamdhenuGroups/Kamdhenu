import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getContractors, getCacEntries, createCacEntry } from '../services/cacService';
import {
    ChevronDown,
    Search,
    Check,
    FileText,
    User,
    Calendar,
    DollarSign,
    Tag,
    Loader2,
    Save,
    Image as ImageIcon,
    X,
    Filter,
    MapPin
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { CUSTOMER_TYPES } from '../services/orderService';

// -- Reusable Components (Matching Project UI) --

const SectionHeader = ({ title, icon: Icon }) => (
    <div className="flex items-center gap-3 mb-6 mt-8 first:mt-2">
        <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-primary" />}
            <h3 className="text-lg font-semibold text-foreground tracking-tight">{title}</h3>
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

const SelectInput = ({ className = "", children, ...props }) => (
    <div className="relative">
        <select
            className={`flex h-11 w-full appearance-none rounded-xl border border-input bg-background/50 px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-ring/50 hover:bg-background cursor-pointer ${className}`}
            {...props}
        >
            {children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
    </div>
);

const SearchableInput = ({ options = [], onSelect, onClear, ...props }) => {
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
        const isExactMatch = options.some(opt => opt.toLowerCase() === normalizedSearch);
        if (isExactMatch) return options;

        return options.filter(opt =>
            opt.toLowerCase().includes(normalizedSearch)
        );
    }, [options, props.value, props.readOnly]);

    const dropdown = isOpen && (
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
            {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
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
                ))
            ) : (
                <div className="px-4 py-2.5 text-sm text-muted-foreground italic">
                    Type to add manually...
                </div>
            )}
        </div>
    );

    return (
        <div className="relative" ref={wrapperRef}>
            <TextInput
                {...props}
                className={`${props.className || ''} ${props.value && onClear ? 'pr-14' : 'pr-10'}`}
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
            {props.value && onClear && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClear();
                    }}
                    className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer z-10 p-0.5 rounded-full hover:bg-muted transition-colors"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            )}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <ChevronDown className="w-4 h-4" />
            </div>
            {createPortal(dropdown, document.body)}
        </div>
    );
};

const EXPENSE_CATEGORIES = [
    'Food',
    'Drinks',
    'Gifts',
    'Games/Recreational',
    'Mistri Delight',
    'Site Supervisor Delight',
    'Others (Please Specify)'
];

const CAC = () => {
    // State
    const [activeTab, setActiveTab] = useState('entry'); // 'entry' or 'status'
    const [contractors, setContractors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusLoading, setStatusLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [user, setUser] = useState(null);
    const [cacEntries, setCacEntries] = useState([]);

    // Form State
    const [selectedContractorType, setSelectedContractorType] = useState('All');
    const [selectedContractorId, setSelectedContractorId] = useState('');
    const [amount, setAmount] = useState('');
    const [expenseCategory, setExpenseCategory] = useState('');
    const [otherCategory, setOtherCategory] = useState('');
    const [billImages, setBillImages] = useState([]);

    const [date, setDate] = useState('');
    const [location, setLocation] = useState('');

    // Dropdown State
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    // Status Tab Search State
    const [statusSearchTerm, setStatusSearchTerm] = useState('');
    const dateInputRef = useRef(null);

    // Remarks State
    const [remarks, setRemarks] = useState('');

    // Load Data
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        let currentUser = null;
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            setUser(currentUser);
        }
        fetchContractors(currentUser);

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch CAC entries when tab changes to 'status'
    useEffect(() => {
        if (activeTab === 'status') {
            fetchCacEntries();
        }
    }, [activeTab]);

    const fetchContractors = async (currentUser) => {
        if (!currentUser) {
            setLoading(false);
            return;
        }

        try {
            const data = await getContractors(currentUser);
            setContractors(data);
        } catch (error) {
            console.error('Error fetching contractors:', error);
            toast.error('Failed to fetch contractors');
        } finally {
            setLoading(false);
        }
    };

    const fetchCacEntries = async () => {
        setStatusLoading(true);
        try {
            const data = await getCacEntries(user);
            setCacEntries(data);
        } catch (error) {
            console.error('Error fetching CAC entries:', error);
            toast.error('Failed to fetch CAC records');
        } finally {
            setStatusLoading(false);
        }
    };

    // Filter Logic for Dropdown
    const availableContractorTypes = useMemo(() => {
        const types = new Set(contractors.map(c => c.customer_type).filter(Boolean));
        return Array.from(types).sort();
    }, [contractors]);

    const filteredContractors = useMemo(() => {
        return contractors.filter(c => {
            const matchesSearch = c.contractor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.contractor_id?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesType = !selectedContractorType || selectedContractorType === 'All' || c.customer_type === selectedContractorType;

            return matchesSearch && matchesType;
        });
    }, [contractors, searchTerm, selectedContractorType]);

    const selectedContractor = useMemo(() => {
        return contractors.find(c => c.contractor_id === selectedContractorId);
    }, [contractors, selectedContractorId]);

    // Enhanced CAC Entries (Filtered)
    const enrichedCacEntries = useMemo(() => {
        const lowerTerm = statusSearchTerm.toLowerCase();
        return cacEntries.filter(entry => {
            const contractorName = entry.contractor_data?.contractor_name || '';
            const contractorId = entry.contractor_id || '';
            const expenseCat = entry.expense_category || '';
            const otherCat = entry.other_expense_category || '';
            const creatorName = entry.users?.full_name || '';

            return (
                contractorName.toLowerCase().includes(lowerTerm) ||
                contractorId.toLowerCase().includes(lowerTerm) ||
                expenseCat.toLowerCase().includes(lowerTerm) ||
                otherCat.toLowerCase().includes(lowerTerm) ||
                creatorName.toLowerCase().includes(lowerTerm)
            );
        });
    }, [cacEntries, statusSearchTerm]);

    // Handlers
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!selectedContractorId || !amount || !date || !remarks || !expenseCategory || !location) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (expenseCategory === 'Others (Please Specify)' && !otherCategory) {
            toast.error('Please specify other category details');
            return;
        }

        if (billImages.length === 0) {
            toast.error('Please upload at least one bill image (Mandatory).');
            return;
        }

        if (!user || !user.user_id) {
            toast.error('User session not found. Please log in again.');
            return;
        }

        setSubmitting(true);
        try {
            // 1. Create CAC Entry
            const cacPayload = {
                contractor_id: selectedContractorId,
                user_id: user.user_id,
                amount: parseFloat(amount),

                expense_category: expenseCategory,
                other_expense_category: expenseCategory === 'Others (Please Specify)' ? otherCategory : null,
                expense_date: date,
                remarks: remarks,
                location: location,
            };

            await createCacEntry(cacPayload, billImages, user);

            toast.success('CAC entry added successfully!');

            // Reset form
            setAmount('');
            setExpenseCategory('');
            setOtherCategory('');
            setBillImages([]);
            setSelectedContractorId('');
            setDate('');
            setRemarks('');
            setLocation('');
            setSearchTerm('');
            setIsDropdownOpen(false);
            setSelectedContractorType('All');

        } catch (error) {
            console.error('Error saving CAC:', error);
            toast.error('Error saving data: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="h-full flex flex-col gap-6 max-w-screen-2xl mx-auto w-full p-4 lg:p-8 bg-background/50">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl sm:text-3xl font-light text-foreground tracking-tight">Customer Acquisition Cost</h1>
                    <p className="text-muted-foreground text-sm">Manage and track CAC expenses.</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex p-1 bg-muted/50 backdrop-blur rounded-full self-start sm:self-auto border border-border">
                    <button
                        onClick={() => setActiveTab('entry')}
                        className={`flex items-center gap-2 px-4 sm:px-6 py-2 text-sm font-medium rounded-full transition-all duration-300 ${activeTab === 'entry'
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                            }`}
                    >
                        CAC Entry
                    </button>
                    <button
                        onClick={() => setActiveTab('status')}
                        className={`flex items-center gap-2 px-4 sm:px-6 py-2 text-sm font-medium rounded-full transition-all duration-300 ${activeTab === 'status'
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                            }`}
                    >
                        CAC Status
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 bg-card rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col relative">

                {activeTab === 'entry' ? (
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-4 sm:p-6 md:p-10 pb-32">

                            {/* Section 1: Influencer Details */}
                            <SectionHeader title="Influencer Details" icon={User} />

                            <div className="mb-8 relative" ref={dropdownRef}>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                                    <InputGroup label="Influencer Type">
                                        <div className="relative">
                                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                                            <SearchableInput
                                                value={selectedContractorType === 'All' ? '' : selectedContractorType}
                                                onChange={(e) => {
                                                    setSelectedContractorType(e.target.value);
                                                    setSelectedContractorId(''); // Reset selection when type changes
                                                }}
                                                onSelect={(val) => {
                                                    setSelectedContractorType(val);
                                                    setSelectedContractorId('');
                                                }}
                                                onClear={() => {
                                                    setSelectedContractorType('All');
                                                    setSelectedContractorId('');
                                                }}
                                                options={['All', ...availableContractorTypes]}
                                                className="pl-9"
                                                placeholder="All Types"
                                            />
                                        </div>
                                    </InputGroup>

                                    <div className="md:col-span-2 relative">
                                        <InputGroup label="Select Influencer" required>
                                            <div
                                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                className={`w-full rounded-xl border p-3 cursor-pointer flex justify-between items-center transition-all bg-background/50 ${isDropdownOpen ? 'border-ring ring-2 ring-ring/20' : 'border-input hover:border-ring/50 hover:bg-background'
                                                    }`}
                                            >
                                                {selectedContractor ? (
                                                    <div className="flex flex-col text-left min-w-0 flex-1 mr-2">
                                                        <span className="font-semibold text-foreground text-base tracking-tight break-words whitespace-normal">{selectedContractor.contractor_name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-- Select an Influencer --</span>
                                                )}
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {selectedContractorId && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedContractorId('');
                                                            }}
                                                            className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors mr-1"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                                </div>
                                            </div>
                                        </InputGroup>

                                        {/* Dropdown Menu */}
                                        {isDropdownOpen && (
                                            <div className="absolute z-20 w-full mt-2 bg-popover rounded-xl shadow-xl border border-border overflow-hidden max-h-96 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                                                <div className="p-3 border-b border-border bg-muted/20 sticky top-0">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                        <input
                                                            type="text"
                                                            value={searchTerm}
                                                            onChange={(e) => setSearchTerm(e.target.value)}
                                                            placeholder="Search by name or ID..."
                                                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:border-ring focus:ring-2 focus:ring-ring/20 outline-none"
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>
                                                <div className="overflow-y-auto flex-1">
                                                    {filteredContractors.length > 0 ? (
                                                        filteredContractors.map((contractor) => (
                                                            <div
                                                                key={contractor.contractor_id}
                                                                onClick={() => {
                                                                    setSelectedContractorId(contractor.contractor_id);
                                                                    setIsDropdownOpen(false);
                                                                    setSearchTerm('');
                                                                }}
                                                                className={`p-3 p-4 hover:bg-muted/50 cursor-pointer border-b border-border/50 last:border-0 transition-colors flex justify-between items-center group ${selectedContractorId === contractor.contractor_id ? 'bg-muted/50' : ''}`}
                                                            >
                                                                <div>
                                                                    <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                                                                        {contractor.contractor_name}
                                                                        {contractor.nickname && <span className="text-muted-foreground/70 font-normal ml-2 text-sm">({contractor.nickname})</span>}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                                                                            {contractor.contractor_id}
                                                                        </span>
                                                                        <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                                                            {contractor.customer_type}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                {selectedContractorId === contractor.contractor_id && <Check className="w-5 h-5 text-primary" />}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-8 text-center text-muted-foreground">
                                                            <p>No influencers found.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Influencer Summary Card (Visible when selected) */}
                                        {selectedContractor && (
                                            <div className="mt-4 bg-muted/20 rounded-xl p-4 sm:p-5 border border-border/50 flex flex-wrap gap-4 sm:gap-6 animate-in fade-in slide-in-from-top-2">
                                                <div className="shrink-0 max-w-full">
                                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Influencer ID</p>
                                                    <p className="text-sm text-foreground bg-background px-3 py-1.5 rounded-md border border-border inline-block max-w-full break-all">
                                                        {selectedContractor.contractor_id}
                                                    </p>
                                                </div>
                                                <div className="flex-1 min-w-[200px] sm:min-w-[240px]">
                                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Influencer Name</p>
                                                    <p className="text-lg sm:text-2xl font-light text-foreground break-words whitespace-normal leading-tight">
                                                        {selectedContractor.contractor_name}
                                                        {selectedContractor.nickname && <span className="text-muted-foreground text-sm sm:text-lg ml-2">({selectedContractor.nickname})</span>}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Transaction Details */}
                            <SectionHeader title="Transaction Details" icon={FileText} />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <InputGroup label="Date" required>
                                    <div
                                        className="relative group cursor-pointer"
                                        onClick={() => {
                                            if (dateInputRef.current) {
                                                if (dateInputRef.current.showPicker) {
                                                    dateInputRef.current.showPicker();
                                                } else {
                                                    dateInputRef.current.focus();
                                                }
                                            }
                                        }}
                                    >
                                        {/* Custom Visual Input */}
                                        <div className={`flex h-11 w-full items-center rounded-xl border border-input bg-background/50 px-4 py-2 text-sm transition-all duration-200 group-hover:border-ring/50 group-hover:bg-background ${date ? 'text-foreground' : 'text-muted-foreground'}`}>
                                            <Calendar className="mr-3 h-4 w-4 text-muted-foreground" />
                                            <span>
                                                {date ? date.split('-').reverse().join('/') : 'DD/MM/YYYY'}
                                            </span>
                                        </div>

                                        {/* Invisible Native Input for Functionality */}
                                        <input
                                            ref={dateInputRef}
                                            type="date"
                                            value={date}
                                            max={new Date().toLocaleDateString('en-CA')}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 pointer-events-none"
                                            required
                                            tabIndex={-1}
                                        />
                                    </div>
                                </InputGroup>

                                <InputGroup label="Amount" required>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                                            ₹
                                        </div>
                                        <TextInput
                                            type="text"
                                            inputMode="numeric"
                                            value={amount}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                // Only allow integer input
                                                if (/^\d*$/.test(val)) {
                                                    // Prevent leading zeros (e.g. 00000 -> 0, 05 -> 5)
                                                    if (val.length > 1 && val.startsWith('0')) {
                                                        const formatted = val.replace(/^0+/, '');
                                                        setAmount(formatted === '' ? '0' : formatted);
                                                    } else {
                                                        setAmount(val);
                                                    }
                                                }
                                            }}
                                            className="pl-8"
                                            placeholder="0"
                                            required
                                        />
                                    </div>
                                </InputGroup>

                                <InputGroup label="Expense Category" required>
                                    <div className="relative">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                                        <SearchableInput
                                            value={expenseCategory}
                                            onChange={(e) => setExpenseCategory(e.target.value)}
                                            onSelect={(val) => setExpenseCategory(val)}
                                            options={EXPENSE_CATEGORIES}
                                            className="pl-9"
                                            placeholder="Select category..."
                                            readOnly={true}
                                        />
                                    </div>
                                </InputGroup>

                                {expenseCategory === 'Others (Please Specify)' && (
                                    <InputGroup label="Other Details" required>
                                        <TextInput
                                            value={otherCategory}
                                            onChange={(e) => setOtherCategory(e.target.value)}
                                            placeholder="Specify details..."
                                        />
                                    </InputGroup>
                                )}



                                <InputGroup label="Location" required>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                                        <TextInput
                                            type="text"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                            className="pl-9"
                                            placeholder="Ex: Hotel Landmark, Chaigovindam etc"
                                        />
                                    </div>
                                </InputGroup>
                            </div>

                            <div className="mb-6">
                                <InputGroup label="Remarks" required>
                                    <div className="relative">
                                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                                        <TextInput
                                            type="text"
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                            className="pl-9 pr-10"
                                            placeholder="Enter any remarks..."
                                        />
                                        {remarks && (
                                            <button
                                                type="button"
                                                onClick={() => setRemarks('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors z-20"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </InputGroup>
                            </div>

                            {/* Section 3: Attachments */}
                            <SectionHeader title="Attachments" icon={ImageIcon} />

                            <InputGroup label="Bill Image(s)" required>
                                <div className="space-y-4">
                                    <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-border bg-muted/10 hover:bg-muted/30 transition-colors cursor-pointer group">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <ImageIcon className="w-8 h-8 text-muted-foreground/50 group-hover:text-primary/70 mb-2 transition-colors" />
                                            <p className="text-sm text-muted-foreground">Click to upload bill images (Multiple allowed)</p>
                                        </div>
                                        <input
                                            type="file"
                                            multiple
                                            className="hidden"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files.length > 0) {
                                                    setBillImages(prev => [...prev, ...Array.from(e.target.files)]);
                                                }
                                            }}
                                        />
                                    </label>

                                    {/* File List */}
                                    {billImages.length > 0 && (
                                        <div className="space-y-2">
                                            {billImages.map((file, index) => (
                                                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                                                            <ImageIcon className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex flex-col overflow-hidden">
                                                            <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                                                            <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setBillImages(prev => prev.filter((_, i) => i !== index))}
                                                        className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </InputGroup>

                            {/* Footer Action */}
                            <div className="mt-12 pt-6 border-t border-border flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAmount('');
                                        setExpenseCategory('');
                                        setOtherCategory('');
                                        setBillImages([]);
                                        setSelectedContractorId('');
                                        setDate('');
                                        setRemarks('');
                                        setLocation('');
                                        setSearchTerm('');
                                        setIsDropdownOpen(false);
                                    }}
                                    className="px-6 py-3 rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground font-medium transition-colors"
                                >
                                    Reset Form
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-xl hover:bg-primary/90 transition-all font-semibold disabled:opacity-50 shadow-md hover:shadow-lg active:scale-95"
                                >
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    {submitting ? 'Saving...' : 'Save Entry'}
                                </button>
                            </div>

                        </form>
                    </div>
                ) : (
                    <div className="flex flex-col h-full bg-muted/10">
                        {/* Search Toolbar */}
                        <div className="p-4 border-b border-border bg-card flex gap-3 items-center justify-between sticky top-0 z-20">
                            <div className="relative flex-1 sm:min-w-[280px] max-w-md group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search by ID, Name, or Category..."
                                    value={statusSearchTerm}
                                    onChange={(e) => setStatusSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-muted/30 rounded-xl border border-transparent focus:bg-background focus:border-border focus:shadow-sm outline-none transition-all placeholder:text-muted-foreground/70"
                                />
                            </div>
                            <button
                                onClick={fetchCacEntries}
                                className="p-2.5 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-all active:scale-95"
                                title="Refresh"
                            >
                                <Loader2 className={`w-5 h-5 ${statusLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {/* Status Table */}
                        <div className="flex-1 overflow-auto custom-scrollbar p-0">
                            {statusLoading ? (
                                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground/50">
                                    <Loader2 className="w-8 h-8 animate-spin mb-3 text-muted-foreground" />
                                    <p className="text-sm">Loading CAC records...</p>
                                </div>
                            ) : enrichedCacEntries.length > 0 ? (
                                <>
                                    {/* Desktop Table */}
                                    <div className="hidden md:block">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-muted/30 sticky top-0 z-10 backdrop-blur-sm">
                                                <tr className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold border-b border-border">
                                                    <th className="px-4 py-3 whitespace-nowrap">Date</th>
                                                    <th className="px-4 py-3 whitespace-nowrap">Created By</th>
                                                    <th className="px-4 py-3 whitespace-nowrap">Influencer ID</th>
                                                    <th className="px-4 py-3 whitespace-nowrap">Influencer Name</th>
                                                    <th className="px-4 py-3 whitespace-nowrap">Location</th>
                                                    <th className="px-4 py-3 whitespace-nowrap">Amount (₹)</th>
                                                    <th className="px-4 py-3 whitespace-nowrap">Exp. Category</th>
                                                    <th className="px-4 py-3 whitespace-nowrap">Other Details</th>
                                                    <th className="px-4 py-3 whitespace-nowrap">Remarks</th>

                                                    <th className="px-4 py-3 whitespace-nowrap">Reimbursement Status</th>
                                                    <th className="px-4 py-3 whitespace-nowrap">Reimbursed Amt.</th>
                                                    <th className="px-4 py-3 whitespace-nowrap">Attachment</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/40 bg-card">
                                                {enrichedCacEntries.map((entry) => (
                                                    <tr key={entry.id || entry.created_at} className="hover:bg-muted/30 transition-colors">
                                                        <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                                                            {new Date(entry.expense_date).toLocaleDateString('en-GB')}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-foreground">{entry.users?.full_name || '-'}</span>
                                                                <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                                                                    {entry.user_id}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs whitespace-nowrap font-medium text-foreground">
                                                            {entry.contractor_id}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs whitespace-nowrap max-w-[200px] truncate" title={entry.contractor_data?.contractor_name}>
                                                            {entry.contractor_data?.contractor_name || 'Unknown'}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs whitespace-normal break-words" title={entry.location}>
                                                            {entry.location || '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs whitespace-nowrap font-medium text-foreground">
                                                            ₹{entry.amount.toLocaleString('en-IN')}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                                                            {entry.expense_category ? (
                                                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                                                                    {entry.expense_category === 'Others (Please Specify)' ? 'Others' : entry.expense_category}
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs whitespace-nowrap max-w-[150px] truncate" title={entry.other_expense_category}>
                                                            {entry.other_expense_category || '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs whitespace-nowrap max-w-[200px] truncate" title={entry.remarks}>
                                                            {entry.remarks || '-'}
                                                        </td>

                                                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                                                            <span className={`px-2 py-0.5 rounded border ${entry.reimbursement_status === 'Pending'
                                                                ? 'bg-yellow-50 text-yellow-700 border-yellow-100'
                                                                : 'bg-green-50 text-green-700 border-green-100'
                                                                }`}>
                                                                {entry.reimbursement_status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                                                            <div className="flex flex-col">
                                                                <span className="text-foreground font-medium">₹{entry.reimbursed_amount?.toLocaleString('en-IN') || 0}</span>
                                                                {entry.reimbursed_at && (
                                                                    <span className="text-[10px] text-muted-foreground">
                                                                        {new Date(entry.reimbursed_at).toLocaleDateString()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                                                            {entry.cac_bills?.length > 0 ? (
                                                                <div className="flex flex-col gap-1">
                                                                    {entry.cac_bills.map((bill, index) => (
                                                                        <a
                                                                            key={bill.id}
                                                                            href={bill.bill_url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="flex items-center gap-1 text-primary cursor-pointer hover:underline text-xs"
                                                                        >
                                                                            <ImageIcon className="w-3 h-3" />
                                                                            <span>View Bill {index + 1}</span>
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            ) : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Cards View */}
                                    <div className="md:hidden space-y-4 p-4 pb-20">
                                        {enrichedCacEntries.map((entry) => (
                                            <div key={entry.id || entry.created_at} className="bg-card rounded-xl border border-border p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                                                {/* Header: Name & Date */}
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="font-semibold text-foreground text-base break-words leading-tight mb-1">
                                                            {entry.contractor_data?.contractor_name || 'Unknown'}
                                                        </h3>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border/50 break-all">
                                                                {entry.contractor_id}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end shrink-0">
                                                        <span className="text-[10px] text-muted-foreground font-medium">
                                                            {new Date(entry.expense_date).toLocaleDateString('en-GB')}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Divider */}
                                                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent w-full opacity-50" />

                                                {/* Details Grid */}
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                                    <div className="col-span-2 sm:col-span-1">
                                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Category</p>
                                                        {entry.expense_category ? (
                                                            <span className="inline-block bg-blue-50/50 text-blue-700 text-xs px-2 py-0.5 rounded border border-blue-100/50">
                                                                {entry.expense_category === 'Others (Please Specify)' ? 'Others' : entry.expense_category}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs">-</span>
                                                        )}
                                                    </div>

                                                    <div className="col-span-2 sm:col-span-1">
                                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Location</p>
                                                        <p className="text-foreground text-xs font-medium break-words whitespace-normal">{entry.location || '-'}</p>
                                                    </div>

                                                    {entry.other_expense_category && (
                                                        <div className="col-span-2 sm:col-span-1">
                                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Other Details</p>
                                                            <p className="text-foreground text-xs font-medium">{entry.other_expense_category}</p>
                                                        </div>
                                                    )}

                                                    <div className="col-span-2 sm:col-span-1">
                                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Reimbursement Status</p>
                                                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${entry.reimbursement_status === 'Pending'
                                                            ? 'bg-yellow-50/50 text-yellow-700 border-yellow-100/50'
                                                            : 'bg-green-50/50 text-green-700 border-green-100/50'
                                                            }`}>
                                                            {entry.reimbursement_status}
                                                        </span>
                                                    </div>

                                                    <div className="col-span-2">
                                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Created By</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-foreground text-xs font-medium">{entry.users?.full_name || '-'}</span>
                                                            <span className="text-[10px] bg-muted/50 text-muted-foreground px-1.5 py-0 rounded border border-border/50">
                                                                {entry.user_id}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {entry.remarks && (
                                                        <div className="col-span-2">
                                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Remarks</p>
                                                            <p className="text-foreground text-xs bg-muted/20 p-2 rounded-lg border border-border/30">
                                                                {entry.remarks}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Reimbursement Details if applicable */}
                                                {(entry.reimbursed_amount > 0 || entry.reimbursed_at) && (
                                                    <div className="bg-muted/30 p-2.5 rounded-lg border border-border/30 mt-1">
                                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Reimbursement Details</p>
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="font-medium">Paid: ₹{entry.reimbursed_amount?.toLocaleString('en-IN') || 0}</span>
                                                            {entry.reimbursed_at && <span className="text-muted-foreground">{new Date(entry.reimbursed_at).toLocaleDateString()}</span>}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Total Amount */}
                                                <div className="mt-2 flex justify-end items-center border-t border-dashed border-border/50 pt-2">
                                                    <span className="text-xs text-muted-foreground mr-2 font-medium">Total Amount:</span>
                                                    <span className="font-bold text-xl text-primary">
                                                        ₹{entry.amount.toLocaleString('en-IN')}
                                                    </span>
                                                </div>

                                                {/* Attachments */}
                                                {entry.cac_bills?.length > 0 && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                                        <div className="flex flex-wrap gap-2 text-xs">
                                                            {entry.cac_bills.map((bill, index) => (
                                                                <a
                                                                    key={bill.id}
                                                                    href={bill.bill_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-primary hover:underline hover:text-primary/80 transition-colors"
                                                                >
                                                                    View Bill {index + 1}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-32 text-muted-foreground/30">
                                    <Filter className="w-12 h-12 mb-4 opacity-50" />
                                    <p className="font-medium text-muted-foreground">No records found</p>
                                    <p className="text-xs mt-1 text-muted-foreground/70">Try adding a new entry</p>
                                </div>
                            )}
                        </div>
                    </div>
                )
                }
            </div >
        </div >
    );
};

export default CAC;
