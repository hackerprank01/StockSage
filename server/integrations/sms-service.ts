import * as dotenv from 'dotenv';

dotenv.config();

/**
 * SMS Service using Twilio
 * Simplified implementation that logs in development mode
 */

let twilioClient: any = null;

// Try to initialize Twilio if credentials are available
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    // Dynamic import to avoid errors if twilio is not installed
    import('twilio').then((twilio) => {
      twilioClient = twilio.default(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_AUTH_TOKEN!
      );
      console.log('✅ Twilio SMS service initialized');
    }).catch(() => {
      console.log('⚠️  Twilio not available, SMS service running in development mode');
    });
  }
} catch (error) {
  console.log('⚠️  Twilio initialization skipped - running in development mode');
}

/**
 * Send SMS message
 */
export async function sendSMS(
  to: string,
  message: string
): Promise<boolean> {
  // Development mode - just log
  if (!twilioClient || !process.env.TWILIO_PHONE_NUMBER) {
    console.log(`📱 [DEV MODE] SMS would be sent to ${to}`);
    console.log(`   Message: ${message}`);
    return true;
  }

  try {
    // Ensure message is under 160 characters for single SMS
    const truncatedMessage = message.length > 160 
      ? message.substring(0, 157) + '...' 
      : message;

    const result = await twilioClient.messages.create({
      body: truncatedMessage,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
    });

    console.log(`✅ SMS sent successfully to ${to}: ${result.sid}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send SMS to ${to}:`, error);
    return false;
  }
}

/**
 * Send urgent stockout alert via SMS
 */
export async function sendUrgentAlert(
  phone: string,
  productName: string,
  locationName: string
): Promise<boolean> {
  const message = `URGENT: ${productName} at ${locationName} is critically low/out of stock. Check StockSage dashboard immediately.`;
  return sendSMS(phone, message);
}

/**
 * Send approval request via SMS
 */
export async function sendApprovalRequest(
  phone: string,
  poId: string,
  productName: string,
  cost: number
): Promise<boolean> {
  const message = `Approval needed: PO-${poId} for ${productName} ($${cost.toFixed(0)}). Review in StockSage.`;
  return sendSMS(phone, message);
}

/**
 * Send delivery notification via SMS
 */
export async function sendDeliveryNotification(
  phone: string,
  poNumber: string,
  productName: string
): Promise<boolean> {
  const message = `Delivery confirmed: ${poNumber} - ${productName} received and in inventory.`;
  return sendSMS(phone, message);
}

/**
 * Test SMS service connection
 */
export async function testSMSConnection(): Promise<boolean> {
  if (!twilioClient || !process.env.TWILIO_PHONE_NUMBER) {
    console.log('⚠️  Twilio credentials not configured. SMS service running in development mode.');
    return true;
  }

  try {
    // Validate phone number format
    const validPhoneNumber = await twilioClient.lookups.v1
      .phoneNumbers(process.env.TWILIO_PHONE_NUMBER)
      .fetch();
    
    console.log('✅ SMS service connection successful');
    return true;
  } catch (error) {
    console.error('❌ SMS service connection failed:', error);
    return false;
  }
}

/**
 * Calculate SMS cost tracking
 */
export function estimateSMSCost(messageLength: number, count: number = 1): number {
  const segments = Math.ceil(messageLength / 160);
  const costPerSegment = 0.0075; // Typical Twilio cost in USD
  return segments * costPerSegment * count;
}
