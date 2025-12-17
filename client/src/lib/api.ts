import type { User, LeaveBalance, LeaveRequest, AttendanceRecord, Setting, Department, UserGroup, EmployeeType, LeaveRule, LeaveRulePhase, ContractHistory, Grievance, InsertGrievance } from "@shared/schema";

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

  async loginByFace(id: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/login-by-face`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error("Face login failed");
    return res.json();
  },
};

export type FaceDescriptorUser = {
  id: string;
  firstName: string;
  surname: string;
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
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || "Failed to create user");
    }
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

  async resendCredentials(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/users/${id}/resend-credentials`, {
      method: "POST",
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to send credentials email");
    }
    return res.json();
  },
};

// Leave Balance API
export const leaveBalanceApi = {
  async getByUserId(userId: string): Promise<LeaveBalance[]> {
    const res = await fetch(`${API_BASE}/leave-balances/${userId}`);
    if (!res.ok) throw new Error("Failed to fetch leave balances");
    return res.json();
  },

  async getAll(): Promise<LeaveBalance[]> {
    const res = await fetch(`${API_BASE}/leave-balances`);
    if (!res.ok) throw new Error("Failed to fetch leave balances");
    return res.json();
  },

  async create(balance: { userId: string; leaveType: string; total: number; taken?: number; pending?: number }): Promise<LeaveBalance> {
    const res = await fetch(`${API_BASE}/leave-balances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(balance),
    });
    if (!res.ok) throw new Error("Failed to create leave balance");
    return res.json();
  },

  async update(id: number, balance: Partial<LeaveBalance>): Promise<LeaveBalance> {
    const res = await fetch(`${API_BASE}/leave-balances/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(balance),
    });
    if (!res.ok) throw new Error("Failed to update leave balance");
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

  async updateStatus(id: number, status: string, adminNotes?: string): Promise<LeaveRequest> {
    const res = await fetch(`${API_BASE}/leave-requests/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNotes }),
    });
    if (!res.ok) throw new Error("Failed to update leave request");
    return res.json();
  },

  async cancel(id: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/leave-requests/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to cancel leave request");
    }
    return res.json();
  },

  async getByStatus(status: string | string[]): Promise<LeaveRequest[]> {
    const statusStr = Array.isArray(status) ? status.join(',') : status;
    const res = await fetch(`${API_BASE}/leave-requests/by-status/${statusStr}`);
    if (!res.ok) throw new Error("Failed to fetch leave requests by status");
    return res.json();
  },

  async managerDecision(id: number, approverId: string, decision: 'approved' | 'rejected', notes?: string): Promise<LeaveRequest> {
    const res = await fetch(`${API_BASE}/leave-requests/${id}/manager-decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approverId, decision, notes }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to process manager decision");
    }
    return res.json();
  },

  async hrDecision(id: number, approverId: string, decision: 'approved' | 'rejected', notes?: string): Promise<LeaveRequest> {
    const res = await fetch(`${API_BASE}/leave-requests/${id}/hr-decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approverId, decision, notes }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to process HR decision");
    }
    return res.json();
  },

  async mdDecision(id: number, approverId: string, decision: 'approved' | 'rejected', notes?: string, bypassHR?: boolean): Promise<LeaveRequest> {
    const res = await fetch(`${API_BASE}/leave-requests/${id}/md-decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approverId, decision, notes, bypassHR }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to process MD decision");
    }
    return res.json();
  },
};

// Attendance API
export const attendanceApi = {
  async getByUserId(userId: string, limit = 10, startDate?: string, endDate?: string): Promise<AttendanceRecord[]> {
    let url = `${API_BASE}/attendance/${userId}?limit=${limit}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch attendance records");
    return res.json();
  },

  async getAll(startDate?: string, endDate?: string): Promise<AttendanceRecord[]> {
    let url = `${API_BASE}/attendance`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch attendance records");
    return res.json();
  },

  async create(record: { 
    userId: string; 
    type: string; 
    photoUrl?: string | null;
    method?: string;
    context?: string;
  }): Promise<AttendanceRecord> {
    const res = await fetch(`${API_BASE}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const error = new Error(errorData.message || "Failed to create attendance record");
      (error as any).status = res.status;
      (error as any).code = errorData.error;
      throw error;
    }
    return res.json();
  },
};

// Password Reset API
export const passwordResetApi = {
  async requestReset(email: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/auth/request-reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || "Failed to send reset email");
    }
    return res.json();
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || "Failed to reset password");
    }
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

// User Group API
export const userGroupApi = {
  async getAll(): Promise<UserGroup[]> {
    const res = await fetch(`${API_BASE}/user-groups`);
    if (!res.ok) throw new Error("Failed to fetch user groups");
    return res.json();
  },

  async getById(id: number): Promise<UserGroup> {
    const res = await fetch(`${API_BASE}/user-groups/${id}`);
    if (!res.ok) throw new Error("Failed to fetch user group");
    return res.json();
  },

  async create(group: { name: string; description?: string }): Promise<UserGroup> {
    const res = await fetch(`${API_BASE}/user-groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(group),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create user group");
    }
    return res.json();
  },

  async update(id: number, group: { name?: string; description?: string }): Promise<UserGroup> {
    const res = await fetch(`${API_BASE}/user-groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(group),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to update user group");
    }
    return res.json();
  },

  async delete(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/user-groups/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to delete user group");
    }
  },
};

