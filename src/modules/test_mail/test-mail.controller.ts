import { Request, Response } from "express";
import testMailService from "./test-mail.service";

export const verifySMTP = async (
  req: Request,
  res: Response
) => {
  console.log("=================================");
  console.log("VERIFY SMTP API CALLED");
  console.log("=================================");

  try {
    const result =
      await testMailService.verifySMTP();

    console.log("VERIFY SMTP RESULT:", result);

    return res
      .status(result.success ? 200 : 500)
      .json({
        message: result.success
          ? "SMTP verification successful"
          : "SMTP verification failed",

        ...result,
      });
  } catch (error: any) {
    console.error("=================================");
    console.error("VERIFY SMTP CONTROLLER ERROR");
    console.error("=================================");

    console.error({
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      stage: "CONTROLLER_ERROR",

      error: {
        message: error.message,
      },
    });
  }
};

export const sendTestMail = async (
  req: Request,
  res: Response
) => {
  console.log("=================================");
  console.log("SEND TEST MAIL API CALLED");
  console.log("=================================");

  try {
    const result =
      await testMailService.sendTestEmail();

    console.log("SEND MAIL RESULT:", result);

    return res
      .status(result.success ? 200 : 500)
      .json({
        message: result.success
          ? "Test email sent successfully"
          : "Failed to send test email",

        ...result,
      });
  } catch (error: any) {
    console.error("=================================");
    console.error("SEND TEST MAIL CONTROLLER ERROR");
    console.error("=================================");

    console.error({
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      stage: "CONTROLLER_ERROR",

      error: {
        message: error.message,
      },
    });
  }
};

export const mailHealthCheck = async (
  req: Request,
  res: Response
) => {
  console.log("=================================");
  console.log("MAIL HEALTH CHECK API CALLED");
  console.log("=================================");

  try {
    const envStatus = {
      SMTP_HOST_EXISTS: !!process.env.SMTP_HOST,
      SMTP_PORT_EXISTS: !!process.env.SMTP_PORT,
      SMTP_USER_EXISTS: !!process.env.SMTP_USER,
      SMTP_PASS_EXISTS: !!process.env.SMTP_PASS,

      NODE_ENV: process.env.NODE_ENV,

      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
    };

    return res.status(200).json({
      success: true,
      message: "Mail health check completed",

      environment: envStatus,

      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("=================================");
    console.error("MAIL HEALTH CHECK FAILED");
    console.error("=================================");

    console.error({
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,

      error: {
        message: error.message,
      },
    });
  }
};