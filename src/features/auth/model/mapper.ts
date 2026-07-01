import type {
  ApiResponse,
  CheckUserResponse,
  SendOtpResponse,
  VerifyOtpResponse,
  VerifySpecialUserResponse,
  GuestLoginResponse,
  User,
  Country,
} from "./types";

export function mapUser(apiUser: any): User {
  return {
    id: apiUser.user_id || apiUser.id || '',
    phone: apiUser.phone || '',
    name: apiUser.name || apiUser.fullName,
    email: apiUser.email,
    avatar: apiUser.avatar || apiUser.profilePicture,
    isGuest: apiUser.isGuest || false,
    createdAt: apiUser.createdAt || new Date().toISOString(),
  };
}

export function mapCheckUserResponse(apiResponse: ApiResponse<any>): CheckUserResponse {
  const data = apiResponse.data;

  return {
    is_exists: data?.is_exists || false,
    is_special_user: data?.is_special_user || false,
    operator_name: data?.operator_name || null,
  };
}

export function mapSendOtpResponse(apiResponse: ApiResponse<any>): SendOtpResponse {
  const data = apiResponse.data;

  return {
    otp_sent: data?.otp_sent || false,
  };
}

export function mapVerifyOtpResponse(apiResponse: ApiResponse<any>): VerifyOtpResponse {
  const data = apiResponse.data;

  return {
    session_id: data?.session_id || '',
    user_id: data?.user_id || '',
    email: data?.email,
    phone: data?.phone || '',
    phone_code: data?.phone_code || '',
  };
}

export function mapVerifySpecialUserResponse(
  apiResponse: ApiResponse<any>
): VerifySpecialUserResponse {
  const data = apiResponse.data;

  return {
    session_id: data?.session_id || '',
    user_id: data?.user_id || '',
    is_special_user: data?.is_special_user || false,
    operator_name: data?.operator_name || '',
  };
}

export function mapGuestLoginResponse(apiResponse: ApiResponse<any>): GuestLoginResponse {
  const data = apiResponse.data;

  return {
    session_id: data?.session_id || '',
  };
}

export function mapSocialLoginResponse(apiResponse: ApiResponse<any>): import("./types").SocialLoginResponse {
  const data = apiResponse.data;

  return {
    session_id: data.session_id || '',
    user_id: data.user_id || '',
    email: data.email,
    phone: data.phone,
  };
}

export function mapCountryList(apiResponse: ApiResponse<any>): Country[] {
  const data = apiResponse.data;
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item: any) => ({
    id: item.id,
    countryCode: item.countryCode || item.country_code || item.code || '',
    phoneCode: item.phoneCode || item.phone_code || '',
    countryName: item.countryName || item.country_name || item.name || '',
    flag: item.flag || undefined,
  }));
}
