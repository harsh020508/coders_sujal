/**
 * LocalKaam SMS Service
 * Provider abstraction for sending OTP SMS messages.
 * Currently supports Twilio. Swap provider by implementing the same interface.
 *
 * NEVER import or expose SMS credentials to frontend code.
 * This module must only be used server-side (server.js).
 */

// ─────────────────────────────────────────────────────────
// PROVIDER: Twilio
// ─────────────────────────────────────────────────────────

function getTwilioConfig() {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken:  process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER
  };
}

/**
 * Send an SMS via Twilio REST API.
 * Returns { success: true, messageId } or { success: false, error }
 */
async function sendViaTwilio(toPhone, body) {
  const { accountSid, authToken, fromNumber } = getTwilioConfig();

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: 'SMS_NOT_CONFIGURED', message: 'Twilio credentials not set in environment' };
  }

  if (!toPhone || typeof toPhone !== 'string') {
    return { success: false, error: 'INVALID_PHONE', message: 'No phone number provided' };
  }

  // Normalise Indian numbers: ensure leading +91
  const normalised = toPhone.replace(/\s+/g, '').replace(/^0/, '+91').replace(/^91/, '+91').replace(/^\+91(\d{10})$/, '+91$1');

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: normalised, From: fromNumber, Body: body });
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await res.json();

    if (!res.ok || data.status === 'failed' || data.error_code) {
      console.error('[SMS] Twilio delivery error:', data.message || data.error_message);
      return { success: false, error: 'PROVIDER_ERROR', message: data.message || 'SMS delivery failed' };
    }

    // Statuses: queued, sending, sent, delivered
    return { success: true, messageId: data.sid, status: data.status };
  } catch (err) {
    console.error('[SMS] Twilio network error:', err.message);
    return { success: false, error: 'NETWORK_ERROR', message: err.message };
  }
}

// ─────────────────────────────────────────────────────────
// PUBLIC INTERFACE
// ─────────────────────────────────────────────────────────

/**
 * Check whether SMS delivery is configured via environment variables.
 */
export function isSmsConfigured() {
  const { accountSid, authToken, fromNumber } = getTwilioConfig();
  return Boolean(accountSid && authToken && fromNumber);
}

/**
 * Send the arrival OTP to the customer's phone number.
 * Returns { success, messageId?, error?, message? }
 *
 * @param {string} toPhone  - Customer phone number
 * @param {string} otp      - 6-digit plaintext OTP (only used here, never stored)
 * @param {string} bookingId - Booking reference for the SMS body
 */
export async function sendArrivalOtpSms(toPhone, otp, bookingId) {
  const body =
    `[LocalKaam] Your arrival verification OTP for booking ${bookingId} is: ${otp}. ` +
    `Share this code ONLY with your service professional upon arrival. Valid for 30 minutes. ` +
    `Do NOT share with anyone else.`;

  return sendViaTwilio(toPhone, body);
}
