import { Router } from 'express';
import { createBooking, getBookingById, getMyBookings, updateBookingStatus } from '../controllers/bookingController.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.post('/', auth, createBooking);
router.get('/', auth, getMyBookings);
router.get('/:id', auth, getBookingById);
router.patch('/:id/status', auth, updateBookingStatus);

export default router;
