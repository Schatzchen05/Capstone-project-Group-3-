const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1. Create a transporter
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL_USER, // Your gmail address
            pass: process.env.EMAIL_PASS  // Your Gmail App Password
        }
    });

    // 2. Define email options
    const mailOptions = {
        from: `Digital Wallet <${process.env.EMAIL_FROM}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        // html: options.html (You can add fancy HTML templates later)
    };

    // 3. Send the email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;