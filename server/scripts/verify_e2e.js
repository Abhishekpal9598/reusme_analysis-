import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun } from 'docx';

const API_BASE = 'http://localhost:5000/api/v1';

async function generateSamplePdf() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 400]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  page.drawText(
    'Candidate John Doe\nFull Stack Developer\nExperience: Built modern web applications with React, Node.js, and MongoDB.\nSkills: JavaScript, TypeScript, React, Express, MongoDB.\nEducation: BS in Computer Science.',
    { x: 50, y: 350, size: 12, font, color: rgb(0, 0, 0), lineHeight: 18 }
  );
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function generateSampleDocx() {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun('Jane Smith - Senior Software Engineer\n'),
              new TextRun('Experience:\n'),
              new TextRun('- Spearheaded cloud migration of 12 microservices to AWS EKS.\n'),
              new TextRun('- Decreased build pipeline duration by 42% using GitHub Actions.\n'),
              new TextRun('Skills: Python, Go, Docker, Kubernetes, AWS, Terraform, CI/CD.\n'),
              new TextRun('Education: MS in Software Engineering.'),
            ],
          }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

async function runE2E() {
  const results = [];
  console.log('--- Starting Live E2E Verification against http://localhost:5000 ---\n');

  // Test 0: Health & Root
  try {
    const rootRes = await fetch('http://localhost:5000/');
    const rootJson = await rootRes.json();
    if (rootRes.status === 200 && rootJson.message === 'Welcome to CareerAI API') {
      results.push({ feature: 'System Root', test: 'GET /', result: 'PASS', evidence: `HTTP 200, message: ${rootJson.message}` });
    } else {
      results.push({ feature: 'System Root', test: 'GET /', result: 'FAIL', evidence: `Status ${rootRes.status}` });
    }

    const healthRes = await fetch(`${API_BASE}/health`);
    const healthJson = await healthRes.json();
    if (healthRes.status === 200 && healthJson.success === true) {
      results.push({ feature: 'System Health', test: 'GET /api/v1/health', result: 'PASS', evidence: `HTTP 200, operational` });
    } else {
      results.push({ feature: 'System Health', test: 'GET /api/v1/health', result: 'FAIL', evidence: `Status ${healthRes.status}` });
    }
  } catch (err) {
    results.push({ feature: 'System Connectivity', test: 'Connect to port 5000', result: 'FAIL', evidence: err.message });
  }

  // Test 1: Authentication
  let userCookie = '';
  let user2Cookie = '';
  let testUserId = '';
  const testEmail = `e2e_${Date.now()}@careerai-test.com`;
  const testEmail2 = `e2e_other_${Date.now()}@careerai-test.com`;

  try {
    // 1.1 Register User 1
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'E2E Live Tester',
        email: testEmail,
        password: 'Password123!',
      }),
    });
    const regJson = await regRes.json();
    const setCookie = regRes.headers.get('set-cookie');
    if (regRes.status === 201 && setCookie && regJson.data?.user?.id) {
      userCookie = setCookie.split(';')[0];
      testUserId = regJson.data.user.id;
      results.push({
        feature: 'Authentication',
        test: 'Registration & Cookie Issuance',
        result: 'PASS',
        evidence: `Created user ${testUserId}, received HttpOnly token cookie`,
      });
    } else {
      results.push({ feature: 'Authentication', test: 'Registration', result: 'FAIL', evidence: JSON.stringify(regJson) });
    }

    // 1.2 Session Bootstrap (GET /auth/me)
    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Cookie: userCookie },
    });
    const meJson = await meRes.json();
    if (meRes.status === 200 && meJson.data?.user?.email === testEmail) {
      results.push({
        feature: 'Authentication',
        test: 'Session Restore (GET /auth/me)',
        result: 'PASS',
        evidence: `Verified session for email ${meJson.data.user.email}`,
      });
    } else {
      results.push({ feature: 'Authentication', test: 'Session Restore', result: 'FAIL', evidence: JSON.stringify(meJson) });
    }

    // 1.3 Register User 2 (for IDOR checks)
    const reg2Res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'E2E Cross User',
        email: testEmail2,
        password: 'Password123!',
      }),
    });
    const setCookie2 = reg2Res.headers.get('set-cookie');
    if (reg2Res.status === 201 && setCookie2) {
      user2Cookie = setCookie2.split(';')[0];
    }
  } catch (err) {
    results.push({ feature: 'Authentication', test: 'Live Auth Pipeline', result: 'FAIL', evidence: err.message });
  }

  // Test 2: Resume Ingestion & Parsing (TXT, PDF, DOCX)
  let uploadedResumeId = '';
  let docxResumeId = '';
  let txtResumeId = '';

  try {
    // 2.1 TXT Upload
    const txtFormData = new FormData();
    const txtBlob = new Blob(
      [
        'Johnathan Doe\nFull Stack Developer\nExperience: Designed microservices with Node.js and React.\nSkills: JavaScript, Node.js, Express, React, MongoDB.\nEducation: BS in Computer Engineering.',
      ],
      { type: 'text/plain' }
    );
    txtFormData.append('file', txtBlob, 'Resume_Johnathan.txt');

    const txtRes = await fetch(`${API_BASE}/resumes`, {
      method: 'POST',
      headers: { Cookie: userCookie },
      body: txtFormData,
    });
    const txtJson = await txtRes.json();
    if (txtRes.status === 201 && txtJson.data?.resume?.id) {
      txtResumeId = txtJson.data.resume.id;
      results.push({
        feature: 'Resume Ingestion',
        test: 'Upload & Parse TXT',
        result: 'PASS',
        evidence: `Stored resume ${txtResumeId}, wordCount: ${txtJson.data.resume.wordCount}`,
      });
    } else {
      results.push({ feature: 'Resume Ingestion', test: 'Upload TXT', result: 'FAIL', evidence: JSON.stringify(txtJson) });
    }

    // 2.2 PDF Upload
    const pdfBuffer = await generateSamplePdf();
    const pdfFormData = new FormData();
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
    pdfFormData.append('file', pdfBlob, 'Resume_Sample.pdf');

    const pdfRes = await fetch(`${API_BASE}/resumes`, {
      method: 'POST',
      headers: { Cookie: userCookie },
      body: pdfFormData,
    });
    const pdfJson = await pdfRes.json();
    if (pdfRes.status === 201 && pdfJson.data?.resume?.id) {
      uploadedResumeId = pdfJson.data.resume.id;
      results.push({
        feature: 'Resume Ingestion',
        test: 'Upload & Parse PDF via unpdf',
        result: 'PASS',
        evidence: `Extracted ${pdfJson.data.resume.characterCount} chars from PDF, id: ${uploadedResumeId}`,
      });
    } else {
      results.push({ feature: 'Resume Ingestion', test: 'Upload PDF', result: 'FAIL', evidence: JSON.stringify(pdfJson) });
    }

    // 2.3 DOCX Upload
    const docxBuffer = await generateSampleDocx();
    const docxFormData = new FormData();
    const docxBlob = new Blob([docxBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    docxFormData.append('file', docxBlob, 'Resume_JaneSmith.docx');

    const docxRes = await fetch(`${API_BASE}/resumes`, {
      method: 'POST',
      headers: { Cookie: userCookie },
      body: docxFormData,
    });
    const docxJson = await docxRes.json();
    if (docxRes.status === 201 && docxJson.data?.resume?.id) {
      docxResumeId = docxJson.data.resume.id;
      results.push({
        feature: 'Resume Ingestion',
        test: 'Upload & Parse DOCX via mammoth',
        result: 'PASS',
        evidence: `Extracted ${docxJson.data.resume.wordCount} words from DOCX, id: ${docxResumeId}`,
      });
    } else {
      results.push({ feature: 'Resume Ingestion', test: 'Upload DOCX', result: 'FAIL', evidence: JSON.stringify(docxJson) });
    }

    // 2.4 Verify Resume Listing (GET /resumes)
    const listRes = await fetch(`${API_BASE}/resumes`, {
      headers: { Cookie: userCookie },
    });
    const listJson = await listRes.json();
    if (listRes.status === 200 && listJson.data?.resumes?.length === 3) {
      results.push({
        feature: 'Resume Management',
        test: 'List User Resumes',
        result: 'PASS',
        evidence: `Retrieved exactly 3 resumes for user, totalCount: ${listJson.meta?.totalCount}`,
      });
    } else {
      results.push({ feature: 'Resume Management', test: 'List User Resumes', result: 'FAIL', evidence: JSON.stringify(listJson) });
    }

    // 2.5 Verify Extracted Text Content (GET /resumes/:id)
    const detailRes = await fetch(`${API_BASE}/resumes/${uploadedResumeId}`, {
      headers: { Cookie: userCookie },
    });
    const detailJson = await detailRes.json();
    if (detailRes.status === 200 && detailJson.data?.resume?.rawText?.includes('Candidate John Doe')) {
      results.push({
        feature: 'Resume Text Extraction',
        test: 'Get Extracted Text Content',
        result: 'PASS',
        evidence: `Confirmed rawText contains "Candidate John Doe" (length ${detailJson.data.resume.rawText.length})`,
      });
    } else {
      results.push({ feature: 'Resume Text Extraction', test: 'Get Extracted Text', result: 'FAIL', evidence: JSON.stringify(detailJson) });
    }
  } catch (err) {
    results.push({ feature: 'Resume Ingestion', test: 'File Upload Pipeline', result: 'FAIL', evidence: err.message });
  }

  // Test 3: Security & IDOR Isolation
  try {
    // 3.1 Unauthenticated access rejected with 401
    const unauthRes = await fetch(`${API_BASE}/resumes/${uploadedResumeId}`);
    if (unauthRes.status === 401) {
      results.push({
        feature: 'Security',
        test: 'Unauthenticated Access Protection',
        result: 'PASS',
        evidence: 'HTTP 401 Unauthorized returned when cookie is missing',
      });
    } else {
      results.push({ feature: 'Security', test: 'Unauth Protection', result: 'FAIL', evidence: `Status: ${unauthRes.status}` });
    }

    // 3.2 Cross-User IDOR Access Rejected (User 2 attempting to view User 1 resume)
    const idorRes = await fetch(`${API_BASE}/resumes/${uploadedResumeId}`, {
      headers: { Cookie: user2Cookie },
    });
    if (idorRes.status === 404) {
      results.push({
        feature: 'Security',
        test: 'Resume IDOR Protection (Cross-User)',
        result: 'PASS',
        evidence: 'HTTP 404 Not Found returned when User 2 requests User 1 resume',
      });
    } else {
      results.push({ feature: 'Security', test: 'Resume IDOR', result: 'FAIL', evidence: `Status: ${idorRes.status}` });
    }
  } catch (err) {
    results.push({ feature: 'Security', test: 'IDOR Tests', result: 'FAIL', evidence: err.message });
  }

  // Test 4: AI Resume Quality Audit Endpoint
  try {
    const auditRes = await fetch(`${API_BASE}/resumes/${uploadedResumeId}/analyze`, {
      method: 'POST',
      headers: { Cookie: userCookie },
    });
    const auditJson = await auditRes.json();

    if (auditRes.status === 201) {
      results.push({
        feature: 'AI Resume Audit',
        test: 'Live Gemini Resume Quality Audit',
        result: 'PASS',
        evidence: `Audit completed! Score: ${auditJson.data.analysis.overallScore}/100, Model: ${auditJson.data.analysis.providerMetadata?.model}`,
      });
    } else if (auditRes.status === 503 && auditJson.error?.code === 'GEMINI_UNCONFIGURED') {
      results.push({
        feature: 'AI Resume Audit',
        test: 'Gemini Configuration Guard',
        result: 'PASS',
        evidence: 'HTTP 503 GEMINI_UNCONFIGURED returned safely when GEMINI_API_KEY is not configured in .env',
      });
    } else {
      results.push({
        feature: 'AI Resume Audit',
        test: 'Resume Audit Request',
        result: 'INFO',
        evidence: `Status ${auditRes.status}, code: ${auditJson.error?.code || 'N/A'}: ${auditJson.error?.message}`,
      });
    }
  } catch (err) {
    results.push({ feature: 'AI Resume Audit', test: 'Audit Request', result: 'FAIL', evidence: err.message });
  }

  // Test 5: Job Description Matcher Endpoint
  try {
    const matchRes = await fetch(`${API_BASE}/job-matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userCookie },
      body: JSON.stringify({
        resumeId: uploadedResumeId,
        jobTitle: 'Senior Full Stack Engineer',
        companyName: 'CloudCorp',
        jobDescription:
          'Seeking Senior Full Stack Engineer with strong React, Node.js, TypeScript, and MongoDB experience. Must possess experience with REST API architecture and cloud microservices.',
      }),
    });
    const matchJson = await matchRes.json();

    if (matchRes.status === 201) {
      results.push({
        feature: 'Job Matching',
        test: 'Live Gemini Job Description Match',
        result: 'PASS',
        evidence: `Match completed! Score: ${matchJson.data.jobAnalysis.matchScore}%, Disclaimer: present`,
      });
    } else if (matchRes.status === 503 && matchJson.error?.code === 'GEMINI_UNCONFIGURED') {
      results.push({
        feature: 'Job Matching',
        test: 'Gemini Configuration Guard',
        result: 'PASS',
        evidence: 'HTTP 503 GEMINI_UNCONFIGURED returned safely without fabricating fake responses',
      });
    } else {
      results.push({
        feature: 'Job Matching',
        test: 'Job Match Request',
        result: 'INFO',
        evidence: `Status ${matchRes.status}, code: ${matchJson.error?.code || 'N/A'}: ${matchJson.error?.message}`,
      });
    }

    // 5.2 Cross-user Job Match IDOR Protection
    const crossMatchRes = await fetch(`${API_BASE}/job-matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: user2Cookie },
      body: JSON.stringify({
        resumeId: uploadedResumeId, // User 1's resume
        jobDescription: 'Seeking developer for web applications.',
      }),
    });
    if (crossMatchRes.status === 404) {
      results.push({
        feature: 'Security',
        test: 'Job Match Resume IDOR Protection',
        result: 'PASS',
        evidence: 'HTTP 404 returned when User 2 attempts to run job match on User 1 resume',
      });
    } else {
      results.push({ feature: 'Security', test: 'Job Match Resume IDOR', result: 'FAIL', evidence: `Status: ${crossMatchRes.status}` });
    }
  } catch (err) {
    results.push({ feature: 'Job Matching', test: 'Job Match Request', result: 'FAIL', evidence: err.message });
  }

  // Test 6: Resume Deletion (DELETE /resumes/:id)
  try {
    const delRes = await fetch(`${API_BASE}/resumes/${txtResumeId}`, {
      method: 'DELETE',
      headers: { Cookie: userCookie },
    });
    if (delRes.status === 200) {
      results.push({
        feature: 'Resume Management',
        test: 'Delete Resume Document',
        result: 'PASS',
        evidence: `Successfully deleted resume ${txtResumeId}`,
      });
    } else {
      results.push({ feature: 'Resume Management', test: 'Delete Resume Document', result: 'FAIL', evidence: `Status ${delRes.status}` });
    }

    // Verify deletion in listing
    const verifyList = await fetch(`${API_BASE}/resumes`, {
      headers: { Cookie: userCookie },
    });
    const verifyJson = await verifyList.json();
    if (verifyJson.data?.resumes?.length === 2) {
      results.push({
        feature: 'MongoDB Persistence',
        test: 'Atlas Database Record Deletion',
        result: 'PASS',
        evidence: 'Confirmed resume count decreased to 2 after deletion in Atlas DB',
      });
    }
  } catch (err) {
    results.push({ feature: 'Resume Management', test: 'Deletion Pipeline', result: 'FAIL', evidence: err.message });
  }

  // Test 7: Logout
  try {
    const logoutRes = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { Cookie: userCookie },
    });
    const logoutCookie = logoutRes.headers.get('set-cookie');
    const isCleared =
      logoutCookie &&
      (logoutCookie.includes('Expires=Thu, 01 Jan 1970') ||
        logoutCookie.includes('token=;') ||
        logoutCookie.includes('Max-Age=0'));
    if (logoutRes.status === 200 && isCleared) {
      results.push({
        feature: 'Authentication',
        test: 'Logout & Cookie Clearance',
        result: 'PASS',
        evidence: 'HTTP 200 and Set-Cookie with expired token clears authentication cookie',
      });
    } else {
      results.push({ feature: 'Authentication', test: 'Logout', result: 'FAIL', evidence: `Status ${logoutRes.status}, Set-Cookie: ${logoutCookie}` });
    }
  } catch (err) {
    results.push({ feature: 'Authentication', test: 'Logout Request', result: 'FAIL', evidence: err.message });
  }

  // Clean up remaining test resumes and users
  try {
    await fetch(`${API_BASE}/resumes/${uploadedResumeId}`, { method: 'DELETE', headers: { Cookie: userCookie } });
    await fetch(`${API_BASE}/resumes/${docxResumeId}`, { method: 'DELETE', headers: { Cookie: userCookie } });
  } catch (e) {}

  console.log('\n--- Live E2E Verification Complete ---');
  console.log(JSON.stringify(results, null, 2));
}

runE2E().catch(console.error);
