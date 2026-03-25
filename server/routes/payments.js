import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { createPaymentIntent, confirmPayment } from '../services/paymentService.js';
import Booking from '../models/Booking.js';
import { emitToUsers, getSocketServer } from '../socket/index.js';

const router = Router();

// Create payment for booking
router.post('/create', auth, async (req, res) => {
  try {
    const { bookingId, amount } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const payment = await createPaymentIntent({
      amount: amount || booking.price,
      bookingId,
    });

    booking.paymentId = payment.id;
    booking.paymentStatus = 'paid';
    await booking.save();

    const populated = await booking.populate(['requester', 'provider']);
    const io = getSocketServer();
    if (io) {
      emitToUsers(
        io,
        [populated.requester?._id, populated.provider?._id],
        'booking:updated',
        { booking: populated }
      );
    }

    res.json({ payment, booking: populated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Confirm payment
router.post('/confirm', auth, async (req, res) => {
  try {
    const { paymentId } = req.body;
    const result = await confirmPayment(paymentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
