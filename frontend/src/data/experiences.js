import introVideo from '../user_media/Intro_video.mp4'
import terracottaImg from '../user_media/cover_terracotta.jpg'
import pandaImg from '../user_media/panda.jpg'
import dinoImg from '../user_media/dino.jpg'
import heroGameImg from '../user_media/zombies.jpg'
import guluGuluImg from '../user_media/gulugulu.jpg'
import hyperBeatSlashImg from '../user_media/HyperBeatSlash.jpg'

const galleryImg1 = '/user_media/gallery1.png'
const galleryImg2 = '/user_media/gallery2.png'
const galleryImg3 = '/user_media/gallery3.png'
const galleryImg4 = '/user_media/gallery4.png'
const galleryImg5 = '/user_media/gallery5.png'
const galleryImg6 = '/user_media/gallery6.png'
const galleryImg7 = '/user_media/gallery7.png'
const galleryImg8 = '/user_media/gallery8.png'
const commenterImg1 = '/user_media/comment_p1.jpg'
const commenterImg2 = '/user_media/comment_p2.jpg'

export const vrExperiences = [
  {
    id: 'terracotta-warriors',
    category: 'vr-show',
    title: 'Terracotta Warriors',
    subtitle: "Secrets of the First Emperor's Mausoleum",
    tagline: 'Step 2,200 years into the past',
    duration: 45,
    minAge: 8,
    languages: ['English', '中文'],
    rating: 4.9,
    reviewCount: 312,
    difficulty: 'Easy',
    groupSize: '1–6',
    featured: true,
    badge: 'Award Winner 🏆',
    accent: '#f97316',
    accentGlow: 'rgba(249, 115, 22, 0.34)',
    offPeakPrices: { adult: 37.95, child: 27.95, senior: 34.95, family: 31.95, group: 32.95 },
    peakPrices:    { adult: 45.95, child: 34.95, senior: 41.95, family: 39.95, group: 40.95 },
    cardGradient: 'linear-gradient(160deg, #fff7ed 0%, #fdba74 48%, #ea580c 100%)',
    heroImg: terracottaImg,
    demoVideo: introVideo,
    priceFrom: 27.95,
    highlights: [
      'Walk corridors of the underground mausoleum',
      'Discover 8,000 unique clay soldiers',
      'Interact with ancient artifacts in VR',
      '2025 Yuanmeng Shanhai Award — First Prize',
    ],
    whatToExpect: [
      { icon: '🥽', label: 'VR Headset Included', desc: 'State-of-the-art headsets provided' },
      { icon: '👟', label: 'Closed-toe Shoes', desc: 'Comfortable footwear recommended' },
      { icon: '👨‍👩‍👧‍👦', label: 'Group Experience', desc: 'Explore with friends & family' },
      { icon: '🎧', label: 'Full Audio Narration', desc: 'Bilingual guided journey' },
    ],
    practicalInfo: [
      { label: 'Duration', value: '45 minutes' },
      { label: 'Min. Age', value: '8 years old' },
      { label: 'Mobility', value: 'Standing recommended' },
      { label: 'Language', value: 'EN / 中文' },
      { label: 'Group Size', value: 'Up to 6 per session' },
      { label: 'Note', value: 'Photosensitivity warning' },
    ],
    description:
      "Journey 2,200 years into the past and stand among the legendary Terracotta Warriors of China's first emperor. Winner of the 2025 Yuanmeng Shanhai VR Innovation Award, this immersive experience blends cutting-edge virtual reality with meticulous historical research to create a truly unforgettable journey.",
    longDescription:
      "Walk through underground mausoleum corridors, witness the vast army of 8,000 unique warriors, and uncover the secrets buried with Qin Shi Huang. Every detail — the texture of ancient clay, the flicker of torchlight, the grandeur of the underground palace — has been painstakingly recreated for maximum realism.",
    gallery: [terracottaImg, galleryImg1, galleryImg2, galleryImg3, galleryImg4, galleryImg5, galleryImg6, galleryImg7, galleryImg8],
    reviews: [
      { quote: "I felt like I was really standing among the Terracotta Warriors. The level of detail and atmosphere were incredible — both educational and breathtaking.", name: 'Emily R.', rating: 5, img: commenterImg1 },
      { quote: "The experience transported me straight into ancient China. It's amazing how real everything felt, from the sounds to the lighting. Highly recommended!", name: 'Michael T.', rating: 5, img: commenterImg2 },
    ],
  },
  {
    id: 'panda',
    category: 'vr-show',
    title: "Panda's World",
    subtitle: "A Giant's World",
    tagline: "See life through a giant panda's eyes",
    duration: 25,
    minAge: 6,
    languages: ['English', '中文'],
    rating: 4.8,
    reviewCount: 187,
    difficulty: 'Easy',
    groupSize: '1–6',
    featured: false,
    badge: 'Family Favourite 🐼',
    offPeakPrices: { adult: 28.95, child: 21.95, senior: 26.95, family: 24.95, group: 25.95 },
    peakPrices:    { adult: 34.95, child: 27.95, senior: 32.95, family: 30.95, group: 31.95 },
    accent: '#22c55e',
    accentGlow: 'rgba(34, 197, 94, 0.32)',
    cardGradient: 'linear-gradient(160deg, #f0fdf4 0%, #86efac 48%, #16a34a 100%)',
    heroImg: pandaImg,
    demoVideo: introVideo,
    priceFrom: 21.95,
    highlights: [
      'Embody a giant panda in lush bamboo forests',
      'Roam the Sichuan wilderness in stunning VR',
      'Perfect for all ages — especially young children',
      'Educational and heartwarming nature experience',
    ],
    whatToExpect: [
      { icon: '🥽', label: 'VR Headset Included', desc: 'Lightweight, comfortable headsets' },
      { icon: '👨‍👩‍👧', label: 'Family Friendly', desc: 'Suitable for ages 6 and up' },
      { icon: '🐾', label: 'Interactive Wildlife', desc: 'Meet virtual animals up close' },
      { icon: '🎵', label: 'Ambient Soundscape', desc: 'Immersive nature audio design' },
    ],
    practicalInfo: [
      { label: 'Duration', value: '25 minutes' },
      { label: 'Min. Age', value: '6 years old' },
      { label: 'Mobility', value: 'Seated or standing' },
      { label: 'Language', value: 'EN / 中文' },
      { label: 'Group Size', value: 'Up to 6 per session' },
      { label: 'Motion', value: 'Very gentle — ideal for all' },
    ],
    description:
      "Step into the lush bamboo forests of Sichuan and experience life through the eyes of the world's most beloved bear. Panda's World is the perfect introduction to virtual reality for the whole family — wonder, wildlife, and pure joy for every age.",
    longDescription:
      "Roam through misty mountain valleys, chomp on bamboo, and encounter other wildlife in their natural habitat. This gentle, enchanting experience is designed to delight guests of all ages with stunning nature visuals and heartwarming animal interactions.",
    gallery: [pandaImg, galleryImg3, galleryImg5, galleryImg1, galleryImg7, galleryImg2, galleryImg6],
    reviews: [
      { quote: "My kids absolutely loved it! The panda experience felt so real and gentle — even my 6-year-old was completely comfortable. We'll definitely come back.", name: 'Sarah L.', rating: 5, img: commenterImg1 },
      { quote: "Such a beautiful, peaceful experience. The bamboo forest visuals were stunning and the whole family enjoyed every second. Perfect for a family outing.", name: 'David K.', rating: 5, img: commenterImg2 },
    ],
  },
  {
    id: 'dragon',
    category: 'vr-show',
    title: 'Back to the Jurassic',
    subtitle: 'Rise of the Ancient',
    tagline: 'Soar through mythical skies on dragonback',
    duration: 30,
    minAge: 10,
    languages: ['English', '中文'],
    rating: 4.7,
    reviewCount: 143,
    difficulty: 'Thrilling',
    groupSize: '1–6',
    featured: false,
    badge: 'Thrill Seekers 🔥',
    offPeakPrices: { adult: 32.95, child: 24.95, senior: 29.95, family: 27.95, group: 28.95 },
    peakPrices:    { adult: 39.95, child: 30.95, senior: 36.95, family: 34.95, group: 35.95 },
    accent: '#ef4444',
    accentGlow: 'rgba(239, 68, 68, 0.32)',
    cardGradient: 'linear-gradient(160deg, #fff1f2 0%, #fca5a5 48%, #dc2626 100%)',
    heroImg: dinoImg,
    demoVideo: introVideo,
    priceFrom: 24.95,
    highlights: [
      'Ride a fire-breathing dragon above ancient kingdoms',
      'Dynamic flight simulation with immersive effects',
      'Epic battle scenes and mythical encounters',
      'Most adrenaline-pumping VR experience in the lineup',
    ],
    whatToExpect: [
      { icon: '🥽', label: 'VR Headset Included', desc: 'Full 360° surround immersion' },
      { icon: '⚡', label: 'Intense Motion', desc: 'May not suit motion-sensitive guests' },
      { icon: '🔥', label: 'Epic Battles', desc: 'Fast-paced action sequences' },
      { icon: '🎧', label: 'Cinematic Audio', desc: 'Surround-sound dragon world' },
    ],
    practicalInfo: [
      { label: 'Duration', value: '30 minutes' },
      { label: 'Min. Age', value: '10 years old' },
      { label: 'Mobility', value: 'Standing required' },
      { label: 'Language', value: 'EN / 中文' },
      { label: 'Group Size', value: 'Up to 6 per session' },
      { label: 'Motion', value: 'High intensity — caution advised' },
    ],
    description:
      "Mount a legendary dragon and soar through storm clouds, volcanic peaks, and ancient kingdoms. Back to the Jurassic is the most intense and thrilling experience in our lineup — a high-octane adventure that will leave you absolutely breathless.",
    longDescription:
      "Command your dragon through sweeping aerial battles, dive through canyon walls, and unleash fire on mythical beasts. The combination of dynamic motion simulation, surround sound, and stunning fantasy visuals makes this unlike anything you have ever experienced before.",
    gallery: [dinoImg, galleryImg2, galleryImg4, galleryImg6, galleryImg8, galleryImg1, galleryImg5],
    reviews: [
      { quote: "The dragon ride felt insanely real. I was genuinely gripping the seat! The battle sequences were incredible — this is a must-do for any thrill seeker.", name: 'Jason M.', rating: 5, img: commenterImg2 },
      { quote: "Absolutely mind-blowing. Flying on a dragon through those landscapes was something I never expected to feel so real. Best VR I've ever experienced!", name: 'Priya S.', rating: 5, img: commenterImg1 },
    ],
  },
]

