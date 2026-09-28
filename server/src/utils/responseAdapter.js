const adaptJudgeResponse = (backendResult) => {
  const { verdict, need, reason, action, resetSeconds } = backendResult;

  // Derive micro_task type deterministically based on need
  let microTaskType = 'none';
  if (verdict === 'allow') {
    microTaskType = 'none';
  } else {
    switch (need) {
      case 'tired':
        microTaskType = 'eye_rest';
        break;
      case 'stressed':
        microTaskType = 'breathing';
        break;
      case 'bored':
        microTaskType = 'stretch';
        break;
      case 'lonely':
        microTaskType = 'walk';
        break;
      case 'avoiding':
        microTaskType = 'first_step';
        break;
      case 'genuine':
        microTaskType = 'none';
        break;
      default:
        microTaskType = 'breathing';
    }
  }

  const micro_task = {
    type: microTaskType,
    seconds: verdict === 'allow' ? 0 : (resetSeconds || 60)
  };

  const roast = `${reason} ${action}`.trim();
  const minutes_granted = verdict === 'allow' ? 5 : 0;
  const distress_flag = false;

  return {
    roast,
    micro_task,
    minutes_granted,
    distress_flag
  };
};

module.exports = { adaptJudgeResponse };
