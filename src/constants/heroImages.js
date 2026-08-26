// Rotating hero image pool shared by the auth screens (Welcome, and the
// web-only branding pane on Login/Signup). Swap for local requires in prod:
//   require('../assets/hero-hiking.jpg'), etc.
export const HERO_IMAGES = [
  // Street basketball at golden hour
  'https://images.unsplash.com/photo-1543633550-f431af584afd?w=900&q=85',
  // Hiking group cresting a mountain trail
  'https://images.unsplash.com/photo-1582866143347-8f3efbeb44c9?w=900&q=85',
  // Rooftop gathering at dusk, city skyline behind
  'https://images.unsplash.com/photo-1692261920240-a3c88f29e25f?w=900&q=85',
  // Campfire night with friends, guitar in hand
  'https://images.unsplash.com/photo-1758272960205-96258d60ac1f?w=900&q=85',
  // Casual coffee meetup
  'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=900&q=85',
  // Live music crowd at golden hour
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=85',
];

export const randomHeroImage = () => HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)];
