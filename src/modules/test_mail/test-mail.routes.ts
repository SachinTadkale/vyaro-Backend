import { Router } from "express";

import {
  sendTestMail,
  verifySMTP,
  mailHealthCheck,
} from "./test-mail.controller";

const router = Router();

/**
 * MAIL HEALTH CHECK
 * GET /api/v1/mail/health
 */
router.get("/health", mailHealthCheck);

/**
 * SMTP VERIFICATION
 * GET /api/v1/mail/verify
 */
router.get("/verify", verifySMTP);

/**
 * SEND TEST EMAIL
 * GET /api/v1/mail/test
 */
router.get("/test", sendTestMail);

export default router;