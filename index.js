const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const authRoute = require('./routes/auth');
app.use('/api/auth', authRoute);

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log(" Database Connected"))
    .catch(err => console.log("DB Error:", err));

app.get('/', (req, res) => res.send("Digital Wallet API is Ready!"));

const PORT = 5000;
app.listen(PORT, () => console.log(` Server on port ${PORT}`));