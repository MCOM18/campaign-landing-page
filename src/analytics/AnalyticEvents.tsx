import { logger } from "@/lib/logger/logger";

export const AnalyticEvents = {
  svodPurchaseStarted: (planModel: any, userData: any) => {
    logger.info("[Analytics] svod_purchase_started", { planModel, userData })
  },
  svodPaymentMethodSelected: (planModel: any, userData: any, paymentMethod: string, sToken: string, upiAppName: string, geoLocation: any) => {
    logger.info("[Analytics] svod_payment_method_selected", { planModel, userData, paymentMethod, sToken, upiAppName, geoLocation })
  },
  svodPurchaseSuccess: (planModel: any, userData: any, paymentType: string, sToken: string, upiAppName: any) => {
    logger.info("[Analytics] svod_purchase_success", { planModel, userData, paymentType, sToken, upiAppName })
  },
  svodPurchaseFailure: (planModel: any, userData: any, paymentType: string, sToken: string, upiAppName: any, error: any) => {
    logger.error("[Analytics] svod_purchase_failure", { planModel, userData, paymentType, sToken, upiAppName, error })
  }
};

export default AnalyticEvents;
