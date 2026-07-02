/**
 * Daily billing cron — roll SCHEDULED→PENDING, mark OVERDUE, generate missing schedules.
 * Secured via CRON_SECRET (Vercel sends Authorization: Bearer <CRON_SECRET>).
 */

import { NextRequest, NextResponse } from 'next/server';
import { schoolsCollection } from '@/lib/server/firebase-admin';
import {
  generateScheduleFromPlans,
  rollInvoiceScheduleStatuses,
} from '@/lib/server/payment-schedule';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    const auth = req.headers.get('authorization');
    if (secret && auth !== `Bearer ${secret}`) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const schoolsSnap = await schoolsCollection().get();
    let activated = 0;
    let overdue = 0;
    let created = 0;
    let skipped = 0;

    for (const schoolDoc of schoolsSnap.docs) {
      const schoolId = schoolDoc.id;
      const roll = await rollInvoiceScheduleStatuses(schoolId);
      activated += roll.activated;
      overdue += roll.overdue;

      const gen = await generateScheduleFromPlans(schoolId, 'billing-cron');
      created += gen.created;
      skipped += gen.skipped;
    }

    return NextResponse.json({
      ok: true,
      schools: schoolsSnap.size,
      activated,
      overdue,
      created,
      skipped,
    });
  } catch (e) {
    console.error('GET /api/finance/billing-cron error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
