"use client";

import { useState, useEffect, useCallback } from "react";
import { useRole } from "./RoleContext";
import Link from "next/link";

interface Notification {
  id: string;
  itemId: string;
  itemTitle: string;
  itemPrice: number;
  distanceKm: number;
  priority: "high" | "medium" | "low";
  message: string;
  read: boolean;
  timestamp: string;
}

const PRIORITY_STYLES = {
  high: "border-red-500/30 bg-red-500/5",
  medium: "border-amber-500/30 bg-amber-500/5",
  low: "border-neutral-700 bg-neutral-800/50",
};

export default function NotificationBell() {
  const { role, activeBuyer } = useRole();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!activeBuyer || role !== "buyer") {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const res = await fetch(`/api/notifications?buyerId=${activeBuyer.id}`);
      const json = await res.json();
      setNotifications(json.notifications ?? []);
      setUnreadCount(json.unreadCount ?? 0);
    } catch {
      // ignore
    }
  }, [activeBuyer, role]);

  useEffect(() => {
    fetchNotifications();
    // Poll every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    if (!activeBuyer) return;
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markAllRead", buyerId: activeBuyer.id }),
    });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Only show for buyers
  if (role !== "buyer") return null;

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open && unreadCount > 0) markAllRead(); }}
        className="relative rounded-lg border border-neutral-800 px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-amber-500/30 hover:text-[var(--text-primary)]"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border border-neutral-800 bg-[#1a1a1a] shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Notifications
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              ✕
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <div className="p-6 text-center text-xs text-[var(--text-secondary)]">
                No notifications yet. Items matching your wishlist will appear here.
              </div>
            )}

            {notifications.map((notif) => (
              <Link
                key={notif.id}
                href={`/shop/${notif.itemId}`}
                onClick={() => setOpen(false)}
                className={`block border-b border-neutral-800/50 px-4 py-3 hover:bg-neutral-800/30 transition-colors ${
                  !notif.read ? "bg-neutral-800/20" : ""
                }`}
              >
                <div className={`rounded-lg border p-2.5 ${PRIORITY_STYLES[notif.priority]}`}>
                  <p className="text-xs text-[var(--text-primary)]">{notif.message}</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      {new Date(notif.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-[10px] font-medium text-amber-400">View →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
