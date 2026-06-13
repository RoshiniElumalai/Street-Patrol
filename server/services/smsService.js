const twilio = require('twilio');
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client;
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
} else {
  console.warn("[Twilio] Credentials missing from .env. SMS/WhatsApp delivery will fail.");
}

// E.164 phone number validation
const isValidE164 = (phone) => {
  if (typeof phone !== 'string') return false;
  return /^\+[1-9]\d{6,14}$/.test(phone);
};

const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '***';
  return phone.slice(0, 4) + '****' + phone.slice(-2);
};

async function sendEmergencySMS(phoneNumber, message) {
  try {
    if (!client) {
      throw new Error("Twilio client is not initialized due to missing credentials.");
    }

    if (!isValidE164(phoneNumber)) {
      throw new Error(`Invalid phone number format. Expected E.164 format.`);
    }
    
    console.log(`Sending SMS to ${maskPhone(phoneNumber)}`);
    
    const response = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: phoneNumber
    });
    
    console.log("SMS SENT SUCCESS");
    
    return {
      success: true,
      messageId: response.sid
    };
  } catch (error) {
    console.error("SMS delivery failed:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function sendEmergencyWhatsApp(phoneNumber, message) {
  try {
    if (!client) {
      throw new Error("Twilio client is not initialized due to missing credentials.");
    }

    if (!isValidE164(phoneNumber.replace('whatsapp:', ''))) {
      throw new Error(`Invalid phone number format for WhatsApp.`);
    }
    
    // Twilio WhatsApp recipient must format as 'whatsapp:<phone>'
    const toFormatted = phoneNumber.startsWith('whatsapp:') ? phoneNumber : `whatsapp:${phoneNumber}`;
    const fromFormatted = twilioPhoneNumber && (twilioPhoneNumber.startsWith('whatsapp:') ? twilioPhoneNumber : `whatsapp:${twilioPhoneNumber}`);
    
    console.log(`Sending WhatsApp message to ${maskPhone(phoneNumber)}`);
    
    const response = await client.messages.create({
      body: message,
      from: fromFormatted,
      to: toFormatted
    });
    
    console.log("WHATSAPP SENT SUCCESS");
    
    return {
      success: true,
      messageId: response.sid
    };
  } catch (error) {
    console.error("WhatsApp delivery failed:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { sendEmergencySMS, sendEmergencyWhatsApp };
