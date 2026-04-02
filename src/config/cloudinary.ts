import { v2 as cloudinary } from "cloudinary";
import ApiError from "../utils/apiError";

if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  throw new ApiError(500, "Media service is not configured");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (
  filePath: string,
  folderName: string = "farmzy/kyc"
) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folderName,
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    throw new Error("Cloudinary upload failed");
  }
};

export const deleteFromCloudinary = async (publicId: string) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    throw new ApiError(502, "Media delete failed");
  }
};

export default cloudinary;
