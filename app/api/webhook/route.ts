import { NextResponse } from 'next/server';
import { db } from '../../lib/server-app';
import { FieldValue } from 'firebase-admin/firestore';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  const headersList = headers();
  const xenditWebhookToken = (await headersList).get('x-callback-token');

  // 1. Verify the webhook token from Xendit
  const myWebhookToken = process.env.XENDIT_WEBHOOK_TOKEN || process.env.NEXT_PUBLIC_XENDIT_WEBHOOK_SECRET;
  if (!myWebhookToken || xenditWebhookToken !== myWebhookToken) {
    console.warn('Invalid webhook token received');
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    const payload = await req.json();

    // 2. Check if it's a successful invoice payment event
    if ((payload.status === 'PAID' || payload.status === 'SETTLED') && payload.external_id) {
      const externalId = payload.external_id;

      // Fallback to parsing externalId if metadata is missing
      // externalId format: invoice_{userId}_{courseId}_{timestamp}
      let userId = payload.metadata?.userId;
      let courseId = payload.metadata?.courseId;

      if ((!userId || !courseId) && externalId && externalId.startsWith('invoice_')) {
        const parts = externalId.split('_');
        if (parts.length >= 4) {
          userId = parts[1];
          courseId = parts.slice(2, -1).join('_');
        }
      }

      if (!userId || !courseId) {
        console.error('Webhook metadata missing userId or courseId, and could not parse from external_id', { metadata: payload.metadata, externalId });
        // Return 200 so Xendit doesn't retry infinitely for bad data
        return NextResponse.json({ message: 'Missing metadata' }, { status: 200 });
      }

      // 3. Update the user's document in Firestore using the Admin SDK
      const userRef = db.collection('users').doc(userId);
      const userSnap = await userRef.get();

      if (userSnap.exists) {
        const purchasedCourses = userSnap.data()?.purchasedCourses || [];
        if (!purchasedCourses.includes(courseId)) {
          await userRef.update({
            purchasedCourses: FieldValue.arrayUnion(courseId)
          });

          try {
            const courseRef = db.collection('courses').doc(courseId);
            await courseRef.update({
              purchasedBy: FieldValue.arrayUnion(userId)
            });
          } catch (e) {
            console.error('Failed to update course purchasedBy', e);
          }
          
          console.log(`Successfully granted course ${courseId} to user ${userId} for invoice ${externalId}`);
        } else {
          console.log(`User ${userId} already owns course ${courseId}. Webhook for ${externalId} ignored.`);
        }
      } else {
        console.error(`User with ID ${userId} not found for invoice ${externalId}`);
      }

      return NextResponse.json({ message: 'Webhook received and processed' }, { status: 200 });
    } else {
      return NextResponse.json({ message: 'Event not handled' }, { status: 200 });
    }
  } catch (error: any) {
    console.error('Error processing Xendit webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}