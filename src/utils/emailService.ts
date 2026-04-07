// Email service for sending notifications
export const sendEmail = async (to: string, type: string, data: any) => {
  // This is a mock implementation
  // In a real application, you would integrate with an email service like SendGrid, Mailgun, etc.
  
  console.log(`Sending ${type} email to ${to}`, data);
  
  const emailTemplates = {
    approved: {
      subject: 'Appointment Approved - FurSure Veterinary Clinic',
      body: `
        Dear Pet Owner,
        
        Your appointment has been approved!
        
        Details:
        - Pet: ${data.petName}
        - Date: ${new Date(data.date).toLocaleDateString()}
        - Time: ${data.time}
        - Veterinarian: ${data.vet}
        
        Please arrive 15 minutes early for check-in.
        
        Best regards,
        FurSure Veterinary Clinic
      `
    },
    rejected: {
      subject: 'Appointment Update - FurSure Veterinary Clinic',
      body: `
        Dear Pet Owner,
        
        We regret to inform you that your appointment for ${data.petName} has been declined.
        
        Reason: ${data.reason}
        
        Please contact us to schedule a new appointment.
        
        Best regards,
        FurSure Veterinary Clinic
      `
    },
    cancelled: {
      subject: 'Appointment Cancelled - FurSure Veterinary Clinic',
      body: `
        Dear Pet Owner,
        
        Your appointment for ${data.petName} has been cancelled.
        
        Reason: ${data.reason}
        
        Please contact us if you need to reschedule.
        
        Best regards,
        FurSure Veterinary Clinic
      `
    },
    rescheduled: {
      subject: 'Appointment Rescheduled - FurSure Veterinary Clinic',
      body: `
        Dear Pet Owner,
        
        Your appointment for ${data.petName} has been rescheduled.
        
        Previous: ${new Date(data.oldDate).toLocaleDateString()} at ${data.oldTime}
        New: ${new Date(data.newDate).toLocaleDateString()} at ${data.newTime}
        Veterinarian: ${data.vet}
        
        Best regards,
        FurSure Veterinary Clinic
      `
    }
  };

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // In a real implementation, you would make an HTTP request to your email service
  // For now, we'll just log the email content
  const template = emailTemplates[type as keyof typeof emailTemplates];
  if (template) {
    console.log('Email sent successfully:', {
      to,
      subject: template.subject,
      body: template.body
    });
    return { success: true };
  }
  
  throw new Error('Invalid email template');
};
