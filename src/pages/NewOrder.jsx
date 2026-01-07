import React, { useState, useRef } from 'react';
import {

    Calendar,
    User,
    Package,
    FileText,
    Save,
    X,
    ChevronDown,
    MapPin,
    Phone,
    Truck,
    CreditCard,
    Award,

    Clock,
    CheckCircle,
    ShoppingBag,
    History,
    Search,
    Map,
    Trash2,
    Plus,
    Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { INDIAN_LOCATIONS } from '../data/indianLocations';
import { orderService, CUSTOMER_TYPES, idGenerator, POINT_ROLES, PAYMENT_OPTIONS, PRODUCTS } from '../services/orderService';

const useDropdownPosition = (isOpen) => {
    const ref = useRef(null);
    const [positionClass, setPositionClass] = useState("mt-1");

    React.useLayoutEffect(() => {
        if (isOpen && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;

            // Check overflow
            if (rect.bottom > viewportHeight) {
                // Flip to top
                setPositionClass("mb-1 bottom-full origin-bottom");
            } else {
                setPositionClass("mt-1 origin-top");
            }
        } else if (!isOpen) {
            // Reset when closed
            setPositionClass("mt-1");
        }
    }, [isOpen]);

    return { ref, positionClass };
};

const NewOrder = () => {
    const [loading, setLoading] = useState(false);
    const dateInputRef = useRef(null);

    // Form State
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [contractorName, setContractorName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerType, setCustomerType] = useState('');
    const [items, setItems] = useState([{ id: 1, product: '', quantity: 1, price: 0, points: 0, showDropdown: false }]);
    const [notes, setNotes] = useState('');

    // Tab State
    const [activeTab, setActiveTab] = useState('new');

    // History State
    // History State
    const [orderHistory, setOrderHistory] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);

    // Fetch orders on mount or when tab changes
    React.useEffect(() => {
        if (activeTab === 'history') {
            fetchOrders();
        }
    }, [activeTab]);

    const fetchOrders = async () => {
        setLoading(true);
        const { data, error } = await orderService.getOrders();
        if (error) {
            toast.error('Failed to fetch orders');
        } else {
            setOrderHistory(data);
        }
        setLoading(false);
    };



    // New Fields State
    const [challanName, setChallanName] = useState('');
    const [sitePoc, setSitePoc] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [pointRole, setPointRole] = useState('');
    const [paymentTerms, setPaymentTerms] = useState('');
    const [manualPaymentDays, setManualPaymentDays] = useState('');
    const [logistics, setLogistics] = useState('');
    const [selectedState, setSelectedState] = useState('');
    const [stateSearch, setStateSearch] = useState('');
    const [showStateDropdown, setShowStateDropdown] = useState(false);

    const [selectedCity, setSelectedCity] = useState('');
    const [citySearch, setCitySearch] = useState('');
    const [showCityDropdown, setShowCityDropdown] = useState(false);

    // Dropdown States for new custom UI fields
    const [showPointDropdown, setShowPointDropdown] = useState(false);
    const [showLogisticsDropdown, setShowLogisticsDropdown] = useState(false);
    const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);

    // ID Generation State
    const [nickname, setNickname] = useState('');
    const [cityCode, setCityCode] = useState('');
    const [mistryName, setMistryName] = useState('');
    const [siteNumber, setSiteNumber] = useState(1);
    const [orderNumber, setOrderNumber] = useState(1);
    const [currentUser, setCurrentUser] = useState(null);

    // Contractor Search State
    const [availableContractors, setAvailableContractors] = useState([]);
    const [showContractorDropdown, setShowContractorDropdown] = useState(false);

    // Address Search State
    const [availableAddresses, setAvailableAddresses] = useState([]);
    const [showAddressDropdown, setShowAddressDropdown] = useState(false);

    // History Filter State
    const [historySelectedState, setHistorySelectedState] = useState('');
    const [historyStateSearch, setHistoryStateSearch] = useState('');
    const [showHistoryStateDropdown, setShowHistoryStateDropdown] = useState(false);

    // Dropdown Positioning Hooks
    const contractorDropdown = useDropdownPosition(showContractorDropdown);
    const stateDropdown = useDropdownPosition(showStateDropdown);
    const cityDropdown = useDropdownPosition(showCityDropdown);
    const addressDropdown = useDropdownPosition(showAddressDropdown);
    const historyStateDropdown = useDropdownPosition(showHistoryStateDropdown);

    // New Dropdown Position Hooks
    const pointDropdown = useDropdownPosition(showPointDropdown);
    const logisticsDropdown = useDropdownPosition(showLogisticsDropdown);
    const paymentDropdown = useDropdownPosition(showPaymentDropdown);

    // Points Allocation State
    const [pointsAllocations, setPointsAllocations] = useState([]);
    const [currentAllocation, setCurrentAllocation] = useState({
        role: '',
        name: '',
        phoneLast4: '',
        points: ''
    });
    const [showAllocationRoleDropdown, setShowAllocationRoleDropdown] = useState(false);
    const allocationRoleDropdown = useDropdownPosition(showAllocationRoleDropdown); // Reuse generic hook if works, or just basic logic


    const [availableBeneficiaries, setAvailableBeneficiaries] = useState([]);
    const [showBeneficiaryDropdown, setShowBeneficiaryDropdown] = useState(false);
    const beneficiaryDropdown = useDropdownPosition(showBeneficiaryDropdown);
    const [isExistingBeneficiary, setIsExistingBeneficiary] = useState(false);

    // Fetch contractors and beneficiaries on mount
    React.useEffect(() => {
        const loadData = async () => {
            const [contractorsRes, beneficiariesRes] = await Promise.all([
                orderService.getUniqueContractors(),
                orderService.getUniqueBeneficiaries()
            ]);

            if (contractorsRes.data) setAvailableContractors(contractorsRes.data);
            if (beneficiariesRes.data) setAvailableBeneficiaries(beneficiariesRes.data);
        };
        loadData();
    }, []);

    // Fetch User and Initial Counts
    React.useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setCurrentUser(parsedUser);
            if (selectedCity) {
                fetchOrderCounts(parsedUser.user_id, selectedCity, getGeneratedCustomerId(), deliveryAddress);
            }
        }
    }, [selectedCity]); // Re-run when city changes or user loads

    const fetchOrderCounts = async (userId, city, contractorId, address) => {
        if (!userId || !city) return;
        const { siteNumber, orderNumber, error } = await orderService.getOrderCounts(userId, city, contractorId, address);
        if (!error) {
            setSiteNumber(siteNumber);
            setOrderNumber(orderNumber);
        }
    };

    React.useEffect(() => {
        if (selectedCity) {
            const code = idGenerator.getCityCode(selectedCity);
            setCityCode(code);

            // Fetch addresses for the city
            const loadAddresses = async () => {
                const { data } = await orderService.getAddressesByCity(selectedCity);
                if (data) setAvailableAddresses(data);
            };
            loadAddresses();
        } else {
            setCityCode('');
            setAvailableAddresses([]);
        }
    }, [selectedCity]);

    // Watch for changes that affect ID generation
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (currentUser && selectedCity) {
                const cId = getGeneratedCustomerId();
                fetchOrderCounts(currentUser.user_id, selectedCity, cId, deliveryAddress);
            }
        }, 500); // Debounce
        return () => clearTimeout(timer);
    }, [currentUser, selectedCity, customerPhone, contractorName, customerType, nickname, mistryName, deliveryAddress]);

    const getGeneratedCustomerId = () => {
        return idGenerator.generateCustomerId({
            customerPhone,
            cityCode,
            contractorName,
            customerType,
            nickname,
            mistryName
        });
    };

    const getGeneratedSiteId = () => {
        return idGenerator.generateSiteId({
            user: currentUser,
            cityCode,
            siteCount: siteNumber,
            date: orderDate
        });
    };

    const getGeneratedOrderId = () => {
        return idGenerator.generateOrderId(getGeneratedSiteId(), orderNumber);
    };



    const states = Object.keys(INDIAN_LOCATIONS);
    const filteredStates = states.filter(state =>
        state.toLowerCase().includes(stateSearch.toLowerCase())
    );

    const historyFilteredStates = React.useMemo(() => {
        const availableStates = new Set(orderHistory.map(o => o.state).filter(Boolean));
        return Array.from(availableStates).sort().filter(state =>
            state.toLowerCase().includes(historyStateSearch.toLowerCase())
        );
    }, [orderHistory, historyStateSearch]);

    const filteredOrderHistory = orderHistory.filter(order =>
        !historySelectedState || order.state === historySelectedState || (historySelectedState === 'No State' && !order.state)
    );

    const cities = selectedState ? INDIAN_LOCATIONS[selectedState] || [] : [];
    const filteredCities = cities.filter(city =>
        city.toLowerCase().includes(citySearch.toLowerCase())
    );



    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), product: '', quantity: 1, price: 0, points: 0, showDropdown: false }]);
    };

    const handleRemoveItem = (id) => {
        if (items.length === 1) return;
        setItems(items.filter(item => item.id !== id));
    };

    const handleItemChange = (id, field, value) => {
        setItems(items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const toggleItemDropdown = (id) => {
        setItems(items.map(item => ({
            ...item,
            showDropdown: item.id === id ? !item.showDropdown : false
        })));
    };

    // Points Logic
    const totalOrderPoints = React.useMemo(() => orderService.calculateOrderPoints(items), [items]);

    // Recalculate allocated points whenever the allocations change
    const totalAllocatedPoints = React.useMemo(() =>
        pointsAllocations.reduce((sum, a) => sum + (parseInt(a.points) || 0), 0)
        , [pointsAllocations]);

    const remainingPoints = totalOrderPoints - totalAllocatedPoints;

    const handleAddAllocation = () => {
        const { role, name, phoneLast4, points } = currentAllocation;

        if (!role || !name || !phoneLast4 || !points) {
            toast.error('Please fill all allocation fields');
            return;
        }

        if (phoneLast4.length !== 4) {
            toast.error('Phone last digits must be exactly 4 numbers');
            return;
        }

        const pointsNum = parseInt(points);
        if (isNaN(pointsNum) || pointsNum <= 0) {
            toast.error('Points must be a valid positive number');
            return;
        }

        if (pointsNum > remainingPoints) {
            toast.error(`Cannot allocate more than remaining points (${remainingPoints})`);
            return;
        }

        setPointsAllocations([
            ...pointsAllocations,
            { ...currentAllocation, id: Date.now(), points: pointsNum }
        ]);

        // Reset form
        setCurrentAllocation({
            role: '',
            name: '',
            phoneLast4: '',
            points: ''
        });
        setIsExistingBeneficiary(false);
    };

    const handleRemoveAllocation = (id) => {
        setPointsAllocations(pointsAllocations.filter(a => a.id !== id));
    };




    const handleClearCustomer = () => {
        setContractorName('');
        setCustomerPhone('');
        setCustomerType('');
        setNickname('');
        setMistryName('');
        setChallanName('');
        setSitePoc('');
        setDeliveryAddress('');
        setPointRole('');
        setPaymentTerms('');
        setManualPaymentDays('');
        setLogistics('');
        setSelectedState('');
        setSelectedCity('');
        setIsExistingBeneficiary(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!customerType) {
            toast.error('Please select a customer type');
            return;
        }

        const totalPoints = orderService.calculateOrderPoints(items);
        if (totalPoints > 0) {
            const allocated = pointsAllocations.reduce((acc, curr) => acc + (parseInt(curr.points) || 0), 0);
            if (allocated !== totalPoints) {
                toast.error(`Please allocate all ${totalPoints} points. Remaining: ${totalPoints - allocated}`);
                return;
            }
        }


        setLoading(true);

        try {
            const orderPayload = orderService.prepareOrderPayload({
                orderDate,
                contractorName,
                customerType,
                customerPhone,
                items,
                notes,
                challanName,
                sitePoc,
                deliveryAddress,
                pointRole,
                paymentTerms,
                manualPaymentDays,
                logistics,
                state: selectedState,
                city: selectedCity,
                orderId: getGeneratedOrderId(),
                contractorId: getGeneratedCustomerId(),
                siteId: getGeneratedSiteId(),
                nickname,
                mistryName,
                pointsAllocations
            });

            const { data, error } = await orderService.createOrder(orderPayload);

            if (error) throw error;

            toast.success('Order created successfully!');
            setActiveTab('history'); // Switch to history tab
            fetchOrders(); // Refresh list

            // Reset form
            setContractorName('');
            setCustomerPhone('');
            setCustomerType('');
            setItems([{ id: 1, product: '', quantity: 1, price: 0, points: 0 }]);
            setNotes('');
            setChallanName('');
            setSitePoc('');
            setDeliveryAddress('');
            setPointRole('');
            setPaymentTerms('');
            setManualPaymentDays('');
            setLogistics('');
            setSelectedState('');
            setStateSearch('');
            setSelectedCity('');
            setCitySearch('');

            setOrderDate(new Date().toISOString().split('T')[0]);
            setNickname('');
            setCityCode('');
            setMistryName('');
            setPointsAllocations([]);
            setPointsAllocations([]);
            setCurrentAllocation({
                role: '',
                name: '',
                phoneLast4: '',
                points: ''
            });
            setIsExistingBeneficiary(false);

            if (currentUser && selectedCity) {

                // Determine the next counts based on cleared form (likely new order context)
                // But ideally we just refresh with empty contractor ID to get next new site number
                fetchOrderCounts(currentUser.user_id, selectedCity, '', '');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to create order');
        } finally {
            setLoading(false);
        }
    };

    const existingContractor = React.useMemo(() => {
        if (!contractorName) return null;
        return availableContractors.find(c =>
            c.contractor_name?.toLowerCase() === contractorName.toLowerCase()
        );
    }, [contractorName, availableContractors]);

    // Auto-fill nickname if exact match found
    React.useEffect(() => {
        if (existingContractor && existingContractor.nickname) {
            setNickname(existingContractor.nickname);
        }
    }, [existingContractor]);

    return (
        <div className="h-full flex flex-col gap-6 overflow-hidden">



            {/* Tab Navigation */}
            {/* Header & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                <h1 className="text-xl font-bold text-slate-800">Order Management</h1>
                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('new')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'new'
                            ? 'bg-white text-primary shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <ShoppingBag size={18} />
                        New Order
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'history'
                            ? 'bg-white text-primary shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <History size={18} />
                        Order History
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeTab === 'new' ? (
                    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto space-y-6 pb-10">
                        {/* Generated IDs Banner */}
                        {((currentUser && getGeneratedOrderId()) || getGeneratedCustomerId() || (currentUser && getGeneratedSiteId())) && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                {/* Order ID */}
                                <div className={`transition-all duration-500 ease-in-out ${currentUser && getGeneratedOrderId() ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none hidden md:block md:invisible'}`}>
                                    <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex flex-col justify-center items-center text-center shadow-sm h-full">
                                        <span className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Order ID</span>
                                        <span className="text-sm md:text-base font-bold text-slate-700 break-all">
                                            {getGeneratedOrderId()}
                                        </span>
                                    </div>
                                </div>

                                {/* Contractor ID */}
                                <div className={`transition-all duration-500 ease-in-out ${getGeneratedCustomerId() ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none hidden md:block md:invisible'}`}>
                                    <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl flex flex-col justify-center items-center text-center shadow-sm h-full">
                                        <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Contractor ID</span>
                                        <span className="text-sm md:text-base font-bold text-slate-700 break-all">
                                            {getGeneratedCustomerId()}
                                        </span>
                                    </div>
                                </div>

                                {/* Site ID */}
                                <div className={`transition-all duration-500 ease-in-out ${currentUser && getGeneratedSiteId() ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none hidden md:block md:invisible'}`}>
                                    <div className="bg-violet-50/50 border border-violet-100 p-4 rounded-xl flex flex-col justify-center items-center text-center shadow-sm h-full">
                                        <span className="text-xs font-bold text-violet-500 uppercase tracking-wider mb-1">Site ID</span>
                                        <span className="text-sm md:text-base font-bold text-slate-700 break-all">
                                            {getGeneratedSiteId()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Order Details Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm text-primary">
                                        <FileText size={18} />
                                    </div>
                                    Order Details
                                </h2>
                                <div className="relative flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm group hover:border-primary/30 transition-colors">
                                    <Calendar size={14} className="text-slate-400 group-hover:text-primary transition-colors" />
                                    <span className="text-sm font-medium text-slate-700 min-w-[80px]">
                                        {orderDate ? orderDate.split('-').reverse().join('/') : 'DD/MM/YYYY'}
                                    </span>
                                    <input
                                        ref={dateInputRef}
                                        type="date"
                                        value={orderDate}
                                        onChange={(e) => setOrderDate(e.target.value)}
                                        onClick={() => dateInputRef.current?.showPicker()}
                                        required
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                </div>
                            </div>

                            <div className="p-6 md:p-8 grid grid-cols-1 gap-10">

                                {/* Section 1: Customer Information */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                            <User size={16} />
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Customer Information</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                        {/* Customer Type */}
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Customer Type</label>
                                            <div className="flex flex-wrap gap-3">
                                                {CUSTOMER_TYPES.map(type => {
                                                    const isDisabled = existingContractor &&
                                                        type !== existingContractor.customer_type &&
                                                        type !== 'Mistry';

                                                    return (
                                                        <button
                                                            key={type}
                                                            type="button"
                                                            onClick={() => setCustomerType(type)}
                                                            disabled={isDisabled}
                                                            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border ${customerType === type
                                                                ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105'
                                                                : isDisabled
                                                                    ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                                }`}
                                                        >
                                                            {type}
                                                        </button>
                                                    );
                                                })}
                                                {(contractorName || customerType) && (
                                                    <button
                                                        type="button"
                                                        onClick={handleClearCustomer}
                                                        className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-200 flex items-center gap-2"
                                                    >
                                                        <X size={14} />
                                                        Clear
                                                    </button>
                                                )}
                                            </div>
                                            {!customerType && <p className="text-xs text-amber-600 mt-2 font-medium flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-amber-600"></span> Please select a customer type</p>}
                                        </div>

                                        {/* Contractor Name */}
                                        <div className="relative">
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                                Contractor Name
                                            </label>
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    value={contractorName}
                                                    onChange={(e) => {
                                                        setContractorName(e.target.value);
                                                        setShowContractorDropdown(true);
                                                    }}
                                                    onFocus={() => setShowContractorDropdown(true)}
                                                    required
                                                    className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium text-slate-800 placeholder:text-slate-400"
                                                    placeholder="Search or enter name..."
                                                />
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                                                    <Search size={16} />
                                                </div>

                                                {/* Contractor Dropdown */}
                                                {showContractorDropdown && (contractorName || availableContractors.length > 0) && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-10"
                                                            onClick={() => setShowContractorDropdown(false)}
                                                        ></div>
                                                        <div
                                                            ref={contractorDropdown.ref}
                                                            className={`absolute z-20 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar flex flex-col animate-in fade-in zoom-in-95 duration-100 ${contractorDropdown.positionClass}`}
                                                        >
                                                            {availableContractors
                                                                .filter(c => c.contractor_name.toLowerCase().includes(contractorName.toLowerCase()))
                                                                .map((contractor, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 group"
                                                                        onClick={() => {
                                                                            setContractorName(contractor.contractor_name);
                                                                            if (contractor.customer_phone) setCustomerPhone(contractor.customer_phone);
                                                                            if (contractor.customer_type) setCustomerType(contractor.customer_type);
                                                                            if (contractor.nickname) setNickname(contractor.nickname);
                                                                            if (contractor.mistry_name) setMistryName(contractor.mistry_name);

                                                                            // Pre-fill other fields from most recent order
                                                                            if (contractor.site_contact_number) setSitePoc(contractor.site_contact_number);
                                                                            if (contractor.delivery_address) setDeliveryAddress(contractor.delivery_address);
                                                                            if (contractor.point_of_contact_role) setPointRole(contractor.point_of_contact_role);
                                                                            if (contractor.payment_terms) setPaymentTerms(contractor.payment_terms);
                                                                            if (contractor.manual_payment_days) setManualPaymentDays(String(contractor.manual_payment_days));
                                                                            if (contractor.logistics_mode) setLogistics(contractor.logistics_mode);
                                                                            if (contractor.state) setSelectedState(contractor.state);
                                                                            if (contractor.city) setSelectedCity(contractor.city);
                                                                            if (contractor.challan_reference) setChallanName(contractor.challan_reference);

                                                                            setShowContractorDropdown(false);
                                                                        }}
                                                                    >
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">
                                                                                {contractor.contractor_name}
                                                                                {contractor.customer_type === 'Contractor' && contractor.nickname && <span className="text-slate-400 font-normal ml-1">({contractor.nickname})</span>}
                                                                            </span>
                                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wide">{contractor.customer_type || 'Unknown'}</span>
                                                                        </div>
                                                                        {(contractor.customer_phone || (contractor.customer_type === 'Mistry' && contractor.contractor_id)) && (
                                                                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                                                                {contractor.customer_phone && (
                                                                                    <span className="flex items-center gap-1">
                                                                                        <Phone size={10} />
                                                                                        {contractor.customer_phone}
                                                                                    </span>
                                                                                )}
                                                                                {/* For Mistry, show linked Contractor Name derived from ID */}
                                                                                {contractor.customer_type === 'Mistry' && contractor.contractor_id && (
                                                                                    <span className="flex items-center gap-1 text-slate-400">
                                                                                        • {contractor.contractor_id.split('/')[3]?.split('-')[0]}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))
                                                            }
                                                            {availableContractors.filter(c => c.contractor_name.toLowerCase().includes(contractorName.toLowerCase())).length === 0 && (
                                                                <div className="px-4 py-4 text-center text-sm text-slate-500">
                                                                    No matching contractors found.
                                                                    <br />
                                                                    <span className="text-xs text-slate-400">Can be added as new.</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Customer Phone */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                                Phone Number
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="tel"
                                                    value={customerPhone}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/\D/g, '');
                                                        if (value.length <= 10) {
                                                            setCustomerPhone(value);
                                                        }
                                                    }}
                                                    required
                                                    className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium text-slate-800 placeholder:text-slate-400 tabular-nums"
                                                    placeholder="10-digit mobile number"
                                                />
                                            </div>
                                        </div>

                                        {/* Nickname (Only for Contractor and Mistry) */}
                                        {/* Nickname (Only for Contractor and Mistry) - Hidden if existing contractor found (cannot add nickname to existing) */}
                                        {(customerType === 'Contractor' || customerType === 'Mistry') && !existingContractor && (
                                            <div className="animate-in fade-in slide-in-from-top-2">
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                                    Nickname <span className="text-slate-400 font-normal normal-case tracking-normal">(Market Name)</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={nickname}
                                                    onChange={(e) => setNickname(e.target.value)}
                                                    className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium text-slate-800 placeholder:text-slate-400"
                                                    placeholder="Optional (e.g. Nillu)"
                                                />
                                            </div>
                                        )}

                                        {/* Mistry Name (Only for Mistry) */}
                                        {customerType === 'Mistry' && (
                                            <div className="animate-in fade-in slide-in-from-top-2">
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Mistry Name</label>
                                                <input
                                                    type="text"
                                                    value={mistryName}
                                                    onChange={(e) => setMistryName(e.target.value)}
                                                    required={customerType === 'Mistry'}
                                                    className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium text-slate-800 placeholder:text-slate-400"
                                                    placeholder="Enter Mistry Name"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="h-px bg-slate-100 w-full"></div>

                                {/* Section 2: Delivery & Site Details */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                            <MapPin size={16} />
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Delivery & Site Details</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

                                        {/* State & City */}
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* State Selection */}
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">State</label>
                                                <div className="relative">
                                                    <div
                                                        onClick={() => setShowStateDropdown(!showStateDropdown)}
                                                        className="block w-full px-4 py-3 border border-slate-200 rounded-xl cursor-pointer bg-slate-50 hover:bg-white focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all text-sm font-medium flex items-center justify-between"
                                                    >
                                                        <span className={selectedState ? "text-slate-800" : "text-slate-400"}>
                                                            {selectedState || "Select State"}
                                                        </span>
                                                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${showStateDropdown ? 'rotate-180' : ''}`} />
                                                    </div>

                                                    {/* Dropdown */}
                                                    {showStateDropdown && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-10"
                                                                onClick={() => setShowStateDropdown(false)}
                                                            ></div>
                                                            <div
                                                                ref={stateDropdown.ref}
                                                                className={`absolute z-20 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100 min-w-[200px] ${stateDropdown.positionClass}`}
                                                            >
                                                                {/* Search Bar */}
                                                                <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
                                                                    <div className="relative">
                                                                        <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                                                                        <input
                                                                            type="text"
                                                                            value={stateSearch}
                                                                            onChange={(e) => setStateSearch(e.target.value)}
                                                                            placeholder="Search..."
                                                                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                                                            autoFocus
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* List */}
                                                                <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
                                                                    {filteredStates.length > 0 ? (
                                                                        filteredStates.map(state => (
                                                                            <div
                                                                                key={state}
                                                                                className={`px-3 py-2 rounded-md cursor-pointer text-sm transition-colors ${selectedState === state
                                                                                    ? 'bg-primary/5 text-primary font-bold'
                                                                                    : 'text-slate-600 hover:bg-slate-50'
                                                                                    }`}
                                                                                onClick={() => {
                                                                                    setSelectedState(state);
                                                                                    setSelectedCity('');
                                                                                    setStateSearch('');
                                                                                    setShowStateDropdown(false);
                                                                                }}
                                                                            >
                                                                                {state}
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="px-3 py-4 text-center text-xs text-slate-400">
                                                                            No state found
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* City Selection */}
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">City</label>
                                                <div className="relative">
                                                    <div
                                                        onClick={() => !selectedState ? toast.error('Please select a state first') : setShowCityDropdown(!showCityDropdown)}
                                                        className={`block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 transition-all text-sm font-medium flex items-center justify-between ${!selectedState ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-white focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary'
                                                            }`}
                                                    >
                                                        <span className={selectedCity ? "text-slate-800" : "text-slate-400"}>
                                                            {selectedCity || "Select City"}
                                                        </span>
                                                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
                                                    </div>

                                                    {/* Dropdown */}
                                                    {showCityDropdown && selectedState && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-10"
                                                                onClick={() => setShowCityDropdown(false)}
                                                            ></div>
                                                            <div
                                                                ref={cityDropdown.ref}
                                                                className={`absolute z-20 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100 min-w-[200px] ${cityDropdown.positionClass}`}
                                                            >
                                                                {/* Search Bar */}
                                                                <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
                                                                    <div className="relative">
                                                                        <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                                                                        <input
                                                                            type="text"
                                                                            value={citySearch}
                                                                            onChange={(e) => setCitySearch(e.target.value)}
                                                                            placeholder="Search..."
                                                                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                                                            autoFocus
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* List */}
                                                                <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
                                                                    {filteredCities.length > 0 ? (
                                                                        filteredCities.map(city => (
                                                                            <div
                                                                                key={city}
                                                                                className={`px-3 py-2 rounded-md cursor-pointer text-sm transition-colors ${selectedCity === city
                                                                                    ? 'bg-primary/5 text-primary font-bold'
                                                                                    : 'text-slate-600 hover:bg-slate-50'
                                                                                    }`}
                                                                                onClick={() => {
                                                                                    setSelectedCity(city);
                                                                                    setCitySearch('');
                                                                                    setShowCityDropdown(false);
                                                                                }}
                                                                            >
                                                                                {city}
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="px-3 py-4 text-center text-xs text-slate-400">
                                                                            No city found
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Delivery Address */}
                                        <div className="md:row-span-2">
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Delivery Address</label>
                                            <div className="relative h-full">
                                                <textarea
                                                    value={deliveryAddress}
                                                    onChange={(e) => {
                                                        setDeliveryAddress(e.target.value);
                                                        setShowAddressDropdown(true);
                                                    }}
                                                    onFocus={() => setShowAddressDropdown(true)}
                                                    rows="4"
                                                    className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium text-slate-800 placeholder:text-slate-400 resize-none h-full min-h-[120px]"
                                                    placeholder="Enter full address (or select existing)..."
                                                ></textarea>

                                                {/* Address Dropdown */}
                                                {showAddressDropdown && (deliveryAddress || availableAddresses.length > 0) && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-10"
                                                            onClick={() => setShowAddressDropdown(false)}
                                                        ></div>
                                                        <div
                                                            ref={addressDropdown.ref}
                                                            className={`absolute z-20 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar flex flex-col animate-in fade-in zoom-in-95 duration-100 ${addressDropdown.positionClass}`}
                                                        >
                                                            {availableAddresses
                                                                .filter(addr => addr.toLowerCase().includes(deliveryAddress.toLowerCase()))
                                                                .map((addr, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 group"
                                                                        onClick={() => {
                                                                            setDeliveryAddress(addr);
                                                                            setShowAddressDropdown(false);
                                                                        }}
                                                                    >
                                                                        <span className="text-sm text-slate-600 group-hover:text-primary transition-colors font-medium">{addr}</span>
                                                                    </div>
                                                                ))
                                                            }
                                                            {availableAddresses.filter(addr => addr.toLowerCase().includes(deliveryAddress.toLowerCase())).length === 0 && (
                                                                <div className="px-4 py-4 text-center text-sm text-slate-500">
                                                                    No matching address found.
                                                                    <br />
                                                                    <span className="text-xs text-slate-400">Can be added as new.</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Site POC */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Site Contact (POC)</label>
                                            <input
                                                type="tel"
                                                value={sitePoc}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/\D/g, '');
                                                    if (value.length <= 10) {
                                                        setSitePoc(value);
                                                    }
                                                }}
                                                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium text-slate-800 placeholder:text-slate-400 tabular-nums"
                                                placeholder="POC Mobile Number"
                                            />
                                        </div>

                                        {/* Challan Name */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Challan Reference Name</label>
                                            <input
                                                type="text"
                                                value={challanName}
                                                onChange={(e) => setChallanName(e.target.value)}
                                                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium text-slate-800 placeholder:text-slate-400"
                                                placeholder="e.g. Site Supervisor"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Order Items Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm text-primary">
                                        <Package size={18} />
                                    </div>
                                    Order Items
                                </h2>
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="text-xs font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 bg-white px-3 py-2 rounded-lg border border-primary/20 shadow-sm hover:border-primary/50 hover:shadow-md active:scale-95"
                                >
                                    <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Plus size={10} strokeWidth={3} />
                                    </div>
                                    ADD ITEM
                                </button>
                            </div>

                            <div className="p-6">
                                <div className="space-y-3">
                                    {/* Items Header */}
                                    <div className="hidden sm:grid grid-cols-12 gap-3 px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        <div className="col-span-12 sm:col-span-5">Product Details</div>
                                        <div className="col-span-5 sm:col-span-2">Quantity</div>
                                        <div className="col-span-5 sm:col-span-2">Price</div>
                                        <div className="col-span-5 sm:col-span-2">Points</div>
                                        <div className="col-span-2 sm:col-span-1"></div>
                                    </div>
                                    {items.map((item, index) => (
                                        <div key={item.id} className="group relative grid grid-cols-12 gap-3 items-start p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-primary/20 hover:bg-white hover:shadow-sm transition-all duration-200">

                                            {/* Product Name */}
                                            <div className="col-span-12 sm:col-span-5">
                                                <label className="block text-xs font-semibold text-slate-500 mb-1 sm:hidden uppercase">Product</label>
                                                <div className="relative">
                                                    <div
                                                        onClick={() => toggleItemDropdown(item.id)}
                                                        className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 flex items-center justify-between transition-all"
                                                    >
                                                        <span className={`text-sm font-medium ${item.product ? 'text-slate-800' : 'text-slate-400'}`}>
                                                            {item.product || 'Select Product...'}
                                                        </span>
                                                        <ChevronDown size={14} className="text-slate-400" />
                                                    </div>

                                                    {item.showDropdown && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-10"
                                                                onClick={() => toggleItemDropdown(item.id)}
                                                            ></div>
                                                            <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar flex flex-col animate-in fade-in zoom-in-95 duration-100 min-w-[200px]">
                                                                {PRODUCTS.map((p, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                                                                        onClick={() => {
                                                                            setItems(items.map(i =>
                                                                                i.id === item.id
                                                                                    ? { ...i, product: p.name, showDropdown: false }
                                                                                    : i
                                                                            ));
                                                                        }}
                                                                    >
                                                                        <div className="flex justify-between items-center">
                                                                            <span className={`text-sm font-medium ${item.product === p.name ? 'text-primary uppercase font-bold' : 'text-slate-700'}`}>
                                                                                {p.name}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Quantity */}
                                            <div className="col-span-5 sm:col-span-2">
                                                <label className="block text-xs font-semibold text-slate-500 mb-1 sm:hidden uppercase">Qty</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity || ''}
                                                    onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-medium transition-all"
                                                    required
                                                />
                                            </div>

                                            {/* Price */}
                                            <div className="col-span-5 sm:col-span-2">
                                                <label className="block text-xs font-semibold text-slate-500 mb-1 sm:hidden uppercase">Price</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm">₹</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={item.price || ''}
                                                        onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                                                        className="w-full pl-6 pr-2 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-medium transition-all"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            {/* Points */}
                                            <div className="col-span-5 sm:col-span-2">
                                                <label className="block text-xs font-semibold text-slate-500 mb-1 sm:hidden uppercase">Points</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-bold">P</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={item.points || ''}
                                                        onChange={(e) => handleItemChange(item.id, 'points', parseInt(e.target.value) || 0)}
                                                        className="w-full pl-6 pr-2 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-medium transition-all text-blue-600"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>

                                            {/* Remove Button */}
                                            <div className="col-span-2 sm:col-span-1 flex justify-end pt-2 sm:pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(item.id)}
                                                    disabled={items.length === 1}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Total */}
                                <div className="mt-8 flex justify-end items-center gap-4 border-t border-slate-100 pt-6">
                                    <div className="text-right">
                                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Amount</span>
                                        <span className="text-3xl font-bold text-slate-800 tracking-tight">₹ {orderService.calculateOrderTotal(items).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Points Allocation & Logistics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Points Allocation */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 h-full flex flex-col">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3 justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm text-primary">
                                            <Award size={18} />
                                        </div>
                                        <h2 className="text-lg font-bold text-slate-800">Points Allocation</h2>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remaining</span>
                                        <span className={`text-lg font-bold ${remainingPoints === 0 ? 'text-emerald-600' : 'text-amber-500'}`}>
                                            {remainingPoints} / {totalOrderPoints}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-6 flex-1 flex flex-col gap-4">

                                    {/* Allocation Form */}
                                    <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">

                                        {/* Role Select & User Load */}
                                        {/* Role Select & User Load */}
                                        <div className="flex gap-3">
                                            {/* Existing User Dropdown */}
                                            <div className="relative flex-1">
                                                <div
                                                    onClick={() => setShowBeneficiaryDropdown(!showBeneficiaryDropdown)}
                                                    className="block w-full px-4 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-primary/50 transition-all text-sm font-medium flex items-center justify-between"
                                                >
                                                    <span className={isExistingBeneficiary ? "text-slate-800" : "text-slate-400"}>
                                                        {isExistingBeneficiary && currentAllocation.name ? currentAllocation.name : "Load User"}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <User size={14} className="text-slate-400" />
                                                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${showBeneficiaryDropdown ? 'rotate-180' : ''}`} />
                                                    </div>
                                                </div>

                                                {showBeneficiaryDropdown && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setShowBeneficiaryDropdown(false)}></div>
                                                        <div
                                                            ref={beneficiaryDropdown.ref}
                                                            className={`absolute z-20 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar mt-1 animate-in fade-in zoom-in-95 duration-100 ${beneficiaryDropdown.positionClass}`}
                                                        >
                                                            <div
                                                                className="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 text-sm italic text-slate-500"
                                                                onClick={() => {
                                                                    setIsExistingBeneficiary(false);
                                                                    setCurrentAllocation({ role: '', name: '', phoneLast4: '', points: currentAllocation.points });
                                                                    setShowBeneficiaryDropdown(false);
                                                                }}
                                                            >
                                                                -- New User --
                                                            </div>
                                                            {availableBeneficiaries.map((b, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 text-sm text-slate-600"
                                                                    onClick={() => {
                                                                        setCurrentAllocation({
                                                                            ...currentAllocation,
                                                                            role: b.role,
                                                                            name: b.person_name,
                                                                            phoneLast4: b.phone_last_4
                                                                        });
                                                                        setIsExistingBeneficiary(true);
                                                                        setShowBeneficiaryDropdown(false);
                                                                    }}
                                                                >
                                                                    <div className="font-semibold">{b.person_name}</div>
                                                                    <div className="text-[10px] text-slate-400">{b.role}-{b.phone_last_4}</div>
                                                                </div>
                                                            ))}
                                                            {availableBeneficiaries.length === 0 && (
                                                                <div className="px-4 py-2 text-xs text-slate-400 text-center">
                                                                    No existing users found.
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Role Select */}
                                            <div className="relative flex-1">
                                                <div
                                                    onClick={() => !isExistingBeneficiary && setShowAllocationRoleDropdown(!showAllocationRoleDropdown)}
                                                    className={`block w-full px-4 py-2 border border-slate-200 rounded-lg transition-all text-sm font-medium flex items-center justify-between ${isExistingBeneficiary ? 'bg-slate-100 cursor-not-allowed' : 'bg-white cursor-pointer hover:border-primary/50'}`}
                                                >
                                                    <span className={currentAllocation.role ? "text-slate-800" : "text-slate-400"}>
                                                        {currentAllocation.role || "Select Role"}
                                                    </span>
                                                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${showAllocationRoleDropdown ? 'rotate-180' : ''}`} />
                                                </div>

                                                {showAllocationRoleDropdown && !isExistingBeneficiary && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setShowAllocationRoleDropdown(false)}></div>
                                                        <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar mt-1 animate-in fade-in zoom-in-95 duration-100">
                                                            {POINT_ROLES.map(role => (
                                                                <div
                                                                    key={role}
                                                                    className={`px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 text-sm ${currentAllocation.role === role ? 'bg-primary/5 text-primary font-bold' : 'text-slate-600'}`}
                                                                    onClick={() => {
                                                                        setCurrentAllocation({ ...currentAllocation, role });
                                                                        setShowAllocationRoleDropdown(false);
                                                                    }}
                                                                >
                                                                    {role}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Name & Phone */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <input
                                                type="text"
                                                placeholder="Person Name"
                                                value={currentAllocation.name}
                                                onChange={(e) => setCurrentAllocation({ ...currentAllocation, name: e.target.value })}
                                                disabled={isExistingBeneficiary}
                                                className={`block w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-primary outline-none text-sm ${isExistingBeneficiary ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'}`}
                                            />
                                            <input
                                                type="text"
                                                maxLength="4"
                                                placeholder="Last 4 digits"
                                                value={currentAllocation.phoneLast4}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setCurrentAllocation({ ...currentAllocation, phoneLast4: val });
                                                }}
                                                disabled={isExistingBeneficiary}
                                                className={`block w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-primary outline-none text-sm ${isExistingBeneficiary ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'}`}
                                            />
                                        </div>

                                        {/* Points & Add Button */}
                                        <div className="flex gap-3">
                                            <input
                                                type="number"
                                                placeholder="Points"
                                                min="1"
                                                max={remainingPoints}
                                                value={currentAllocation.points}
                                                onChange={(e) => setCurrentAllocation({ ...currentAllocation, points: e.target.value })}
                                                className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:border-primary outline-none text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddAllocation}
                                                disabled={!currentAllocation.role || !currentAllocation.name || currentAllocation.phoneLast4.length !== 4 || !currentAllocation.points || parseInt(currentAllocation.points) > remainingPoints}
                                                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>

                                    {/* Allocations List */}
                                    <div className="flex-1 overflow-y-auto max-h-[200px] custom-scrollbar space-y-2">
                                        {pointsAllocations.length === 0 ? (
                                            <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                                                No points allocated yet.
                                            </div>
                                        ) : (
                                            pointsAllocations.map(alloc => (
                                                <div key={alloc.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:border-primary/20 hover:shadow-sm transition-all group">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-slate-700">{alloc.name}</span>
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 uppercase">{alloc.role}</span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 mt-0.5">{alloc.role}-{alloc.phoneLast4}</div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-bold text-primary">{alloc.points} P</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveAllocation(alloc.id)}
                                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>


                            {/* Payment & Logistics */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 h-full">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                    <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm text-primary">
                                        <CreditCard size={18} />
                                    </div>
                                    <h2 className="text-lg font-bold text-slate-800">Payment & Logistics</h2>
                                </div>

                                <div className="p-6 space-y-5">
                                    {/* Logistics */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Logistics Mode</label>
                                        <div className="relative">
                                            <div
                                                onClick={() => setShowLogisticsDropdown(!showLogisticsDropdown)}
                                                className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-white focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all text-sm font-medium flex items-center justify-between relative"
                                            >
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Truck size={18} className="text-slate-400" />
                                                </div>
                                                <span className={logistics ? "text-slate-800" : "text-slate-400"}>
                                                    {logistics || "Select Logistics Option"}
                                                </span>
                                                <ChevronDown size={16} className={`text-slate-400 transition-transform ${showLogisticsDropdown ? 'rotate-180' : ''}`} />
                                            </div>

                                            {showLogisticsDropdown && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => setShowLogisticsDropdown(false)}
                                                    ></div>
                                                    <div
                                                        ref={logisticsDropdown.ref}
                                                        className={`absolute z-20 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar flex flex-col animate-in fade-in zoom-in-95 duration-100 ${logisticsDropdown.positionClass}`}
                                                    >
                                                        {['Paid by Customer', 'Paid by Company'].map(opt => (
                                                            <div
                                                                key={opt}
                                                                className={`px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 ${logistics === opt ? 'bg-primary/5 text-primary font-bold' : 'text-slate-600'}`}
                                                                onClick={() => {
                                                                    setLogistics(opt);
                                                                    setShowLogisticsDropdown(false);
                                                                }}
                                                            >
                                                                {opt}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Payment Terms */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Terms</label>
                                        <div className="relative">
                                            <div
                                                onClick={() => setShowPaymentDropdown(!showPaymentDropdown)}
                                                className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-white focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all text-sm font-medium flex items-center justify-between relative"
                                            >
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <CreditCard size={18} className="text-slate-400" />
                                                </div>
                                                <span className={paymentTerms ? "text-slate-800" : "text-slate-400"}>
                                                    {paymentTerms || "Select Payment Terms"}
                                                </span>
                                                <ChevronDown size={16} className={`text-slate-400 transition-transform ${showPaymentDropdown ? 'rotate-180' : ''}`} />
                                            </div>

                                            {showPaymentDropdown && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => setShowPaymentDropdown(false)}
                                                    ></div>
                                                    <div
                                                        ref={paymentDropdown.ref}
                                                        className={`absolute z-20 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar flex flex-col animate-in fade-in zoom-in-95 duration-100 ${paymentDropdown.positionClass}`}
                                                    >
                                                        {PAYMENT_OPTIONS.map(option => (
                                                            <div
                                                                key={option}
                                                                className={`px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 ${paymentTerms === option ? 'bg-primary/5 text-primary font-bold' : 'text-slate-600'}`}
                                                                onClick={() => {
                                                                    setPaymentTerms(option);
                                                                    setShowPaymentDropdown(false);
                                                                }}
                                                            >
                                                                {option}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Manual Days Input */}
                                    {paymentTerms === 'Manual entry for days' && (
                                        <div className="animate-in fade-in slide-in-from-top-1">
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Number of Days</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={manualPaymentDays}
                                                onChange={(e) => setManualPaymentDays(e.target.value)}
                                                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium"
                                                placeholder="Enter number of days"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm text-primary">
                                    <FileText size={18} />
                                </div>
                                <h2 className="text-lg font-bold text-slate-800">Additional Notes</h2>
                            </div>
                            <div className="p-6">
                                <textarea
                                    rows="3"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium resize-none placeholder:text-slate-400"
                                    placeholder="Add delivery instructions or any special notes..."
                                ></textarea>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                className="px-6 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        Submit Order
                                    </>
                                )}
                            </button>
                        </div>

                    </form>
                ) : (
                    <div className="max-w-6xl mx-auto pb-10 space-y-4">
                        {/* Filters */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-4">
                            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                <Filter size={16} />
                                <span className="uppercase text-xs font-bold tracking-wider">Filters:</span>
                            </div>

                            <div className="relative w-64">
                                <div
                                    onClick={() => setShowHistoryStateDropdown(!showHistoryStateDropdown)}
                                    className="block w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 transition-all text-sm font-medium flex items-center justify-between cursor-pointer hover:bg-white focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary"
                                >
                                    <span className={historySelectedState ? "text-slate-800" : "text-slate-400"}>
                                        {historySelectedState || "All States"}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {historySelectedState && (
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setHistorySelectedState('');
                                                }}
                                                className="p-0.5 hover:bg-slate-200 rounded-full transition-colors"
                                            >
                                                <X size={14} className="text-slate-400 hover:text-red-500" />
                                            </div>
                                        )}
                                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${showHistoryStateDropdown ? 'rotate-180' : ''}`} />
                                    </div>
                                </div>

                                {/* Dropdown */}
                                {showHistoryStateDropdown && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setShowHistoryStateDropdown(false)}
                                        ></div>
                                        <div
                                            ref={historyStateDropdown.ref}
                                            className={`absolute z-20 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100 ${historyStateDropdown.positionClass}`}
                                        >
                                            <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
                                                <div className="relative">
                                                    <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        value={historyStateSearch}
                                                        onChange={(e) => setHistoryStateSearch(e.target.value)}
                                                        placeholder="Search State..."
                                                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
                                                <div
                                                    className={`px-3 py-2 rounded-md cursor-pointer text-sm transition-colors ${!historySelectedState ? 'bg-primary/5 text-primary font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                                                    onClick={() => {
                                                        setHistorySelectedState('');
                                                        setShowHistoryStateDropdown(false);
                                                    }}
                                                >
                                                    All States
                                                </div>
                                                {historyFilteredStates.map(state => (
                                                    <div
                                                        key={state}
                                                        className={`px-3 py-2 rounded-md cursor-pointer text-sm transition-colors ${historySelectedState === state
                                                            ? 'bg-primary/5 text-primary font-bold'
                                                            : 'text-slate-600 hover:bg-slate-50'
                                                            }`}
                                                        onClick={() => {
                                                            setHistorySelectedState(state);
                                                            setHistoryStateSearch('');
                                                            setShowHistoryStateDropdown(false);
                                                        }}
                                                    >
                                                        {state}
                                                    </div>
                                                ))}
                                                {historyFilteredStates.length === 0 && (
                                                    <div className="px-3 py-4 text-center text-xs text-slate-400">
                                                        No state found
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-slate-700 whitespace-nowrap">Order ID</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700 whitespace-nowrap">Date</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700 whitespace-nowrap">Contractor</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700 whitespace-nowrap">City</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700 whitespace-nowrap">Contact</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700 text-right whitespace-nowrap">Items</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700 text-right whitespace-nowrap">Amount</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700 text-center whitespace-nowrap">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredOrderHistory.map((order) => (
                                            <tr key={order.order_id} className="hover:bg-slate-50/50 transition-colors">
                                                <td
                                                    onClick={() => setSelectedOrder(order)}
                                                    className="px-6 py-4 font-bold text-primary cursor-pointer hover:underline whitespace-nowrap"
                                                >
                                                    {order.order_id}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-slate-400" />
                                                        {new Date(order.order_date).toLocaleDateString('en-GB')}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-800 font-medium whitespace-nowrap">
                                                    {order.contractor_name}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 text-xs whitespace-nowrap font-medium">
                                                    {order.city || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 font-bold text-xs whitespace-nowrap">
                                                    {order.site_contact_number || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 text-right whitespace-nowrap">
                                                    {Array.isArray(order.items) ? order.items.reduce((acc, item) => acc + (item.quantity || 0), 0) : 0}
                                                </td>
                                                <td className="px-6 py-4 text-slate-800 font-semibold text-right whitespace-nowrap">
                                                    ₹ {order.total_amount?.toLocaleString() || '0'}
                                                </td>
                                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${order.order_status === 'Completed'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                        : order.order_status === 'Processing'
                                                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                            : 'bg-amber-50 text-amber-700 border-amber-100'
                                                        }`}>
                                                        {order.order_status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredOrderHistory.length === 0 && (
                                            <tr>
                                                <td colSpan="9" className="px-6 py-12 text-center text-slate-500">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="bg-slate-50 p-3 rounded-full">
                                                            <ShoppingBag size={24} className="text-slate-400" />
                                                        </div>
                                                        <p>No orders found {historySelectedState ? `for ${historySelectedState}` : ''}</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
                {/* Order Details Modal */}
                {selectedOrder && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setSelectedOrder(null);
                            }
                        }}
                    >
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row ring-1 ring-slate-900/5">

                            {/* Left Sidebar - Key Info */}
                            <div className="w-full md:w-72 bg-white border-r border-slate-100 p-6 flex flex-col gap-6 shrink-0 text-left">

                                {/* Date */}
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Order Date</span>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
                                            <Calendar size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">
                                                {new Date(selectedOrder.order_date).toLocaleDateString('en-GB')}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {new Date(selectedOrder.order_date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-slate-50 w-full"></div>

                                {/* Status */}
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Status</span>
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${selectedOrder.order_status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                        selectedOrder.order_status === 'Processing' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                            'bg-amber-50 text-amber-700 border-amber-100'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${selectedOrder.order_status === 'Completed' ? 'bg-emerald-500' :
                                            selectedOrder.order_status === 'Processing' ? 'bg-blue-500' : 'bg-amber-500'
                                            }`}></span>
                                        {selectedOrder.order_status || 'Pending'}
                                    </span>
                                </div>

                                <div className="h-px bg-slate-50 w-full"></div>

                                {/* Payment Info */}
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Payment Terms</span>
                                    <div className="text-sm font-medium text-slate-700">
                                        {selectedOrder.payment_terms || 'Standard'}
                                    </div>
                                    {selectedOrder.manual_payment_days && (
                                        <div className="text-xs text-slate-500 mt-1">
                                            {selectedOrder.manual_payment_days} days credit
                                        </div>
                                    )}
                                </div>

                                <div className="h-px bg-slate-50 w-full"></div>

                                {/* Total Amount */}
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total Value</span>
                                    <p className="text-2xl font-bold text-slate-800 tracking-tight">₹ {selectedOrder.total_amount?.toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Inclusive of taxes</p>
                                </div>

                                <div className="mt-auto">
                                    <button
                                        onClick={() => setSelectedOrder(null)}
                                        className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold rounded-lg transition-colors text-sm"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>

                            {/* Right Content - Full Details */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30 relative">
                                {/* Header Strip */}
                                <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-200/60 px-8 py-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-primary/10 p-2 rounded-lg text-primary">
                                            <FileText size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Order ID</p>
                                            <p className="text-base font-bold text-slate-800 tracking-tight">{selectedOrder.order_id}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-6 text-right">
                                        <div className="hidden sm:block">
                                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Contractor ID</p>
                                            <p className="text-sm font-semibold text-slate-700">{selectedOrder.contractor_id || '-'}</p>
                                        </div>
                                        <div className="hidden sm:block">
                                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Site ID</p>
                                            <p className="text-sm font-semibold text-slate-700">{selectedOrder.site_id || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 space-y-8">
                                    {/* Info Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Contractor Card */}
                                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                                            <div className="flex items-center gap-2 mb-4 text-slate-800">
                                                <User size={16} className="text-primary" />
                                                <h4 className="font-bold text-xs uppercase tracking-wider">Contractor Details</h4>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-base font-bold text-slate-800">{selectedOrder.contractor_name}</p>
                                                <div className="flex flex-wrap gap-2 text-xs text-slate-500 font-medium">
                                                    <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600">{selectedOrder.customer_type}</span>
                                                    {selectedOrder.nickname && <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600">{selectedOrder.nickname}</span>}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-sm text-slate-600 mt-2">
                                                    <Phone size={14} className="text-slate-400" />
                                                    {selectedOrder.customer_phone || selectedOrder.site_contact_number || 'No contact'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Delivery Card */}
                                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                                            <div className="flex items-center gap-2 mb-4 text-slate-800">
                                                <Truck size={16} className="text-primary" />
                                                <h4 className="font-bold text-xs uppercase tracking-wider">Delivery Details</h4>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium text-slate-800 leading-relaxed">
                                                        {selectedOrder.delivery_address || 'No Address Provided'}
                                                    </p>
                                                    {(selectedOrder.city || selectedOrder.state) && (
                                                        <p className="text-xs text-slate-500 font-medium">
                                                            {selectedOrder.city ? `${selectedOrder.city}, ` : ''}{selectedOrder.state || ''}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex gap-4 pt-2 border-t border-slate-50">
                                                    <div>
                                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Logistics</span>
                                                        <span className="text-xs font-semibold text-slate-700">{selectedOrder.logistics_mode || 'N/A'}</span>
                                                    </div>
                                                    {selectedOrder.challan_reference && (
                                                        <div>
                                                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Challan</span>
                                                            <span className="text-xs font-semibold text-slate-700">{selectedOrder.challan_reference}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <ShoppingBag size={16} className="text-primary" />
                                                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">Order Items</h4>
                                            </div>
                                            <span className="text-xs font-semibold text-slate-500">
                                                {selectedOrder.items?.length || 0} Item{selectedOrder.items?.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-white text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                                <tr>
                                                    <th className="px-5 py-3">Product</th>
                                                    <th className="px-5 py-3 text-right">Qty</th>
                                                    <th className="px-5 py-3 text-right">Price</th>
                                                    <th className="px-5 py-3 text-right">Points</th>
                                                    <th className="px-5 py-3 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                                                    selectedOrder.items.map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-5 py-3 font-medium text-slate-700">{item.product_name}</td>
                                                            <td className="px-5 py-3 text-slate-600 text-right tabular-nums">{item.quantity}</td>
                                                            <td className="px-5 py-3 text-slate-600 text-right tabular-nums">₹{item.unit_price}</td>
                                                            <td className="px-5 py-3 text-blue-600 text-right tabular-nums font-medium">+{item.reward_points}</td>
                                                            <td className="px-5 py-3 text-slate-800 text-right font-bold tabular-nums">₹{(item.quantity * item.unit_price).toLocaleString()}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="5" className="px-5 py-8 text-center text-slate-400 text-xs italic">No items found</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                            <tfoot className="bg-slate-50/50 border-t border-slate-200/60">
                                                <tr>
                                                    <td className="px-5 py-3 font-semibold text-slate-600 text-xs">Total</td>
                                                    <td className="px-5 py-3 font-bold text-slate-700 text-right tabular-nums">
                                                        {selectedOrder.items?.reduce((s, i) => s + (i.quantity || 0), 0)}
                                                    </td>
                                                    <td colSpan="2"></td>
                                                    <td className="px-5 py-3 font-bold text-slate-800 text-right tabular-nums">
                                                        ₹{selectedOrder.total_amount?.toLocaleString()}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>

                                    {/* Footer: Points To & Notes */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Points To */}
                                        {selectedOrder.point_of_contact_role ? (
                                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-start gap-3">
                                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                                                    <Award size={16} />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Points Beneficiary</span>
                                                    <p className="text-sm font-bold text-slate-800">{selectedOrder.point_of_contact_role}</p>
                                                </div>
                                            </div>
                                        ) : <div></div>}

                                        {/* Notes */}
                                        {selectedOrder.remarks && (
                                            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                                                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg shrink-0">
                                                    <FileText size={16} />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold text-amber-700/60 uppercase tracking-widest block mb-0.5">Notes</span>
                                                    <p className="text-sm text-slate-700 leading-relaxed">{selectedOrder.remarks}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default NewOrder;
