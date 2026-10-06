const AuditLog = require('../models/AuditLog');

// Fire-and-forget: audit failures must never break the main request.
module.exports = function audit(actor, action, entity, entityId, meta = {}) {
  AuditLog.create({ actor: actor?._id || actor, action, entity, entityId, meta }).catch((e) =>
    console.error('Audit log failed:', e.message)
  );
};
