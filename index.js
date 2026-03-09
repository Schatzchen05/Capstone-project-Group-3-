require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// DB connection
const connectDB = require("./config/db.config");
connectDB(); // from feature branch

// Models (feature branch)
const User = require("./models/user.model");
const Account = require("./models/account.model");
const Transaction = require("./models/transaction.model");

const app = express();
app.use(express.json());
app.use(cors());

// Routes
const authRoutes = require("./routes/auth.route"); // feature branch naming
const userRoutes = require("./routes/user.route");
const accountRoutes = require("./routes/account.route");

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/account", accountRoutes);

// Optional: if main branch had a simpler auth route
// const authRoute = require('./routes/auth');
// app.use('/api/auth', authRoute);

app.get("/", (req, res) => {
  res.send("Digital Wallet API is Ready! Something huge is coming: Digi!");
});

// Use port 3000 from feature branch (can change to 5000 if you prefer)
const PORT = 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`),
);
