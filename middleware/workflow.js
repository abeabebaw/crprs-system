// Application status workflow transitions
const APPLICATION_TRANSITIONS = {
  SUBMITTED: ['READY_FOR_FILE_ATTACHMENT', 'IN_PROGRESS', 'WITHDRAWN'],
  READY_FOR_FILE_ATTACHMENT: ['FILE_ATTACHMENT_STARTING', 'WITHDRAWN'],
  FILE_ATTACHMENT_STARTING: ['FILE_ATTACHMENT_FINISHED', 'WITHDRAWN'],
  FILE_ATTACHMENT_FINISHED: ['IN_PROGRESS', 'WITHDRAWN'],
  IN_PROGRESS: ['FINISHED', 'WITHDRAWN'],
  FINISHED: ['COMPLETED'],
  COMPLETED: [],
  WITHDRAWN: []
};

// Transaction status workflow transitions
const TRANSACTION_TRANSITIONS = {
  CREATED: ['INITIATED', 'CANCELLED'],
  INITIATED: ['IN_PROCESS', 'CANCELLED'],
  IN_PROCESS: ['READY_FOR_APPROVAL', 'CANCELLED'],
  READY_FOR_APPROVAL: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['NOT_IN_TASK'],
  REJECTED: ['IN_PROCESS'],
  CANCELLED: [],
  NOT_IN_TASK: ['DELIVERED'],
  DELIVERED: []
};

const canTransitionApplication = (fromStatus, toStatus) => {
  const allowed = APPLICATION_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
};

const canTransitionTransaction = (fromStatus, toStatus) => {
  const allowed = TRANSACTION_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
};

module.exports = {
  APPLICATION_TRANSITIONS,
  TRANSACTION_TRANSITIONS,
  canTransitionApplication,
  canTransitionTransaction
};