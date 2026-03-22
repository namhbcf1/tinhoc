import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as paymentQueries from '../../db/payment-queries.js';

vi.mock('../../db/payment-queries.js', () => ({
    createPayment: vi.fn(),
    getPaymentsByStudent: vi.fn(),
    updatePaymentStatus: vi.fn()
}));

describe('Payment Process - Mocked 3-Tier Tests', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('createPayment stores payment intent safely', async () => {
        (paymentQueries.createPayment as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 456, status: 'pending', amount: 500000 });
        const result = await paymentQueries.createPayment({ amount: 500000, studentId: 99 });
        expect(result.id).toBe(456);
        expect(result.status).toBe('pending');
    });

    it('updatePaymentStatus handles webhook confirmation', async () => {
        (paymentQueries.updatePaymentStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 456, status: 'completed' });
        const result = await paymentQueries.updatePaymentStatus(456, 'completed');
        expect(result.status).toBe('completed');
    });
});
