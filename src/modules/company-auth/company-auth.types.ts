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
