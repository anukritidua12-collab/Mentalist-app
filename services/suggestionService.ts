// Suggested tasks under the Today list. A new set appears every 20 minutes while the
// app is open, and a suggestion isn't shown again for at least 5 days. With 4 shown per
// set, the pool below (about 500) covers a full 8-hour day of use before anything could come back;
// past that, the suggestions seen longest ago are reused first.

const ROTATE_EVERY_MS = 20 * 60 * 1000;
const NO_REPEAT_MS = 5 * 24 * 60 * 60 * 1000;
const STATE_KEY = 'mentalist_suggestion_state';

export const SUGGESTION_POOL: string[] = [
  // Work
  'Clear my inbox', 'Reply to pending emails', 'Plan tomorrow’s priorities', 'Update the project tracker',
  'Prepare notes for the next meeting', 'Send the weekly status update', 'Review my calendar for the week',
  'Follow up with a colleague', 'Draft the agenda for Monday', 'Tidy my desktop files', 'Back up work documents',
  'Book a meeting room', 'Write meeting minutes', 'Share the slides with the team', 'Check in with my manager',
  'Update my timesheet', 'File this month’s expenses', 'Archive old email threads', 'Review a teammate’s draft',
  'Block focus time in my calendar', 'Prepare a one-page summary', 'Set goals for the quarter',
  'Rename and sort shared folders', 'Thank someone for their help', 'Update my LinkedIn profile',
  'Clean up my to-do backlog', 'Schedule a 1:1 catch-up', 'Prepare questions for the client call',
  'Proofread the report', 'Send the invoice', 'Chase an unpaid invoice', 'Confirm deadlines with the team',
  'Write down three wins from this week', 'Unsubscribe from five newsletters', 'Update my email signature',
  'Turn off notifications for an hour', 'Prepare for the presentation', 'Rehearse the pitch once',
  'Sort the downloads folder', 'Close unused browser tabs', 'Note down ideas from today',
  'Organise the shared drive', 'Review the budget sheet', 'Plan the team lunch', 'Respond to a pending request',
  'Set an out-of-office reply', 'Write a short project update', 'Collect feedback from the team',
  'Map out next week’s deadlines', 'Make a list of open questions',
  // Study and group projects
  'Review today’s lecture notes', 'Revise one chapter', 'Make flashcards for the test', 'Finish the assignment draft',
  'Email the professor a question', 'Divide tasks for the group project', 'Book a slot in the library',
  'Read one research paper', 'Summarise the reading in five lines', 'Practise past exam questions',
  'Organise my study notes', 'Plan the week’s study timetable', 'Submit the assignment', 'Cite sources for the essay',
  'Check the course portal for updates', 'Watch the missed lecture', 'Make a mind map of the topic',
  'Set up a group study call', 'Share notes with the group', 'Ask for feedback on my draft',
  'Learn ten new words', 'Practise a language for 15 minutes', 'Finish one online lesson', 'Update my CV',
  'Look up internship deadlines', 'Write the project introduction', 'Create the presentation outline',
  'Check plagiarism on the report', 'Prepare the viva questions', 'Back up my thesis files',
  'Read a chapter of a book', 'Watch a documentary', 'Take a short online course', 'Practise typing for 10 minutes',
  'Write a short journal entry', 'Learn a keyboard shortcut', 'Listen to an educational podcast',
  'Solve one logic puzzle', 'Write down what I learned today', 'Explore a new topic for 20 minutes',
  // Home
  'Do a load of laundry', 'Fold and put away clothes', 'Wash the dishes', 'Wipe the kitchen counters',
  'Take out the rubbish', 'Change the bed sheets', 'Water the plants', 'Vacuum the living room',
  'Clean the bathroom mirror', 'Declutter one drawer', 'Sort the fridge', 'Plan this week’s meals',
  'Make a grocery list', 'Pick up groceries', 'Restock household supplies', 'Iron clothes for tomorrow',
  'Dust the shelves', 'Clean out the car', 'Fix that loose handle', 'Replace a dead light bulb',
  'Organise the wardrobe', 'Donate clothes I don’t wear', 'Defrost the freezer', 'Clean the microwave',
  'Mop the floor', 'Tidy the entryway', 'Wash the bath towels', 'Sort the recycling', 'Descale the kettle',
  'Clean the windows', 'Organise the spice rack', 'Make the bed', 'Check the smoke alarm',
  'Air out the rooms', 'Prepare tomorrow’s lunch', 'Soak beans for tomorrow', 'Wash the water bottle',
  'Clean the fan blades', 'Change the doormat', 'Tidy the bookshelf',
  // Health and wellbeing
  'Drink a glass of water', 'Go for a 20-minute walk', 'Stretch for 10 minutes', 'Do a quick workout',
  'Take my vitamins', 'Book a doctor’s appointment', 'Book a dental check-up', 'Refill my prescription',
  'Meditate for 5 minutes', 'Sleep before 11 tonight', 'Step outside for fresh air', 'Eat a proper breakfast',
  'Cook a healthy dinner', 'Pack a healthy snack', 'Do a yoga session', 'Go for a run', 'Practise deep breathing',
  'Take a screen break', 'Stand up and stretch', 'Walk 8,000 steps', 'Go to bed without my phone',
  'Write three things I’m grateful for', 'Book an eye test', 'Try a new healthy recipe', 'Do some gentle mobility work',
  'Spend 10 minutes in the sun', 'Plan this week’s workouts', 'Cycle to a nearby place', 'Go for a swim',
  'Have a phone-free meal', 'Do a short body scan', 'Listen to calming music', 'Take the stairs today',
  'Prepare tomorrow’s workout clothes', 'Check my posture', 'Have a fruit instead of dessert',
  'Schedule a health check-up', 'Practise mindful eating', 'Do a 5-minute plank challenge', 'Rest my eyes for a minute',
  // Money and admin
  'Pay the electricity bill', 'Pay the phone bill', 'Pay the rent', 'Check my bank balance', 'Review this month’s spending',
  'Set a savings goal', 'Move money to savings', 'Cancel an unused subscription', 'Update my budget',
  'File receipts', 'Check my credit card statement', 'Renew my insurance', 'Compare internet plans',
  'Organise important documents', 'Scan and save my ID documents', 'Check passport expiry date', 'Update my address details',
  'Set up an automatic payment', 'Review my investments', 'Plan a big purchase', 'Track today’s expenses',
  'Return an online order', 'Claim a refund', 'Check warranty dates', 'Pay the credit card bill', 'Renew a membership',
  'Update passwords for one account', 'Turn on two-factor login', 'Back up my phone', 'Clear phone storage',
  'Delete old photos', 'Update my apps', 'Restart my laptop for updates', 'Organise my desktop', 'Empty the trash folder',
  'Sort my email into folders', 'Review app permissions', 'Write down important passwords safely', 'Check my tax documents',
  'Book a car service',
  // People
  'Call my parents', 'Message a friend I haven’t spoken to', 'Plan a catch-up with friends', 'Send a birthday wish',
  'Write a thank-you note', 'Check in on a family member', 'Plan a weekend outing', 'Reply to pending messages',
  'Call a grandparent', 'Send a voice note to a friend', 'Plan a family dinner', 'Share a photo with family',
  'Buy a small gift for someone', 'Make plans for the weekend', 'Invite a friend for coffee', 'Remember an anniversary',
  'Compliment someone today', 'Help a neighbour', 'Reply to the group chat', 'Schedule a video call',
  'Plan a game night', 'Write a letter to someone', 'Introduce two friends to each other', 'Ask someone how they’re doing',
  'Return a borrowed item', 'RSVP to an invitation', 'Wish a colleague well', 'Plan a surprise for someone',
  'Share a book recommendation', 'Send a postcard',
  // Errands
  'Post a parcel', 'Pick up dry cleaning', 'Get a haircut', 'Buy stamps', 'Drop off recycling', 'Fill up the car',
  'Check tyre pressure', 'Collect a package', 'Return library books', 'Buy a birthday card', 'Get keys cut',
  'Print documents', 'Visit the bank', 'Pick up medicine', 'Buy fresh flowers', 'Get the shoes repaired',
  'Renew the parking permit', 'Buy batteries', 'Top up the travel card', 'Book a cab for tomorrow',
  // Planning and reflection
  'Plan tomorrow tonight', 'Review this week', 'Set three goals for the month', 'Write a weekly reflection',
  'Choose one habit to build', 'List what’s worrying me', 'Pick the most important task for tomorrow',
  'Review my long-term goals', 'Plan a day off', 'Plan the next holiday', 'Research a weekend trip',
  'Make a packing list', 'Book travel tickets', 'Check the weather for the week', 'Plan a morning routine',
  'Plan an evening routine', 'Set a reminder for something important', 'Write down a dream goal',
  'Review my habits this month', 'Decide what to stop doing', 'Plan a learning goal', 'Make a reading list',
  'Make a list of films to watch', 'Note one thing to improve', 'Celebrate a small win', 'Plan a digital detox hour',
  'Map out a side project', 'Brainstorm ideas for a gift', 'Plan next month’s budget', 'Write a to-do list for the week',
  // Creative and leisure
  'Read for 20 minutes', 'Sketch something', 'Write a short poem', 'Practise an instrument', 'Bake something new',
  'Try a new recipe', 'Take photos on a walk', 'Start a small craft project', 'Listen to a new album', 'Visit a museum',
  'Watch a film I’ve saved', 'Do a jigsaw puzzle', 'Write a page of my story', 'Plant some seeds', 'Repot a plant',
  'Learn a new song', 'Edit my photos', 'Make a playlist', 'Colour or doodle for 10 minutes', 'Go to a local market',
  'Try a new café', 'Visit a park', 'Play a board game', 'Start a new book', 'Write a blog post', 'Learn a magic trick',
  'Do some gardening', 'Practise calligraphy', 'Organise my photo albums', 'Plan a picnic',
  // Pets and care
  'Feed the pets', 'Take the dog for a walk', 'Book a vet appointment', 'Buy pet food', 'Clean the pet’s bed',
  'Change the litter', 'Groom the pet', 'Refill the bird feeder', 'Clean the fish tank', 'Order pet supplies',
  // Self-care
  'Take a long shower', 'Do a face mask', 'Trim my nails', 'Moisturise before bed', 'Take a nap', 'Have a slow morning',
  'Light a candle and unwind', 'Read something just for fun', 'Sit quietly for five minutes', 'Write down how I feel',
  'Say no to one thing', 'Ask for help with something', 'Take a proper lunch break', 'Leave work on time',
  'Plan something to look forward to', 'Spend time in nature', 'Listen to a favourite song', 'Watch the sunset',
  'Unplug for an hour', 'Do something kind for myself',
  // Group and office projects
  'Create a shared task list for the team', 'Assign owners to open tasks', 'Set the next team check-in',
  'Collect everyone’s availability', 'Write the project brief', 'Agree on the deadline with the group',
  'Share the meeting link', 'Send a reminder to the group', 'Upload files to the shared folder', 'Merge everyone’s sections',
  'Do a final check of the group report', 'Plan the presentation order', 'Book the presentation rehearsal',
  'Write the conclusion section', 'Make the references list', 'Thank the team for their work', 'Collect sign-offs',
  'Update the shared timeline', 'Note decisions from the meeting', 'Share action points after the call',
  // Bits of the day
  'Charge my devices', 'Pack my bag for tomorrow', 'Lay out tomorrow’s clothes', 'Set an alarm for the morning',
  'Clear the kitchen sink', 'Tidy my desk', 'Refill the water jug', 'Put my phone away for an hour',
  'Do one thing I’ve been putting off', 'Spend 10 minutes tidying', 'Wind down without screens', 'Check tomorrow’s calendar',
  'Make tea and take a break', 'Open the windows for fresh air', 'Write tomorrow’s top three', 'Clear my bag of receipts',
  'Back up my photos', 'Note a reminder for the weekend', 'Plan breakfast for tomorrow', 'Empty the dishwasher',
  // More, so a full working day of use never repeats within five days
  'Prepare the monthly report', 'Review open pull requests', 'Write a project retrospective', 'Update the team wiki',
  'Plan the next sprint', 'Clean up the shared calendar', 'Organise my bookmarks', 'Reply to the client email',
  'Draft a proposal outline', 'Review the contract', 'Prepare the quarterly numbers', 'Update the risk list',
  'Record a short demo video', 'Test the new feature', 'Note feedback from the customer call', 'Plan a skills workshop',
  'Prepare onboarding notes', 'Update the price list', 'Check the analytics dashboard', 'Write a thank-you to the client',
  'Outline the essay', 'Write the first paragraph', 'Read the assigned chapter', 'Prepare a study cheat sheet',
  'Do ten practice problems', 'Review mistakes from the last test', 'Revise formulas', 'Plan the lab report',
  'Collect data for the project', 'Book a meeting with my supervisor', 'Practise a presentation in the mirror', 'Annotate the reading',
  'Compare notes with a classmate', 'Organise my bibliography', 'Rewrite my notes neatly', 'Clean the oven',
  'Wipe the light switches', 'Wash the curtains', 'Sort the shoe rack', 'Clean the bathroom sink',
  'Wash the car', 'Sweep the balcony', 'Organise the medicine box', 'Throw out expired food',
  'Label the storage boxes', 'Tidy the cables', 'Clean the keyboard', 'Wash the pillow covers',
  'Organise kitchen drawers', 'Fold the laundry', 'Do 20 squats', 'Go for an evening walk',
  'Try a 10-minute guided stretch', 'Cut down on coffee today', 'Eat a salad', 'Take a walking meeting',
  'Do neck and shoulder rolls', 'Drink water with every meal', 'Get eight hours of sleep', 'Plan a healthy grocery list',
  'Do a breathing exercise before bed', 'Take a stretch break every hour', 'Download bank statements', 'Check pension contributions',
  'Review insurance cover', 'Set up a budget category', 'Note upcoming bills', 'Compare electricity providers',
  'Sell something I no longer use', 'Check loyalty points', 'Pay a friend back', 'Split the bill with flatmates',
  'Update the emergency contacts', 'Back up important emails', 'Plan a call with an old friend', 'Send a congratulations message',
  'Write a recommendation for someone', 'Organise a team outing', 'Check in on a new colleague', 'Plan a visit to relatives',
  'Share good news with family', 'Say thank you to a teacher', 'Reconnect with a former colleague', 'Arrange a study group meet-up',
  'Watch a talk on something new', 'Write down a new idea', 'Practise a hobby for 20 minutes', 'Try a short drawing exercise',
  'Learn about a historical event', 'Start a gratitude jar', 'Plan a hike', 'Explore a new neighbourhood',
  'Read an article end to end', 'Listen to an audiobook chapter', 'Cook something from another country', 'Visit the library',
  'Write a review of a book I loved', 'Learn to fold an origami crane', 'Plan a movie night',
];

