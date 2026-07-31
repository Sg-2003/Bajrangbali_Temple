const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Import models
const Booking = require('../models/Booking');
const Donation = require('../models/Donation');
const Prayer = require('../models/Prayer');
const Contact = require('../models/Contact');
const ChatLog = require('../models/ChatLog');
const User = require('../models/User');
const Gallery = require('../models/Gallery');
const Event = require('../models/Event');
const Puja = require('../models/Puja');
const Announcement = require('../models/Announcement');

// Import Auth Middleware
const auth = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_temple_app_123';

// Helper middleware to extract user if logged in (for public forms)
const checkUserToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (e) {
      // Ignore token decoding error, proceed as guest
    }
  }
  next();
};

// ==========================================
// FILE UPLOAD SETUP (Multer + Cloudinary Fallback)
// ==========================================
const storage = multer.memoryStorage();
const upload = multer({ 
  storage, 
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const handleFileUpload = async (file) => {
  if (!file) return '';
  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'hanuman_temple_gallery' },
        (error, result) => {
          if (error) {
            console.error('Cloudinary Upload Error:', error);
            return reject(error);
          }
          resolve(result.secure_url);
        }
      );
      uploadStream.end(file.buffer);
    });
  } else {
    // Convert to base64
    const base64Image = file.buffer.toString('base64');
    return `data:${file.mimetype};base64,${base64Image}`;
  }
};

// ==========================================
// RAZORPAY PAYMENT SETUP (Razorpay Fallback)
// ==========================================
const isRazorpayConfigured = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;
let razorpay = null;
if (isRazorpayConfigured) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

// ==========================================
// AUTH ROUTES
// ==========================================

// Register (Admin or Devotee)
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, mobile, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please enter all required fields' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      mobile,
      password: hashedPassword,
      role: role || 'devotee' // default to devotee
    });

    const savedUser = await newUser.save();
    
    // Generate Token
    const token = jwt.sign({ id: savedUser._id, role: savedUser.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        mobile: savedUser.mobile,
        role: savedUser.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login (Admin or Devotee)
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter email and password' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact temple administration.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get User Profile
router.get('/auth/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// DEVOTEE DASHBOARD ROUTES
// ==========================================

// Get devotee's own bookings
router.get('/devotee/bookings', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id }).sort({ bookingDate: 1 });
    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching bookings.' });
  }
});

