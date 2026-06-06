import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (firebaseEnabled) {
      return onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser ? await dataService.getUser(firebaseUser.uid) : null);
        setLoading(false);
      });
    }
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) {
      setLoading(false);
      return undefined;
    }
    dataService.getUser(stored).then((profile) => {
      setUser(profile);
      setLoading(false);
    });
    return undefined;
  }, []);

  async function login(email, password) {
    let profile;
    if (firebaseEnabled) {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      profile = await dataService.getUser(credential.user.uid);
    } else {
      profile = await dataService.findUserByEmail(email);
      if (!profile || profile.password !== password) throw new Error("Invalid email or password.");
      if (profile.status === "suspended") throw new Error("This account is suspended.");
      localStorage.setItem(SESSION_KEY, profile.userId);
    }
    profile = await dataService.updateUser(profile.userId, { lastLogin: new Date().toISOString() });
    setUser(profile);
    return profile;
  }

  async function register(form) {
    let userId;
    if (firebaseEnabled) {
      const credential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      userId = credential.user.uid;
    } else {
      if (await dataService.findUserByEmail(form.email)) throw new Error("An account already exists for this email.");
      userId = `user-${Date.now()}`;
    }

    const profile = {
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
      password: firebaseEnabled ? undefined : form.password,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
    await dataService.saveUser(profile);
    if (!firebaseEnabled) localStorage.setItem(SESSION_KEY, userId);
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
    setUser(await dataService.getUser(user.userId));
  }

  const value = { user, loading, login, register, logout, resetPassword, refresh, firebaseEnabled };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
