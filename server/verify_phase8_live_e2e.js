import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL = 'http://localhost:5000/api/v1';

async function runLivePhase8Verification() {
  console.log('================================================================');
  console.log('CAREERAI PHASE 8: JOB APPLICATION TRACKER LIVE E2E AUDIT');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const testUserA = {
    fullName: `Candidate P8 Alpha ${timestamp}`,
    email: `p8_alpha_${timestamp}@example.com`,
    password: 'Password123!',
  };
  const testUserB = {
    fullName: `Candidate P8 Beta ${timestamp}`,
    email: `p8_beta_${timestamp}@example.com`,
    password: 'Password123!',
  };

  const results = {};

  // Step 0: Register Users
  console.log('[Setup] Registering Candidate Alpha and Candidate Beta...');
  const regARes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUserA),
  });
  const regAData = await regARes.json();
  const cookieA = regARes.headers.get('set-cookie')?.split(';')[0];
  const userAId = regAData.data.user.id;

  const regBRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUserB),
  });
  const cookieB = regBRes.headers.get('set-cookie')?.split(';')[0];
  const userBId = (await regBRes.json()).data.user.id;
  console.log(`Candidate Alpha (ID: ${userAId}) & Beta (ID: ${userBId}) registered.\n`);

  // 1. Create Application
  console.log('--- 1. POST /api/v1/applications ---');
  const createRes = await fetch(`${BASE_URL}/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({
      companyName: 'Stripe',
      positionTitle: 'Staff Backend Engineer',
      status: 'Applied',
      location: 'San Francisco, CA (Remote)',
      salary: { amount: 210000, currency: 'USD', period: 'Yearly' },
      initialNote: 'Submitted application through engineering contact.',
    }),
  });
  const createData = await createRes.json();
  const appId = createData.data?._id || createData.data?.id;

  if (createRes.status === 201 && appId) {
    results.create = { status: 'PASS', http: 201, appId };
    console.log(`[PASS] Created application: ID ${appId}`);
  } else {
    results.create = { status: 'FAIL', http: createRes.status, error: createData };
    console.error('[FAIL] Create application failed:', createData);
  }

  // 2. Schedule Interview Round
  console.log('\n--- 2. POST /api/v1/applications/:id/interviews ---');
  const invDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const invRes = await fetch(`${BASE_URL}/applications/${appId}/interviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({
      roundName: 'System Architecture & Concurrency',
      roundType: 'System Design',
      scheduledDate: invDate,
      format: 'Video Call',
      meetingLink: 'https://meet.google.com/xyz-live-test',
      notes: 'Prepare idempotency and payment distributed transaction patterns.',
    }),
  });
  const invData = await invRes.json();
  const roundId = invData.data?._id || invData.data?.id;

  if (invRes.status === 201 && roundId) {
    results.interview = { status: 'PASS', http: 201, roundId };
    console.log(`[PASS] Scheduled interview round: ID ${roundId}`);
  } else {
    results.interview = { status: 'FAIL', http: invRes.status, error: invData };
  }

  // 3. Add & Toggle Follow-up Reminder
  console.log('\n--- 3. POST & PATCH /api/v1/applications/:id/reminders ---');
  const remDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const remRes = await fetch(`${BASE_URL}/applications/${appId}/reminders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({
      title: 'Send follow-up note to recruiter',
      reminderDate: remDate,
      note: 'Reiterate excitement for core payments pipeline.',
    }),
  });
  const remData = await remRes.json();
  const remId = remData.data?._id || remData.data?.id;

  const toggleRes = await fetch(`${BASE_URL}/applications/${appId}/reminders/${remId}/toggle`, {
    method: 'PATCH',
    headers: { Cookie: cookieA },
  });
  const toggleData = await toggleRes.json();

  if (remRes.status === 201 && toggleRes.status === 200 && toggleData.data?.isCompleted === true) {
    results.reminder = { status: 'PASS', http: 200, reminderId: remId, isCompleted: true };
    console.log(`[PASS] Created & toggled reminder: ID ${remId}`);
  } else {
    results.reminder = { status: 'FAIL', remStatus: remRes.status, toggleStatus: toggleRes.status };
  }

  // 4. Status Transition
  console.log('\n--- 4. PATCH /api/v1/applications/:id/status ---');
  const statusRes = await fetch(`${BASE_URL}/applications/${appId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({ status: 'Interview' }),
  });
  const statusData = await statusRes.json();

  if (statusRes.status === 200 && statusData.data?.status === 'Interview') {
    results.statusTransition = { status: 'PASS', http: 200, newStatus: 'Interview' };
    console.log(`[PASS] Transitioned status to 'Interview'`);
  } else {
    results.statusTransition = { status: 'FAIL', error: statusData };
  }

  // 5. Analytics Calculation
  console.log('\n--- 5. GET /api/v1/applications/analytics ---');
  const anaRes = await fetch(`${BASE_URL}/applications/analytics`, {
    method: 'GET',
    headers: { Cookie: cookieA },
  });
  const anaData = await anaRes.json();
  const a = anaData.data;

  if (
    anaRes.status === 200 &&
    a.totalApplications === 1 &&
    a.activePipeline === 1 &&
    a.upcomingInterviewsCount === 1 &&
    typeof a.interviewConversionRate === 'number'
  ) {
    results.analytics = {
      status: 'PASS',
      http: 200,
      total: a.totalApplications,
      activePipeline: a.activePipeline,
      upcomingInterviews: a.upcomingInterviewsCount,
      conversionRate: a.interviewConversionRate,
    };
    console.log(`[PASS] Analytics calculated: Total=${a.totalApplications}, Active=${a.activePipeline}, UpcomingInv=${a.upcomingInterviewsCount}, Rate=${a.interviewConversionRate}%`);
  } else {
    results.analytics = { status: 'FAIL', error: anaData };
  }

  // 6. Atlas Direct Document Persistence
  console.log('\n--- 6. Direct MongoDB Atlas Persistence Verification ---');
  try {
    const { connectDB } = await import('./src/config/db.js');
    const { Application } = await import('./src/models/Application.js');
    await connectDB();

    const atlasDoc = await Application.findById(appId);
    if (atlasDoc && atlasDoc.companyName === 'Stripe' && atlasDoc.interviews?.length === 1) {
      results.atlas = {
        status: 'PASS',
        docId: atlasDoc._id.toString(),
        status: atlasDoc.status,
        company: atlasDoc.companyName,
        interviewsCount: atlasDoc.interviews.length,
        remindersCount: atlasDoc.reminders.length,
      };
      console.log(`[PASS] Verified doc in MongoDB Atlas: ID ${atlasDoc._id}, Company: ${atlasDoc.companyName}`);
    } else {
      results.atlas = { status: 'FAIL', reason: 'Document mismatch or not found' };
    }
  } catch (err) {
    results.atlas = { status: 'FAIL', error: err.message };
  } finally {
    await mongoose.disconnect();
  }

  // 7. IDOR & User Ownership Protection
  console.log('\n--- 7. Security: IDOR & Tenant Isolation ---');
  const unauthRes = await fetch(`${BASE_URL}/applications/${appId}`, { method: 'GET' });
  const crossUserReadRes = await fetch(`${BASE_URL}/applications/${appId}`, {
    method: 'GET',
    headers: { Cookie: cookieB },
  });
  const crossUserDelRes = await fetch(`${BASE_URL}/applications/${appId}`, {
    method: 'DELETE',
    headers: { Cookie: cookieB },
  });

  if (
    unauthRes.status === 401 &&
    crossUserReadRes.status === 404 &&
    crossUserDelRes.status === 404
  ) {
    results.idor = {
      status: 'PASS',
      unauthHttp: 401,
      crossUserReadHttp: 404,
      crossUserDeleteHttp: 404,
      verified: true,
    };
    console.log(`[PASS] IDOR Security verified: Unauth=401, CrossUserRead=404, CrossUserDel=404`);
  } else {
    results.idor = { status: 'FAIL', unauth: unauthRes.status, crossRead: crossUserReadRes.status };
  }

  console.log('\n================================================================');
  console.log('PHASE 8 LIVE AUDIT RESULTS:');
  console.log(JSON.stringify(results, null, 2));
  console.log('================================================================\n');
}

runLivePhase8Verification().catch((err) => {
  console.error('Audit Script Error:', err);
  process.exit(1);
});
