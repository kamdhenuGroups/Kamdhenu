import React, { useEffect, useState, useMemo } from 'react';
import { dashboardService } from '../services/dashboardService';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { format, parseISO, isSameDay, getYear, getMonth, getHours } from 'date-fns';
import { Package, Calendar, MapPin, Users, TrendingUp } from 'lucide-react';

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return percent > 0.05 ? (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    ) : null;
};

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [allOrders, setAllOrders] = useState([]);

    // Filters for specific charts
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-indexed

    const [monthlyOrderYear, setMonthlyOrderYear] = useState(currentYear);
    const [citySalesFilter, setCitySalesFilter] = useState({ month: currentMonth, year: currentYear });
    const [dealValueYear, setDealValueYear] = useState(currentYear);
    const [totalOrdersYear, setTotalOrdersYear] = useState(currentYear);

    const [availableYears, setAvailableYears] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // We primarily need Orders data as it contains User, City, Total Amount, and Payment Status (on order level)
                const { data: orders, error } = await dashboardService.getDashboardData();
                if (error) throw error;

                setAllOrders(orders || []);

                // specific logic to extract years
                const years = Array.from(new Set((orders || []).map(o => getYear(parseISO(o.order_date || o.created_at))))).sort((a, b) => b - a);
                if (years.length === 0) years.push(currentYear);
                else {
                    // Ensure current year is always available even if no data
                    if (!years.includes(currentYear)) years.unshift(currentYear);
                }
                setAvailableYears(years);

            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // --- 1. Analytics of User's Order Creation (Amount Wise) with Payment Status ---
    const userOrderStats = useMemo(() => {
        const stats = {};
        allOrders.forEach(order => {
            const user = order.created_by_user_name || 'Unknown';
            // Get payment details
            const payment = (order.payments && order.payments.length > 0) ? order.payments[0] : null;

            const totalAmount = parseFloat(order.total_amount) || 0;
            const paidAmount = payment ? (parseFloat(payment.paid_amount) || 0) : 0;

            // Calculate outstanding
            let outstanding = totalAmount - paidAmount;
            if (outstanding < 0) outstanding = 0;

            // Determine buckets
            let overdueAmount = 0;
            let pendingAmount = 0;
            let partialDueAmount = 0;

            if (outstanding > 0) {
                const status = order.payment_status || 'Pending';
                let isOverdue = false;

                // Check Overdue status
                if (status === 'Overdue') {
                    isOverdue = true;
                } else if (payment && payment.due_date) {
                    const dueDate = parseISO(payment.due_date);
                    if (new Date() > dueDate) {
                        isOverdue = true;
                    }
                }

                if (isOverdue) {
                    overdueAmount = outstanding;
                } else {
                    // Not overdue, check if it's partially paid or fully pending
                    if (paidAmount > 0) {
                        partialDueAmount = outstanding;
                    } else {
                        pendingAmount = outstanding; // Fully unpaid and not overdue
                    }
                }
            }

            if (!stats[user]) {
                stats[user] = {
                    name: user,
                    Collected: 0,
                    PartialDue: 0,
                    Pending: 0,
                    Overdue: 0,
                    total: 0
                };
            }

            stats[user].Collected += paidAmount;
            stats[user].PartialDue += partialDueAmount;
            stats[user].Pending += pendingAmount;
            stats[user].Overdue += overdueAmount;
            stats[user].total += totalAmount;
        });

        // Sort by total revenue
        return Object.values(stats).sort((a, b) => b.total - a.total);
    }, [allOrders]);

    // --- 2. No of Orders added this month (Months wise pie-chart) - Filter: Year ---
    const monthlyOrdersData = useMemo(() => {
        const monthsData = Array.from({ length: 12 }, (_, i) => ({
            name: format(new Date(2000, i, 1), 'MMMM'),
            value: 0,
            monthIndex: i
        }));

        allOrders.forEach(order => {
            const date = parseISO(order.order_date || order.created_at);
            if (getYear(date) === parseInt(monthlyOrderYear)) {
                const monthIdx = getMonth(date);
                monthsData[monthIdx].value += 1;
            }
        });

        return monthsData.filter(m => m.value > 0);
    }, [allOrders, monthlyOrderYear]);

    // --- 3. No of orders added for current day (Live Data & Hourly Trend) ---
    const { todayOrdersCount, hourlyOrdersData } = useMemo(() => {
        const today = new Date();
        const todaysOrders = allOrders.filter(order => isSameDay(parseISO(order.created_at || order.order_date), today));

        const hourData = Array.from({ length: 24 }, (_, i) => ({
            hour: format(new Date().setHours(i, 0, 0, 0), 'ha'),
            orders: 0
        }));

        todaysOrders.forEach(order => {
            // Priority to created_at for accurate time info
            const date = parseISO(order.created_at || order.order_date);
            const hour = getHours(date);
            if (hourData[hour]) {
                hourData[hour].orders += 1;
            }
        });

        return {
            todayOrdersCount: todaysOrders.length,
            hourlyOrdersData: hourData
        };
    }, [allOrders]);

    // --- Total Orders Trend (Selected Year) ---
    const yearOrderTrend = useMemo(() => {
        const data = Array.from({ length: 12 }, (_, i) => ({
            month: format(new Date(parseInt(totalOrdersYear), i, 1), 'MMM'),
            orders: 0
        }));

        allOrders.forEach(order => {
            const date = parseISO(order.order_date || order.created_at);
            if (getYear(date) === parseInt(totalOrdersYear)) {
                data[getMonth(date)].orders += 1;
            }
        });
        return data;
    }, [allOrders, totalOrdersYear]);

    // --- 4. Sales this month (City Wise) - Filter: Month & Year ---
    const citySalesData = useMemo(() => {
        const salesByCity = {};

        allOrders.forEach(order => {
            const date = parseISO(order.order_date || order.created_at);
            if (getYear(date) === parseInt(citySalesFilter.year) && getMonth(date) === parseInt(citySalesFilter.month)) {
                const city = order.city || 'Unknown';
                const amount = parseFloat(order.total_amount) || 0;

                if (!salesByCity[city]) salesByCity[city] = 0;
                salesByCity[city] += amount;
            }
        });

        return Object.entries(salesByCity)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [allOrders, citySalesFilter]);

    // --- 5. Sum of deal values (month wise) (Line Chart) - Filter: Year ---
    const monthlyDealValues = useMemo(() => {
        const data = Array.from({ length: 12 }, (_, i) => ({
            name: format(new Date(2000, i, 1), 'MMM'),
            amount: 0
        }));

        allOrders.forEach(order => {
            const date = parseISO(order.order_date || order.created_at);
            if (getYear(date) === parseInt(dealValueYear)) {
                const monthIdx = getMonth(date);
                data[monthIdx].amount += (parseFloat(order.total_amount) || 0);
            }
        });

        return data;
    }, [allOrders, dealValueYear]);


    // COLORS
    // COLORS - Clean & Minimal Palette (Indigo-centric)
    const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#64748b'];

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50/50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-6 overflow-y-auto pb-10 px-4 sm:px-6 bg-slate-50/50">
            {/* Header */}
            <div className="flex flex-col gap-1 mt-6">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard Analytics</h1>
                <p className="text-slate-500 text-sm">Real-time insights and performance metrics.</p>
            </div>

            {/* --- Item 3: Today's Orders & Overview --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="flex flex-col h-full justify-between relative z-10">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="text-blue-100 font-medium text-sm">Today's Orders</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-4xl font-bold">{todayOrdersCount}</h3>
                                    <span className="text-sm text-blue-200">orders generated today</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                <span className="text-xs font-medium">Live</span>
                            </div>
                        </div>

                        {/* Line Chart for Hourly Trend */}
                        <div className="h-[140px] w-full -ml-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={hourlyOrdersData}>
                                    <XAxis dataKey="hour" hide />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                                        cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 2 }}
                                        labelStyle={{ color: '#94a3b8' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="orders"
                                        stroke="#ffffff"
                                        strokeWidth={3}
                                        dot={{ fill: '#fff', r: 2, strokeWidth: 0 }}
                                        activeDot={{ r: 6, fill: '#60a5fa', stroke: '#fff', strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="flex justify-between items-center mt-0 pt-2 border-t border-white/10">
                            <p className="text-xs text-blue-200/80">Hourly trend for {format(new Date(), 'dd MMMM yyyy')}</p>
                            <div className="flex items-center gap-1 text-xs text-blue-200">
                                <TrendingUp size={14} />
                                <span>Real-time</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-slate-500 font-medium text-sm">Total Orders</p>
                                <select
                                    className="bg-slate-100 border-none text-slate-600 text-[10px] rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer h-6"
                                    value={totalOrdersYear}
                                    onChange={(e) => setTotalOrdersYear(e.target.value)}
                                >
                                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <h3 className="text-4xl font-bold text-slate-800">
                                {allOrders.filter(o => getYear(parseISO(o.order_date || o.created_at)) === parseInt(totalOrdersYear)).length}
                            </h3>
                        </div>
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <Package size={20} />
                        </div>
                    </div>

                    <div className="h-[140px] w-full -ml-2 relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={yearOrderTrend} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <XAxis
                                    dataKey="month"
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                    interval={0}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="orders" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <p className="text-xs text-slate-400 mt-2 relative z-10">Monthly order volume</p>
                </div>
            </div>

            {/* --- Item 5: Sum of deal values (month wise) (Line Chart) (Year Filter) --- */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <TrendingUp className="text-emerald-500" size={20} />
                            Potential Revenue Trend
                        </h3>
                        <p className="text-slate-500 text-xs">Sum of deal values generated per month.</p>
                    </div>
                    <select
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        value={dealValueYear}
                        onChange={(e) => setDealValueYear(e.target.value)}
                    >
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyDealValues} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                            <Tooltip
                                formatter={(value) => [`₹${value.toLocaleString()}`, 'Deal Value']}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="amount"
                                stroke="#10b981"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* --- Item 1: User's Order Creation & Payment Status --- */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Users className="text-blue-500" size={20} />
                            User Performance & Payment Status
                        </h3>
                        <p className="text-slate-500 text-xs">Total revenue generated by each user, broken down by collection status.</p>
                    </div>
                </div>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={userOrderStats} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis
                                tick={{ fontSize: 12, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                cursor={{ fill: '#f8fafc' }}
                                formatter={(value) => [`₹${value.toLocaleString()}`, '']}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                            {/* Stack Order: Collected | Partial Due | Pending | Overdue */}
                            <Bar dataKey="Collected" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} barSize={40} name="Collected" />
                            <Bar dataKey="PartialDue" stackId="a" fill="#8b5cf6" barSize={40} name="Partial Balance" />
                            <Bar dataKey="Pending" stackId="a" fill="#f59e0b" barSize={40} name="Pending (New)" />
                            <Bar dataKey="Overdue" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} name="Overdue" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* --- Item 2: No of Orders added this month (Year Filter) --- */}
                {/* Interpretation: Monthly Distribution Pie Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Package className="text-indigo-500" size={20} />
                                Monthly Order Distribution
                            </h3>
                            <p className="text-slate-500 text-xs">Share of orders per month.</p>
                        </div>
                        <select
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            value={monthlyOrderYear}
                            onChange={(e) => setMonthlyOrderYear(e.target.value)}
                        >
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={monthlyOrdersData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    dataKey="value"
                                    nameKey="name"
                                    labelLine={false}
                                    label={renderCustomizedLabel}
                                >
                                    {monthlyOrdersData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value) => [`${value} Orders`, 'Volume']}
                                />
                                <Legend
                                    layout="vertical"
                                    align="right"
                                    verticalAlign="middle"
                                    iconType="circle"
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* --- Item 4: Sales this month (City Wise) (Month & Year Filter) --- */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <MapPin className="text-rose-500" size={20} />
                                City Wise Sales
                            </h3>
                            <p className="text-slate-500 text-xs">Revenue distribution by city.</p>
                        </div>
                        <div className="flex gap-2">
                            <select
                                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                value={citySalesFilter.month}
                                onChange={(e) => setCitySalesFilter(prev => ({ ...prev, month: e.target.value }))}
                            >
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i} value={i}>{format(new Date(2000, i, 1), 'MMM')}</option>
                                ))}
                            </select>
                            <select
                                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                value={citySalesFilter.year}
                                onChange={(e) => setCitySalesFilter(prev => ({ ...prev, year: e.target.value }))}
                            >
                                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex-1 min-h-[300px]">
                        {citySalesData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={citySalesData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        dataKey="value"
                                        nameKey="name"
                                        labelLine={false}
                                        label={renderCustomizedLabel}
                                    >
                                        {citySalesData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => [`₹${value.toLocaleString()}`, 'Sales']}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend iconType="circle" layout="vertical" align="right" verticalAlign="middle" />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                No sales data for selected period.
                            </div>
                        )}
                    </div>
                </div>
            </div>


        </div>
    );
};

export default Dashboard;
