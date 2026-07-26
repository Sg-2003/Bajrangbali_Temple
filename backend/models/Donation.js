const mongoose = require('mongoose');

const DonationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  donorName: { type: String, default: 'Anonymous' },
  amount: { type: Number, required: true },
  email: { type: String, required: false },
  phone: { type: String, required: false },
  paymentMethod: { type: String, required: true },
  purpose: { type: String, default: 'General Donation' },
  message: { type: String, required: false },
  transactionId: { type: String, required: true },
  paymentId: { type: String, required: false },
  status: { type: String, enum: ['Success', 'Failed'], default: 'Success' },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Donation', DonationSchema);
