import { supabase } from '../supabase';

export const CUSTOMER_TYPES = [
    'Contractor',
    'Interiors/Architect',
    'Site Supervisor',
    'Retailer',
    'Distributor',
    'Mistry',
    'Customer'
];

export const POINT_ROLES = [
    'Tiler', 'Site Mistri', 'Assistant', 'Incharge', 'Purchase Manager'
];

export const PAYMENT_OPTIONS = [
    'Advance Payment', 'Same Day', 'Manual entry for days'
];

export const PRODUCTS = [
    { name: 'K50 Floor & Wall Tile Adhesive' },
    { name: 'K60 Superior Floor & Wall Tile Adhesive' },
    { name: 'K80 Superior Tile & Stone Adhesive' },
    { name: 'K90 Paramount Tile & Stone Adhesive' },
    { name: 'Kamdhenu Infinity Stone & Tile Adhesive' },
    { name: 'Tile Grout' },
    { name: 'Kamdhenu Infinia' }
];

export const orderService = {
    // Calculate total amount for order items
    calculateOrderTotal: (items) => {
        return items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
    },

    // Calculate total points for order items
    calculateOrderPoints: (items) => {
        return items.reduce((sum, item) => sum + (item.points || 0), 0);
    },

    // Prepare the order payload from form data
    prepareOrderPayload: (formData) => {
        const {
            orderDate, contractorName, customerType, customerPhone, items,
            notes, challanName, sitePoc, deliveryAddress,
            paymentTerms, manualPaymentDays, logistics,
            state, city, orderId, contractorId, siteId, nickname, mistryName,
            pointsAllocations
        } = formData;

        // If customer type is Mistry, use Mistry Name as the main name for the order record
        // This ensures the Contractor remains listed as "Contractor" in future dropdowns,
        // while the Mistry gets their own entry.
        const finalContractorName = (customerType === 'Mistry' && mistryName)
            ? mistryName
            : contractorName;

        return {
            order_date: orderDate,
            contractor_name: finalContractorName,
            customer_type: customerType,
            customer_phone: customerPhone,
            items: items,
            total_amount: orderService.calculateOrderTotal(items),
            remarks: notes,
            challan_reference: challanName,
            site_contact_number: sitePoc,
            delivery_address: deliveryAddress,

            payment_terms: paymentTerms,
            manual_payment_days: manualPaymentDays ? parseInt(manualPaymentDays) : null,
            logistics_mode: logistics,
            state: state,
            city: city,
            order_id: orderId,
            contractor_id: contractorId,
            site_id: siteId,
            nickname: nickname,
            mistry_name: mistryName,
            points_allocations: pointsAllocations || []
        };
    },

    // Create a new order
    createOrder: async (orderData) => {
        try {
            // Get current user from localStorage (Custom Auth)
            const storedUser = localStorage.getItem('user');
            if (!storedUser) throw new Error('User not authenticated');

            const user = JSON.parse(storedUser);

            // Validate user has necessary fields
            if (!user.user_id) throw new Error('User ID not found in session');

            // Separate items and allocations from order details
            const { items, points_allocations, ...orderDetails } = orderData;

            // Prepare order payload
            const payload = {
                ...orderDetails,
                created_by_user_id: user.user_id,
                created_by_user_name: user.full_name || user.Name || user.username || 'Unknown User',
                status: 'Pending' // Default status
            };

            // 1. Insert Order
            const orderInsertPayload = {
                order_id: payload.order_id,
                order_date: payload.order_date,
                contractor_name: payload.contractor_name,
                contractor_id: payload.contractor_id,
                site_id: payload.site_id,
                customer_type: payload.customer_type,
                challan_reference: payload.challan_reference, // Renamed from challan_name
                site_contact_number: payload.site_contact_number, // Renamed from site_poc_contact
                state: payload.state,
                city: payload.city,
                delivery_address: payload.delivery_address,
                total_amount: payload.total_amount,

                logistics_mode: payload.logistics_mode, // Renamed from logistics_option
                payment_terms: payload.payment_terms,
                manual_payment_days: payload.manual_payment_days,
                remarks: payload.remarks, // Renamed from notes
                order_status: 'Pending', // Renamed from status
                nickname: payload.nickname,
                mistry_name: payload.mistry_name,
                customer_phone: payload.customer_phone,
                created_by_user_id: user.user_id,
                created_by_user_name: user.full_name || user.Name || user.username || 'Unknown User'
            };

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert([orderInsertPayload])
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Insert Items (if any)
            if (items && items.length > 0) {
                const productsPayload = items.map(item => ({
                    order_id: order.order_id, // Renamed from id
                    product_name: item.product,
                    quantity: item.quantity,
                    unit_price: item.price, // Renamed from price
                    reward_points: item.points // Renamed from points
                }));

                const { error: productsError } = await supabase
                    .from('products')
                    .insert(productsPayload);

                if (productsError) {
                    // Delete the created order if product insertion fails to maintain consistency
                    console.error('Error creating products, rolling back order:', productsError);
                    await supabase.from('orders').delete().eq('order_id', order.order_id);
                    throw productsError;
                }
            }

            // 3. Insert Points Allocations (if any)
            if (points_allocations && points_allocations.length > 0) {
                const allocationsPayload = points_allocations.map(alloc => ({
                    order_id: order.order_id,
                    person_name: alloc.name,
                    role: alloc.role,
                    phone_last_5: alloc.phoneLast5,
                    allocated_points: parseInt(alloc.points)
                }));

                const { error: allocationsError } = await supabase
                    .from('points_allocation')
                    .insert(allocationsPayload);

                if (allocationsError) {
                    console.error('Error creating points allocations:', allocationsError);
                    // Decide if we rollback entirely or just warn.
                    // Requirement says order cannot be saved without allocation if needed.
                    // So we probably should rollback or at least throw.
                    // For now, let's rollback to be safe.
                    await supabase.from('products').delete().eq('order_id', order.order_id);
                    await supabase.from('orders').delete().eq('order_id', order.order_id);
                    throw allocationsError;
                }
            }

            // 4. Insert Payment Record
            // Calculate due date
            let dueDate = payload.order_date ? new Date(payload.order_date) : new Date();
            let totalDays = 0;

            if (payload.payment_terms === 'Manual entry for days' && payload.manual_payment_days) {
                totalDays = payload.manual_payment_days;
                dueDate.setDate(dueDate.getDate() + totalDays);
            } else if (payload.payment_terms === 'Net 7') { // Handling potential future term
                totalDays = 7;
                dueDate.setDate(dueDate.getDate() + 7);
            } else if (payload.payment_terms === 'Net 15') {
                totalDays = 15;
                dueDate.setDate(dueDate.getDate() + 15);
            }

            const paymentPayload = {
                order_id: order.order_id,
                order_amount: payload.total_amount,
                paid_amount: 0.00,
                payment_status: 'Pending',
                created_by_user_id: user.user_id,
                due_date: dueDate.toISOString().split('T')[0],
                total_days: totalDays
            };

            const { error: paymentError } = await supabase
                .from('payments')
                .insert([paymentPayload]);

            if (paymentError) {
                console.error('Error creating payment record:', paymentError);
                // Rollback everything
                if (points_allocations && points_allocations.length > 0) {
                    await supabase.from('points_allocation').delete().eq('order_id', order.order_id);
                }
                // Check if products were inserted (items exists and has length)
                if (items && items.length > 0) {
                    await supabase.from('products').delete().eq('order_id', order.order_id);
                }
                await supabase.from('orders').delete().eq('order_id', order.order_id);
                throw paymentError;
            }

            return { data: order, error: null };
        } catch (error) {
            console.error('Error creating order:', error);
            return { data: null, error };
        }
    },

    // Get all orders
    getOrders: async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*, items:products(*), allocations:points_allocation(*), payments(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error fetching orders:', error);
            return { data: null, error };
        }
    },

    // Update an order
    updateOrder: async (id, updates) => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .update(updates)
                .eq('order_id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error updating order:', error);
            return { data: null, error };
        }
    },

    // Delete an order
    deleteOrder: async (id) => {
        try {
            const { error } = await supabase
                .from('orders')
                .delete()
                .eq('order_id', id);

            if (error) throw error;
            return { error: null };
        } catch (error) {
            console.error('Error deleting order:', error);
            return { error };
        }
    },

    // Get single order by ID with details
    getOrderById: async (orderId) => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*, items:products(*), allocations:points_allocation(*), payments(*)')
                .eq('order_id', orderId)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error fetching order details:', error);
            return { data: null, error };
        }
    },

    // Get unique contractors for dropdown
    getUniqueContractors: async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('contractor_name, customer_phone, customer_type, nickname, mistry_name, contractor_id, site_contact_number, delivery_address, payment_terms, manual_payment_days, logistics_mode, state, city, challan_reference')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Deduplicate by contractor_name (normalized)
            const seen = new Set();
            const uniqueContractors = [];

            for (const order of data) {
                if (!order.contractor_name) continue;
                const key = order.contractor_name.toLowerCase().trim();
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueContractors.push(order);
                }
            }
            return { data: uniqueContractors, error: null };
        } catch (error) {
            console.error('Error fetching contractors:', error);
            return { data: [], error };
        }
    },

    // Fetch contractors from master table (contractor_data)
    getContractorData: async () => {
        try {
            const { data, error } = await supabase
                .from('contractor_data')
                .select('*')
                .order('contractor_name', { ascending: true });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error fetching contractor data:', error);
            return { data: [], error };
        }
    },

    // Helper to determine customer type from ID prefix
    getCustomerTypeFromId: (contractorId) => {
        if (!contractorId) return '';

        // Extract prefix (assuming strictly at start/delimited or just part of string)
        // Adjusting regex/logic to match user requirement:
        // C = Contractor, IA = Interior/Architect, SS = Site Supervisor, R = Retailer ,D = Distributor, MI = Mistri

        const upperId = contractorId.toUpperCase();

        // Check for prefixes followed by slash (common pattern in this app e.g. C/...)
        if (upperId.startsWith('C/') || upperId.startsWith('C-')) return 'Contractor';
        if (upperId.startsWith('IA/') || upperId.startsWith('IA-')) return 'Interiors/Architect';
        if (upperId.startsWith('SS/') || upperId.startsWith('SS-')) return 'Site Supervisor';
        if (upperId.startsWith('R/') || upperId.startsWith('R-')) return 'Retailer';
        if (upperId.startsWith('D/') || upperId.startsWith('D-')) return 'Distributor';
        if (upperId.startsWith('MI/') || upperId.startsWith('MI-')) return 'Mistry';
        if (upperId.startsWith('CU/') || upperId.startsWith('CU-')) return 'Customer';

        return '';
    },

    // Get unique points beneficiaries
    getUniqueBeneficiaries: async () => {
        try {
            const { data, error } = await supabase
                .from('points_allocation')
                .select('person_name, role, phone_last_5')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Deduplicate
            const seen = new Set();
            const uniqueBeneficiaries = [];

            for (const item of data) {
                if (!item.person_name || !item.role) continue;
                const key = `${item.role.toLowerCase()}-${item.person_name.toLowerCase()}-${item.phone_last_5}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueBeneficiaries.push(item);
                }
            }
            return { data: uniqueBeneficiaries, error: null };
        } catch (error) {
            console.error('Error fetching beneficiaries:', error);
            return { data: [], error };
        }
    },

    // Get addresses by city
    getAddressesByCity: async (city) => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('delivery_address')
                .eq('city', city)
                .neq('delivery_address', null)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const uniqueAddresses = [...new Set(data
                .map(o => o.delivery_address)
                .filter(a => a && a.trim().length > 0)
            )];

            return { data: uniqueAddresses, error: null };
        } catch (error) {
            console.error('Error fetching addresses:', error);
            return { data: [], error };
        }
    },

    // Get next site number and order number for a user/city/contractor
    getOrderCounts: async (userId, city, contractorId, deliveryAddress = '') => {
        try {
            // 1. Get all orders for this user and city
            let query = supabase
                .from('orders')
                .select('site_id, order_id, delivery_address, contractor_id')
                .eq('created_by_user_id', userId)
                .not('site_id', 'is', null);

            if (city) {
                query = query.eq('city', city);
            }

            const { data, error } = await query;

            if (error) throw error;

            let siteNumber = 1;
            let orderNumber = 1;
            let existingSiteFound = false;

            // Normalize delivery address for comparison
            const normAddress = deliveryAddress ? deliveryAddress.toLowerCase().trim() : '';

            // Check if this address already has a site number in this city (for this RM)
            if (normAddress && normAddress.length > 3) {
                const addressMatchOrder = data.find(o =>
                    o.delivery_address && o.delivery_address.toLowerCase().trim() === normAddress
                );

                if (addressMatchOrder) {
                    existingSiteFound = true;
                    // Extract site number
                    const parts = addressMatchOrder.site_id.split('-');
                    if (parts.length > 1) {
                        const num = parseInt(parts[parts.length - 1]);
                        if (!isNaN(num)) {
                            siteNumber = num;
                        }
                    }
                }
            }

            // If no existing site for address found, find next available site number
            if (!existingSiteFound) {
                const uniqueSiteIds = new Set(data.map(order => order.site_id).filter(Boolean));
                let maxSiteNum = 0;

                uniqueSiteIds.forEach(sid => {
                    const parts = sid.split('-');
                    if (parts.length > 1) {
                        const num = parseInt(parts[parts.length - 1]);
                        if (!isNaN(num) && num > maxSiteNum) {
                            maxSiteNum = num;
                        }
                    }
                });

                siteNumber = maxSiteNum + 1;
            }

            // Calculate next order number based on the determined siteNumber
            let maxOrderNum = 0;

            data.forEach(order => {
                const parts = order.site_id.split('-');
                if (parts.length > 1) {
                    const sNum = parseInt(parts[parts.length - 1]);
                    if (sNum === siteNumber) {
                        const match = order.order_id?.match(/\((\d+)\)$/);
                        if (match && match[1]) {
                            const num = parseInt(match[1]);
                            if (num > maxOrderNum) maxOrderNum = num;
                        } else {
                            if (maxOrderNum < 1) maxOrderNum = 1;
                        }
                    }
                }
            });

            orderNumber = maxOrderNum + 1;

            return { siteNumber, orderNumber, error: null };
        } catch (error) {
            console.error('Error fetching order counts:', error);
            return { siteNumber: 1, orderNumber: 1, error };
        }
    },

    // Get next site number for a user (Deprecated but kept for compatibility if needed)
    getNextSiteNumber: async (userId, city) => {
        // forwarding to new logic with no contractor
        const result = await orderService.getOrderCounts(userId, city, null);
        return { count: result.siteNumber, error: result.error };
    }
};

export const idGenerator = {
    getCityCode: (cityName) => {
        if (!cityName) return '';
        let code = cityName.substring(0, 3).toUpperCase();
        if (cityName.toLowerCase() === 'raipur') code = 'RPR';
        if (cityName.toLowerCase() === 'nagpur') code = 'NAG';
        return code;
    },

    getRMCode: (user) => {
        if (!user) return 'XXX';
        const fullName = user.full_name || user.Name || user.username || '';
        if (!fullName) return 'XXX';

        const names = fullName.trim().split(' ');
        if (names.length >= 2) {
            // First 2 letters of first name + First letter of last name
            const first = names[0].substring(0, 2);
            const last = names[names.length - 1].substring(0, 1);
            return (first + last).toUpperCase();
        } else if (names.length === 1) {
            return names[0].substring(0, 3).toUpperCase();
        }
        return 'XXX';
    },

    generateCustomerId: ({ customerPhone, cityCode, contractorName, customerType, nickname, mistryName }) => {
        if (!customerPhone || customerPhone.replace(/\D/g, '').length < 5) return '';
        if (!cityCode || !contractorName) return '';

        const phoneLast5 = customerPhone.replace(/\D/g, '').slice(-5);

        let typePrefix = 'C';
        if (customerType === 'Interiors/Architect') typePrefix = 'IA';
        else if (customerType === 'Site Supervisor') typePrefix = 'SS';
        else if (customerType === 'Mistry') typePrefix = 'Mi';
        else if (customerType === 'Retailer') typePrefix = 'R';
        else if (customerType === 'Distributor') typePrefix = 'D';
        else if (customerType === 'Customer') typePrefix = 'CU';

        // Use original case for Contractor Name, uppercase others for consistency
        let normContractorName = contractorName;
        const normNickname = nickname ? nickname.toUpperCase() : '';
        const normMistryName = mistryName ? mistryName.toUpperCase() : '';

        // Remove spaces for Contractor type
        if (customerType === 'Contractor') {
            normContractorName = normContractorName.replace(/\s+/g, '');
        }

        const nameDisplay = ((customerType === 'Contractor' || customerType === 'Mistry') && normNickname)
            ? `${normContractorName}(${normNickname})`
            : normContractorName;

        if (customerType === 'Mistry') {
            return `MI/${phoneLast5}/${cityCode}/${nameDisplay}-${normMistryName || ''}`;
        }

        return `${typePrefix}/${phoneLast5}/${cityCode}/${nameDisplay}`;
    },

    generateSiteId: ({ user, cityCode, siteCount, date }) => {
        if (!user || !cityCode) return '';

        // MMYY
        const validDate = date ? new Date(date) : new Date();
        const mm = (validDate.getMonth() + 1).toString().padStart(2, '0');
        const yy = validDate.getFullYear().toString().slice(-2);

        // RM Name Code
        const rmCode = idGenerator.getRMCode(user);

        // Site Number
        const suffix = siteCount < 10 ? `0${siteCount}` : siteCount;

        return `${mm}${yy}/${cityCode}/${rmCode}-${suffix}`;
    },

    generateOrderId: (siteId, orderNumber = 1) => {
        if (!siteId) return '';
        // Order Number provided or default to 1
        const numStr = orderNumber < 10 ? `0${orderNumber}` : orderNumber;
        return `${siteId} (${numStr})`;
    }
};
