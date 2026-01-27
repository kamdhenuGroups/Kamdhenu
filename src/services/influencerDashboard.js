import { supabase } from '../supabase';

export const influencerDashboardService = {
    /**
     * Fetch all users with role 'rm' (Relationship Manager).
     */
    getRMs: async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('user_id, full_name, role, designation, department, email, phone_number')
                .eq('role', 'RM');

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error fetching RMs:', error);
            return { data: [], error };
        }
    },

    /**
     * Fetch influencers assigned to a specific RM.
     * @param {string} rmId - The UUID of the Relationship Manager.
     */
    getAssignedInfluencers: async (rmId) => {
        try {
            const { data, error } = await supabase
                .from('user_contractor_access')
                .select(`
                    contractor_id,
                    contractor_data (
                        contractor_id,
                        contractor_name,
                        customer_phone,
                        city,
                        state,
                        status,
                        customer_type
                    )
                `)
                .eq('user_id', rmId);

            if (error) throw error;

            // Transform the data to return a flat list of contractor profiles
            const influencers = (data || [])
                .map(item => item.contractor_data)
                .filter(item => item !== null);

            return { data: influencers, error: null };
        } catch (error) {
            console.error('Error fetching assigned influencers:', error);
            return { data: [], error };
        }
    }
};