// Get devotee's own donations
router.get('/devotee/donations', auth, async (req, res) => {
  try {
    const donations = await Donation.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(donations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching donations.' });
  }
});

// Update devotee profile
router.put('/devotee/profile', auth, async (req, res) => {
  try {
    const { name, mobile } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, mobile },
      { new: true }
    ).select('-password');
    res.json({ message: 'Profile updated successfully!', user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// ADMIN USER MANAGEMENT ROUTES
// ==========================================

// Get all users (Admin only)
router.get('/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle user suspension (Admin only)
router.put('/users/:id/suspend', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Cannot suspend admin accounts.' });
    }
    user.isSuspended = !user.isSuspended;
    await user.save();
    res.json({ message: `User status changed. Suspended: ${user.isSuspended}`, user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete devotee profile (Admin only)
router.delete('/users/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Cannot delete admin accounts.' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User profile deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// DYNAMIC PUJA CRUD ROUTES
// ==========================================

// Get dynamic Pujas list (Public)
router.get('/pujas', async (req, res) => {
  try {
    let pujas = await Puja.find().sort({ title: 1 });
    // Seeding if empty
    if (pujas.length === 0) {
      const defaults = [
        { title: 'Shri Hanuman Chola Sahib & Sindoor Arpan', description: 'Offering of pure Chameli oil, orange Sindoor, silver foil (Vark), and new sacred red Chola dress to Lord Hanuman for supreme protection.', price: 2500, duration: '1.5 hrs', icon: '🚩', tag: 'MOST SACRED' },
        { title: 'Akhand Sundarkand Path', description: 'Holy recital of Sundarkand detailing Lord Hanuman\'s leap across the ocean and victory over Lanka for fulfilling desires.', price: 1100, duration: '2 hrs', icon: '📖', tag: 'POPULAR' },
        { title: '108 Hanuman Chalisa Anushthan', description: '108 continuous recitations of Hanuman Chalisa by temple Pandits with Sankalp in devotee\'s name for obstacle removal.', price: 751, duration: '2.5 hrs', icon: '📿', tag: 'FAITH & HEALING' },
        { title: 'Bajrang Baan & Sankat Mochan Path', description: 'Powerful chanting of Bajrang Baan & Sankatmochan Hanumanashtak for immediate relief from fear, enemies, and evil eye.', price: 501, duration: '1 hr', icon: '🛡️', tag: 'PROTECTION' },
        { title: 'Maruti Mahayajna & Shanti Havan', description: 'Sacred fire ceremony invoking Mahavira Hanuman with 1008 ahutis of guggul, camphor, and pure cow ghee for house purification.', price: 3500, duration: '2.5 hrs', icon: '🔥', tag: 'HAVAN SEVA' },
        { title: 'Mangalwar Boondi Laddoo & Madaar Mala Seva', description: 'Tuesday special offering of 108 Aak (Madaar) leaf garland, fresh Boondi Laddoos, and Panchamrit Snan to Kesari Nandan.', price: 301, duration: '30 mins', icon: '🌺', tag: 'TUESDAY SEVA' },
        { title: 'Shani-Rahu Dosha Nivarana Hanuman Archana', description: 'Special Black Sesame oil & Mustard oil Abhishekam to Lord Hanuman to alleviate Saturn (Shani Sade Sati) and Rahu afflictions.', price: 1250, duration: '1 hr', icon: '🪐', tag: 'DOSHA SHANTI' },
        { title: 'Hanuman Janmotsav Grand Mahapuja', description: 'Grand celebration Puja including Panchamrit Abhishek, grand Shringar, Chhapan Bhog offering, and 1008 Naamaavali Archana.', price: 5100, duration: '3.5 hrs', icon: '✨', tag: 'MAHAPUJA' }
      ];
      pujas = await Puja.insertMany(defaults);
    }
    res.json(pujas);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching Pujas.' });
  }
});

// Create Puja (Admin only)
router.post('/pujas', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const { title, description, price, duration } = req.body;
    if (!title || !price) {
      return res.status(400).json({ error: 'Title and price are required.' });
    }
    const newPuja = new Puja({ title, description, price, duration });
    const saved = await newPuja.save();
    res.status(201).json({ message: 'Puja offering created!', puja: saved });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Puja (Admin only)
router.put('/pujas/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const { title, description, price, duration } = req.body;
    const updated = await Puja.findByIdAndUpdate(
      req.params.id,
      { title, description, price, duration },
      { new: true }
    );
    res.json({ message: 'Puja details updated successfully.', puja: updated });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete Puja (Admin only)
router.delete('/pujas/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    await Puja.findByIdAndDelete(req.params.id);
    res.json({ message: 'Puja offering deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// DYNAMIC ANNOUNCEMENT ROUTES
// ==========================================

// Get announcements list (Public)
router.get('/announcements', async (req, res) => {
  try {
    const list = await Announcement.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create announcement (Admin only)
router.post('/announcements', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const { title, description, priority } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required.' });
    }
    const newItem = new Announcement({ title, description, priority });
    const saved = await newItem.save();
    res.status(201).json({ message: 'Announcement published successfully!', announcement: saved });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete announcement (Admin only)
router.delete('/announcements/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// POOJA BOOKINGS ROUTES
// ==========================================

// Create booking (Public - Links User if token exists)
router.post('/bookings', checkUserToken, async (req, res) => {
  try {
    const { name, email, mobile, address, poojaType, bookingDate, preferredTime, sankalpName, gotra, rashi, specialRequest } = req.body;
    
    if (!name || !mobile || !poojaType || !bookingDate || !preferredTime) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    const bookingId = 'BK-' + Date.now();
    const newBooking = new Booking({
      userId: req.user ? req.user.id : null,
      name,
      email,
      mobile,
      address,
      poojaType,
      bookingDate,
      preferredTime,
      sankalpName,
      gotra,
      rashi,
      specialRequest,
      status: 'Pending',
      paymentStatus: 'Pending',
      receiptId: bookingId
    });

    const savedBooking = await newBooking.save();
    res.status(201).json({ message: 'Pooja booking registered! Booking ID: ' + bookingId, booking: savedBooking });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get bookings (Admin only)
router.get('/bookings', auth, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ bookingDate: 1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Booking Status (Admin only)
router.put('/bookings/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ message: `Pooja booking status updated to ${status}.`, booking });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Booking Payment Status (Admin only)
router.put('/bookings/:id/payment', auth, async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    if (!['Pending', 'Paid'].includes(paymentStatus)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ message: `Booking payment status updated to ${paymentStatus}.`, booking });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// DONATION ROUTES
// ==========================================

// Initiate Razorpay Order (Public)
router.post('/donations/order', async (req, res) => {
  try {
    const { amount, donorName, email, phone, purpose, message } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const receiptId = 'RCPT-' + Date.now();

    if (isRazorpayConfigured) {
      const options = {
        amount: Math.round(amount * 100), 
        currency: 'INR',
        receipt: receiptId,
        payment_capture: 1
      };
      
      const order = await razorpay.orders.create(options);

      res.status(201).json({
        gateway: 'razorpay',
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      });
    } else {
      const orderId = 'order_sim_' + Math.random().toString(36).substr(2, 9);
      res.status(201).json({
        gateway: 'simulated',
        orderId,
        amount: amount,
        currency: 'INR',
        receipt: receiptId
      });
    }
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to initiate payment gateway.' });
  }
});

// Verify Payment and Record Donation (Public - Links User if token exists)
router.post('/donations/verify', checkUserToken, async (req, res) => {
  try {
    const { 
      gateway, 
      orderId, 
      paymentId, 
      signature, 
      donorName, 
      amount, 
      email, 
      phone, 
      purpose, 
      message 
    } = req.body;

    if (gateway === 'razorpay') {
      if (!paymentId || !signature) {
        return res.status(400).json({ error: 'Missing payment signature verification details' });
      }

      const body = orderId + '|' + paymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'fallback_razorpay')
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== signature) {
        return res.status(400).json({ error: 'Invalid transaction signature. Security verification failed.' });
      }
    }

    // Save donation to MongoDB
    const txnId = paymentId || 'TXN-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const newDonation = new Donation({
      userId: req.user ? req.user.id : null,
      donorName: donorName || 'Anonymous',
      amount,
      email,
      phone,
      paymentMethod: gateway === 'razorpay' ? 'Razorpay' : 'UPI (Simulated)',
      purpose: purpose || 'General Donation',
      message,
      transactionId: txnId,
      paymentId: paymentId || txnId,
      status: 'Success'
    });

    const savedDonation = await newDonation.save();
    res.status(201).json({ 
      message: 'Donation verified and recorded successfully!', 
      donation: savedDonation 
    });
  } catch (error) {
    console.error('Error recording verified donation:', error);
    res.status(500).json({ error: 'Failed to record donation details.' });
  }
});

// Get donations (Admin protected)
router.get('/donations', auth, async (req, res) => {
  try {
    const donations = await Donation.find().sort({ date: -1 });
    res.json(donations);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// CONTACT INQUIRIES ROUTES
// ==========================================

// Submit contact form (Public)
router.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Please provide name, email, and message' });
    }

    const newContact = new Contact({
      name,
      email,
      subject: subject || 'General Query',
      message
    });

    const savedContact = await newContact.save();
    res.status(201).json({ message: 'Message sent successfully!', contact: savedContact });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get contact inquiries (Admin only)
router.get('/contact', auth, async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ date: -1 });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// DEVOTEE PRAYER BOARD ROUTES
// ==========================================

// Submit a prayer (Public)
router.post('/prayers', async (req, res) => {
  try {
    const { devoteeName, message } = req.body;
    if (!devoteeName || !message) {
      return res.status(400).json({ error: 'Please provide name and message' });
    }

    const newPrayer = new Prayer({ devoteeName, message });
    const savedPrayer = await newPrayer.save();
    res.status(201).json({ message: 'Prayer submitted!', prayer: savedPrayer });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get visible prayers (Public)
router.get('/prayers', async (req, res) => {
  try {
    const prayers = await Prayer.find({ visible: true }).sort({ date: -1 });
    res.json(prayers);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a prayer (Admin only)
router.delete('/prayers/:id', auth, async (req, res) => {
  try {
    await Prayer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Prayer deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// GALLERY ROUTES (Dynamic Upload Support)
// ==========================================

// Get Gallery Photos (Public)
router.get('/gallery', async (req, res) => {
  try {
    const items = await Gallery.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching gallery.' });
  }
});

// Add Gallery Photo (Admin only)
router.post('/gallery', auth, upload.single('imageFile'), async (req, res) => {
  try {
    const { title, category, imageUrl } = req.body;
    
    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category are required.' });
    }

    let finalImageUrl = imageUrl;
    if (req.file) {
      finalImageUrl = await handleFileUpload(req.file);
    }

    if (!finalImageUrl) {
      return res.status(400).json({ error: 'An image file upload or image URL is required.' });
    }

    const newItem = new Gallery({
      title,
      category,
      image: finalImageUrl
    });

    const savedItem = await newItem.save();
    res.status(201).json({ message: 'Gallery item uploaded successfully!', item: savedItem });
  } catch (error) {
    console.error('Error uploading gallery item:', error);
    res.status(500).json({ error: 'Server error uploading gallery item.' });
  }
});

// Delete Gallery Photo (Admin only)
router.delete('/gallery/:id', auth, async (req, res) => {
  try {
    const deletedItem = await Gallery.findByIdAndDelete(req.params.id);
    if (!deletedItem) {
      return res.status(404).json({ error: 'Gallery item not found' });
    }
    res.json({ message: 'Gallery item deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting item.' });
  }
});

// ==========================================
// EVENTS ROUTES (Dynamic Event Support)
// ==========================================

// Get Events (Public)
router.get('/events', async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching events.' });
  }
});

// Add Event (Admin only)
router.post('/events', auth, upload.single('bannerFile'), async (req, res) => {
  try {
    const { title, description, date, bannerUrl } = req.body;
    
    if (!title || !description || !date) {
      return res.status(400).json({ error: 'Title, description, and date are required.' });
    }

    let finalBannerUrl = bannerUrl;
    if (req.file) {
      finalBannerUrl = await handleFileUpload(req.file);
    }

    const newEvent = new Event({
      title,
      description,
      date: new Date(date),
      banner: finalBannerUrl || ''
    });

    const savedEvent = await newEvent.save();
    res.status(201).json({ message: 'Event added successfully!', event: savedEvent });
  } catch (error) {
    console.error('Error adding event:', error);
    res.status(500).json({ error: 'Server error adding event.' });
  }
});

// Delete Event (Admin only)
router.delete('/events/:id', auth, async (req, res) => {
  try {
    const deletedEvent = await Event.findByIdAndDelete(req.params.id);
    if (!deletedEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ message: 'Event deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting event.' });
  }
});

// ==========================================
// ADMIN DASHBOARD ANALYTICS ENDPOINT
// ==========================================
router.get('/admin/stats', auth, async (req, res) => {
  try {
    // Total donations sum
    const totalDonationsArray = await Donation.aggregate([
      { $match: { status: 'Success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalDonations = totalDonationsArray[0] ? totalDonationsArray[0].total : 0;

    // Today's donation sum
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDonationsArray = await Donation.aggregate([
      { $match: { status: 'Success', date: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const todayDonations = todayDonationsArray[0] ? todayDonationsArray[0].total : 0;

    // Counts
    const totalBookings = await Booking.countDocuments();
    const totalEvents = await Event.countDocuments();
    const totalGallery = await Gallery.countDocuments();
    const totalContacts = await Contact.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'devotee' }); // Total registered devotees

    // Group bookings status for pie charts
    const bookingStats = await Booking.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Monthly donations breakdown for bar chart
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyDonations = await Donation.aggregate([
      { $match: { status: 'Success', date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format monthly data for easy frontend rendering
    const monthsName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedMonthly = monthlyDonations.map(item => {
      return {
        label: `${monthsName[item._id.month - 1]} ${item._id.year}`,
        amount: item.totalAmount
      };
    });

    res.json({
      cards: {
        totalDonations,
        todayDonations,
        totalBookings,
        totalEvents,
        totalGallery,
        totalContacts,
        totalUsers
      },
      bookingStats,
      monthlyDonations: formattedMonthly
    });
  } catch (error) {
    console.error('Error fetching admin dashboard statistics:', error);
    res.status(500).json({ error: 'Server error gathering statistics.' });
  }
});

// ==========================================
// CHATBOT "BAJRANGI" ROUTE
// ==========================================
router.post('/chat', async (req, res) => {
  try {
    const { message, session, lang } = req.body;

    if (!message || !session) {
      return res.status(400).json({ error: 'Please provide message and session' });
    }

    // Save devotee's message
    const devoteeMsg = new ChatLog({
      session,
      message,
      sender: 'devotee'
    });
    await devoteeMsg.save();

    // Generate response
    const msgLower = message.toLowerCase();

    // Determine language response preference (Hindi / Hinglish / English)
    const isHindiReq = (lang === 'hi') || /[\u0900-\u097F]/.test(message) || 
      /समय|आरती|पूजा|बुकिंग|दान|चंदा|स्थान|पता|इतिहास|श्लोक|मंत्र|नमस्ते|प्रणाम|जय|kya|hai|kab|kaise|batao|kahan|karna|karo|mujhe|namaste|pranam/i.test(msgLower);

    let response = '';

    if (isHindiReq) {
      if (msgLower.includes('timing') || msgLower.includes('darshan') || msgLower.includes('time') || msgLower.includes('close') || msgLower.includes('open') || msgLower.includes('hour') || msgLower.includes('aarti') || msgLower.includes('सम') || msgLower.includes('आरती') || msgLower.includes('दर्शन') || msgLower.includes('kab') || msgLower.includes('khulega') || msgLower.includes('samay')) {
        response = "जय श्री राम! 🪔 मंदिर प्रतिदिन खुला रहता है। प्रातः दर्शन: सुबह 06:00 बजे से दोपहर 12:30 बजे तक (मंगला आरती सुबह 06:30 बजे)। संध्या दर्शन: शाम 04:00 बजे से रात्रि 09:00 बजे तक (संध्या आरती शाम 07:00 बजे)। मंगलवार और शनिवार को दिनभर दर्शन उपलब्ध रहते हैं। श्री बजरंगबली आपका कल्याण करें!";
      } else if (msgLower.includes('pooja') || msgLower.includes('puja') || msgLower.includes('service') || msgLower.includes('book') || msgLower.includes('sundarkand') || msgLower.includes('chola') || msgLower.includes('shringar') || msgLower.includes('havan') || msgLower.includes('chalisa') || msgLower.includes('पूजा') || msgLower.includes('सेवा') || msgLower.includes('चोला') || msgLower.includes('हवन') || msgLower.includes('rate') || msgLower.includes('price')) {
        response = "जय बजरंगी! 🙏 हम विशेष पूजा सेवाएं प्रदान करते हैं: सुंदरकांड पाठ (₹1,100), महा श्रृंगार एवं चोला सेवा (₹2,100), मारुति हवन (₹3,500), तथा हनुमान चालीसा अर्चना (₹501)। आप वेबसाइट के 'पूजा सेवाएं' अनुभाग से सीधे ऑनलाइन बुकिंग कर सकते हैं!";
      } else if (msgLower.includes('donate') || msgLower.includes('donation') || msgLower.includes('contribution') || msgLower.includes('money') || msgLower.includes('fund') || msgLower.includes('payment') || msgLower.includes('upi') || msgLower.includes('दान') || msgLower.includes('चंदा') || msgLower.includes('योगदान') || msgLower.includes('paise') || msgLower.includes('dan')) {
        response = "जय श्री राम! 🪙 आपका पवित्र दान दैनिक अन्नदानम (महाप्रसाद वितरण), गौशाला सेवा और पोटका मंदिर के सौंदर्यीकरण में प्रयुक्त होता है। आप 'दान करें' पृष्ठ से UPI, कार्ड या नेटबैंकिंग द्वारा सुरक्षित रूप से दान दे सकते हैं। श्री हनुमान जी की कृपा आप पर सदैव बनी रहे!";
      } else if (msgLower.includes('location') || msgLower.includes('address') || msgLower.includes('where') || msgLower.includes('map') || msgLower.includes('potka') || msgLower.includes('kalikapur') || msgLower.includes('jharkhand') || msgLower.includes('find') || msgLower.includes('पता') || msgLower.includes('स्थान') || msgLower.includes('कहा') || msgLower.includes('kahan') || msgLower.includes('kaha') || msgLower.includes('pata')) {
        response = "जय हनुमान! 📍 बजरंगबली हनुमान मंदिर ग्राम-कालिकापुर, थाना-पोटका, जिला-पूर्वी सिंहभूम, झारखंड 832113 में स्थित है। गूगल मैप्स प्लस कोड: J79R+PQF (जमशेदपुर से निकट)। अधिक जानकारी हेतु 'संपर्क' पृष्ठ देखें!";
      } else if (msgLower.includes('history') || msgLower.includes('story') || msgLower.includes('origin') || msgLower.includes('about') || msgLower.includes('banyan') || msgLower.includes('इतिहास') || msgLower.includes('कहानी') || msgLower.includes('बरगद') || msgLower.includes('itihas') || msgLower.includes('katha')) {
        response = "जय बजरंगी! 🌳 मंदिर की शुरुआत दशकों पूर्व एक पावन बरगद के वृक्ष के नीचे छोटे से पावन स्थल के रूप में हुई थी। कालिकापुर निवासियों और भक्तों की अटूट भक्ति से यह एक भव्य मंदिर धाम बना। अधिक जानने के लिए 'हमारे बारे में' पृष्ठ देखें!";
      } else if (msgLower.includes('shloka') || msgLower.includes('sloka') || msgLower.includes('quote') || msgLower.includes('mantra') || msgLower.includes('chant') || msgLower.includes('श्लोक') || msgLower.includes('मंत्र')) {
        response = "जय हनुमान! संकटमोचन श्री बजरंगबली का यह अलौकिक श्लोक श्रद्धापूर्वक जपें: 'मनोजवं मारुततुल्यवेगं जितेन्द्रियं बुद्धिमतां वरिष्ठम्। वातात्मजं वानरयूथमुख्यं श्रीरामदूतं शरणं प्रपद्ये॥' यह आपके समस्त कष्ट दूर करेगा!";
      } else if (msgLower.includes('hello') || msgLower.includes('hi') || msgLower.includes('hey') || msgLower.includes('greet') || msgLower.includes('pranam') || msgLower.includes('namaste') || msgLower.includes('ram ram') || msgLower.includes('नमस्ते') || msgLower.includes('प्रणाम') || msgLower.includes('राम')) {
        response = "जय श्री राम! 🙏 मैं बजरंगी हूँ, मंदिर का एआई सहायक। मैं आपकी आरती समय, पूजा बुकिंग, दान, इतिहास और मंदिर के स्थान के बारे में सहायता कर सकता हूँ। आप क्या पूछना चाहते हैं?";
      } else {
        response = "जय श्री राम! मैं बजरंगी हूँ, मंदिर का एआई सहायक। मैं आपकी सेवा में सदैव तत्पर हूँ। आप मुझसे आरती के समय, पूजा सेवाओं, दान विधि, पोटका मंदिर के इतिहास या श्लोक के बारे में पूछ सकते हैं।";
      }
    } else {
      if (msgLower.includes('timing') || msgLower.includes('darshan') || msgLower.includes('time') || msgLower.includes('close') || msgLower.includes('open') || msgLower.includes('hour') || msgLower.includes('aarti')) {
        response = "Jai Shri Ram! 🪔 The temple is open daily. Morning Darshan: 06:00 AM to 12:30 PM (Mangala Aarti at 06:30 AM). Evening Darshan: 04:00 PM to 09:00 PM (Sandhya Aarti at 07:00 PM). Saturdays & Tuesdays feature continuous day-long darshan. May Bajrangbali guide your path!";
      } else if (msgLower.includes('pooja') || msgLower.includes('puja') || msgLower.includes('service') || msgLower.includes('book') || msgLower.includes('sundarkand') || msgLower.includes('chola') || msgLower.includes('shringar') || msgLower.includes('havan') || msgLower.includes('chalisa') || msgLower.includes('rate') || msgLower.includes('price')) {
        response = "Jai Bajrangbali! 🙏 We offer several special Poojas: Sundarkand Path (₹1,100), Maha Shringar & Chola Seva (₹2,100), Maruti Havan (₹3,500), and Hanuman Chalisa Archana (₹501). You can book them directly through the 'Pooja Services' section of our website! I can help you with anything else you need.";
      } else if (msgLower.includes('donate') || msgLower.includes('donation') || msgLower.includes('contribution') || msgLower.includes('money') || msgLower.includes('fund') || msgLower.includes('payment') || msgLower.includes('upi')) {
        response = "Jai Shri Ram! 🪙 Your generous contributions help us run the daily Annadanam (Prasad distribution), support our Gaushala (cowshed), and maintain the temple complex in Kalikapur. You can securely donate online using UPI, cards, or Netbanking in the 'Donation' page. May Bajrangbali bless you for your generosity!";
      } else if (msgLower.includes('location') || msgLower.includes('address') || msgLower.includes('where') || msgLower.includes('map') || msgLower.includes('potka') || msgLower.includes('kalikapur') || msgLower.includes('jharkhand') || msgLower.includes('find') || msgLower.includes('contact') || msgLower.includes('phone')) {
        response = "Jai Hanuman! 📍 The Bajrangbali Hanuman Mandir is situated at Vill-Kalikapur, P.S-Potka, Dist. East Singhbhum, Jharkhand 832113. Google Maps Plus Code: J79R+PQF (just south of Jamshedpur). You can find contact details and a location visualizer on our 'Contact' page!";
      } else if (msgLower.includes('history') || msgLower.includes('story') || msgLower.includes('origin') || msgLower.includes('about') || msgLower.includes('banyan') || msgLower.includes('tree')) {
        response = "Jai Bajrangbali! 🌳 The temple started decades ago as a humble village shrine under an ancient sacred Banyan tree. Over time, due to the intense devotion of the Kalikapur village community and visiting devotees, it grew into the beautiful temple complex we have today. You can read more about our heritage in the 'About' section!";
      } else if (msgLower.includes('shloka') || msgLower.includes('sloka') || msgLower.includes('quote') || msgLower.includes('mantra') || msgLower.includes('chant')) {
        response = "Jai Hanuman! Here is a powerful mantra of Bajrangbali for strength and protection: 'मनोजवं मारुततुल्यवेगं जितेन्द्रियं बुद्धिमतां वरिष्ठम्। वातात्मजं वानरयूथमुख्यं श्रीरामदूतं शरणं प्रपद्ये॥' Recite it with faith to overcome all fears!";
      } else if (msgLower.includes('hello') || msgLower.includes('hi') || msgLower.includes('hey') || msgLower.includes('greet') || msgLower.includes('pranam') || msgLower.includes('namaste') || msgLower.includes('ram ram')) {
        response = "Jai Shri Ram! 🙏 I am Bajrangi, the temple's AI assistant. I can assist you with temple timings, pooja bookings, donations, history, and location. Ask me anything, or try typing 'timings' or 'bookings'!";
      } else {
        response = "Jai Shri Ram! I am Bajrangi, the temple AI assistant. I am here to help you. I can tell you about our Aarti timings, Pooja services, how to donate, the history of the Kalikapur Mandir, or share a shloka. What would you like to know?";
      }
    }

    // Save response
    const bajrangiMsg = new ChatLog({
      session,
      message: response,
      sender: 'bajrangi'
    });
    await bajrangiMsg.save();

    res.json({ response });
  } catch (error) {
    console.error('Error in chat controller:', error);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

module.exports = router;
