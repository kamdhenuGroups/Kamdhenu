import { supabase } from '../supabase';

export const addContractorService = {
    // Create a new contractor
    createContractor: async (contractorData) => {
        try {
            const { data, error } = await supabase
                .from('contractor_data')
                .insert([contractorData])
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error creating contractor:', error);
            return { data: null, error };
        }
    },

    checkPhoneUnique: async (phone) => {
        try {
            const { data, error } = await supabase
                .from('contractor_data')
                .select('contractor_id')
                .eq('customer_phone', phone);

            if (error) throw error;
            return { exists: data.length > 0, error: null };
        } catch (error) {
            console.error('Error checking phone uniqueness:', error);
            return { exists: false, error };
        }
    },

    // Fetch all active users (for admin selection)
    getUsers: async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('user_id, full_name, role')
                .eq('is_active', true)
                .order('full_name');

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error fetching users:', error);
            return { data: [], error };
        }
    },

    // Assign a contractor to a specific user
    assignContractorToUser: async (userId, contractorId) => {
        try {
            const { error } = await supabase
                .from('user_contractor_access')
                .insert([
                    {
                        user_id: userId,
                        contractor_id: contractorId,
                        can_view: true,
                        can_edit: false
                    }
                ]);

            if (error) throw error;
            return { error: null };
        } catch (error) {
            console.error('Error assigning contractor to user:', error);
            return { error };
        }
    }
};
