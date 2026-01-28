import { supabase } from '../supabase';

export const createOrderService = {
    searchCustomers: async (query) => {
        let request = supabase
            .from('customers')
            .select('customer_id, customer_name, primary_phone, city, firm_name')
            .limit(100); // Fetch up to 100 for the dropdown list

        if (query) {
            request = request.or(`customer_name.ilike.%${query}%,primary_phone.ilike.%${query}%`);
        } else {
            request = request.order('created_at', { ascending: false });
        }

        const { data, error } = await request;

        if (error) {
            console.error('Error searching customers:', error);
            throw error;
        }
        return data;
    },

    getCustomerSites: async (customerId) => {
        const { data, error } = await supabase
            .from('sites')
            .select('*')
            .eq('customer_id', customerId);

        if (error) {
            console.error('Error fetching sites:', error);
            throw error;
        }
        return data;
    },

    getInfluencers: async (influencerIds) => {
        if (!influencerIds || influencerIds.length === 0) return [];

        // Ensure IDs are unique
        const uniqueIds = [...new Set(influencerIds)];

        const { data, error } = await supabase
            .from('contractor_data')
            .select('contractor_id, contractor_name, customer_type, mistry_name')
            .in('contractor_id', uniqueIds);

        if (error) {
            console.error('Error fetching influencers:', error);
            throw error;
        }
        return data;
    }
};
