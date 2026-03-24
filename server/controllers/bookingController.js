import Booking from '../models/Booking.js';

export const createBooking = async (req, res) => {
  try {
    const { providerId, skill, dateTime, duration, price, notes } = req.body;

    if (providerId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot book yourself' });
    }

    const booking = await Booking.create({
      requester: req.user._id,
      provider: providerId,
      skill,
      dateTime,
      duration: duration || 60,
      price: price || 0,
      notes,
      paymentStatus: price > 0 ? 'pending' : 'free',
    });

    const populated = await booking.populate(['requester', 'provider']);
    res.status(201).json({ booking: populated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const { type = 'all', status } = req.query;
    const query = {};

    if (type === 'sent') {
      query.requester = req.user._id;
    } else if (type === 'received') {
      query.provider = req.user._id;
    } else {
      query.$or = [{ requester: req.user._id }, { provider: req.user._id }];
    }

    if (status) query.status = status;

    const bookings = await Booking.find(query)
      .populate(['requester', 'provider'])
      .sort({ createdAt: -1 });

    res.json({ bookings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isProvider = booking.provider.toString() === req.user._id.toString();
    const isRequester = booking.requester.toString() === req.user._id.toString();

    if (!isProvider && !isRequester) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Only provider can accept/reject
    if (['accepted', 'rejected'].includes(status) && !isProvider) {
      return res.status(403).json({ error: 'Only provider can accept/reject' });
    }

    // Either party can cancel
    if (status === 'cancelled' && !isProvider && !isRequester) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    booking.status = status;
    if (status === 'accepted') {
      booking.meetingLink = `/video/${booking._id}`;
    }
    await booking.save();

    const populated = await booking.populate(['requester', 'provider']);
    res.json({ booking: populated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
