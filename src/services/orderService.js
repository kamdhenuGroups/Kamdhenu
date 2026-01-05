import { supabase } from '../supabase';

export const CUSTOMER_TYPES = [
    'Contractor',
    'Interiors/Architect',
    'Site Supervisor',
    'Retailer',
    'Distributor',
    'Mistry'
];

export const orderService = {
    // Create a new order
    createOrder: async (orderData) => {
        try {
            // Get current user from localStorage (Custom Auth)
            const storedUser = localStorage.getItem('user');
            if (!storedUser) throw new Error('User not authenticated');

            const user = JSON.parse(storedUser);

            // Validate user has necessary fields
            if (!user.user_id) throw new Error('User ID not found in session');

            // Separate items from order details
            const { items, ...orderDetails } = orderData;

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
                customer_type: payload.customer_type,
                challan_reference: payload.challan_reference, // Renamed from challan_name
                site_contact_number: payload.site_contact_number, // Renamed from site_poc_contact
                state: payload.state,
                city: payload.city,
                delivery_address: payload.delivery_address,
                total_amount: payload.total_amount,
                point_of_contact_role: payload.point_of_contact_role, // Renamed from point_role
                logistics_mode: payload.logistics_mode, // Renamed from logistics_option
                payment_terms: payload.payment_terms,
                manual_payment_days: payload.manual_payment_days,
                remarks: payload.remarks, // Renamed from notes
                order_status: 'Pending', // Renamed from status
                nickname: payload.nickname,
                mistry_name: payload.mistry_name,
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
                    await supabase.from('orders').delete().eq('order_id', order.order_id); // Renamed from id
                    throw productsError;
                }
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
                .select('*, items:products(*)')
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
    }
};
