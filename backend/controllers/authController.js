const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
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

const ALLOWED_ROLES = [
  'student',
  'faculty',
  'hod',
  'management',
  'bus_incharge',
  'transport_incharge',
  'hostel_warden'
];
const ALLOWED_PORTALS = ['education', 'bus', 'hostel'];
const OFFICIAL_HOSTEL_FLOORS = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor'];
const OFFICIAL_STUDENT_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const OFFICIAL_STUDENT_SECTIONS = ['A', 'B', 'C', 'D'];

const REGISTRATION_TOKEN_PURPOSE = 'google_account_registration';
const REGISTRATION_TOKEN_EXPIRY = '15m'; // 15-minute temporary token

/**
 * Generate a short-lived cryptographically signed token for Google registration
 */
function generateRegistrationToken(email, name, googleId, role = 'student', portal = 'education') {
  const secret = process.env.JWT_SECRET || 'your_jwt_secret_key_feedbackiq_2026';
  const validatedRole = ALLOWED_ROLES.includes(role ? role.toLowerCase() : '') ? role.toLowerCase() : 'student';
  const validatedPortal = ALLOWED_PORTALS.includes(portal ? portal.toLowerCase() : '') ? portal.toLowerCase() : 'education';
  return jwt.sign(
    {
      purpose: REGISTRATION_TOKEN_PURPOSE,
      email: email.trim().toLowerCase(),
      name: name ? name.trim() : '',
      googleId: googleId || '',
      role: validatedRole,
      portal: validatedPortal
    },
    secret,
    { expiresIn: REGISTRATION_TOKEN_EXPIRY }
  );
}

/**
 * Generate standard JWT token with safe payload
 */
function generateToken(user) {
  const secret = process.env.JWT_SECRET || 'your_jwt_secret_key_feedbackiq_2026';
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      portal: user.portal || 'education',
      department: user.department || null,
      bus_number: user.bus_number || null,
      floor: user.floor || null,
      assigned_floor: user.assigned_floor || null
    },
    secret,
    { expiresIn: '7d' }
  );
}

/**
 * POST /api/auth/register
 * Register a new user with password hashing and validation
 */
