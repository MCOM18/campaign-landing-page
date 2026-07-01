export type RecaptchaAction = "LOGIN" | "REGISTER" | "SUBMIT";

export interface RecaptchaVerifyRequest {
  token: string;
  action: RecaptchaAction;
}

export interface RecaptchaVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
}
