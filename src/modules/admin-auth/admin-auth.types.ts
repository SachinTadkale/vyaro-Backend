export type AdminLoginInput = {
  email: string;
  password: string;
};

export type AdminLoginResult = {
  token: string;
};

export type AdminForgotPasswordInput = {
  email: string;
};

export type AdminResetPasswordInput = {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
};

export type AdminMessageResult = {
  message: string;
};
