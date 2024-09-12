

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

const JWT_SECRET = 'o1qzmQE89p';

// Connect to MongoDB
mongoose.connect('mongodb+srv://apartment-listing:apartment-listing@apartment-listing.rgcrw.mongodb.net/apartment-listing', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// Schemas and Models
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'tenant' },
  rentPaid: { type: Boolean, default: false },
  maintenanceRequests: [{ message: String, status: { type: String, default: 'pending' } }],
  apartmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Apartment' } // Reference to the apartment
});

const rentSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  apartmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Apartment' },
  rentAmount: Number,
  status: { type: String, enum: ['pending', 'approved', 'unapproved'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const apartmentSchema = new mongoose.Schema({
  number: String,
  details: String,
});

const tenantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  apartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment',
    default: null
  },
  // Other fields...
});

const Apartment = mongoose.model('Apartment', apartmentSchema);
const User = mongoose.model('User', userSchema);
const Rent = mongoose.model('Rent', rentSchema);
const Tenant = mongoose.model('Tenant', tenantSchema);

// Middleware for user authentication
// const authMiddleware = (req, res, next) => {
//   const token = req.headers['authorization'];
//   if (!token) return res.status(401).send('Access denied');

  

//   jwt.verify(token, JWT_SECRET, (err, user) => {
//     if (err) return res.status(401).send('Invalid token');
//     req.user = user;
//     next();
//   });
// };

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).send('Access denied');
  
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).send('Access denied');
  
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(401).send('Invalid token');
      req.user = user;
      next();
    });
  };
  

// Hardcoded admin credentials
const adminEmail = 'admin@apartment.com';
const adminPassword = 'admin123'; // You can hash this password for security if needed


app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  });
  
  // Serve register page
  app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
  });
  
  // Serve tenant dashboard
  app.get('/tenant-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tenant-dashboard.html'));
  });
  
  // Serve admin dashboard
  app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
  });
  
  // Serve profile management page
  app.get('/profile-management', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile-management.html'));
  });

// Register Tenant
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).send('Missing required fields');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ name, email, password: hashedPassword });

  try {
    await user.save();
    res.status(201).send('User registered successfully');
  } catch (error) {
    res.status(400).send('Error registering user');
  }
});

// Login Tenant/Admin
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (email === adminEmail && password === adminPassword) {
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET);
    return res.status(200).json({ token, role: 'admin' });
  }

  const user = await User.findOne({ email }).populate('apartmentId');
  if (!user) return res.status(400).send('User not found');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).send('Invalid credentials');

  const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);
  res.status(200).json({ token, role: user.role, apartmentId: user.apartmentId });
});

// View Profile
app.get('/api/profile', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id).populate('apartmentId');
  res.json(user);
});

// Update Profile
app.put('/api/profile', authMiddleware, async (req, res) => {
  const { name, email } = req.body;
  const user = await User.findByIdAndUpdate(req.user.id, { name, email }, { new: true });
  res.json(user);
});

// Tenant submits rent payment
app.post('/api/pay-rent', authMiddleware, async (req, res) => {
  const { rentAmount } = req.body;

  if (!rentAmount || rentAmount <= 0) {
    return res.status(400).send('Invalid rent amount');
  }

  const user = await User.findById(req.user.id);

  if (!user) return res.status(404).send('User not found');

  const rentPayment = new Rent({
    tenantId: user._id,
    apartmentId: user.apartmentId,
    rentAmount: rentAmount,
  });

  await rentPayment.save();
  res.send('Rent payment submitted successfully and is pending approval');
});

// Send Maintenance Request
app.post('/api/maintenance', authMiddleware, async (req, res) => {
  const { message } = req.body;
  const user = await User.findById(req.user.id);
  user.maintenanceRequests.push({ message });
  await user.save();
  res.send('Maintenance request sent');
});

// Admin Routes
app.get('/api/admin/tenants', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Access denied');
  const tenants = await User.find({ role: 'tenant' });
  res.json(tenants);
});

