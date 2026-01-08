import React, { useEffect, useState } from 'react';
import { orderService } from '../services/orderService';
import { leadService } from '../services/leadService';
import { paymentService } from '../services/paymentService';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend, AreaChart, Area, ComposedChart
} from 'recharts';
import { format, parseISO, startOfMonth, subDays, isSameDay, subMonths, isWithinInterval, endOfMonth, getYear, startOfYear, endOfYear, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign, Package, Users, Award, Wallet, AlertCircle, CheckCircle2, Clock, Calendar, BarChart3, PieChart as PieIcon, Activity } from 'lucide-react';

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [allOrders, setAllOrders] = useState([]);
    const [allPayments, setAllPayments] = useState([]);
    const [revenueFilter, setRevenueFilter] = useState({ year: 'last_12_months', month: 'all' });
    const [revenueChartData, setRevenueChartData] = useState([]);
    const [availableYears, setAvailableYears] = useState([]);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        totalPoints: 0,
        activeLeads: 0,
        monthlyRevenue: [],
        dailyActivity: [], // Combined Orders & Revenue
        cityPerformance: [], // Revenue by City
        leadFunnel: [],
        topProducts: [],
        beneficiaryRoles: [],
        growth: { revenue: 0, orders: 0, points: 0, leads: 0 },
        paymentStats: {
            totalCollected: 0,
            totalOutstanding: 0,
            overdueCount: 0,
            overdueAmount: 0,
            collectionRate: 0,
            statusDist: [],
            // monthlyCollections removed from here as it's now part of main chart
        }
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [ordersRes, leadsRes, paymentsRes] = await Promise.all([
                    orderService.getOrders(),
                    leadService.getLeads(),
                    paymentService.getPayments()
                ]);

                const orders = ordersRes.data || [];
                const leads = leadsRes.data || [];
                const payments = paymentsRes.data || [];

                setAllOrders(orders);
                setAllPayments(payments);

                // Use order_date if available, otherwise fallback to created_at
                const years = Array.from(new Set(orders.map(o => getYear(parseISO(o.order_date || o.created_at))))).sort((a, b) => b - a);
                setAvailableYears(years);

                processData(orders, leads, payments);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const processData = (orders, leads, payments) => {
        const today = new Date();
        const currentMonthStart = startOfMonth(today);
        const lastMonthStart = startOfMonth(subMonths(today, 1));
        const lastMonthEnd = endOfMonth(subMonths(today, 1));

        // 1. Core Metrics
        const currentMonthOrders = orders.filter(o => new Date(o.order_date || o.created_at) >= currentMonthStart);
        const lastMonthOrders = orders.filter(o => isWithinInterval(new Date(o.order_date || o.created_at), { start: lastMonthStart, end: lastMonthEnd }));
        const currentRevenue = currentMonthOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
        const lastRevenue = lastMonthOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

        const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

        const calcGrowth = (current, last) => last === 0 ? 0 : ((current - last) / last) * 100;

        let totalPoints = 0;
        let currentPoints = 0;
        let lastPoints = 0;
        const rolePointsAcc = {};

        orders.forEach(order => {
            const pointsProps = order.allocations?.reduce((sum, a) => sum + (a.allocated_points || 0), 0) || 0;
            totalPoints += pointsProps;
            const d = new Date(order.order_date || order.created_at);
            if (d >= currentMonthStart) currentPoints += pointsProps;
            if (d >= lastMonthStart && d <= lastMonthEnd) lastPoints += pointsProps;

            order.allocations?.forEach(alloc => {
                rolePointsAcc[alloc.role] = (rolePointsAcc[alloc.role] || 0) + (alloc.allocated_points || 0);
            });
        });

        const activeLeads = leads.filter(l => !['Won', 'Lost'].includes(l.lead_status)).length;
        const currentMonthLeads = leads.filter(l => new Date(l.created_at) >= currentMonthStart).length;
        const lastMonthLeads = leads.filter(l => isWithinInterval(new Date(l.created_at), { start: lastMonthStart, end: lastMonthEnd })).length;

        // 2. Charts Data Structure

        // Daily Activity (Last 14 days for cleaner view)
        const daysToShow = 14;
        const dailyInterval = Array.from({ length: daysToShow }, (_, i) => subDays(today, daysToShow - 1 - i));
        const dailyActivity = dailyInterval.map(day => {
            const dayStr = format(day, 'MMM dd');
            const dayOrders = orders.filter(order => isSameDay(parseISO(order.order_date || order.created_at), day));
            return {
                name: dayStr,
                orders: dayOrders.length,
                revenue: dayOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0)
            };
        });

        // City Performance
        const cityMap = {};
        orders.forEach(order => {
            const city = order.city || 'Unknown';
            if (!cityMap[city]) cityMap[city] = { name: city, revenue: 0 };
            cityMap[city].revenue += (parseFloat(order.total_amount) || 0);
        });
        const cityPerformance = Object.values(cityMap)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 6);

        // Lead Funnel
        const statusOrder = ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
        const funnelMap = {};
        leads.forEach(lead => {
            const status = lead.lead_status || 'New';
            if (!funnelMap[status]) funnelMap[status] = 0;
            funnelMap[status] += 1;
        });
        const leadFunnel = statusOrder
            .map(status => ({ name: status, value: funnelMap[status] || 0 }))
            .filter(i => i.value > 0);

        // Top Products
        const productMap = {};
        orders.forEach(order => {
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    const pName = item.product_name || 'Other';
                    let shortName = pName;

                    // Intelligent Short Naming for UI
                    if (pName.includes('K50')) shortName = 'K50';
                    else if (pName.includes('K60')) shortName = 'K60';
                    else if (pName.includes('K80')) shortName = 'K80';
                    else if (pName.includes('K90')) shortName = 'K90';
                    else if (pName.includes('Infinity')) shortName = 'Infinity';
                    else if (pName.includes('Infinia')) shortName = 'Infinia';
                    else if (pName.includes('Grout')) shortName = 'Grout';
                    else shortName = pName.replace('Kamdhenu', '').trim();

                    if (!productMap[shortName]) productMap[shortName] = 0;
                    productMap[shortName] += (item.quantity || 0);
                });
            }
        });
        const topProducts = Object.entries(productMap)
            .map(([name, count]) => ({ name, value: count }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 7);

        // Beneficiary Roles
        const beneficiaryRoles = Object.entries(rolePointsAcc)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // --- PAYMENT ANALYTICS ---
        const totalCollected = payments.reduce((sum, p) => sum + (parseFloat(p.paid_amount) || 0), 0);
        const totalOutstanding = payments.reduce((sum, p) => {
            const amount = parseFloat(p.order_amount) || 0;
            const paid = parseFloat(p.paid_amount) || 0;
            return sum + (amount - paid);
        }, 0);

        const collectionRate = totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0;

        // Overdue
        let overdueCount = 0;
        let overdueAmount = 0;
        const now = new Date();
        payments.forEach(p => {
            if (p.payment_status !== 'Paid' && p.due_date) {
                const due = parseISO(p.due_date);
                if (due < now) {
                    overdueCount++;
                    overdueAmount += ((parseFloat(p.order_amount) || 0) - (parseFloat(p.paid_amount) || 0));
                }
            }
        });

        // Payment Status Distribution
        const pStatusMap = {};
        payments.forEach(p => {
            const s = p.payment_status || 'Pending';
            pStatusMap[s] = (pStatusMap[s] || 0) + 1;
        });
        const statusDist = Object.entries(pStatusMap).map(([name, value]) => ({ name, value }));

        setStats({
            totalRevenue,
            totalOrders: orders.length,
            totalPoints,
            activeLeads,
            monthlyRevenue: [], // calculated in effect
            dailyActivity,
            cityPerformance,
            leadFunnel,
            topProducts,
            beneficiaryRoles,
            growth: {
                revenue: calcGrowth(currentRevenue, lastRevenue),
                orders: calcGrowth(currentMonthOrders.length, lastMonthOrders.length),
                points: calcGrowth(currentPoints, lastPoints),
                leads: calcGrowth(currentMonthLeads, lastMonthLeads)
            },
            paymentStats: {
                totalCollected,
                totalOutstanding,
                overdueCount,
                overdueAmount,
                collectionRate,
                statusDist
            }
        });
    };

    // Calculate detailed revenue AND collection data based on filters
    useEffect(() => {
        // Run even if one list is empty, but generally we need orders
        if (!allOrders.length && !allPayments.length) return;

        let data = [];
        const { year, month } = revenueFilter;

        // Helper to init map
        const initMap = (intervalFn, formatFn) => {
            const map = {};
            intervalFn.forEach(d => {
                const key = formatFn(d);
                map[key] = { name: key, revenue: 0, collected: 0, orders: 0, sortDate: d };
            });
            return map;
        };

        const processItems = (map, items, dateField, valueField, type, formatFn) => {
            items.forEach(item => {
                if (!item[dateField]) return;
                const date = parseISO(item[dateField]);
                // Filter Logic inside loop to handle 'specific year' etc.
                if (year !== 'last_12_months' && year !== 'full_history') {
                    if (getYear(date) !== parseInt(year)) return;
                    if (month !== 'all' && date.getMonth() !== (parseInt(month) - 1)) return;
                }

                const key = formatFn(date);
                if (map[key]) {
                    if (type === 'order') {
                        map[key].revenue += (parseFloat(item[valueField]) || 0);
                        map[key].orders += 1;
                    } else if (type === 'payment') {
                        map[key].collected += (parseFloat(item[valueField]) || 0);
                    }
                }
            });
        };

        let map = {};

        if (year === 'last_12_months') {
            // Default: Last 12 months (Monthly View)
            const today = new Date();
            const months = Array.from({ length: 12 }, (_, i) => subMonths(today, 11 - i));

            map = initMap(months, (d) => format(d, 'MMM yyyy'));

            // Process Orders
            allOrders.forEach(order => {
                const date = parseISO(order.order_date || order.created_at);
                const key = format(date, 'MMM yyyy');
                if (map[key]) {
                    map[key].revenue += (parseFloat(order.total_amount) || 0);
                    map[key].orders += 1;
                }
            });

            // Process Payments (use actual_payment_date)
            allPayments.forEach(payment => {
                if (payment.actual_payment_date) {
                    const date = parseISO(payment.actual_payment_date);
                    const key = format(date, 'MMM yyyy');
                    if (map[key]) {
                        map[key].collected += (parseFloat(payment.paid_amount) || 0);
                    }
                }
            });

        } else if (year === 'full_history') {
            // All Time History (Monthly View)
            if (allOrders.length === 0) return;

            const timestamps = allOrders.map(o => parseISO(o.order_date || o.created_at).getTime());
            const minDate = new Date(Math.min(...timestamps));
            const maxDate = new Date();
            const start = startOfMonth(minDate);
            const end = endOfMonth(maxDate);

            if (start <= end) {
                const months = eachMonthOfInterval({ start, end });
                map = initMap(months, (d) => format(d, 'MMM yyyy'));

                processItems(map, allOrders, 'order_date', 'total_amount', 'order', (d) => format(d, 'MMM yyyy'));
                // Use actual_payment_date for payments
                processItems(map, allPayments, 'actual_payment_date', 'paid_amount', 'payment', (d) => format(d, 'MMM yyyy'));
            }

        } else if (month === 'all') {
            // Specific Year (Monthly View)
            const start = startOfYear(new Date(parseInt(year), 0));
            const end = endOfYear(new Date(parseInt(year), 0));
            const months = eachMonthOfInterval({ start, end });

            map = initMap(months, (d) => format(d, 'MMM'));

            processItems(map, allOrders, 'order_date', 'total_amount', 'order', (d) => format(d, 'MMM'));
            processItems(map, allPayments, 'actual_payment_date', 'paid_amount', 'payment', (d) => format(d, 'MMM'));

        } else {
            // Specific Year AND Month (Daily View)
            const targetDate = new Date(parseInt(year), parseInt(month) - 1);
            const start = startOfMonth(targetDate);
            const end = endOfMonth(targetDate);
            const days = eachDayOfInterval({ start, end });

            map = initMap(days, (d) => format(d, 'dd MMM'));

            processItems(map, allOrders, 'order_date', 'total_amount', 'order', (d) => format(d, 'dd MMM'));
            processItems(map, allPayments, 'actual_payment_date', 'paid_amount', 'payment', (d) => format(d, 'dd MMM'));
        }

        data = Object.values(map).sort((a, b) => a.sortDate - b.sortDate);
        setRevenueChartData(data);
    }, [allOrders, allPayments, revenueFilter]);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50/50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const COLORS = ['#2563eb', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#f43f5e', '#64748b'];
    const CHART_COLORS = {
        primary: '#2563eb', // Blue 600
        secondary: '#f59e0b', // Amber 500
        tertiary: '#10b981', // Emerald 500
        quaternary: '#8b5cf6', // Violet 500
        slate: '#cbd5e1' // Slate 300
    };

    return (
        <div className="h-full flex flex-col gap-6 overflow-y-auto pb-10 px-4 sm:px-6 bg-slate-50/50">
            {/* Page Header */}
            <div className="flex flex-col gap-1 mt-6">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
                <p className="text-slate-500 text-sm md:text-base">Comprehensive view of Sales performance and Financial status.</p>
            </div>

            {/* Consolidated Key Metrics - Mixing Sales & Finance for a single view */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard
                    title="Total Revenue"
                    value={`₹${(stats.totalRevenue / 1000).toFixed(1)}k`}
                    subValue="Total Invoiced"
                    growth={stats.growth.revenue}
                    icon={DollarSign}
                    color="blue"
                />
                <StatCard
                    title="Total Collected"
                    value={`₹${(stats.paymentStats.totalCollected / 1000).toFixed(1)}k`}
                    subValue="Actual Received"
                    growth={0}
                    icon={Wallet}
                    color="emerald"
                />
                <StatCard
                    title="Outstanding"
                    value={`₹${(stats.paymentStats.totalOutstanding / 1000).toFixed(1)}k`}
                    subValue="Pending Receivables"
                    growth={0} // Negative growth logic would be nice here but keeping simple
                    icon={AlertCircle}
                    color="amber"
                    inverseTrend
                />
                <StatCard
                    title="Total Orders"
                    value={stats.totalOrders}
                    subValue="Volume"
                    growth={stats.growth.orders}
                    icon={Package}
                    color="indigo"
                />
            </div>

            {/* Main Combined Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Composited Chart: Revenue vs Collected vs Orders */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <Activity size={18} className="text-blue-500" />
                                Financial Performance
                            </h3>
                            <p className="text-slate-500 text-xs">Revenue (Invoiced) vs Collected (Received)</p>
                        </div>
                        <div className="flex gap-2">
                            <select
                                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                                value={revenueFilter.year}
                                onChange={(e) => setRevenueFilter(prev => ({ ...prev, year: e.target.value, month: (e.target.value === 'last_12_months' || e.target.value === 'full_history') ? 'all' : prev.month }))}
                            >
                                <option value="last_12_months">Last 12 Months</option>
                                <option value="full_history">All Time</option>
                                {availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <select
                                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none disabled:opacity-50 cursor-pointer hover:bg-slate-100 transition-colors"
                                value={revenueFilter.month}
                                onChange={(e) => setRevenueFilter(prev => ({ ...prev, month: e.target.value }))}
                                disabled={revenueFilter.year === 'last_12_months' || revenueFilter.year === 'full_history'}
                            >
                                <option value="all">All Months</option>
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                        {format(new Date(2000, i, 1), 'MMMM')}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={revenueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.1} />
                                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_COLORS.tertiary} stopOpacity={0.1} />
                                        <stop offset="95%" stopColor={CHART_COLORS.tertiary} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                    minTickGap={30}
                                />
                                <YAxis
                                    yAxisId="left"
                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(val) => `₹${val / 1000}k`}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} iconType="circle" />

                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="revenue"
                                    name="Invoiced"
                                    stroke={CHART_COLORS.primary}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                    strokeWidth={3}
                                />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="collected"
                                    name="Collected"
                                    stroke={CHART_COLORS.tertiary}
                                    fillOpacity={1}
                                    fill="url(#colorCollected)"
                                    strokeWidth={3}
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="orders"
                                    name="Orders"
                                    stroke={CHART_COLORS.secondary}
                                    strokeWidth={3}
                                    dot={false}
                                    activeDot={{ r: 6 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Payment Status Side Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
                        <PieIcon size={18} className="text-amber-500" />
                        Payment Status
                    </h3>
                    <div className="flex-1 min-h-[250px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={stats.paymentStats.statusDist}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={65}
                                    outerRadius={85}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="none"
                                    cornerRadius={4}
                                >
                                    {stats.paymentStats.statusDist.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'Paid' ? '#10b981' : entry.name === 'Pending' ? '#ef4444' : '#f59e0b'} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    layout="horizontal"
                                    verticalAlign="bottom"
                                    align="center"
                                    wrapperStyle={{ fontSize: '11px', color: '#64748b', paddingTop: '20px' }}
                                    iconSize={8}
                                    iconType="circle"
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Tertiary Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Top Products */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                        <Package size={18} className="text-fuchsia-500" />
                        Product Mix
                    </h3>
                    <div className="flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={stats.topProducts}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={3}
                                    dataKey="value"
                                    stroke="none"
                                    cornerRadius={4}
                                >
                                    {stats.topProducts.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '10px' }} iconSize={6} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Lead Funnel */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                        <Users size={18} className="text-teal-500" />
                        Lead Pipeline
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={stats.leadFunnel} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={24}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={40} />
                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {stats.leadFunnel.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === stats.leadFunnel.length - 1 ? '#ef4444' : index === stats.leadFunnel.length - 2 ? '#10b981' : '#3b82f6'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* City Performance */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                        <BarChart3 size={18} className="text-emerald-500" />
                        City Revenue
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={stats.cityPerformance} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }} barSize={12}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={70} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey="revenue" fill={CHART_COLORS.tertiary} radius={[0, 4, 4, 0]} background={{ fill: '#f8fafc' }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

// Reusable Components

const StatCard = ({ title, value, subValue, growth = 0, icon: Icon, color = 'blue', inverseTrend = false }) => {
    const isPositive = growth >= 0;
    // trendColor logic: positive growth is good (green), unless it's something like "Overdue" where growth is bad.
    // However, usually growth implies "increase".
    // If inverseTrend is true (e.g. Overdue), increase (positive growth) is BAD (red).
    // If inverseTrend is false (e.g. Revenue), increase is GOOD (green).

    let trendColor = '';
    let TrendIcon = TrendingUp;

    if (inverseTrend) {
        // High growth = Bad (Red), Low/Negative growth = Good (Green)
        trendColor = isPositive ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50';
        TrendIcon = isPositive ? TrendingUp : TrendingDown;
    } else {
        // High growth = Good (Green), Low/Negative growth = Bad (Red)
        trendColor = isPositive ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50';
        TrendIcon = isPositive ? TrendingUp : TrendingDown;
    }

    const colorClasses = {
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
        rose: 'bg-rose-50 text-rose-600',
        blue: 'bg-blue-50 text-blue-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        violet: 'bg-violet-50 text-violet-600',
        cyan: 'bg-cyan-50 text-cyan-600',
        teal: 'bg-teal-50 text-teal-600',
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(203,213,225,0.3)] hover:shadow-md transition-shadow duration-300 flex flex-col justify-between h-auto min-h-[140px]">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
                    <h4 className="text-2xl font-bold text-slate-900">{value}</h4>
                </div>
                <div className={`p-3 rounded-xl ${colorClasses[color] || colorClasses.blue}`}>
                    <Icon size={20} strokeWidth={2} />
                </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
                {growth !== 0 && (
                    <span className={`flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${trendColor}`}>
                        <TrendIcon size={12} className="mr-1" />
                        {Math.abs(growth).toFixed(0)}%
                    </span>
                )}
                <span className="text-slate-400 text-xs font-medium">{subValue}</span>
            </div>
        </div>
    );
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 backdrop-blur-sm p-3 border border-slate-100 shadow-xl rounded-xl outline-none min-w-[150px]">
                <p className="text-slate-900 font-semibold text-xs mb-2 border-b border-slate-100 pb-1">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between gap-4 text-xs py-0.5">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                            <span className="text-slate-500 capitalize">{entry.name}:</span>
                        </div>
                        <span className="font-semibold text-slate-700">
                            {['Invoiced', 'Revenue', 'revenue', 'Collected', 'collected', 'Paid', 'Pending', 'Overdue'].includes(entry.name)
                                ? ((typeof entry.value === 'number') ? (entry.value > 1000 ? `₹${(entry.value / 1000).toFixed(1)}k` : `₹${entry.value}`) : entry.value)
                                : entry.value.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export default Dashboard;
