import nodemailer from "nodemailer";

type EmailTone = "brand" | "success" | "warning" | "neutral";
type EmailAudience = "USER" | "COMPANY" | "DELIVERY_PARTNER" | "ADMIN";

type EmailDetail = {
  label: string;
  value: string | number | null | undefined;
};

type EmailAction = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
};

type EmailTemplateInput = {
  to: string;
  subject: string;
  preheader: string;
  eyebrow: string;
  heading: string;
  introLines: string[];
  otpCode?: string;
  details?: EmailDetail[];
  actions?: EmailAction[];
  outro?: string;
  note?: string;
  audienceLabel?: string;
  tone?: EmailTone;
};

type EventNotificationInput = {
  to: string;
  subject: string;
  audience: EmailAudience;
  eventLabel: string;
  title: string;
  summary: string;
  introLines?: string[];
  details?: EmailDetail[];
  actions?: EmailAction[];
  note?: string;
  tone?: EmailTone;
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const PLATFORM_NAME = "Farmzy";
const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL ?? process.env.SMTP_USER ?? "support@farmzy.com";
const APP_BASE_URL = process.env.APP_BASE_URL ?? "";
const USER_APP_URL = process.env.USER_APP_URL ?? APP_BASE_URL;
const COMPANY_APP_URL = process.env.COMPANY_APP_URL ?? APP_BASE_URL;
const DELIVERY_APP_URL = process.env.DELIVERY_APP_URL ?? APP_BASE_URL;
const ADMIN_APP_URL = process.env.ADMIN_APP_URL ?? APP_BASE_URL;

const FARMZY_COLORS = {
  primary: "#4E6F3D",
  accent: "#7ED957",
  bg: "#F2F2F2",
  text: "#111827",
  muted: "#667085",
  mutedSoft: "#98A2B3",
  line: "#E4E7EC",
  softGreen: "#F3F8EF",
  softGreenStrong: "#E8F2E1",
  warning: "#B7791F",
  warningSoft: "#FCF6E8",
  neutral: "#344054",
  neutralSoft: "#F6F8F7",
  danger: "#B42318",
  dangerSoft: "#FEF3F2",
};

const toneStyles: Record<
  EmailTone,
  {
    accent: string;
    badgeBg: string;
    stripeEnd: string;
    valueAccent: string;
    buttonSoftBorder: string;
    secondaryText: string;
    secondaryBg: string;
  }
> = {
  brand: {
    accent: FARMZY_COLORS.primary,
    badgeBg: FARMZY_COLORS.softGreenStrong,
    stripeEnd: FARMZY_COLORS.accent,
    valueAccent: FARMZY_COLORS.primary,
    buttonSoftBorder: "#D6E1D0",
    secondaryText: "#5F6E63",
    secondaryBg: "#FAFBFA",
  },
  success: {
    accent: FARMZY_COLORS.primary,
    badgeBg: FARMZY_COLORS.softGreenStrong,
    stripeEnd: FARMZY_COLORS.accent,
    valueAccent: FARMZY_COLORS.primary,
    buttonSoftBorder: "#D6E1D0",
    secondaryText: "#5F6E63",
    secondaryBg: "#FAFBFA",
  },
  warning: {
    accent: FARMZY_COLORS.warning,
    badgeBg: "#F8E7C5",
    stripeEnd: "#E7C261",
    valueAccent: FARMZY_COLORS.warning,
    buttonSoftBorder: "#E9D8A6",
    secondaryText: "#8A6B2D",
    secondaryBg: "#FFFCF6",
  },
  neutral: {
    accent: FARMZY_COLORS.neutral,
    badgeBg: "#EAEFEB",
    stripeEnd: "#CAD5CE",
    valueAccent: FARMZY_COLORS.neutral,
    buttonSoftBorder: "#D0D5DD",
    secondaryText: "#667085",
    secondaryBg: "#FCFCFD",
  },
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toDisplayString = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
};

const buildAbsoluteUrl = (baseUrl: string, path: string) => {
  if (!baseUrl) {
    return "";
  }

  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return baseUrl;
  }
};

