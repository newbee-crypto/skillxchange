import { Router } from 'express';
import { createBooking, getMyBookings, updateBookingStatus } from '../controllers/bookingController.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.post('/', auth, createBooking);
router.get('/', auth, getMyBookings);
router.patch('/:id/status', auth, updateBookingStatus);

export default router;
