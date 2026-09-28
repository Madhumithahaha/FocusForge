const INTERVENTION_CATALOG = {
  tired: [
    { id: 'eye_rest', type: 'eye_rest', title: 'Give your eyes a break', instruction: 'Look away from the screen, ideally out a window, and blink slowly.', seconds: 60, applicableNeeds: ['tired'] },
    { id: 'water_tired', type: 'water', title: 'Hydrate to wake up', instruction: 'Go get a cold glass of water and drink it slowly.', seconds: 60, applicableNeeds: ['tired'] },
    { id: 'stand_stretch', type: 'stretch', title: 'Stand and stretch', instruction: 'Stand up, reach for the ceiling, and take a deep breath.', seconds: 90, applicableNeeds: ['tired'] },
    { id: 'look_away', type: 'eye_rest', title: '20-20-20 rule', instruction: 'Look at something 20 feet away for at least 20 seconds.', seconds: 20, applicableNeeds: ['tired'] }
  ],
  stressed: [
    { id: 'breathing', type: 'breathing', title: 'Box breathing', instruction: 'Inhale for 4s, hold for 4s, exhale for 4s, hold for 4s.', seconds: 90, applicableNeeds: ['stressed'] },
    { id: 'shoulder_release', type: 'stretch', title: 'Release tension', instruction: 'Roll your shoulders back and drop them down. Shake out your hands.', seconds: 60, applicableNeeds: ['stressed'] },
    { id: 'step_away', type: 'walk', title: 'Change your environment', instruction: 'Step away from your desk. Walk to another room and back.', seconds: 120, applicableNeeds: ['stressed'] },
    { id: 'slow_breathing', type: 'breathing', title: 'Slow exhale', instruction: 'Take a normal breath in, then exhale as slowly as you possibly can.', seconds: 60, applicableNeeds: ['stressed'] }
  ],
  bored: [
    { id: 'stretch_bored', type: 'stretch', title: 'Physical reset', instruction: 'Do 5 squats or stretch your arms wide. Get your blood moving.', seconds: 60, applicableNeeds: ['bored'] },
    { id: 'short_walk_bored', type: 'walk', title: 'Pace', instruction: 'Walk around the room or hallway for a minute.', seconds: 90, applicableNeeds: ['bored'] },
    { id: 'water_bored', type: 'water', title: 'Mindful water break', instruction: 'Get some water. Focus entirely on the temperature and sensation of drinking.', seconds: 60, applicableNeeds: ['bored'] },
    { id: 'look_outside', type: 'eye_rest', title: 'Change scenery', instruction: 'Look out a window and observe 3 things you can see.', seconds: 60, applicableNeeds: ['bored'] }
  ],
  lonely: [
    { id: 'short_walk_lonely', type: 'walk', title: 'Change of space', instruction: 'Walk around your living space or office.', seconds: 60, applicableNeeds: ['lonely'] },
    { id: 'message_someone', type: 'first_step', title: 'Connect', instruction: 'Send a short message to a friend or family member just to say hi.', seconds: 120, applicableNeeds: ['lonely'] },
    { id: 'step_away_lonely', type: 'walk', title: 'Step away', instruction: 'Get up and take a physical step away from your device.', seconds: 60, applicableNeeds: ['lonely'] }
  ],
  avoiding: [
    { id: 'open_assignment', type: 'first_step', title: 'Just open it', instruction: 'Open the document, app, or email you are avoiding. Just look at it.', seconds: 60, applicableNeeds: ['avoiding'] },
    { id: 'read_first_question', type: 'first_step', title: 'Read only', instruction: 'Read the very first sentence or question of your task. Don\'t solve it yet.', seconds: 60, applicableNeeds: ['avoiding'] },
    { id: 'write_one_sentence', type: 'first_step', title: 'Micro progress', instruction: 'Write one single sentence or line of code. You can stop after.', seconds: 90, applicableNeeds: ['avoiding'] },
    { id: 'create_file', type: 'first_step', title: 'Setup', instruction: 'Create the blank file or open the software you need.', seconds: 60, applicableNeeds: ['avoiding'] },
    { id: 'first_step', type: 'first_step', title: 'Define the first step', instruction: 'Write down exactly what the very next physical action is.', seconds: 60, applicableNeeds: ['avoiding'] }
  ],
  genuine: [
    { id: 'none', type: 'none', title: 'None', instruction: '', seconds: 0, applicableNeeds: ['genuine'] }
  ],
  other: [
    { id: 'water', type: 'water', title: 'Hydrate', instruction: 'Drink a glass of water.', seconds: 60, applicableNeeds: ['other'] },
    { id: 'stretch', type: 'stretch', title: 'Stretch', instruction: 'Stretch your arms and legs.', seconds: 60, applicableNeeds: ['other'] },
    { id: 'short_walk', type: 'walk', title: 'Walk', instruction: 'Take a short walk.', seconds: 60, applicableNeeds: ['other'] },
    { id: 'breathing_other', type: 'breathing', title: 'Breathe', instruction: 'Take three deep breaths.', seconds: 60, applicableNeeds: ['other'] }
  ]
};

function getIntervention(needCategory, interventionId) {
  let categoryList = INTERVENTION_CATALOG[needCategory] || INTERVENTION_CATALOG['other'];
  let intervention = categoryList.find(i => i.id === interventionId);
  
  if (!intervention) {
    // Search across all if not in the specific category
    for (const key in INTERVENTION_CATALOG) {
      intervention = INTERVENTION_CATALOG[key].find(i => i.id === interventionId);
      if (intervention) break;
    }
  }

  // Deterministic fallback if absolutely not found
  if (!intervention) {
    intervention = categoryList[0] || INTERVENTION_CATALOG['other'][0];
  }
  return intervention;
}

function getAllInterventionIds() {
  const ids = [];
  for (const cat in INTERVENTION_CATALOG) {
    for (const intv of INTERVENTION_CATALOG[cat]) {
      ids.push(intv.id);
    }
  }
  return [...new Set(ids)]; // unique
}

module.exports = {
  INTERVENTION_CATALOG,
  getIntervention,
  getAllInterventionIds
};
