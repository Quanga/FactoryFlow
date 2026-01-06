# AECE Checkpoint User Manual

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Worker Guide](#worker-guide)
4. [Administrator Guide](#administrator-guide)
5. [Troubleshooting](#troubleshooting)

---

## Introduction

AECE Checkpoint is an employee leave management and attendance tracking system designed for AEC Electronics (Pty) Ltd. The system provides:

- **Attendance Tracking** - Clock in and out using facial recognition or ID
- **Leave Management** - Request, track, and manage leave with multi-stage approval
- **Grievance System** - Submit and track workplace grievances
- **Employee Management** - Comprehensive personnel administration for managers

The system has two main user types:
- **Workers** - Factory employees who clock in/out and request leave
- **Administrators** - Managers who oversee operations and approve requests

---

## Getting Started

### Accessing the System

When you open AECE Checkpoint, you'll see the Mode Selection screen with two options:

1. **Attendance Kiosk** - For clocking in and out (shared terminal)
2. **Employee Portal** - For full access to leave requests, profile, and more

### Logging In

#### For Workers

You can log in using:

1. **Face Recognition** (Recommended)
   - Position your face in front of the camera
   - The system will automatically recognize you
   - Wait for the welcome message

2. **Employee ID or National ID**
   - Click "Use Employee ID or National ID instead"
   - Enter your company Employee ID OR your National ID number
   - Click "Sign In"

#### For Administrators

1. Click "Admin" at the top of the login screen
2. Enter your email address and password
3. Click "Sign In"
4. You can also use Face Recognition if your face is registered

---

## Worker Guide

### Dashboard

After logging in, you'll see your personal dashboard showing:

- **Clock-in Status** - Shows whether you're currently clocked in or out
- **Leave Balances** - Your available days for each leave type (Annual, Sick, Family Responsibility)
- **Recent Leave Requests** - Status of your recent leave applications
- **Manager Information** - Your assigned manager's details

### Attendance (Clock In/Out)

To clock in or out:

1. Go to **Attendance** from the menu
2. Allow camera access if prompted
3. Position your face in the camera frame
4. Click **Clock In** or **Clock Out**
5. A photo will be captured as verification
6. You'll see a confirmation message

**Important Notes:**
- If you forget to clock out, the system will automatically create a clock-out record at 23:59
- Late arrivals and early departures may trigger notifications to your manager

### Request Leave

To submit a leave request:

1. Go to **Request Leave** from the menu
2. Select the **Leave Type** (Annual, Sick, Family Responsibility, etc.)
3. Choose your **Start Date** and **End Date**
4. Enter a **Reason** for your leave
5. Add any additional **Comments** (optional)
6. Attach supporting documents if required (e.g., medical certificate for sick leave)
7. Click **Submit Request**

**Leave Approval Process:**
1. Your request goes to your **Manager** for initial approval
2. If approved, it goes to **HR** for review
3. Finally, the **Managing Director (MD)** gives final approval
4. You'll receive email notifications at each stage

**Viewing Your Requests:**
- All your leave requests appear on the Request Leave page
- Status indicators show: Pending, Approved, or Rejected
- Click on any request to view details

### Grievances

To submit a grievance:

1. Go to **Grievances** from the menu
2. Click **New Grievance**
3. Select the **Category** (Harassment, Safety, Policy, etc.)
4. Choose the **Target** (Department or specific Employee)
5. Write a detailed **Description** of the issue
6. Click **Submit**

**Tracking Grievances:**
- View all your submitted grievances on the Grievances page
- Status shows: Submitted, Under Review, Resolved, or Closed
- You can see any resolution notes added by administrators

### My Profile

View your personal information:

1. Go to **My Profile** from the menu
2. See your details including:
   - Name and contact information
   - Department and employee type
   - Manager assignment
   - Employment start date

**Note:** To update your information, please contact your administrator.

### Logging Out

1. Click **Logout** in the bottom of the navigation menu
2. You'll be returned to the start screen

---

## Administrator Guide

### Admin Dashboard Overview

The Admin Dashboard provides tabs for managing all aspects of the system:

- **Personnel** - Employee management
- **Departments** - Department structure
- **Leave** - Leave requests and rules
- **Attendance** - Attendance records and manual entry
- **Grievances** - Grievance management
- **Settings** - System configuration

### Personnel Management

#### Viewing Employees

1. Go to the **Personnel** tab
2. Use the search box to find employees by name or ID
3. Filter by department using the dropdown

#### Adding New Employees

1. Click **Add Employee**
2. Fill in the required fields:
   - **Employee ID** - Unique company ID (e.g., AECE1001)
   - **First Name** and **Surname**
   - **Role** - Worker or Manager
   - **Department** (for workers) - Required to assign the employee to a team
   - **Employee Type** - Required for leave rule calculations (Permanent, Contractor, etc.)
   - **Email** - Required for receiving system notifications
   - **National ID** - South African ID number (can be used for login)
3. Recommended fields:
   - **Mobile** - Contact number
   - **Home Address** - Residential address
   - **Manager** - Direct reporting manager
   - **Start Date** - Employment start date (important for leave accrual)
   - **Contract End Date** - For temporary/contract staff
   - **Tax Number** - For payroll purposes
   - **Next of Kin** and **Emergency Contact** - Emergency information
4. Click **Save**

**After Creating an Employee:**
- The system automatically generates a secure random password
- You can view and change the password in the employee's edit screen
- Consider registering their face for easier clock-in

#### Editing Employees

1. Find the employee in the list
2. Click **Edit**
3. Update the required fields
4. Click **Save**

#### Registering Face for Login

1. Edit the employee's profile
2. Click **Register Face**
3. Have the employee position their face in the camera
4. Capture and save the face data

#### Terminating Employees

1. Find the employee
2. Click **Terminate**
3. Enter the termination date
4. Confirm the action

### Department Management

#### Adding Departments

1. Go to the **Departments** tab
2. Click **Add Department**
3. Enter the department name
4. Click **Save**

#### Editing/Deleting Departments

- Click **Edit** to rename a department
- Click **Delete** to remove (only if no employees assigned)

### Leave Management

#### Approving Leave Requests

1. Go to the **Leave** tab
2. View pending requests in the **Leave Requests** section
3. Click on a request to view details
4. Choose **Approve** or **Reject**
5. Add a comment explaining your decision (optional but recommended)
6. The request moves to the next approval stage

**Multi-Stage Approval Flow:**

Leave requests go through up to three approval stages:

1. **Manager Approval** - The employee's direct manager reviews the request
2. **HR Approval** - Human Resources verifies compliance and leave balance
3. **MD Approval** - Managing Director gives final authorization

**MD Bypass Option:**
- If the Managing Director is the employee's direct manager, they can bypass intermediate stages
- The MD can approve requests directly without waiting for HR review
- This speeds up the process for employees who report directly to senior management

**Approval Actions:**
- **Approve** - Move request to next stage (or grant if final stage)
- **Reject** - Deny the request with a reason
- Employees receive email notifications at each stage

#### Managing Leave Balances

1. In the Leave tab, go to **Leave Balances**
2. Search for an employee
3. Adjust their leave balance if needed
4. Add a reason for the adjustment

#### Configuring Leave Rules

1. Go to **Leave Rules** section
2. Create rules that define:
   - Leave type
   - Accrual method (per year, per days worked, etc.)
   - Number of days
   - Which employee types the rule applies to

### Attendance Management

#### Viewing Records

1. Go to the **Attendance** tab
2. Filter by date range
3. Search by employee name
4. View clock-in and clock-out times

#### Manual Attendance Entry

For correcting or adding missed entries:

1. Go to the **Manual Entry** sub-tab
2. Select the employee
3. Choose the date
4. Enter clock-in and/or clock-out times
5. Click **Save**

#### Auto Clock-Out Reset

For employees who forgot to clock out:

1. Click **Run Auto Clock-Out**
2. The system will:
   - Find all employees still clocked in from previous days
   - Create automatic clock-out records at 23:59
   - Send email notifications to affected employees

### Grievance Management

1. Go to the **Grievances** tab
2. View all submitted grievances
3. Click on a grievance to view details
4. Update the status:
   - **Under Review** - Investigation in progress
   - **Resolved** - Issue has been addressed
   - **Closed** - Case closed
5. Add resolution notes
6. Click **Update**

### System Settings

**Important:** Configure these settings before employees start using the attendance system.

#### General Settings

- **Admin Email** - Email address that receives system notifications (leave requests, errors)
- **Sender Email** - Email address used as the "from" address for all system emails
- **Timezone** - System timezone for accurate time tracking (default: Africa/Johannesburg)

**Timezone Configuration:**
The timezone setting is critical for correct attendance tracking:
1. Go to **Settings** tab
2. Find the **Timezone** setting
3. Select the appropriate timezone (e.g., Africa/Johannesburg for South Africa)
4. Click **Save**

All clock-in/out times and auto-reset functions use this timezone. Incorrect timezone settings will cause:
- Wrong late/early notifications
- Incorrect auto clock-out times
- Mismatched attendance records

#### Attendance Settings

Configure these before enabling attendance tracking:

- **Clock-In Cut-off** - Time after which clock-ins are considered late (e.g., 08:00)
  - Employees clocking in after this time receive late arrival notifications
- **Clock-Out Cut-off** - Time before which clock-outs are considered early (e.g., 17:00)
  - Employees leaving before this time trigger early departure notifications
- **Late Arrival Message** - Custom message included in late arrival notifications
- **Early Departure Message** - Custom message included in early departure notifications

**Example Configuration:**
- Clock-In Cut-off: 08:00
- Clock-Out Cut-off: 17:00
- Timezone: Africa/Johannesburg

#### User Groups

Create groups for organizing administrators:

1. Go to **User Groups**
2. Click **Add Group**
3. Enter group name and description
4. Assign managers to groups

### Organization Chart

View the company hierarchy:

1. Go to **Organization Chart** from the admin menu
2. See departments and their employees
3. View reporting relationships

---

## Troubleshooting

### Login Issues

**Face not recognized:**
- Ensure good lighting on your face
- Remove glasses or hats if possible
- Position your face directly in the camera frame
- Move closer or further from the camera
- Try using your Employee ID or National ID instead

**Invalid ID error:**
- Check you're entering the correct Employee ID or National ID
- Contact your administrator if you don't know your ID

**Admin login fails:**
- Verify your email is correct
- Check your password (case-sensitive)
- Use "Forgot Password" to reset if needed

### Attendance Issues

**Camera not working:**
- Allow camera permissions in your browser
- Refresh the page and try again
- Try a different browser

**Clock-in/out not saving:**
- Check your internet connection
- Wait for the success message before leaving
- Contact administrator if the issue persists

### Leave Request Issues

**Cannot submit request:**
- Ensure all required fields are filled
- Check that your date range is valid
- Verify you have sufficient leave balance

**Request stuck in pending:**
- Your manager or HR may be reviewing it
- Check with your manager about the status

### Getting Help

For technical issues or questions not covered in this manual:
- Contact your system administrator
- Email: Contact your HR department

---

## Quick Reference

### Date Format
All dates in the system use: **DD/MM/YYYY** (e.g., 06/01/2026)

### Leave Types
- **Annual Leave** - Regular vacation days
- **Sick Leave** - Medical absences
- **Family Responsibility** - Family emergencies
- **Study Leave** - Educational purposes
- **Unpaid Leave** - Leave without pay

### Status Meanings

**Leave Request Status:**
- 🟡 Pending - Awaiting approval
- 🟢 Approved - Request granted
- 🔴 Rejected - Request denied

**Grievance Status:**
- 📝 Submitted - New grievance
- 🔍 Under Review - Being investigated
- ✅ Resolved - Issue addressed
- 📁 Closed - Case complete

---

*AECE Checkpoint v1.0 - AEC Electronics (Pty) Ltd*
