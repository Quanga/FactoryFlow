import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertLeaveRequestSchema, insertAttendanceRecordSchema, insertDepartmentSchema, insertUserGroupSchema, insertEmployeeTypeSchema, insertLeaveRuleSchema, insertLeaveRulePhaseSchema } from "@shared/schema";
import { sendLeaveRequestNotification, sendLateAttendanceNotification, sendAdminWelcomeEmail, sendLeaveStatusNotification, sendPasswordResetEmail } from "./email";
import crypto from "crypto";

// Simple in-memory store for password reset tokens (in production, use database)
const passwordResetTokens = new Map<string, { email: string; expiry: Date }>();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ========== AUTH ROUTES ==========
  
  // Worker login by ID
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: "ID is required" });
      }

      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid ID" });
      }

      return res.json(user);
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  // Face-based login (for both workers and admins with registered faces)
  app.post("/api/auth/login-by-face", async (req, res) => {
    try {
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: "ID is required" });
      }

      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      if (!user.faceDescriptor) {
        return res.status(401).json({ error: "No face registered for this user" });
      }

      return res.json(user);
    } catch (error) {
      console.error("Face login error:", error);
      return res.status(500).json({ error: "Face login failed" });
    }
  });

  // Admin login by email/password
  app.post("/api/auth/admin-login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      
      if (!user || user.role !== 'manager') {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Simple password check (in production, use bcrypt)
      if (user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      return res.json(user);
    } catch (error) {
      console.error("Admin login error:", error);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  // Request password reset
  app.post("/api/auth/request-reset", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      
      // Always return success to prevent email enumeration
      if (!user || user.role !== 'manager') {
        return res.json({ message: "If an account exists with that email, a reset link has been sent." });
      }

      // Generate reset token
      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry
      
      passwordResetTokens.set(token, { email, expiry });

      // Send reset email
      const senderEmail = "hr@aece.co.za";
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : 'http://localhost:5000';
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      await sendPasswordResetEmail(email, senderEmail, {
        firstName: user.firstName || 'User',
        resetToken: token,
        resetUrl,
      });

      return res.json({ message: "If an account exists with that email, a reset link has been sent." });
    } catch (error) {
      console.error("Password reset request error:", error);
      return res.status(500).json({ error: "Failed to process reset request" });
    }
  });

  // Reset password with token
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      const tokenData = passwordResetTokens.get(token);
      
      if (!tokenData) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      if (new Date() > tokenData.expiry) {
        passwordResetTokens.delete(token);
        return res.status(400).json({ error: "Reset token has expired" });
      }

      const user = await storage.getUserByEmail(tokenData.email);
      
      if (!user) {
        return res.status(400).json({ error: "User not found" });
      }

      // Update password
      await storage.updateUser(user.id, { password: newPassword });
      
      // Remove used token
      passwordResetTokens.delete(token);

      return res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      return res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // ========== USER MANAGEMENT ROUTES ==========
  
  // Get all users
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      return res.json(users);
    } catch (error) {
      console.error("Get users error:", error);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get all users with face descriptors (for face recognition matching)
  app.get("/api/users/face-descriptors", async (req, res) => {
    try {
      const includeAdmins = req.query.includeAdmins === 'true';
      const users = await storage.getAllUsers();
      const usersWithFaces = users
        .filter(u => u.faceDescriptor && (u.role === 'worker' || (includeAdmins && u.role === 'manager')))
        .map(u => ({
          id: u.id,
          firstName: u.firstName,
          surname: u.surname,
          email: u.email,
          role: u.role,
          faceDescriptor: u.faceDescriptor,
        }));
      return res.json(usersWithFaces);
    } catch (error) {
      console.error("Get face descriptors error:", error);
      return res.status(500).json({ error: "Failed to fetch face descriptors" });
    }
  });

  // Get user by ID
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.json(user);
    } catch (error) {
      console.error("Get user error:", error);
      return res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Create new user
  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const newUser = await storage.createUser(validatedData);
      
      // Send welcome email for new admin users
      if (validatedData.role === 'manager' && validatedData.email && validatedData.password) {
        try {
          await sendAdminWelcomeEmail(
            validatedData.email,
            'hr@aece.co.za',
            {
              firstName: validatedData.firstName,
              surname: validatedData.surname,
              email: validatedData.email,
              password: validatedData.password,
            }
          );
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
          // Don't fail user creation if email fails
        }
      }
      
      return res.status(201).json(newUser);
    } catch (error: any) {
      console.error("Create user error:", error);
      const message = error?.message || "Invalid user data";
      return res.status(400).json({ error: message });
    }
  });

  // Update user
  app.patch("/api/users/:id", async (req, res) => {
    try {
      // Remove fields that shouldn't be updated
      const { id, createdAt, ...updateData } = req.body;
      
      const updatedUser = await storage.updateUser(req.params.id, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.json(updatedUser);
    } catch (error) {
      console.error("Update user error:", error);
      return res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Delete user
  app.delete("/api/users/:id", async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      return res.status(204).send();
    } catch (error) {
      console.error("Delete user error:", error);
      return res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // ========== LEAVE BALANCE ROUTES ==========
  
  // Get all leave balances (admin)
  app.get("/api/leave-balances", async (req, res) => {
    try {
      const balances = await storage.getAllLeaveBalances();
      return res.json(balances);
    } catch (error) {
      console.error("Get all balances error:", error);
      return res.status(500).json({ error: "Failed to fetch leave balances" });
    }
  });

  // Get leave balances for a user
  app.get("/api/leave-balances/:userId", async (req, res) => {
    try {
      const balances = await storage.getLeaveBalances(req.params.userId);
      return res.json(balances);
    } catch (error) {
      console.error("Get balances error:", error);
      return res.status(500).json({ error: "Failed to fetch leave balances" });
    }
  });

  // Create leave balance
  app.post("/api/leave-balances", async (req, res) => {
    try {
      const { userId, leaveType, total, taken = 0, pending = 0 } = req.body;
      
      if (!userId || !leaveType || total === undefined) {
        return res.status(400).json({ error: "userId, leaveType, and total are required" });
      }

      const newBalance = await storage.createLeaveBalance({
        userId,
        leaveType,
        total,
        taken,
        pending,
      });
      
      return res.status(201).json(newBalance);
    } catch (error) {
      console.error("Create balance error:", error);
      return res.status(500).json({ error: "Failed to create leave balance" });
    }
  });

  // Update leave balance
  app.patch("/api/leave-balances/:id", async (req, res) => {
    try {
      const { total, taken, pending } = req.body;
      const updatedBalance = await storage.updateLeaveBalance(
        parseInt(req.params.id),
        { total, taken, pending }
      );
      
      if (!updatedBalance) {
        return res.status(404).json({ error: "Leave balance not found" });
      }

      return res.json(updatedBalance);
    } catch (error) {
      console.error("Update balance error:", error);
      return res.status(500).json({ error: "Failed to update leave balance" });
    }
  });

  // ========== LEAVE REQUEST ROUTES ==========
  
  // Get all leave requests (or by user)
  app.get("/api/leave-requests", async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const requests = await storage.getLeaveRequests(userId);
      return res.json(requests);
    } catch (error) {
      console.error("Get leave requests error:", error);
      return res.status(500).json({ error: "Failed to fetch leave requests" });
    }
  });

  // Create leave request
  app.post("/api/leave-requests", async (req, res) => {
    try {
      const validatedData = insertLeaveRequestSchema.parse(req.body);
      const newRequest = await storage.createLeaveRequest(validatedData);
      
      // Send email notification to all configured recipients
      try {
        const adminEmailSetting = await storage.getSetting('admin_email');
        const senderEmail = "hr@aece.co.za";
        
        if (adminEmailSetting?.value) {
          const user = await storage.getUser(validatedData.userId);
          
          // Support multiple email addresses (one per line)
          const emails = adminEmailSetting.value.split('\n').map((e: string) => e.trim()).filter((e: string) => e);
          
          for (const recipientEmail of emails) {
            await sendLeaveRequestNotification(
              recipientEmail,
              senderEmail,
              {
                employeeName: user ? `${user.firstName} ${user.surname}` : 'Unknown',
                employeeId: validatedData.userId,
                leaveType: validatedData.leaveType,
                startDate: validatedData.startDate,
                endDate: validatedData.endDate,
                reason: validatedData.reason || 'No reason provided',
                department: user?.department || undefined,
              }
            );
          }
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }
      
      return res.status(201).json(newRequest);
    } catch (error) {
      console.error("Create leave request error:", error);
      return res.status(400).json({ error: "Invalid leave request data" });
    }
  });

  // Update leave request status
  app.patch("/api/leave-requests/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const updatedRequest = await storage.updateLeaveRequestStatus(
        parseInt(req.params.id),
        status
      );
      
      if (!updatedRequest) {
        return res.status(404).json({ error: "Leave request not found" });
      }

      // Send email notification to employee if approved or rejected
      if (status === 'approved' || status === 'rejected') {
        try {
          const user = await storage.getUser(updatedRequest.userId);
          const senderEmail = "hr@aece.co.za";
          
          if (user && user.email) {
            await sendLeaveStatusNotification(
              user.email,
              senderEmail,
              {
                employeeName: `${user.firstName} ${user.surname}`,
                employeeEmail: user.email,
                leaveType: updatedRequest.leaveType,
                startDate: updatedRequest.startDate,
                endDate: updatedRequest.endDate,
                status: status as 'approved' | 'rejected',
              }
            );
          }
        } catch (emailError) {
          console.error('Failed to send leave status notification:', emailError);
        }
      }

      return res.json(updatedRequest);
    } catch (error) {
      console.error("Update leave request error:", error);
      return res.status(500).json({ error: "Failed to update leave request" });
    }
  });

  // ========== ATTENDANCE ROUTES ==========
  
  // Get all attendance records (admin) - must be before :userId route
  app.get("/api/attendance", async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const records = await storage.getAllAttendanceRecords(startDate, endDate);
      return res.json(records);
    } catch (error) {
      console.error("Get all attendance error:", error);
      return res.status(500).json({ error: "Failed to fetch attendance records" });
    }
  });

  // Get attendance records for a user
  app.get("/api/attendance/:userId", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const records = await storage.getAttendanceRecords(req.params.userId, limit, startDate, endDate);
      return res.json(records);
    } catch (error) {
      console.error("Get attendance error:", error);
      return res.status(500).json({ error: "Failed to fetch attendance records" });
    }
  });

  // Create attendance record
  app.post("/api/attendance", async (req, res) => {
    try {
      const validatedData = insertAttendanceRecordSchema.parse(req.body);
      
      // Check for valid clock-in/clock-out sequence (only for attendance context)
      if (validatedData.context === 'attendance') {
        const latestRecord = await storage.getTodayLatestAttendance(validatedData.userId);
        
        if (validatedData.type === 'in') {
          // Trying to clock in - check if already clocked in without clocking out
          if (latestRecord && latestRecord.type === 'in') {
            return res.status(409).json({ 
              error: "Already clocked in", 
              message: "Worker is already clocked in. Please clock out before clocking in again." 
            });
          }
        } else if (validatedData.type === 'out') {
          // Trying to clock out - check if there's a clock-in first
          if (!latestRecord || latestRecord.type === 'out') {
            return res.status(409).json({ 
              error: "Not clocked in", 
              message: "Worker has not clocked in yet today." 
            });
          }
        }
      }
      
      const newRecord = await storage.createAttendanceRecord(validatedData);
      
      // Check for late arrival or early departure and send notification
      if (validatedData.context === 'attendance') {
        const recordTime = new Date(newRecord.timestamp);
        const currentTime = `${recordTime.getHours().toString().padStart(2, '0')}:${recordTime.getMinutes().toString().padStart(2, '0')}`;
        
        try {
          const user = await storage.getUser(validatedData.userId);
          const adminEmailSetting = await storage.getSetting('admin_email');
          
          if (user && adminEmailSetting) {
            let isInfringement = false;
            let infringementType: 'late_arrival' | 'early_departure' = 'late_arrival';
            let cutoffTime = '';
            
            if (validatedData.type === 'in') {
              // Check for late arrival
              const clockInCutoff = await storage.getSetting('clock_in_cutoff');
              if (clockInCutoff && currentTime > clockInCutoff.value) {
                isInfringement = true;
                infringementType = 'late_arrival';
                cutoffTime = clockInCutoff.value;
              }
            } else if (validatedData.type === 'out') {
              // Check for early departure
              const clockOutCutoff = await storage.getSetting('clock_out_cutoff');
              if (clockOutCutoff && currentTime < clockOutCutoff.value) {
                isInfringement = true;
                infringementType = 'early_departure';
                cutoffTime = clockOutCutoff.value;
              }
            }
            
            if (isInfringement) {
              // Get custom message template
              const messageSettingKey = infringementType === 'late_arrival' ? 'late_arrival_message' : 'early_departure_message';
              const messageSetting = await storage.getSetting(messageSettingKey);
              
              // Support multiple email addresses (one per line)
              const emails = adminEmailSetting.value.split('\n').map((e: string) => e.trim()).filter((e: string) => e);
              
              for (const recipientEmail of emails) {
                await sendLateAttendanceNotification(
                  recipientEmail,
                  'hr@aece.co.za',
                  {
                    employeeName: `${user.firstName} ${user.surname}`,
                    firstName: user.firstName,
                    surname: user.surname,
                    employeeId: user.id,
                    department: user.department || undefined,
                    type: infringementType,
                    actualTime: currentTime,
                    cutoffTime: cutoffTime,
                    customMessage: messageSetting?.value,
                  }
                );
              }
            }
          }
        } catch (notificationError) {
          console.error("Failed to check/send late notification:", notificationError);
          // Don't fail the attendance record creation for notification errors
        }
      }
      
      return res.status(201).json(newRecord);
    } catch (error) {
      console.error("Create attendance error:", error);
      return res.status(400).json({ error: "Invalid attendance data" });
    }
  });

  // ========== SETTINGS ROUTES ==========
  
  // Get setting by key
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }

      return res.json(setting);
    } catch (error) {
      console.error("Get setting error:", error);
      return res.status(500).json({ error: "Failed to fetch setting" });
    }
  });

  // Set setting
  app.put("/api/settings/:key", async (req, res) => {
    try {
      const { value } = req.body;
      
      if (!value) {
        return res.status(400).json({ error: "Value is required" });
      }

      const setting = await storage.setSetting(req.params.key, value);
      return res.json(setting);
    } catch (error) {
      console.error("Set setting error:", error);
      return res.status(500).json({ error: "Failed to update setting" });
    }
  });

  // ========== DEPARTMENT ROUTES ==========
  
  // Get all departments
  app.get("/api/departments", async (req, res) => {
    try {
      const departments = await storage.getAllDepartments();
      return res.json(departments);
    } catch (error) {
      console.error("Get departments error:", error);
      return res.status(500).json({ error: "Failed to fetch departments" });
    }
  });

  // Get department by ID
  app.get("/api/departments/:id", async (req, res) => {
    try {
      const department = await storage.getDepartment(parseInt(req.params.id));
      
      if (!department) {
        return res.status(404).json({ error: "Department not found" });
      }

      return res.json(department);
    } catch (error) {
      console.error("Get department error:", error);
      return res.status(500).json({ error: "Failed to fetch department" });
    }
  });

  // Create department
  app.post("/api/departments", async (req, res) => {
    try {
      const validatedData = insertDepartmentSchema.parse(req.body);
      const newDepartment = await storage.createDepartment(validatedData);
      return res.status(201).json(newDepartment);
    } catch (error: any) {
      console.error("Create department error:", error);
      if (error.code === '23505') {
        return res.status(400).json({ error: "Department name already exists" });
      }
      return res.status(400).json({ error: "Invalid department data" });
    }
  });

  // Update department
  app.patch("/api/departments/:id", async (req, res) => {
    try {
      const updatedDepartment = await storage.updateDepartment(parseInt(req.params.id), req.body);
      
      if (!updatedDepartment) {
        return res.status(404).json({ error: "Department not found" });
      }

      return res.json(updatedDepartment);
    } catch (error: any) {
      console.error("Update department error:", error);
      if (error.code === '23505') {
        return res.status(400).json({ error: "Department name already exists" });
      }
      return res.status(500).json({ error: "Failed to update department" });
    }
  });

  // Delete department
  app.delete("/api/departments/:id", async (req, res) => {
    try {
      const department = await storage.getDepartment(parseInt(req.params.id));
      
      if (!department) {
        return res.status(404).json({ error: "Department not found" });
      }

      // Check if any users are in this department
      const userCount = await storage.getUserCountByDepartment(department.name);
      
      if (userCount > 0) {
        return res.status(409).json({ 
          error: "Cannot delete department with assigned employees",
          userCount 
        });
      }

      await storage.deleteDepartment(parseInt(req.params.id));
      return res.status(204).send();
    } catch (error) {
      console.error("Delete department error:", error);
      return res.status(500).json({ error: "Failed to delete department" });
    }
  });

  // ========== USER GROUP ROUTES ==========
  
  // Get all user groups
  app.get("/api/user-groups", async (req, res) => {
    try {
      const groups = await storage.getAllUserGroups();
      return res.json(groups);
    } catch (error) {
      console.error("Get user groups error:", error);
      return res.status(500).json({ error: "Failed to fetch user groups" });
    }
  });

  // Get user group by ID
  app.get("/api/user-groups/:id", async (req, res) => {
    try {
      const group = await storage.getUserGroup(parseInt(req.params.id));
      
      if (!group) {
        return res.status(404).json({ error: "User group not found" });
      }

      return res.json(group);
    } catch (error) {
      console.error("Get user group error:", error);
      return res.status(500).json({ error: "Failed to fetch user group" });
    }
  });

  // Create user group
  app.post("/api/user-groups", async (req, res) => {
    try {
      const validatedData = insertUserGroupSchema.parse(req.body);
      const newGroup = await storage.createUserGroup(validatedData);
      return res.status(201).json(newGroup);
    } catch (error: any) {
      console.error("Create user group error:", error);
      if (error.code === '23505') {
        return res.status(400).json({ error: "User group name already exists" });
      }
      return res.status(400).json({ error: "Invalid user group data" });
    }
  });

  // Update user group
  app.patch("/api/user-groups/:id", async (req, res) => {
    try {
      const updatedGroup = await storage.updateUserGroup(parseInt(req.params.id), req.body);
      
      if (!updatedGroup) {
        return res.status(404).json({ error: "User group not found" });
      }

      return res.json(updatedGroup);
    } catch (error: any) {
      console.error("Update user group error:", error);
      if (error.code === '23505') {
        return res.status(400).json({ error: "User group name already exists" });
      }
      return res.status(500).json({ error: "Failed to update user group" });
    }
  });

  // Delete user group
  app.delete("/api/user-groups/:id", async (req, res) => {
    try {
      const group = await storage.getUserGroup(parseInt(req.params.id));
      
      if (!group) {
        return res.status(404).json({ error: "User group not found" });
      }

      // Check if any users are in this group
      const userCount = await storage.getUserCountByUserGroup(group.id);
      
      if (userCount > 0) {
        return res.status(409).json({ 
          error: "Cannot delete user group with assigned users",
          userCount 
        });
      }

      await storage.deleteUserGroup(parseInt(req.params.id));
      return res.status(204).send();
    } catch (error) {
      console.error("Delete user group error:", error);
      return res.status(500).json({ error: "Failed to delete user group" });
    }
  });

  // ========== EMPLOYEE TYPE ROUTES ==========

  // Get all employee types
  app.get("/api/employee-types", async (req, res) => {
    try {
      const types = await storage.getAllEmployeeTypes();
      return res.json(types);
    } catch (error) {
      console.error("Get employee types error:", error);
      return res.status(500).json({ error: "Failed to fetch employee types" });
    }
  });

  // Get single employee type
  app.get("/api/employee-types/:id", async (req, res) => {
    try {
      const type = await storage.getEmployeeType(parseInt(req.params.id));
      
      if (!type) {
        return res.status(404).json({ error: "Employee type not found" });
      }

      return res.json(type);
    } catch (error) {
      console.error("Get employee type error:", error);
      return res.status(500).json({ error: "Failed to fetch employee type" });
    }
  });

  // Create employee type
  app.post("/api/employee-types", async (req, res) => {
    try {
      const validated = insertEmployeeTypeSchema.parse(req.body);
      const newType = await storage.createEmployeeType(validated);
      return res.status(201).json(newType);
    } catch (error: any) {
      console.error("Create employee type error:", error);
      if (error.code === '23505') {
        return res.status(400).json({ error: "Employee type name already exists" });
      }
      return res.status(400).json({ error: "Invalid employee type data" });
    }
  });

  // Update employee type
  app.patch("/api/employee-types/:id", async (req, res) => {
    try {
      const updatedType = await storage.updateEmployeeType(parseInt(req.params.id), req.body);
      
      if (!updatedType) {
        return res.status(404).json({ error: "Employee type not found" });
      }

      return res.json(updatedType);
    } catch (error: any) {
      console.error("Update employee type error:", error);
      if (error.code === '23505') {
        return res.status(400).json({ error: "Employee type name already exists" });
      }
      return res.status(500).json({ error: "Failed to update employee type" });
    }
  });

  // Delete employee type
  app.delete("/api/employee-types/:id", async (req, res) => {
    try {
      const type = await storage.getEmployeeType(parseInt(req.params.id));
      
      if (!type) {
        return res.status(404).json({ error: "Employee type not found" });
      }

      await storage.deleteEmployeeType(parseInt(req.params.id));
      return res.status(204).send();
    } catch (error) {
      console.error("Delete employee type error:", error);
      return res.status(500).json({ error: "Failed to delete employee type" });
    }
  });

  // ========== LEAVE RULE ROUTES ==========

  // Get all leave rules
  app.get("/api/leave-rules", async (req, res) => {
    try {
      const rules = await storage.getAllLeaveRules();
      return res.json(rules);
    } catch (error) {
      console.error("Get leave rules error:", error);
      return res.status(500).json({ error: "Failed to fetch leave rules" });
    }
  });

  // Get single leave rule
  app.get("/api/leave-rules/:id", async (req, res) => {
    try {
      const rule = await storage.getLeaveRule(parseInt(req.params.id));
      
      if (!rule) {
        return res.status(404).json({ error: "Leave rule not found" });
      }

      return res.json(rule);
    } catch (error) {
      console.error("Get leave rule error:", error);
      return res.status(500).json({ error: "Failed to fetch leave rule" });
    }
  });

  // Create leave rule
  app.post("/api/leave-rules", async (req, res) => {
    try {
      const validated = insertLeaveRuleSchema.parse(req.body);
      const newRule = await storage.createLeaveRule(validated);
      return res.status(201).json(newRule);
    } catch (error: any) {
      console.error("Create leave rule error:", error);
      return res.status(400).json({ error: "Invalid leave rule data" });
    }
  });

  // Update leave rule
  app.patch("/api/leave-rules/:id", async (req, res) => {
    try {
      const updatedRule = await storage.updateLeaveRule(parseInt(req.params.id), req.body);
      
      if (!updatedRule) {
        return res.status(404).json({ error: "Leave rule not found" });
      }

      return res.json(updatedRule);
    } catch (error: any) {
      console.error("Update leave rule error:", error);
      return res.status(500).json({ error: "Failed to update leave rule" });
    }
  });

  // Delete leave rule
  app.delete("/api/leave-rules/:id", async (req, res) => {
    try {
      const rule = await storage.getLeaveRule(parseInt(req.params.id));
      
      if (!rule) {
        return res.status(404).json({ error: "Leave rule not found" });
      }

      await storage.deleteLeaveRule(parseInt(req.params.id));
      return res.status(204).send();
    } catch (error) {
      console.error("Delete leave rule error:", error);
      return res.status(500).json({ error: "Failed to delete leave rule" });
    }
  });

  // ========== LEAVE RULE PHASES ROUTES ==========

  // Get all phases for a leave rule
  app.get("/api/leave-rules/:id/phases", async (req, res) => {
    try {
      const phases = await storage.getLeaveRulePhases(parseInt(req.params.id));
      return res.json(phases);
    } catch (error) {
      console.error("Get leave rule phases error:", error);
      return res.status(500).json({ error: "Failed to fetch leave rule phases" });
    }
  });

  // Create a new phase for a leave rule
  app.post("/api/leave-rules/:id/phases", async (req, res) => {
    try {
      const leaveRuleId = parseInt(req.params.id);
      const validated = insertLeaveRulePhaseSchema.parse({ ...req.body, leaveRuleId });
      const newPhase = await storage.createLeaveRulePhase(validated);
      return res.status(201).json(newPhase);
    } catch (error: any) {
      console.error("Create leave rule phase error:", error);
      return res.status(400).json({ error: "Invalid leave rule phase data" });
    }
  });

  // Update a leave rule phase
  app.patch("/api/leave-rule-phases/:id", async (req, res) => {
    try {
      const updatedPhase = await storage.updateLeaveRulePhase(parseInt(req.params.id), req.body);
      
      if (!updatedPhase) {
        return res.status(404).json({ error: "Leave rule phase not found" });
      }

      return res.json(updatedPhase);
    } catch (error: any) {
      console.error("Update leave rule phase error:", error);
      return res.status(500).json({ error: "Failed to update leave rule phase" });
    }
  });

  // Delete a leave rule phase
  app.delete("/api/leave-rule-phases/:id", async (req, res) => {
    try {
      await storage.deleteLeaveRulePhase(parseInt(req.params.id));
      return res.status(204).send();
    } catch (error) {
      console.error("Delete leave rule phase error:", error);
      return res.status(500).json({ error: "Failed to delete leave rule phase" });
    }
  });

  // Delete all phases for a leave rule (used when replacing phases)
  app.delete("/api/leave-rules/:id/phases", async (req, res) => {
    try {
      await storage.deleteAllLeaveRulePhases(parseInt(req.params.id));
      return res.status(204).send();
    } catch (error) {
      console.error("Delete all leave rule phases error:", error);
      return res.status(500).json({ error: "Failed to delete leave rule phases" });
    }
  });

  // Contract History Routes
  app.get("/api/users/:id/contract-history", async (req, res) => {
    try {
      const history = await storage.getContractHistory(req.params.id);
      return res.json(history);
    } catch (error) {
      console.error("Get contract history error:", error);
      return res.status(500).json({ error: "Failed to get contract history" });
    }
  });

  app.post("/api/users/:id/contract-history", async (req, res) => {
    try {
      const history = await storage.createContractHistory({
        userId: req.params.id,
        ...req.body,
      });
      return res.status(201).json(history);
    } catch (error) {
      console.error("Create contract history error:", error);
      return res.status(500).json({ error: "Failed to create contract history" });
    }
  });

  return httpServer;
}
