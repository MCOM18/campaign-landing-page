export const AnalyticEvents = {
  svodPurchaseStarted: (planModel: any, userData: any) => {
    console.log("[Analytics] svod_purchase_started", { planModel, userData });
  },
  svodPaymentMethodSelected: (planModel: any, userData: any, paymentMethod: string, sToken: string, upiAppName: string, geoLocation: any) => {
    console.log("[Analytics] svod_payment_method_selected", { planModel, userData, paymentMethod, sToken, upiAppName, geoLocation });
  },
  svodPurchaseSuccess: (planModel: any, userData: any, paymentType: string, sToken: string, upiAppName: any) => {
    console.log("[Analytics] svod_purchase_success", { planModel, userData, paymentType, sToken, upiAppName });
  },
  svodPurchaseFailure: (planModel: any, userData: any, paymentType: string, sToken: string, upiAppName: any, error: any) => {
    console.error("[Analytics] svod_purchase_failure", { planModel, userData, paymentType, sToken, upiAppName, error });
  }
};

export default AnalyticEvents;
