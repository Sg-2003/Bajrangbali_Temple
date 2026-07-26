require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database connection
const dbURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hanuman_mandir';
mongoose.connect(dbURI)
  .then(() => {
    console.log('Successfully connected to MongoDB Database.');
    // Seed default admin
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
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
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
