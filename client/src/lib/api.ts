import type { User, LeaveBalance, LeaveRequest, AttendanceRecord, Setting } from "@shared/schema";

const API_BASE = "/api";

// Auth API
export const authApi = {
  async loginWorker(id: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error("Login failed");
    return res.json();
  },

  async loginAdmin(email: string, password: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/admin-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Login failed");
    return res.json();
  },
};

// User API
export const userApi = {
  async getAll(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error("Failed to fetch users");
    return res.json();
  },

  async getById(id: string): Promise<User> {
    const res = await fetch(`${API_BASE}/users/${id}`);
    if (!res.ok) throw new Error("Failed to fetch user");
    return res.json();
  },

  async create(user: Partial<User>): Promise<User> {
    const res = await fetch(`${API_BASE}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    if (!res.ok) throw new Error("Failed to create user");
    return res.json();
  },

  async update(id: string, user: Partial<User>): Promise<User> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    if (!res.ok) throw new Error("Failed to update user");
    return res.json();
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete user");
  },
};

// Leave Balance API
export const leaveBalanceApi = {
  async getByUserId(userId: string): Promise<LeaveBalance[]> {
    const res = await fetch(`${API_BASE}/leave-balances/${userId}`);
    if (!res.ok) throw new Error("Failed to fetch leave balances");
    return res.json();
  },
};

// Leave Request API
export const leaveRequestApi = {
  async getAll(userId?: string): Promise<LeaveRequest[]> {
    const url = userId 
      ? `${API_BASE}/leave-requests?userId=${userId}` 
      : `${API_BASE}/leave-requests`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch leave requests");
    return res.json();
  },

  async create(request: Partial<LeaveRequest>): Promise<LeaveRequest> {
    const res = await fetch(`${API_BASE}/leave-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error("Failed to create leave request");
    return res.json();
  },

  async updateStatus(id: number, status: string): Promise<LeaveRequest> {
    const res = await fetch(`${API_BASE}/leave-requests/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update leave request");
    return res.json();
  },
};

// Attendance API
export const attendanceApi = {
  async getByUserId(userId: string, limit = 10): Promise<AttendanceRecord[]> {
    const res = await fetch(`${API_BASE}/attendance/${userId}?limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch attendance records");
    return res.json();
  },

  async create(record: { userId: string; type: string; photoUrl?: string }): Promise<AttendanceRecord> {
    const res = await fetch(`${API_BASE}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error("Failed to create attendance record");
    return res.json();
  },
};

// Settings API
export const settingsApi = {
  async get(key: string): Promise<Setting> {
    const res = await fetch(`${API_BASE}/settings/${key}`);
    if (!res.ok) throw new Error("Failed to fetch setting");
    return res.json();
  },

  async set(key: string, value: string): Promise<Setting> {
    const res = await fetch(`${API_BASE}/settings/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (!res.ok) throw new Error("Failed to update setting");
    return res.json();
  },
};
