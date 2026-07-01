import { RecaptchaAction } from "./recaptcha.types";

export async function executeRecaptcha(action: RecaptchaAction): Promise<string> {
  // console.log(`[reCAPTCHA Mock Client] Executing action: ${action}`);
  return "mock-recaptcha-token";
}