const getAudienceHomeUrl = (audience: EmailAudience) => {
  switch (audience) {
    case "USER":
      return USER_APP_URL;
    case "COMPANY":
      return COMPANY_APP_URL;
    case "DELIVERY_PARTNER":
      return DELIVERY_APP_URL;
    case "ADMIN":
      return ADMIN_APP_URL;
    default:
      return APP_BASE_URL;
  }
};

const getAudienceLabel = (audience: EmailAudience) => {
  switch (audience) {
    case "USER":
      return "User portal";
    case "COMPANY":
      return "Company workspace";
    case "DELIVERY_PARTNER":
      return "Delivery partner hub";
    case "ADMIN":
      return "Admin console";
    default:
      return "Farmzy workspace";
  }
};

const splitDetailsIntoSections = (details: EmailDetail[] | undefined) => {
  const validDetails = (details ?? []).filter(
    (detail) => toDisplayString(detail.value) !== null,
  );

  if (!validDetails.length) {
    return [];
  }

  if (validDetails.length <= 3) {
    return [
      {
        title: "Key details",
        rows: validDetails,
      },
    ];
  }

  return [
    {
      title: "Key details",
      rows: validDetails.slice(0, 3),
    },
    {
      title: "Transaction info",
      rows: validDetails.slice(3),
    },
  ].filter((section) => section.rows.length > 0);
};

const highlightValue = (value: string) => {
  if (
    /inr|rs\.?|₹|\bpaid\b|\bconfirmed\b|\blive\b|\bactive\b|\bdelivered\b|\bapproved\b|\bquantity\b|\bquintals?\b|\bkg\b|\bton\b/i.test(
      value,
    )
  ) {
    return true;
  }

  return /[0-9]/.test(value);
};

