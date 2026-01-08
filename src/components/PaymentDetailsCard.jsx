import React from 'react';
import { CreditCard, Calendar, AlertCircle, CheckCircle2, Clock, Upload, ExternalLink, Image as ImageIcon } from 'lucide-react';

const PaymentDetailsCard = ({ order, payment }) => {
    // Helper Functions
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const calculateDueDate = (orderDate, paymentTerms, manualDays) => {
        if (!orderDate) return null;
        const date = new Date(orderDate);

        if (paymentTerms === 'Manual entry for days' && manualDays) {
            date.setDate(date.getDate() + parseInt(manualDays));
            return date;
        }
        if (paymentTerms === 'Same Day') return date;
        // Default relative to order date for others if specific logic is missing
        return date;
    };

    const getOverdueDays = (dueDate, paymentStatus) => {
        if (!dueDate || paymentStatus === 'Paid') return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);

        if (today > due) {
            const diffTime = Math.abs(today - due);
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        return null;
    };

    const getStatusColor = (status) => {
        const s = status?.toLowerCase() || '';
        if (s === 'paid') return 'bg-green-100 text-green-700 border-green-200';
        if (s.includes('partially') || s.includes('partial')) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (s === 'pending') return 'bg-orange-100 text-orange-700 border-orange-200';
        if (s === 'overdue') return 'bg-red-100 text-red-700 border-red-200';
        return 'bg-purple-100 text-purple-700 border-purple-200';
    };

    const StatusIcon = ({ status }) => {
        const s = status?.toLowerCase() || '';
        if (s === 'paid') return <CheckCircle2 size={14} />;
        if (s.includes('partially') || s.includes('partial')) return <AlertCircle size={14} />;
        return <Clock size={14} />;
    };

    // Derived Data
    const paymentData = payment || {};
    const orderAmount = Number(order?.total_amount || paymentData.order_amount || 0);
    const paidAmount = Number(paymentData.paid_amount || 0);
    const balance = orderAmount - paidAmount;

    // Use payment status from payments table if available, else derive or fallback
    const status = paymentData.payment_status || order?.payment_status || 'Pending';

    const dueDate = calculateDueDate(order?.order_date, order?.payment_terms, order?.manual_payment_days);
    const overdueDays = getOverdueDays(dueDate, status);

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CreditCard size={16} className="text-primary" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">Payment Status</h4>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(status)}`}>
                    <StatusIcon status={status} />
                    {status}
                </span>
            </div>

            <div className="p-5 space-y-5">
                {/* Key Amounts */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-50">
                    <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Total Amount</span>
                        <span className="text-sm font-bold text-slate-800">{formatCurrency(orderAmount)}</span>
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Received</span>
                        <span className="text-sm font-bold text-emerald-600">{formatCurrency(paidAmount)}</span>
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Balance</span>
                        <span className="text-sm font-bold text-red-600">{formatCurrency(balance)}</span>
                    </div>
                </div>

                {/* Dates & Reference */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Due Date</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700">
                                {dueDate ? dueDate.toLocaleDateString('en-GB') : '-'}
                            </span>
                            {overdueDays && (
                                <span className="bg-red-50 text-red-600 text-[10px] px-1.5 py-0.5 rounded font-bold border border-red-100">
                                    {overdueDays} Days Overdue
                                </span>
                            )}
                        </div>
                    </div>

                    <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Actual Payment Date</span>
                        {paymentData.actual_payment_date
                            ? <span className="text-sm font-medium text-slate-700">{new Date(paymentData.actual_payment_date).toLocaleDateString('en-GB')}</span>
                            : <span className="text-sm text-slate-400">-</span>
                        }
                    </div>

                    <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Payment Mode</span>
                        <span className="text-sm font-medium text-slate-700">{paymentData.payment_mode || '-'}</span>
                    </div>

                    <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Reference / ID</span>
                        <span className="text-sm font-medium text-slate-700 font-mono text-xs">{paymentData.transaction_reference || '-'}</span>
                    </div>
                </div>

                {/* Proof & Remarks */}
                {(paymentData.payment_proof || paymentData.remarks) && (
                    <div className="pt-4 border-t border-slate-50 space-y-3">
                        {paymentData.payment_proof && (
                            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <span className="text-xs font-medium text-slate-600 flex items-center gap-2">
                                    <ImageIcon size={14} />
                                    Payment Proof
                                </span>
                                <a
                                    href={paymentData.payment_proof}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                >
                                    View Image <ExternalLink size={10} />
                                </a>
                            </div>
                        )}

                        {paymentData.remarks && (
                            <div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Payment Remarks</span>
                                <p className="text-xs text-slate-600 bg-amber-50/50 p-2 rounded border border-amber-50">
                                    {paymentData.remarks}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentDetailsCard;
