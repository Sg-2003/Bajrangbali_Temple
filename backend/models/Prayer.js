const mongoose = require('mongoose');

const PrayerSchema = new mongoose.Schema({
  devoteeName: { type: String, required: true },
  message: { type: String, required: true },
  date: { type: Date, default: Date.now },
  visible: { type: Boolean, default: true }
});

module.exports = mongoose.model('Prayer', PrayerSchema);
