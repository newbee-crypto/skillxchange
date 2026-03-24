import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  skill: {
    type: String,
    required: [true, 'Skill is required'],
  },
  dateTime: {
    type: Date,
    required: [true, 'Session date/time is required'],
  },
  duration: {
    type: Number, // minutes
    required: true,
    default: 60,
    min: 15,
    max: 480,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
    default: 'pending',
  },
  price: {
    type: Number,
    default: 0,
    min: 0,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'free'],
    default: 'free',
  },
  paymentId: {
    type: String,
    default: '',
  },
  notes: {
    type: String,
    maxlength: 500,
    default: '',
  },
  meetingLink: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

bookingSchema.index({ requester: 1, status: 1 });
bookingSchema.index({ provider: 1, status: 1 });
bookingSchema.index({ dateTime: 1 });

export default mongoose.model('Booking', bookingSchema);