async function register(req, res) {
  try {
    const { name, email, password, role, department } = req.body;

    // 1. Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name is required and must be at least 2 characters.'
      });
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required.'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // 2. Validate role
    if (!role || !ALLOWED_ROLES.includes(role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${ALLOWED_ROLES.join(', ')}.`
      });
    }
    const normalizedRole = role.toLowerCase();

    // Portal validation (default 'education')
    const reqPortal = (req.body.portal && typeof req.body.portal === 'string')
      ? req.body.portal.trim().toLowerCase()
      : 'education';
    if (!ALLOWED_PORTALS.includes(reqPortal)) {
      return res.status(400).json({
        success: false,
        message: `Portal must be one of: ${ALLOWED_PORTALS.join(', ')}.`
      });
    }

    // 3. Validate department according to role and portal
    let validatedDepartment = null;
    let departmentId = null;

    if (normalizedRole === 'management' || reqPortal === 'bus' || reqPortal === 'hostel') {
      // Department is optional for management or bus/hostel portals
      if (department && typeof department === 'string' && department.trim() !== '') {
        const matchedDept = OFFICIAL_DEPARTMENTS.find(
          (d) => d.toLowerCase() === department.trim().toLowerCase()
        );
        if (matchedDept) {
          validatedDepartment = matchedDept;
          const [deptRows] = await pool.execute('SELECT id FROM departments WHERE name = ?', [validatedDepartment]);
          if (deptRows.length > 0) departmentId = deptRows[0].id;
        }
      }
    } else {
      if (!department || typeof department !== 'string') {
        return res.status(400).json({
          success: false,
          message: `Department is required for role "${normalizedRole}".`
        });
      }

      // Check against official departments (case-insensitive)
      const matchedDept = OFFICIAL_DEPARTMENTS.find(
        (d) => d.toLowerCase() === department.trim().toLowerCase()
      );

      if (!matchedDept) {
        return res.status(400).json({
          success: false,
          message: `Invalid department. Must be one of the official departments: ${OFFICIAL_DEPARTMENTS.join(', ')}.`
        });
      }

      validatedDepartment = matchedDept;

      // Query database for department_id
      const [deptRows] = await pool.execute(
        'SELECT id FROM departments WHERE name = ?',
        [validatedDepartment]
      );
      if (deptRows.length > 0) {
        departmentId = deptRows[0].id;
      }
    }

    // Portal-specific validations
    let busNumber = null;
    let boardingPoint = null;
    let roomNumber = null;
    let floor = null;
    let assignedFloor = null;

    if (reqPortal === 'bus') {
      busNumber = req.body.bus_number ? req.body.bus_number.trim() : null;
      boardingPoint = req.body.boarding_point ? req.body.boarding_point.trim() : null;
      if (normalizedRole === 'bus_incharge' && !busNumber) {
        return res.status(400).json({
          success: false,
          message: 'bus_number is required for bus_incharge.'
        });
      }
    } else if (reqPortal === 'hostel') {
      roomNumber = req.body.room_number ? req.body.room_number.trim() : null;
      if (req.body.floor && OFFICIAL_HOSTEL_FLOORS.includes(req.body.floor.trim())) {
        floor = req.body.floor.trim();
      }
      if (normalizedRole === 'hostel_warden') {
        if (!req.body.assigned_floor || !OFFICIAL_HOSTEL_FLOORS.includes(req.body.assigned_floor.trim())) {
          return res.status(400).json({
            success: false,
            message: `Valid assigned_floor is required for hostel_warden (${OFFICIAL_HOSTEL_FLOORS.join(', ')}).`
          });
        }
        assignedFloor = req.body.assigned_floor.trim();
      }
    }

    // 4. Check if email already exists
    const normalizedEmail = email.trim().toLowerCase();
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // 5. Hash password with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 6. Insert new user using parameterized query
    const [result] = await pool.execute(
      `INSERT INTO users (
        name, email, password_hash, role, portal, department, department_id,
        bus_number, boarding_point, room_number, floor, assigned_floor
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(), normalizedEmail, passwordHash, normalizedRole, reqPortal, validatedDepartment, departmentId,
        busNumber, boardingPoint, roomNumber, floor, assignedFloor
      ]
    );

    const newUser = {
      id: result.insertId,
      name: name.trim(),
      email: normalizedEmail,
      role: normalizedRole,
      portal: reqPortal,
      department: validatedDepartment,
      department_id: departmentId,
      bus_number: busNumber,
      boarding_point: boardingPoint,
      room_number: roomNumber,
      floor,
      assigned_floor: assignedFloor
    };

    // 7. Generate JWT
    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        user: newUser,
        token
      }
    });
  } catch (error) {
    console.error('[AUTH REGISTER ERROR]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during registration.'
    });
  }
}

/**
 * POST /api/auth/login
 * Validate credentials against MySQL and return JWT
 */
