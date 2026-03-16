export const CATEGORY_GROUPS = {
  Sports: [
    'football','soccer','futsal','cricket','basketball',
    'volleyball','badminton','tennis','tabletennis',
    'pingpong','baseball','rugby','hockey'
  ],

  Fitness: [
    'gym','fitness','workout','yoga','pilates',
    'crossfit','cardio','zumba'
  ],

  Adventure: [
    'hiking','trekking','cycling','biking','running',
    'marathon','climbing','camping','rafting'
  ],

  Gaming: [
    'esports','gaming','chess','boardgames','poker'
  ],

  Arts: [
    'music','concert','dance','painting','photography','art'
  ],

  Education: [
    'meetup','workshop','seminar','networking','studygroup'
  ],

  Lifestyle: [
    'food','cooking','coffee','wine','bbq'
  ],

  Tech: [
    'startup','tech','coding','hackathon','workshop','business'
  ]
};

export const getMainCategory = (input) => {
  if (!input) return 'Other';

  const normalized = input.toLowerCase();

  for (const [mainCategory, keywords] of Object.entries(CATEGORY_GROUPS)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return mainCategory;
      }
    }
  }

  return 'Other';
};
