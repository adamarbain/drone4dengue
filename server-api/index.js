require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for video frame uploads

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Routers (to be implemented in separate files)
app.use('/auth', require('./routes/authRoutes'));
app.use('/users', require('./routes/userRoutes'));
app.use('/drones', require('./routes/droneRoutes'));
app.use('/weather', require('./routes/admin/weatherRoutes'));
app.use('/recommendations', require('./routes/recommendationRoutes'));
app.use('/dengue-data', require('./routes/admin/dengueDataRoutes'));
app.use('/companies', require('./routes/companies'));
app.use('/company-locations', require('./routes/companyLocationRoutes'));
app.use('/geocode', require('./routes/geocode'));
app.use('/api/predict', require('./routes/predictionRoutes'));

// app.use('/images', require('./routes/images'));
// app.use('/alerts', require('./routes/alerts'));
// app.use('/reports', require('./routes/admin/reportRoutes'));

app.get('/', (req, res) => {
  res.json({ status: 'DengueEye API running' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; 