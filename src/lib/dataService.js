import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db, firebaseEnabled, auth } from "./firebase";
import { assertRecoveryAllowed, buildRecoveredUserProfile } from "./recoveryProfile";
import {
  seedCoins, seedDeposits, seedFlashSettings, seedFlashTiers, seedInvestments, seedMethods,
  seedNotifications, seedStocks, seedTransactions, seedUsers, seedWithdrawals,
  seedAnnouncements, seedCompanyContent, seedFaqs, seedKycSubmissions, seedLegalDocuments,
  seedPlatformSettings, seedSupportTickets, seedTeamMembers, seedTestimonials,
} from "../data/demo";

const KEY = "stonehaven-demo-db-v1";
const LEGACY_DEMO_PASSWORD_HASH = "d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791";
const clone = (value) => JSON.parse(JSON.stringify(value));

function initializeLocal() {
  const existing = localStorage.getItem(KEY);
  const initial = {
    users: clone(seedUsers),
    depositMethods: clone(seedMethods),
    deposits: clone(seedDeposits),
    withdrawals: clone(seedWithdrawals),
    transactions: clone(seedTransactions),
    flashSettings: clone(seedFlashSettings),
    flashTiers: clone(seedFlashTiers),
    coins: clone(seedCoins),
    stocks: clone(seedStocks),
    investments: clone(seedInvestments),
    notifications: clone(seedNotifications),
    platformSettings: clone(seedPlatformSettings),
    announcements: clone(seedAnnouncements),
    kycSubmissions: clone(seedKycSubmissions),
    supportTickets: clone(seedSupportTickets),
    adminNotes: [],
    adminAuditRecords: [],
    testimonials: clone(seedTestimonials),
    companyContent: clone(seedCompanyContent),
    teamMembers: clone(seedTeamMembers),
    faqs: clone(seedFaqs),
    legalDocuments: clone(seedLegalDocuments),
  };
  if (existing) {
    const current = JSON.parse(existing);
    let changed = false;
    Object.entries(initial).forEach(([name, values]) => {
      if (!Array.isArray(current[name])) {
        current[name] = values;
        changed = true;
      }
    });
    current.users = current.users.map((user) => {
      if (!Object.hasOwn(user, "password")) return user;
      changed = true;
      const safeUser = { ...user };
      delete safeUser.password;
      return {
        ...safeUser,
        passwordHash: safeUser.passwordHash || LEGACY_DEMO_PASSWORD_HASH,
      };
    });
    if (changed) localStorage.setItem(KEY, JSON.stringify(current));
    return current;
  }
  localStorage.setItem(KEY, JSON.stringify(initial));
  return initial;
}

function readLocal() {
  return initializeLocal();
}

function writeLocal(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

const id = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const now = () => new Date().toISOString();
const serializable = (data) => ({ ...data, createdAt: data.createdAt || now() });
const cleanPayload = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  const clean = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      clean[key] = obj[key];
    }
  });
  return clean;
};
const normalizeTimestamps = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === "object" && typeof value.toDate === "function") {
      out[key] = value.toDate().toISOString();
    } else {
      out[key] = value;
    }
  }
  return out;
};

async function listFirebase(name, filters = []) {
  try {
    const ref = collection(db, name);
    const q = filters.length ? query(ref, ...filters.map(([field, value]) => where(field, "==", value))) : ref;
    const result = await getDocs(q);
    return result.docs.map((item) => normalizeTimestamps({ id: item.id, ...item.data() }));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(`[Firestore Dev Log] Query failed on collection "${name}" with filters:`, JSON.stringify(filters), error);
    }
    throw error;
  }
}

