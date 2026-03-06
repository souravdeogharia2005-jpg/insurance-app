require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'porschegt651@gmail.com',
        pass: process.env.EMAIL_PASS
    }
});

transporter.sendMail({
    from: process.env.EMAIL_USER || 'porschegt651@gmail.com',
    to: 'porschegt651@gmail.com',
    subject: 'Test',
    text: 'Test mail'
}).then(() => console.log('Success')).catch(err => console.error(err));
