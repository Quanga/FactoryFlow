import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertLeaveRequestSchema, insertAttendanceRecordSchema, insertDepartmentSchema } from "@shared/schema";

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
      return res.status(201).json(newUser);
    } catch (error) {
      console.error("Create user error:", error);
      return res.status(400).json({ error: "Invalid user data" });
    }
  });

  // Update user
  app.patch("/api/users/:id", async (req, res) => {
    try {
      const updatedUser = await storage.updateUser(req.params.id, req.body);
      
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
      
      // TODO: Send email notification to admin
      
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

      return res.json(updatedRequest);
    } catch (error) {
      console.error("Update leave request error:", error);
      return res.status(500).json({ error: "Failed to update leave request" });
    }
  });

  // ========== ATTENDANCE ROUTES ==========
  
  // Get attendance records for a user
  app.get("/api/attendance/:userId", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const records = await storage.getAttendanceRecords(req.params.userId, limit);
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
      const newRecord = await storage.createAttendanceRecord(validatedData);
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

  return httpServer;
}
