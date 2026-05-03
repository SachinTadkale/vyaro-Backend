/**
 * Module: Company Auth.types
 * Purpose: Implements the Company Auth.types module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
export interface RegisterCompanyInput {
  companyName: string;
  registrationNo: string;
  hqLocation: string;
  gstNumber: string;
  email: string;
  password: string;
}

export interface CompanyPasswordLoginInput {
  registrationNo: string;
  password: string;
}
