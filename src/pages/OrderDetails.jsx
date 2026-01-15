import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast';
import {
    CreditCard,
    Calendar,
    User,
    FileText,
    DollarSign,
    AlertCircle,
    CheckCircle2,
    Clock,
    Edit,
    X,
    Save,
    Upload,
    Image as ImageIcon,
    ExternalLink,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

const OrderDetails = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [updateLoading, setUpdateLoading] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchPayments(currentPage);
    }, [currentPage]);

    const fetchPayments = async (page) => {
        setLoading(true);
        try {
            const from = (page - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            const { data, count, error } = await supabase
                .from('payments')
                .select(`
                    *,
                    orders (
                        contractor_name,
                        order_date,
                        total_amount,
                        customer_type,
                        created_by_user_name,
                        payment_terms,
                        manual_payment_days
                    )
                `, { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;
            setPayments(data || []);
            setTotalItems(count || 0);
        } catch (error) {
            console.error('Error fetching payments:', error);
            toast.error('Failed to load payment details');
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (payment) => {
        setEditingPayment({
            ...payment,
            actual_payment_date: payment.actual_payment_date || new Date().toISOString().split('T')[0],
            payment_mode: payment.payment_mode || 'Cash'
        });
        setSelectedFile(null);
        setIsEditModalOpen(true);
    };

    const handleUpdatePayment = async (e) => {
        e.preventDefault();
        setUpdateLoading(true);

        try {
            // Calculate status based on paid amount
            let status = 'Pending';
            const paid = parseFloat(editingPayment.paid_amount || 0);
            const total = parseFloat(editingPayment.order_amount || 0);

            if (paid >= total) status = 'Paid';
            else if (paid > 0) status = 'Partial';

            let proofUrl = editingPayment.payment_proof;

            // Handle File Upload
            if (selectedFile) {
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `${editingPayment.payment_id}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `payment-proofs/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('payments-proof') // Using 'payments-proof' bucket as requested
                    .upload(filePath, selectedFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('payments-proof')
                    .getPublicUrl(filePath);

                proofUrl = publicUrl;
            }

            const { error } = await supabase
                .from('payments')
                .update({
                    paid_amount: paid,
                    payment_status: status,
                    payment_mode: editingPayment.payment_mode,
                    actual_payment_date: editingPayment.actual_payment_date,
                    transaction_reference: editingPayment.transaction_reference,
                    payment_proof: proofUrl,
                    remarks: editingPayment.remarks,
                    updated_at: new Date().toISOString()
                })
                .eq('payment_id', editingPayment.payment_id);

            if (error) throw error;

            toast.success('Payment details updated successfully');
            setIsEditModalOpen(false);
            setEditingPayment(null);
            setSelectedFile(null);
            toast.success('Payment details updated successfully');
            setIsEditModalOpen(false);
            setEditingPayment(null);
            setSelectedFile(null);
            fetchPayments(currentPage);
        } catch (error) {
            console.error('Error updating payment:', error);
            toast.error('Failed to update payment details: ' + error.message);
        } finally {
            setUpdateLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'paid': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'partial': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'pending': return 'bg-slate-50 text-slate-700 border-slate-100';
            case 'overdue': return 'bg-red-50 text-red-700 border-red-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    const StatusIcon = ({ status }) => {
        switch (status?.toLowerCase()) {
            case 'paid': return <CheckCircle2 size={14} />;
            case 'partial': return <AlertCircle size={14} />;
            case 'pending': return <Clock size={14} />;
            default: return <Clock size={14} />;
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(amount || 0);
    };

    const calculateDueDate = (orderDate, paymentTerms, manualDays) => {
        if (!orderDate) return null;
        const date = new Date(orderDate);

        if (paymentTerms === 'Manual entry for days' && manualDays) {
            date.setDate(date.getDate() + parseInt(manualDays));
            return date;
        }
        // Handle other terms if needed, defaulting to order date if immediate
        if (paymentTerms === 'Same Day') return date;

        // For Advance Payment, it's effectively immediate/before order, 
        // effectively Due Date = Order Date for tracking purposes if not paid?
        // Or null? Let's assume Order Date for now.
        return date;
    };

    const getOverdueDays = (dueDate, paymentStatus) => {
        if (!dueDate || paymentStatus === 'Paid') return null;

        const today = new Date();
        // Reset times for accurate day diff
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);

        if (today > due) {
            const diffTime = Math.abs(today - due);
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        return null;
    };

    const getTotalDays = (orderDate, actualPaymentDate) => {
        if (!orderDate || !actualPaymentDate) return null;

        const start = new Date(orderDate);
        const end = new Date(actualPaymentDate);

        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto w-full space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <CreditCard className="text-primary" />
                        Order Payments
                    </h1>
                    <p className="text-slate-500 mt-1">Manage and track order payment statuses</p>
                </div>
            </div>

            {/* Payments Card Grid - Mobile/Tablet */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 xl:hidden">
                {payments.map((payment) => (
                    <div key={payment.payment_id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <button
                                    onClick={() => handleEditClick(payment)}
                                    className="text-xs font-semibold text-primary hover:text-primary/80 uppercase tracking-wider hover:underline text-left"
                                >
                                    Order #{payment.order_id}
                                </button>
                                <h3 className="font-bold text-slate-800 mt-1">{payment.orders?.contractor_name}</h3>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(payment.payment_status)}`}>
                                    <StatusIcon status={payment.payment_status} />
                                    {payment.payment_status || 'Pending'}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-100">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Order Amount</span>
                                <span className="font-medium text-slate-900">{formatCurrency(payment.order_amount)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Paid Amount</span>
                                <span className="font-medium text-emerald-600">{formatCurrency(payment.paid_amount)}</span>
                            </div>
                            <div className="flex justify-between text-sm pt-2 border-t border-slate-50">
                                <span className="text-slate-500 font-medium">Balance</span>
                                <span className="font-bold text-red-600">{formatCurrency(payment.order_amount - payment.paid_amount)}</span>
                            </div>
                            {(payment.payment_mode || payment.transaction_reference) && (
                                <div className="flex justify-between text-sm pt-2 border-t border-slate-50">
                                    <span className="text-slate-500">Mode</span>
                                    <div className="text-right">
                                        <span className="font-medium text-slate-700 block">{payment.payment_mode || '-'}</span>
                                        {payment.transaction_reference && (
                                            <span className="text-xs text-slate-400 font-mono">{payment.transaction_reference}</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {payment.remarks && (
                            <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">
                                {payment.remarks}
                            </div>
                        )}

                        {payment.payment_proof && (
                            <a
                                href={payment.payment_proof}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs text-primary hover:underline bg-primary/5 p-2 rounded-lg border border-primary/10"
                            >
                                <ImageIcon size={14} />
                                View Payment Proof
                                <ExternalLink size={12} className="ml-auto" />
                            </a>
                        )}
                    </div>
                ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden xl:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Order ID</th>
                                <th className="p-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">RM</th>
                                <th className="p-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                                <th className="p-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Contractor / Customer</th>
                                <th className="p-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Order Amount</th>
                                <th className="p-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Paid Amount</th>
                                <th className="p-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Balance</th>
                                <th className="p-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Status</th>
                                <th className="p-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Due Date</th>
                                <th className="p-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Overdue Days</th>
                                <th className="p-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Actual Payment Date</th>
                                <th className="p-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Total Days</th>
                                <th className="p-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Mode</th>
                                <th className="p-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Reference</th>
                                <th className="p-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Proof</th>
                                <th className="p-4 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Remarks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {payments.length === 0 && (
                                <tr>
                                    <td colSpan="16" className="p-4 py-3 text-center text-slate-500 h-[60px]">
                                        No payment records found
                                    </td>
                                </tr>
                            )}

                            {payments.map((payment) => (
                                <tr key={payment.payment_id} className="hover:bg-slate-50/50 transition-colors h-[60px]">
                                    <td className="p-4 py-3 whitespace-nowrap">
                                        <button
                                            onClick={() => handleEditClick(payment)}
                                            className="font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
                                        >
                                            {payment.order_id}
                                        </button>
                                    </td>
                                    <td className="p-4 py-3 text-slate-600 whitespace-nowrap">
                                        {payment.orders?.created_by_user_name || '-'}
                                    </td>
                                    <td className="p-4 py-3 text-slate-600 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-400" />
                                            {payment.orders?.order_date ? new Date(payment.orders.order_date).toLocaleDateString('en-GB') : '-'}
                                        </div>
                                    </td>
                                    <td className="p-4 py-3 whitespace-nowrap">
                                        <div className="font-medium text-slate-800">{payment.orders?.contractor_name || 'Unknown'}</div>
                                        {payment.orders?.customer_type && (
                                            <div className="text-xs text-slate-500">{payment.orders.customer_type}</div>
                                        )}
                                    </td>
                                    <td className="p-4 py-3 text-right font-medium text-slate-700 whitespace-nowrap">
                                        {formatCurrency(payment.order_amount)}
                                    </td>
                                    <td className="p-4 py-3 text-right font-medium text-emerald-600 whitespace-nowrap">
                                        {formatCurrency(payment.paid_amount)}
                                    </td>
                                    <td className="p-4 py-3 text-right font-medium text-red-600 whitespace-nowrap">
                                        {formatCurrency(payment.order_amount - payment.paid_amount)}
                                    </td>
                                    <td className="p-4 py-3 text-center whitespace-nowrap">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(payment.payment_status)}`}>
                                            <StatusIcon status={payment.payment_status} />
                                            {payment.payment_status || 'Pending'}
                                        </span>
                                    </td>

                                    {/* Due Date & Overdue */}
                                    <td className="p-4 py-3 text-slate-600 whitespace-nowrap">
                                        {(() => {
                                            const dueDate = calculateDueDate(payment.orders?.order_date, payment.orders?.payment_terms, payment.orders?.manual_payment_days);
                                            return dueDate ? dueDate.toLocaleDateString('en-GB') : '-';
                                        })()}
                                    </td>
                                    <td className="p-4 py-3 text-center whitespace-nowrap">
                                        {(() => {
                                            const dueDate = calculateDueDate(payment.orders?.order_date, payment.orders?.payment_terms, payment.orders?.manual_payment_days);
                                            const overdue = getOverdueDays(dueDate, payment.payment_status);
                                            return overdue ? (
                                                <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded">{overdue} Days</span>
                                            ) : <span className="text-slate-400">-</span>;
                                        })()}
                                    </td>

                                    {/* Actual Payment Date */}
                                    <td className="p-4 py-3 text-slate-600 whitespace-nowrap">
                                        {payment.actual_payment_date ? new Date(payment.actual_payment_date).toLocaleDateString('en-GB') : '-'}
                                    </td>

                                    {/* Total Days */}
                                    <td className="p-4 py-3 text-center whitespace-nowrap">
                                        {(() => {
                                            const totalDays = getTotalDays(payment.orders?.order_date, payment.actual_payment_date);
                                            return totalDays !== null ? (
                                                <span className="text-slate-700 font-medium">{totalDays} Days</span>
                                            ) : '-';
                                        })()}
                                    </td>
                                    <td className="p-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                                        {payment.payment_mode ? (
                                            <span className="px-2 py-1 bg-slate-100 rounded text-slate-600 font-medium w-fit block">
                                                {payment.payment_mode}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="p-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                                        {payment.transaction_reference ? (
                                            <span className="text-slate-600">
                                                {payment.transaction_reference}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="p-4 py-3 whitespace-nowrap">
                                        {payment.payment_proof ? (
                                            <a
                                                href={payment.payment_proof}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-colors"
                                            >
                                                <ImageIcon size={14} />
                                                View
                                            </a>
                                        ) : (
                                            <span className="text-slate-400 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="p-4 py-3 text-slate-500 text-xs min-w-[200px] whitespace-normal">
                                        {payment.remarks || '-'}
                                    </td>
                                </tr>
                            ))}

                            {/* Empty Rows Filler */}
                            {Array.from({ length: Math.max(0, itemsPerPage - Math.max(1, payments.length)) + (payments.length === 0 ? 9 : 0) }).slice(0, Math.max(0, itemsPerPage - (payments.length || 1))).map((_, i) => (
                                <tr key={`empty-${i}`} className="h-[60px]">
                                    <td colSpan="16" className="p-4 py-3">&nbsp;</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2">
                <div className="text-sm text-slate-500">
                    Showing <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
                    <span className="font-medium">{totalItems}</span> results
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Previous Page"
                    >
                        <ChevronLeft size={18} className="text-slate-600" />
                    </button>

                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, Math.ceil(totalItems / itemsPerPage)) }, (_, i) => {
                            let pageNum;
                            const totalPages = Math.ceil(totalItems / itemsPerPage);

                            // Logic to show relevant page numbers
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (currentPage <= 3) {
                                pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = currentPage - 2 + i;
                            }

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum
                                        ? 'bg-primary text-white'
                                        : 'text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalItems / itemsPerPage)))}
                        disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Next Page"
                    >
                        <ChevronRight size={18} className="text-slate-600" />
                    </button>
                </div>
            </div>

            {/* Edit Payment Modal */}
            {
                isEditModalOpen && editingPayment && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
                            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                    <CreditCard className="text-primary" size={20} />
                                    Update Payment Details
                                </h3>
                                <button
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleUpdatePayment} className="p-6 space-y-4 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Order Amount</label>
                                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 font-medium">
                                            {formatCurrency(editingPayment.order_amount)}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Current Balance</label>
                                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 font-medium">
                                            {formatCurrency(editingPayment.order_amount - (editingPayment.paid_amount || 0))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Received Amount <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="number"
                                                value={editingPayment.paid_amount || ''}
                                                onChange={(e) => setEditingPayment({ ...editingPayment, paid_amount: e.target.value })}
                                                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                                placeholder="0.00"
                                                max={editingPayment.order_amount}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                                            <select
                                                value={editingPayment.payment_mode || 'Cash'}
                                                onChange={(e) => setEditingPayment({ ...editingPayment, payment_mode: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                            >
                                                <option value="Cash">Cash</option>
                                                <option value="Online">Online / UPI</option>
                                                <option value="Cheque">Cheque</option>
                                                <option value="Bank Transfer">Bank Transfer</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                                            <input
                                                type="date"
                                                value={editingPayment.actual_payment_date ? editingPayment.actual_payment_date.split('T')[0] : ''}
                                                onChange={(e) => setEditingPayment({ ...editingPayment, actual_payment_date: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Transaction Ref / ID</label>
                                        <input
                                            type="text"
                                            value={editingPayment.transaction_reference || ''}
                                            onChange={(e) => setEditingPayment({ ...editingPayment, transaction_reference: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                            placeholder="e.g. UPI Ref, Cheque No."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Payment Proof (Image)</label>
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        setSelectedFile(e.target.files[0]);
                                                    }
                                                }}
                                                className="hidden"
                                                id="payment-proof-upload"
                                            />
                                            <label
                                                htmlFor="payment-proof-upload"
                                                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg border border-dashed border-slate-300 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all group"
                                            >
                                                <div className="p-2 bg-slate-100 rounded-full group-hover:bg-white transition-colors">
                                                    <Upload size={18} className="text-slate-500 group-hover:text-primary transition-colors" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-slate-700 group-hover:text-primary truncate">
                                                        {selectedFile ? selectedFile.name : (editingPayment.payment_proof ? 'Change Proof Image' : 'Upload Payment Proof')}
                                                    </p>
                                                    <p className="text-xs text-slate-400">Click to upload (JPG, PNG)</p>
                                                </div>
                                                {editingPayment.payment_proof && !selectedFile && (
                                                    <div className="px-2 py-1 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-md border border-emerald-100">
                                                        Existing
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                                        <textarea
                                            value={editingPayment.remarks || ''}
                                            onChange={(e) => setEditingPayment({ ...editingPayment, remarks: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
                                            rows="2"
                                            placeholder="Add any notes here..."
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={updateLoading}
                                        className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {updateLoading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Save size={18} />
                                                Update Payment
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default OrderDetails;
