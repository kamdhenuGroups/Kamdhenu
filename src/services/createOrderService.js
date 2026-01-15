import { supabase } from '../supabase';

export const fetchActiveCustomers = async () => {
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('customer_id, customer_name, primary_phone')
            .eq('customer_status', 'Active')
            .order('customer_name');

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching customers:', err);
        throw err;
    }
};
