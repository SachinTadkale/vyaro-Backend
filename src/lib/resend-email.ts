/**
 * Module: Resend Email Service
 * Purpose: Production-grade email delivery via Resend for Company flows.
 * Scope: Company-specific transactional emails (password reset OTP, etc.)
 *
 * This is intentionally separate from the existing nodemailer email.ts to:
 * - Avoid disrupting existing user/admin email flows
 * - Provide a clean Resend integration for the Company auth domain
 * - Allow parallel rollout without regression risk
 */
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const PLATFORM_NAME = "Farmzy";
const EMAIL_FROM = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "support@farmzy.in";
const COMPANY_APP_URL = process.env.COMPANY_APP_URL ?? "";

// ─── Brand Colors ─────────────────────────────────────────────────────────────
const COLORS = {
  primary: "#4E6F3D",
  accent: "#7ED957",
  bg: "#F2F2F2",
  text: "#111827",
  muted: "#667085",
  mutedSoft: "#98A2B3",
  line: "#E4E7EC",
  softGreen: "#F3F8EF",
  softGreenStrong: "#E8F2E1",
  neutralSoft: "#F6F8F7",
};

// ─── Template Builder ──────────────────────────────────────────────────────────

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Builds the company password reset OTP email HTML.
 * Clean, modern SaaS-style layout with Farmzy branding.
 */
