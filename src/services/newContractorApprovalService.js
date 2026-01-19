import { supabase } from '../supabase';

export const newContractorApprovalService = {
    // Fetch pending contractors for approval
    // Fetch pending contractors for approval
    getPendingContractors: async () => {
        try {
            // 1. Get contractors
            const { data: contractors, error: contractorsError } = await supabase
                .from('contractor_data')
                .select('*')
                .eq('status', 'Pending')
                .order('created_at', { ascending: false });

            if (contractorsError) throw contractorsError;

            if (!contractors || contractors.length === 0) return { data: [], error: null };

            // 2. Get User IDs
            const userIds = [...new Set(contractors.map(c => c.created_by_user_id).filter(Boolean))];

            if (userIds.length === 0) return { data: contractors, error: null };

            // 3. Get Users
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('user_id, full_name')
                .in('user_id', userIds);

            if (usersError) throw usersError;

            // 4. Map users to contractors
            const userMap = {};
            users.forEach(u => { userMap[u.user_id] = u; });

            const enrichedContractors = contractors.map(c => ({
                ...c,
                created_by_user: userMap[c.created_by_user_id] || null
            }));

            return { data: enrichedContractors, error: null };
        } catch (error) {
            console.error('Error fetching pending contractors:', error);
            return { data: [], error };
        }
    },

    // Update contractor status object
    updateContractorStatus: async (contractorId, status) => {
        try {
            const { data, error } = await supabase
                .from('contractor_data')
                .update({ status: status })
                .eq('contractor_id', contractorId)
                .select();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error(`Error updating contractor status to ${status}:`, error);
            return { data: null, error };
        }
    },
    // Update contractor details (name, phone, etc.)
    updateContractorDetails: async (contractorId, updates) => {
        try {
            const { data, error } = await supabase
                .from('contractor_data')
                .update(updates)
                .eq('contractor_id', contractorId)
                .select();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error updating contractor details:', error);
            return { data: null, error };
        }
    }
};
