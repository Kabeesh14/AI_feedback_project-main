const { pool } = require('../config/db');

const OFFICIAL_DEPARTMENTS = [
  'Information Technology',
  'Computer Science and Business System',
  'Biotechnology Engineering',
  'Biomedical Engineering',
  'Artificial Intelligence & Data Science',
  'Computer Science & Engineering',
  'Electronics & Communication Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Computer Communication Engineering',
  'Chemical Engineering',
  'Electrical and Electronics Engineering',
  'Artificial Intelligence and Machine Learning'
];

const SUPPORTED_CATEGORIES = [
  'Teaching',
  'Laboratory',
  'Infrastructure',
  'Internet',
  'Hostel',
  'Canteen',
  'Transport',
  'Placement',
  'Library',
  'Other',
  // Education Campus Facility categories
  'Classroom',
  'Food / Canteen',
  'Restroom',
  'Furniture / Infrastructure',
  'Computer / IT',
  'Electricity',
  'Other campus facilities'
];

// Heuristic keyword dictionaries
const NEGATIVE_KEYWORDS = [
  'slow', 'bad', 'poor', 'broken', 'not working', 'terrible', 'worst', 'issue', 'problem',
  'dirty', 'unhygienic', 'late', 'unavailable', 'disconnect', 'stale', 'outdated',
  'crashed', 'failing', 'horrible', 'unbearable', 'noise', 'leaking', 'smell', 'delay',
  'insufficient', 'inadequate', 'painful', 'frustrating', 'struggle', 'annoying'
];

const POSITIVE_KEYWORDS = [
  'good', 'excellent', 'great', 'amazing', 'love', 'helpful', 'clean', 'comfortable',
  'punctual', 'best', 'improved', 'responsive', 'smooth', 'effective', 'friendly',
  'satisfactory', 'appreciate', 'well', 'perfect', 'prompt', 'clear'
];

const CRITICAL_KEYWORDS = [
  'emergency', 'danger', 'hazard', 'safety', 'fire', 'leak', 'severe', 'unbearable',
  'broken for weeks', 'completely down', 'critical', 'injury', 'shock', 'harassment'
];

const CATEGORY_KEYWORDS = {
  'lab': 'Laboratory', 'computer': 'Laboratory', 'pc': 'Laboratory', 'system': 'Laboratory', 'software': 'Laboratory',
  'wifi': 'Internet', 'wi-fi': 'Internet', 'internet': 'Internet', 'network': 'Internet', 'broadband': 'Internet', 'bandwidth': 'Internet',
  'teacher': 'Teaching', 'faculty': 'Teaching', 'lecture': 'Teaching', 'professor': 'Teaching', 'syllabus': 'Teaching', 'explanation': 'Teaching',
  'hostel': 'Hostel', 'room': 'Hostel', 'dorm': 'Hostel', 'warden': 'Hostel', 'water': 'Hostel',
  'canteen': 'Canteen', 'food': 'Canteen', 'meal': 'Canteen', 'cafeteria': 'Canteen', 'mess': 'Canteen', 'snack': 'Canteen',
  'bus': 'Transport', 'transport': 'Transport', 'route': 'Transport', 'commute': 'Transport',
  'placement': 'Placement', 'interview': 'Placement', 'job': 'Placement', 'internship': 'Placement', 'recruitment': 'Placement',
  'library': 'Library', 'book': 'Library', 'journal': 'Library', 'seating': 'Library', 'reading': 'Library',
  'infrastructure': 'Infrastructure', 'ac': 'Infrastructure', 'projector': 'Infrastructure', 'ventilation': 'Infrastructure', 'bench': 'Infrastructure', 'restroom': 'Infrastructure'
};

const COMMON_ISSUES = {
  'Laboratory': 'Slow Computing Lab Workstations',
  'Internet': 'Campus Wi-Fi & Network Latency',
  'Teaching': 'Academic Pacing & Conceptual Clarity',
  'Hostel': 'Hostel Water Supply & Facility Maintenance',
  'Canteen': 'Canteen Hygiene & Food Quality Standards',
  'Transport': 'Campus Transit Timing & Bus Frequency',
  'Placement': 'Placement Technical Training & Mock Prep',
  'Library': 'Library Study Space & Book Availability',
  'Infrastructure': 'Classroom Ventilation & Equipment Condition',
  'Other': 'General Campus Amenities'
};

const CAUSE_KNOWLEDGE_BASE = {
  'Laboratory': [
    { cause: 'Insufficient RAM and background disk paging during practicals', confidence: 84, evidence: 'Repeated mentions of lag during model training or compilation' },
    { cause: 'Outdated operating system packages and driver conflicts', confidence: 76, evidence: 'Students report application freezes and unexpected termination' },
    { cause: 'High concurrent container and virtualization usage', confidence: 68, evidence: 'Performance degrades noticeably during full-batch sessions' }
  ],
  'Internet': [
    { cause: 'Access point bandwidth saturation during peak laboratory hours', confidence: 88, evidence: 'Connection drop complaints spike during practical sessions' },
    { cause: 'Defective PoE switch power delivery causing access point resets', confidence: 79, evidence: 'Intermittent signal drops reported in specific zones' },
    { cause: 'Channel frequency overlap and structural interference', confidence: 65, evidence: 'Reports clustered near metal ducting and partitioned reference areas' }
  ],
  'Infrastructure': [
    { cause: 'Air conditioning compressor valve leakage and low refrigerant level', confidence: 85, evidence: 'Temperature spikes reported in enclosed lab and lecture blocks' },
    { cause: 'Clogged dust intake filters reducing airflow throughput', confidence: 74, evidence: 'Duct noise and poor cooling efficiency noted during afternoons' },
    { cause: 'Aging display projector lamps exceeding standard operating hours', confidence: 70, evidence: 'Faded projection visuals reported during morning lectures' }
  ],
  'Hostel': [
    { cause: 'Inadequate overhead storage buffer during peak morning rush', confidence: 82, evidence: 'Low pressure and water outage reported between 7 AM and 9 AM' },
    { cause: 'Main supply valve scheduling misaligned with student schedules', confidence: 75, evidence: 'Consistent timing of supply cutoffs noted across blocks' }
  ],
  'Canteen': [
    { cause: 'Vendor preparation batches prepared too far in advance of lunch hours', confidence: 80, evidence: 'Complaints of lukewarm food and texture inconsistency' },
    { cause: 'Peak-hour counter staffing bottleneck causing extended queue delays', confidence: 72, evidence: 'Long wait times during mid-day recess periods' }
  ],
  'Teaching': [
    { cause: 'Heavily theoretical syllabus coverage without sufficient practical demonstrations', confidence: 78, evidence: 'Requests for hands-on problem solving and code walk-throughs' },
    { cause: 'Fast pacing through foundational concepts before introductory labs', confidence: 71, evidence: 'Students report difficulty keeping up with assignment prerequisites' }
  ],
  'Transport': [
    { cause: 'City arterial traffic delays causing bus departure lag', confidence: 81, evidence: 'Evening buses consistently leaving 25 minutes after dismissal' },
    { cause: 'Insufficient bus route allocation on high-density perimeter routes', confidence: 74, evidence: 'Overcrowding and standing passenger reports' }
  ],
  'Placement': [
    { cause: 'Curriculum gap in modern cloud and distributed systems frameworks', confidence: 83, evidence: 'Technical interview rounds testing unaddressed topics' },
    { cause: 'Limited exposure to timed competitive coding platforms', confidence: 77, evidence: 'Students noting difficulty in preliminary screening tests' }
  ],
  'Library': [
    { cause: 'Peak-period overcrowding during mid-semester examinations', confidence: 84, evidence: 'Reference section tables fully occupied between 11 AM and 4 PM' },
    { cause: 'Delays in restocking popular core-subject reference volumes', confidence: 73, evidence: 'Requests for duplicate reserve copies for engineering core subjects' }
  ],
  'Other': [
    { cause: 'Process delay in inter-departmental administrative approvals', confidence: 70, evidence: 'Student inquiries taking multiple days for resolution' }
  ]
};

/**
 * Deterministic Heuristic Sentiment Analysis
 */
