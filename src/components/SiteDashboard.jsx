import React, { useEffect, useState, useMemo } from 'react';
import { siteDashboardService } from '../services/siteDashboardService';
import {
    MapPin,
    Building2,
    Calendar,
    Users,
    Wallet,
    TrendingUp,

    AlertCircle,
    CheckCircle2,
    ChevronDown,
    UserCircle,
    BadgeIndianRupee
} from 'lucide-react';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    ChartTooltip,
    Legend,
    Filler
);
import { format, parseISO, isValid } from 'date-fns';



const formatDateKey = (dateString, fmt) => {
    if (!dateString) return null;
    try {
        const date = parseISO(dateString);
        if (!isValid(date)) return null;
        return format(date, fmt);
    } catch (e) {
        return null;
    }
};

const SiteDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);

    // Filters

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [selectedMonth, setSelectedMonth] = useState(''); // '01', '02', etc.
    const [selectedCity, setSelectedCity] = useState('');

    // Fetch Data
    useEffect(() => {
        let mounted = true;
        const fetchData = async () => {
            try {
                const { data, error } = await siteDashboardService.getSiteDashboardData();
                if (!mounted) return;

                if (error) {
                    console.error("Dashboard data error:", error);
                    setOrders([]);
                } else {
                    setOrders(data || []);
                }
            } catch (err) {
                console.error("Failed to load dashboard data", err);
                if (mounted) setOrders([]);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        fetchData();
        return () => { mounted = false; };
    }, []);

    // --- Aggregation Logic ---

    // 2. Dropdown Options (Removed Site/Address/Contractor filters)


    const availableYears = useMemo(() => {
        const years = new Set(orders.map(o => formatDateKey(o.order_date || o.created_at, 'yyyy')).filter(Boolean));
        if (!years.has(new Date().getFullYear().toString()) && orders.length === 0) {
            years.add(new Date().getFullYear().toString());
        }
        return Array.from(years).sort().reverse();
    }, [orders]);

    const availableCities = useMemo(() => {
        const cities = new Set(orders.map(o => o.city).filter(Boolean));
        return Array.from(cities).sort();
    }, [orders]);

    useEffect(() => {
        if (availableYears.length > 0 && !selectedYear) {
            setSelectedYear(availableYears[0]);
        }
    }, [availableYears, selectedYear]);

    // Auto-select unique contractor



    // 3. Consolidated Data Logic (Global vs Selected)
    const dashboardData = useMemo(() => {
        // Global Overview
        let scopeOrders = orders;
        let contextTitle = "Global Overview";

        // Apply Year Filter
        if (selectedYear) {
            scopeOrders = scopeOrders.filter(o => {
                const y = formatDateKey(o.order_date || o.created_at, 'yyyy');
                return y === selectedYear;
            });
        }

        // Apply City Filter
        if (selectedCity) {
            scopeOrders = scopeOrders.filter(o => o.city === selectedCity);
        }

        // Apply Month Filter
        if (selectedMonth) {
            scopeOrders = scopeOrders.filter(o => {
                const m = formatDateKey(o.order_date || o.created_at, 'MM'); // Expecting '01', '02'...
                return m === selectedMonth;
            });
        }

        // Aggregate Metrics
        let totalSales = 0;
        let totalPaid = 0;
        let totalDue = 0;
        let partialPaymentsAmount = 0;

        const salesByDateMap = {};

        scopeOrders.forEach(order => {
            if (!order) return;

            const amount = parseFloat(order.total_amount) || 0;
            let orderPaid = 0;

            // Normalize payments to array (handle 1-1 response vs 1-M response)
            const paymentsList = Array.isArray(order.payments)
                ? order.payments
                : (order.payments ? [order.payments] : []);

            paymentsList.forEach(p => {
                orderPaid += (parseFloat(p?.paid_amount) || 0);
            });

            const due = Math.max(0, amount - orderPaid);

            totalSales += amount;
            totalPaid += orderPaid;
            totalDue += due;

            if (orderPaid > 0 && due > 0) {
                partialPaymentsAmount += orderPaid;
            }

            // Graphs
            if (amount > 0) {
                const dateKey = formatDateKey(order.created_at, 'MMM dd') || 'Unknown Date';
                salesByDateMap[dateKey] = (salesByDateMap[dateKey] || 0) + amount;
            }


        });

        // Chart Data Processing (Monthly for Chart.js)
        const monthlyStats = {};
        // Initialize months for the selected year
        for (let i = 0; i < 12; i++) {
            const date = new Date(parseInt(selectedYear), i, 1);
            const key = format(date, 'yyyy-MM');
            monthlyStats[key] = {
                month: format(date, 'MMM'),
                sales: 0,
                received: 0,
                dateObj: date
            };
        }

        // Iterate all orders to fill Chart Data
        // We do NOT filter by year upfront, because an order created in prev year might have payment in current year.
        // We DO filter by City if selected.
        let cityHasOrders = orders;
        if (selectedCity) {
            cityHasOrders = cityHasOrders.filter(o => o.city === selectedCity);
        }

        cityHasOrders.forEach(order => {
            // 1. Process Sales (Allocated to Order Creation Date)
            const orderDate = parseISO(order.order_date || order.created_at);
            if (isValid(orderDate)) {
                // Only add to sales stats if the order created date is in this selectedYear
                const orderYear = format(orderDate, 'yyyy');
                if (orderYear === selectedYear) {
                    const key = format(orderDate, 'yyyy-MM');
                    if (monthlyStats[key]) {
                        monthlyStats[key].sales += (parseFloat(order.total_amount) || 0);
                    }
                }
            }

            // 2. Process Payments (Allocated to Payment Date)
            const paymentsList = Array.isArray(order.payments)
                ? order.payments
                : (order.payments ? [order.payments] : []);

            paymentsList.forEach(p => {
                // Use actual_payment_date if available, otherwise created_at
                const pDateStr = p.actual_payment_date || p.created_at;
                if (!pDateStr) return;

                const pDate = parseISO(pDateStr);
                if (isValid(pDate)) {
                    const pYear = format(pDate, 'yyyy');
                    // Only add to received stats if payment date is in this selectedYear
                    if (pYear === selectedYear) {
                        const key = format(pDate, 'yyyy-MM');
                        if (monthlyStats[key]) {
                            monthlyStats[key].received += (parseFloat(p.paid_amount) || 0);
                        }
                    }
                }
            });
        });

        const lineChartData = {
            labels: Object.values(monthlyStats).map(d => d.month),
            datasets: [
                {
                    label: 'Sales Generated',
                    data: Object.values(monthlyStats).map(d => d.sales),
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#6366f1'
                },
                {
                    label: 'Payment Received',
                    data: Object.values(monthlyStats).map(d => d.received),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#10b981'
                }
            ]
        };



        const validOrder = scopeOrders[0] || {};
        const contractorDetails = {
            name: validOrder.contractor_name || 'N/A',
            id: validOrder.contractor_id || 'N/A',
            type: validOrder.customer_type || 'N/A'
        };
        const rmInfo = {
            name: validOrder.created_by_user_name || 'N/A'
        };
        const siteId = validOrder.site_id || 'N/A';

        return {
            title: contextTitle,
            totalSales,
            totalPaid,
            totalDue,
            partialPaymentsAmount,
            lineChartData,
            orderCount: scopeOrders.length,
            contractorDetails,
            rmInfo, // RM = User who has created the order
            siteId
        };

    }, [orders, selectedMonth, selectedYear, selectedCity]);


    // --- View Helpers ---

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50/50 pb-20 min-h-[calc(100vh-100px)]">

            {/* 1. Header & Filters Bar */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 justify-between md:items-center">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Building2 className="text-indigo-600" size={24} />
                            Site Analytics
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">
                            Global overview of all operational sites
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative min-w-[200px]">
                            <select
                                value={selectedCity}
                                onChange={(e) => setSelectedCity(e.target.value)}
                                className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl pl-4 pr-10 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer shadow-sm hover:border-indigo-300"
                            >
                                <option value="">All Cities</option>
                                {availableCities.map(city => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                            <MapPin size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Main Content Dashboard */}
            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

                {/* Information Cards (Contractor & RM) - Removed */}


                {/* Financial Overview Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                        label="Total Sales"
                        value={dashboardData.totalSales}
                        icon={<BadgeIndianRupee size={20} />}
                        color="text-indigo-600"
                        bg="bg-indigo-50"
                    />
                    <MetricCard
                        label="Total Paid"
                        value={dashboardData.totalPaid}
                        icon={<CheckCircle2 size={20} />}
                        color="text-emerald-600"
                        bg="bg-emerald-50"
                    />
                    <MetricCard
                        label="Total Due"
                        value={dashboardData.totalDue}
                        icon={<AlertCircle size={20} />}
                        color="text-rose-600"
                        bg="bg-rose-50"
                    />
                    <MetricCard
                        label="Partial Payouts"
                        value={dashboardData.partialPaymentsAmount}
                        icon={<Wallet size={20} />}
                        color="text-amber-600"
                        bg="bg-amber-50"
                    />
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Sales History Line Graph */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[420px] flex flex-col">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <TrendingUp size={18} className="text-slate-400" />
                                Sales History
                            </h3>
                            <div className="flex gap-2">
                                {/* Year Selector */}
                                <div className="relative">
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg pl-3 pr-8 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                    >
                                        {availableYears.map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>


                            </div>
                        </div>
                        <div className="flex-1 w-full min-h-0 relative px-2">
                            <Line
                                data={dashboardData.lineChartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: {
                                            position: 'top',
                                            align: 'end',
                                            labels: {
                                                usePointStyle: true,
                                                boxWidth: 8,
                                                font: { size: 12 }
                                            }
                                        },
                                        tooltip: {
                                            mode: 'index',
                                            intersect: false,
                                            callbacks: {
                                                label: function (context) {
                                                    let label = context.dataset.label || '';
                                                    if (label) {
                                                        label += ': ';
                                                    }
                                                    if (context.parsed.y !== null) {
                                                        label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(context.parsed.y);
                                                    }
                                                    return label;
                                                }
                                            }
                                        }
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            border: { display: false },
                                            grid: { color: '#f1f5f9' },
                                            ticks: {
                                                callback: (value) => value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value,
                                                font: { size: 11 }
                                            }
                                        },
                                        x: {
                                            border: { display: false },
                                            grid: { display: false },
                                            ticks: { font: { size: 11 } }
                                        }
                                    },
                                    interaction: {
                                        mode: 'nearest',
                                        axis: 'x',
                                        intersect: false
                                    }
                                }}
                            />
                        </div>
                        {dashboardData.lineChartData.datasets[0].data.every(d => d === 0) && dashboardData.lineChartData.datasets[1].data.every(d => d === 0) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                                <span className="text-slate-400 text-sm italic">No data for this period</span>
                            </div>
                        )}
                    </div>


                </div>
            </div>
        </div>
    );
};

// Simple Component for Metrics
const MetricCard = ({ label, value, subValue, icon, color, bg, customLabel }) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-2">
            <span className="text-slate-500 text-sm font-medium">{customLabel || label}</span>
            <div className={`p-2 rounded-lg ${bg} ${color}`}>
                {icon}
            </div>
        </div>
        <div>
            <div className={`text-2xl font-bold ${color}`}>
                ₹{value.toLocaleString()}
            </div>
            {subValue && (
                <p className="text-xs text-slate-400 mt-1 font-medium">
                    {subValue}
                </p>
            )}
        </div>
    </div>
);

export default SiteDashboard;
