import { supabase } from '../supabase';

export const CUSTOMER_TYPES = [
    'Retailer',
    'Distributor'
];

export const orderService = {
    // Create a new order
    createOrder: async (orderData) => {
        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // Get user details from public.users table to get the name
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('full_name, username')
                .eq('user_id', user.id)
                .single();

            if (userError) throw userError;

            // Prepare order payload
            const payload = {
                ...orderData,
                created_by_user_id: user.id,
                created_by_user_name: userData.full_name || userData.username || 'Unknown User',
                status: 'Pending' // Default status
            };

            const { data, error } = await supabase
                .from('orders')
                .insert([payload])
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
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
                .select('*')
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
                .eq('id', id)
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
                .eq('id', id);

            if (error) throw error;
            return { error: null };
        } catch (error) {
            console.error('Error deleting order:', error);
            return { error };
        }
    }
};
