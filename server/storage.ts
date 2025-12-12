import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq, and, desc, gte, lte } from "drizzle-orm";
import * as schema from "@shared/schema";
import type {
  User,
  InsertUser,
  LeaveBalance,
  InsertLeaveBalance,
  LeaveRequest,
  InsertLeaveRequest,
  AttendanceRecord,
  InsertAttendanceRecord,
  Setting,
  InsertSetting,
  Department,
  InsertDepartment,
  UserGroup,
  InsertUserGroup,
  EmployeeType,
  InsertEmployeeType,
  LeaveRule,
  InsertLeaveRule,
} from "@shared/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;

  // Leave balance operations
  getLeaveBalances(userId: string): Promise<LeaveBalance[]>;
  getAllLeaveBalances(): Promise<LeaveBalance[]>;
  createLeaveBalance(balance: InsertLeaveBalance): Promise<LeaveBalance>;
  updateLeaveBalance(id: number, balance: Partial<InsertLeaveBalance>): Promise<LeaveBalance | undefined>;

  // Leave request operations
  getLeaveRequests(userId?: string): Promise<LeaveRequest[]>;
  getLeaveRequest(id: number): Promise<LeaveRequest | undefined>;
  createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequestStatus(id: number, status: string): Promise<LeaveRequest | undefined>;
  
  // Attendance operations
  getAttendanceRecords(userId: string, limit?: number, startDate?: Date, endDate?: Date): Promise<AttendanceRecord[]>;
  getAllAttendanceRecords(startDate?: Date, endDate?: Date): Promise<AttendanceRecord[]>;
  getTodayLatestAttendance(userId: string): Promise<AttendanceRecord | undefined>;
  createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord>;
  
  // Settings operations
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(key: string, value: string): Promise<Setting>;

  // Department operations
  getAllDepartments(): Promise<Department[]>;
  getDepartment(id: number): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department | undefined>;
  deleteDepartment(id: number): Promise<boolean>;
  getUserCountByDepartment(departmentName: string): Promise<number>;

  // User Group operations
  getAllUserGroups(): Promise<UserGroup[]>;
  getUserGroup(id: number): Promise<UserGroup | undefined>;
  createUserGroup(group: InsertUserGroup): Promise<UserGroup>;
  updateUserGroup(id: number, group: Partial<InsertUserGroup>): Promise<UserGroup | undefined>;
  deleteUserGroup(id: number): Promise<boolean>;
  getUserCountByUserGroup(groupId: number): Promise<number>;

  // Employee Type operations
  getAllEmployeeTypes(): Promise<EmployeeType[]>;
  getEmployeeType(id: number): Promise<EmployeeType | undefined>;
  getDefaultEmployeeType(): Promise<EmployeeType | undefined>;
  createEmployeeType(type: InsertEmployeeType): Promise<EmployeeType>;
  updateEmployeeType(id: number, type: Partial<InsertEmployeeType>): Promise<EmployeeType | undefined>;
  deleteEmployeeType(id: number): Promise<boolean>;

  // Leave Rule operations
  getAllLeaveRules(): Promise<LeaveRule[]>;
  getLeaveRule(id: number): Promise<LeaveRule | undefined>;
  createLeaveRule(rule: InsertLeaveRule): Promise<LeaveRule>;
  updateLeaveRule(id: number, rule: Partial<InsertLeaveRule>): Promise<LeaveRule | undefined>;
  deleteLeaveRule(id: number): Promise<boolean>;
}

