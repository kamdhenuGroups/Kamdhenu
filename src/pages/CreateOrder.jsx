import React, { useState, useEffect } from 'react';
import { ShoppingBag, ArrowRight, User, ChevronDown } from 'lucide-react';
import { fetchActiveCustomers } from '../services/createOrderService';

const CreateOrder = () => {
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        try {
            setLoading(true);
            const data = await fetchActiveCustomers();
            setCustomers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Create Order</h1>
                <p className="text-slate-500 mt-1 text-sm">Create and manage new orders for customers.</p>
            </div>

            {/* Customer Selection */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
                <div className="max-w-md">
                    <label htmlFor="customer" className="block text-sm font-medium text-slate-700 mb-2">
                        Select Customer
                    </label>
                    <div className="relative">
                        <select
                            id="customer"
                            value={selectedCustomer}
                            onChange={(e) => setSelectedCustomer(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer disabled:opacity-50"
                            disabled={loading}
                        >
                            <option value="" disabled>
                                {loading ? 'Loading customers...' : 'Select a customer...'}
                            </option>
                            {customers.map((customer) => (
                                <option key={customer.customer_id} value={customer.customer_id}>
                                    {customer.customer_name} ({customer.primary_phone})
                                </option>
                            ))}
                        </select>
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                    {error && (
                        <p className="mt-2 text-sm text-red-500 font-medium">{error}</p>
                    )}
                </div>
            </div>

            {/* Order Items Placeholder */}
            {selectedCustomer ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8 min-h-[300px] flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                        <ShoppingBag size={32} />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">Start Adding Items</h2>
                    <p className="text-slate-500 max-w-md mb-6">
                        You have selected <strong>{customers.find(c => c.customer_id === selectedCustomer)?.customer_name}</strong>. Proceed to add items to this order.
                    </p>
                    <button className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2">
                        <span>Add Items</span>
                        <ArrowRight size={18} />
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8 min-h-[300px] flex flex-col items-center justify-center text-center opacity-60">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                        <ShoppingBag size={32} />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">Order Details</h2>
                    <p className="text-slate-500 max-w-md">
                        Please select a customer above to begin creating an order.
                    </p>
                </div>
            )}
        </div>
    );
};

export default CreateOrder;