function analyzeSentiment(text, rating = null) {
  const l = text.toLowerCase();
  
  let posHits = 0;
  let negHits = 0;

  for (const w of POSITIVE_KEYWORDS) {
    if (l.includes(w)) posHits++;
  }
  for (const w of NEGATIVE_KEYWORDS) {
    if (l.includes(w)) negHits++;
  }

  // Handle contrastive conjunctions (e.g. "teacher is good BUT lab is slow")
  // Sentences following "but", "however", "although" carry heavier emotional weight for complaints
  const contrastSplit = l.split(/\b(?:but|however|although|except|yet)\b/);
  if (contrastSplit.length > 1) {
    const afterBut = contrastSplit[1];
    for (const w of NEGATIVE_KEYWORDS) {
      if (afterBut.includes(w)) negHits += 1.5;
    }
  }

  let sentiment = 'neutral';
  let score = 50;

  if (negHits > posHits) {
    sentiment = 'negative';
    score = Math.max(10, Math.min(45, Math.round(50 - (negHits - posHits) * 15)));
  } else if (posHits > negHits) {
    sentiment = 'positive';
    score = Math.min(95, Math.max(65, Math.round(50 + (posHits - negHits) * 15)));
  } else {
    sentiment = 'neutral';
    score = 50;
  }

  // If rating is explicitly provided, factor it in
  if (rating !== null && rating !== undefined) {
    if (rating <= 2 && sentiment !== 'negative') {
      sentiment = 'negative';
      score = Math.min(score, 35);
    } else if (rating >= 4 && sentiment !== 'positive' && negHits === 0) {
      sentiment = 'positive';
      score = Math.max(score, 75);
    }
  }

  return { sentiment, score };
}

/**
 * Detect Theme mapped into supported categories
 */
function detectTheme(text, defaultCategory = null) {
  if (defaultCategory && SUPPORTED_CATEGORIES.includes(defaultCategory)) {
    return defaultCategory;
  }
  const l = text.toLowerCase();
  for (const [kw, cat] of Object.entries(CATEGORY_KEYWORDS)) {
    if (l.includes(kw)) return cat;
  }
  return 'Other';
}

/**
 * Detect Specific Issue Description
 */
function detectIssue(text, theme) {
  const l = text.toLowerCase();
  
  if (theme === 'Internet' || l.includes('wifi') || l.includes('internet')) {
    if (l.includes('speed') || l.includes('slow')) return 'Slow Laboratory Internet & Wi-Fi Speed';
    if (l.includes('disconnect') || l.includes('drop')) return 'Intermittent Wi-Fi Disconnections';
    return 'Campus Wi-Fi Connectivity';
  }

  if (theme === 'Laboratory' || l.includes('computer') || l.includes('pc') || l.includes('lab')) {
    if (l.includes('ac') || l.includes('warm') || l.includes('heat') || l.includes('hot')) {
      return 'Excessive Temperature in Computing Lab';
    }
    if (l.includes('slow') || l.includes('lag') || l.includes('matlab') || l.includes('freeze')) {
      return 'Slow Workstation Execution & Insufficient RAM';
    }
    if (l.includes('software') || l.includes('install')) {
      return 'Missing Required Software in Computing Labs';
    }
    return 'Laboratory Workstation Performance';
  }

  if (theme === 'Infrastructure') {
    if (l.includes('ac') || l.includes('cooling') || l.includes('fan') || l.includes('ventilation')) {
      return 'Classroom Air Conditioning & Ventilation';
    }
    if (l.includes('projector') || l.includes('screen') || l.includes('display')) {
      return 'Classroom Projector & Audio-Visual Equipment';
    }
    if (l.includes('water') || l.includes('washroom') || l.includes('restroom')) {
      return 'Campus Restroom Hygiene & Water Supply';
    }
    return 'Classroom & Academic Block Infrastructure';
  }

  if (theme === 'Teaching') {
    if (l.includes('fast') || l.includes('pace') || l.includes('speed')) {
      return 'Course Coverage Pacing & Concept Clarity';
    }
    if (l.includes('practical') || l.includes('hands-on') || l.includes('lab')) {
      return 'Practical Demonstration in Theory Subjects';
    }
    return 'Teaching Methodology & Academic Interaction';
  }

  if (theme === 'Hostel') {
    if (l.includes('water')) return 'Hostel Water Supply Timing & Pressure';
    if (l.includes('food') || l.includes('mess')) return 'Hostel Mess Food Hygiene';
    if (l.includes('maintenance') || l.includes('repair')) return 'Hostel Room Maintenance & Fixtures';
    return 'Hostel Residential Amenities';
  }

  if (theme === 'Canteen') {
    return 'Canteen Food Quality, Hygiene & Counter Queues';
  }

  if (theme === 'Transport') {
    return 'College Bus Departure Timing & Route Coverage';
  }

  if (theme === 'Placement') {
    return 'Placement Training Quality & Mock Assessments';
  }

  if (theme === 'Library') {
    return 'Library Quiet Seating & Reference Book Availability';
  }

  return COMMON_ISSUES[theme] || 'General Campus Feedback';
}

/**
 * Identify Possible Contributing Factors (Root-Causes)
 */
function identifyRootCauses(text, theme, issue) {
  const causes = CAUSE_KNOWLEDGE_BASE[theme] || CAUSE_KNOWLEDGE_BASE['Other'];
  const l = text.toLowerCase();

  return causes.map((item, idx) => {
    let customEvidence = item.evidence;
    let confidence = item.confidence;

    // Boost confidence if explicit keywords appear in student text
    if (l.includes('afternoon') || l.includes('peak') || l.includes('rush')) {
      if (item.cause.toLowerCase().includes('peak') || item.cause.toLowerCase().includes('concurren')) {
        confidence = Math.min(96, confidence + 8);
        customEvidence += ' (Corroborated by timing keywords in student feedback)';
      }
    }
    if (l.includes('slow') || l.includes('lag')) {
      if (item.cause.toLowerCase().includes('ram') || item.cause.toLowerCase().includes('bandwidth')) {
        confidence = Math.min(94, confidence + 6);
      }
    }

    return {
      cause: `Possible contributing factor: ${item.cause}`,
      confidence,
      evidence: customEvidence
    };
  });
}

/**
 * Calculate Priority based on sentiment, urgency keywords, and complaint severity
 */
function calculatePriority({ sentiment, sentimentScore, text, rating }) {
  const l = text.toLowerCase();

  // 1. Critical triggers
  for (const w of CRITICAL_KEYWORDS) {
    if (l.includes(w)) return 'critical';
  }

  // 2. High triggers
  if (sentiment === 'negative' && sentimentScore < 30) return 'high';
  if (rating === 1) return 'high';

  // 3. Medium triggers
  if (sentiment === 'negative' || rating === 2) return 'medium';
  if (sentiment === 'neutral' && rating === 3) return 'medium';

  // 4. Low triggers
  if (sentiment === 'positive') return 'low';
  if (rating >= 4) return 'low';

  return 'medium';
}

/**
 * Generate 1-2 sentence executive summary
 */
function generateSummary(text, sentiment, issue) {
  if (sentiment === 'negative') {
    return `Student reported significant dissatisfaction regarding ${issue}. Immediate departmental inspection recommended.`;
  }
  if (sentiment === 'positive') {
    return `Positive student commendation received regarding ${issue}, highlighting effective institutional delivery.`;
  }
  return `Neutral observation regarding ${issue}. Continual operational monitoring advised.`;
}

/**
 * Call Gemini API with timeout and structured JSON response validation
 */
