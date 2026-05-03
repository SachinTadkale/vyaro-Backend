/**
 * Module: Kyc.rules
 * Purpose: Implements the Kyc.rules module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import ApiError from "../../utils/apiError";

/**
 * Validate Kyc Rules.
 */
export const validateKycRules = (role: string, docs: any[]) => {
  const hasAadhaar = docs.some((d) => d.docType === "AADHAAR");
  const hasPan = docs.some((d) => d.docType === "PAN");
  const hasDL = docs.some((d) => d.docType === "DRIVING_LICENSE");
  const hasRC = docs.some((d) => d.docType === "VEHICLE_RC");

  if (role === "FARMER") {
    if (!hasAadhaar && !hasPan) {
      throw new ApiError(400, "Upload Aadhaar or PAN");
    }
  }

  if (role === "DELIVERY_PARTNER") {
    if (!hasAadhaar && !hasPan) {
      throw new ApiError(400, "Upload Aadhaar or PAN");
    }
    if (!hasDL) {
      throw new ApiError(400, "Driving License required");
    }
    if (!hasRC) {
      throw new ApiError(400, "Vehicle RC required");
    }
  }
};

/**
 * Validate Doc Type For Role.
 */
export const validateDocTypeForRole = (role: string, docType: string) => {
  if (role === "FARMER") {
    if (["DRIVING_LICENSE", "VEHICLE_RC"].includes(docType)) {
      throw new ApiError(400, "Invalid document for farmer");
    }
  }
};