require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  console.warn('DNS server configuration failed:', e.message);
}
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
const express = require('express');
const compression = require('compression');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(compression());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database connection
const dbURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hanuman_mandir';
const localURI = 'mongodb://127.0.0.1:27017/hanuman_mandir';

function seedDefaultAdmin() {
  const User = require('./models/User');
  const bcrypt = require('bcryptjs');
  User.countDocuments({ role: 'admin' })
    .then(count => {
      if (count === 0) {
        bcrypt.genSalt(10)
          .then(salt => bcrypt.hash('admin123', salt))
          .then(hashedPassword => {
            const defaultAdmin = new User({
              name: 'Temple Admin',
              email: 'admin@temple.com',
              password: hashedPassword,
              role: 'admin'
            });
            return defaultAdmin.save();
          })
          .then(() => console.log('Successfully seeded default admin: admin@temple.com / admin123'))
          .catch(err => console.error('Error seeding admin:', err));
      }
    });
}

mongoose.connect(dbURI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log('Successfully connected to MongoDB Database.');
    seedDefaultAdmin();
  })
  .catch((err) => {
    console.warn('MongoDB Atlas connection failed. Error:', err.message);
    console.log('Attempting local MongoDB fallback connection...');
    mongoose.connect(localURI, { serverSelectionTimeoutMS: 5000 })
      .then(() => {
        console.log('Successfully connected to local MongoDB Database.');
        seedDefaultAdmin();
      })
      .catch((localErr) => {
        console.error('All MongoDB connection attempts failed.', localErr);
      });
  });

// Root Endpoint
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Bajrangbali Temple API</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #fdfbf7;">
        <h1 style="color: #FF6F00;">🚩 Bajrangbali Hanuman Mandir Backend API</h1>
        <p>The backend API service is running on port 5000.</p>
        <p>To view the full temple website UI, please visit: <a href="http://localhost:4200" style="color: #FF6F00; font-weight: bold; text-decoration: underline;">http://localhost:4200</a></p>
      </body>
    </html>
  `);
});

// Status Endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    message: 'Bajrangbali Hanuman Mandir API is fully operational.',
    timestamp: new Date()
  });
});

// API Routes
app.use('/api', apiRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'An internal server error occurred.' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Backend Server is running on port: ${PORT}`);
});
