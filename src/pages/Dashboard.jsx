import React, { useEffect, useState } from 'react';
import { orderService } from '../services/orderService';
import { leadService } from '../services/leadService';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend, AreaChart, Area, ComposedChart
} from 'recharts';
import { format, parseISO, startOfMonth, subDays, isSameDay, subMonths, isWithinInterval, endOfMonth, getYear, setYear, setMonth, getDate, getDaysInMonth, startOfYear, endOfYear, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign, Package, Users, Award } from 'lucide-react';

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [allOrders, setAllOrders] = useState([]);
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
        growth: { revenue: 0, orders: 0, points: 0, leads: 0 }
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [ordersRes, leadsRes] = await Promise.all([
                    orderService.getOrders(),
                    leadService.getLeads()
                ]);

                const orders = ordersRes.data || [];
                const leads = leadsRes.data || [];

                setAllOrders(orders);
                // Use order_date if available, otherwise fallback to created_at
                const years = Array.from(new Set(orders.map(o => getYear(parseISO(o.order_date || o.created_at))))).sort((a, b) => b - a);
                setAvailableYears(years);

                processData(orders, leads);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const processData = (orders, leads) => {
        const today = new Date();
        const currentMonthStart = startOfMonth(today);
        const lastMonthStart = startOfMonth(subMonths(today, 1));
        const lastMonthEnd = endOfMonth(subMonths(today, 1));

        // 1. Core Metrics
        const currentMonthOrders = orders.filter(o => new Date(o.order_date || o.created_at) >= currentMonthStart);
        const lastMonthOrders = orders.filter(o => isWithinInterval(new Date(o.order_date || o.created_at), { start: lastMonthStart, end: lastMonthEnd }));
        const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
        const currentRevenue = currentMonthOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
        const lastRevenue = lastMonthOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

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

        // Monthly Trends
        const monthMap = {};
        orders.forEach(order => {
            const date = parseISO(order.order_date || order.created_at);
            const key = format(date, 'MMM yyyy');
            if (!monthMap[key]) monthMap[key] = { name: key, revenue: 0, orders: 0, sortDate: date };
            monthMap[key].revenue += (parseFloat(order.total_amount) || 0);
            monthMap[key].orders += 1;
        });
        // Limit to last 12 months for cleaner view
        const monthlyRevenue = Object.values(monthMap)
            .sort((a, b) => a.sortDate - b.sortDate)
            .slice(-12);

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

        // Lead Funnel (Process Order)
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

        setStats({
            totalRevenue,
            totalOrders: orders.length,
            totalPoints,
            activeLeads,
            monthlyRevenue,
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
            }
        });
    };

    // Calculate detailed revenue data based on filters
    useEffect(() => {
        if (!allOrders.length) return;

        let data = [];
        const { year, month } = revenueFilter;

        if (year === 'last_12_months') {
            // Default: Last 12 months (Monthly View)
            const monthMap = {};
            // Initialize last 12 months
            const today = new Date();
            for (let i = 11; i >= 0; i--) {
                const d = subMonths(today, i);
                const key = format(d, 'MMM yyyy');
                monthMap[key] = { name: key, revenue: 0, orders: 0, sortDate: d };
            }

            allOrders.forEach(order => {
                const date = parseISO(order.order_date || order.created_at);
                const key = format(date, 'MMM yyyy');
                if (monthMap[key]) {
                    monthMap[key].revenue += (parseFloat(order.total_amount) || 0);
                    monthMap[key].orders += 1;
                }
            });

            data = Object.values(monthMap).sort((a, b) => a.sortDate - b.sortDate);

        } else if (year === 'full_history') {
            // All Time History (Monthly View)
            if (allOrders.length === 0) {
                data = [];
            } else {
                // Find min date
                const timestamps = allOrders.map(o => parseISO(o.order_date || o.created_at).getTime());
                const minDate = new Date(Math.min(...timestamps));
                const maxDate = new Date();

                const start = startOfMonth(minDate);
                const end = endOfMonth(maxDate);

                // If start is after end (shouldn't happen with valid data), fallback
                if (start > end) {
                    data = [];
                } else {
                    const months = eachMonthOfInterval({ start, end });
                    const monthMap = {};
                    months.forEach(m => {
                        const key = format(m, 'MMM yyyy');
                        monthMap[key] = { name: key, revenue: 0, orders: 0, sortDate: m };
                    });

                    allOrders.forEach(order => {
                        const date = parseISO(order.order_date || order.created_at);
                        const key = format(date, 'MMM yyyy');
                        if (monthMap[key]) {
                            monthMap[key].revenue += (parseFloat(order.total_amount) || 0);
                            monthMap[key].orders += 1;
                        }
                    });

                    data = Object.values(monthMap).sort((a, b) => a.sortDate - b.sortDate);
                }
            }

        } else if (year !== 'last_12_months' && year !== 'full_history' && month === 'all') {
            // Specific Year (Monthly View for that year)
            const start = startOfYear(new Date(parseInt(year), 0));
            const end = endOfYear(new Date(parseInt(year), 0));
            const months = eachMonthOfInterval({ start, end });

            const monthMap = {};
            months.forEach(m => {
                const key = format(m, 'MMM');
                monthMap[key] = { name: key, revenue: 0, orders: 0, sortDate: m };
            });

            allOrders.forEach(order => {
                const date = parseISO(order.order_date || order.created_at);
                if (getYear(date) === parseInt(year)) {
                    const key = format(date, 'MMM');
                    if (monthMap[key]) {
                        monthMap[key].revenue += (parseFloat(order.total_amount) || 0);
                        monthMap[key].orders += 1;
                    }
                }
            });

            data = Object.values(monthMap).sort((a, b) => a.sortDate - b.sortDate);

        } else {
            // Specific Year AND Month (Daily View)
            const targetDate = new Date(parseInt(year), parseInt(month) - 1);
            const start = startOfMonth(targetDate);
            const end = endOfMonth(targetDate);
            const days = eachDayOfInterval({ start, end });

            const dayMap = {};
            days.forEach(d => {
                const key = format(d, 'dd MMM');
                dayMap[key] = { name: key, revenue: 0, orders: 0, sortDate: d };
            });

            allOrders.forEach(order => {
                const date = parseISO(order.order_date || order.created_at);
                if (getYear(date) === parseInt(year) && date.getMonth() === (parseInt(month) - 1)) {
                    const key = format(date, 'dd MMM');
                    if (dayMap[key]) {
                        dayMap[key].revenue += (parseFloat(order.total_amount) || 0);
                        dayMap[key].orders += 1;
                    }
                }
            });

            data = Object.values(dayMap).sort((a, b) => a.sortDate - b.sortDate);
        }

        setRevenueChartData(data);
    }, [allOrders, revenueFilter]);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    // Modern Professional Palette
    const COLORS = ['#2563eb', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#f43f5e', '#64748b'];
    const CHART_COLORS = {
        primary: '#2563eb', // Blue 600
        secondary: '#f59e0b', // Amber 500
        tertiary: '#10b981', // Emerald 500
        quaternary: '#8b5cf6', // Violet 500
        slate: '#cbd5e1' // Slate 300
    };

    return (
        <div className="h-full flex flex-col gap-6 overflow-y-auto pb-6 px-1">
            {/* Minimal Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Overview</h1>
                <p className="text-slate-500 text-sm">Business performance metrics and analytics.</p>
            </div>

            {/* KPI Cards - Clean & Minimal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Revenue"
                    value={`₹${(stats.totalRevenue / 1000).toFixed(1)}k`}
                    subValue="Total Revenue"
                    growth={stats.growth.revenue}
                    icon={DollarSign}
                />
                <StatCard
                    title="Orders"
                    value={stats.totalOrders}
                    subValue="Total Orders"
                    growth={stats.growth.orders}
                    icon={Package}
                />
                <StatCard
                    title="Allocated Points"
                    value={stats.totalPoints.toLocaleString()}
                    subValue="Total Points"
                    growth={stats.growth.points}
                    icon={Award}
                />
                <StatCard
                    title="Leads"
                    value={stats.activeLeads}
                    subValue="Active Leads"
                    growth={stats.growth.leads}
                    icon={Users}
                />
            </div>

            {/* Main Charts Row 1: Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue & Growth Trend */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                        <h3 className="text-base font-semibold text-slate-900">Revenue & Order Growth</h3>
                        <div className="flex gap-2">
                            {/* Year Selector */}
                            <select
                                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
                                value={revenueFilter.year}
                                onChange={(e) => setRevenueFilter(prev => ({ ...prev, year: e.target.value, month: (e.target.value === 'last_12_months' || e.target.value === 'full_history') ? 'all' : prev.month }))}
                            >
                                <option value="last_12_months">Last 12 Months</option>
                                <option value="full_history">All Time History</option>
                                {availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>

                            {/* Month Selector */}
                            <select
                                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none disabled:opacity-50"
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

                    <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={revenueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.1} />
                                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
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
                                name="Revenue"
                                stroke={CHART_COLORS.primary}
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                                strokeWidth={2}
                                dot={{ r: 4, fill: CHART_COLORS.primary, stroke: 'white', strokeWidth: 2 }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="orders"
                                name="Orders"
                                stroke={CHART_COLORS.secondary}
                                strokeWidth={2}
                                dot={{ r: 4, fill: 'white', stroke: CHART_COLORS.secondary, strokeWidth: 2 }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* Daily Activity Pulse */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-semibold text-slate-900 mb-6">Daily Orders (14 Days)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={stats.dailyActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorOrdersDaily" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={CHART_COLORS.quaternary} stopOpacity={0.2} />
                                    <stop offset="95%" stopColor={CHART_COLORS.quaternary} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={2} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="orders" stroke={CHART_COLORS.quaternary} fill="url(#colorOrdersDaily)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Secondary Charts Row 2: Three Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Lead Funnel Vertical */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-semibold text-slate-900 mb-6">Lead Pipeline</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart
                            data={stats.leadFunnel}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            barSize={32}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                                tickMargin={10}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                {stats.leadFunnel.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === stats.leadFunnel.length - 1 ? '#ef4444' : index === stats.leadFunnel.length - 2 ? '#10b981' : '#3b82f6'} fillOpacity={0.9} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* City Performance */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-semibold text-slate-900 mb-6">Top Cities Revenue</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart
                            data={stats.cityPerformance}
                            margin={{ top: 10, right: 10, left: -5, bottom: 0 }}
                            barSize={32}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                                tickMargin={10}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey="revenue" fill={CHART_COLORS.tertiary} radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Products */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-semibold text-slate-900 mb-2">Product Mix</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={stats.topProducts}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={85}
                                paddingAngle={3}
                                dataKey="value"
                                stroke="white"
                                strokeWidth={2}
                                cornerRadius={4}
                            >
                                {stats.topProducts.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                layout="vertical"
                                verticalAlign="middle"
                                align="right"
                                wrapperStyle={{ fontSize: '11px', color: '#64748b', right: 0 }}
                                iconSize={8}
                                iconType="circle"
                            />
                        </PieChart>

                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

// Sub-components for cleaner file

const StatCard = ({ title, value, subValue, growth = 0, icon: Icon }) => {
    const isPositive = growth >= 0;
    return (
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between h-auto min-h-[120px]">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">{title}</h3>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                </div>
                <div className={`p-2 rounded-lg ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <Icon size={18} />
                </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
                <span className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded ${isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                    {isPositive ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                    {Math.abs(growth).toFixed(1)}%
                </span>
                <span className="text-slate-400 text-xs">vs last month</span>
            </div>
        </div>
    );
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-slate-100 shadow-lg rounded-lg outline-none">
                <p className="text-slate-900 font-medium text-xs mb-1">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-slate-500 capitalize">{entry.name}:</span>
                        <span className="font-semibold text-slate-700">
                            {entry.name === 'Revenue' || entry.name === 'revenue'
                                ? `₹${entry.value.toLocaleString()}`
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