// Employee Type API
export const employeeTypeApi = {
  async getAll(): Promise<EmployeeType[]> {
    const res = await fetch(`${API_BASE}/employee-types`);
    if (!res.ok) throw new Error("Failed to fetch employee types");
    return res.json();
  },

  async getById(id: number): Promise<EmployeeType> {
    const res = await fetch(`${API_BASE}/employee-types/${id}`);
    if (!res.ok) throw new Error("Failed to fetch employee type");
    return res.json();
  },

  async create(type: { name: string; description?: string; leaveLabel?: string; hasLeaveEntitlement?: string; isDefault?: string }): Promise<EmployeeType> {
    const res = await fetch(`${API_BASE}/employee-types`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(type),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create employee type");
    }
    return res.json();
  },

  async update(id: number, type: Partial<EmployeeType>): Promise<EmployeeType> {
    const res = await fetch(`${API_BASE}/employee-types/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(type),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to update employee type");
    }
    return res.json();
  },

  async delete(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/employee-types/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to delete employee type");
    }
  },
};

// Leave Rule API
export const leaveRuleApi = {
  async getAll(): Promise<LeaveRule[]> {
    const res = await fetch(`${API_BASE}/leave-rules`);
    if (!res.ok) throw new Error("Failed to fetch leave rules");
    return res.json();
  },

  async getById(id: number): Promise<LeaveRule> {
    const res = await fetch(`${API_BASE}/leave-rules/${id}`);
    if (!res.ok) throw new Error("Failed to fetch leave rule");
    return res.json();
  },

  async create(rule: { name: string; leaveType: string; description?: string; employeeTypeId?: number; accrualType?: string; accrualRate?: string; daysEarned?: string; periodDaysWorked?: number; maxAccrual?: number; waitingPeriodDays?: number; cycleMonths?: number; notes?: string }): Promise<LeaveRule> {
    const res = await fetch(`${API_BASE}/leave-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rule),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create leave rule");
    }
    return res.json();
  },

  async update(id: number, rule: Partial<LeaveRule>): Promise<LeaveRule> {
    const res = await fetch(`${API_BASE}/leave-rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rule),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to update leave rule");
    }
    return res.json();
  },

  async delete(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/leave-rules/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to delete leave rule");
    }
  },
};

// Leave Rule Phase API
export const leaveRulePhaseApi = {
  async getByRuleId(ruleId: number): Promise<LeaveRulePhase[]> {
    const res = await fetch(`${API_BASE}/leave-rules/${ruleId}/phases`);
    if (!res.ok) throw new Error("Failed to fetch leave rule phases");
    return res.json();
  },

  async create(ruleId: number, phase: { phaseName: string; sequence: number; accrualType: string; daysEarned: string; periodDaysWorked?: number | null; startsAfterMonths?: number | null; startsAfterDaysWorked?: number | null; cycleMonths?: number | null; maxBalanceDays?: number | null; notes?: string | null }): Promise<LeaveRulePhase> {
    const res = await fetch(`${API_BASE}/leave-rules/${ruleId}/phases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(phase),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create leave rule phase");
    }
    return res.json();
  },

  async update(id: number, phase: Partial<LeaveRulePhase>): Promise<LeaveRulePhase> {
    const res = await fetch(`${API_BASE}/leave-rule-phases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(phase),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to update leave rule phase");
    }
    return res.json();
  },

  async delete(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/leave-rule-phases/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to delete leave rule phase");
    }
  },

  async deleteAll(ruleId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/leave-rules/${ruleId}/phases`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to delete leave rule phases");
    }
  },
};

// Contract History API
export const contractHistoryApi = {
  async getByUserId(userId: string): Promise<ContractHistory[]> {
    const res = await fetch(`${API_BASE}/users/${userId}/contract-history`);
    if (!res.ok) throw new Error("Failed to fetch contract history");
    return res.json();
  },

  async create(userId: string, history: { action: string; previousEmployeeTypeId?: number | null; newEmployeeTypeId?: number | null; previousEndDate?: string | null; newEndDate?: string | null; reason?: string | null; performedBy?: string | null }): Promise<ContractHistory> {
    const res = await fetch(`${API_BASE}/users/${userId}/contract-history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(history),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create contract history");
    }
    return res.json();
  },
};

// Grievance API
export const grievanceApi = {
  async getAll(): Promise<Grievance[]> {
    const res = await fetch(`${API_BASE}/grievances`);
    if (!res.ok) throw new Error("Failed to fetch grievances");
    return res.json();
  },

  async getByUserId(userId: string): Promise<Grievance[]> {
    const res = await fetch(`${API_BASE}/grievances?userId=${userId}`);
    if (!res.ok) throw new Error("Failed to fetch grievances");
    return res.json();
  },

  async getById(id: number): Promise<Grievance> {
    const res = await fetch(`${API_BASE}/grievances/${id}`);
    if (!res.ok) throw new Error("Failed to fetch grievance");
    return res.json();
  },

  async create(grievance: InsertGrievance): Promise<Grievance> {
    const res = await fetch(`${API_BASE}/grievances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(grievance),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create grievance");
    }
    return res.json();
  },

  async update(id: number, grievance: Partial<InsertGrievance>): Promise<Grievance> {
    const res = await fetch(`${API_BASE}/grievances/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(grievance),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to update grievance");
    }
    return res.json();
  },

  async updateStatus(id: number, status: string, adminNotes?: string, resolution?: string): Promise<Grievance> {
    const res = await fetch(`${API_BASE}/grievances/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNotes, resolution }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to update grievance status");
    }
    return res.json();
  },
};
