import { supabase } from '../supabase';
import { idGenerator, orderService } from './orderService';

export const fetchUsers = async () => {
    const { data, error } = await supabase
        .from('users')
        .select('user_id, full_name, username, role, department')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

    if (error) throw error;
    return data;
};

export const createCustomer = async (formData, user) => {
    // Helper to get city code
    const getCityCode = (cityName) => {
        if (!cityName) return 'XXX';
        if (cityName.trim().toLowerCase() === 'raipur') return 'RPR';
        return cityName.length >= 3 ? cityName.substring(0, 3).toUpperCase() : 'XXX';
    };

    const primarySite = formData.sites[0];

    // Generate Customer ID: CU/PhoneLast4/CityFirst3/Name
    const phoneLast4 = formData.primary_phone.slice(-4);
    const cityFirst3 = getCityCode(primarySite.city);
    const safeName = formData.customer_name.trim();
    const customId = `CU/${phoneLast4}/${cityFirst3}/${safeName}`;

    // 1. Create Main Customer Record
    // We use the primary site (first one) to populate the flattened address fields
    // to ensure backward compatibility with parts of the system expecting a single address.
    const customerPayload = {
        customer_id: customId,
        customer_name: formData.customer_name,
        firm_name: formData.is_gst_registered ? formData.firm_name : null,

        primary_phone: formData.primary_phone,
        secondary_phone: formData.secondary_phone || null,
        email: formData.email || null,
        gst_number: formData.gst_number || null,
        is_gst_registered: formData.is_gst_registered,

        // Billing Address (GST Only)
        gst_billing_address: formData.is_gst_registered ? formData.gst_billing_address : null,

        // Site Address Details (Primary Site)
        address_plot_house_flat_building: primarySite.address_plot_house_flat_building,
        address_area_street_locality: primarySite.address_area_street_locality,
        address_landmark: primarySite.address_landmark || null,
        map_link: primarySite.map_link || null,
        city: primarySite.city,
        state: primarySite.state,

        // Onsite Contact Details (Primary Site)
        onsite_contact_name: primarySite.onsite_contact_name,
        onsite_contact_mobile: primarySite.onsite_contact_mobile,



        created_by_user_id: user.user_id,
    };

    const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert([customerPayload])
        .select()
        .single();

    if (customerError) throw customerError;

    // 2. Create Individual Site Records in 'sites' table
    // This allows tracking multiple sites for the user/customer.
    const createdCounts = {}; // Track local increments for same-city sites
    for (const site of formData.sites) {
        if (!site.city || !site.state) continue;

        try {
            const cityCode = idGenerator.getCityCode(site.city);

            const siteUser = site.selectedUser || user;

            // Get next site number dynamically
            let { siteNumber } = await orderService.getOrderCounts(siteUser.user_id, site.city, null);

            // Adjust for multiple sites in same city within this batch
            // We need to key counts by user + city to be accurate if multiple users are used
            const countKey = `${siteUser.user_id}_${site.city}`;
            if (!createdCounts[countKey]) createdCounts[countKey] = 0;
            siteNumber += createdCounts[countKey];
            createdCounts[countKey]++;

            const siteId = idGenerator.generateSiteId({
                user: siteUser,
                cityCode: cityCode,
                siteCount: siteNumber,
                date: new Date()
            });

            const sitePayload = {
                site_id: siteId,
                customer_id: customerData.customer_id,
                address_plot_house_flat_building: site.address_plot_house_flat_building,
                address_area_street_locality: site.address_area_street_locality,
                address_landmark: site.address_landmark || null,
                city: site.city,
                state: site.state,
                map_link: site.map_link || null,
                onsite_contact_name: site.onsite_contact_name,
                onsite_contact_mobile: site.onsite_contact_mobile,
                created_by_user_id: siteUser.user_id,
                main_influencer_id: site.main_influencer?.value || null,
                assigned_influencers: site.additional_influencers
                    ? site.additional_influencers.map(i => i.value)
                    : [],
            };

            const { error: sError } = await supabase
                .from('sites')
                .insert([sitePayload]);

            if (sError) {
                console.error(`Error creating site ${siteId}:`, sError);
                // Continue creating other sites even if one fails
            }

        } catch (err) {
            console.error("Error processing site creation:", err);
        }
    }

    return customerData;
};

export const fetchContractors = async () => {
    const { data, error } = await supabase
        .from('contractor_data')
        .select('contractor_id, contractor_name, customer_type, mistry_name')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

export const getSiteCount = async (userId, city) => {
    const { siteNumber } = await orderService.getOrderCounts(userId, city, null);
    return siteNumber;
};


export const checkSiteIdExists = async (siteId) => {
    try {
        const { data, error } = await supabase
            .from('sites')
            .select('site_id')
            .eq('site_id', siteId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found'
            console.error('Error checking site ID:', error);
            return false;
        }

        return !!data;
    } catch (error) {
        console.error('Error in checkSiteIdExists:', error);
        return false;
    }
};

export const checkPhoneNumberExists = async (phoneNumber) => {
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('customer_id')
            .eq('primary_phone', phoneNumber)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found'
            console.error('Error checking phone number:', error);
            return false;
        }

        return !!data;
    } catch (error) {
        console.error('Error in checkPhoneNumberExists:', error);
        return false;
    }
};

export { idGenerator };
