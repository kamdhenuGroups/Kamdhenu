import { supabase } from '../supabase';

/**
 * Fetches contractors based on user permissions.
 * Admins see all, others see only assigned contractors.
 * @param {Object} currentUser 
 * @returns {Promise<Array>} List of contractors
 */
export const getContractors = async (currentUser) => {
    if (!currentUser) return [];

    try {
        let query = supabase.from('contractor_data').select('*');

        // If NOT admin, filter by access
        const isAdmin = (currentUser.role && currentUser.role.toLowerCase() === 'admin') || currentUser.Admin === 'Yes';

        if (!isAdmin) {
            const { data: accessData, error: accessError } = await supabase
                .from('user_contractor_access')
                .select('contractor_id')
                .eq('user_id', currentUser.user_id)
                .eq('can_view', true);

            if (accessError) throw accessError;

            const allowedIds = accessData.map(item => item.contractor_id);

            if (allowedIds.length === 0) {
                return [];
            }

            query = query.in('contractor_id', allowedIds);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching contractors in service:', error);
        throw error;
    }
};

/**
 * Fetches CAC entries with related data.
 * Admins see all, others see only their own entries.
 * @param {Object} user 
 * @returns {Promise<Array>} List of CAC entries
 */
export const getCacEntries = async (user) => {
    try {
        let query = supabase
            .from('cac')
            .select(`
                *,
                users (full_name, username, user_id),
                contractor_data (contractor_name, customer_type),
                cac_bills (*)
            `)
            .order('created_at', { ascending: false });

        // If NOT admin, filter by user_id
        if (user) {
            const isAdmin = (user.role && user.role.toLowerCase() === 'admin') || user.Admin === 'Yes';

            if (!isAdmin) {
                query = query.eq('user_id', user.user_id);
            }
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching CAC entries in service:', error);
        throw error;
    }
};

/**
 * Creates a new CAC entry and uploads bill images.
 * @param {Object} cacPayload - The main CAC entry data
 * @param {Array} billImages - Array of file objects
 * @param {Object} user - The current user object
 * @returns {Promise<void>}
 */
export const createCacEntry = async (cacPayload, billImages, user) => {
    try {
        // 1. Create CAC Entry
        const { data: cacData, error: cacError } = await supabase
            .from('cac')
            .insert([cacPayload])
            .select()
            .single();

        if (cacError) throw cacError;

        const cacId = cacData.id;

        // 2. Upload Images and Insert into cac_bills
        if (billImages && billImages.length > 0) {
            const uploadPromises = billImages.map(async (file) => {
                const fileExt = file.name.split('.').pop();
                const fileName = `cac-bills/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

                // Upload to Storage
                const { error: uploadError } = await supabase.storage
                    .from('images') // Using 'images' bucket
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                // Get Public URL
                const { data: urlData } = supabase.storage
                    .from('images')
                    .getPublicUrl(fileName);

                const publicUrl = urlData.publicUrl;

                // Insert into cac_bills
                return supabase.from('cac_bills').insert([{
                    cac_id: cacId,
                    bill_url: publicUrl,
                    file_name: file.name,
                    file_type: file.type,
                    uploaded_by: user.user_id
                }]);
            });

            await Promise.all(uploadPromises);
        }

        return cacData;
    } catch (error) {
        console.error('Error creating CAC entry in service:', error);
        throw error;
    }
};

/**
 * Creates multiple CAC entries (split expense) and links uploads to all of them.
 * @param {Array} cacPayloads - Array of CAC entry objects
 * @param {Array} billImages - Array of file objects
 * @param {Object} user - The current user object
 * @returns {Promise<void>}
 */
export const createSharedCacEntries = async (cacPayloads, billImages, user) => {
    try {
        // 1. Create CAC Entries in Batch
        const { data: cacDataList, error: cacError } = await supabase
            .from('cac')
            .insert(cacPayloads)
            .select();

        if (cacError) throw cacError;

        if (!cacDataList || cacDataList.length === 0) return;

        // 2. Upload Images (Once) and get URLs
        let uploadedBills = [];
        if (billImages && billImages.length > 0) {
            const uploadPromises = billImages.map(async (file) => {
                const fileExt = file.name.split('.').pop();
                const fileName = `cac-bills/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

                // Upload to Storage
                const { error: uploadError } = await supabase.storage
                    .from('images')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                // Get Public URL
                const { data: urlData } = supabase.storage
                    .from('images')
                    .getPublicUrl(fileName);

                return {
                    url: urlData.publicUrl,
                    name: file.name,
                    type: file.type
                };
            });

            uploadedBills = await Promise.all(uploadPromises);
        }

        // 3. Link Uploaded Bills to ALL created CAC entries
        if (uploadedBills.length > 0) {
            const billInserts = [];

            cacDataList.forEach(cacEntry => {
                uploadedBills.forEach(bill => {
                    billInserts.push({
                        cac_id: cacEntry.id,
                        bill_url: bill.url,
                        file_name: bill.name,
                        file_type: bill.type,
                        uploaded_by: user.user_id
                    });
                });
            });

            const { error: billsError } = await supabase
                .from('cac_bills')
                .insert(billInserts);

            if (billsError) throw billsError;
        }

        return cacDataList;
    } catch (error) {
        console.error('Error creating shared CAC entries in service:', error);
        throw error;
    }
};
