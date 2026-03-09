const router = require('express').Router();
const loginLimiter  = require('../middleware/lim.middleware');
const {register, login, resetPassword, forgotPassword} = require('../controllers/auth.controller');
const User = require('../models/user.model');
const Account = require('../models/account.model');

router.post('/register', register);
router.post('/login', loginLimiter, login); // Limiter applied here!
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;