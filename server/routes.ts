import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertLeaveRequestSchema, insertAttendanceRecordSchema, insertDepartmentSchema, insertUserGroupSchema, insertEmployeeTypeSchema, insertLeaveRuleSchema, insertLeaveRulePhaseSchema, insertGrievanceSchema } from "@shared/schema";
import { sendLeaveRequestNotification, sendLateAttendanceNotification, sendAdminWelcomeEmail, sendLeaveStatusNotification, sendPasswordResetEmail, sendAdminCredentialsEmail } from "./email";
import crypto from "crypto";

// Simple in-memory store for password reset tokens (in production, use database)
const passwordResetTokens = new Map<string, { email: string; expiry: Date }>();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ========== AUTH ROUTES ==========
  
  // Worker login by ID (company ID or national ID)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: "ID is required" });
      }

      // Try to find user by company ID or national ID
      const user = await storage.getUserByIdOrNationalId(id);
      
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
      
      // Check for valid admin role (manager or maintainer)
      if (!user || !user.adminRole || !['manager', 'maintainer'].includes(user.adminRole)) {
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
      const senderEmail = "noreply@aece.co.za";
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
  
  // Generate random passwords for users without passwords (admin only)
  // Requires adminUserId in request body for basic authorization
  app.post("/api/users/generate-passwords", async (req, res) => {
    try {
      // Basic authorization check - requires admin user ID
      const { adminUserId } = req.body;
      if (!adminUserId) {
        return res.status(401).json({ error: "Admin user ID is required" });
      }
      
      const adminUser = await storage.getUser(adminUserId);
      if (!adminUser || adminUser.role !== 'manager') {
        return res.status(403).json({ error: "Only administrators can perform this action" });
      }
      
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.filter(u => !u.password);
      
      // Generate a cryptographically secure random password
      const generateSecurePassword = (): string => {
        const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const lowercase = 'abcdefghjkmnpqrstuvwxyz';
        const numbers = '23456789';
        const allChars = uppercase + lowercase + numbers;
        
        // Use crypto for secure random selection
        const secureRandomInt = (max: number): number => {
          return crypto.randomInt(0, max);
        };
        
        // Ensure at least one of each type
        const chars: string[] = [];
        chars.push(uppercase[secureRandomInt(uppercase.length)]);
        chars.push(lowercase[secureRandomInt(lowercase.length)]);
        chars.push(numbers[secureRandomInt(numbers.length)]);
        
        // Fill remaining 7 characters randomly
        for (let i = 0; i < 7; i++) {
          chars.push(allChars[secureRandomInt(allChars.length)]);
        }
        
        // Cryptographically secure shuffle using Fisher-Yates
        for (let i = chars.length - 1; i > 0; i--) {
          const j = secureRandomInt(i + 1);
          [chars[i], chars[j]] = [chars[j], chars[i]];
        }
        
        return chars.join('');
      };
      
      const results = [];
      for (const user of usersWithoutPasswords) {
        const randomPassword = generateSecurePassword();
        await storage.updateUser(user.id, { password: randomPassword });
        results.push({ id: user.id, name: `${user.firstName} ${user.surname}` });
      }
      
      return res.json({ 
        message: `Generated passwords for ${results.length} users`,
        updatedUsers: results
      });
    } catch (error) {
      console.error("Generate passwords error:", error);
      return res.status(500).json({ error: "Failed to generate passwords" });
    }
  });

  // Get all users
  app.get("/api/users", async (req, res) => {
    try {
      const requestingUserId = req.headers['x-user-id'] as string;
      const allUsers = await storage.getAllUsers();
      
      // If no requesting user specified, return all (for backward compatibility)
      if (!requestingUserId) {
        return res.json(allUsers);
      }
      
      // Get the requesting user to check their access level
      const requestingUser = await storage.getUser(requestingUserId);
      
      // Full admins see everyone
      if (requestingUser?.hasFullAdminAccess === 'yes') {
        return res.json(allUsers);
      }
      
      // Limited access: only see themselves and their direct reports
      const filteredUsers = allUsers.filter(u => 
        u.id === requestingUserId || // Can see themselves
        u.managerId === requestingUserId // Can see their direct reports
      );
      
      return res.json(filteredUsers);
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
        .filter(u => u.faceDescriptor && !u.terminationDate && !u.exclude && (u.role === 'worker' || (includeAdmins && u.role === 'manager')))
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
            'noreply@aece.co.za',
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
      
      // Determine initial status based on whether user has a manager
      const user = await storage.getUser(validatedData.userId);
      let initialStatus = 'pending_manager';
      
      if (!user?.managerId) {
        // No manager assigned, go directly to HR
        initialStatus = 'pending_hr';
      }
      
      // Override the status with the correct initial status
      const requestWithStatus = { ...validatedData, status: initialStatus };
      const newRequest = await storage.createLeaveRequest(requestWithStatus);
      
      // Send email notification to manager and admin recipients
      try {
        const adminEmailSetting = await storage.getSetting('admin_email');
        const senderEmail = "noreply@aece.co.za";
        
        // Construct the app URL from the request
        const appUrl = process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : process.env.REPLIT_DEPLOYMENT_URL || 'https://aece-checkpoint.replit.app';
        
        const emailData = {
          employeeName: user ? `${user.firstName} ${user.surname}` : 'Unknown',
          employeeId: validatedData.userId,
          leaveType: validatedData.leaveType,
          startDate: validatedData.startDate,
          endDate: validatedData.endDate,
          reason: validatedData.reason || 'No reason provided',
          department: user?.department || undefined,
          requestId: newRequest.id,
          appUrl: appUrl,
        };
        
        // Send notification to employee's direct manager
        if (user?.managerId) {
          const manager = await storage.getUser(user.managerId);
          if (manager?.email) {
            console.log(`Sending leave request notification to manager: ${manager.email}`);
            await sendLeaveRequestNotification(manager.email, senderEmail, emailData);
          }
        }
        
        // Also send to configured admin email recipients
        if (adminEmailSetting?.value) {
          // Support multiple email addresses (one per line)
          const emails = adminEmailSetting.value.split('\n').map((e: string) => e.trim()).filter((e: string) => e);
          
          for (const recipientEmail of emails) {
            await sendLeaveRequestNotification(recipientEmail, senderEmail, emailData);
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
      const { status, adminNotes } = req.body;
      
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const updatedRequest = await storage.updateLeaveRequestStatus(
        parseInt(req.params.id),
        status,
        adminNotes
      );
      
      if (!updatedRequest) {
        return res.status(404).json({ error: "Leave request not found" });
      }

      // Send email notification to employee if approved or rejected
      if (status === 'approved' || status === 'rejected') {
        try {
          const user = await storage.getUser(updatedRequest.userId);
          const senderEmail = "noreply@aece.co.za";
          
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

  // Get leave requests by status (for approval workflows)
  app.get("/api/leave-requests/by-status/:status", async (req, res) => {
    try {
      const status = req.params.status;
      const validStatuses = ['pending_manager', 'pending_hr', 'pending_md', 'approved', 'rejected', 'cancelled'];
      
      // Support comma-separated multiple statuses
      const statuses = status.split(',');
      const invalidStatuses = statuses.filter(s => !validStatuses.includes(s));
      
      if (invalidStatuses.length > 0) {
        return res.status(400).json({ error: `Invalid status values: ${invalidStatuses.join(', ')}` });
      }
      
      const requests = await storage.getLeaveRequestsByStatus(statuses);
      return res.json(requests);
    } catch (error) {
      console.error("Get leave requests by status error:", error);
      return res.status(500).json({ error: "Failed to fetch leave requests" });
    }
  });

  // Manager approval decision
  app.post("/api/leave-requests/:id/manager-decision", async (req, res) => {
    try {
      const { approverId, decision, notes } = req.body;
      
      if (!approverId) {
        return res.status(400).json({ error: "Approver ID is required" });
      }
      
      if (!['approved', 'rejected'].includes(decision)) {
        return res.status(400).json({ error: "Decision must be 'approved' or 'rejected'" });
      }
      
      const requestId = parseInt(req.params.id);
      const request = await storage.getLeaveRequest(requestId);
      
      if (!request) {
        return res.status(404).json({ error: "Leave request not found" });
      }
      
      if (request.status !== 'pending_manager') {
        return res.status(400).json({ error: "Leave request is not awaiting manager approval" });
      }
      
      const updatedRequest = await storage.updateManagerDecision(requestId, approverId, decision, notes);
      
      // TODO: Send email notification based on decision
      
      return res.json(updatedRequest);
    } catch (error) {
      console.error("Manager decision error:", error);
      return res.status(500).json({ error: "Failed to process manager decision" });
    }
  });

  // HR approval decision
  app.post("/api/leave-requests/:id/hr-decision", async (req, res) => {
    try {
      const { approverId, decision, notes } = req.body;
      
      if (!approverId) {
        return res.status(400).json({ error: "Approver ID is required" });
      }
      
      if (!['approved', 'rejected'].includes(decision)) {
        return res.status(400).json({ error: "Decision must be 'approved' or 'rejected'" });
      }
      
      const requestId = parseInt(req.params.id);
      const request = await storage.getLeaveRequest(requestId);
      
      if (!request) {
        return res.status(404).json({ error: "Leave request not found" });
      }
      
      if (request.status !== 'pending_hr') {
        return res.status(400).json({ error: "Leave request is not awaiting HR approval" });
      }
      
      const updatedRequest = await storage.updateHRDecision(requestId, approverId, decision, notes);
      
      // TODO: Send email notification based on decision
      
      return res.json(updatedRequest);
    } catch (error) {
      console.error("HR decision error:", error);
      return res.status(500).json({ error: "Failed to process HR decision" });
    }
  });

  // MD approval decision (can bypass HR)
  app.post("/api/leave-requests/:id/md-decision", async (req, res) => {
    try {
      const { approverId, decision, notes, bypassHR } = req.body;
      
      if (!approverId) {
        return res.status(400).json({ error: "Approver ID is required" });
      }
      
      if (!['approved', 'rejected'].includes(decision)) {
        return res.status(400).json({ error: "Decision must be 'approved' or 'rejected'" });
      }
      
      const requestId = parseInt(req.params.id);
      const request = await storage.getLeaveRequest(requestId);
      
      if (!request) {
        return res.status(404).json({ error: "Leave request not found" });
      }
      
      // MD can approve/reject from pending_hr or pending_md status
      if (!['pending_hr', 'pending_md'].includes(request.status)) {
        return res.status(400).json({ error: "Leave request is not awaiting HR or MD approval" });
      }
      
      // If bypassing HR (request is still at pending_hr), mark bypassHR flag
      const isBypassingHR = request.status === 'pending_hr' && bypassHR;
      
      const updatedRequest = await storage.updateMDDecision(requestId, approverId, decision, notes, isBypassingHR);
      
      // Send final email notification to employee
      if (updatedRequest) {
        try {
          const user = await storage.getUser(updatedRequest.userId);
          const senderEmail = "noreply@aece.co.za";
          
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
                status: decision as 'approved' | 'rejected',
              }
            );
          }
        } catch (emailError) {
          console.error('Failed to send leave status notification:', emailError);
        }
      }
      
      return res.json(updatedRequest);
    } catch (error) {
      console.error("MD decision error:", error);
      return res.status(500).json({ error: "Failed to process MD decision" });
    }
  });

  // Cancel leave request (by employee - pending only)
  app.delete("/api/leave-requests/:id", async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const request = await storage.getLeaveRequest(requestId);
      
      if (!request) {
        return res.status(404).json({ error: "Leave request not found" });
      }
      
      // Only allow cancellation of requests still in pending stages
      const cancellableStatuses = ['pending', 'pending_manager', 'pending_hr', 'pending_md'];
      if (!cancellableStatuses.includes(request.status)) {
        return res.status(400).json({ error: "Only pending requests can be cancelled" });
      }
      
      // Update status to cancelled
      const updatedRequest = await storage.updateLeaveRequestStatus(requestId, 'cancelled');
      
      return res.json({ message: "Leave request cancelled successfully", request: updatedRequest });
    } catch (error) {
      console.error("Cancel leave request error:", error);
      return res.status(500).json({ error: "Failed to cancel leave request" });
    }
  });

  // Admin cancel leave request (can cancel any status including approved, adjusts balance)
  app.post("/api/leave-requests/:id/admin-cancel", async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const { reason, adminId } = req.body;
      
      const request = await storage.getLeaveRequest(requestId);
      
      if (!request) {
        return res.status(404).json({ error: "Leave request not found" });
      }
      
      if (request.status === 'cancelled') {
        return res.status(400).json({ error: "Leave request is already cancelled" });
      }
      
      const wasApproved = request.status === 'approved';
      
      // Update status to cancelled
      const updatedRequest = await storage.updateLeaveRequestStatus(requestId, 'cancelled');
      
      // If the leave was already approved, we need to credit back the leave balance
      if (wasApproved && updatedRequest) {
        // Calculate number of days
        const startDate = new Date(request.startDate);
        const endDate = new Date(request.endDate);
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        // Credit back the taken days
        const balances = await storage.getLeaveBalances(request.userId);
        const balance = balances.find(b => b.leaveType === request.leaveType);
        if (balance) {
          await storage.updateLeaveBalance(balance.id, {
            taken: Math.max(0, balance.taken - days)
          });
        }
      }
      
      // Send email notification to employee
      try {
        const user = await storage.getUser(request.userId);
        const adminEmailSetting = await storage.getSetting('admin_email');
        const senderEmail = "noreply@aece.co.za";
        
        if (user && user.email) {
          // TODO: Send cancellation notification email
        }
        
        // Notify HR about the admin cancellation
        if (adminEmailSetting) {
          // TODO: Send HR notification about admin cancellation
        }
      } catch (emailError) {
        console.error('Failed to send cancellation notification:', emailError);
      }
      
      return res.json({ 
        message: wasApproved 
          ? "Leave request cancelled and balance credited back" 
          : "Leave request cancelled successfully", 
        request: updatedRequest,
        balanceAdjusted: wasApproved
      });
    } catch (error) {
      console.error("Admin cancel leave request error:", error);
      return res.status(500).json({ error: "Failed to cancel leave request" });
    }
  });

  // Permanently delete leave request (admin only - for test data cleanup)
  app.delete("/api/leave-requests/:id/permanent", async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const request = await storage.getLeaveRequest(requestId);
      
      if (!request) {
        return res.status(404).json({ error: "Leave request not found" });
      }
      
      // If the leave was approved, credit back the balance before deleting
      if (request.status === 'approved') {
        const startDate = new Date(request.startDate);
        const endDate = new Date(request.endDate);
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        const balances = await storage.getLeaveBalances(request.userId);
        const balance = balances.find(b => b.leaveType === request.leaveType);
        if (balance) {
          await storage.updateLeaveBalance(balance.id, {
            taken: Math.max(0, balance.taken - days)
          });
        }
      }
      
      const deleted = await storage.deleteLeaveRequest(requestId);
      
      if (!deleted) {
        return res.status(500).json({ error: "Failed to delete leave request" });
      }
      
      return res.json({ message: "Leave request permanently deleted" });
    } catch (error) {
      console.error("Permanent delete leave request error:", error);
      return res.status(500).json({ error: "Failed to delete leave request" });
    }
  });

  // ========== ATTENDANCE ROUTES ==========
  
  // Get all attendance records (admin) - must be before :userId route
  app.get("/api/attendance", async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      let endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      // Adjust endDate to include the entire day (end of day instead of start)
      if (endDate) {
        endDate = new Date(endDate);
        endDate.setHours(23, 59, 59, 999);
      }
      
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
      let endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      // Adjust endDate to include the entire day
      if (endDate) {
        endDate = new Date(endDate);
        endDate.setHours(23, 59, 59, 999);
      }
      
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
      
      const newRecord = await storage.createAttendanceRecord({
        ...validatedData,
        timestamp: new Date(),
      });
      
      // Check for late arrival or early departure and send notification
      if (validatedData.context === 'attendance') {
        const recordTime = new Date(newRecord.timestamp);
        
        // Get timezone setting for proper time formatting
        const timezoneSetting = await storage.getSetting('timezone');
        const timezone = timezoneSetting?.value || 'Africa/Johannesburg';
        
        // Format time in the configured timezone
        const currentTime = recordTime.toLocaleTimeString('en-ZA', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false,
          timeZone: timezone
        });
        
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
                  'noreply@aece.co.za',
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

  // Create bulk attendance records (manual entry)
  app.post("/api/attendance/bulk", async (req, res) => {
    try {
      const { records } = req.body;
      
      if (!records || !Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: "Records array is required" });
      }

      // Validate and transform records
      const validRecords: { userId: string; type: string; timestamp: Date; method: string; context: string }[] = [];
      const errors: string[] = [];

      for (const r of records) {
        if (!r.userId || typeof r.userId !== 'string') {
          errors.push(`Invalid userId: ${r.userId}`);
          continue;
        }
        if (!r.type || (r.type !== 'in' && r.type !== 'out')) {
          errors.push(`Invalid type for ${r.userId}: ${r.type}`);
          continue;
        }
        if (!r.timestamp) {
          errors.push(`Missing timestamp for ${r.userId}`);
          continue;
        }
        
        const timestamp = new Date(r.timestamp);
        if (isNaN(timestamp.getTime())) {
          errors.push(`Invalid timestamp for ${r.userId}: ${r.timestamp}`);
          continue;
        }

        validRecords.push({
          userId: r.userId,
          type: r.type,
          timestamp,
          method: 'manual',
          context: 'manual',
        });
      }

      if (validRecords.length === 0) {
        return res.status(400).json({ error: errors.length > 0 ? errors.join('; ') : "No valid records provided" });
      }

      const newRecords = await storage.createBulkAttendanceRecords(validRecords);
      return res.status(201).json(newRecords);
    } catch (error) {
      console.error("Create bulk attendance error:", error);
      return res.status(400).json({ error: "Failed to create attendance records" });
    }
  });

  // Update attendance record (admin only)
  app.patch("/api/attendance/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { timestamp, type } = req.body;
      
      const updateData: { timestamp?: Date; type?: string } = {};
      if (timestamp) {
        const parsedTime = new Date(timestamp);
        if (isNaN(parsedTime.getTime())) {
          return res.status(400).json({ error: "Invalid timestamp format" });
        }
        updateData.timestamp = parsedTime;
      }
      if (type && (type === 'in' || type === 'out')) {
        updateData.type = type;
      }
      
      const updated = await storage.updateAttendanceRecord(parseInt(id), updateData);
      if (!updated) {
        return res.status(404).json({ error: "Attendance record not found" });
      }
      return res.json(updated);
    } catch (error) {
      console.error("Update attendance record error:", error);
      return res.status(500).json({ error: "Failed to update attendance record" });
    }
  });

  // Delete attendance record (admin only)
  app.delete("/api/attendance/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteAttendanceRecord(parseInt(id));
      if (!deleted) {
        return res.status(404).json({ error: "Attendance record not found" });
      }
      return res.json({ success: true });
    } catch (error) {
      console.error("Delete attendance record error:", error);
      return res.status(500).json({ error: "Failed to delete attendance record" });
    }
  });

  // Get clock-in status for a user
  app.get("/api/attendance/status/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const status = await storage.getUserClockInStatus(userId);
      return res.json(status);
    } catch (error) {
      console.error("Get clock-in status error:", error);
      return res.status(500).json({ error: "Failed to fetch clock-in status" });
    }
  });

  // Auto-reset users who forgot to clock out (admin trigger)
  app.post("/api/attendance/auto-reset", async (req, res) => {
    try {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      
      const usersNotClockedOut = await storage.getUsersNotClockedOut(startOfToday);
      
      if (usersNotClockedOut.length === 0) {
        return res.json({ message: "No users needed auto clock-out", processed: 0 });
      }

      const senderSetting = await storage.getSetting('sender_email');
      const senderEmail = senderSetting?.value || 'noreply@aece.co.za';

      const results = [];
      for (const { user, lastClockIn } of usersNotClockedOut) {
        try {
          const clockInDate = new Date(lastClockIn.timestamp);
          const autoClockOutTime = new Date(clockInDate);
          autoClockOutTime.setHours(23, 59, 0, 0);
          
          await storage.createSystemAutoClockOut(user.id, autoClockOutTime);
          
          if (user.email) {
            const { sendMissedClockOutNotification } = await import('./email');
            await sendMissedClockOutNotification(user.email, senderEmail, {
              employeeName: `${user.firstName} ${user.surname}`,
              firstName: user.firstName,
              employeeId: user.id,
              department: user.department || undefined,
              clockInTime: clockInDate.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
              clockInDate: clockInDate.toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit', year: 'numeric' }),
              autoClockOutTime: autoClockOutTime.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
            });
          }
          
          results.push({ userId: user.id, name: `${user.firstName} ${user.surname}`, success: true });
        } catch (err) {
          console.error(`Failed to auto clock-out user ${user.id}:`, err);
          results.push({ userId: user.id, name: `${user.firstName} ${user.surname}`, success: false, error: String(err) });
        }
      }

      return res.json({ 
        message: `Processed ${results.length} users`, 
        processed: results.filter(r => r.success).length,
        results 
      });
    } catch (error) {
      console.error("Auto-reset error:", error);
      return res.status(500).json({ error: "Failed to process auto clock-out" });
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

  // Resend admin credentials email
  app.post("/api/users/:id/resend-credentials", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (!user.email) {
        return res.status(400).json({ error: "User does not have an email address" });
      }
      
      if (!user.password) {
        return res.status(400).json({ error: "User does not have a password set" });
      }
      
      const fromEmailSetting = await storage.getSetting('from_email');
      const fromEmail = fromEmailSetting?.value || 'noreply@aece.co.za';
      
      const siteUrl = 'https://factory-flow--quanga01.replit.app';
      
      const success = await sendAdminCredentialsEmail(
        user.email,
        fromEmail,
        {
          firstName: user.firstName,
          surname: user.surname,
          email: user.email,
          password: user.password,
          siteUrl: siteUrl,
        }
      );
      
      if (success) {
        return res.json({ message: "Credentials email sent successfully" });
      } else {
        return res.status(500).json({ error: "Failed to send email. Email service may not be configured." });
      }
    } catch (error) {
      console.error("Resend credentials error:", error);
      return res.status(500).json({ error: "Failed to resend credentials" });
    }
  });

  // ========== GRIEVANCE ROUTES ==========
  
  // Get all grievances (admin) or user's grievances
  app.get("/api/grievances", async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const grievances = await storage.getGrievances(userId);
      return res.json(grievances);
    } catch (error) {
      console.error("Get grievances error:", error);
      return res.status(500).json({ error: "Failed to get grievances" });
    }
  });

  // Get single grievance
  app.get("/api/grievances/:id", async (req, res) => {
    try {
      const grievance = await storage.getGrievance(parseInt(req.params.id));
      if (!grievance) {
        return res.status(404).json({ error: "Grievance not found" });
      }
      return res.json(grievance);
    } catch (error) {
      console.error("Get grievance error:", error);
      return res.status(500).json({ error: "Failed to get grievance" });
    }
  });

  // Create grievance
  app.post("/api/grievances", async (req, res) => {
    try {
      const validatedData = insertGrievanceSchema.parse(req.body);
      const grievance = await storage.createGrievance(validatedData);
      return res.status(201).json(grievance);
    } catch (error) {
      console.error("Create grievance error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid grievance data", details: error.errors });
      }
      return res.status(500).json({ error: "Failed to create grievance" });
    }
  });

  // Update grievance
  app.patch("/api/grievances/:id", async (req, res) => {
    try {
      const grievance = await storage.updateGrievance(parseInt(req.params.id), req.body);
      if (!grievance) {
        return res.status(404).json({ error: "Grievance not found" });
      }
      return res.json(grievance);
    } catch (error) {
      console.error("Update grievance error:", error);
      return res.status(500).json({ error: "Failed to update grievance" });
    }
  });

  // Update grievance status (admin action)
  app.patch("/api/grievances/:id/status", async (req, res) => {
    try {
      const { status, adminNotes, resolution } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      const grievance = await storage.updateGrievanceStatus(
        parseInt(req.params.id),
        status,
        adminNotes,
        resolution
      );
      if (!grievance) {
        return res.status(404).json({ error: "Grievance not found" });
      }
      return res.json(grievance);
    } catch (error) {
      console.error("Update grievance status error:", error);
      return res.status(500).json({ error: "Failed to update grievance status" });
    }
  });

  return httpServer;
}
