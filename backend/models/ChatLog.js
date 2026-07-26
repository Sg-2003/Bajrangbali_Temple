const mongoose = require('mongoose');

const ChatLogSchema = new mongoose.Schema({
  session: { type: String, required: true },
  message: { type: String, required: true },
  sender: { type: String, enum: ['devotee', 'bajrangi'], required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatLog', ChatLogSchema);