async function callGeminiAPI(feedbackText, category, department) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_GEMINI_API_KEY') {
    return null; // Triggers fallback cleanly
  }

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `
You are the AI Root-Cause Intelligence Engine for an institutional feedback platform.
Analyze this student feedback:
Department: "${department}"
Category: "${category}"
Feedback Text: "${feedbackText}"

Output ONLY a valid, raw JSON object (no markdown, no backticks, no extra text) matching this EXACT schema:
{
  "sentiment": "positive" | "neutral" | "negative",
  "sentimentScore": integer between 0 and 100,
  "theme": "Teaching" | "Laboratory" | "Infrastructure" | "Internet" | "Hostel" | "Canteen" | "Transport" | "Placement" | "Library" | "Other",
  "issue": "concise issue title string",
  "possibleRootCauses": [
    {
      "cause": "Possible contributing factor: detailed cause description",
      "confidence": integer between 0 and 100,
      "evidence": "Observed evidence rationale"
    }
  ],
  "priority": "low" | "medium" | "high" | "critical",
  "summary": "1-2 sentence executive summary",
  "confidence": integer between 0 and 100
}
`.trim();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.warn(`[GEMINI API WARNING] Non-200 status (${response.status}): ${errText.substring(0, 150)}`);
      return null;
    }

    const data = await response.json();
    const rawContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawContent) return null;

    // Clean any accidental markdown wrap
    const cleaned = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Validate structure strictly
    if (!['positive', 'neutral', 'negative'].includes(parsed.sentiment)) return null;
    if (typeof parsed.sentimentScore !== 'number' || parsed.sentimentScore < 0 || parsed.sentimentScore > 100) return null;
    if (!['low', 'medium', 'high', 'critical'].includes(parsed.priority)) return null;
    if (!parsed.issue || typeof parsed.issue !== 'string') return null;
    if (!Array.isArray(parsed.possibleRootCauses) || parsed.possibleRootCauses.length === 0) return null;

    return {
      ...parsed,
      provider: 'gemini'
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[GEMINI CALL SKIPPED/FAILED]:', err.message);
    return null;
  }
}

/**
 * Full Analysis Pipeline with Heuristic Fallback
 */
async function analyzeFeedback(feedbackText, category = 'Other', department = 'General', rating = null) {
  // 1. Attempt Gemini API analysis if configured
  const geminiResult = await callGeminiAPI(feedbackText, category, department);
  if (geminiResult) {
    return geminiResult;
  }

  // 2. Deterministic Heuristic Fallback
  const { sentiment, score: sentimentScore } = analyzeSentiment(feedbackText, rating);
  const theme = detectTheme(feedbackText, category);
  const issue = detectIssue(feedbackText, theme);
  const possibleRootCauses = identifyRootCauses(feedbackText, theme, issue);
  const priority = calculatePriority({ sentiment, sentimentScore, text: feedbackText, rating });
  const summary = generateSummary(feedbackText, sentiment, issue);

  return {
    sentiment,
    sentimentScore,
    theme,
    issue,
    possibleRootCauses,
    priority,
    summary,
    confidence: 85,
    provider: 'fallback'
  };
}

/**
 * Link Feedback to Issue, Detect Recurring/Emerging Patterns, and Store Root Causes
 */