const renderDetails = (
  details: EmailDetail[] | undefined,
  accent: string,
  valueAccent: string,
) => {
  const sections = splitDetailsIntoSections(details);

  if (!sections.length) {
    return "";
  }

  const sectionMarkup = sections
    .map((section, sectionIndex) => {
      const rows = section.rows
        .map((detail, rowIndex) => {
          const value = toDisplayString(detail.value);

          if (!value) {
            return "";
          }

          const label = detail.label.toLowerCase();
          const isQuantity = /quantity/.test(label);
          const isBudget = /budget|price|amount|total/.test(label);
          const isHighlighted = isQuantity || highlightValue(value);
          const borderStyle =
            rowIndex < section.rows.length - 1
              ? `border-bottom: 1px solid ${FARMZY_COLORS.line};`
              : "";
          const valueSize = isQuantity || isHighlighted ? "16px" : "15px";
          const valueWeight = isBudget ? "700" : "600";
          const valueColor = isQuantity ? valueAccent : FARMZY_COLORS.text;

          return `
            <tr>
              <td style="padding: 10px 0; ${borderStyle}">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td valign="top" style="width: 42%; padding-right: 12px; font-size: 10px; line-height: 15px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: ${FARMZY_COLORS.mutedSoft};">
                      ${escapeHtml(detail.label)}
                    </td>
                    <td valign="top" align="right" style="font-size: ${valueSize}; line-height: 22px; font-weight: ${valueWeight}; color: ${valueColor};">
                      ${escapeHtml(value)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          `;
        })
        .join("");

      return `
        <tr>
          <td style="padding: ${sectionIndex === 0 ? "0" : "20px 0 0 0"};">
            <div>
              <div style="font-size: 11px; line-height: 16px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: ${accent}; padding-bottom: 12px;">
                ${escapeHtml(section.title)}
              </div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                ${rows}
              </table>
              ${
                sectionIndex < sections.length - 1
                  ? `<div style="height: 1px; background: ${FARMZY_COLORS.line}; margin-top: 18px;"></div>`
                  : ""
              }
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <tr>
      <td style="padding: 0 0 24px 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${sectionMarkup}
        </table>
      </td>
    </tr>
  `;
};

const renderOtpBlock = (otp?: string) => {
  if (!otp) {
    return "";
  }

  return `
    <tr>
      <td align="center" style="padding: 4px 0 20px 0;">
        <div style="font-size: 10px; line-height: 15px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: ${FARMZY_COLORS.mutedSoft}; padding-bottom: 8px;">
          One-time passcode
        </div>
        <div style="display: inline-block; padding: 16px 20px; border-radius: 14px; background: ${FARMZY_COLORS.softGreen};">
          <div style="font-size: 30px; line-height: 34px; font-weight: 700; letter-spacing: 8px; color: ${FARMZY_COLORS.primary}; text-align: center;">
            ${escapeHtml(otp)}
          </div>
        </div>
      </td>
    </tr>
  `;
};

const renderActions = (
  actions: EmailAction[] | undefined,
  accent: string,
  buttonSoftBorder: string,
  secondaryText: string,
  secondaryBg: string,
) => {
  const items = (actions ?? [])
    .filter((action) => action.href)
    .slice(0, 2)
    .map((action, index) => {
      const variant = action.variant ?? (index === 0 ? "primary" : "secondary");
      const isPrimary = variant === "primary";

      return `
        <a
          class="farmzy-btn ${isPrimary ? "farmzy-btn-primary" : "farmzy-btn-secondary"}"
          href="${escapeHtml(action.href)}"
          style="
            display: inline-block;
            padding: 14px 24px;
            margin: 0 16px 12px 0;
            border-radius: 999px;
            border: 1px solid ${isPrimary ? accent : buttonSoftBorder};
            background: ${isPrimary ? accent : secondaryBg};
            color: ${isPrimary ? "#ffffff" : secondaryText};
            font-size: 14px;
            font-weight: 700;
            line-height: 20px;
            text-decoration: none;
            box-shadow: ${isPrimary ? "0 10px 22px rgba(78, 111, 61, 0.18)" : "none"};
          "
        >
          ${escapeHtml(action.label)}
        </a>
      `;
    })
    .join("");

  if (!items) {
    return "";
  }

  return `
    <tr>
      <td style="padding: 0 0 24px 0;">
        ${items}
      </td>
    </tr>
  `;
};

export const renderTemplate = ({
  preheader,
  eyebrow,
  heading,
  introLines,
  otpCode,
  details,
  actions,
  outro,
  note,
  audienceLabel,
  tone = "brand",
}: Omit<EmailTemplateInput, "to" | "subject">) => {
  const palette = toneStyles[tone];
  const introMarkup = introLines
    .map(
      (line) => `
        <tr>
          <td style="padding: 0 0 12px 0; font-size: 15px; line-height: 24px; color: ${FARMZY_COLORS.muted};">
            ${escapeHtml(line)}
          </td>
        </tr>
      `,
    )
    .join("");

  const outroMarkup = outro
    ? `
      <tr>
        <td style="padding: 0 0 18px 0; font-size: 14px; line-height: 22px; color: ${FARMZY_COLORS.muted};">
          ${escapeHtml(outro)}
        </td>
      </tr>
    `
    : "";

  const noteMarkup = note
    ? `
      <tr>
        <td style="padding: 0;">
          <div style="padding: 14px 16px; border-radius: 16px; background: ${FARMZY_COLORS.neutralSoft}; font-size: 13px; line-height: 21px; color: ${FARMZY_COLORS.muted};">
            ${escapeHtml(note)}
          </div>
        </td>
      </tr>
    `
    : "";

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="x-apple-disable-message-reformatting" />
        <title>${escapeHtml(heading)}</title>
      </head>
      <style>
        .farmzy-btn:hover {
          opacity: 0.92 !important;
        }
        .farmzy-link:hover {
          text-decoration: underline !important;
        }
      </style>
      <body style="margin: 0; padding: 0; background: ${FARMZY_COLORS.bg}; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: ${FARMZY_COLORS.text};">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
          ${escapeHtml(preheader)}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: ${FARMZY_COLORS.bg};">
          <tr>
            <td align="center" style="padding: 28px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 680px; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                <tr>
                  <td style="padding: 0 0 14px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td valign="middle" style="padding-right: 10px;">
                          <div style="width: 30px; height: 30px; border-radius: 10px; background: linear-gradient(135deg, ${palette.accent} 0%, ${palette.stripeEnd} 100%); text-align: center; font-size: 16px; line-height: 30px; font-weight: 700; color: #ffffff;">
                            F
                          </div>
                        </td>
                        <td valign="middle">
                          <div style="font-size: 14px; line-height: 20px; font-weight: 700; color: ${FARMZY_COLORS.text}; letter-spacing: 0.02em;">
                            ${escapeHtml(PLATFORM_NAME)}
                          </div>
                          <div style="font-size: 11px; line-height: 16px; color: #7A867D; text-transform: uppercase; letter-spacing: 0.08em;">
                            Transactional update
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #ffffff; border: 1px solid #E5E7EB; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 32px rgba(16, 24, 40, 0.06);">
                      <tr>
                        <td style="padding: 0;">
                          <div style="height: 6px; background: linear-gradient(90deg, ${palette.accent} 0%, ${palette.stripeEnd} 100%);"></div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 30px 32px 12px 32px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="padding: 0 0 16px 0;">
                                <div style="display: inline-block; padding: 6px 11px; border-radius: 999px; background: ${palette.badgeBg}; color: ${palette.accent}; font-size: 10px; line-height: 16px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;">
                                  ${escapeHtml(eyebrow)}
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 0 0 8px 0;">
                                <div style="font-size: 32px; line-height: 40px; font-weight: 700; color: ${FARMZY_COLORS.text}; letter-spacing: -0.02em;">
                                  ${escapeHtml(heading)}
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 0 0 20px 0;">
                                <div style="font-size: 14px; line-height: 21px; color: ${FARMZY_COLORS.muted};">
                                  ${escapeHtml(audienceLabel ?? "Farmzy workspace")}
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 0 0 18px 0;">
                                <div style="height: 1px; background: ${FARMZY_COLORS.line};"></div>
                              </td>
                            </tr>
                            ${introMarkup}
                            ${renderOtpBlock(otpCode)}
                            ${renderDetails(details, palette.accent, palette.valueAccent)}
                            ${renderActions(
                              actions,
                              palette.accent,
                              palette.buttonSoftBorder,
                              palette.secondaryText,
                              palette.secondaryBg,
                            )}
                            ${outroMarkup}
                            ${noteMarkup}
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 32px 28px 32px;">
                          <div style="height: 1px; background: ${FARMZY_COLORS.line}; margin: 0 0 16px 0;"></div>
                          <div style="font-size: 12px; line-height: 18px; color: #8B938F;">
                            Need help? Contact
                            <a class="farmzy-link" href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color: ${palette.accent}; text-decoration: none; font-weight: 700;">
                              ${escapeHtml(SUPPORT_EMAIL)}
                            </a>
                            for support.
                          </div>
                          <div style="font-size: 11px; line-height: 18px; color: #A0A9A3; padding-top: 4px;">
                            This is an automated message from ${escapeHtml(PLATFORM_NAME)}.
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

const sendTemplatedEmail = async (input: EmailTemplateInput) => {
  const html = renderTemplate(input);

  await transporter.sendMail({
    from: `"${PLATFORM_NAME} Notifications" <${process.env.SMTP_USER}>`,
    to: input.to,
    subject: input.subject,
    html,
  });
};

export const sendEventNotificationEmail = async ({
  to,
  subject,
  audience,
  eventLabel,
  title,
  summary,
  introLines = [],
  details = [],
  actions = [],
  note,
  tone = "brand",
}: EventNotificationInput) => {
  const homeUrl = getAudienceHomeUrl(audience);
  const mergedActions = actions.length
    ? actions
    : homeUrl
      ? [
          {
            label: "Open workspace",
            href: homeUrl,
            variant: "primary" as const,
          },
        ]
      : [];

  await sendTemplatedEmail({
    to,
    subject,
    preheader: summary,
    eyebrow: eventLabel,
    heading: title,
    introLines: [summary, ...introLines],
    details,
    actions: mergedActions,
    audienceLabel: getAudienceLabel(audience),
    note,
    tone,
  });
};

export const sendApprovalEmail = async (to: string, name: string) => {
  await sendTemplatedEmail({
    to,
    subject: "Account Approved - Farmzy",
    preheader: "Your Farmzy account is approved and ready to use.",
    eyebrow: "Verification complete",
    heading: "Your account is approved",
    introLines: [
      `Hi ${name}, your Farmzy account has been successfully verified.`,
      "You can now sign in and start using the platform without any restrictions.",
    ],
    actions: USER_APP_URL
      ? [
          {
            label: "Go to dashboard",
            href: USER_APP_URL,
          },
        ]
      : [],
    outro: "We are glad to have you on the platform.",
    audienceLabel: "User portal",
    tone: "success",
  });
};

export const sendRejectionEmail = async (
  to: string,
  name: string,
  reason?: string,
) => {
  await sendTemplatedEmail({
    to,
    subject: "Account Verification Update - Farmzy",
    preheader: "Your Farmzy verification request needs attention.",
    eyebrow: "Verification update",
    heading: "Your verification was not approved",
    introLines: [
      `Hi ${name}, we reviewed your verification submission and could not approve it yet.`,
      "Please review the reason below and update the required information before trying again.",
    ],
    details: [
      {
        label: "Reason",
        value: reason ?? "Please contact support for more information.",
      },
    ],
    actions: USER_APP_URL
      ? [
          {
            label: "Review account",
            href: USER_APP_URL,
          },
        ]
      : [],
    note: "If you believe this was a mistake, reply to the support team with your registered account details.",
    audienceLabel: "User portal",
    tone: "warning",
  });
};

export const sendOtpEmail = async (to: string, name: string, otp: string) => {
  await sendTemplatedEmail({
    to,
    subject: "Your Farmzy Login OTP",
    preheader: "Use this one-time passcode to securely sign in to Farmzy.",
    eyebrow: "Secure sign-in",
    heading: "Your login code is ready",
    introLines: [
      `Hi ${name}, use the one-time passcode below to complete your login.`,
      "For your security, do not share this code with anyone.",
    ],
    otpCode: otp,
    details: [
      { label: "Valid for", value: "90 seconds" },
    ],
    actions: USER_APP_URL
      ? [
          {
            label: "Open Farmzy",
            href: USER_APP_URL,
          },
        ]
      : [],
    note: "If you did not request this code, you can ignore this email and your account will remain secure.",
    audienceLabel: "User portal",
    tone: "brand",
  });
};

export const sendPasswordResetOtp = async (
  to: string,
  name: string,
  otp: string,
) => {
  await sendTemplatedEmail({
    to,
    subject: "Reset Your Farmzy Password",
    preheader: "Use this OTP to reset your Farmzy password.",
    eyebrow: "Password recovery",
    heading: "Reset your password",
    introLines: [
      `Hi ${name}, we received a request to reset your Farmzy password.`,
      "Enter the code below in the app to continue the reset process.",
    ],
    otpCode: otp,
    details: [
      { label: "Valid for", value: "90 seconds" },
    ],
    actions: buildAbsoluteUrl(USER_APP_URL, "/reset-password")
      ? [
          {
            label: "Go to reset page",
            href: buildAbsoluteUrl(USER_APP_URL, "/reset-password"),
          },
        ]
      : USER_APP_URL
        ? [
            {
              label: "Open Farmzy",
              href: USER_APP_URL,
            },
          ]
        : [],
    note: "If you did not request a password reset, please ignore this email. Your password will stay unchanged.",
    audienceLabel: "User portal",
    tone: "brand",
  });
};
