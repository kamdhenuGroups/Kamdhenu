import { supabase } from '../supabase';

export const siteDashboardService = {
    /**
     * Fetch aggregated site data from orders.
     * Since there is no dedicated 'sites' table, we derive site info from orders.
     */
    getSiteDashboardData: async () => {
        try {
            // Fetch all orders with their related data
            const { data: orders, error } = await supabase
                .from('orders')
                .select(`
                    order_id,
                    site_id,
                    order_date,
                    contractor_name,
                    contractor_id,
                    customer_type,
                    city,
                    state,
                    delivery_address,
                    total_amount,
                    order_status,
                    payment_status,
                    created_at,
                    created_by_user_name,
                    payments (*),
                    products (
                        product_name,
                        quantity,
                        unit_price,
                        total_amount:unit_price
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return { data: orders, error: null };
        } catch (error) {
            console.error('Error fetching site dashboard data:', error);
            return { data: null, error };
        }
    }
};