async function login(req, res) {
  try {
    const { email, password, role, portal } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Map legacy demo accounts to Phase 2 realistic database records
    const LEGACY_EMAIL_ALIASES = {
      'student.civil@college.edu': 'student22@test.feedbackiq.local',
      'student.it@college.edu': 'student15@test.feedbackiq.local',
      'hod.civil@college.edu': 'hod.civil@test.feedbackiq.local',
      'hod.cse@college.edu': 'hod.cse@test.feedbackiq.local',
      'management@college.edu': 'management01@test.feedbackiq.local'
    };
    const lookupEmail = LEGACY_EMAIL_ALIASES[normalizedEmail] || normalizedEmail;

    // 1. Look up user by email
    const [rows] = await pool.execute(
      `SELECT id, name, email, password_hash, role, portal, department, department_id,
              year, section, bus_number, boarding_point, room_number, floor, assigned_floor, created_at
       FROM users WHERE email = ?`,
      [lookupEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = rows[0];

    // 2. Compare password hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // 3. If client specified a role to authenticate as, verify it matches
    if (role && role.toLowerCase() !== user.role.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This account is registered as "${user.role}", not "${role}".`
      });
    }

    // 4. Portal check: If client specified a portal and user is NOT management
    const userPortal = user.portal || 'education';
    if (portal && user.role.toLowerCase() !== 'management') {
      if (portal.toLowerCase() !== userPortal.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `Access denied. This account belongs to the "${userPortal}" portal, not "${portal}".`
        });
      }
    }

    // 5. Generate JWT with portal information
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      portal: (user.role.toLowerCase() === 'management' && portal) ? portal.toLowerCase() : userPortal,
      department: user.department,
      departmentId: user.department_id,
      year: user.year || null,
      section: user.section || null,
      bus_number: user.bus_number || null,
      boarding_point: user.boarding_point || null,
      room_number: user.room_number || null,
      floor: user.floor || null,
      assigned_floor: user.assigned_floor || null
    };

    const token = generateToken(safeUser);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: safeUser,
        token
      }
    });
  } catch (error) {
    console.error('[AUTH LOGIN ERROR]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during login.'
    });
  }
}

/**
 * GET /api/auth/me
 * Return current authenticated user profile
 */
async function getMe(req, res) {
  try {
    // req.user is populated by authMiddleware with full portal metadata
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          portal: req.user.portal || 'education',
          department: req.user.department,
          departmentId: req.user.department_id,
          year: req.user.year || null,
          section: req.user.section || null,
          bus_number: req.user.bus_number || null,
          boarding_point: req.user.boarding_point || null,
          room_number: req.user.room_number || null,
          floor: req.user.floor || null,
          assigned_floor: req.user.assigned_floor || null,
          createdAt: req.user.created_at
        }
      }
    });
  } catch (error) {
    console.error('[AUTH ME ERROR]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error fetching profile.'
    });
  }
}

/**
 * PUT /api/auth/profile
 * Update allowed profile fields (name, password)
 * Explicitly rejects modifications to role, department, or user ID
 */
async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { name, currentPassword, newPassword } = req.body;

    // Explicitly reject attempt to escalate role or change department
    if (req.body.role !== undefined && req.body.role !== req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot modify your assigned role.'
      });
    }

    if (req.body.department !== undefined && req.body.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot modify your assigned department.'
      });
    }

    if (req.body.id !== undefined && req.body.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: User ID is immutable.'
      });
    }

    let updatedName = req.user.name;
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Name must be at least 2 characters long.'
        });
      }
      updatedName = name.trim();
    }

    // Password change verification
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set a new password.'
        });
      }

      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long.'
        });
      }

      // Fetch existing password hash
      const [rows] = await pool.execute(
        'SELECT password_hash FROM users WHERE id = ?',
        [userId]
      );

      const isValid = await bcrypt.compare(currentPassword, rows[0].password_hash);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect.'
        });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await pool.execute(
        'UPDATE users SET name = ?, password_hash = ? WHERE id = ?',
        [updatedName, newPasswordHash, userId]
      );
    } else {
      await pool.execute(
        'UPDATE users SET name = ? WHERE id = ?',
        [updatedName, userId]
      );
    }

    // Return updated user object
    const [updatedRows] = await pool.execute(
      'SELECT id, name, email, role, department, department_id, created_at FROM users WHERE id = ?',
      [userId]
    );

    const updatedUser = updatedRows[0];

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          department: updatedUser.department
        }
      }
    });
  } catch (error) {
    console.error('[AUTH UPDATE PROFILE ERROR]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error updating profile.'
    });
  }
}

/**
 * GET /api/auth/google
 * Redirect user to official Google OAuth 2.0 authorization endpoint preserving requested role and portal
 */
function googleAuth(req, res) {
  const requestedRole = (req.query.role && typeof req.query.role === 'string')
    ? req.query.role.trim().toLowerCase()
    : 'student';
  const role = ALLOWED_ROLES.includes(requestedRole) ? requestedRole : 'student';

  const requestedPortal = (req.query.portal && typeof req.query.portal === 'string')
    ? req.query.portal.trim().toLowerCase()
    : 'education';
  const portal = ALLOWED_PORTALS.includes(requestedPortal) ? requestedPortal : 'education';

  const clientId = process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.trim() : '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ? process.env.GOOGLE_CLIENT_SECRET.trim() : '';
  const callbackUrl = (process.env.GOOGLE_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/auth/google/callback`).trim();
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').trim();

  // Enforce: Only students can use Google OAuth
  if (role !== 'student') {
    return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Google sign-in is exclusively available for student accounts. Staff, faculty, and administrators must sign in with their email and password.')}`);
  }

  if (!clientId || !clientSecret) {
    return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Google OAuth configuration is missing on the server (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required).')}`);
  }

  // Encode state containing validated role, portal, and cryptographically secure random nonce
  const statePayload = {
    role,
    portal,
    nonce: crypto.randomBytes(16).toString('hex')
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
  return res.redirect(authUrl);
}

/**
 * GET /api/auth/google/callback
 * Exchange authorization code with Google, retrieve profile, verify registered account, and return JWT
 */
async function googleCallback(req, res) {
  const { code, error, state } = req.query;
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').trim();

  if (error || !code) {
    return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error || 'Google authentication was cancelled or failed.')}`);
  }

  let requestedRole = 'student';
  let requestedPortal = 'education';
  if (state) {
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
      if (decodedState && decodedState.role && ALLOWED_ROLES.includes(decodedState.role.toLowerCase())) {
        requestedRole = decodedState.role.toLowerCase();
      }
      if (decodedState && decodedState.portal && ALLOWED_PORTALS.includes(decodedState.portal.toLowerCase())) {
        requestedPortal = decodedState.portal.toLowerCase();
      }
    } catch (e) {
      console.warn('[AUTH GOOGLE] Could not parse OAuth state:', e.message);
    }
  }

  // Enforce: Only students can complete Google authentication
  if (requestedRole !== 'student') {
    return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Google sign-in is exclusively available for student accounts. Staff, faculty, and administrators must sign in with their email and password.')}`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.trim() : '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ? process.env.GOOGLE_CLIENT_SECRET.trim() : '';
  const callbackUrl = (process.env.GOOGLE_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/auth/google/callback`).trim();

  if (!clientId || !clientSecret) {
    return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Google OAuth configuration is missing on the server.')}`);
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(tokenData.error_description || 'Failed to exchange authorization code with Google.')}`);
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const googleProfile = await userRes.json();

    if (!googleProfile.email) {
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Unable to retrieve email from Google profile.')}`);
    }

    const normalizedEmail = googleProfile.email.trim().toLowerCase();

    // Look up user in MySQL by verified Google email
    const [rows] = await pool.execute(
      `SELECT id, name, email, role, portal, department, department_id,
              year, section, bus_number, boarding_point, room_number, floor, assigned_floor
       FROM users WHERE email = ?`,
      [normalizedEmail]
    );

    // Existing account found in database
    if (rows.length > 0) {
      const user = rows[0];

      // Enforce: Only student accounts can log in via Google
      if (user.role !== 'student') {
        const errorMsg = 'Google sign-in is exclusively available for student accounts. Staff, faculty, and administrators must sign in with their email and password.';
        return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorMsg)}`);
      }

      // Role mismatch check: compare requested Google-login role vs stored user.role
      if (user.role !== requestedRole) {
        const storedRoleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        const requestedRoleLabel = requestedRole.charAt(0).toUpperCase() + requestedRole.slice(1);
        const errorMsg = `This Google account is registered as "${storedRoleLabel}". Please select the "${storedRoleLabel}" tab to sign in instead of "${requestedRoleLabel}".`;
        return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorMsg)}`);
      }

      // Portal mismatch check: Management can access all portals; others must match
      const userPortal = user.portal || 'education';
      if (user.role !== 'management' && userPortal !== requestedPortal) {
        const storedPortalLabel = userPortal.toUpperCase();
        const requestedPortalLabel = requestedPortal.toUpperCase();
        const errorMsg = `This Google account is registered for "${storedPortalLabel}". Please select the "${storedPortalLabel}" portal to sign in instead of "${requestedPortalLabel}".`;
        return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorMsg)}`);
      }

      // Role matches: generate standard FeedbackIQ JWT and redirect to role dashboard flow
      const token = generateToken(user);
      return res.redirect(`${frontendUrl}/login?token=${token}&role=${user.role}&portal=${userPortal}`);
    }

    // New Google account (email not found in users table):
    // Disallow registration of administrative roles via Google OAuth self-registration flow
    if (requestedRole !== 'student') {
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Staff and administrative accounts cannot be created via Google registration. Only student accounts support self-registration.')}`);
    }

    // Generate secure short-lived temporary registration token containing verified email, requested role, and portal
    const regToken = generateRegistrationToken(
      normalizedEmail,
      googleProfile.name || '',
      googleProfile.sub || '',
      'student',
      requestedPortal
    );

    // Redirect to frontend Google Registration Setup with the temporary registration token
    return res.redirect(`${frontendUrl}/register-setup?regToken=${encodeURIComponent(regToken)}`);
  } catch (err) {
    console.error('[GOOGLE OAUTH ERROR]:', err.message || err);
    return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Internal server error during Google authentication.')}`);
  }
}