export class DrizzleStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const users = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return users[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const users = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return users[0];
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(schema.users);
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(schema.users).values(user).returning();
    
    // Create default leave balances for new users
    if (user.role === 'worker') {
      await this.createLeaveBalance({
        userId: newUser.id,
        leaveType: 'Annual Leave',
        total: 21,
        taken: 0,
        pending: 0,
      });
      await this.createLeaveBalance({
        userId: newUser.id,
        leaveType: 'Sick Leave',
        total: 30,
        taken: 0,
        pending: 0,
      });
      await this.createLeaveBalance({
        userId: newUser.id,
        leaveType: 'Family Responsibility',
        total: 3,
        taken: 0,
        pending: 0,
      });
    }
    
    return newUser;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(schema.users)
      .set(user)
      .where(eq(schema.users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(schema.users).where(eq(schema.users.id, id));
  }

  // Leave balance operations
  async getLeaveBalances(userId: string): Promise<LeaveBalance[]> {
    return db
      .select()
      .from(schema.leaveBalances)
      .where(eq(schema.leaveBalances.userId, userId));
  }

  async getAllLeaveBalances(): Promise<LeaveBalance[]> {
    return db.select().from(schema.leaveBalances);
  }

  async createLeaveBalance(balance: InsertLeaveBalance): Promise<LeaveBalance> {
    const [newBalance] = await db.insert(schema.leaveBalances).values(balance).returning();
    return newBalance;
  }

  async updateLeaveBalance(id: number, balance: Partial<InsertLeaveBalance>): Promise<LeaveBalance | undefined> {
    const [updatedBalance] = await db
      .update(schema.leaveBalances)
      .set(balance)
      .where(eq(schema.leaveBalances.id, id))
      .returning();
    return updatedBalance;
  }

  // Leave request operations
  async getLeaveRequests(userId?: string): Promise<LeaveRequest[]> {
    if (userId) {
      return db
        .select()
        .from(schema.leaveRequests)
        .where(eq(schema.leaveRequests.userId, userId))
        .orderBy(desc(schema.leaveRequests.createdAt));
    }
    return db
      .select()
      .from(schema.leaveRequests)
      .orderBy(desc(schema.leaveRequests.createdAt));
  }

  async getLeaveRequest(id: number): Promise<LeaveRequest | undefined> {
    const requests = await db
      .select()
      .from(schema.leaveRequests)
      .where(eq(schema.leaveRequests.id, id));
    return requests[0];
  }

  async createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest> {
    const [newRequest] = await db.insert(schema.leaveRequests).values(request).returning();
    return newRequest;
  }

  async updateLeaveRequestStatus(id: number, status: string): Promise<LeaveRequest | undefined> {
    const [updatedRequest] = await db
      .update(schema.leaveRequests)
      .set({ status, updatedAt: new Date() })
      .where(eq(schema.leaveRequests.id, id))
      .returning();
    return updatedRequest;
  }

  // Attendance operations
  async getAttendanceRecords(userId: string, limit = 10, startDate?: Date, endDate?: Date): Promise<AttendanceRecord[]> {
    const conditions = [eq(schema.attendanceRecords.userId, userId)];
    if (startDate) conditions.push(gte(schema.attendanceRecords.timestamp, startDate));
    if (endDate) conditions.push(lte(schema.attendanceRecords.timestamp, endDate));
    
    return db
      .select()
      .from(schema.attendanceRecords)
      .where(and(...conditions))
      .orderBy(desc(schema.attendanceRecords.timestamp))
      .limit(limit);
  }

  async getAllAttendanceRecords(startDate?: Date, endDate?: Date): Promise<AttendanceRecord[]> {
    if (startDate && endDate) {
      return db
        .select()
        .from(schema.attendanceRecords)
        .where(and(
          gte(schema.attendanceRecords.timestamp, startDate),
          lte(schema.attendanceRecords.timestamp, endDate)
        ))
        .orderBy(desc(schema.attendanceRecords.timestamp));
    }
    return db
      .select()
      .from(schema.attendanceRecords)
      .orderBy(desc(schema.attendanceRecords.timestamp));
  }

  async getTodayLatestAttendance(userId: string): Promise<AttendanceRecord | undefined> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const records = await db
      .select()
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.userId, userId),
          eq(schema.attendanceRecords.context, 'attendance'),
          gte(schema.attendanceRecords.timestamp, startOfDay),
          lte(schema.attendanceRecords.timestamp, endOfDay)
        )
      )
      .orderBy(desc(schema.attendanceRecords.timestamp))
      .limit(1);
    
    return records[0];
  }

  async createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord> {
    const [newRecord] = await db.insert(schema.attendanceRecords).values(record).returning();
    return newRecord;
  }

  // Settings operations
  async getSetting(key: string): Promise<Setting | undefined> {
    const settings = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, key));
    return settings[0];
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    const existing = await this.getSetting(key);
    
    if (existing) {
      const [updated] = await db
        .update(schema.settings)
        .set({ value })
        .where(eq(schema.settings.key, key))
        .returning();
      return updated;
    }
    
    const [newSetting] = await db
      .insert(schema.settings)
      .values({ key, value })
      .returning();
    return newSetting;
  }

  // Department operations
  async getAllDepartments(): Promise<Department[]> {
    return db.select().from(schema.departments).orderBy(schema.departments.name);
  }

  async getDepartment(id: number): Promise<Department | undefined> {
    const departments = await db
      .select()
      .from(schema.departments)
      .where(eq(schema.departments.id, id));
    return departments[0];
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const [newDepartment] = await db
      .insert(schema.departments)
      .values(department)
      .returning();
    return newDepartment;
  }

  async updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department | undefined> {
    const [updatedDepartment] = await db
      .update(schema.departments)
      .set(department)
      .where(eq(schema.departments.id, id))
      .returning();
    return updatedDepartment;
  }

  async deleteDepartment(id: number): Promise<boolean> {
    const result = await db.delete(schema.departments).where(eq(schema.departments.id, id));
    return true;
  }

  async getUserCountByDepartment(departmentName: string): Promise<number> {
    const users = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.department, departmentName));
    return users.length;
  }

  // User Group operations
  async getAllUserGroups(): Promise<UserGroup[]> {
    return db.select().from(schema.userGroups).orderBy(schema.userGroups.name);
  }

  async getUserGroup(id: number): Promise<UserGroup | undefined> {
    const groups = await db
      .select()
      .from(schema.userGroups)
      .where(eq(schema.userGroups.id, id));
    return groups[0];
  }

  async createUserGroup(group: InsertUserGroup): Promise<UserGroup> {
    const [newGroup] = await db
      .insert(schema.userGroups)
      .values(group)
      .returning();
    return newGroup;
  }

  async updateUserGroup(id: number, group: Partial<InsertUserGroup>): Promise<UserGroup | undefined> {
    const [updatedGroup] = await db
      .update(schema.userGroups)
      .set(group)
      .where(eq(schema.userGroups.id, id))
      .returning();
    return updatedGroup;
  }

  async deleteUserGroup(id: number): Promise<boolean> {
    await db.delete(schema.userGroups).where(eq(schema.userGroups.id, id));
    return true;
  }

  async getUserCountByUserGroup(groupId: number): Promise<number> {
    const users = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.userGroupId, groupId));
    return users.length;
  }

  // Employee Type operations
  async getAllEmployeeTypes(): Promise<EmployeeType[]> {
    return db.select().from(schema.employeeTypes).orderBy(schema.employeeTypes.name);
  }

  async getEmployeeType(id: number): Promise<EmployeeType | undefined> {
    const types = await db
      .select()
      .from(schema.employeeTypes)
      .where(eq(schema.employeeTypes.id, id));
    return types[0];
  }

  async getDefaultEmployeeType(): Promise<EmployeeType | undefined> {
    const types = await db
      .select()
      .from(schema.employeeTypes)
      .where(eq(schema.employeeTypes.isDefault, 'yes'));
    return types[0];
  }

  async createEmployeeType(type: InsertEmployeeType): Promise<EmployeeType> {
    const [newType] = await db
      .insert(schema.employeeTypes)
      .values(type)
      .returning();
    return newType;
  }

  async updateEmployeeType(id: number, type: Partial<InsertEmployeeType>): Promise<EmployeeType | undefined> {
    const [updatedType] = await db
      .update(schema.employeeTypes)
      .set(type)
      .where(eq(schema.employeeTypes.id, id))
      .returning();
    return updatedType;
  }

  async deleteEmployeeType(id: number): Promise<boolean> {
    await db.delete(schema.employeeTypes).where(eq(schema.employeeTypes.id, id));
    return true;
  }

  // Leave Rule operations
  async getAllLeaveRules(): Promise<LeaveRule[]> {
    return db.select().from(schema.leaveRules).orderBy(schema.leaveRules.name);
  }

  async getLeaveRule(id: number): Promise<LeaveRule | undefined> {
    const rules = await db
      .select()
      .from(schema.leaveRules)
      .where(eq(schema.leaveRules.id, id));
    return rules[0];
  }

  async createLeaveRule(rule: InsertLeaveRule): Promise<LeaveRule> {
    const [newRule] = await db
      .insert(schema.leaveRules)
      .values(rule)
      .returning();
    return newRule;
  }

  async updateLeaveRule(id: number, rule: Partial<InsertLeaveRule>): Promise<LeaveRule | undefined> {
    const [updatedRule] = await db
      .update(schema.leaveRules)
      .set(rule)
      .where(eq(schema.leaveRules.id, id))
      .returning();
    return updatedRule;
  }

  async deleteLeaveRule(id: number): Promise<boolean> {
    await db.delete(schema.leaveRules).where(eq(schema.leaveRules.id, id));
    return true;
  }
}

export const storage = new DrizzleStorage();
