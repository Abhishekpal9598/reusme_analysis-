import { Application } from '../models/Application.js';
import { logger, sanitizeString } from './logger.js';

/**
 * Idempotent migration utility to normalize legacy Application statuses
 * in MongoDB Atlas (Interviewing -> Interview, Offered -> Offer).
 * Uses raw collection updateMany to bypass Mongoose query casting.
 */
export async function migrateLegacyApplicationStatuses() {
  try {
    const countInterviewing = await Application.collection.updateMany(
      { status: 'Interviewing' },
      { $set: { status: 'Interview' } }
    );

    const countOffered = await Application.collection.updateMany(
      { status: 'Offered' },
      { $set: { status: 'Offer' } }
    );

    const totalModified = (countInterviewing.modifiedCount || 0) + (countOffered.modifiedCount || 0);
    if (totalModified > 0) {
      logger.info(
        `[Migration] Normalized ${countInterviewing.modifiedCount || 0} 'Interviewing' and ${countOffered.modifiedCount || 0} 'Offered' application records.`
      );
    }
    return { modifiedCount: totalModified };
  } catch (error) {
    logger.warn(`[Migration] Note: Application status migration check encountered an error: ${sanitizeString(error.message)}`);
    return { error: error.message };
  }
}
