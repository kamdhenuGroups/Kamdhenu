import { supabase } from '../supabase';
import { idGenerator } from './orderService';

export const LEAD_STATUSES = [
    'New',
    'Contacted',
    'Qualified',
    'Proposal Sent',
    'Negotiation',
    'Won',
    'Lost'
];

export const leadService = {
    // Create a new lead
    createLead: async (leadData) => {
        try {
            // Get current user from localStorage
            const storedUser = localStorage.getItem('user');
            if (!storedUser) throw new Error('User not authenticated');

            const user = JSON.parse(storedUser);

            // Validate required fields
            if (!leadData.customer_name || !leadData.customer_phone) {
                throw new Error('Customer Name and Phone are required');
            }

            if (!leadData.city || !leadData.state) {
                throw new Error('City and State are required for ID generation');
            }

            // Get count of leads in this city to determine Site Number
            const { count, error: countError } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .eq('city', leadData.city);

            if (countError) throw countError;

            const nextSiteNumber = (count || 0) + 1;

            // Generate Lead ID
            // Format: L/MMYY/City/UserCode-SiteNumber
            const date = new Date();
            const mm = (date.getMonth() + 1).toString().padStart(2, '0');
            const yy = date.getFullYear().toString().slice(-2);

            // Use helper from orderService for consistency
            const cityCode = idGenerator.getCityCode(leadData.city);
            const userCode = idGenerator.getRMCode(user);

            // Site number padding (01, 02... 10, 11)
            const siteNumStr = nextSiteNumber < 10 ? `0${nextSiteNumber}` : nextSiteNumber;

            const leadId = `L/${mm}${yy}/${cityCode}/${userCode}-${siteNumStr}`;

            const payload = {
                lead_id: leadId,
                customer_name: leadData.customer_name,
                customer_phone: leadData.customer_phone,
                lead_source_user_id: user.user_id,
                lead_source_user_name: user.full_name || user.Name || user.username || 'Unknown User',
                quotation: leadData.quotation,
                lead_status: leadData.lead_status || 'New',
                remarks: leadData.remarks,
                state: leadData.state,
                city: leadData.city
            };

            const { data, error } = await supabase
                .from('leads')
                .insert([payload])
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error creating lead:', error);
            return { data: null, error };
        }
    },

    // Get all leads
    getLeads: async () => {
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error fetching leads:', error);
            return { data: null, error };
        }
    },

    // Update a lead
    updateLead: async (id, updates) => {
        try {
            const { data, error } = await supabase
                .from('leads')
                .update(updates)
                .eq('lead_id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error updating lead:', error);
            return { data: null, error };
        }
    },

    // Delete a lead
    deleteLead: async (id) => {
        try {
            const { error } = await supabase
                .from('leads')
                .delete()
                .eq('lead_id', id);

            if (error) throw error;
            return { error: null };
        } catch (error) {
            console.error('Error deleting lead:', error);
            return { error };
        }
    }
};
