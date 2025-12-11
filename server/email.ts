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
