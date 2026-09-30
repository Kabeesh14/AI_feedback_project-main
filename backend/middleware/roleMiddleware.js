/**
 * Role-Based Access Control Middleware
 * Restricts route access to specified roles.
 *
 * @param  {...string} allowedRoles - e.g. 'student', 'hod', 'management'
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking permissions.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires one of [${allowedRoles.join(', ')}], but your role is "${req.user.role}".`
      });
    }

    next();
  };
}

/**
 * Department-Based Isolation Middleware
 * Enforces strict department boundary rules:
 * - Management: full access across all departments.
 * - HOD: strictly restricted to their own assigned department.
 * - Student: cannot access departmental administrative scopes.
 *
 * @param {Function} [getDepartmentParam] - Custom extractor function, defaults to checking req.params, req.query, or req.body
 */
function requireDepartmentAccess(getDepartmentParam = (req) => req.params.department || req.query.department || req.body.department) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const { role, department: userDepartment } = req.user;

    // Management has cross-department authority across all 9 departments
    if (role === 'management') {
      return next();
    }

    const targetDepartment = getDepartmentParam(req);

    if (!targetDepartment) {
      return res.status(400).json({
        success: false,
        message: 'Department parameter is required for this operation.'
      });
    }

    // HOD and Faculty are strictly restricted to their own department
    if (role === 'hod' || role === 'faculty') {
      if (!userDepartment) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: ${role === 'faculty' ? 'Faculty' : 'HOD'} profile does not have an assigned department.`
        });
      }

      // Case-insensitive comparison of official department names
      if (userDepartment.trim().toLowerCase() !== targetDepartment.trim().toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: ${role === 'faculty' ? 'Faculty' : 'HOD'} of "${userDepartment}" is not authorized to access data for "${targetDepartment}".`
        });
      }

      return next();
    }

    // Students cannot access department administrative resources
    if (role === 'student') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Students are not authorized to access department administrative data.'
      });
    }

    return res.status(403).json({
      success: false,
      message: 'Forbidden: Unauthorized department access.'
    });
  };
}

/**
 * Student Self-Access Protection Middleware
 * Ensures a student can only view/modify their own personal records.
 *
 * @param {Function} [getStudentIdParam] - Custom extractor, defaults to req.params.studentId
 */
function requireStudentSelf(getStudentIdParam = (req) => req.params.studentId || req.query.studentId || req.body.studentId) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const targetStudentId = parseInt(getStudentIdParam(req), 10);

    // If user is a student, target ID must strictly match their own user ID
    if (req.user.role === 'student') {
      if (isNaN(targetStudentId) || req.user.id !== targetStudentId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Students can only access their own records.'
        });
      }
    }

    // Management has global oversight
    // HOD validation for student department can be verified at controller level
    next();
  };
}

/**
 * Helper: Resolve trusted department filter for database queries.
 * Never trusts client-supplied department values for HOD or Student users.
 *
 * @param {Object} user - The authenticated req.user object
 * @param {string|null} [clientRequestedDept] - Optional department requested by client (only honored for management)
 * @returns {string|null} - Resolved department string or null (meaning all departments)
 */
function resolveTrustedDepartment(user, clientRequestedDept = null) {
  if (user.role === 'management') {
    return clientRequestedDept || null; // Management can see all or filter
  }
  return user.department; // HOD and Student are strictly bounded to their own assigned department
}

/**
 * Portal-Based Access Control Middleware
 * Restricts route access to specified portals (e.g. 'education', 'bus', 'hostel').
 * Management role has cross-portal institutional oversight.
 *
 * @param  {...string} allowedPortals - e.g. 'education', 'bus', 'hostel'
 */
function requirePortal(...allowedPortals) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking portal permissions.'
      });
    }

    // Management role has cross-portal access
    if (req.user.role === 'management') {
      return next();
    }

    const userPortal = (req.user.portal || 'education').toLowerCase();
    const normalizedAllowed = allowedPortals.map((p) => p.toLowerCase());

    if (!normalizedAllowed.includes(userPortal)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires portal [${allowedPortals.join(', ')}], but your account is registered for "${req.user.portal}".`
      });
    }

    next();
  };
}

/**
 * Bus-Based Scope Enforcement Middleware
 * Ensures:
 * - Management & Transport Incharge: access to all buses or specified bus.
 * - Bus Incharge: strictly scoped to user.bus_number.
 * - Student: strictly scoped to user.bus_number.
 */
function requireBusAccess(getBusParam = (req) => req.params.bus_number || req.query.bus_number || req.body.bus_number) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const { role, bus_number } = req.user;

    // Management and Transport Incharge have fleet-wide authority
    if (role === 'management' || role === 'transport_incharge') {
      return next();
    }

    const targetBus = getBusParam(req);

    if (role === 'bus_incharge') {
      if (!bus_number) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Bus Incharge does not have an assigned bus number.'
        });
      }
      if (targetBus && targetBus.trim().toLowerCase() !== bus_number.trim().toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: You are assigned to "${bus_number}" and cannot access "${targetBus}".`
        });
      }
      return next();
    }

    if (role === 'student') {
      if (targetBus && bus_number && targetBus.trim().toLowerCase() !== bus_number.trim().toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You cannot access bus data outside your assigned bus.'
        });
      }
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Forbidden: Unauthorized bus portal access.'
    });
  };
}

/**
 * Hostel Floor-Based Scope Enforcement Middleware
 * Ensures:
 * - Management: access to all floors.
 * - Hostel Warden: strictly scoped to user.assigned_floor.
 * - Student: strictly scoped to user.floor.
 */
function requireFloorAccess(getFloorParam = (req) => req.params.floor || req.query.floor || req.body.floor) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const { role, assigned_floor, floor } = req.user;

    // Management has hostel-wide authority
    if (role === 'management') {
      return next();
    }

    const targetFloor = getFloorParam(req);

    if (role === 'hostel_warden') {
      if (!assigned_floor) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Hostel Warden does not have an assigned floor.'
        });
      }
      if (targetFloor && targetFloor.trim().toLowerCase() !== assigned_floor.trim().toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: You are assigned to "${assigned_floor}" and cannot access "${targetFloor}".`
        });
      }
      return next();
    }

    if (role === 'student') {
      if (targetFloor && floor && targetFloor.trim().toLowerCase() !== floor.trim().toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You cannot access hostel data outside your assigned floor.'
        });
      }
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Forbidden: Unauthorized hostel floor access.'
    });
  };
}

/**
 * Helper: Resolve trusted bus filter for database queries.
 * Prevents unauthorized bus parameter spoofing.
 */
function resolveTrustedBus(user, clientRequestedBus = null) {
  if (user.role === 'management' || user.role === 'transport_incharge') {
    return clientRequestedBus || null;
  }
  if (user.role === 'bus_incharge') {
    return user.bus_number || null;
  }
  if (user.role === 'student') {
    return user.bus_number || null;
  }
  return null;
}

/**
 * Helper: Resolve trusted hostel floor filter for database queries.
 * Prevents unauthorized floor parameter spoofing.
 */
function resolveTrustedFloor(user, clientRequestedFloor = null) {
  if (user.role === 'management') {
    return clientRequestedFloor || null;
  }
  if (user.role === 'hostel_warden') {
    return user.assigned_floor || null;
  }
  if (user.role === 'student') {
    return user.floor || null;
  }
  return null;
}

module.exports = {
  requireRole,
  requireDepartmentAccess,
  requireStudentSelf,
  resolveTrustedDepartment,
  requirePortal,
  requireBusAccess,
  requireFloorAccess,
  resolveTrustedBus,
  resolveTrustedFloor
};

