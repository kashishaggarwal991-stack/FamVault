const OTP_TTL_MS = 10 * 60 * 1000;

const otpStore = new Map();

const normalizeEmail = (email = "") => email.trim().toLowerCase();

const storeOtp = (email, otp, purpose, userData = null) => {
  otpStore.set(normalizeEmail(email), {
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
    sentAt: Date.now(),
    purpose,
    userData,
  });
};

const getOtp = (email) => otpStore.get(normalizeEmail(email)) || null;

const deleteOtp = (email) => otpStore.delete(normalizeEmail(email));

const isExpired = (entry) => !entry || Date.now() > entry.expiresAt;

module.exports = {
  deleteOtp,
  getOtp,
  isExpired,
  storeOtp,
};
