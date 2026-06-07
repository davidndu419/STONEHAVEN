import { dataService } from "./dataService";

export async function getPlatformSettings() {
  const items = await dataService.list("platformSettings", "GLOBAL", true);
  return items.find((item) => item.key === "platform") || {
    adminId: "GLOBAL", key: "platform", kycRequired: true,
    withdrawalLimitEnabled: true, unverifiedWithdrawalLimit: 500,
    referralBonuses: { 200: 20, 300: 30, 400: 40, 500: 50, 600: 60, 700: 70, 800: 80, 1000: 100 },
    testimonialEnabled: true, testimonialMinInterval: 8, testimonialMaxInterval: 15,
  };
}

export async function savePlatformSettings(settings, changes) {
  if (settings.id) {
    await dataService.update("platformSettings", settings.id, changes);
    return { ...settings, ...changes };
  }
  return dataService.create("platformSettings", { ...settings, ...changes, adminId: "GLOBAL", key: "platform" });
}

export async function createNotification({ userId, adminId, type, title, message, announcementId = "" }) {
  return dataService.create("notifications", {
    userId, adminId, type, title, message, announcementId, read: false, dismissed: false,
  });
}

export async function publishAnnouncement(announcement) {
  const users = await dataService.listUsers(announcement.adminId, announcement.audience === "all");
  const recipients = announcement.audience === "individual"
    ? users.filter((user) => user.userId === announcement.userId)
    : users.filter((user) => user.role === "user");
  await Promise.all(recipients.map((user) => createNotification({
    userId: user.userId, adminId: user.adminId, type: "announcement",
    title: announcement.title, message: announcement.message, announcementId: announcement.id,
  })));
}

export function ticketId() {
  return `TKT-${String(Date.now()).slice(-6)}`;
}

export async function notifySupportReply(ticket, senderRole) {
  if (senderRole === "user") return;
  await createNotification({
    userId: ticket.userId, adminId: ticket.adminId, type: "support",
    title: `New reply on ${ticket.ticketId}`, message: "Your Stonehaven support team replied to your ticket.",
  });
}
