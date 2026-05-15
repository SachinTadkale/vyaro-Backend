/**
 * Module: Upload.middleware
 * Purpose: Implements the Upload.middleware module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import multer from "multer";
import ApiError from "../utils/apiError";

const storage = multer.diskStorage({});
const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/**
 * Upload.
 */
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(
        new ApiError(
          400,
          "Unsupported file type. Only PDF, JPG, PNG, and WEBP files are allowed.",
          { code: "INVALID_FILE_TYPE" },
        ),
      );
    }

    cb(null, true);
  },
});
