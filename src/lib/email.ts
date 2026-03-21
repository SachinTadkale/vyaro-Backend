import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendApprovalEmail = async (
  to: string,
  name: string
) => {
  await transporter.sendMail({
    from: `"Farmzy Support" <${process.env.SMTP_USER}>`,
    to,
    subject: "Account Approved - Farmzy",
    html: `
      <h2>Hello ${name},</h2>
      <p>Your account has been successfully verified.</p>
      <p>You can now login and access all features.</p>
      <br/>
      <p>Farmzy Team</p>
    `,
  });
};

export const sendRejectionEmail = async (
  to: string,
  name: string,
  reason?: string
) => {
  await transporter.sendMail({
    from: `"Farmzy Support" <${process.env.SMTP_USER}>`,
    to,
    subject: "Account Verification Update - Farmzy",
    html: `
      <h2>Hello ${name},</h2>
      <p>Your account verification was rejected.</p>
      ${
        reason
          ? `<p><strong>Reason:</strong> ${reason}</p>`
          : ""
      }
      <p>Please contact support.</p>
      <br/>
      <p>Farmzy Team</p>
    `,
  });
};

export const sendOtpEmail = async (
  to: string,
  name: string,
  otp: string
) => {
  await transporter.sendMail({
    from: `"Farmzy Security" <${process.env.SMTP_USER}>`,
    to,
    subject: "Your Farmzy Login OTP",
    html: `
      <h2>Hello ${name},</h2>
      <p>Your OTP for login is:</p>
      <h1>${otp}</h1>
      <p>This OTP is valid for 90 seconds.</p>
      <br/>
      <p>If you did not request this, please ignore.</p>
    `,
  });
};

export const sendPasswordResetOtp = async (
  to: string,
  name: string,
  otp: string
) => {
  await transporter.sendMail({
    from: `"Farmzy Support" <${process.env.SMTP_USER}>`,
    to,
    subject: "Reset Your Farmzy Password",
    html: `
      <h2>Hello ${name},</h2>
      <p>You requested to reset your password.</p>
      <p>Your OTP is:</p>
      <h1>${otp}</h1>
      <p>This OTP is valid for 90 seconds.</p>
      <br/>
      <p>If you did not request this, please ignore this email.</p>
      <br/>
      <p>Farmzy Team</p>
    `,
  });
};
