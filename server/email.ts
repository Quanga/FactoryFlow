import * as postmark from 'postmark';

const POSTMARK_SERVER_TOKEN = process.env.POSTMARK_SERVER_TOKEN;

let client: postmark.ServerClient | null = null;

function getClient(): postmark.ServerClient | null {
  if (!POSTMARK_SERVER_TOKEN) {
    console.warn('POSTMARK_SERVER_TOKEN not configured - email sending disabled');
    return null;
  }
  if (!client) {
    client = new postmark.ServerClient(POSTMARK_SERVER_TOKEN);
  }
  return client;
}

export interface LeaveRequestEmailData {
  employeeName: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  department?: string;
}

export async function sendLeaveRequestNotification(
  adminEmail: string,
  fromEmail: string,
  data: LeaveRequestEmailData
): Promise<boolean> {
  const emailClient = getClient();
  if (!emailClient) {
    console.log('Email client not available - skipping notification');
    return false;
  }

  try {
    const result = await emailClient.sendEmail({
      From: fromEmail,
      To: adminEmail,
      Subject: `New Leave Request from ${data.employeeName}`,
      MessageStream: "dev-stream",
      HtmlBody: `
        <h2>New Leave Request Submitted</h2>
        <p>A new leave request has been submitted and requires your attention.</p>
        <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Employee Name:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${data.employeeName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Employee ID:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${data.employeeId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Department:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${data.department || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Leave Type:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${data.leaveType}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Start Date:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${data.startDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>End Date:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${data.endDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Reason:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${data.reason}</td>
          </tr>
        </table>
        <p style="margin-top: 20px;">Please log in to the FactoryFlow admin portal to review and approve/reject this request.</p>
      `,
      TextBody: `
New Leave Request Submitted

Employee Name: ${data.employeeName}
Employee ID: ${data.employeeId}
Department: ${data.department || 'N/A'}
Leave Type: ${data.leaveType}
Start Date: ${data.startDate}
End Date: ${data.endDate}
Reason: ${data.reason}

Please log in to the FactoryFlow admin portal to review and approve/reject this request.
      `.trim(),
    });
    
    console.log('Leave request notification sent:', result.MessageID);
    return true;
  } catch (error) {
    console.error('Failed to send leave request notification:', error);
    return false;
  }
}

export interface LateAttendanceEmailData {
  employeeName: string;
  employeeId: string;
  department?: string;
  type: 'late_arrival' | 'early_departure';
  actualTime: string;
  cutoffTime: string;
  customMessage?: string;
}

export async function sendLateAttendanceNotification(
  adminEmail: string,
  fromEmail: string,
  data: LateAttendanceEmailData
): Promise<boolean> {
  const emailClient = getClient();
  if (!emailClient) {
    console.log('Email client not available - skipping late notification');
    return false;
  }

  const isLate = data.type === 'late_arrival';
  const subject = isLate 
    ? `Late Arrival: ${data.employeeName}` 
    : `Early Departure: ${data.employeeName}`;
  const typeLabel = isLate ? 'Late Arrival' : 'Early Departure';
  const timeLabel = isLate ? 'Arrival Time' : 'Departure Time';
  const cutoffLabel = isLate ? 'Expected by' : 'Expected after';

  // Process custom message with placeholders
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-ZA');
  let messageBody = data.customMessage || `${data.employeeName} (ID: ${data.employeeId}) ${isLate ? 'clocked in late' : 'left early'} at ${data.actualTime}. ${cutoffLabel} ${data.cutoffTime}.`;
  
  messageBody = messageBody
    .replace(/\{name\}/g, data.employeeName)
    .replace(/\{id\}/g, data.employeeId)
    .replace(/\{department\}/g, data.department || 'N/A')
    .replace(/\{time\}/g, data.actualTime)
    .replace(/\{cutoff\}/g, data.cutoffTime)
    .replace(/\{date\}/g, dateStr);

  try {
    const result = await emailClient.sendEmail({
      From: fromEmail,
      To: adminEmail,
      Subject: subject,
      MessageStream: "dev-stream",
      HtmlBody: `
        <h2 style="color: #dc2626;">Attendance Infringement: ${typeLabel}</h2>
        <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #dc2626;">
          <p style="margin: 0; font-size: 16px;">${messageBody}</p>
        </div>
        <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Employee Name:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${data.employeeName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Employee ID:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${data.employeeId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Department:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${data.department || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Infringement Type:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd; color: #dc2626; font-weight: bold;">${typeLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>${timeLabel}:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${data.actualTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>${cutoffLabel}:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${data.cutoffTime}</td>
          </tr>
        </table>
        <p style="margin-top: 20px; color: #666; font-size: 12px;">This notification was automatically generated by FactoryFlow Attendance System.</p>
      `,
      TextBody: `
Attendance Infringement: ${typeLabel}

${messageBody}

Employee Name: ${data.employeeName}
Employee ID: ${data.employeeId}
Department: ${data.department || 'N/A'}
Infringement Type: ${typeLabel}
${timeLabel}: ${data.actualTime}
${cutoffLabel}: ${data.cutoffTime}

This notification was automatically generated by FactoryFlow Attendance System.
      `.trim(),
    });
    
    console.log('Late attendance notification sent:', result.MessageID);
    return true;
  } catch (error) {
    console.error('Failed to send late attendance notification:', error);
    return false;
  }
}

export interface AdminWelcomeEmailData {
  firstName: string;
  surname: string;
  email: string;
  password: string;
  loginUrl?: string;
}

export async function sendAdminWelcomeEmail(
  toEmail: string,
  fromEmail: string,
  data: AdminWelcomeEmailData
): Promise<boolean> {
  const emailClient = getClient();
  if (!emailClient) {
    console.log('Email client not available - skipping welcome email');
    return false;
  }

  const fullName = `${data.firstName} ${data.surname}`;
  const loginUrl = data.loginUrl || 'https://factoryflow.replit.app';

  try {
    const result = await emailClient.sendEmail({
      From: fromEmail,
      To: toEmail,
      Subject: `Welcome to FactoryFlow - Your Admin Account`,
      MessageStream: "dev-stream",
      HtmlBody: `
        <h2>Welcome to FactoryFlow, ${data.firstName}!</h2>
        <p>Your administrator account has been created. You can now log in to manage employees, attendance, and leave requests.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your Login Credentials</h3>
          <table style="border-collapse: collapse; width: 100%;">
            <tr>
              <td style="padding: 8px 0;"><strong>Email:</strong></td>
              <td style="padding: 8px 0;">${data.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Password:</strong></td>
              <td style="padding: 8px 0; font-family: monospace; background-color: #fff; padding: 8px; border-radius: 4px;">${data.password}</td>
            </tr>
          </table>
        </div>
        
        <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
        
        <p style="margin-top: 30px;">
          <a href="${loginUrl}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Log In to FactoryFlow</a>
        </p>
        
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          If you did not request this account, please contact your HR administrator.
        </p>
      `,
      TextBody: `
Welcome to FactoryFlow, ${data.firstName}!

Your administrator account has been created. You can now log in to manage employees, attendance, and leave requests.

Your Login Credentials:
Email: ${data.email}
Password: ${data.password}

Important: Please change your password after your first login for security purposes.

Log in at: ${loginUrl}

If you did not request this account, please contact your HR administrator.
      `.trim(),
    });
    
    console.log('Admin welcome email sent:', result.MessageID);
    return true;
  } catch (error) {
    console.error('Failed to send admin welcome email:', error);
    return false;
  }
}
