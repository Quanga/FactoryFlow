import type { User, LeaveBalance, LeaveRequest, AttendanceRecord, Setting, Department } from "@shared/schema";

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

export type FaceDescriptorUser = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  faceDescriptor: string;
};

// Face Recognition API
export const faceApi = {
  async getAllFaceDescriptors(includeAdmins: boolean = false): Promise<FaceDescriptorUser[]> {
    const url = includeAdmins 
      ? `${API_BASE}/users/face-descriptors?includeAdmins=true`
      : `${API_BASE}/users/face-descriptors`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch face descriptors");
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

// Department API
export const departmentApi = {
  async getAll(): Promise<Department[]> {
    const res = await fetch(`${API_BASE}/departments`);
    if (!res.ok) throw new Error("Failed to fetch departments");
    return res.json();
  },

  async getById(id: number): Promise<Department> {
    const res = await fetch(`${API_BASE}/departments/${id}`);
    if (!res.ok) throw new Error("Failed to fetch department");
    return res.json();
  },

  async create(department: { name: string; description?: string }): Promise<Department> {
    const res = await fetch(`${API_BASE}/departments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(department),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create department");
    }
    return res.json();
  },

  async update(id: number, department: { name?: string; description?: string }): Promise<Department> {
    const res = await fetch(`${API_BASE}/departments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(department),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to update department");
    }
    return res.json();
  },

  async delete(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/departments/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to delete department");
    }
  },
};
