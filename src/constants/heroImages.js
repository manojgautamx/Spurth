// Rotating hero image pool shared by the auth screens (Welcome, and the
// web-only branding pane on Login/Signup). Swap for local requires in prod:
//   require('../assets/hero-hiking.jpg'), etc.
export const HERO_IMAGES = [
  // Friends laughing together at golden hour
  'https://res.cloudinary.com/dppoa51hp/image/upload/v1782491651/basketball_hsjbjd.jpg',
  // Hiking group reaching a scenic viewpoint
  'https://res.cloudinary.com/dppoa51hp/image/upload/v1782536025/1531_f2rphe.jpg',
  // Rooftop gathering at dusk
  'https://res.cloudinary.com/dppoa51hp/image/upload/v1782536837/2149215824_d2jlbk.jpg',
  // Campfire night with friends
  'https://images.unsplash.com/photo-1517824806704-9040b037703b?w=900&q=85',
  // Casual coffee meetup
  'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=900&q=85',
  // Live music crowd at golden hour
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=85',
];

export const randomHeroImage = () => HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)];
