const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  name: { type: String, required: true },
  email: { type: String, required: false },
  mobile: { type: String, required: true },
  address: { type: String, required: false },
  poojaType: { type: String, required: true },
  bookingDate: { type: Date, required: true },
  preferredTime: { type: String, required: true },
  sankalpName: { type: String, required: false },
  gotra: { type: String, required: false },
  rashi: { type: String, required: false },
  specialRequest: { type: String, required: false },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  paymentStatus: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
  receiptId: { type: String, required: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', BookingSchema);
