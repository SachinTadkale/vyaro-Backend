import bcrypt from "bcrypt";
import { generateToken } from "../../lib/jwt";
import * as repo from "./company-auth.repository";
import ApiError from "../../utils/apiError";
import { RegisterCompanyInput } from "./company-auth.types";

const sanitizeCompany = <T extends { password: string }>(company: T) => {
  const { password: _password, ...safeCompany } = company;
  return safeCompany;
};

export const registerCompanyService = async (data: RegisterCompanyInput) => {
  const existing = await repo.findCompanyByRegistration(data.registrationNo);

  if (existing) {
    throw new ApiError(409, "Company already exists");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  return repo.createCompany({
    ...data,
    password: hashedPassword,
  });
};

export const uploadDocsService = async (
  companyId: string,
  gstUrl: string,
  licenseUrl: string,
) => {
  return repo.updateCompanyDocs(companyId, gstUrl, licenseUrl);
};

export const verifyCompanyService = async (companyId: string) => {
  return repo.verifyCompany(companyId);
};

export const loginCompanyService = async (
  registrationNo: string,
  password: string
) => {
  const company = await repo.findCompanyByRegistration(registrationNo);

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  if (company.verification !== "VERIFIED") {
    throw new ApiError(403, "Company not verified");
  }

  const isPasswordValid = await bcrypt.compare(password, company.password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const token = generateToken({
    userId: company.companyId,
    companyId: company.companyId,
    actorType: "COMPANY",
  });

  return { 
    token, 
    company: sanitizeCompany(company)
  };
};
