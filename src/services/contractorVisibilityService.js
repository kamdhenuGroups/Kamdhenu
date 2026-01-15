import { supabase } from '../supabase';

/**
 * Fetches all contractors from the contractor_data table.
 * @returns {Promise<Array>} List of contractors
 */
export const getContractors = async () => {
    // Optimization: Removed .order() from DB query to avoid slow sorting on unindexed 'contractor_name'.
    // Sorting is now handled in the application layer.
    const { data, error } = await supabase
        .from('contractor_data')
        .select('contractor_id, contractor_name, nickname, city, customer_type');

    if (error) throw error;

    // Sort in memory - faster than unindexed DB sort for typical dataset sizes
    return (data || []).sort((a, b) =>
        (a.contractor_name || '').localeCompare(b.contractor_name || '')
    );
};

/**
 * Fetches assigned contractor IDs for a specific user.
 * @param {string|number} userId 
 * @returns {Promise<Array>} List of assigned contractor IDs
 */
export const getUserAssignments = async (userId) => {
    const { data, error } = await supabase
        .from('user_contractor_access')
        .select('contractor_id')
        .eq('user_id', userId);

    if (error) throw error;
    return data.map(d => d.contractor_id);
};

/**
 * Assigns a contractor to a user.
 * @param {string|number} userId 
 * @param {string|number} contractorId 
 * @returns {Promise<void>}
 */
export const assignContractorToUser = async (userId, contractorId) => {
    const { error } = await supabase
        .from('user_contractor_access')
        .insert([{ user_id: userId, contractor_id: contractorId }]);

    if (error) throw error;
};

/**
 * Revokes a contractor access from a user.
 * @param {string|number} userId 
 * @param {string|number} contractorId 
 * @returns {Promise<void>}
 */
export const revokeContractorAccess = async (userId, contractorId) => {
    const { error } = await supabase
        .from('user_contractor_access')
        .delete()
        .match({ user_id: userId, contractor_id: contractorId });

    if (error) throw error;
};

/**
 * Fetches all user contractor assignments.
 * @returns {Promise<Object>} Map of userId -> array of contractorIds
 */
export const getAllUserAssignments = async () => {
    const { data, error } = await supabase
        .from('user_contractor_access')
        .select('user_id, contractor_id');

    if (error) throw error;

    // Group by user_id
    const assignments = {};
    if (data) {
        data.forEach(record => {
            if (!assignments[record.user_id]) {
                assignments[record.user_id] = [];
            }
            assignments[record.user_id].push(record.contractor_id);
        });
    }
    return assignments;
};
