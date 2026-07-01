export const getUserGeoLocation = () => {
  try {
    if (typeof window === "undefined") return {};

    // Check the new Next.js app geo cache first
    const newGeoRaw = localStorage.getItem("ott_geo_cache");
    if (newGeoRaw) {
      const parsed = JSON.parse(newGeoRaw);
      if (parsed && parsed.geoData) {
        return {
          city: parsed.geoData.city || null,
          region: parsed.geoData.region || null,
          country_code: parsed.geoData.country_code || null,
          lat: parsed.geoData.latitude || parsed.geoData.lat || null,
          lng: parsed.geoData.longitude || parsed.geoData.lng || parsed.geoData.lon || null,
        };
      }
    }

    // Fallback to legacy key if present
    const rawGeo = localStorage.getItem("geoLocationData");
    const geoData = rawGeo ? JSON.parse(rawGeo) : null;

    const city = geoData?.data?.city || null;
    const region = geoData?.data?.region || null;
    const country_code = geoData?.data?.country_code || null;
    const lat = geoData?.data?.latitude || geoData?.data?.lat || null;
    const lng = geoData?.data?.longitude || geoData?.data?.lng || geoData?.data?.lon || null;

    return {
      city,
      region,
      country_code,
      lat,
      lng,
    };
  } catch (error) {
    return {};
  }
};

export const getUserSubscription = () => {
  try {
    if (typeof window === "undefined") return null;
    const rawSub = localStorage.getItem("subscriptionData");
    const subscription = rawSub ? JSON.parse(rawSub) : null;
    return subscription;
  } catch (error) {
    return null;
  }
};

export const getUserAuthData = () => {
  try {
    if (typeof window === "undefined") return {};
    const user_id = localStorage.getItem("user_id") || null;
    const session_id = localStorage.getItem("session_id") || null;

    let phone = null;
    let phone_code = null;
    let fullPhone = null;
    let email = null;

    const rawUserData = localStorage.getItem("userData");
    if (rawUserData) {
      const parsedUserData = JSON.parse(rawUserData);
      phone = parsedUserData?.phone || null;
      phone_code = parsedUserData?.phone_code || null;
      email = parsedUserData?.email || null;
    }

    if (phone && phone_code) {
      fullPhone = `${phone_code}${phone}`;
    }

    return {
      user_id,
      session_id,
      phone,
      phone_code,
      fullPhone,
      email,
    };
  } catch (error) {
    return {};
  }
};

export const getUserProfiles = () => {
  try {
    if (typeof window === "undefined") return {};
    const rawProfile = localStorage.getItem("profile");
    const profile = rawProfile ? JSON.parse(rawProfile) : null;

    const rawProfiles = localStorage.getItem("persist:profile");
    const parsedProfiles = rawProfiles ? JSON.parse(rawProfiles) : {};

    let profilesList = [];
    if (parsedProfiles && typeof parsedProfiles === 'object' && parsedProfiles.profiles) {
      try {
        profilesList = JSON.parse(parsedProfiles.profiles);
      } catch { }
    }

    const rawSelectedProfile = localStorage.getItem("selectedProfile");
    const selectedProfile = rawSelectedProfile ? JSON.parse(rawSelectedProfile) : null;

    return {
      profile,
      profiles: Array.isArray(profilesList) ? profilesList : [],
      selectedProfile,
    };
  } catch (error) {
    return {};
  }
};

export const getFullUserData = () => {
  return {
    ...getUserAuthData(),
    ...getUserProfiles(),
    subscription: getUserSubscription(),
    geoLocation: getUserGeoLocation(),
  };
};