// Admin approves or unapproves rent payment
app.put('/api/admin/manage-rent/:rentId', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Access denied');

  const { rentId } = req.params;
  const { status } = req.body;

  if (!['approved', 'unapproved'].includes(status)) {
    return res.status(400).send('Invalid status');
  }

  const rent = await Rent.findById(rentId);
  if (!rent) return res.status(404).send('Rent payment not found');

  rent.status = status;
  await rent.save();

  res.send(`Rent payment has been ${status}`);
});

// // Root route
// app.get('/', (req, res) => {
//   res.send('Welcome to the Apartment Renting API');
// });

// Admin views all rent payments
app.get('/api/admin/rent-payments', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Access denied');

  const { status } = req.query; // Optional query parameter to filter by status
  const filter = status ? { status } : {};

  const rentPayments = await Rent.find(filter).populate('tenantId apartmentId');
  res.json(rentPayments);
});

// Admin deletes rent payment
app.delete('/api/admin/delete-rent/:rentId', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Access denied');

  const { rentId } = req.params;
  
  try {
    const rent = await Rent.findByIdAndDelete(rentId);
    if (!rent) return res.status(404).send('Rent payment not found');
    
    res.send('Rent payment deleted successfully');
  } catch (error) {
    res.status(400).send('Error deleting rent payment');
  }
});

// Create/Update/Delete Rent Amount
app.post('/api/admin/rent', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Access denied');
  const { rentAmount } = req.body;
  const rent = await Rent.findOne();
  if (rent) {
    rent.rentAmount = rentAmount;
    await rent.save();
    res.send('Rent updated');
  } else {
    const newRent = new Rent({ rentAmount });
    await newRent.save();
    res.send('Rent created');
  }
});

// Create Apartment
app.post('/api/admin/apartment', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Access denied');

  const { number, details } = req.body;
  const apartment = new Apartment({ number, details });
  try {
    await apartment.save();
    res.send('Apartment created successfully');
  } catch (error) {
    res.status(400).send('Error creating apartment');
  }
});


// Assign an apartment to a tenant
app.put('/api/admin/assign-apartment/:tenantId', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Access denied');

  const { tenantId } = req.params;
  const { apartmentId } = req.body;

  try {
    const tenant = await User.findById(tenantId);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    const apartment = await Apartment.findById(apartmentId);
    if (!apartment) return res.status(404).json({ message: 'Apartment not found' });

    tenant.apartmentId = apartmentId;
    await tenant.save();

    res.status(200).json({ message: 'Apartment assigned successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// View Apartments
app.get('/api/admin/apartments', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Access denied');

  const apartments = await Apartment.find();
  res.json(apartments);
});


// Admin Views All Tenants
app.get('/api/admin/tenants', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).send('Access denied');
    const tenants = await User.find({ role: 'tenant' });
    res.json(tenants);
  });

  // Get all users for the admin dashboard
app.get('/api/admin/tenants', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).send('Access denied');
  
    try {
      const users = await User.find();
      res.json(users);
    } catch (err) {
      res.status(500).send('Server error');
    }
  });
  
  
  // Admin Views All Rent Payments
  app.get('/api/admin/rent-payments', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).send('Access denied');
    const { status } = req.query; // Optional query parameter to filter by status
    const filter = status ? { status } : {};
    const rentPayments = await Rent.find(filter).populate('tenantId apartmentId');
    res.json(rentPayments);
  });
  
  // Admin Views Maintenance Requests
  app.get('/api/admin/maintenance-requests', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).send('Access denied');
    const tenants = await User.find({ role: 'tenant' });
    res.json(tenants);
  });
  

  // Get list of all users
app.get('/api/admin/users', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).send('Access denied');
  
    try {
      const users = await User.find();
      res.json(users);
    } catch (error) {
      res.status(500).send('Error fetching users');
    }
  });
  





// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

