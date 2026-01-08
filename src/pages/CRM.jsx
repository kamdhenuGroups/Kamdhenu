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
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    ChevronDown
} from 'lucide-react';
import { orderService } from '../services/orderService';
import { format } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import PaymentDetailsCard from '../components/PaymentDetailsCard';

const STATUS_COLORS = {
    'Pending': 'bg-amber-100 text-amber-800 border-amber-200',
    'Approved': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Rejected': 'bg-rose-100 text-rose-800 border-rose-200',
    'New': 'bg-blue-100 text-blue-800 border-blue-200'
};

const CRM = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [cityFilter, setCityFilter] = useState('All');

    const [cities, setCities] = useState([]);
    const [rmFilter, setRmFilter] = useState('All');
    const [rms, setRms] = useState([]);
    const [typeFilter, setTypeFilter] = useState('All');
    const [types, setTypes] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Stats State
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        revenue: 0
    });

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

            calculateStats(data || []);
        }
        setLoading(false);
    };

    const calculateStats = (data) => {
        const stats = data.reduce((acc, order) => {
            acc.total++;
            if (order.order_status === 'Pending') acc.pending++;
            if (order.order_status === 'Approved') acc.approved++;
            acc.revenue += Number(order.total_amount) || 0;
            return acc;
        }, { total: 0, pending: 0, approved: 0, revenue: 0 });
        setStats(stats);
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
            calculateStats(updatedOrders);
            if (selectedOrder && selectedOrder.order_id === orderId) {
                setSelectedOrder({ ...selectedOrder, order_status: newStatus });
            }
        }
    };

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const matchesSearch =
                (order.contractor_name?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
                (order.order_id?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
                (order.site_id?.toLowerCase().includes(searchTerm.toLowerCase()) || '');

            const matchesStatus = statusFilter === 'All' || order.order_status === statusFilter;
            const matchesCity = cityFilter === 'All' || order.city === cityFilter;
            const matchesRm = rmFilter === 'All' || order.created_by_user_name === rmFilter;
            const matchesType = typeFilter === 'All' || order.customer_type === typeFilter;

            return matchesSearch && matchesStatus && matchesCity && matchesRm && matchesType;
        });
    }, [orders, searchTerm, statusFilter, cityFilter, rmFilter, typeFilter]);

    // Format Currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            <Toaster position="top-right" />

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Orders"
                    value={stats.total}
                    icon={Package}
                    color="blue"
                    trend="+12% from last month"
                />
                <StatCard
                    title="Pending Approvals"
                    value={stats.pending}
                    icon={Clock}
                    color="amber"
                    isWarning={stats.pending > 0}
                />
                <StatCard
                    title="Approved Orders"
                    value={stats.approved}
                    icon={CheckCircle}
                    color="emerald"
                />
                <StatCard
                    title="Total Revenue"
                    value={formatCurrency(stats.revenue)}
                    icon={CreditCard}
                    color="purple"
                />
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search orders, contractors, or sites..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>



                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* City / Site Filter */}
                    <div className="relative">
                        <select
                            value={cityFilter}
                            onChange={(e) => setCityFilter(e.target.value)}
                            className="appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium min-w-[150px] shadow-sm cursor-pointer hover:border-slate-300 transition-colors"
                        >
                            <option value="All">All Sites</option>
                            {cities.map(city => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>

                    {/* Customer Type Filter */}
                    <div className="relative">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium min-w-[150px] shadow-sm cursor-pointer hover:border-slate-300 transition-colors"
                        >
                            <option value="All">All Types</option>
                            {types.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>

                    {/* RM Filter */}
                    <div className="relative">
                        <select
                            value={rmFilter}
                            onChange={(e) => setRmFilter(e.target.value)}
                            className="appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium min-w-[150px] shadow-sm cursor-pointer hover:border-slate-300 transition-colors"
                        >
                            <option value="All">All RMs</option>
                            {rms.map(rm => (
                                <option key={rm} value={rm}>{rm}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium min-w-[180px] shadow-sm cursor-pointer hover:border-slate-300 transition-colors"
                        >
                            <option value="All">All Orders</option>
                            <option value="Pending">Pending {stats.pending > 0 ? `(${stats.pending})` : ''}</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
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
                                <th className="p-4 py-3">Date</th>
                                <th className="p-4 py-3">RM</th>
                                <th className="p-4 py-3">Contractor / Site</th>
                                <th className="p-4 py-3">Location</th>
                                <th className="p-4 py-3 text-right">Amount</th>
                                <th className="p-4 py-3 text-center">Status</th>
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
                            ) : filteredOrders.length > 0 ? (
                                filteredOrders.map((order) => (
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
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
                            <div className="flex-1 overflow-y-auto p-6 space-y-8">

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
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
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
                                                        <td className="px-4 py-2 text-right text-amber-600 font-medium">{item.reward_points} pts</td>
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
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
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
                                                <th className="px-4 py-2 font-medium text-right">Phone (Last 4)</th>
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
                                                        <td className="px-4 py-2 text-right text-slate-600">...{alloc.phone_last_4}</td>
                                                        <td className="px-4 py-2 text-right font-bold text-amber-600">+{alloc.allocated_points}</td>
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
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
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

// Helper Components
const StatCard = ({ title, value, icon: Icon, color, trend, isWarning }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between transition-transform hover:-translate-y-1 ${isWarning ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}>
        <div className="flex items-start justify-between">
            <div>
                <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">{title}</p>
                <h3 className="text-3xl font-bold mt-2 text-slate-900">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600`}>
                <Icon size={24} />
            </div>
        </div>
        {trend && (
            <div className="mt-4 flex items-center text-sm">
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <ArrowUpRight size={16} />
                    {trend}
                </span>
            </div>
        )}
    </div>
);

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
