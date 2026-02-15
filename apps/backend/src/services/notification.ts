import twilio from 'twilio';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, notificationLogs } from '../db/schema.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { reportMessage } from '../utils/errorReporter.js';

/**
 * Send an SMS notification to a user
 * @param phoneNumber - The phone number to send the notification to
 * @param message - The message to send
 * @returns Twilio message SID
 */
const sendSmsNotification = async (
  phoneNumber: string,
  message: string
): Promise<string> => {

  // Check if Twilio credentials are configured
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_PHONE_NUMBER) {
    throw new Error('Twilio credentials are not configured');
  }

  // Create a Twilio client
  const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

  // Send the SMS notification
  const twilioMessage = await twilioClient.messages.create({
    body: message,
    from: env.TWILIO_PHONE_NUMBER,
    to: phoneNumber,
  });

  logger.debug(
    { messageId: twilioMessage.sid, to: phoneNumber },
    'SMS notification sent successfully.'
  );

  reportMessage('SMS notification sent successfully.', 'info', { messageId: twilioMessage.sid, to: phoneNumber });

  return twilioMessage.sid;
};

/**
 * Send a notification to a user via all configured NOTIFICATION_CHANNELS.
 * Currently supported channels: "sms"
 * Throws if notification cannot be delivered.
 */
export const sendNotificationToUser = async (
  userId: string,
  message: string
): Promise<void> => {

  // Get the notification channels from the environment variables
  const channels = env.NOTIFICATION_CHANNELS;

  // Check if no notification channels are configured
  if (channels.length === 0) {

    logger.error('No notification channels configured');

    reportMessage('No notification channels configured', 'error');

    throw new Error('No notification channels configured');
  }

  // Get the user from the database
  const [user] = await db
    .select({ phoneNumber: users.phoneNumber })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {

    logger.error({ userId }, 'User not found for notification.');

    reportMessage('User not found for notification.', 'error', { userId });

    throw new Error(`User not found: ${userId}`);
  }

  // Send the notification to the user via the configured channels
  for (const channel of channels) {

    // Send the notification via SMS
    if (channel === 'sms') {

      // Check if the user has a phone number
      if (!user.phoneNumber) {

        logger.warn({ userId }, 'User does not have a phone number');

        reportMessage('User does not have a phone number', 'warning', { userId });

        // Ignore this user and continue with the next channel
        continue;
      }

      try {

        // Send the SMS notification
        const sid = await sendSmsNotification(user.phoneNumber, message);

        // Log the notification
        await db.insert(notificationLogs).values({
          userId,
          channel: 'sms',
          status: 'sent',
          metadata: { sid },
        });

      } catch (error) {

        // Log the notification
        await db.insert(notificationLogs).values({
          userId,
          channel: 'sms',
          status: 'failed',
          metadata: { error: error instanceof Error ? error.message : String(error) },
        });

        // Rethrow the error
        throw error;
      }

    } else {

      logger.error({ channel }, 'Unknown notification channel, skipping.');

      reportMessage('Unknown notification channel, skipping.', 'error', { channel });
    }
  }
};