interface SuggestionState {
  current: string[];
  since: number;
  shown: Record<string, number>; // suggestion -> when it was last shown
}

const readState = (): SuggestionState | null => {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeState = (state: SuggestionState) => {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
};

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// The current set of suggestions, picking a fresh one if 20 minutes have passed.
export const currentSuggestions = (count: number, now = Date.now()): string[] => {
  const state = readState();
  if (state && state.current.length === count && now - state.since < ROTATE_EVERY_MS) return state.current;

  const shown: Record<string, number> = {};
  // Forget anything shown more than 5 days ago
  Object.entries(state?.shown || {}).forEach(([text, at]) => { if (now - at < NO_REPEAT_MS) shown[text] = at; });

  const fresh = shuffle(SUGGESTION_POOL.filter(text => !(text in shown)));
  let picked = fresh.slice(0, count);
  if (picked.length < count) {
    // Pool used up within 5 days: reuse the ones seen longest ago
    const oldest = Object.entries(shown).sort((a, b) => a[1] - b[1]).map(([text]) => text).filter(t => !picked.includes(t));
    picked = [...picked, ...oldest.slice(0, count - picked.length)];
  }
  picked.forEach(text => { shown[text] = now; });
  writeState({ current: picked, since: now, shown });
  return picked;
};

// Milliseconds until the next set is due (for scheduling a refresh)
export const msUntilNextSuggestions = (now = Date.now()): number => {
  const state = readState();
  if (!state) return 0;
  return Math.max(0, ROTATE_EVERY_MS - (now - state.since));
};
