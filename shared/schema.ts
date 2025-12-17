import { sql } from "drizzle-orm";
import { pgTable, text, integer, timestamp, serial, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Departments Table
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
});
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

// User Groups Table (for admin users)
export const userGroups = pgTable("user_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserGroupSchema = createInsertSchema(userGroups).omit({
  id: true,
  createdAt: true,
});
export type InsertUserGroup = z.infer<typeof insertUserGroupSchema>;
export type UserGroup = typeof userGroups.$inferSelect;

// Employee Types Table
export const employeeTypes = pgTable("employee_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  leaveLabel: text("leave_label").notNull().default("Leave"), // "Leave" for employees, "Unavailable" for contractors
  hasLeaveEntitlement: text("has_leave_entitlement").notNull().default("yes"), // "yes" or "no"
  isDefault: text("is_default").notNull().default("no"), // "yes" for the default type
  isPermanent: text("is_permanent").notNull().default("yes"), // "yes" for permanent employees (no end date), "no" for contract-based
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmployeeTypeSchema = createInsertSchema(employeeTypes).omit({
  id: true,
  createdAt: true,
});
export type InsertEmployeeType = z.infer<typeof insertEmployeeTypeSchema>;
export type EmployeeType = typeof employeeTypes.$inferSelect;

// Leave Rules Table (for configuring leave accrual rules)
export const leaveRules = pgTable("leave_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  leaveType: text("leave_type").notNull(), // 'Annual Leave', 'Sick Leave', etc.
  employeeTypeId: integer("employee_type_id").references(() => employeeTypes.id),
  accrualType: text("accrual_type").notNull().default("per_days_worked"), // 'monthly', 'annual', 'per_days_worked', 'fixed_per_cycle'
  daysEarned: text("days_earned").notNull().default("1"), // Numerator: days earned (e.g., "1" or "1.6")
  periodDaysWorked: integer("period_days_worked").default(26), // Denominator: days worked to earn (e.g., 26 or 28)
  accrualRate: text("accrual_rate").notNull().default("0"), // Legacy: e.g., "1.667" days per month
  maxAccrual: integer("max_accrual"), // Maximum days that can be accrued
  carryOverLimit: integer("carry_over_limit"), // Max days that can carry over to next year
  waitingPeriodDays: integer("waiting_period_days").default(0), // Days before accrual starts
  cycleMonths: integer("cycle_months"), // e.g., 36 for "every 3 years"
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLeaveRuleSchema = createInsertSchema(leaveRules).omit({
  id: true,
  createdAt: true,
});
export type InsertLeaveRule = z.infer<typeof insertLeaveRuleSchema>;
export type LeaveRule = typeof leaveRules.$inferSelect;

// Leave Rule Phases Table (for tiered rules like sick leave with different rates before/after probation)
export const leaveRulePhases = pgTable("leave_rule_phases", {
  id: serial("id").primaryKey(),
  leaveRuleId: integer("leave_rule_id").notNull().references(() => leaveRules.id, { onDelete: "cascade" }),
  sequence: integer("sequence").notNull().default(1), // Order of phases
  phaseName: text("phase_name").notNull(), // e.g., "Probation Period", "After 6 Months"
  startsAfterMonths: integer("starts_after_months").default(0), // Phase starts after X months of employment
  startsAfterDaysWorked: integer("starts_after_days_worked"), // Or starts after X days worked
  accrualType: text("accrual_type").notNull().default("per_days_worked"), // 'per_days_worked', 'fixed_per_cycle'
  daysEarned: text("days_earned").notNull().default("1"), // Days earned in this phase
  periodDaysWorked: integer("period_days_worked").default(26), // Days worked to earn (for per_days_worked)
  cycleMonths: integer("cycle_months"), // Cycle length for fixed_per_cycle (e.g., 36 for 3 years)
  maxBalanceDays: integer("max_balance_days"), // Max balance during this phase
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLeaveRulePhaseSchema = createInsertSchema(leaveRulePhases).omit({
  id: true,
  createdAt: true,
});
export type InsertLeaveRulePhase = z.infer<typeof insertLeaveRulePhaseSchema>;
export type LeaveRulePhase = typeof leaveRulePhases.$inferSelect;

// Users Table
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"), // Legacy field - auto-populated from firstName + surname
  firstName: text("first_name").notNull(),
  surname: text("surname").notNull(),
  nickname: text("nickname"),
  email: text("email"),
  password: text("password"),
  mobile: text("mobile"),
  homeAddress: text("home_address"),
  gender: text("gender"), // 'male', 'female', 'other'
  role: text("role").notNull().default("worker"), // 'worker' or 'manager'
  department: text("department"), // for workers
  userGroupId: integer("user_group_id").references(() => userGroups.id), // for admins
  employeeTypeId: integer("employee_type_id").references(() => employeeTypes.id), // employee type
  nationalId: text("national_id"), // National ID number
  taxNumber: text("tax_number"), // Tax number
  nextOfKin: text("next_of_kin"), // Next of kin name and relationship
  emergencyNumber: text("emergency_number"), // Emergency contact number
  popiaWaiverUrl: text("popia_waiver_url"), // URL to uploaded POPIA waiver document
  startDate: text("start_date"), // Employment start date for leave calculations
  contractEndDate: text("contract_end_date"), // End date for contractors/temps (null for permanent)
  terminationDate: text("termination_date"), // Date when employee was terminated (null if active)
  photoUrl: text("photo_url"),
  faceDescriptor: text("face_descriptor"), // JSON array of 128 face embedding values
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Leave Balances Table
export const leaveBalances = pgTable("leave_balances", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  leaveType: text("leave_type").notNull(), // 'Annual Leave', 'Sick Leave', etc.
  total: integer("total").notNull().default(0),
  taken: integer("taken").notNull().default(0),
  pending: integer("pending").notNull().default(0),
});

export const insertLeaveBalanceSchema = createInsertSchema(leaveBalances).omit({
  id: true,
});
export type InsertLeaveBalance = z.infer<typeof insertLeaveBalanceSchema>;
export type LeaveBalance = typeof leaveBalances.$inferSelect;

// Leave Requests Table
export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  leaveType: text("leave_type").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  reason: text("reason").notNull(),
  comments: text("comments"), // Employee's additional comments
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected', 'needs_documentation'
  adminNotes: text("admin_notes"), // Admin evaluation notes/comments
  documents: text("documents").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;

// Attendance Records Table
export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'in' or 'out'
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  photoUrl: text("photo_url"),
  method: text("method").default("face"), // 'face' or 'id'
  context: text("context").default("attendance"), // 'attendance' (kiosk) or 'manual'
});

export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
  timestamp: true,
});
export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;

// Settings Table
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
});
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

// Contract History Table (tracks contract extensions and type changes)
export const contractHistory = pgTable("contract_history", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // 'created', 'extended', 'converted', 'ended'
  previousEmployeeTypeId: integer("previous_employee_type_id").references(() => employeeTypes.id),
  newEmployeeTypeId: integer("new_employee_type_id").references(() => employeeTypes.id),
  previousEndDate: text("previous_end_date"),
  newEndDate: text("new_end_date"),
  reason: text("reason"), // Reason for extension/conversion
  performedBy: text("performed_by").references(() => users.id), // Admin who made the change
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContractHistorySchema = createInsertSchema(contractHistory).omit({
  id: true,
  createdAt: true,
});
export type InsertContractHistory = z.infer<typeof insertContractHistorySchema>;
export type ContractHistory = typeof contractHistory.$inferSelect;
