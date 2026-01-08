import { supabase } from '../supabase';

export const dashboardService = {
    /**
     * Fetch all orders with specific fields required for dashboard analytics.
     * Excludes heavy joins like order items/products and points allocations.
     */
    getDashboardData: async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    order_id,
                    created_at,
                    order_date,
                    total_amount,
                    payment_status,
                    city,
                    created_by_user_name,
                    payments (
                        paid_amount,
                        due_date,
                        actual_payment_date,
                        order_amount,
                        payment_status,
                        payment_mode
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            return { data: null, error };
        }
    }
};
