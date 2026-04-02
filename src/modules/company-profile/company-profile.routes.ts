import { Router } from "express";
import * as controller from "./company-profile.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { upload } from "../../middleware/upload.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", controller.getCompanyProfile);

router.put(
  "/profile-image",
  upload.single("image"),
  controller.uploadProfileImage
);

router.delete("/profile-image", controller.deleteProfileImage);

export default router;