const buildPasswordResetEmailHtml = (name: string, otp: string): string => {
  const safeOtp = escapeHtml(otp);
  const safeName = escapeHtml(name);

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>Reset Your Farmzy Password</title>
  </head>
  <body style="margin:0;padding:0;background:${COLORS.bg};font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:${COLORS.text};">

    <!-- Preheader -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Use this one-time code to reset your Farmzy company account password. Valid for 5 minutes.
    </div>

    <!-- Wrapper -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${COLORS.bg};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">

            <!-- Brand Header -->
            <tr>
              <td style="padding:0 0 16px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td valign="middle" style="padding-right:10px;">
                      <div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,${COLORS.primary} 0%,${COLORS.accent} 100%);text-align:center;font-size:13px;line-height:32px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">
                        FZ
                      </div>
                    </td>
                    <td valign="middle">
                      <div style="font-size:15px;line-height:20px;font-weight:700;color:${COLORS.text};letter-spacing:0.02em;">${escapeHtml(PLATFORM_NAME)}</div>
                      <div style="font-size:11px;line-height:16px;color:#7A867D;text-transform:uppercase;letter-spacing:0.08em;">Company Workspace</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Main Card -->
            <tr>
              <td>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border:1px solid #E5E7EB;border-radius:24px;overflow:hidden;box-shadow:0 10px 32px rgba(16,24,40,0.07);">

                  <!-- Accent stripe -->
                  <tr>
                    <td style="padding:0;">
                      <div style="height:5px;background:linear-gradient(90deg,${COLORS.primary} 0%,${COLORS.accent} 100%);"></div>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:32px 32px 8px 32px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">

                        <!-- Badge -->
                        <tr>
                          <td style="padding:0 0 18px 0;">
                            <div style="display:inline-block;padding:5px 12px;border-radius:999px;background:${COLORS.softGreenStrong};color:${COLORS.primary};font-size:10px;line-height:16px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">
                              Password Recovery
                            </div>
                          </td>
                        </tr>

                        <!-- Heading -->
                        <tr>
                          <td style="padding:0 0 6px 0;">
                            <div style="font-size:28px;line-height:36px;font-weight:700;color:${COLORS.text};letter-spacing:-0.02em;">
                              Reset your password
                            </div>
                          </td>
                        </tr>

                        <!-- Subtext -->
                        <tr>
                          <td style="padding:0 0 20px 0;">
                            <div style="font-size:13px;line-height:20px;color:#7A867D;">Company workspace</div>
                          </td>
                        </tr>

                        <!-- Divider -->
                        <tr>
                          <td style="padding:0 0 20px 0;">
                            <div style="height:1px;background:${COLORS.line};"></div>
                          </td>
                        </tr>

                        <!-- Intro -->
                        <tr>
                          <td style="padding:0 0 10px 0;font-size:15px;line-height:24px;color:${COLORS.muted};">
                            Hi ${safeName}, we received a request to reset your Farmzy company account password.
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:0 0 22px 0;font-size:15px;line-height:24px;color:${COLORS.muted};">
                            Enter the one-time passcode below to proceed. Do not share this code with anyone.
                          </td>
                        </tr>

                        <!-- OTP Block -->
                        <tr>
                          <td align="center" style="padding:4px 0 24px 0;">
                            <div style="font-size:10px;line-height:15px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${COLORS.mutedSoft};padding-bottom:10px;">
                              One-time passcode
                            </div>
                            <div style="display:inline-block;padding:18px 28px;border-radius:16px;background:${COLORS.softGreen};border:1px solid ${COLORS.softGreenStrong};">
                              <div style="font-size:36px;line-height:40px;font-weight:700;letter-spacing:10px;color:${COLORS.primary};text-align:center;font-variant-numeric:tabular-nums;">
                                ${safeOtp}
                              </div>
                            </div>
                          </td>
                        </tr>

                        <!-- Expiry Info Row -->
                        <tr>
                          <td style="padding:0 0 24px 0;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${COLORS.neutralSoft};border-radius:12px;">
                              <tr>
                                <td style="padding:10px 16px;">
                                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                    <tr>
                                      <td valign="top" style="width:50%;padding-right:8px;">
                                        <div style="font-size:10px;line-height:14px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${COLORS.mutedSoft};">Valid for</div>
                                        <div style="font-size:15px;line-height:22px;font-weight:600;color:${COLORS.text};">5 minutes</div>
                                      </td>
                                      <td valign="top" align="right" style="width:50%;">
                                        <div style="font-size:10px;line-height:14px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${COLORS.mutedSoft};">Single use</div>
                                        <div style="font-size:15px;line-height:22px;font-weight:600;color:${COLORS.text};">Expires on use</div>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- CTA Button -->
                        ${
                          COMPANY_APP_URL
                            ? `
                        <tr>
                          <td style="padding:0 0 24px 0;">
                            <a href="${escapeHtml(COMPANY_APP_URL + "/reset-password")}"
                               style="display:inline-block;padding:14px 28px;border-radius:999px;background:${COLORS.primary};color:#ffffff;font-size:14px;font-weight:700;line-height:20px;text-decoration:none;box-shadow:0 8px 20px rgba(78,111,61,0.18);">
                              Go to Reset Page
                            </a>
                          </td>
                        </tr>
                        `
                            : ""
                        }

                        <!-- Security Note -->
                        <tr>
                          <td style="padding:0 0 8px 0;">
                            <div style="padding:14px 16px;border-radius:12px;background:#F6F8F7;font-size:13px;line-height:21px;color:${COLORS.muted};">
                              🔒 If you did not request a password reset, please ignore this email. Your account password will remain unchanged. For security concerns, contact <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:${COLORS.primary};font-weight:600;text-decoration:none;">${escapeHtml(SUPPORT_EMAIL)}</a>.
                            </div>
                          </td>
                        </tr>

                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding:0 32px 28px 32px;">
                      <div style="height:1px;background:${COLORS.line};margin:0 0 16px 0;"></div>
                      <div style="font-size:12px;line-height:18px;color:#8B938F;">
                        Need help? Contact <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:${COLORS.primary};text-decoration:none;font-weight:700;">${escapeHtml(SUPPORT_EMAIL)}</a> for support.
                      </div>
                      <div style="font-size:11px;line-height:18px;color:#A0A9A3;padding-top:4px;">
                        This is an automated message from ${escapeHtml(PLATFORM_NAME)}. Please do not reply to this email.
                      </div>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>

  </body>
</html>
  `;
};

// ─── Public Email Functions ────────────────────────────────────────────────────

/**
 * Send the password reset OTP email to a company account holder via Resend.
 *
 * @param to    Recipient email address
 * @param name  Company contact name (for personalisation)
 * @param otp   Plain OTP code (6 digits) — generated by CompanyOtpService
 */
export const sendCompanyPasswordResetOtp = async (
  to: string,
  name: string,
  otp: string,
): Promise<void> => {
  const html = buildPasswordResetEmailHtml(name, otp);

  const { error } = await resend.emails.send({
    from: `${PLATFORM_NAME} <${EMAIL_FROM}>`,
    to,
    subject: "Reset Your Farmzy Company Password",
    html,
  });

  if (error) {
    console.error("[resend] Failed to send company password reset OTP", {
      to,
      error,
    });
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};
