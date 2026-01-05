import React, { useState } from 'react';
import {
    ShoppingCart,
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
    Eye,
    Clock,
    CheckCircle,
    ShoppingBag,
    History,
    Search,
    Map,
    Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { INDIAN_LOCATIONS } from '../data/indianLocations';
import { orderService, CUSTOMER_TYPES } from '../services/orderService';

const NewOrder = () => {
    const [loading, setLoading] = useState(false);

    // Form State
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [contractorName, setContractorName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerType, setCustomerType] = useState('');
    const [items, setItems] = useState([{ id: 1, product: '', quantity: 1, price: 0, points: 0 }]);
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

    const handleDeleteOrder = async (id) => {
        if (!window.confirm('Are you sure you want to delete this order?')) return;

        const { error } = await orderService.deleteOrder(id);
        if (error) {
            toast.error('Failed to delete order');
        } else {
            toast.success('Order deleted successfully');
            fetchOrders();
        }
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

    // ID Generation State
    const [nickname, setNickname] = useState('');
    const [cityCode, setCityCode] = useState('');
    const [mistryName, setMistryName] = useState('');

    React.useEffect(() => {
        if (selectedCity) {
            let code = selectedCity.substring(0, 3).toUpperCase();
            if (selectedCity.toLowerCase() === 'raipur') code = 'RPR';
            if (selectedCity.toLowerCase() === 'nagpur') code = 'NAG';
            setCityCode(code);
        } else {
            setCityCode('');
        }
    }, [selectedCity]);

    const getGeneratedId = () => {
        if (!customerPhone || customerPhone.replace(/\D/g, '').length < 5) return '';
        if (!cityCode || !contractorName) return '';

        const phoneLast5 = customerPhone.replace(/\D/g, '').slice(-5);

        let typePrefix = 'C';
        if (customerType === 'Interiors/Architect') typePrefix = 'IA';
        else if (customerType === 'Site Supervisor') typePrefix = 'SS';
        else if (customerType === 'Mistry') typePrefix = 'Mi';

        const nameDisplay = (customerType === 'Contractor' && nickname) ? `${contractorName}(${nickname})` : contractorName;

        if (customerType === 'Mistry') {
            // Mi/ Contractor ID –Mistry name
            return `Mi/${phoneLast5}/${cityCode}/${nameDisplay}-${mistryName || ''}`;
        }

        return `${typePrefix}/${phoneLast5}/${cityCode}/${nameDisplay}`;
    };

    // Reset fields when customer type changes
    React.useEffect(() => {
        setNickname('');
        setMistryName('');
    }, [customerType]);

    const states = Object.keys(INDIAN_LOCATIONS);
    const filteredStates = states.filter(state =>
        state.toLowerCase().includes(stateSearch.toLowerCase())
    );

    const cities = selectedState ? INDIAN_LOCATIONS[selectedState] || [] : [];
    const filteredCities = cities.filter(city =>
        city.toLowerCase().includes(citySearch.toLowerCase())
    );

    const POINT_ROLES = [
        'Tiler', 'Site Mistri', 'Assistant', 'Incharge', 'Purchase Manager'
    ];

    const PAYMENT_OPTIONS = [
        'Advance Payment', 'Same Day', 'Manual entry for days'
    ];

    const PRODUCTS = [
        { name: 'K50 Floor & Wall Tile Adhesive', price: 600 },
        { name: 'K60 Superior Floor & Wall Tile Adhesive', price: 800 },
        { name: 'K80 Superior Tile & Stone Adhesive', price: 1000 },
        { name: 'K90 Paramount Tile & Stone Adhesive', price: 1200 },
        { name: 'Kamdhenu Infinity Stone & Tile Adhesive', price: 1500 },
        { name: 'Tile Grout', price: 300 },
        { name: 'Kamdhenu Infinia', price: 2000 }
    ];

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), product: '', quantity: 1, price: 0, points: 0 }]);
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

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!customerType) {
            toast.error('Please select a customer type');
            return;
        }

        setLoading(true);

        try {
            const orderPayload = {
                order_date: orderDate,
                contractor_name: contractorName,
                customer_type: customerType,
                customer_phone: customerPhone,
                items: items,
                total_amount: calculateTotal(),
                remarks: notes, // Renamed from notes
                challan_reference: challanName, // Renamed from challan_name
                site_contact_number: sitePoc, // Renamed from site_poc_contact
                delivery_address: deliveryAddress,
                point_of_contact_role: pointRole, // Renamed from point_role
                payment_terms: paymentTerms,
                manual_payment_days: manualPaymentDays ? parseInt(manualPaymentDays) : null,
                logistics_mode: logistics, // Renamed from logistics_option
                state: selectedState,
                city: selectedCity,
                order_id: getGeneratedId(),
                nickname: nickname,
                mistry_name: mistryName
            };

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
            setCitySearch('');
            setOrderDate(new Date().toISOString().split('T')[0]);
            setNickname('');
            setCityCode('');
            setMistryName('');
        } catch (error) {
            console.error(error);
            toast.error('Failed to create order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col gap-6 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <ShoppingCart className="text-primary" size={28} />
                        Order Management
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">Create and manage contractor orders.</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit shrink-0">
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

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeTab === 'new' ? (
                    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-6 pb-10">

                        {/* Order Details Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <FileText size={20} className="text-primary" />
                                Order Details
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Customer Type */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer Type</label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {CUSTOMER_TYPES.map(type => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setCustomerType(type)}
                                                className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${customerType === type
                                                    ? 'bg-primary/10 border-primary text-primary shadow-sm'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                    {!customerType && <p className="text-xs text-amber-600 mt-1.5 ml-1">Please select a customer type</p>}

                                    {/* Generated ID Display */}
                                    {customerType && (
                                        <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                            <p className="text-xs font-semibold text-slate-500 mb-1">Generated ID</p>
                                            <p className="text-sm font-mono font-medium text-primary break-all">
                                                {getGeneratedId() || <span className="text-slate-400 italic">Complete details to generate ID...</span>}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Order Date */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Order Date</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Calendar size={18} className="text-slate-400" />
                                        </div>
                                        <input
                                            type="date"
                                            value={orderDate}
                                            onChange={(e) => setOrderDate(e.target.value)}
                                            required
                                            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none text-sm text-slate-600"
                                        />
                                    </div>
                                </div>

                                {/* Customer Name */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Contractor Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User size={18} className="text-slate-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={contractorName}
                                            onChange={(e) => setContractorName(e.target.value)}
                                            required
                                            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none text-sm"
                                            placeholder="Enter contractor name"
                                        />
                                    </div>
                                </div>

                                {/* Customer Phone */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer Phone Number</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Phone size={18} className="text-slate-400" />
                                        </div>
                                        <input
                                            type="tel"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            required
                                            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none text-sm"
                                            placeholder="Enter phone number"
                                        />
                                    </div>
                                </div>

                                {/* Nickname (Only for Contractor) */}
                                {customerType === 'Contractor' && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Nickname <span className="text-slate-400 font-normal">(Market Name)</span>
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <User size={18} className="text-slate-400" />
                                            </div>
                                            <input
                                                type="text"
                                                value={nickname}
                                                onChange={(e) => setNickname(e.target.value)}
                                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none text-sm"
                                                placeholder="Optional (e.g. Nillu)"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Mistry Name (Only for Mistry) */}
                                {customerType === 'Mistry' && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Mistry Name</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <User size={18} className="text-slate-400" />
                                            </div>
                                            <input
                                                type="text"
                                                value={mistryName}
                                                onChange={(e) => setMistryName(e.target.value)}
                                                required={customerType === 'Mistry'}
                                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none text-sm"
                                                placeholder="Enter Mistry Name"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Challan Name */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Name of Challan</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FileText size={18} className="text-slate-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={challanName}
                                            onChange={(e) => setChallanName(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none text-sm"
                                            placeholder="Enter challan name"
                                        />
                                    </div>
                                </div>

                                {/* Site POC / Contact */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Site POC / Contact Number</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Phone size={18} className="text-slate-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={sitePoc}
                                            onChange={(e) => setSitePoc(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none text-sm"
                                            placeholder="Name or Phone number"
                                        />
                                    </div>
                                </div>

                                {/* State Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <MapPin size={18} className="text-slate-400" />
                                        </div>
                                        <div
                                            onClick={() => setShowStateDropdown(!showStateDropdown)}
                                            className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg cursor-pointer bg-white focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all text-sm flex items-center justify-between"
                                        >
                                            <span className={selectedState ? "text-slate-900" : "text-slate-400"}>
                                                {selectedState || "Select State"}
                                            </span>
                                            <ChevronDown size={16} className={`text-slate-400 transition-transform ${showStateDropdown ? 'rotate-180' : ''}`} />
                                        </div>

                                        {/* Dropdown */}
                                        {showStateDropdown && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={() => setShowStateDropdown(false)}
                                                ></div>
                                                <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
                                                    {/* Search Bar */}
                                                    <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
                                                        <div className="relative">
                                                            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                                                            <input
                                                                type="text"
                                                                value={stateSearch}
                                                                onChange={(e) => setStateSearch(e.target.value)}
                                                                placeholder="Search state..."
                                                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
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
                                                                        ? 'bg-primary/5 text-primary font-medium'
                                                                        : 'text-slate-700 hover:bg-slate-50'
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
                                                            <div className="px-3 py-4 text-center text-sm text-slate-500">
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
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Map size={18} className="text-slate-400" />
                                        </div>
                                        <div
                                            onClick={() => !selectedState ? toast.error('Please select a state first') : setShowCityDropdown(!showCityDropdown)}
                                            className={`block w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg bg-white transition-all text-sm flex items-center justify-between ${!selectedState ? 'cursor-not-allowed opacity-60 bg-slate-50' : 'cursor-pointer focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary'
                                                }`}
                                        >
                                            <span className={selectedCity ? "text-slate-900" : "text-slate-400"}>
                                                {selectedCity || "Select City"}
                                            </span>
                                            <ChevronDown size={16} className={`text-slate-400 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
                                        </div>

                                        {/* Dropdown */}
                                        {showCityDropdown && selectedState && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={() => setShowCityDropdown(false)}
                                                ></div>
                                                <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
                                                    {/* Search Bar */}
                                                    <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
                                                        <div className="relative">
                                                            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                                                            <input
                                                                type="text"
                                                                value={citySearch}
                                                                onChange={(e) => setCitySearch(e.target.value)}
                                                                placeholder="Search city..."
                                                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
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
                                                                        ? 'bg-primary/5 text-primary font-medium'
                                                                        : 'text-slate-700 hover:bg-slate-50'
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
                                                            <div className="px-3 py-4 text-center text-sm text-slate-500">
                                                                No city found
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* City Code */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">City Code</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <MapPin size={18} className="text-slate-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={cityCode}
                                            onChange={(e) => setCityCode(e.target.value.toUpperCase())}
                                            maxLength={3}
                                            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none text-sm font-mono uppercase"
                                            placeholder="XXX"
                                        />
                                    </div>
                                </div>

                                {/* Delivery Address */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Delivery Address</label>
                                    <div className="relative">
                                        <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                                            <MapPin size={18} className="text-slate-400" />
                                        </div>
                                        <textarea
                                            value={deliveryAddress}
                                            onChange={(e) => setDeliveryAddress(e.target.value)}
                                            rows="1"
                                            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none text-sm resize-none min-h-[42px]"
                                            placeholder="Enter full delivery address"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Order Items Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                    <Package size={20} className="text-primary" />
                                    Order Items
                                </h2>
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                                >
                                    + Add Item
                                </button>
                            </div>

                            <div className="space-y-3">
                                {/* Items Header */}
                                <div className="hidden sm:grid grid-cols-12 gap-3 px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <div className="col-span-5">Product Details</div>
                                    <div className="col-span-2">Quantity</div>
                                    <div className="col-span-2">Price</div>
                                    <div className="col-span-2">Points</div>
                                    <div className="col-span-1"></div>
                                </div>
                                {items.map((item, index) => (
                                    <div key={item.id} className="group relative grid grid-cols-12 gap-3 items-start p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:border-primary/20 hover:bg-slate-50 transition-colors">

                                        {/* Product Name */}
                                        <div className="col-span-12 sm:col-span-5">
                                            <label className="block text-xs font-medium text-slate-500 mb-1 sm:hidden">Product</label>
                                            <div className="relative">
                                                <select
                                                    value={item.product}
                                                    onChange={(e) => {
                                                        const selectedProduct = PRODUCTS.find(p => p.name === e.target.value);
                                                        setItems(items.map(i =>
                                                            i.id === item.id
                                                                ? { ...i, product: e.target.value, price: selectedProduct ? selectedProduct.price : 0 }
                                                                : i
                                                        ));
                                                    }}
                                                    className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none text-sm appearance-none truncate"
                                                    required
                                                >
                                                    <option value="">Select Product...</option>
                                                    {PRODUCTS.map((p, idx) => (
                                                        <option key={idx} value={p.name}>
                                                            {p.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-slate-400">
                                                    <ChevronDown size={14} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Quantity */}
                                        <div className="col-span-5 sm:col-span-2">
                                            <label className="block text-xs font-medium text-slate-500 mb-1 sm:hidden">Qty</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity || ''}
                                                onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none text-sm"
                                                required
                                            />
                                        </div>

                                        {/* Price */}
                                        <div className="col-span-5 sm:col-span-2">
                                            <label className="block text-xs font-medium text-slate-500 mb-1 sm:hidden">Price</label>
                                            <div className="relative">
                                                <span className="absolute left-2 top-2 text-slate-400 text-sm">₹</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.price || ''}
                                                    onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                                                    className="w-full pl-5 pr-2 py-2 bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none text-sm"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* Points */}
                                        <div className="col-span-5 sm:col-span-2">
                                            <label className="block text-xs font-medium text-slate-500 mb-1 sm:hidden">Points</label>
                                            <div className="relative">
                                                <span className="absolute left-2 top-2 text-slate-400 text-sm">P</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={item.points || ''}
                                                    onChange={(e) => handleItemChange(item.id, 'points', parseInt(e.target.value) || 0)}
                                                    className="w-full pl-5 pr-2 py-2 bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none text-sm"
                                                    placeholder="Pts"
                                                />
                                            </div>
                                        </div>

                                        {/* Remove Button */}
                                        <div className="col-span-2 sm:col-span-1 flex justify-end pt-2 sm:pt-0">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(item.id)}
                                                disabled={items.length === 1}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Total */}
                            <div className="mt-6 flex justify-end items-center gap-4 text-slate-800">
                                <span className="text-sm font-medium text-slate-500">Total Amount:</span>
                                <span className="text-2xl font-bold">₹ {calculateTotal().toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Points Allocation & Logistics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Points Allocation */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
                                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Award size={20} className="text-primary" />
                                    Points Allocation
                                </h2>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Points to be given to</label>
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <select
                                                value={pointRole}
                                                onChange={(e) => setPointRole(e.target.value)}
                                                className="block w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none text-sm appearance-none bg-white"
                                            >
                                                <option value="">Select Role</option>
                                                {POINT_ROLES.map(role => (
                                                    <option key={role} value={role}>{role}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                                <ChevronDown size={16} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment & Logistics */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
                                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <CreditCard size={20} className="text-primary" />
                                    Payment & Logistics
                                </h2>

                                <div className="space-y-4">
                                    {/* Logistics */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Logistics</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Truck size={18} className="text-slate-400" />
                                            </div>
                                            <select
                                                value={logistics}
                                                onChange={(e) => setLogistics(e.target.value)}
                                                className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none text-sm appearance-none bg-white"
                                            >
                                                <option value="">Select Logistics Option</option>
                                                <option value="Paid by Customer">Paid by Customer</option>
                                                <option value="Paid by Company">Paid by Company</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                                <ChevronDown size={16} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment Terms */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Terms</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <CreditCard size={18} className="text-slate-400" />
                                            </div>
                                            <select
                                                value={paymentTerms}
                                                onChange={(e) => setPaymentTerms(e.target.value)}
                                                className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none text-sm appearance-none bg-white"
                                            >
                                                <option value="">Select Payment Terms</option>
                                                {PAYMENT_OPTIONS.map(option => (
                                                    <option key={option} value={option}>{option}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                                <ChevronDown size={16} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Manual Days Input */}
                                    {paymentTerms === 'Manual entry for days' && (
                                        <div className="animate-in fade-in slide-in-from-top-1">
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Number of Days</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={manualPaymentDays}
                                                onChange={(e) => setManualPaymentDays(e.target.value)}
                                                className="block w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none text-sm"
                                                placeholder="Enter number of days"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Additional Notes</label>
                            <textarea
                                rows="3"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none text-sm resize-none"
                                placeholder="Add delivery instructions or any special notes..."
                            ></textarea>
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
                    <div className="max-w-6xl mx-auto pb-10">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Order ID</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Date</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Contractor</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Contact</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700 text-right">Items</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700 text-right">Amount</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700 text-center">Status</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {orderHistory.map((order) => (
                                            <tr key={order.order_id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-primary cursor-pointer hover:underline">
                                                    {order.order_id}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-slate-400" />
                                                        {new Date(order.order_date).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-800 font-medium">
                                                    {order.contractor_name}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                                                    {order.site_contact_number || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 text-right">
                                                    {Array.isArray(order.items) ? order.items.reduce((acc, item) => acc + (item.quantity || 0), 0) : 0}
                                                </td>
                                                <td className="px-6 py-4 text-slate-800 font-semibold text-right">
                                                    ₹ {order.total_amount?.toLocaleString() || '0'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${order.order_status === 'Completed'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                        : order.order_status === 'Processing'
                                                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                            : 'bg-amber-50 text-amber-700 border-amber-100'
                                                        }`}>
                                                        {order.order_status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => setSelectedOrder(order)}
                                                            className="text-slate-400 hover:text-primary transition-colors p-1"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteOrder(order.order_id)}
                                                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {orderHistory.length === 0 && (
                                            <tr>
                                                <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="bg-slate-50 p-3 rounded-full">
                                                            <ShoppingBag size={24} className="text-slate-400" />
                                                        </div>
                                                        <p>No orders found yet</p>
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                        <Package className="text-primary" size={24} />
                                        Order #{selectedOrder.order_id}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {new Date(selectedOrder.order_date).toLocaleDateString()} • {selectedOrder.contractor_name}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                                {/* Contract Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                                        <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                                            <User size={16} /> Customer Details
                                        </h4>
                                        <div className="text-sm space-y-2 text-slate-600">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Contractor:</span>
                                                <span className="font-medium text-slate-800">{selectedOrder.contractor_name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Type:</span>
                                                <span className="font-medium text-slate-800">{selectedOrder.customer_type || '-'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Contact:</span>
                                                <span className="font-medium text-slate-800">{selectedOrder.site_contact_number || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                                        <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                                            <MapPin size={16} /> Delivery Info
                                        </h4>
                                        <div className="text-sm space-y-2 text-slate-600">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">State:</span>
                                                <span className="font-medium text-slate-800">{selectedOrder.state || '-'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">City:</span>
                                                <span className="font-medium text-slate-800">{selectedOrder.city || '-'}</span>
                                            </div>
                                            <div className="block mt-2">
                                                <span className="text-slate-500 block text-xs mb-1">Address:</span>
                                                <span className="font-medium text-slate-800 block">{selectedOrder.delivery_address || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Products Table */}
                                <div>
                                    <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                        <ShoppingBag size={18} /> Order Items
                                    </h4>
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-3 font-medium text-slate-600">Product</th>
                                                    <th className="px-4 py-3 font-medium text-slate-600 text-right">Qty</th>
                                                    <th className="px-4 py-3 font-medium text-slate-600 text-right">Price</th>
                                                    <th className="px-4 py-3 font-medium text-slate-600 text-right">Points</th>
                                                    <th className="px-4 py-3 font-medium text-slate-600 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {selectedOrder.items && selectedOrder.items.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-3 text-slate-800 font-medium">{item.product_name}</td>
                                                        <td className="px-4 py-3 text-slate-600 text-right">{item.quantity}</td>
                                                        <td className="px-4 py-3 text-slate-600 text-right">₹{item.unit_price}</td>
                                                        <td className="px-4 py-3 text-blue-600 text-right">{item.reward_points}</td>
                                                        <td className="px-4 py-3 text-slate-800 text-right font-semibold">
                                                            ₹{(item.quantity * item.unit_price).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-slate-50 font-bold">
                                                    <td className="px-4 py-3 text-slate-800">Total</td>
                                                    <td className="px-4 py-3 text-slate-800 text-right">
                                                        {selectedOrder.items?.reduce((s, i) => s + (i.quantity || 0), 0)}
                                                    </td>
                                                    <td colSpan="2"></td>
                                                    <td className="px-4 py-3 text-slate-800 text-right text-base">
                                                        ₹{selectedOrder.total_amount?.toLocaleString()}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Additional Info */}
                                {(selectedOrder.point_of_contact_role || selectedOrder.remarks) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {selectedOrder.point_of_contact_role && (
                                            <div className="p-4 border border-slate-100 rounded-xl">
                                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Point Role</h4>
                                                <p className="text-slate-800 font-medium">{selectedOrder.point_of_contact_role}</p>
                                            </div>
                                        )}
                                        {selectedOrder.remarks && (
                                            <div className="p-4 border border-slate-100 rounded-xl">
                                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notes</h4>
                                                <p className="text-slate-600 text-sm whitespace-pre-wrap">{selectedOrder.remarks}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewOrder;
