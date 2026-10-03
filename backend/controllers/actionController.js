const { pool } = require('../config/db');
const actionService = require('../services/actionService');
const { OFFICIAL_DEPARTMENTS } = require('../services/analyticsService');
const { isMatchingBus } = require('../utils/busUtils');

/**
 * Helper to resolve and strictly validate scope for actions
 */
function resolveActionDepartment(req, res) {
  const { role, department: userDept, portal: userPortal, bus_number, assigned_floor, floor } = req.user;
  const requestedDept = req.query.department || req.body?.department;
  const requestedPortal = req.query.portal || req.body?.portal;
  const requestedBus = req.query.bus_number || req.body?.bus_number;
  const requestedFloor = req.query.floor || req.body?.floor;

  if (role === 'bus_incharge') {
    if (requestedBus && requestedBus.toUpperCase() !== 'ALL' && bus_number && !isMatchingBus(requestedBus, bus_number)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: You are assigned to "${bus_number}" and cannot access "${requestedBus}".`
      });
      return { error: true };
    }
    return { department: null, portal: 'bus', bus_number: requestedBus || bus_number || null, error: false };
  }

  if (role === 'transport_incharge') {
    return { department: null, portal: 'bus', bus_number: requestedBus || null, error: false };
  }

  if (role === 'hostel_warden') {
    if (requestedFloor && requestedFloor.trim().toLowerCase() !== (assigned_floor || '').trim().toLowerCase()) {
      res.status(403).json({
        success: false,
        message: `Forbidden: You are assigned to "${assigned_floor}" and cannot access "${requestedFloor}".`
      });
      return { error: true };
    }
    return { department: null, portal: 'hostel', floor: assigned_floor, error: false };
  }

  if (role === 'student') {
    if (userPortal === 'bus') {
      return { department: null, portal: 'bus', bus_number, error: false };
    }
    if (userPortal === 'hostel') {
      return { department: null, portal: 'hostel', floor, error: false };
    }
  }

  if (role === 'student' || role === 'faculty') {
    if (!userDept) {
      res.status(403).json({
        success: false,
        message: `Forbidden: ${role === 'faculty' ? 'Faculty' : 'Student'} profile does not have an assigned department.`
      });
      return { error: true };
    }

    if (requestedDept) {
      const normReq = requestedDept.trim().toLowerCase();
      const normUser = userDept.trim().toLowerCase();
      if (normReq !== normUser) {
        res.status(403).json({
          success: false,
          message: `Forbidden: ${role === 'faculty' ? 'Faculty' : 'Student'} of "${userDept}" cannot access actions from "${requestedDept}".`
        });
        return { error: true };
      }
    }

    return { department: userDept, portal: 'education', error: false };
  }

  if (role === 'hod') {
    if (!userDept) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: HOD profile does not have an assigned department.'
      });
      return { error: true };
    }

    if (requestedDept) {
      const normReq = requestedDept.trim().toLowerCase();
      const normUser = userDept.trim().toLowerCase();
      if (normReq !== normUser) {
        res.status(403).json({
          success: false,
          message: `Forbidden: HOD of "${userDept}" cannot access or create actions for "${requestedDept}".`
        });
        return { error: true };
      }
    }

    return { department: userDept, portal: 'education', error: false };
  }

  if (role === 'management') {
    const effPortal = requestedPortal ? requestedPortal.toLowerCase() : null;
    if (effPortal === 'bus') {
      return { department: null, portal: 'bus', bus_number: requestedBus || null, error: false };
    }
    if (effPortal === 'hostel') {
      return { department: null, portal: 'hostel', floor: requestedFloor || null, error: false };
    }

    if (!requestedDept || requestedDept.toLowerCase() === 'all' || requestedDept.toLowerCase() === 'all departments') {
      return { department: null, portal: effPortal, error: false };
    }

    const matched = OFFICIAL_DEPARTMENTS.find(d => d.toLowerCase() === requestedDept.trim().toLowerCase());
    if (!matched) {
      res.status(400).json({
        success: false,
        message: `Invalid department "${requestedDept}". Must be one of: ${OFFICIAL_DEPARTMENTS.join(', ')}.`
      });
      return { error: true };
    }

    return { department: matched, portal: effPortal || 'education', error: false };
  }

  res.status(403).json({ success: false, message: 'Forbidden: Unauthorized role.' });
  return { error: true };
}

/**
 * POST /api/actions
 * Create an action
 */
async function createAction(req, res) {
  try {
    const { role } = req.user;
    if (role === 'bus_incharge') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Bus Incharge can only view corrective actions and cannot create actions.'
      });
    }

    const ACTION_MANAGER_ROLES = ['hod', 'transport_incharge', 'hostel_warden'];
    if (!ACTION_MANAGER_ROLES.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role "${role}" cannot create administrative actions.`
      });
    }

    // Check if HOD attempted to create action for another department
    if (role === 'hod' && req.body.department) {
      if (req.body.department.trim().toLowerCase() !== req.user.department.trim().toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: HOD of "${req.user.department}" cannot create actions for "${req.body.department}".`
        });
      }
    }

    const action = await actionService.createAction(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: 'Action created successfully.',
      data: action
    });
  } catch (error) {
    console.error('[ACTION CONTROLLER ERROR - createAction]:', error);
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * GET /api/actions
 * Retrieve actions list
 */
async function getActions(req, res) {
  try {
    const scope = resolveActionDepartment(req, res);
    if (scope.error) return;

    const data = await actionService.getActions(scope.department, {
      ...req.query,
      portal: scope.portal,
      bus_number: scope.bus_number,
      floor: scope.floor
    });
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[ACTION CONTROLLER ERROR - getActions]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve actions.',
      error: error.message
    });
  }
}

/**
 * GET /api/actions/:id
 * Retrieve single action with updates audit trail
 */
async function getActionById(req, res) {
  try {
    const { role, department: userDept } = req.user;

    const deptFilter = (role === 'hod' || role === 'student' || role === 'faculty') ? userDept : null;
    const action = await actionService.getActionById(req.params.id, deptFilter);

    if (!action) {
      // Check if action exists in another department to return 403 instead of 404 for department-bound roles
      if (role === 'hod' || role === 'student' || role === 'faculty') {
        const anyAction = await actionService.getActionById(req.params.id, null);
        if (anyAction && anyAction.department && userDept && anyAction.department.toLowerCase() !== userDept.toLowerCase()) {
          const roleTitle = role.charAt(0).toUpperCase() + role.slice(1);
          return res.status(403).json({
            success: false,
            message: `Forbidden: ${roleTitle} of "${userDept}" cannot access action from "${anyAction.department}".`
          });
        }
      }
      return res.status(404).json({
        success: false,
        message: `Action with ID "${req.params.id}" not found.`
      });
    }

    return res.status(200).json({
      success: true,
      data: action
    });
  } catch (error) {
    console.error('[ACTION CONTROLLER ERROR - getActionById]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve action.',
      error: error.message
    });
  }
}

/**
 * PUT /api/actions/:id
 * Update an action
 */
async function updateAction(req, res) {
  try {
    const { role, department: userDept } = req.user;
    if (role === 'bus_incharge') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Bus Incharge can only view corrective actions and cannot modify action status.'
      });
    }

    if (role === 'student' || role === 'faculty' || role === 'management') {
      return res.status(403).json({
        success: false,
        message: `Forbidden: ${role === 'faculty' ? 'Faculty' : role === 'student' ? 'Students' : 'Management'} cannot update administrative actions.`
      });
    }

    if (role === 'hod') {
      const existing = await actionService.getActionById(req.params.id, null);
      if (existing && existing.department !== userDept) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: HOD of "${userDept}" cannot update action in "${existing.department}".`
        });
      }
    }

    const updated = await actionService.updateAction(req.params.id, req.body, req.user);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: `Action with ID "${req.params.id}" not found.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Action updated successfully.',
      data: updated
    });
  } catch (error) {
    console.error('[ACTION CONTROLLER ERROR - updateAction]:', error);
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * DELETE /api/actions/:id
 * Delete an action
 */
async function deleteAction(req, res) {
  try {
    const { role, department: userDept } = req.user;
    if (role === 'bus_incharge') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Bus Incharge can only view corrective actions and cannot delete actions.'
      });
    }

    if (role === 'student' || role === 'faculty' || role === 'management') {
      return res.status(403).json({
        success: false,
        message: `Forbidden: ${role === 'faculty' ? 'Faculty' : role === 'student' ? 'Students' : 'Management'} cannot delete administrative actions.`
      });
    }

    if (role === 'hod') {
      const existing = await actionService.getActionById(req.params.id, null);
      if (existing && existing.department !== userDept) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: HOD of "${userDept}" cannot delete action in "${existing.department}".`
        });
      }
    }

    const result = await actionService.deleteAction(req.params.id, role === 'hod' ? userDept : null);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: `Action with ID "${req.params.id}" not found.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Action deleted successfully.'
    });
  } catch (error) {
    console.error('[ACTION CONTROLLER ERROR - deleteAction]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete action.',
      error: error.message
    });
  }
}

/**
 * POST /api/actions/:id/updates
 * Add progress update to action audit trail
 */
async function addActionUpdate(req, res) {
  try {
    const { role, department: userDept } = req.user;
    if (role === 'bus_incharge') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Bus Incharge can only view corrective actions and cannot add action updates.'
      });
    }

    if (role === 'student' || role === 'faculty' || role === 'management') {
      return res.status(403).json({
        success: false,
        message: `Forbidden: ${role === 'faculty' ? 'Faculty' : role === 'student' ? 'Students' : 'Management'} cannot add action updates.`
      });
    }

    const { updateText, newStatus } = req.body;
    if (!updateText) {
      return res.status(400).json({
        success: false,
        message: 'Update text is required.'
      });
    }

    if (role === 'hod') {
      const existing = await actionService.getActionById(req.params.id, null);
      if (existing && existing.department !== userDept) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: HOD of "${userDept}" cannot update action in "${existing.department}".`
        });
      }
    }

    const update = await actionService.addActionUpdate(req.params.id, updateText, newStatus, req.user);
    if (!update) {
      return res.status(404).json({
        success: false,
        message: `Action with ID "${req.params.id}" not found.`
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Action progress update recorded.',
      data: update
    });
  } catch (error) {
    console.error('[ACTION CONTROLLER ERROR - addActionUpdate]:', error);
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  createAction,
  getActions,
  getActionById,
  updateAction,
  deleteAction,
  addActionUpdate
};
