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
    }
};