export const arcadeGames = [
  {
    id: 'cyber-arena',
    category: 'arcade',
    title: 'Hero',
    subtitle: 'Zombies Besiege the City',
    tagline: "Fight for the city's survival",
    duration: 10,
    minAge: 12,
    languages: ['English', '中文'],
    rating: 4.8,
    reviewCount: 95,
    difficulty: 'Thrilling',
    groupSize: '2–6',
    featured: false,
    badge: 'Multiplayer Combat',
    offPeakPrices: { adult: 29.95, child: 23.95, senior: 27.95, family: 25.95, group: 26.95 },
    peakPrices:    { adult: 35.95, child: 28.95, senior: 32.95, family: 30.95, group: 31.95 },
    accent: '#8b5cf6',
    accentGlow: 'rgba(139, 92, 246, 0.34)',
    cardGradient: 'linear-gradient(160deg, #faf5ff 0%, #c4b5fd 48%, #7c3aed 100%)',
    heroImg: heroGameImg,
    demoVideo: introVideo,
    priceFrom: 23.95,
    highlights: [
      'Team-based VR survival combat',
      'LBE multiplayer battles in real city maps',
      'Cooperate to clear zombie siege challenges',
      'Full-sensory immersion with realistic effects',
    ],
    whatToExpect: [
      { icon: '🥽', label: 'VR Headset Included', desc: 'High-refresh competitive headsets' },
      { icon: '⚔️', label: 'Team Combat', desc: 'Fight through the siege with your group' },
      { icon: '🏙️', label: 'City Maps', desc: 'Battle across detailed urban environments' },
      { icon: '🎧', label: 'Spatial Audio', desc: 'Hear threats before you see them' },
    ],
    practicalInfo: [
      { label: 'Duration', value: '10 minutes' },
      { label: 'Min. Age', value: '12 years old' },
      { label: 'Mobility', value: 'Standing required' },
      { label: 'Language', value: 'EN / 中文' },
      { label: 'Group Size', value: '2–6 players' },
      { label: 'Motion', value: 'High intensity' },
    ],
    description:
      "Zombies have besieged the city, and your squad is the last line of defense. Hero is a full-sensory multiplayer combat experience where teamwork, quick decisions, and steady aim decide the city's survival.",
    longDescription:
      'Team up with real players, move through urban battlefield maps, and clear coordinated survival challenges together. Designed for competitive groups, Hero blends location-based VR combat with cinematic chaos and physical immersion.',
    gallery: [heroGameImg, galleryImg4, galleryImg6, galleryImg2, galleryImg8, galleryImg3, galleryImg7],
    reviews: [
      { quote: "My group had an absolute blast. The competitive element made it so much more exciting than passive VR. We've already booked our rematch!", name: 'Kevin L.', rating: 5, img: commenterImg2 },
      { quote: "Best multiplayer VR I've tried anywhere. The arena maps are cleverly designed and the leaderboard had everyone talking trash. 10/10.", name: 'Monica H.', rating: 5, img: commenterImg1 },
    ],
  },
  {
    id: 'space-odyssey',
    category: 'arcade',
    title: 'HyperBeat Slash',
    subtitle: 'Rhythm Action Arena',
    tagline: 'Slash to the beat in full-sensory VR',
    duration: 10,
    minAge: 8,
    languages: ['English', '中文'],
    rating: 4.7,
    reviewCount: 78,
    difficulty: 'Moderate',
    groupSize: '1–6',
    featured: false,
    badge: 'Rhythm Action',
    offPeakPrices: { adult: 26.95, child: 20.95, senior: 24.95, family: 22.95, group: 23.95 },
    peakPrices:    { adult: 32.95, child: 25.95, senior: 29.95, family: 27.95, group: 28.95 },
    accent: '#0ea5e9',
    accentGlow: 'rgba(14, 165, 233, 0.34)',
    cardGradient: 'linear-gradient(160deg, #f0f9ff 0%, #7dd3fc 48%, #0284c7 100%)',
    heroImg: hyperBeatSlashImg,
    demoVideo: introVideo,
    priceFrom: 20.95,
    highlights: [
      'Slice flying beat blocks with light blades',
      'Move through colorful rhythm arenas',
      'Screen-free, full-sensory music gameplay',
      'Fast-paced challenge for friends and families',
    ],
    whatToExpect: [
      { icon: '🥽', label: 'VR Headset Included', desc: 'Wide field-of-view space headsets' },
      { icon: '⚡', label: 'Rhythm Action', desc: 'Cut targets in time with the music' },
      { icon: '🎯', label: 'Score Challenge', desc: 'Chase precision, combos, and timing' },
      { icon: '🎵', label: 'Music Gameplay', desc: 'Bright audio-reactive stages' },
    ],
    practicalInfo: [
      { label: 'Duration', value: '10 minutes' },
      { label: 'Min. Age', value: '8 years old' },
      { label: 'Mobility', value: 'Seated or standing' },
      { label: 'Language', value: 'EN / 中文' },
      { label: 'Group Size', value: 'Up to 6 per session' },
      { label: 'Motion', value: 'Moderate rhythm movement' },
    ],
    description:
      'HyperBeat Slash turns music into a physical VR challenge. Step into vivid rhythm stages, slash incoming targets, and chase combos in a fast, colorful, screen-free esports experience.',
    longDescription:
      'Each track surrounds players with glowing beat blocks, reactive lights, and full-body movement. It is easy to start, satisfying to master, and built for guests who want energetic gameplay without a long learning curve.',
    gallery: [hyperBeatSlashImg, galleryImg1, galleryImg5, galleryImg3, galleryImg7, galleryImg4, galleryImg8],
    reviews: [
      { quote: 'The music and movement clicked immediately. Everyone in our group wanted another round because the score chase was so addictive.', name: 'Rachel T.', rating: 5, img: commenterImg1 },
      { quote: 'Bright, active, and really easy to understand. It felt like a workout and an arcade game at the same time.', name: 'Brian C.', rating: 5, img: commenterImg2 },
    ],
  },
  {
    id: 'ocean-quest',
    category: 'arcade',
    title: 'GULU GULU',
    subtitle: 'Battle the Cute Monster Legion',
    tagline: 'Screen-free, full-sensory fun',
    duration: 10,
    minAge: 6,
    languages: ['English', '中文'],
    rating: 4.9,
    reviewCount: 112,
    difficulty: 'Easy',
    groupSize: '1–6',
    featured: false,
    badge: 'Family Fun',
    offPeakPrices: { adult: 23.95, child: 18.95, senior: 21.95, family: 19.95, group: 20.95 },
    peakPrices:    { adult: 28.95, child: 22.95, senior: 25.95, family: 23.95, group: 24.95 },
    accent: '#14b8a6',
    accentGlow: 'rgba(20, 184, 166, 0.34)',
    cardGradient: 'linear-gradient(160deg, #ecfeff 0%, #5eead4 48%, #0d9488 100%)',
    heroImg: guluGuluImg,
    demoVideo: introVideo,
    priceFrom: 18.95,
    highlights: [
      'Battle a colorful cute monster legion',
      'Fast pick-up-and-play VR esports action',
      'Team-friendly gameplay for families and groups',
      'Bright screen-free, full-sensory fun',
    ],
    whatToExpect: [
      { icon: '🥽', label: 'VR Headset Included', desc: 'Ultra-wide underwater visuals' },
      { icon: '🎮', label: 'Arcade Action', desc: 'Simple controls and fast rounds' },
      { icon: '🎯', label: 'Monster Battle', desc: 'Take on waves of playful enemies' },
      { icon: '🎵', label: 'Full-Sensory Fun', desc: 'Colorful visuals and punchy audio' },
    ],
    practicalInfo: [
      { label: 'Duration', value: '10 minutes' },
      { label: 'Min. Age', value: '6 years old' },
      { label: 'Mobility', value: 'Seated or standing' },
      { label: 'Language', value: 'EN / 中文' },
      { label: 'Group Size', value: 'Up to 6 per session' },
      { label: 'Motion', value: 'Gentle to moderate' },
    ],
    description:
      'GULU GULU is a bright, fast, family-friendly VR battle where players take on a cute monster legion in a screen-free, full-sensory arena.',
    longDescription:
      'Jump into colorful stages, react quickly, and work together through playful combat rounds. It is built for guests who want arcade energy, approachable rules, and a lively group experience.',
    gallery: [guluGuluImg, galleryImg3, galleryImg7, galleryImg1, galleryImg5, galleryImg2, galleryImg6],
    reviews: [
      { quote: 'GULU GULU was perfect for our family. Bright, silly, and easy to jump into, but still exciting enough for the adults.', name: 'Amy W.', rating: 5, img: commenterImg1 },
      { quote: 'The monster battles were chaotic in the best way. Everyone understood what to do right away and laughed the whole time.', name: 'Daniel R.', rating: 5, img: commenterImg2 },
    ],
  },
]

export const allExperiences = [...vrExperiences, ...arcadeGames]
