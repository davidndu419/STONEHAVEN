import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getIdTokenResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, firebaseEnabled } from "../lib/firebase";
import { dataService } from "../lib/dataService";

const AuthContext = createContext(null);
const SESSION_KEY = "stonehaven-session";

function referralCode(name) {
  return `${name.replace(/[^a-z]/gi, "").slice(0, 6).toUpperCase()}${Math.floor(10 + Math.random() * 89)}`;
}

async function passwordDigest(password) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function authenticatedProfile(firebaseUser, forceRefresh = false) {
  const token = await getIdTokenResult(firebaseUser, forceRefresh);
  let profile = await dataService.getUser(firebaseUser.uid);
  if (!profile) {
    await dataService.bootstrapAuthProfile(firebaseUser);
    profile = await dataService.getUser(firebaseUser.uid);
  }
  if (!profile) throw new Error("Your secure profile could not be recovered. Please contact support.");
  const role = ["superadmin", "sub-admin", "user"].includes(token.claims.role)
    ? token.claims.role
    : "user";
  const adminId = typeof token.claims.adminId === "string" ? token.claims.adminId : profile.adminId;
  return {
    ...profile,
    role,
    adminId,
    mfaRequired: Boolean(token.claims.mfaRequired || role !== "user"),
    mfaVerified: Boolean(token.claims.firebase?.sign_in_second_factor),
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (firebaseEnabled) {
      return onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          setUser(firebaseUser ? await authenticatedProfile(firebaseUser) : null);
        } catch {
          setUser(null);
        } finally {
          setLoading(false);
        }
      });
    }
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) {
      setLoading(false);
      return undefined;
    }
    dataService.getUser(stored).then(setUser).finally(() => setLoading(false));
    return undefined;
  }, []);

  async function login(email, password) {
    let profile;
    if (firebaseEnabled) {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      profile = await authenticatedProfile(credential.user, true);
    } else {
      profile = await dataService.findUserByEmail(email);
      const digest = await passwordDigest(password);
      if (!profile || profile.passwordHash !== digest) {
        throw new Error("Invalid email or password.");
      }
      if (profile.status === "suspended") throw new Error("This account is suspended.");
      localStorage.setItem(SESSION_KEY, profile.userId);
    }
    if (!profile) throw new Error("Your secure profile has not been provisioned.");
    await dataService.updateUser(profile.userId, { lastLogin: new Date().toISOString() });
    profile = firebaseEnabled
      ? await authenticatedProfile(auth.currentUser)
      : await dataService.getUser(profile.userId);
    setUser(profile);
    return profile;
  }

  async function register(form) {
    let profile;
    if (firebaseEnabled) {
      const credential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      try {
        if (form.invitationToken) {
          throw new Error(
            "Administrator invitations are unavailable on the Spark plan. The project owner must provision administrators manually.",
          );
        }
        await dataService.provisionPublicProfile(credential.user, form);
        profile = await authenticatedProfile(credential.user, true);
      } catch (error) {
        await deleteUser(credential.user).catch(() => {});
        throw error;
      }
    } else {
      if (await dataService.findUserByEmail(form.email)) throw new Error("An account already exists for this email.");
      const userId = `user-${Date.now()}`;
      profile = {
        userId,
        name: form.name,
        email: form.email.toLowerCase(),
        phone: form.phone,
        country: form.country,
        role: "user",
        adminId: form.adminId || "HERITAGE-HQ",
        referralCode: referralCode(form.name),
        referredBy: form.referralCode || "",
        availableBalance: 0,
        referralBalance: 0,
        lockedBalance: 0,
        kycStatus: "unverified",
        status: "active",
        onboarded: false,
        passwordHash: await passwordDigest(form.password),
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };
      await dataService.saveUser(profile);
      localStorage.setItem(SESSION_KEY, userId);
    }
    setUser(profile);
    return profile;
  }

  async function logout() {
    if (firebaseEnabled) await signOut(auth);
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  async function resetPassword(email) {
    if (firebaseEnabled) return sendPasswordResetEmail(auth, email);
    if (!(await dataService.findUserByEmail(email))) throw new Error("No account was found for that email.");
    return true;
  }

  async function refresh() {
    if (!user) return;
    setUser(firebaseEnabled && auth.currentUser
      ? await authenticatedProfile(auth.currentUser, true)
      : await dataService.getUser(user.userId));
  }

  const value = { user, loading, login, register, logout, resetPassword, refresh, firebaseEnabled };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