/**
 * POST /api/auth/google/register and /api/auth/google/student-register
 * Create a new account verified via Google OAuth registration token for supported roles and portals
 */
async function completeGoogleRegistration(req, res) {
  try {
    const {
      regToken,
      name,
      department,
      year,
      section,
      bus_number,
      boarding_point,
      room_number,
      floor,
      assigned_floor
    } = req.body;

    // 1. Validate registration token presence
    if (!regToken || typeof regToken !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Temporary registration token is required.'
      });
    }

    // 2. Cryptographically verify signature and expiration of registration token
    const secret = process.env.JWT_SECRET || 'your_jwt_secret_key_feedbackiq_2026';
    let decoded;
    try {
      decoded = jwt.verify(regToken, secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(400).json({
          success: false,
          message: 'Registration session has expired. Please sign in with Google again.'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid registration token. Please sign in with Google again.'
      });
    }

    // 3. Verify token purpose, verified email, role, and portal
    const validPurposes = ['google_account_registration', 'google_student_registration'];
    if (!validPurposes.includes(decoded.purpose) || !decoded.email) {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration token payload.'
      });
    }

    const verifiedEmail = decoded.email.trim().toLowerCase();
    const verifiedRole = (decoded.role && ALLOWED_ROLES.includes(decoded.role.toLowerCase()))
      ? decoded.role.toLowerCase()
      : 'student';
    const verifiedPortal = (decoded.portal && ALLOWED_PORTALS.includes(decoded.portal.toLowerCase()))
      ? decoded.portal.toLowerCase()
      : 'education';

    // Staff and administrative accounts cannot be registered via Google self-registration
    if (verifiedRole !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only student accounts can be registered through Google registration.'
      });
    }

    // 4. Mandatory second database check: prevent duplicate registration or token reuse
    const [existingUsers] = await pool.execute(
      'SELECT id, name, email, role, portal, department, department_id FROM users WHERE email = ?',
      [verifiedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please proceed to sign in.'
      });
    }

    // 5. Validate user name
    const userName = (typeof name === 'string' && name.trim()) ? name.trim() : (decoded.name || '');
    if (!userName || userName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name is required and must be at least 2 characters.'
      });
    }

    // 6. Validate department according to role and portal
    let validatedDepartment = null;
    let departmentId = null;

    if (verifiedRole === 'management' || verifiedPortal === 'bus' || verifiedPortal === 'hostel') {
      // Department is optional for management or bus/hostel portals
      if (department && typeof department === 'string' && department.trim() !== '') {
        const matchedDept = OFFICIAL_DEPARTMENTS.find(
          (d) => d.toLowerCase() === department.trim().toLowerCase()
        );
        if (matchedDept) {
          validatedDepartment = matchedDept;
          const [deptRows] = await pool.execute('SELECT id FROM departments WHERE name = ?', [matchedDept]);
          if (deptRows.length > 0) departmentId = deptRows[0].id;
        }
      }
    } else {
      // Department is strictly required for education student, faculty, and hod
      if (!department || typeof department !== 'string' || department.trim() === '') {
        return res.status(400).json({
          success: false,
          message: `Department selection is required for ${verifiedRole.toUpperCase()}.`
        });
      }

      const matchedDept = OFFICIAL_DEPARTMENTS.find(
        (d) => d.toLowerCase() === department.trim().toLowerCase()
      );

      if (!matchedDept) {
        return res.status(400).json({
          success: false,
          message: `Invalid department. Must be one of the official departments: ${OFFICIAL_DEPARTMENTS.join(', ')}.`
        });
      }

      validatedDepartment = matchedDept;
      const [deptRows] = await pool.execute(
        'SELECT id FROM departments WHERE name = ?',
        [matchedDept]
      );

      if (deptRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Selected department does not exist in the institutional database.'
        });
      }
      departmentId = deptRows[0].id;
    }

    // 7. Validate student-specific Year and Section for Education
    let validatedYear = null;
    let validatedSection = null;

    if (verifiedRole === 'student' && verifiedPortal === 'education') {
      if (!year || typeof year !== 'string' || !OFFICIAL_STUDENT_YEARS.includes(year.trim())) {
        return res.status(400).json({
          success: false,
          message: `Valid student year is required. Must be one of: ${OFFICIAL_STUDENT_YEARS.join(', ')}.`
        });
      }
      validatedYear = year.trim();

      const normalizedSection = typeof section === 'string' ? section.trim().toUpperCase() : '';
      if (!normalizedSection || !OFFICIAL_STUDENT_SECTIONS.includes(normalizedSection)) {
        return res.status(400).json({
          success: false,
          message: `Valid student section is required. Must be one of: ${OFFICIAL_STUDENT_SECTIONS.join(', ')}.`
        });
      }
      validatedSection = normalizedSection;
    }

    // 8. Portal-specific validations for Bus and Hostel
    let busNumber = null;
    let boardingPoint = null;
    let roomNumber = null;
    let floorVal = null;
    let assignedFloorVal = null;

    if (verifiedPortal === 'bus') {
      busNumber = bus_number ? String(bus_number).trim() : null;
      boardingPoint = boarding_point ? String(boarding_point).trim() : null;
      if (verifiedRole === 'bus_incharge' && !busNumber) {
        return res.status(400).json({
          success: false,
          message: 'bus_number is required for bus_incharge.'
        });
      }
    } else if (verifiedPortal === 'hostel') {
      roomNumber = room_number ? String(room_number).trim() : null;
      if (floor && OFFICIAL_HOSTEL_FLOORS.includes(String(floor).trim())) {
        floorVal = String(floor).trim();
      }
      if (verifiedRole === 'hostel_warden') {
        if (!assigned_floor || !OFFICIAL_HOSTEL_FLOORS.includes(String(assigned_floor).trim())) {
          return res.status(400).json({
            success: false,
            message: `Valid assigned_floor is required for hostel_warden (${OFFICIAL_HOSTEL_FLOORS.join(', ')}).`
          });
        }
        assignedFloorVal = String(assigned_floor).trim();
      }
    }

    // 9. Generate unpredictable random password hash to satisfy password_hash NOT NULL constraint
    const randomSecret = crypto.randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(randomSecret, 10);

    // 10. Insert new user record in users table with full portal metadata
    const [result] = await pool.execute(
      `INSERT INTO users (
        name, email, password_hash, role, portal, department, department_id,
        year, section, bus_number, boarding_point, room_number, floor, assigned_floor
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userName, verifiedEmail, passwordHash, verifiedRole, verifiedPortal, validatedDepartment, departmentId,
        validatedYear, validatedSection, busNumber, boardingPoint, roomNumber, floorVal, assignedFloorVal
      ]
    );

    const newUser = {
      id: result.insertId,
      name: userName,
      email: verifiedEmail,
      role: verifiedRole,
      portal: verifiedPortal,
      department: validatedDepartment,
      department_id: departmentId,
      year: validatedYear,
      section: validatedSection,
      bus_number: busNumber,
      boarding_point: boardingPoint,
      room_number: roomNumber,
      floor: floorVal,
      assigned_floor: assignedFloorVal
    };

    // 11. Generate normal FeedbackIQ JWT
    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: `${verifiedRole.charAt(0).toUpperCase() + verifiedRole.slice(1)} account registered successfully.`,
      data: {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          portal: newUser.portal,
          department: newUser.department,
          departmentId: newUser.department_id,
          year: newUser.year,
          section: newUser.section,
          bus_number: newUser.bus_number,
          boarding_point: newUser.boarding_point,
          room_number: newUser.room_number,
          floor: newUser.floor,
          assigned_floor: newUser.assigned_floor
        },
        token
      }
    });
  } catch (error) {
    console.error('[GOOGLE REGISTER ERROR]:', error.message || error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please proceed to sign in.'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error completing registration.'
    });
  }
}

module.exports = {
  OFFICIAL_DEPARTMENTS,
  OFFICIAL_STUDENT_YEARS,
  OFFICIAL_STUDENT_SECTIONS,
  REGISTRATION_TOKEN_PURPOSE,
  generateRegistrationToken,
  register,
  login,
  googleAuth,
  googleCallback,
  completeGoogleRegistration,
  completeGoogleStudentRegistration: completeGoogleRegistration,
  getMe,
  updateProfile
};
