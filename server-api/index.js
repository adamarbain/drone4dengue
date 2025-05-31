require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Routers (to be implemented in separate files)
app.use('/auth', require('./routes/auth'));
app.use('/drones', require('./routes/drones'));
app.use('/users', require('./routes/users'));
app.use('/images', require('./routes/images'));
app.use('/weather', require('./routes/weather'));
app.use('/dengue-data', require('./routes/dengueData'));
app.use('/alerts', require('./routes/alerts'));
app.use('/reports', require('./routes/reports'));

app.get('/', (req, res) => {
  res.json({ status: 'DengueEye API running' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; 