export const dataService = {
  async listPublic(name) {
    if (firebaseEnabled) {
      return listFirebase(name, [["active", true]]);
    }
    return (readLocal()[name] || []).filter((item) => item.active === true);
  },

  async bootstrapAuthProfile(firebaseUser) {
    if (!firebaseEnabled) return null;
    const controlSnap = await getDoc(doc(db, "accountControls", firebaseUser.uid));
    assertRecoveryAllowed(controlSnap.exists() ? controlSnap.data() : null);
    const timestamp = serverTimestamp();
    const profile = buildRecoveredUserProfile({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.displayName,
      timestamp,
    });
    await setDoc(doc(db, "users", firebaseUser.uid), profile);
    return { ...profile, createdAt: new Date().toISOString(), lastLogin: new Date().toISOString() };
  },

  async provisionPublicProfile(firebaseUser, form) {
    await this.bootstrapAuthProfile(firebaseUser);
    await this.updateUser(firebaseUser.uid, {
      name: String(form.name || "").trim().slice(0, 120),
      phone: String(form.phone || "").trim().slice(0, 40),
      country: String(form.country || "").trim().slice(0, 80),
    });
    return this.getUser(firebaseUser.uid);
  },

  async getUser(userId) {
    if (firebaseEnabled) {
      let targetUid = userId;
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdTokenResult();
          if (token.claims.role === "user" || !token.claims.role) {
            targetUid = auth.currentUser.uid;
          }
        } catch {
          targetUid = auth.currentUser.uid;
        }
      }
      const snap = await getDoc(doc(db, "users", targetUid));
      return snap.exists() ? normalizeTimestamps({ userId: snap.id, ...snap.data() }) : null;
    }
    return readLocal().users.find((user) => user.userId === userId) || null;
  },

  async findUserByEmail(email) {
    if (firebaseEnabled) {
      const users = await listFirebase("users", [["email", email.toLowerCase()]]);
      return users[0] || null;
    }
    return readLocal().users.find((user) => user.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async saveUser(user) {
    const cleanUser = cleanPayload(user);
    if (firebaseEnabled) {
      await setDoc(doc(db, "users", user.userId), { ...cleanUser, createdAt: serverTimestamp(), lastLogin: serverTimestamp() });
      return user;
    }
    const data = readLocal();
    const index = data.users.findIndex((item) => item.userId === user.userId);
    if (index >= 0) data.users[index] = { ...data.users[index], ...user };
    else data.users.push(serializable(user));
    writeLocal(data);
    return user;
  },

  async updateUser(userId, changes) {
    const cleanChanges = cleanPayload(changes);
    if (firebaseEnabled) {
      await updateDoc(doc(db, "users", userId), cleanChanges);
    } else {
      const data = readLocal();
      data.users = data.users.map((user) => (user.userId === userId ? { ...user, ...changes } : user));
      writeLocal(data);
    }
    return this.getUser(userId);
  },

  async listUsers(adminId, all = false) {
    if (firebaseEnabled) {
      let isUser = true;
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdTokenResult();
          if (token.claims.role === "superadmin" || token.claims.role === "sub-admin") {
            isUser = false;
          }
        } catch {
          // ignore
        }
      }
      if (isUser) {
        if (import.meta.env.DEV) {
          console.warn("listUsers called by a non-admin user. Returning empty array defensively to prevent crash.");
        }
        return [];
      }
      return listFirebase("users", all ? [] : [["adminId", adminId]]);
    }
    return readLocal().users.filter((user) => all || user.adminId === adminId);
  },

  async removeUser(userId) {
    if (firebaseEnabled) {
      throw new Error("Firebase user lifecycle changes are owner-managed. Use the local Admin SDK script.");
    }
    return this.updateUser(userId, {
      status: "deleted",
      disabledAt: now(),
      disabledBy: "local-demo",
      disabledReason: "Soft deleted in local demo mode",
    });
  },

  async list(name, adminId, all = false) {
    if (firebaseEnabled) {
      const filters = [];
      if (!all) {
        filters.push(["adminId", adminId]);
      }
      
      let isUser = true;
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdTokenResult();
          if (token.claims.role === "superadmin" || token.claims.role === "sub-admin") {
            isUser = false;
          }
        } catch {
          // ignore
        }
      }

      if (isUser) {
        if (["coins", "stocks", "flashSettings", "flashTiers", "flashPlans", "depositMethods"].includes(name)) {
          filters.push(["active", true]);
        }
        if (name === "announcements") {
          filters.push(["status", "published"]);
        }
      }
      return listFirebase(name, filters);
    }
    
    let result = readLocal()[name] || [];
    if (!all) {
      result = result.filter((item) => item.adminId === adminId);
    }
    if (["coins", "stocks", "flashSettings", "flashTiers", "flashPlans", "depositMethods"].includes(name)) {
      result = result.filter((item) => item.active === true);
    }
    if (name === "announcements") {
      result = result.filter((item) => item.status === "published");
    }
    return result;
  },

  async listForUser(name, userId) {
    if (firebaseEnabled) {
      let targetUid = userId;
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdTokenResult();
          if (token.claims.role === "user" || !token.claims.role) {
            targetUid = auth.currentUser.uid;
          }
        } catch {
          targetUid = auth.currentUser.uid;
        }
      }
      return listFirebase(name, [["userId", targetUid]]);
    }
    return (readLocal()[name] || []).filter((item) => item.userId === userId);
  },

  async create(name, payload) {
    const clean = cleanPayload(payload);
    const item = serializable(clean);
    if (firebaseEnabled) {
      const result = await addDoc(collection(db, name), { ...item, createdAt: serverTimestamp() });
      return { id: result.id, ...item };
    }
    const data = readLocal();
    const created = { id: id(name.slice(0, 3)), ...item };
    data[name] = [...(data[name] || []), created];
    writeLocal(data);
    return created;
  },

  async update(name, itemId, changes) {
    const cleanChanges = cleanPayload(changes);
    if (firebaseEnabled) await updateDoc(doc(db, name, itemId), cleanChanges);
    else {
      const data = readLocal();
      data[name] = (data[name] || []).map((item) => (item.id === itemId ? { ...item, ...changes } : item));
      writeLocal(data);
    }
  },

  async remove(name, itemId) {
    if (firebaseEnabled) await deleteDoc(doc(db, name, itemId));
    else {
      const data = readLocal();
      data[name] = (data[name] || []).filter((item) => item.id !== itemId);
      writeLocal(data);
    }
  },

  async log(payload) {
    return this.create("transactions", payload);
  },
};
