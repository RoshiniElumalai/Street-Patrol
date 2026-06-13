const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Sanitize strings to prevent email header injection (strip CRLF / control chars)
const sanitize = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[\r\n\x00-\x1F]/g, '').trim().slice(0, 200);
};

const maskEmail = (email) => {
  if (!email) return '***';
  const [user, domain] = email.split('@');
  return `${user.slice(0, 2)}***@${domain}`;
};

const sendEmergencyEmail = async (contactEmail, location, userName, userPhone) => {
  try {
    // Sanitize all user-supplied values before using in email headers/body
    const safeName = sanitize(userName);
    const safePhone = sanitize(userPhone);
    const safeEmail = sanitize(contactEmail);

    const mapsLink = location 
      ? `https://maps.google.com/?q=${location.lat},${location.lng}` 
      : 'Location not available';

    const mailOptions = {
      from: `"StreetSentinel Alerts" <${process.env.EMAIL_USER}>`,
      to: safeEmail,
      subject: `STREETSENTINEL EMERGENCY ALERT - ${safeName} may be in danger`,
      text: `STREETSENTINEL EMERGENCY ALERT\n\nUser: ${safeName}\nPhone: ${safePhone}\n\nLive Location:\n${mapsLink}\n\nTimestamp: ${new Date().toLocaleString()}\n\nPossible distress detected.\n\nPlease contact immediately.`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${maskEmail(safeEmail)}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Email failed to send:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmergencyEmail
};
