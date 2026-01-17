import { supabase } from '../supabase';

export const newContractorApprovalService = {
    // Fetch pending contractors for approval
    getPendingContractors: async () => {
        try {
            const { data, error } = await supabase
                .from('contractor_data')
                .select('*')
                .eq('status', 'Pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
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
