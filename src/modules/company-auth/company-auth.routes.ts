import { Router } from "express";
import * as controller from "./company-auth.controller";
import { upload } from "../../middleware/upload.middleware";

const router = Router();

router.post("/register", controller.registerCompany);

router.post(
  "/upload-documents",
  upload.fields([
    { name: "gst", maxCount: 1 },
    { name: "license", maxCount: 1 },
  ]),
  controller.uploadDocuments,
);

router.post("/login", controller.loginCompany);

router.post("/logout", controller.logoutCompany);

export default router;
