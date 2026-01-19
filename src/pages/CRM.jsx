import React, { useState, useEffect, useMemo } from 'react';
import {
    LayoutDashboard,
    Search,
    Filter,
    Calendar,
    Eye,
    CheckCircle,
    XCircle,
    AlertCircle,
    Package,
    Users,
    Truck,
    CreditCard,
    MapPin,



    ChevronDown,
    X,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import { orderService } from '../services/orderService';
import NewContractorApproval from '../components/NewContractorApproval';
import { format } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import PaymentDetailsCard from '../components/PaymentDetailsCard';
import TableFilterHeader from '../components/TableFilterHeader';

const STATUS_COLORS = {
    'Pending': 'bg-amber-100 text-amber-800 border-amber-200',
    'Approved': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Rejected': 'bg-rose-100 text-rose-800 border-rose-200',
    'New': 'bg-blue-100 text-blue-800 border-blue-200'
};

const OrdersTab = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState([]);
    const [cityFilter, setCityFilter] = useState([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [cities, setCities] = useState([]);
    const [rmFilter, setRmFilter] = useState([]);
    const [rms, setRms] = useState([]);
    const [typeFilter, setTypeFilter] = useState('All');
    const [types, setTypes] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'order_date', direction: 'desc' });



    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        const { data, error } = await orderService.getOrders();
        if (error) {
            toast.error('Failed to fetch orders');
            console.error(error);
        } else {
            setOrders(data || []);
            // Extract unique cities
            const uniqueCities = [...new Set((data || []).map(o => o.city).filter(c => c))].sort();
            setCities(uniqueCities);

            // Extract unique RMs
            const uniqueRms = [...new Set((data || []).map(o => o.created_by_user_name).filter(n => n))].sort();
            setRms(uniqueRms);

            // Extract unique Customer Types
            const uniqueTypes = [...new Set((data || []).map(o => o.customer_type).filter(t => t))].sort();
            setTypes(uniqueTypes);


        }
        setLoading(false);
    };



    const handleStatusUpdate = async (orderId, newStatus) => {
        const loadingToast = toast.loading(`Updating order to ${newStatus}...`);
        const { error } = await orderService.updateOrder(orderId, { order_status: newStatus });

        if (error) {
            toast.error('Failed to update status', { id: loadingToast });
        } else {
            toast.success(`Order ${newStatus} successfully`, { id: loadingToast });
            // Update local state and current selected order
            const updatedOrders = orders.map(o =>
                o.order_id === orderId ? { ...o, order_status: newStatus } : o
            );
            setOrders(updatedOrders);

            if (selectedOrder && selectedOrder.order_id === orderId) {
                setSelectedOrder({ ...selectedOrder, order_status: newStatus });
            }
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setCityFilter([]);
        setRmFilter([]);
        setTypeFilter('All');
        setStatusFilter([]);
        setStartDate('');
        setEndDate('');
    };

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const matchesSearch =
                (order.contractor_name?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
                (order.order_id?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
                (order.site_id?.toLowerCase().includes(searchTerm.toLowerCase()) || '');

            const matchesStatus = statusFilter.length === 0 || statusFilter.includes(order.order_status);
            const matchesCity = cityFilter.length === 0 || cityFilter.includes(order.city);
            const matchesRm = rmFilter.length === 0 || rmFilter.includes(order.created_by_user_name);
            const matchesType = typeFilter === 'All' || order.customer_type === typeFilter;

            let matchesDate = true;
            if (startDate || endDate) {
                const orderDate = new Date(order.order_date);
                const start = startDate ? new Date(startDate) : null;
                const end = endDate ? new Date(endDate) : null;

                // Set times to cover full days
                if (start) start.setHours(0, 0, 0, 0);
                if (end) end.setHours(23, 59, 59, 999);

                if (start && orderDate < start) matchesDate = false;
                if (end && orderDate > end) matchesDate = false;
            }

            return matchesSearch && matchesStatus && matchesCity && matchesRm && matchesType && matchesDate;
        });
    }, [orders, searchTerm, statusFilter, cityFilter, rmFilter, typeFilter, startDate, endDate]);

    const sortedOrders = useMemo(() => {
        let sortableItems = [...filteredOrders];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (sortConfig.key === 'total_amount') {
                    aValue = Number(aValue) || 0;
                    bValue = Number(bValue) || 0;
                } else if (sortConfig.key === 'order_date') {
                    aValue = new Date(aValue).getTime();
                    bValue = new Date(bValue).getTime();
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredOrders, sortConfig]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Format Currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const hasActiveFilters = searchTerm || cityFilter.length > 0 || typeFilter !== 'All' || rmFilter.length > 0 || statusFilter.length > 0 || startDate || endDate;

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">


            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Orders Dashboard</h1>
                    <p className="text-slate-500 mt-1">Manage and track all CRM orders efficiently</p>
                </div>
                <button
                    onClick={fetchOrders}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm font-medium"
                >
                    <LayoutDashboard size={18} />
                    Refresh Data
                </button>
            </div>

            {/* Stats Cards */}


            {/* Filters Bar */}
            {/* Filters Bar */}
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-3 items-center">
                {/* Search */}
                <div className="relative w-full xl:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search orders..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filters Group */}
                <div className="flex flex-1 flex-wrap items-center gap-2 w-full xl:justify-end">

                    {/* Date Range Filter */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1 w-full sm:w-auto overflow-x-auto">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            max={endDate}
                            className="bg-transparent text-slate-700 py-1 px-2 text-sm font-medium focus:outline-none flex-1 sm:flex-none min-w-[120px]"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate}
                            className="bg-transparent text-slate-700 py-1 px-2 text-sm font-medium focus:outline-none flex-1 sm:flex-none min-w-[120px]"
                        />
                    </div>

                    {/* Clear Filters Button - Mobile/Desktop Placement */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1.5 px-3 py-2 text-rose-600 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100 transition-colors text-xs font-medium mr-auto xl:mr-0 order-last xl:order-first"
                        >
                            <X size={14} />
                            Clear
                        </button>
                    )}

                    {/* Type Filter */}
                    <div className="relative flex-1 sm:flex-none w-full sm:w-auto">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className={`appearance-none w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium cursor-pointer hover:border-slate-300 transition-colors`}
                            style={{ minWidth: "140px" }}
                        >
                            <option value="All">All Types</option>
                            {types.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm font-semibold uppercase tracking-wider">
                                <th className="p-4 py-3">Order ID</th>
                                <th
                                    className="p-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                                    onClick={() => requestSort('order_date')}
                                >
                                    <div className="flex items-center gap-1">
                                        Date
                                        {sortConfig.key === 'order_date' && (
                                            sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                        )}
                                    </div>
                                </th>
                                <th className="p-4 py-3">
                                    <TableFilterHeader
                                        title="RM"
                                        options={rms}
                                        selectedValues={rmFilter}
                                        onChange={setRmFilter}
                                    />
                                </th>
                                <th className="p-4 py-3">Contractor / Site</th>
                                <th className="p-4 py-3">
                                    <TableFilterHeader
                                        title="Location"
                                        options={cities}
                                        selectedValues={cityFilter}
                                        onChange={setCityFilter}
                                    />
                                </th>
                                <th
                                    className="p-4 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                                    onClick={() => requestSort('total_amount')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Amount
                                        {sortConfig.key === 'total_amount' && (
                                            sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                        )}
                                    </div>
                                </th>
                                <th className="p-4 py-3 text-center flex justify-center">
                                    <TableFilterHeader
                                        title="Status"
                                        options={['Pending', 'Approved', 'Rejected', 'New']}
                                        selectedValues={statusFilter}
                                        onChange={setStatusFilter}
                                    />
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-slate-500">
                                        <div className="animate-pulse flex flex-col items-center">
                                            <div className="h-4 w-48 bg-slate-200 rounded mb-2"></div>
                                            <div className="h-3 w-32 bg-slate-100 rounded"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : sortedOrders.length > 0 ? (
                                sortedOrders.map((order) => (
                                    <tr key={order.order_id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td
                                            onClick={() => {
                                                setSelectedOrder(order);
                                                setShowModal(true);
                                            }}
                                            className="p-4 py-3 font-medium text-blue-600 hover:text-blue-800 cursor-pointer transition-colors"
                                        >
                                            {order.order_id}
                                        </td>
                                        <td className="p-4 py-3 text-slate-600">
                                            {order.order_date ? format(new Date(order.order_date), 'dd MMM yyyy') : '-'}
                                        </td>
                                        <td className="p-4 py-3 text-slate-700 font-medium">
                                            {order.created_by_user_name || '-'}
                                        </td>
                                        <td className="p-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-900">{order.contractor_name}</span>
                                                <span className="text-xs text-slate-500">{order.site_id}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 py-3 text-slate-600">
                                            {order.city || '-'}
                                        </td>
                                        <td className="p-4 py-3 text-right font-medium text-slate-900">
                                            {formatCurrency(order.total_amount)}
                                        </td>
                                        <td className="p-4 py-3 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[order.order_status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                {order.order_status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center">
                                        <div className="flex flex-col items-center text-slate-400">
                                            <Package size={48} className="mb-4 text-slate-200" />
                                            <h3 className="text-lg font-medium text-slate-600">No orders found</h3>
                                            <p className="text-sm">Try adjusting your filters or search terms.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Order Details Modal */}
            {
                showModal && selectedOrder && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-5xl h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
                            {/* Modal Header */}
                            <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">Order Details</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-sm text-slate-500">
                                                {selectedOrder.created_at ? format(new Date(selectedOrder.created_at), 'PPP p') : ''}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${STATUS_COLORS[selectedOrder.order_status]}`}>
                                        {selectedOrder.order_status}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <XCircle size={24} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8">

                                {/* Key Details Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <DetailSection title="Contractor & Location" icon={Users}>
                                        <div className="space-y-3">
                                            <DetailRow label="Order ID" value={selectedOrder.order_id} />
                                            <DetailRow label="Contractor ID" value={selectedOrder.contractor_id} />
                                            <DetailRow label="Site ID" value={selectedOrder.site_id} />
                                            <div className="pt-2 border-t border-slate-100"></div>
                                            <DetailRow label="Contractor Name" value={selectedOrder.contractor_name + (selectedOrder.nickname && selectedOrder.customer_type !== 'Mistry' ? ` (${selectedOrder.nickname})` : '')} />
                                            <DetailRow label="Type" value={selectedOrder.customer_type} />
                                            {selectedOrder.mistry_name && selectedOrder.customer_type !== 'Mistry' &&
                                                <DetailRow label="Mistry Name" value={selectedOrder.mistry_name} />
                                            }
                                            <DetailRow label="Phone" value={selectedOrder.customer_phone} />
                                            <div className="pt-2 border-t border-slate-100"></div>
                                            <DetailRow label="Site Contact" value={selectedOrder.site_contact_number} />
                                            <DetailRow label="City / State" value={`${selectedOrder.city || '-'}, ${selectedOrder.state || '-'}`} />
                                        </div>
                                    </DetailSection>

                                    <DetailSection title="Logistics & Payment" icon={Truck}>
                                        <div className="space-y-3">
                                            <DetailRow label="Logistics Mode" value={selectedOrder.logistics_mode} />
                                            <DetailRow label="Payment Terms" value={selectedOrder.payment_terms} />
                                            {selectedOrder.manual_payment_days && (
                                                <DetailRow label="Credit Days" value={`${selectedOrder.manual_payment_days} Days`} />
                                            )}
                                            <DetailRow label="Delivery Address" value={selectedOrder.delivery_address} className="break-words" />
                                            <DetailRow label="Challan Ref" value={selectedOrder.challan_reference} />
                                            <DetailRow label="Created By" value={selectedOrder.created_by_user_name} />
                                        </div>
                                    </DetailSection>
                                </div>

                                {/* Products Table */}
                                <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                                        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                            <Package size={18} />
                                            Ordered Products
                                        </h3>
                                        <span className="text-sm font-medium text-slate-600">
                                            Total Amount: {formatCurrency(selectedOrder.total_amount)}
                                        </span>
                                    </div>
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50/50 text-slate-500">
                                            <tr>
                                                <th className="px-4 py-2 font-medium">Product Name</th>
                                                <th className="px-4 py-2 font-medium text-right">Quantity</th>
                                                <th className="px-4 py-2 font-medium text-right">Unit Price</th>
                                                <th className="px-4 py-2 font-medium text-right">Points</th>
                                                <th className="px-4 py-2 font-medium text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedOrder.items && selectedOrder.items.length > 0 ? (
                                                selectedOrder.items.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-2 text-slate-800">{item.product_name}</td>
                                                        <td className="px-4 py-2 text-right text-slate-600">{item.quantity}</td>
                                                        <td className="px-4 py-2 text-right text-slate-600">{formatCurrency(item.unit_price)}</td>
                                                        <td className="px-4 py-2 text-right text-blue-600 font-medium">{item.reward_points} pts</td>
                                                        <td className="px-4 py-2 text-right font-medium text-slate-800">
                                                            {formatCurrency((item.quantity || 0) * (item.unit_price || 0))}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="px-4 py-4 text-center text-slate-400 italic">No products recorded</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Payment Details Component */}
                                <PaymentDetailsCard
                                    order={selectedOrder}
                                    payment={Array.isArray(selectedOrder.payments) ? selectedOrder.payments[0] : (selectedOrder.payments || {})}
                                />

                                {/* Points Allocation Table */}
                                <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                                        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                            <CreditCard size={18} />
                                            Points Beneficiaries
                                        </h3>
                                    </div>
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50/50 text-slate-500">
                                            <tr>
                                                <th className="px-4 py-2 font-medium">Name</th>
                                                <th className="px-4 py-2 font-medium">Role</th>
                                                <th className="px-4 py-2 font-medium text-right">Phone (Last 5)</th>
                                                <th className="px-4 py-2 font-medium text-right">Allocated Points</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedOrder.allocations && selectedOrder.allocations.length > 0 ? (
                                                selectedOrder.allocations.map((alloc, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-2 text-slate-800">{alloc.person_name}</td>
                                                        <td className="px-4 py-2 text-slate-600">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                                                                {alloc.role}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 text-right text-slate-600">...{alloc.phone_last_5}</td>
                                                        <td className="px-4 py-2 text-right font-bold text-blue-600">+{alloc.allocated_points}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="4" className="px-4 py-4 text-center text-slate-400 italic">No beneficiaries allocated</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Remarks */}
                                {selectedOrder.remarks && (
                                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                                        <h4 className="text-sm font-semibold text-amber-900 mb-1">Remarks / Notes</h4>
                                        <p className="text-sm text-amber-800">{selectedOrder.remarks}</p>
                                    </div>
                                )}

                            </div>

                            {/* Modal Footer (Actions) */}
                            <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-end gap-3 z-10 safe-area-bottom">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                    Close
                                </button>

                                {selectedOrder.order_status !== 'Approved' && (
                                    <button
                                        onClick={() => handleStatusUpdate(selectedOrder.order_id, 'Approved')}
                                        className="px-5 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 shadow-sm shadow-emerald-200 transition-all flex items-center gap-2"
                                    >
                                        <CheckCircle size={18} />
                                        Approve Order
                                    </button>
                                )}

                                {selectedOrder.order_status !== 'Rejected' && (
                                    <button
                                        onClick={() => handleStatusUpdate(selectedOrder.order_id, 'Rejected')}
                                        className="px-5 py-2 bg-white text-rose-600 border border-rose-200 font-medium rounded-lg hover:bg-rose-50 hover:border-rose-300 transition-all flex items-center gap-2"
                                    >
                                        <XCircle size={18} />
                                        Reject Order
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};



const CRM = () => {
    const [activeTab, setActiveTab] = useState('orders');

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <Toaster position="top-right" />

            {/* Minimal Header & Navigation */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200/50">
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${activeTab === 'orders'
                            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                    >
                        <Package size={16} className={activeTab === 'orders' ? 'text-blue-600' : ''} />
                        Orders
                    </button>
                    <button
                        onClick={() => setActiveTab('approval')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${activeTab === 'approval'
                            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                    >
                        <Users size={16} className={activeTab === 'approval' ? 'text-blue-600' : ''} />
                        New Influencer's Approvals
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'orders' ? <OrdersTab /> : <NewContractorApproval />}
            </div>
        </div>
    );
};

// Helper Components


const FilterButton = ({ label, active, onClick, count, color = 'blue' }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap
            ${active
                ? `bg-${color}-50 text-${color}-700 border border-${color}-200 shadow-sm`
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
    >
        {label}
        {count !== undefined && count > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] bg-${color}-200 text-${color}-800`}>
                {count}
            </span>
        )}
    </button>
);

const DetailSection = ({ title, icon: Icon, children }) => (
    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/60">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
            <Icon size={18} className="text-slate-400" />
            {title}
        </h3>
        {children}
    </div>
);

const DetailRow = ({ label, value, className = '' }) => (
    <div className={`flex flex-col sm:flex-row sm:justify-between py-1 ${className}`}>
        <span className="text-slate-500 text-sm font-medium">{label}</span>
        <span className="text-slate-800 text-sm font-medium text-right ml-0 sm:ml-4">{value || '-'}</span>
    </div>
);

export default CRM;