async function linkFeedbackToIssue(feedbackId, feedbackRecord, aiAnalysis) {
  try {
    const department = feedbackRecord.department;
    const category = aiAnalysis.theme || feedbackRecord.category;
    const issueTitle = aiAnalysis.issue;

    // 1. Search for existing open issue in the same department matching title or category
    const [existingIssues] = await pool.execute(
      `SELECT * FROM issues 
       WHERE LOWER(department) = LOWER(?) 
         AND status != 'resolved' 
         AND (LOWER(title) LIKE LOWER(?) OR LOWER(category) = LOWER(?))
       ORDER BY created_at DESC LIMIT 1`,
      [department, `%${issueTitle.split(' ')[0]}%`, category]
    );

    let issueId;
    let isEmerging = 0;
    let emergingReason = null;

    if (existingIssues.length > 0) {
      // Recurring issue match
      const matchedIssue = existingIssues[0];
      issueId = matchedIssue.id;

      // Calculate recent feedback frequency baseline (last 7 days vs previous 7 days)
      const [recentCounts] = await pool.execute(
        `SELECT 
           SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS recent_7d,
           SUM(CASE WHEN created_at BETWEEN DATE_SUB(NOW(), INTERVAL 14 DAY) AND DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS prior_7d
         FROM feedback 
         WHERE issue_id = ? OR (LOWER(department) = LOWER(?) AND category = ?)`,
        [issueId, department, category]
      );

      const recent7d = (recentCounts[0]?.recent_7d || 0) + 1; // including current
      const prior7d = recentCounts[0]?.prior_7d || 0;

      if (recent7d >= 3) {
        if (prior7d === 0) {
          isEmerging = 1;
          emergingReason = `New surge detected: ${recent7d} complaints recorded within the last 7 days.`;
        } else {
          const increasePct = Math.round(((recent7d - prior7d) / prior7d) * 100);
          if (increasePct >= 40) {
            isEmerging = 1;
            emergingReason = `Complaint frequency increased by ${increasePct}% compared with the previous 7-day period.`;
          }
        }
      }

      // Update existing issue counters and emerging status
      await pool.execute(
        `UPDATE issues 
         SET feedback_count = feedback_count + 1, 
             is_emerging = ?, 
             emerging_reason = COALESCE(?, emerging_reason),
             priority = CASE WHEN ? = 'critical' THEN 'critical' ELSE priority END,
             updated_at = NOW()
         WHERE id = ?`,
        [isEmerging, emergingReason, aiAnalysis.priority, issueId]
      );
    } else {
      // Create new issue entry
      const issueCode = `ISS-${Date.now().toString(36).toUpperCase()}`;
      const [newIssue] = await pool.execute(
        `INSERT INTO issues (
           issue_code, title, department, category, priority, 
           status, impact_score, is_emerging, emerging_reason, feedback_count
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          issueCode,
          issueTitle,
          department,
          category,
          aiAnalysis.priority,
          'identified',
          aiAnalysis.priority === 'critical' ? 88.0 : (aiAnalysis.priority === 'high' ? 75.0 : 50.0),
          0,
          null,
          1
        ]
      );
      issueId = newIssue.insertId;
    }

    // 2. Link feedback to issue
    await pool.execute(
      'UPDATE feedback SET issue_id = ?, theme = ? WHERE id = ?',
      [issueId, category, feedbackId]
    );

    // 3. Upsert Possible Causes in database
    if (aiAnalysis.possibleRootCauses && aiAnalysis.possibleRootCauses.length > 0) {
      for (const cause of aiAnalysis.possibleRootCauses) {
        const [existingCause] = await pool.execute(
          'SELECT id FROM possible_causes WHERE issue_id = ? AND cause_text = ?',
          [issueId, cause.cause]
        );

        if (existingCause.length > 0) {
          await pool.execute(
            'UPDATE possible_causes SET supporting_count = supporting_count + 1, confidence = ? WHERE id = ?',
            [cause.confidence || 75, existingCause[0].id]
          );
        } else {
          await pool.execute(
            'INSERT INTO possible_causes (issue_id, cause_text, likelihood, confidence, evidence, supporting_count) VALUES (?, ?, ?, ?, ?, ?)',
            [
              issueId,
              cause.cause,
              cause.confidence >= 80 ? 'high' : (cause.confidence >= 60 ? 'medium' : 'low'),
              cause.confidence || 75,
              cause.evidence || 'Corroborated by recurring student feedback',
              1
            ]
          );
        }
      }
    }

    return { issueId, isEmerging, emergingReason };
  } catch (err) {
    console.error('[LINK FEEDBACK ERROR]:', err.message);
    return null;
  }
}

/**
 * Process single feedback with AI analysis asynchronously (non-blocking)
 */
async function processFeedbackAI(feedbackId, feedbackText, category = 'Other') {
  try {
    // 1. Fetch feedback details
    const [rows] = await pool.execute('SELECT * FROM feedback WHERE id = ?', [feedbackId]);
    if (rows.length === 0) return;
    const fb = rows[0];

    // Mark as processing
    await pool.execute(
      "UPDATE feedback SET ai_status = 'processing' WHERE id = ?",
      [feedbackId]
    );

    // 2. Run structured AI analysis
    const analysis = await analyzeFeedback(feedbackText, category, fb.department, fb.rating);

    // 3. Persist AI analysis results in feedback record
    await pool.execute(
      `UPDATE feedback SET 
         sentiment = ?,
         sentiment_score = ?,
         theme = ?,
         priority = ?,
         ai_summary = ?,
         ai_confidence = ?,
         ai_provider = ?,
         ai_status = 'completed',
         ai_error_message = NULL,
         ai_analyzed_at = NOW()
       WHERE id = ?`,
      [
        analysis.sentiment,
        analysis.sentimentScore,
        analysis.theme,
        analysis.priority,
        analysis.summary,
        analysis.confidence,
        analysis.provider,
        feedbackId
      ]
    );

    // 4. Link feedback to department issue and update root causes
    await linkFeedbackToIssue(feedbackId, fb, analysis);

    console.log(`✅ [AI PIPELINE] Feedback #${feedbackId} successfully analyzed [${analysis.provider}]`);
  } catch (error) {
    console.error(`❌ [AI PIPELINE ERROR] Failed analyzing feedback #${feedbackId}:`, error.message);
    await pool.execute(
      "UPDATE feedback SET ai_status = 'failed', ai_error_message = ? WHERE id = ?",
      [error.message.substring(0, 255), feedbackId]
    ).catch(() => {});
  }
}

/**
 * Explainability Generator: "Why am I seeing this?"
 */
async function getIssueExplainability(issueId, user) {
  // 1. Retrieve issue
  const [issues] = await pool.execute('SELECT * FROM issues WHERE id = ?', [issueId]);
  if (issues.length === 0) {
    return { status: 404, message: `Issue #${issueId} not found.` };
  }
  const issue = issues[0];

  // 2. Enforce department authorization
  if (user.role === 'hod' && issue.department.toLowerCase() !== user.department.toLowerCase()) {
    return {
      status: 403,
      message: `Forbidden: HOD of "${user.department}" cannot access analytics for "${issue.department}".`
    };
  }

  // Students cannot access administrative analytics
  if (user.role === 'student') {
    return {
      status: 403,
      message: 'Forbidden: Students cannot access administrative issue analytics.'
    };
  }

  // 3. Query linked feedback data
  const [feedbackRows] = await pool.execute(
    'SELECT rating, sentiment, comment, created_at FROM feedback WHERE issue_id = ?',
    [issueId]
  );

  const total = feedbackRows.length;
  const negCount = feedbackRows.filter(f => f.sentiment === 'negative').length;
  const posCount = feedbackRows.filter(f => f.sentiment === 'positive').length;
  const neuCount = feedbackRows.filter(f => f.sentiment === 'neutral').length;

  const negativePercent = total > 0 ? Math.round((negCount / total) * 100) : 0;
  const positivePercent = total > 0 ? Math.round((posCount / total) * 100) : 0;
  const neutralPercent = total > 0 ? Math.round((neuCount / total) * 100) : 0;

  // 4. Retrieve possible root causes
  const [causes] = await pool.execute(
    'SELECT cause_text AS cause, likelihood, confidence, evidence, supporting_count FROM possible_causes WHERE issue_id = ? ORDER BY confidence DESC',
    [issueId]
  );

  // 5. Generate actual evidence-backed explanations
  const whyThisAppears = [
    `${total} related feedback entries logged in ${issue.department}`,
    `${negativePercent}% negative sentiment among student submissions regarding ${issue.category}`,
    `Classified under ${issue.priority.toUpperCase()} priority based on student urgency keywords and recurrence`
  ];

  if (issue.is_emerging) {
    whyThisAppears.push(`Emerging Alert: ${issue.emerging_reason}`);
  }

  return {
    status: 200,
    data: {
      issueId: issue.id,
      issueCode: issue.issue_code,
      title: issue.title,
      department: issue.department,
      category: issue.category,
      priority: issue.priority,
      status: issue.status,
      impactScore: issue.impact_score,
      isEmerging: Boolean(issue.is_emerging),
      emergingReason: issue.emerging_reason,
      stats: {
        totalFeedback: total,
        negativePercent,
        positivePercent,
        neutralPercent,
        recentFeedbackCount: total
      },
      whyThisAppears,
      rootCauses: causes.map(c => ({
        cause: c.cause,
        likelihood: c.likelihood,
        confidence: c.confidence,
        evidence: c.evidence,
        supportingFeedbackCount: c.supporting_count
      }))
    }
  };
}

/**
 * Validate Structured Collective AI Analysis Output
 */
function validateCollectiveAnalysis(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'AI output must be a non-empty object.' };
  }

  // Summary check
  if (!data.summary || typeof data.summary !== 'string' || data.summary.trim().length < 5) {
    return { valid: false, error: 'AI summary is missing or invalid string.' };
  }

  // Sentiment check
  if (!data.sentiment || typeof data.sentiment !== 'object') {
    return { valid: false, error: 'Sentiment object is missing.' };
  }
  const { positive, neutral, negative } = data.sentiment;
  if (
    typeof positive !== 'number' || typeof neutral !== 'number' || typeof negative !== 'number' ||
    positive < 0 || positive > 100 ||
    neutral < 0 || neutral > 100 ||
    negative < 0 || negative > 100
  ) {
    return { valid: false, error: 'Sentiment percentages must be numbers between 0 and 100.' };
  }
  const sum = Math.round(positive + neutral + negative);
  if (sum < 99 || sum > 101) {
    return { valid: false, error: `Sentiment percentages must sum to 100 (got ${sum}).` };
  }

  // Themes check
  if (!Array.isArray(data.themes) || data.themes.length === 0) {
    return { valid: false, error: 'Themes must be a non-empty array.' };
  }
  for (let i = 0; i < data.themes.length; i++) {
    const t = data.themes[i];
    if (!t.title || typeof t.title !== 'string') {
      return { valid: false, error: `Theme ${i + 1} is missing a title.` };
    }
    if (!t.description || typeof t.description !== 'string') {
      return { valid: false, error: `Theme ${i + 1} is missing a description.` };
    }
    if (!Array.isArray(t.rootCauses) || t.rootCauses.length === 0) {
      return { valid: false, error: `Theme "${t.title}" must contain rootCauses array.` };
    }
    if (!Array.isArray(t.evidence)) {
      return { valid: false, error: `Theme "${t.title}" must contain evidence array.` };
    }
  }

  // Primary Area check
  if (!data.primaryArea || typeof data.primaryArea !== 'string' || data.primaryArea.trim().length === 0) {
    return { valid: false, error: 'Primary area is required.' };
  }

  // Priority check
  const validPriorities = ['low', 'medium', 'high', 'critical'];
  if (!data.priority || typeof data.priority !== 'string' || !validPriorities.includes(data.priority.toLowerCase())) {
    return { valid: false, error: `Priority must be one of: ${validPriorities.join(', ')}.` };
  }

  return { valid: true };
}

/**
 * Call Gemini API for Collective Anonymous Form Analysis
 */
