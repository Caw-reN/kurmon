/**
 * Utility helper to record in-app activities to /api/audit-logs
 */
export const recordAuditLog = async ({ action, detail, targetType = 'SYSTEM' }) => {
  try {
    const session = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}');
    const token = session?.authToken || localStorage.getItem('token') || '';
    if (!token) return;

    await fetch('/api/audit-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action,
        detail,
        targetType
      })
    });
  } catch (e) {
    // Non-blocking logging
    console.debug('audit log record:', e);
  }
};
