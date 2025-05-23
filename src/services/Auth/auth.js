import { signInWithRedirect } from "@aws-amplify/auth/cognito";
import { getCurrentUser, fetchAuthSession, signOut } from "@aws-amplify/auth";

export const signIn = () => {
  return signInWithRedirect({ provider: "Cognito" });
};

export const logOut = () => {
  return signOut().then(() => {
    return null;
  });
};

export const getUser = async () => {
  try {
    const user = await getCurrentUser();
    const session = await fetchAuthSession();

    if (session.tokens) {
      const payload = session.tokens.idToken.payload;
      return {
        ...user,
        given_name: payload.given_name,
        family_name: payload.family_name,
      };
    }

    return user;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
};

export const getSession = () => {
  return fetchAuthSession();
};

export const validateUser = async () => {
  try {
    const session = await fetchAuthSession();
    
    // Check if session exists and tokens are valid
    if (!session.tokens || !session.tokens.accessToken) {
      // If no valid session, redirect to sign in
      signIn();
      return false;
    }
    
    // Check if tokens are expired
    const currentTime = Math.floor(Date.now() / 1000);
    const tokenExpiry = session.tokens.accessToken.payload.exp;
    
    if (currentTime >= tokenExpiry) {
      // Token expired, redirect to sign in
      signIn();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error validating user:", error);
    // If there's an error, assume user needs to re-authenticate
    signIn();
    return false;
  }
};