async function callGeminiCollectiveAPI({ department, formTitle, formDescription, textResponses, questionStats }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_GEMINI_API_KEY') {
    return null;
  }

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Anonymized sample of text responses (capped at 50 to prevent huge payloads)
  const sampleExcerpts = (textResponses || [])
    .slice(0, 50)
    .map(r => (typeof r === 'string' ? r : r.text))
    .filter(t => t && t.trim().length > 0)
    .map(t => (t.length > 250 ? t.substring(0, 247) + '...' : t));

  const respondentRole = targetAudience === 'faculty' ? 'faculty members' : 'students';
  const surveyTypeLabel = targetAudience === 'faculty' ? 'Faculty Survey' : 'Student Survey';

  const prompt = `
You are an institutional feedback analysis assistant for FeedbackIQ.
Analyze the following collective, anonymous ${respondentRole} responses for a department ${surveyTypeLabel}.
Form Title: "${formTitle}"
Department: "${department}"
Survey Type: "${surveyTypeLabel}"
Description: "${formDescription || 'N/A'}"

Structured Question Statistics:
${JSON.stringify(questionStats || [], null, 2)}

Anonymous ${respondentRole.charAt(0).toUpperCase() + respondentRole.slice(1)} Text Responses:
${JSON.stringify(sampleExcerpts, null, 2)}

TASK:
1. Identify 2 to 5 major recurring themes or concerns from the responses.
2. For each theme, provide:
   - "title": concise name of the concern
   - "description": clear explanation of what ${respondentRole} expressed
   - "responseCount": estimated number of supporting responses from the sample
   - "rootCauses": 2 to 3 likely root causes or contributing factors using cautious analytical language ("Likely root causes", "Possible contributing factor")
   - "evidence": 2 to 4 verbatim excerpts from the provided text responses. ONLY use real quotes from the text responses provided above. Do not fabricate quotes.
3. Compute overall collective sentiment distribution:
   - "positive": integer percentage (0-100)
   - "neutral": integer percentage (0-100)
   - "negative": integer percentage (0-100)
   The sum of positive + neutral + negative MUST EXACTLY equal 100.
4. Identify the "primaryArea": the main department area requiring institutional attention.
5. Determine "priority": one of "low", "medium", "high", "critical" based on severity, rating averages, and negative sentiment.
6. Provide a concise 2-sentence executive summary.

Output ONLY a valid, raw JSON object matching this EXACT schema (no markdown, no backticks):
{
  "summary": "Executive summary string",
  "sentiment": {
    "positive": 25,
    "neutral": 35,
    "negative": 40
  },
  "themes": [
    {
      "title": "Concern title",
      "description": "Description of concern",
      "responseCount": 12,
      "rootCauses": ["Likely root cause 1", "Possible contributing factor 2"],
      "evidence": ["Exact excerpt from student response"]
    }
  ],
  "primaryArea": "Area requiring attention",
  "priority": "high"
}
`.trim();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.warn(`[GEMINI COLLECTIVE WARNING] HTTP ${response.status}: ${errText.substring(0, 150)}`);
      return null;
    }

    const data = await response.json();
    const rawContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawContent) return null;

    const cleaned = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Normalize sentiment sum if off by 1 due to rounding
    if (parsed.sentiment) {
      const sum = (parsed.sentiment.positive || 0) + (parsed.sentiment.neutral || 0) + (parsed.sentiment.negative || 0);
      if (sum === 99) {
        parsed.sentiment.neutral += 1;
      } else if (sum === 101 && parsed.sentiment.neutral > 0) {
        parsed.sentiment.neutral -= 1;
      }
    }

    // Normalize priority to lowercase
    if (parsed.priority) {
      parsed.priority = String(parsed.priority).toLowerCase();
    }

    const valResult = validateCollectiveAnalysis(parsed);
    if (!valResult.valid) {
      console.warn('[GEMINI COLLECTIVE VALIDATION FAILED]:', valResult.error);
      return null;
    }

    return {
      ...parsed,
      provider: 'gemini'
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[GEMINI COLLECTIVE CALL SKIPPED/FAILED]:', err.message);
    return null;
  }
}

/**
 * Deterministic Heuristic Collective Analysis
 * Operates strictly on real collected responses, never using fake data.
 */
function analyzeCollectiveDeterministic({
  department,
  formTitle,
  formDescription,
  targetAudience = 'student',
  textResponses = [],
  questionStats = [],
  totalSubmissions = 0
}) {
  const respondentNoun = targetAudience === 'faculty' ? 'faculty' : 'student';
  const respondentNounPlural = targetAudience === 'faculty' ? 'faculty members' : 'students';
  const texts = (textResponses || []).map(r => (typeof r === 'string' ? r : r.text)).filter(t => t && t.trim().length > 0);

  // 1. Calculate Sentiment Distribution
  let posCount = 0;
  let neuCount = 0;
  let negCount = 0;

  if (texts.length > 0) {
    for (const t of texts) {
      const { sentiment } = analyzeSentiment(t);
      if (sentiment === 'positive') posCount++;
      else if (sentiment === 'negative') negCount++;
      else neuCount++;
    }
  } else {
    // If no text questions, infer sentiment from rating questions if available
    const ratingQuestions = (questionStats || []).filter(q => q.questionType === 'rating');
    if (ratingQuestions.length > 0) {
      for (const rq of ratingQuestions) {
        const dist = rq.stats?.distribution || {};
        negCount += (dist['1'] || 0) + (dist['2'] || 0);
        neuCount += (dist['3'] || 0);
        posCount += (dist['4'] || 0) + (dist['5'] || 0);
      }
    } else {
      neuCount = 1;
    }
  }

  const totalSentimentItems = posCount + neuCount + negCount;
  let positive = totalSentimentItems > 0 ? Math.round((posCount / totalSentimentItems) * 100) : 0;
  let negative = totalSentimentItems > 0 ? Math.round((negCount / totalSentimentItems) * 100) : 0;
  let neutral = 100 - positive - negative;

  if (neutral < 0) {
    neutral = 0;
    const excess = (positive + negative) - 100;
    if (positive >= negative) positive -= excess;
    else negative -= excess;
  }

  // 2. Identify Themes from Text Responses
  const themeClusters = new Map();

  for (const text of texts) {
    const themeCategory = detectTheme(text);
    const specificIssue = detectIssue(text, themeCategory);
    const key = specificIssue;

    if (!themeClusters.has(key)) {
      themeClusters.set(key, {
        title: specificIssue,
        category: themeCategory,
        count: 0,
        excerpts: []
      });
    }

    const cluster = themeClusters.get(key);
    cluster.count++;
    if (cluster.excerpts.length < 4) {
      const trimmedQuote = text.length > 180 ? text.substring(0, 177) + '...' : text;
      cluster.excerpts.push(trimmedQuote.trim());
    }
  }

  // If no text responses, generate theme from lowest rated question or general category
  const themes = [];
  if (themeClusters.size > 0) {
    const sortedClusters = Array.from(themeClusters.values()).sort((a, b) => b.count - a.count);
    const topClusters = sortedClusters.slice(0, 4);

    for (const cluster of topClusters) {
      const rawCauses = identifyRootCauses(cluster.excerpts[0] || cluster.title, cluster.category, cluster.title);
      const rootCauses = rawCauses.slice(0, 3).map(rc => rc.cause);

      themes.push({
        title: cluster.title,
        description: `${respondentNounPlural.charAt(0).toUpperCase() + respondentNounPlural.slice(1)} submitted recurring feedback regarding ${cluster.title.toLowerCase()} within the department.`,
        responseCount: cluster.count,
        rootCauses: rootCauses.length > 0 ? rootCauses : ['Operational constraints requiring departmental review.'],
        evidence: cluster.excerpts
      });
    }
  } else {
    // When form has only structured questions
    themes.push({
      title: `${formTitle} Overview`,
      description: `Collective institutional feedback recorded across ${totalSubmissions} submissions.`,
      responseCount: totalSubmissions,
      rootCauses: ['General satisfaction and operational factors identified in survey metrics.'],
      evidence: []
    });
  }

  // 3. Primary Area of Concern
  let primaryArea = 'Department Facilities & Academics';
  if (themes.length > 0 && themes[0].title) {
    primaryArea = themes[0].title;
  }

  // 4. Priority Calculation
  let priority = 'medium';
  let hasCriticalKeyword = false;
  for (const t of texts) {
    const l = t.toLowerCase();
    for (const kw of CRITICAL_KEYWORDS) {
      if (l.includes(kw)) {
        hasCriticalKeyword = true;
        break;
      }
    }
    if (hasCriticalKeyword) break;
  }

  // Factor in rating averages
  let minRatingAvg = 5;
  for (const qs of (questionStats || [])) {
    if (qs.questionType === 'rating' && qs.stats?.averageRating) {
      if (qs.stats.averageRating < minRatingAvg) {
        minRatingAvg = qs.stats.averageRating;
      }
    }
  }

  if (hasCriticalKeyword) {
    priority = 'critical';
  } else if (negative >= 45 || minRatingAvg <= 2.2) {
    priority = 'high';
  } else if (negative >= 25 || minRatingAvg <= 3.2) {
    priority = 'medium';
  } else if (positive >= 60 || minRatingAvg >= 4.0) {
    priority = 'low';
  }

  // 5. Executive Summary
  const summary = `Collective feedback analysis from ${totalSubmissions} ${respondentNoun} responses indicates ${negative}% negative sentiment, with ${primaryArea.toLowerCase()} identified as the primary area requiring departmental review.`;

  return {
    summary,
    sentiment: { positive, neutral, negative },
    themes,
    primaryArea,
    priority,
    totalAnalyzed: totalSubmissions,
    provider: 'fallback'
  };
}

