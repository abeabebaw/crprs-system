const allowedTransitions = {
  SUBMITTED: ['READY_FOR_FILE_ATTACHMENT', 'FILE_ATTACHMENT_STARTING', 'FILE_ATTACHMENT_FINISHED', 'IN_PROGRESS', 'WITHDRAWN'],
  READY_FOR_FILE_ATTACHMENT: ['FILE_ATTACHMENT_STARTING', 'FILE_ATTACHMENT_FINISHED', 'IN_PROGRESS', 'WITHDRAWN'],
  FILE_ATTACHMENT_STARTING: ['FILE_ATTACHMENT_FINISHED', 'IN_PROGRESS', 'WITHDRAWN'],
  FILE_ATTACHMENT_FINISHED: ['IN_PROGRESS', 'WITHDRAWN'],
  IN_PROGRESS: ['FILE_ATTACHMENT_FINISHED', 'FINISHED', 'WITHDRAWN'],
  FINISHED: ['COMPLETED', 'WITHDRAWN'],
  COMPLETED: [],
  WITHDRAWN: [],
};

const allowedTransactionTransitions = {
  CREATED: ['INITIATED', 'CANCELLED'],
  INITIATED: ['IN_PROCESS', 'CANCELLED'],
  IN_PROCESS: ['READY_FOR_APPROVAL', 'CANCELLED'],
  READY_FOR_APPROVAL: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['DELIVERED', 'NOT_IN_TASK', 'CANCELLED'],
  REJECTED: ['INITIATED', 'CANCELLED'],
  CANCELLED: [],
  DELIVERED: [],
  NOT_IN_TASK: ['INITIATED', 'CANCELLED'],
};

function canTransitionApplication(fromStatus, toStatus) {
  return allowedTransitions[fromStatus]?.includes(toStatus) || false;
}

function canTransitionTransaction(fromStatus, toStatus) {
  return allowedTransactionTransitions[fromStatus]?.includes(toStatus) || false;
}

module.exports = { 
  canTransitionApplication,
  canTransitionTransaction 
};
