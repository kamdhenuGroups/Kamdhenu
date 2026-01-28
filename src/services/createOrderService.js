import { supabase } from '../supabase';

export const createOrderService = {
    searchSites: async (query) => {
        // If query is empty, fetch recent sites
        if (!query) {
            const { data, error } = await supabase
                .from('sites')
                .select(`
                    *,
                    customers!inner (
                        customer_id,
                        customer_name,
                        primary_phone,
                        city,
                        firm_name
                    ),
                    main_influencer:contractor_data!main_influencer_id (
                        contractor_name
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('Error fetching recent sites:', error);
                throw error;
            }
            return data;
        }

        // 1. Search matching Customers
        const { data: customerData } = await supabase
            .from('customers')
            .select('customer_id')
            .or(`customer_name.ilike.%${query}%,primary_phone.ilike.%${query}%`)
            .limit(50);

        const customerIds = customerData?.map(c => c.customer_id) || [];

        // 2. Search matching Influencers
        const { data: influencerData } = await supabase
            .from('contractor_data')
            .select('contractor_id')
            .ilike('contractor_name', `%${query}%`)
            .limit(50);

        const influencerIds = influencerData?.map(i => i.contractor_id) || [];

        // If no matches found in either
        if (customerIds.length === 0 && influencerIds.length === 0) {
            return [];
        }

        // 3. Fetch Sites that match either condition
        let queryBuilder = supabase
            .from('sites')
            .select(`
                *,
                customers!inner (
                    customer_id,
                    customer_name,
                    primary_phone,
                    city,
                    firm_name
                ),
                main_influencer:contractor_data!main_influencer_id (
                    contractor_name
                )
            `);

        const orConditions = [];
        if (customerIds.length > 0) {
            orConditions.push(`customer_id.in.(${customerIds.join(',')})`);
        }
        if (influencerIds.length > 0) {
            orConditions.push(`main_influencer_id.in.(${influencerIds.join(',')})`);
        }

        queryBuilder = queryBuilder.or(orConditions.join(','));

        const { data, error } = await queryBuilder.limit(50);

        if (error) {
            console.error('Error searching sites:', error);
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
