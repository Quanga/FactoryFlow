import { useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  role: 'worker' | 'manager';
  department: string;
  photoUrl: string;
}

export interface LeaveBalance {
  type: string;
  total: number;
  taken: number;
  pending: number;
  available: number;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  documents?: string[];
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  timestamp: string;
  type: 'in' | 'out';
  photoUrl?: string;
}

// Mock Data
export const MOCK_USER: User = {
  id: '46',
  name: 'Theunis Scheepers',
  role: 'worker',
  department: 'Technical',
  photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
};

export const MOCK_BALANCES: LeaveBalance[] = [
  { type: 'Annual Leave', total: 21, taken: 5, pending: 0, available: 16 },
  { type: 'Sick Leave', total: 30, taken: 2, pending: 0, available: 28 },
  { type: 'Family Responsibility', total: 3, taken: 0, pending: 0, available: 3 },
  { type: 'Unpaid Leave', total: 0, taken: 0, pending: 0, available: 0 },
];

export const MOCK_REQUESTS: LeaveRequest[] = [
  {
    id: '1',
    userId: '46',
    type: 'Sick Leave',
    startDate: '2025-11-27',
    endDate: '2025-11-28',
    reason: 'Flu',
    status: 'approved',
    documents: ['medical_cert.pdf']
  },
  {
    id: '2',
    userId: '46',
    type: 'Annual Leave',
    startDate: '2025-12-15',
    endDate: '2025-12-20',
    reason: 'Holiday',
    status: 'pending'
  }
];

// Simple State Store (in-memory for prototype)
let attendanceLog: AttendanceRecord[] = [];

export const useStore = () => {
  const [user, setUser] = useState<User | null>(null);
  
  const login = (id: string) => {
    if (id === '46') {
      setUser(MOCK_USER);
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

  const recordAttendance = (type: 'in' | 'out', photoUrl?: string) => {
    const record: AttendanceRecord = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user?.id || '46',
      timestamp: new Date().toISOString(),
      type,
      photoUrl
    };
    attendanceLog.unshift(record);
    return record;
  };

  return {
    user,
    login,
    logout,
    balances: MOCK_BALANCES,
    requests: MOCK_REQUESTS,
    recordAttendance,
    attendanceLog
  };
};
