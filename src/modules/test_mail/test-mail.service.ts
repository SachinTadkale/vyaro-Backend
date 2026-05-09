import nodemailer from "nodemailer";
import dns from "dns/promises";

class TestMailService {
  private transporter;

  constructor() {
    console.log("=================================");
    console.log("MAIL SERVICE INITIALIZING");
    console.log("=================================");

    console.log("MAIL ENV DEBUG:", {
      SMTP_HOST_EXISTS: !!process.env.SMTP_HOST,
      SMTP_PORT_EXISTS: !!process.env.SMTP_PORT,
      SMTP_USER_EXISTS: !!process.env.SMTP_USER,
      SMTP_PASS_EXISTS: !!process.env.SMTP_PASS,
      NODE_ENV: process.env.NODE_ENV,
    });

    this.transporter = nodemailer.createTransport({
      host: "142.250.152.108",

      port: Number(process.env.SMTP_PORT),

      // 465 => true
      // 587 => false
      secure: Number(process.env.SMTP_PORT) === 465,

      family:4,

      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },

      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,

      logger: true,
      debug: true,

      tls: {
        rejectUnauthorized: false,
        servername: "smtp.gmail.com",
      },
    });
  }

  async verifySMTP() {
    console.log("=================================");
    console.log("SMTP VERIFICATION STARTED");
    console.log("=================================");

    try {
      // SMTP VERIFY
      console.log("STEP 1: SMTP VERIFY");

      const verified =
        await this.transporter.verify();

      console.log("SMTP VERIFIED:", verified);

      return {
        success: true,
        stage: "SMTP_VERIFIED",
        dnsResolved: true,
        smtpVerified: true,
      };
    } catch (error: any) {
      console.error("=================================");
      console.error("SMTP VERIFICATION FAILED");
      console.error("=================================");

      console.error({
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        stack: error.stack,
      });

      return {
        success: false,
        stage: "SMTP_VERIFY_FAILED",
        error: {
          message: error.message,
          code: error.code,
          command: error.command,
          response: error.response,
          responseCode: error.responseCode,
        },
      };
    }
  }

  async sendTestEmail() {
    console.log("=================================");
    console.log("TEST EMAIL STARTED");
    console.log("=================================");

    try {
      // VERIFY SMTP FIRST
      console.log("STEP 1: VERIFYING SMTP");

      await this.transporter.verify();

      console.log("SMTP VERIFIED SUCCESSFULLY");

      // SEND EMAIL
      console.log("STEP 2: SENDING EMAIL");

      const info = await this.transporter.sendMail({
        from: `"FarmZy Debug" <${process.env.SMTP_USER}>`,

        to: "sachintadkale7666@gmail.com",

        subject: "FarmZy Backend Email Debug",

        html: `
          <div style="font-family: Arial;">
            <h2>Email Working Successfully ✅</h2>

            <p>Your deployed backend can send emails.</p>

            <p><strong>Server Time:</strong> ${new Date().toISOString()}</p>

            <p><strong>Environment:</strong> ${
              process.env.NODE_ENV
            }</p>
          </div>
        `,
      });

      console.log("=================================");
      console.log("EMAIL SENT SUCCESSFULLY");
      console.log("=================================");

      console.log({
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected,
        pending: info.pending,
      });

      return {
        success: true,
        stage: "EMAIL_SENT",

        data: {
          messageId: info.messageId,
          response: info.response,
          accepted: info.accepted,
          rejected: info.rejected,
        },
      };
    } catch (error: any) {
      console.error("=================================");
      console.error("EMAIL SEND FAILED");
      console.error("=================================");

      console.error({
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        stack: error.stack,
      });

      let reason = "UNKNOWN_ERROR";

      switch (error.code) {
        case "EAUTH":
          reason = "SMTP_AUTH_FAILED";
          break;

        case "ECONNECTION":
          reason = "SMTP_CONNECTION_FAILED";
          break;

        case "ETIMEDOUT":
          reason = "SMTP_TIMEOUT";
          break;

        case "ESOCKET":
          reason = "SMTP_SOCKET_ERROR";
          break;
      }

      return {
        success: false,
        stage: reason,

        error: {
          message: error.message,
          code: error.code,
          command: error.command,
          response: error.response,
          responseCode: error.responseCode,
        },
      };
    }
  }
}

export default new TestMailService();