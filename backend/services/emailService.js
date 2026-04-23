const crypto = require("crypto");
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: String(process.env.EMAIL_SECURE).toLowerCase() === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const generateOtp = () => crypto.randomInt(100000, 999999).toString();

const sendOtpEmail = async (toEmail, otp, purpose) => {
  const purposeLabel = purpose === "signup" ? "complete your signup" : "complete your login";

  try {
    await transporter.sendMail({
      from: `Family Vault <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: "Your Family Vault OTP",
      text: `Your Family Vault OTP is: ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="margin:0;padding:24px;background:#0f172a;font-family:Arial,sans-serif;color:#e2e8f0;">
          <div style="max-width:520px;margin:0 auto;background:#111827;border:1px solid #334155;border-radius:16px;padding:28px;">
            <p style="margin:0 0 8px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#94a3b8;">Family Vault</p>
            <h1 style="margin:0 0 16px;font-size:24px;color:#ffffff;">Verify your email</h1>
            <p style="margin:0 0 18px;line-height:1.6;color:#cbd5e1;">Use this one-time password to ${purposeLabel}.</p>
            <div style="margin:24px 0;padding:18px;border-radius:12px;background:#020617;text-align:center;border:1px solid #38bdf8;">
              <div style="font-size:34px;font-weight:700;letter-spacing:8px;color:#ffffff;">${otp}</div>
            </div>
            <p style="margin:0;color:#cbd5e1;">This OTP expires in 10 minutes.</p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
};

const sendDocumentPasswordResetOtp = async (toEmail, otp, documentName) => {
  const safeDocumentName = escapeHtml(documentName);

  try {
    await transporter.sendMail({
      from: `Family Vault <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: "Family Vault — Document Password Reset OTP",
      text: `Your OTP to reset the password for "${documentName}" is: ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="margin:0;padding:24px;background:#0f172a;font-family:Arial,sans-serif;color:#e2e8f0;">
          <div style="max-width:540px;margin:0 auto;background:#111827;border:1px solid #334155;border-radius:16px;padding:28px;">
            <p style="margin:0 0 8px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#94a3b8;">Family Vault</p>
            <h1 style="margin:0 0 16px;font-size:24px;color:#ffffff;">Reset document password</h1>
            <p style="margin:0 0 10px;line-height:1.6;color:#cbd5e1;">Use this one-time password to reset the password for:</p>
            <p style="margin:0 0 18px;line-height:1.6;color:#ffffff;font-weight:700;">${safeDocumentName}</p>
            <div style="margin:24px 0;padding:18px;border-radius:12px;background:#020617;text-align:center;border:1px solid #f59e0b;">
              <div style="font-size:34px;font-weight:700;letter-spacing:8px;color:#ffffff;">${otp}</div>
            </div>
            <p style="margin:0;color:#cbd5e1;">This OTP expires in 10 minutes.</p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    throw new Error(`Failed to send document password reset OTP email: ${error.message}`);
  }
};

module.exports = {
  generateOtp,
  sendDocumentPasswordResetOtp,
  sendOtpEmail,
  transporter,
};