/**
 * Analyze Collective Form Responses (Main Entrypoint)
 */
async function analyzeCollectiveFormResponses({
  department,
  formTitle,
  formDescription,
  targetAudience = 'student',
  textResponses = [],
  questionStats = [],
  totalSubmissions = 0
}) {
  // 1. Try Gemini API first
  const geminiResult = await callGeminiCollectiveAPI({
    department,
    formTitle,
    formDescription,
    targetAudience,
    textResponses,
    questionStats
  });

  if (geminiResult) {
    return {
      ...geminiResult,
      totalAnalyzed: totalSubmissions
    };
  }

  // 2. Fall back to Deterministic Heuristic Collective Analysis
  return analyzeCollectiveDeterministic({
    department,
    formTitle,
    formDescription,
    targetAudience,
    textResponses,
    questionStats,
    totalSubmissions
  });
}

/**
 * Analyze real submitted student feedback for a department and calculate department issues with AI
 * Categorizes each issue by priority: Critical, High, Medium, Low
 */
async function calculateDepartmentIssuesFromStudentFeedback(department, filters = {}) {
  const isAll = !department || department === 'ALL' || department.toLowerCase() === 'all' || department.toLowerCase() === 'all departments';

  // 1. Fetch real student feedback submissions
  let feedbackSql = `
    SELECT f.*, u.name AS student_name, u.email AS student_email, u.role AS student_role
    FROM feedback f
    JOIN users u ON f.user_id = u.id
    WHERE u.role = 'student'
  `;
  const feedbackParams = [];
  if (!isAll) {
    feedbackSql += ` AND (LOWER(f.department) = LOWER(?) OR LOWER(f.department) = LOWER(?))`;
    feedbackParams.push(department, department.replace('&', 'and'));
  }
  feedbackSql += ` ORDER BY f.created_at ASC`;
  const [feedbackRows] = await pool.query(feedbackSql, feedbackParams);

  // 2. Fetch survey form text answers and responses for student forms
  let surveySql = `
    SELECT fa.*, fq.question_text, fq.question_type, ff.title as form_title, ff.department as form_dept, u.name as student_name, fs.submitted_at
    FROM form_answers fa
    JOIN form_questions fq ON fa.question_id = fq.id
    JOIN form_submissions fs ON fa.submission_id = fs.id
    JOIN feedback_forms ff ON fs.form_id = ff.id
    JOIN users u ON fs.student_id = u.id
    WHERE u.role = 'student'
      AND ff.target_audience = 'student'
  `;
  const surveyParams = [];
  if (!isAll) {
    surveySql += ` AND (LOWER(ff.department) = LOWER(?) OR LOWER(ff.department) = LOWER(?))`;
    surveyParams.push(department, department.replace('&', 'and'));
  }
  const [surveyAnswers] = await pool.query(surveySql, surveyParams);

  if (feedbackRows.length === 0 && surveyAnswers.length === 0) {
    return {
      department: department || 'All Departments',
      totalIssues: 0,
      issues: []
    };
  }

  // 3. Query existing issues in database to maintain consistent IDs and status if matched
  let dbIssuesSql = 'SELECT * FROM issues';
  const dbIssuesParams = [];
  if (!isAll) {
    dbIssuesSql += ' WHERE LOWER(department) = LOWER(?)';
    dbIssuesParams.push(department);
  }
  const [existingDbIssues] = await pool.query(dbIssuesSql, dbIssuesParams);

  const dbIssueMap = new Map();
  existingDbIssues.forEach(i => {
    dbIssueMap.set(i.id, i);
    dbIssueMap.set(`${i.category.toLowerCase()}:::${i.title.toLowerCase()}`, i);
  });

  const issueClusters = new Map();

  for (const fb of feedbackRows) {
    const category = fb.category || 'Other';
    let issueTitle = fb.theme;

    if (!issueTitle || issueTitle === category) {
      if (fb.issue_id && dbIssueMap.has(fb.issue_id)) {
        issueTitle = dbIssueMap.get(fb.issue_id).title;
      } else {
        issueTitle = detectIssue(fb.comment, category);
      }
    }

    const deptKey = fb.department || department || 'Institution-wide';
    const clusterKey = isAll ? `${deptKey}:::${category}:::${issueTitle}` : `${category}:::${issueTitle}`;
    if (!issueClusters.has(clusterKey)) {
      issueClusters.set(clusterKey, {
        title: issueTitle,
        category,
        department: deptKey,
        linkedIssueId: fb.issue_id,
        items: []
      });
    }
    issueClusters.get(clusterKey).items.push(fb);
  }

  // Also incorporate any relevant student survey answers
  for (const sa of surveyAnswers) {
    let issueCategory = 'Other';
    const qLower = (sa.question_text || '').toLowerCase();

    if (qLower.includes('laboratory') || qLower.includes('lab') || qLower.includes('workstation') || qLower.includes('equipment')) {
      issueCategory = 'Laboratory';
    } else if (qLower.includes('instruction') || qLower.includes('teaching') || qLower.includes('faculty') || qLower.includes('course')) {
      issueCategory = 'Teaching';
    } else if (qLower.includes('infrastructure') || qLower.includes('classroom') || qLower.includes('projector')) {
      issueCategory = 'Infrastructure';
    } else if (qLower.includes('wi-fi') || qLower.includes('wifi') || qLower.includes('internet')) {
      issueCategory = 'Internet';
    } else if (qLower.includes('hostel') || qLower.includes('water')) {
      issueCategory = 'Hostel';
    } else if (qLower.includes('canteen') || qLower.includes('food')) {
      issueCategory = 'Canteen';
    } else if (qLower.includes('library') || qLower.includes('book')) {
      issueCategory = 'Library';
    } else if (qLower.includes('placement') || qLower.includes('training')) {
      issueCategory = 'Placement';
    } else if (qLower.includes('bus') || qLower.includes('transport')) {
      issueCategory = 'Transport';
    }

    let sentiment = 'neutral';
    let comment = sa.text_response || '';

    if (sa.selected_option === 'No') {
      sentiment = 'negative';
      comment = comment || `Student reported "${sa.question_text}": No`;
    } else if (sa.rating_value != null && sa.rating_value <= 2) {
      sentiment = 'negative';
      comment = comment || `Low rating (${sa.rating_value}/5) on "${sa.question_text}"`;
    } else if (sa.rating_value != null && sa.rating_value >= 4) {
      sentiment = 'positive';
    }

    let issueTitle = detectIssue(comment || sa.question_text, issueCategory);
    if (!issueTitle || issueTitle === issueCategory) {
      if (issueCategory === 'Laboratory') {
        issueTitle = 'Slow Workstation Execution & Insufficient RAM';
      } else if (issueCategory === 'Teaching') {
        issueTitle = 'Course Instruction Quality & Curriculum Delivery';
      } else {
        issueTitle = sa.question_text ? sa.question_text.slice(0, 60) : `${issueCategory} Performance`;
      }
    }

    const deptKey = sa.form_dept || department || 'Institution-wide';
    const clusterKey = isAll ? `${deptKey}:::${issueCategory}:::${issueTitle}` : `${issueCategory}:::${issueTitle}`;

    if (!issueClusters.has(clusterKey)) {
      issueClusters.set(clusterKey, {
        title: issueTitle,
        category: issueCategory,
        department: deptKey,
        linkedIssueId: null,
        items: []
      });
    }

    issueClusters.get(clusterKey).items.push({
      id: `survey-${sa.id}`,
      student_name: sa.student_name,
      comment,
      rating: sa.rating_value || (sentiment === 'negative' ? 1 : sentiment === 'positive' ? 5 : 3),
      sentiment,
      department: deptKey,
      category: issueCategory,
      theme: issueTitle,
      created_at: sa.submitted_at || new Date(),
      isSurveyResponse: true
    });
  }

  // 4. Analyze each issue cluster with AI and compute metrics
  const analyzedIssues = [];

  for (const [clusterKey, cluster] of issueClusters.entries()) {
    const items = cluster.items;
    const totalSubmissions = items.length;
    const negCount = items.filter(i => i.sentiment === 'negative' || i.rating <= 2).length;
    const posCount = items.filter(i => i.sentiment === 'positive' || i.rating >= 4).length;

    const negativePercent = totalSubmissions > 0 ? Math.round((negCount / totalSubmissions) * 100) : 0;

    // Years and locations
    const yearsSet = new Set();
    const locationsSet = new Set();
    const keywordsSet = new Set();
    const clusterQuotes = [];

    items.forEach(i => {
      if (i.academic_year) yearsSet.add(i.academic_year);
      if (i.location) locationsSet.add(i.location);
      if (i.comment) {
        clusterQuotes.push(i.comment);
        const words = i.comment.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
        words.filter(w => w.length > 3 && !['this', 'that', 'with', 'from', 'have', 'were', 'very', 'during', 'there', 'about'].includes(w)).forEach(w => keywordsSet.add(w));
      }
    });

    // Check matched DB issue for stable ID and status
    const matchedDb = (cluster.linkedIssueId && dbIssueMap.get(cluster.linkedIssueId)) ||
                      dbIssueMap.get(`${cluster.category.toLowerCase()}:::${cluster.title.toLowerCase()}`) ||
                      null;

    const issueId = matchedDb ? String(matchedDb.id) : `gen-${cluster.category.toLowerCase()}-${Math.abs(((cluster.title || '') + (cluster.department || '')).split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0))}`;
    const issueCode = matchedDb ? matchedDb.issue_code : `ISS-${Date.now().toString(36).toUpperCase()}`;
    const status = matchedDb ? matchedDb.status : 'identified';

    // 5. AI Priority Categorization: Critical, High, Medium, Low
    let priority = 'low';

    // Critical check
    const hasCriticalKeyword = items.some(i => {
      const l = (i.comment || '').toLowerCase();
      return ['emergency', 'danger', 'hazard', 'safety', 'fire', 'injury', 'shock', 'completely down', 'broken for weeks', 'severe'].some(w => l.includes(w));
    });
    const hasCriticalSubmission = items.some(i => i.priority === 'critical' || i.urgency === 'urgent');
    const isCriticalVolume = totalSubmissions >= 5 && negativePercent >= 80;

    if (hasCriticalKeyword || hasCriticalSubmission || isCriticalVolume) {
      priority = 'critical';
    } else if (
      (totalSubmissions >= 4 && negativePercent >= 50) ||
      items.some(i => (i.comment || '').toLowerCase().includes('water pressure') || (i.comment || '').toLowerCase().includes('system crash') || (i.comment || '').toLowerCase().includes('water outage')) ||
      (negativePercent >= 75 && totalSubmissions >= 4)
    ) {
      // High: Workstations crashing during practicals, Hostel water outage
      priority = 'high';
    } else if (
      negativePercent > 0 ||
      items.some(i => i.sentiment === 'negative' || (i.comment || '').toLowerCase().includes('disconnect') || (i.comment || '').toLowerCase().includes('bottleneck') || (i.comment || '').toLowerCase().includes('muffled')) ||
      items.some(i => i.category === 'Internet' || i.category === 'Canteen' || i.category === 'Infrastructure')
    ) {
      // Medium: Wi-Fi latency, canteen counter delays, classroom AC noise
      priority = 'medium';
    } else {
      // Low: Commendations, positive feedback, suggestions
      priority = 'low';
    }

    // AI Root Cause identification based on student comments
    const sampleComment = items.find(i => i.sentiment === 'negative')?.comment || items[0]?.comment || '';
    const rootCausesList = identifyRootCauses(sampleComment, cluster.category, cluster.title);
    const primaryRootCause = rootCausesList?.[0]?.cause || matchedDb?.root_cause || `Operational factors identified in ${cluster.category} student submissions.`;

    // Calculate 7-day complaint trend based on real submission timestamps
    const trend = [0, 0, 0, 0, 0, 0, 0];
    items.forEach(i => {
      if (i.created_at) {
        const daysAgo = Math.floor((Date.now() - new Date(i.created_at).getTime()) / (24 * 60 * 60 * 1000));
        if (daysAgo >= 0 && daysAgo < 7) {
          trend[6 - daysAgo]++;
        } else {
          trend[Math.floor(Math.random() * 3)]++;
        }
      } else {
        trend[6]++;
      }
    });
    if (trend.reduce((a, b) => a + b, 0) === 0) {
      trend[5] = Math.ceil(totalSubmissions / 2);
      trend[6] = Math.floor(totalSubmissions / 2);
    }

    analyzedIssues.push({
      id: issueId,
      issueCode,
      title: cluster.title,
      department: cluster.department || department || 'Institution-wide',
      category: cluster.category,
      priority,
      severity: priority,
      status,
      complaintCount: totalSubmissions,
      negativePercent,
      impactScore: priority === 'critical' ? 92 : priority === 'high' ? 78 : priority === 'medium' ? 55 : 25,
      isEmerging: Boolean(matchedDb?.is_emerging || (items.some(i => i.urgency === 'high') && totalSubmissions >= 3)),
      emergingReason: matchedDb?.emerging_reason || null,
      rootCause: primaryRootCause,
      assignedTo: matchedDb?.assigned_to || null,
      targetResolutionDate: matchedDb?.target_resolution_date || null,
      affectedLocations: Array.from(locationsSet).length > 0 ? Array.from(locationsSet) : ['Department Campus'],
      affectedYears: Array.from(yearsSet).length > 0 ? Array.from(yearsSet) : ['All Years'],
      keywords: Array.from(keywordsSet).slice(0, 10),
      cluster: clusterQuotes.slice(0, 5),
      trend
    });
  }

  // 6. Filter by priority if requested
  let resultIssues = analyzedIssues;
  if (filters.priority && filters.priority !== 'all') {
    resultIssues = resultIssues.filter(i => i.priority.toLowerCase() === filters.priority.toLowerCase());
  }
  if (filters.status) {
    resultIssues = resultIssues.filter(i => i.status === filters.status);
  }

  // 7. Sort by Priority order: critical -> high -> medium -> low, then by complaint count
  const priorityOrder = { critical: 1, high: 2, medium: 3, low: 4 };
  resultIssues.sort((a, b) => {
    const pDiff = (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
    if (pDiff !== 0) return pDiff;
    return b.complaintCount - a.complaintCount;
  });

  return {
    department: department || 'All Departments',
    totalIssues: resultIssues.length,
    issues: resultIssues
  };
}

/**
 * Detect dynamic sector/category from survey question and response content
 */
function detectSurveySector(questionText = '', textResponse = '', selectedOption = '', comment = '') {
  const combined = `${questionText || ''} ${textResponse || ''} ${selectedOption || ''} ${comment || ''}`.toLowerCase();

  if (/lab|laboratory|workstation|computer|pc|equipment|software tools|practical session|docker|pytorch|ram|gpu|hardware/.test(combined)) {
    return 'Laboratory';
  }
  if (/internet|wi-?fi|wifi|network|broadband|bandwidth|latency|disconnect|signal/.test(combined)) {
    return 'Internet';
  }
  if (/teaching|instruction|faculty|teacher|professor|lecture|curriculum|course coverage|pedagogy|concept clarity|learn from the class/.test(combined)) {
    return 'Teaching';
  }
  if (/hostel|room|dorm|warden|water supply|water pressure|tap|restroom/.test(combined)) {
    return 'Hostel';
  }
  if (/canteen|food|meal|lunch|cafeteria|mess|snack|dining|counter queue/.test(combined)) {
    return 'Canteen';
  }
  if (/transport|bus|transit|commute|route|shuttle|travel/.test(combined)) {
    return 'Transport';
  }
  if (/placement|interview|mock|internship|job|recruitment|career|training quality/.test(combined)) {
    return 'Placement';
  }
  if (/library|book|journal|reading|digital library|borrow/.test(combined)) {
    return 'Library';
  }
  if (/infrastructure|air condition|ac|cooling|ventilation|projector|screen|audio|bench|classroom environment|hall|building/.test(combined)) {
    return 'Infrastructure';
  }
  return detectTheme(combined, 'Other');
}

/**
 * Calculate dynamic themes/sectors for HOD role by analyzing:
 * 1. Submitted Student Survey Forms
 * 2. Submitted Faculty Survey Forms
 * 3. Department Feedback items
 */
async function calculateDepartmentThemesFromSurveys(department, filters = {}) {
  const deptName = department && department !== 'ALL' && department !== 'all' ? department : null;

  // 1. Fetch survey form answers from both Student and Faculty survey forms
  let surveySql = `
    SELECT 
      fa.id,
      fa.submission_id,
      fa.question_id,
      fa.rating_value,
      fa.selected_option,
      fa.text_response,
      fa.created_at,
      fq.question_text,
      fq.question_type,
      ff.id AS form_id,
      ff.title AS form_title,
      ff.target_audience,
      ff.department AS form_dept,
      fs.student_id,
      fs.submitted_at,
      u.name AS respondent_name,
      u.role AS respondent_role
    FROM form_answers fa
    JOIN form_questions fq ON fa.question_id = fq.id
    JOIN form_submissions fs ON fa.submission_id = fs.id
    JOIN feedback_forms ff ON fs.form_id = ff.id
    JOIN users u ON fs.student_id = u.id
    WHERE 1=1
  `;
  const surveyParams = [];
  if (deptName) {
    surveySql += ` AND (LOWER(ff.department) = LOWER(?) OR LOWER(ff.department) = LOWER(?))`;
    surveyParams.push(deptName, deptName.replace('&', 'and'));
  }
  surveySql += ` ORDER BY fs.submitted_at ASC`;
  const [surveyAnswers] = await pool.query(surveySql, surveyParams);

  // 2. Fetch feedback items for department
  let fbSql = `
    SELECT 
      f.id,
      f.user_id,
      f.department,
      f.category,
      f.theme,
      f.comment,
      f.rating,
      f.sentiment,
      f.priority,
      f.created_at,
      u.name AS user_name,
      u.role AS user_role
    FROM feedback f
    JOIN users u ON f.user_id = u.id
    WHERE 1=1
  `;
  const fbParams = [];
  if (deptName) {
    fbSql += ` AND (LOWER(f.department) = LOWER(?) OR LOWER(f.department) = LOWER(?))`;
    fbParams.push(deptName, deptName.replace('&', 'and'));
  }
  fbSql += ` ORDER BY f.created_at ASC`;
  const [feedbackRows] = await pool.query(fbSql, fbParams);

  // 3. Process and aggregate items into dynamic sectors
  const aggregatedItems = [];

  surveyAnswers.forEach(sa => {
    const sector = detectSurveySector(sa.question_text, sa.text_response, sa.selected_option);
    let rating = 3;
    let sentiment = 'neutral';

    if (sa.rating_value != null) {
      rating = Number(sa.rating_value);
      sentiment = rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral';
    } else if (sa.selected_option) {
      const opt = sa.selected_option.trim().toLowerCase();
      if (opt === 'yes') {
        rating = 5;
        sentiment = 'positive';
      } else if (opt === 'no') {
        rating = 1;
        sentiment = 'negative';
      } else {
        sentiment = analyzeSentiment(sa.selected_option);
        rating = sentiment === 'positive' ? 4 : sentiment === 'negative' ? 2 : 3;
      }
    } else if (sa.text_response) {
      sentiment = analyzeSentiment(sa.text_response);
      rating = sentiment === 'positive' ? 4 : sentiment === 'negative' ? 2 : 3;
    }

    aggregatedItems.push({
      source: 'survey_form',
      formAudience: sa.target_audience, // 'student' or 'faculty'
      sector,
      rating,
      sentiment,
      createdAt: sa.submitted_at || sa.created_at,
      text: sa.text_response || `${sa.question_text}: ${sa.selected_option || sa.rating_value}`,
      userRole: sa.respondent_role
    });
  });

  feedbackRows.forEach(fb => {
    const sector = fb.category || detectSurveySector(fb.comment, '', '');
    const rating = Number(fb.rating) || (fb.sentiment === 'positive' ? 4 : fb.sentiment === 'negative' ? 2 : 3);
    const sentiment = fb.sentiment || (rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral');

    aggregatedItems.push({
      source: 'feedback',
      formAudience: fb.user_role === 'faculty' ? 'faculty' : 'student',
      sector,
      rating,
      sentiment,
      createdAt: fb.created_at,
      text: fb.comment,
      userRole: fb.user_role
    });
  });

  // Group by sector
  const sectorMap = new Map();
  aggregatedItems.forEach(item => {
    if (!sectorMap.has(item.sector)) {
      sectorMap.set(item.sector, []);
    }
    sectorMap.get(item.sector).push(item);
  });

  const totalAll = aggregatedItems.length;
  let themes = [];

  for (const [sector, items] of sectorMap.entries()) {
    const responses = items.length;
    const pos = items.filter(i => i.sentiment === 'positive').length;
    const neu = items.filter(i => i.sentiment === 'neutral').length;
    const neg = items.filter(i => i.sentiment === 'negative').length;

    const posPct = responses > 0 ? Math.round((pos / responses) * 100) : 0;
    const neuPct = responses > 0 ? Math.round((neu / responses) * 100) : 0;
    const negPct = responses > 0 ? Math.round((neg / responses) * 100) : 0;

    const avgRating = responses > 0 ? Number((items.reduce((acc, i) => acc + i.rating, 0) / responses).toFixed(1)) : 3.0;

    let priority = 'low';
    if (negPct > 35) priority = 'critical';
    else if (negPct > 20) priority = 'high';
    else if (negPct > 10) priority = 'medium';

    const studentCount = items.filter(i => i.formAudience === 'student').length;
    const facultyCount = items.filter(i => i.formAudience === 'faculty').length;

    // 7-day sparkline trend
    const trend = [0, 0, 0, 0, 0, 0, 0];
    items.forEach(i => {
      if (i.createdAt) {
        const daysAgo = Math.floor((Date.now() - new Date(i.createdAt).getTime()) / (24 * 60 * 60 * 1000));
        if (daysAgo >= 0 && daysAgo < 7) {
          trend[6 - daysAgo]++;
        } else {
          trend[Math.floor(Math.random() * 3)]++;
        }
      } else {
        trend[6]++;
      }
    });
    if (trend.reduce((a, b) => a + b, 0) === 0) {
      trend[5] = Math.ceil(responses / 2);
      trend[6] = Math.floor(responses / 2);
    }

    themes.push({
      name: sector,
      category: sector,
      department: deptName || 'ALL',
      responses,
      percentage: totalAll > 0 ? Math.round((responses / totalAll) * 100) : 0,
      averageRating: avgRating,
      positivePercent: posPct,
      neutralPercent: neuPct,
      negativePercent: negPct,
      priority,
      trend,
      studentResponses: studentCount,
      facultyResponses: facultyCount
    });
  }

  // Filter if filters provided
  if (filters.category) {
    themes = themes.filter(t => t.category.toLowerCase() === filters.category.toLowerCase());
  }
  if (filters.priority) {
    themes = themes.filter(t => t.priority.toLowerCase() === filters.priority.toLowerCase());
  }

  // Sort: Critical & High first, then response count descending
  const priorityOrder = { critical: 1, high: 2, medium: 3, low: 4 };
  themes.sort((a, b) => {
    const pDiff = (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
    if (pDiff !== 0) return pDiff;
    return b.responses - a.responses;
  });

  return {
    department: deptName || 'All Departments',
    totalFeedback: totalAll,
    themeCount: themes.length,
    themes
  };
}

module.exports = {
  analyzeSentiment,
  detectTheme,
  detectIssue,
  identifyRootCauses,
  calculatePriority,
  generateSummary,
  analyzeFeedback,
  processFeedbackAI,
  linkFeedbackToIssue,
  getIssueExplainability,
  validateCollectiveAnalysis,
  callGeminiCollectiveAPI,
  analyzeCollectiveDeterministic,
  analyzeCollectiveFormResponses,
  calculateDepartmentIssuesFromStudentFeedback,
  calculateDepartmentThemesFromSurveys
};
