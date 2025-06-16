require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Routers (to be implemented in separate files)
app.use('/auth', require('./routes/authRoutes'));
app.use('/users', require('./routes/userRoutes'));
app.use('/weather', require('./routes/admin/weatherRoutes'));

// app.use('/images', require('./routes/images'));
// app.use('/dengue-data', require('./routes/admin/dengueDataRoutes'));
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