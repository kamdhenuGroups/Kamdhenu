import { supabase } from '../supabase';

export const paymentService = {
    // Get all payments
    getPayments: async () => {
        try {
            const { data, error } = await supabase
                .from('payments')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error fetching payments:', error);
            return { data: null, error };
        }
    },

    // Get payments for a specific order
    getPaymentsByOrderId: async (orderId) => {
        try {
            const { data, error } = await supabase
                .from('payments')
                .select('*')
                .eq('order_id', orderId);

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error fetching payments for order:', error);
            return { data: null, error };
        }
    },

    // Update payment status
    updatePayment: async (paymentId, updates) => {
        try {
            const { data, error } = await supabase
                .from('payments')
                .update(updates)
                .eq('payment_id', paymentId)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error updating payment:', error);
            return { data: null, error };
        }
    },

    // Create a new payment record (if needed manually)
    createPayment: async (paymentData) => {
        try {
            const { data, error } = await supabase
                .from('payments')
                .insert([paymentData])
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error creating payment:', error);
            return { data: null, error };
        }
    }
};
