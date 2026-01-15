import { supabase } from '../supabase';

export const fetchActiveCustomers = async () => {
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('customer_id, customer_name, primary_phone, billing_address_line, billing_area, billing_locality, billing_city, billing_state')
            .eq('customer_status', 'Active')
            .order('customer_name');

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching customers:', err);
        throw err;
    }
};

export const fetchSites = async () => {
    try {
        const { data, error } = await supabase
            .from('sites')
            .select(`
                site_id,
                address_plot_house_flat_building,
                address_area_street_locality,
                city,
                state,
                onsite_contact_name,
                onsite_contact_mobile
            `)
            .order('site_id');

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching sites:', err);
        throw err;
    }
};
