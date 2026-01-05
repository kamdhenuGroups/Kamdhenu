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
    History
} from 'lucide-react';
import toast from 'react-hot-toast';

const NewOrder = () => {
    const [loading, setLoading] = useState(false);

    // Form State
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [customerName, setCustomerName] = useState('');
    const [items, setItems] = useState([{ id: 1, product: '', quantity: 1, price: 0, points: 0 }]);
    const [notes, setNotes] = useState('');

    // Tab State
    const [activeTab, setActiveTab] = useState('new');

    // History State
    const [orderHistory, setOrderHistory] = useState([
        {
            id: 'ORD-2024-001',
            date: '2024-01-15',
            customer: 'Rajesh Hardware Store',
            contact: '9876543210',
            amount: 45000,
            status: 'Completed',
            items: 12
        },
        {
            id: 'ORD-2024-002',
            date: '2024-01-18',
            customer: 'Amit Traders',
            contact: '9876543211',
            amount: 28500,
            status: 'Pending',
            items: 8
        },
        {
            id: 'ORD-2024-003',
            date: '2024-01-20',
            customer: 'Kamdhenu Plies',
            contact: '9876543212',
            amount: 125000,
            status: 'Processing',
            items: 25
        }
    ]);

    // New Fields State
    const [challanName, setChallanName] = useState('');
    const [sitePoc, setSitePoc] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [pointRole, setPointRole] = useState('');
    const [paymentTerms, setPaymentTerms] = useState('');
    const [manualPaymentDays, setManualPaymentDays] = useState('');
    const [logistics, setLogistics] = useState('');

    const POINT_ROLES = [
        'Tiler', 'Site Mistri', 'Assistant', 'Incharge', 'Purchase Manager'
    ];

    const PAYMENT_OPTIONS = [
        'Advance Payment', 'Same Day', 'Manual entry for days'
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
        setLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Add to history (Mock)
            const newOrder = {
                id: `ORD-${new Date().getFullYear()}-${String(orderHistory.length + 1).padStart(3, '0')}`,
                date: orderDate,
                customer: customerName,
                contact: sitePoc || 'N/A',
                amount: calculateTotal(),
                status: 'Pending',
                items: items.reduce((acc, item) => acc + item.quantity, 0)
            };
            setOrderHistory([newOrder, ...orderHistory]);

            toast.success('Order created successfully!');
            setActiveTab('history'); // Switch to history tab

            // Reset form
            setCustomerName('');
            setItems([{ id: 1, product: '', quantity: 1, price: 0, points: 0 }]);
            setNotes('');
            setChallanName('');
            setSitePoc('');
            setDeliveryAddress('');
            setPointRole('');
            setPaymentTerms('');
            setManualPaymentDays('');
            setLogistics('');
        } catch (error) {
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
                    <p className="text-slate-500 mt-1 text-sm">Create and manage customer orders.</p>
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

                                {/* Customer Name */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User size={18} className="text-slate-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            required
                                            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none text-sm"
                                            placeholder="Enter customer name"
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
                                            rows="2"
                                            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none text-sm resize-none"
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
                                            <input
                                                type="text"
                                                value={item.product}
                                                onChange={(e) => handleItemChange(item.id, 'product', e.target.value)}
                                                placeholder="Product name/SKU"
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none text-sm"
                                                required
                                            />
                                        </div>

                                        {/* Quantity */}
                                        <div className="col-span-5 sm:col-span-2">
                                            <label className="block text-xs font-medium text-slate-500 mb-1 sm:hidden">Qty</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
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
                                                    value={item.price}
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
                                                    value={item.points}
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
                                            <th className="px-6 py-4 font-semibold text-slate-700">Customer</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Contact</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700 text-right">Items</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700 text-right">Amount</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700 text-center">Status</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {orderHistory.map((order) => (
                                            <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-primary cursor-pointer hover:underline">
                                                    {order.id}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-slate-400" />
                                                        {new Date(order.date).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-800 font-medium">
                                                    {order.customer}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                                                    {order.contact}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 text-right">
                                                    {order.items}
                                                </td>
                                                <td className="px-6 py-4 text-slate-800 font-semibold text-right">
                                                    ₹ {order.amount.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${order.status === 'Completed'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                        : order.status === 'Processing'
                                                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                            : 'bg-amber-50 text-amber-700 border-amber-100'
                                                        }`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button className="text-slate-400 hover:text-primary transition-colors p-1">
                                                        <Eye size={18} />
                                                    </button>
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
            </div>
        </div>
    );
};

export default NewOrder;
