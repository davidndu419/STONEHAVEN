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
import { db, firebaseEnabled } from "./firebase";
import {
  seedCoins, seedDeposits, seedFlashSettings, seedFlashTiers, seedInvestments, seedMethods,
  seedNotifications, seedStocks, seedTransactions, seedUsers, seedWithdrawals,
  seedAnnouncements, seedCompanyContent, seedFaqs, seedKycSubmissions, seedLegalDocuments,
  seedPlatformSettings, seedSupportTickets, seedTeamMembers, seedTestimonials,
} from "../data/demo";

const KEY = "stonehaven-demo-db-v1";
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

async function listFirebase(name, filters = []) {
  const ref = collection(db, name);
  const q = filters.length ? query(ref, ...filters.map(([field, value]) => where(field, "==", value))) : ref;
  const result = await getDocs(q);
  return result.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export const dataService = {
  async getUser(userId) {
    if (firebaseEnabled) {
      const snap = await getDoc(doc(db, "users", userId));
      return snap.exists() ? { userId: snap.id, ...snap.data() } : null;
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
    if (firebaseEnabled) {
      await setDoc(doc(db, "users", user.userId), { ...user, createdAt: serverTimestamp(), lastLogin: serverTimestamp() });
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
    if (firebaseEnabled) {
      await updateDoc(doc(db, "users", userId), changes);
    } else {
      const data = readLocal();
      data.users = data.users.map((user) => (user.userId === userId ? { ...user, ...changes } : user));
      writeLocal(data);
    }
    return this.getUser(userId);
  },

  async listUsers(adminId, all = false) {
    if (firebaseEnabled) return listFirebase("users", all ? [] : [["adminId", adminId]]);
    return readLocal().users.filter((user) => all || user.adminId === adminId);
  },

  async removeUser(userId) {
    if (firebaseEnabled) await deleteDoc(doc(db, "users", userId));
    else {
      const data = readLocal();
      data.users = data.users.filter((user) => user.userId !== userId);
      writeLocal(data);
    }
  },

  async list(name, adminId, all = false) {
    if (firebaseEnabled) return listFirebase(name, all ? [] : [["adminId", adminId]]);
    return (readLocal()[name] || []).filter((item) => all || item.adminId === adminId);
  },

  async listForUser(name, userId) {
    if (firebaseEnabled) return listFirebase(name, [["userId", userId]]);
    return (readLocal()[name] || []).filter((item) => item.userId === userId);
  },

  async create(name, payload) {
    const item = serializable(payload);
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
    if (firebaseEnabled) await updateDoc(doc(db, name, itemId), changes);
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
