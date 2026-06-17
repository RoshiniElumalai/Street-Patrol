const nodemailer = require('nodemailer');

// Sanitize strings to prevent email header injection (strip CRLF / control chars)
const sanitize = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[\r\n\x00-\x1F]/g, '').trim().slice(0, 200);
};

const maskEmail = (email) => {
  if (!email) return '***';
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  return `${user.slice(0, 2)}***@${domain}`;
};

const hasGmailAppPassword = 
  process.env.EMAIL_PASS && 
  process.env.EMAIL_PASS !== 'REPLACE_WITH_GMAIL_APP_PASSWORD' &&
  process.env.EMAIL_PASS.length > 8;

const hasSendGrid = !!process.env.SENDGRID_API_KEY;

let transporter;
let transporterType;

if (hasGmailAppPassword) {
  // Gmail App Password SMTP — most reliable for Gmail-to-Gmail delivery
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  transporterType = 'Gmail SMTP';
  console.log('[Email] Using Gmail App Password SMTP for delivery');
} else if (hasSendGrid) {
  // SendGrid SMTP fallback
  transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY
    }
  });
  transporterType = 'SendGrid SMTP';
  console.log('[Email] Using SendGrid SMTP (emails may land in spam — set EMAIL_PASS for reliable delivery)');
} else {
  console.warn('[Email] ⚠️  No email transport configured! Set EMAIL_PASS (Gmail App Password) in server/.env');
  transporter = null;
  transporterType = 'none';
}

const sendEmergencyEmail = async (contactEmail, location, userName, userPhone) => {
  if (!transporter) {
    console.error('[Email] No transporter configured. Email not sent.');
    return { success: false, error: 'No email transport configured' };
  }
  try {
    // Sanitize all user-supplied values before using in email headers/body
    const safeName = sanitize(userName);
    const safePhone = sanitize(userPhone);
    const safeEmail = sanitize(contactEmail);

    const mapsLink = location 
      ? `https://maps.google.com/?q=${location.lat},${location.lng}` 
      : 'Location not available';

    const fromEmail = process.env.SENDGRID_SENDER_EMAIL || process.env.EMAIL_USER;

    const mailOptions = {
      from: fromEmail,
      to: safeEmail,
      subject: `STREETSENTINEL EMERGENCY ALERT - ${safeName} may be in danger`,
      text: `STREETSENTINEL EMERGENCY ALERT\n\nUser: ${safeName}\nPhone: ${safePhone}\n\nLive Location:\n${mapsLink}\n\nTimestamp: ${new Date().toLocaleString()}\n\nPossible distress detected.\n\nPlease contact immediately.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #d9534f;">🚨 STREETSENTINEL EMERGENCY ALERT 🚨</h2>
          <p><strong>${safeName}</strong> may be in danger.</p>
          <p><strong>Phone:</strong> ${safePhone}</p>
          <p><strong>Live Location:</strong> <a href="${mapsLink}">${mapsLink}</a></p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <hr />
          <p>Possible distress detected. Please contact them immediately.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email][${transporterType}] Email sent successfully to ${maskEmail(safeEmail)}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Nodemailer] Email failed to send:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmergencyEmail
};
