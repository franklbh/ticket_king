import terracottaVideo from '../video/terracotta_EN.mp4'
import pandaVideoEn from '../video/panda_EN.mp4'
import pandaVideoZh from '../video/panda_CH.mp4'
import dinoVideoEn from '../video/dino_EN.mp4'
import dinoVideoZh from '../video/dino_CH.mp4'
import heroVideoEn from '../video/hero_EN.mp4'
import heroVideoZh from '../video/hero_CH.mp4'
import beatVideoEn from '../video/beat_EN.mp4'
import beatVideoZh from '../video/beat_CH.mp4'
import guluVideoEn from '../video/gulu_EN.mp4'
import guluVideoZh from '../video/gulu_CH.mp4'
import terracottaImg from '../picture/cover_terracotta.jpg'
import pandaImg from '../picture/panda.jpg'
import dinoImg from '../picture/dino.jpg'
import heroGameImg from '../picture/zombies.jpg'
import guluGuluImg from '../picture/gulugulu.jpg'
import hyperBeatSlashImg from '../picture/HyperBeatSlash.jpg'

const galleryImg1 = '/picture/gallery1.png'
const galleryImg2 = '/picture/gallery2.png'
const galleryImg3 = '/picture/gallery3.png'
const galleryImg4 = '/picture/gallery4.png'
const galleryImg5 = '/picture/gallery5.png'
const galleryImg6 = '/picture/gallery6.png'
const galleryImg7 = '/picture/gallery7.png'
const galleryImg8 = '/picture/gallery8.png'
const commenterImg1 = '/picture/comment_p1.jpg'
const commenterImg2 = '/picture/comment_p2.jpg'

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
    demoVideo: terracottaVideo,
    demoVideos: { en: terracottaVideo, zh: terracottaVideo },
    priceFrom: 27.95,
    highlights: [
      'Officially licensed by the Emperor Qin Shi Huang’s Mausoleum Site Museum',
      'Explore a 1:1 digital reconstruction of the underground palace',
      'Discover the latest archaeological findings through interactive scenes',
      'Created by Xi’an Hongwen with VIVE Arts and Wevr',
    ],
    whatToExpect: [
      { icon: '🥽', label: 'Location-based XR', desc: 'Walk through a large-space immersive VR environment' },
      { icon: '🏺', label: 'Archaeology-led detail', desc: 'Built from museum research and archaeological discoveries' },
      { icon: '🏛️', label: 'Mausoleum exploration', desc: 'Enter recreated chambers, passages, and imperial scenes' },
      { icon: '🎧', label: 'Guided cinematic journey', desc: 'Bilingual story, sound, and interactive moments' },
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
      '“Terracotta Warriors: Secrets of the First Emperor’s Mausoleum” is a groundbreaking location-based VR experience created by Xi’an Hongwen, in collaboration with VIVE Arts and Wevr. For the first time, this immersive production is officially licensed by the Emperor Qin Shi Huang’s Mausoleum Site Museum.',
    longDescription:
      'The project brings together world-class creative and technical teams to deliver an authentic, interactive journey that stays true to the latest archaeological discoveries. Audiences travel back to the Great Qin and embark on an unforgettable adventure into the heart of mausoleum.',
    gallery: [terracottaImg, galleryImg1, galleryImg2, galleryImg3, galleryImg4, galleryImg5, galleryImg6, galleryImg7, galleryImg8],
    reviews: [
      { quote: "I felt like I was really standing among the Terracotta Warriors. The level of detail and atmosphere were incredible — both educational and breathtaking.", name: 'Emily R.', rating: 5, img: commenterImg1 },
      { quote: "The experience transported me straight into ancient China. It's amazing how real everything felt, from the sounds to the lighting. Highly recommended!", name: 'Michael T.', rating: 5, img: commenterImg2 },
    ],
    localized: {
      'zh-Hans': {
        title: '兵马俑',
        subtitle: '秦始皇陵的秘密',
        tagline: '穿越千年，梦回大秦',
        badge: '官方授权',
        highlights: [
          '全球首个官方授权的秦始皇陵 XR 大空间沉浸式体验项目',
          '50 年考古成果全景呈现，1:1 还原秦陵地宫全貌',
          '首次呈现九层台、百戏俑等最新考古成果',
          '融合文博、技术与创意团队打造真实互动旅程',
        ],
        whatToExpect: [
          { icon: '🥽', label: '大空间 XR 体验', desc: '在沉浸式空间中步入秦陵地宫世界' },
          { icon: '🏺', label: '考古级复原', desc: '遵循文物真实性与历史研究严谨性' },
          { icon: '🏛️', label: '地宫探秘', desc: '体验墓室逃脱、车马巡游、戏水之战等互动场景' },
          { icon: '🎧', label: '沉浸式叙事', desc: '通过数字科技重现帝国威仪，让秦文明活起来' },
        ],
        description:
          '《帝国密码——秦始皇陵》项目是由陕文投集团、宏达电(HTC)和秦始皇帝陵博物院历时两年，汇集国内外顶级文博、技术、创意团队，精心打造的全球首个官方授权的秦始皇陵XR大空间沉浸式体验项目。',
        longDescription:
          '50年考古成果全景呈现，数字世界中最权威复原，项目遵循文物考古的真实性、历史研究的严谨性和互动体验的趣味性三大原则，打破时空限制，利用数字科技首次1:1还原秦陵地宫全貌，重现帝国威仪，让秦文明活起来。项目将首次呈现九层台、百戏俑等最新考古成果，通过地宫探秘、墓室逃脱、车马巡游、戏水之战等互动场景，让观众身临其境。穿越千年，梦回大秦，开启一次终生难忘的秦陵探险之旅。',
        reviews: [
          { quote: '仿佛真的站在兵马俑之间。细节和氛围都非常震撼，既有知识性又充满沉浸感。', name: 'Emily R.', rating: 5, img: commenterImg1 },
          { quote: '这次体验让我瞬间回到古代中国。声音、灯光和场景都非常真实，强烈推荐。', name: 'Michael T.', rating: 5, img: commenterImg2 },
        ],
      },
      'zh-Hant': {
        title: '兵馬俑',
        subtitle: '秦始皇陵的秘密',
        tagline: '穿越千年，夢迴大秦',
        badge: '官方授權',
        highlights: [
          '全球首個官方授權的秦始皇陵 XR 大空間沉浸式體驗項目',
          '50 年考古成果全景呈現，1:1 還原秦陵地宮全貌',
          '首次呈現九層臺、百戲俑等最新考古成果',
          '融合文博、技術與創意團隊打造真實互動旅程',
        ],
        whatToExpect: [
          { icon: '🥽', label: '大空間 XR 體驗', desc: '在沉浸式空間中步入秦陵地宮世界' },
          { icon: '🏺', label: '考古級復原', desc: '遵循文物真實性與歷史研究嚴謹性' },
          { icon: '🏛️', label: '地宮探秘', desc: '體驗墓室逃脫、車馬巡遊、戲水之戰等互動場景' },
          { icon: '🎧', label: '沉浸式敘事', desc: '透過數字科技重現帝國威儀，讓秦文明活起來' },
        ],
        description:
          '《帝國密碼——秦始皇陵》項目是由陝文投集團、宏達電(HTC)和秦始皇帝陵博物院歷時兩年，彙集國內外頂級文博、技術、創意團隊，精心打造的全球首個官方授權的秦始皇陵XR大空間沉浸式體驗項目。',
        longDescription:
          '50年考古成果全景呈現，數字世界中最權威復原，項目遵循文物考古的真實性、歷史研究的嚴謹性和互動體驗的趣味性三大原則，打破時空限制，利用數字科技首次1:1還原秦陵地宮全貌，重現帝國威儀，讓秦文明活起來。項目將首次呈現九層臺、百戲俑等最新考古成果，通過地宮探秘、墓室逃脫、車馬巡遊、戲水之戰等互動場景，讓觀眾身臨其境。穿越千年，夢迴大秦，開啟一次終生難忘的秦陵探險之旅。',
        reviews: [
          { quote: '彷彿真的站在兵馬俑之間。細節和氛圍都非常震撼，既有知識性又充滿沉浸感。', name: 'Emily R.', rating: 5, img: commenterImg1 },
          { quote: '這次體驗讓我瞬間回到古代中國。聲音、燈光和場景都非常真實，強烈推薦。', name: 'Michael T.', rating: 5, img: commenterImg2 },
        ],
      },
    },
  },
  {
    id: 'panda',
    category: 'vr-show',
    title: "Panda's World",
    subtitle: 'A gentle wildlife VR journey',
    tagline: 'Explore bamboo forests in a calm family adventure',
    duration: 25,
    minAge: 6,
    languages: ['English', '中文'],
    rating: 4.8,
    reviewCount: 187,
    difficulty: 'Easy',
    groupSize: '1–6',
    featured: false,
    badge: 'Family Friendly',
    offPeakPrices: { adult: 28.95, child: 21.95, senior: 26.95, family: 24.95, group: 25.95 },
    peakPrices:    { adult: 34.95, child: 27.95, senior: 32.95, family: 30.95, group: 31.95 },
    accent: '#22c55e',
    accentGlow: 'rgba(34, 197, 94, 0.32)',
    cardGradient: 'linear-gradient(160deg, #f0fdf4 0%, #86efac 48%, #16a34a 100%)',
    heroImg: pandaImg,
    demoVideo: pandaVideoEn,
    demoVideos: { en: pandaVideoEn, zh: pandaVideoZh },
    priceFrom: 21.95,
    highlights: [
      'Explore a calm bamboo forest built for first-time VR guests',
      'Follow a gentle story with close-up wildlife moments',
      'Comfortable pace for families, children, and relaxed group visits',
      'Short, bright, and easy to enjoy before or after another experience',
    ],
    whatToExpect: [
      { icon: '🥽', label: 'Comfortable VR setup', desc: 'Lightweight headsets and staff support before you begin' },
      { icon: '🐼', label: 'Great for younger guests', desc: 'Designed for ages 6 and up with gentle motion' },
      { icon: '🎋', label: 'Immersive forest scenes', desc: 'Look around bamboo paths, mountain views, and nature moments' },
      { icon: '🎵', label: 'Soft sound design', desc: 'Relaxed music and ambient forest audio guide the experience' },
    ],
    practicalInfo: [
      { label: 'Duration', value: '25 minutes' },
      { label: 'Min. Age', value: '6 years old' },
      { label: 'Mobility', value: 'Seated or standing friendly' },
      { label: 'Language', value: 'EN / 中文' },
      { label: 'Group Size', value: 'Up to 6 per session' },
      { label: 'Motion', value: 'Very gentle' },
    ],
    description:
      "Panda's World is a calm, family-friendly VR journey through bamboo forests, mountain paths, and warm wildlife moments. It is designed for guests who want a beautiful introduction to VR without intense motion or complicated controls.",
    longDescription:
      'The experience moves at a relaxed pace, making it easy for children, parents, and first-time VR guests to enjoy together. Expect bright nature visuals, simple interaction, comfortable guidance, and a peaceful story that feels light, playful, and easy to follow.',
    gallery: [pandaImg, galleryImg3, galleryImg5, galleryImg1, galleryImg7, galleryImg2, galleryImg6],
    reviews: [
      { quote: "My kids absolutely loved it. The experience felt gentle, bright, and easy to follow, and my 6-year-old was comfortable the whole time.", name: 'Sarah L.', rating: 5, img: commenterImg1 },
      { quote: 'A beautiful and peaceful VR experience. The bamboo forest visuals were stunning, and it was perfect for a family outing.', name: 'David K.', rating: 5, img: commenterImg2 },
    ],
    localized: {
      'zh-Hans': {
        title: '熊猫的世界',
        subtitle: '温和的自然 VR 之旅',
        tagline: '在竹林世界中体验轻松的家庭冒险',
        badge: '适合家庭',
        highlights: [
          '走进为 VR 初体验者打造的宁静竹林世界',
          '跟随轻松故事，近距离感受可爱的自然瞬间',
          '节奏舒缓，适合家庭、儿童和轻松结伴体验',
          '明亮、短时、容易享受，也适合搭配其他项目一起体验',
        ],
        whatToExpect: [
          { icon: '🥽', label: '舒适 VR 配置', desc: '轻便头显，开始前有工作人员协助佩戴与说明' },
          { icon: '🐼', label: '适合年幼游客', desc: '适合 6 岁及以上，动作温和不刺激' },
          { icon: '🎋', label: '沉浸式竹林场景', desc: '环顾竹林小径、山景和自然瞬间' },
          { icon: '🎵', label: '柔和声音设计', desc: '轻松音乐与森林环境声陪伴整个体验' },
        ],
        description:
          'Panda’s World 是一段温和、适合家庭的 VR 自然之旅。你将穿过竹林、山间小径和温暖的自然场景，适合想轻松体验 VR、又不希望动作过于刺激的游客。',
        longDescription:
          '整个体验节奏舒缓，儿童、家长和第一次体验 VR 的游客都能轻松跟上。你会看到明亮的自然画面、简单的互动、清楚的引导，以及一段轻松、治愈、容易投入的故事。',
        reviews: [
          { quote: '孩子们非常喜欢。整个体验温和、明亮、容易理解，我 6 岁的孩子全程都很放松。', name: 'Sarah L.', rating: 5, img: commenterImg1 },
          { quote: '很漂亮也很平静的 VR 体验。竹林画面很美，非常适合家庭一起玩。', name: 'David K.', rating: 5, img: commenterImg2 },
        ],
      },
      'zh-Hant': {
        title: '熊貓的世界',
        subtitle: '溫和的自然 VR 之旅',
        tagline: '在竹林世界中體驗輕鬆的家庭冒險',
        badge: '適合家庭',
        highlights: [
          '走進為 VR 初體驗者打造的寧靜竹林世界',
          '跟隨輕鬆故事，近距離感受可愛的自然瞬間',
          '節奏舒緩，適合家庭、兒童和輕鬆結伴體驗',
          '明亮、短時、容易享受，也適合搭配其他項目一起體驗',
        ],
        whatToExpect: [
          { icon: '🥽', label: '舒適 VR 配置', desc: '輕便頭顯，開始前有工作人員協助佩戴與說明' },
          { icon: '🐼', label: '適合年幼遊客', desc: '適合 6 歲及以上，動作溫和不刺激' },
          { icon: '🎋', label: '沉浸式竹林場景', desc: '環顧竹林小徑、山景和自然瞬間' },
          { icon: '🎵', label: '柔和聲音設計', desc: '輕鬆音樂與森林環境聲陪伴整個體驗' },
        ],
        description:
          'Panda’s World 是一段溫和、適合家庭的 VR 自然之旅。你將穿過竹林、山間小徑和溫暖的自然場景，適合想輕鬆體驗 VR、又不希望動作過於刺激的遊客。',
        longDescription:
          '整個體驗節奏舒緩，兒童、家長和第一次體驗 VR 的遊客都能輕鬆跟上。你會看到明亮的自然畫面、簡單的互動、清楚的引導，以及一段輕鬆、療癒、容易投入的故事。',
        reviews: [
          { quote: '孩子們非常喜歡。整個體驗溫和、明亮、容易理解，我 6 歲的孩子全程都很放鬆。', name: 'Sarah L.', rating: 5, img: commenterImg1 },
          { quote: '很漂亮也很平靜的 VR 體驗。竹林畫面很美，非常適合家庭一起玩。', name: 'David K.', rating: 5, img: commenterImg2 },
        ],
      },
    },
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
    badge: 'Dinosaur Adventure',
    offPeakPrices: { adult: 32.95, child: 24.95, senior: 29.95, family: 27.95, group: 28.95 },
    peakPrices:    { adult: 39.95, child: 30.95, senior: 36.95, family: 34.95, group: 35.95 },
    accent: '#ef4444',
    accentGlow: 'rgba(239, 68, 68, 0.32)',
    cardGradient: 'linear-gradient(160deg, #fff1f2 0%, #fca5a5 48%, #dc2626 100%)',
    heroImg: dinoImg,
    demoVideo: dinoVideoEn,
    demoVideos: { en: dinoVideoEn, zh: dinoVideoZh },
    priceFrom: 24.95,
    highlights: [
      'Travel back to a vivid prehistoric world',
      'Stand close to lifelike dinosaurs and ancient environments',
      'Cinematic scenes with motion, scale, and surround audio',
      'A thrilling adventure for guests who want more intensity',
    ],
    whatToExpect: [
      { icon: '🥽', label: 'VR Headset Included', desc: 'Full 360° prehistoric immersion' },
      { icon: '🦖', label: 'Dinosaur Encounters', desc: 'Meet ancient creatures at dramatic scale' },
      { icon: '🌋', label: 'Cinematic Environments', desc: 'Move through jungle, rock, and volcanic scenes' },
      { icon: '🎧', label: 'Surround Audio', desc: 'Directional sound brings the world to life' },
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
      'Back to the Jurassic sends you into a prehistoric world filled with towering dinosaurs, dramatic landscapes, and cinematic VR moments. It is a more thrilling experience for guests who want movement, scale, and adventure.',
    longDescription:
      'Explore ancient environments, come face to face with lifelike creatures, and feel the scale of the Jurassic era through immersive visuals and surround audio. The experience is guided and easy to follow, while still delivering a stronger sense of motion and excitement.',
    gallery: [dinoImg, galleryImg2, galleryImg4, galleryImg6, galleryImg8, galleryImg1, galleryImg5],
    reviews: [
      { quote: 'The dinosaurs felt huge and surprisingly real. It was exciting without being confusing, and the sound made the scenes feel massive.', name: 'Jason M.', rating: 5, img: commenterImg2 },
      { quote: 'A really fun adventure. The prehistoric scenes were beautiful, and the dinosaur moments made everyone in our group react.', name: 'Priya S.', rating: 5, img: commenterImg1 },
    ],
    localized: {
      'zh-Hans': {
        title: '重返侏罗纪',
        subtitle: '史前世界冒险',
        tagline: '走进恐龙时代的沉浸式旅程',
        badge: '恐龙冒险',
        highlights: [
          '穿越回生动的史前世界',
          '近距离感受逼真的恐龙与远古场景',
          '电影感画面结合动感、尺度与环绕音效',
          '适合想体验更刺激冒险感的游客',
        ],
        whatToExpect: [
          { icon: '🥽', label: 'VR 头显体验', desc: '360° 沉浸式进入史前世界' },
          { icon: '🦖', label: '恐龙近距离登场', desc: '以震撼比例感受远古生物' },
          { icon: '🌋', label: '电影级环境', desc: '穿越丛林、岩石与火山氛围场景' },
          { icon: '🎧', label: '环绕音效', desc: '方向性声音让场景更有临场感' },
        ],
        description:
          '重返侏罗纪将你带入充满高大恐龙、史前地貌和电影感瞬间的 VR 世界。它比熊猫的世界更刺激，适合想体验动感、尺度和冒险感的游客。',
        longDescription:
          '你将探索远古环境，近距离面对逼真的史前生物，并通过沉浸画面与环绕音效感受侏罗纪时代的巨大尺度。体验全程有引导，容易跟上，同时保留更强的动感和兴奋感。',
        reviews: [
          { quote: '恐龙看起来非常巨大，也很真实。整体很刺激但不会混乱，音效让场景特别有压迫感。', name: 'Jason M.', rating: 5, img: commenterImg2 },
          { quote: '非常好玩的冒险体验。史前场景很漂亮，恐龙出现的时候我们每个人都有反应。', name: 'Priya S.', rating: 5, img: commenterImg1 },
        ],
      },
      'zh-Hant': {
        title: '重返侏羅紀',
        subtitle: '史前世界冒險',
        tagline: '走進恐龍時代的沉浸式旅程',
        badge: '恐龍冒險',
        highlights: [
          '穿越回生動的史前世界',
          '近距離感受逼真的恐龍與遠古場景',
          '電影感畫面結合動感、尺度與環繞音效',
          '適合想體驗更刺激冒險感的遊客',
        ],
        whatToExpect: [
          { icon: '🥽', label: 'VR 頭顯體驗', desc: '360° 沉浸式進入史前世界' },
          { icon: '🦖', label: '恐龍近距離登場', desc: '以震撼比例感受遠古生物' },
          { icon: '🌋', label: '電影級環境', desc: '穿越叢林、岩石與火山氛圍場景' },
          { icon: '🎧', label: '環繞音效', desc: '方向性聲音讓場景更有臨場感' },
        ],
        description:
          '重返侏羅紀將你帶入充滿高大恐龍、史前地貌和電影感瞬間的 VR 世界。它比熊貓的世界更刺激，適合想體驗動感、尺度和冒險感的遊客。',
        longDescription:
          '你將探索遠古環境，近距離面對逼真的史前生物，並透過沉浸畫面與環繞音效感受侏羅紀時代的巨大尺度。體驗全程有引導，容易跟上，同時保留更強的動感和興奮感。',
        reviews: [
          { quote: '恐龍看起來非常巨大，也很真實。整體很刺激但不會混亂，音效讓場景特別有壓迫感。', name: 'Jason M.', rating: 5, img: commenterImg2 },
          { quote: '非常好玩的冒險體驗。史前場景很漂亮，恐龍出現的時候我們每個人都有反應。', name: 'Priya S.', rating: 5, img: commenterImg1 },
        ],
      },
    },
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
    demoVideo: heroVideoEn,
    demoVideos: { en: heroVideoEn, zh: heroVideoZh },
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
    localized: {
      'zh-Hans': {
        title: '城市捍卫者',
        subtitle: '城市捍卫者',
        tagline: '组队守住城市最后防线',
        badge: '多人战斗',
        highlights: [
          '组队进入 VR 生存战斗',
          '在城市地图中进行线下多人对战',
          '合作清除僵尸围城挑战',
          '强节奏、强沉浸的全感官战斗体验',
        ],
        whatToExpect: [
          { icon: '🥽', label: 'VR 头显体验', desc: '高刷新率设备带来清晰战斗画面' },
          { icon: '🧟', label: '僵尸围城', desc: '面对一波波城市生存挑战' },
          { icon: '🤝', label: '团队合作', desc: '和同伴配合移动、瞄准和防守' },
          { icon: '🎧', label: '空间音效', desc: '通过声音判断威胁方向' },
        ],
        description:
          '城市被僵尸围攻，你和队友是最后的防线。城市捍卫者是一款全感官多人 VR 战斗体验，团队合作、快速反应和稳定瞄准都会影响最终结果。',
        longDescription:
          '你将和真实玩家组队，在城市战场地图中移动、协作并完成生存挑战。城市捍卫者适合喜欢竞技和团队互动的游客，把线下 VR 战斗、电影感混乱场面和身体沉浸感结合在一起。',
        reviews: [
          { quote: '我们一组人玩得非常尽兴。多人竞技比单纯观看式 VR 更刺激，大家玩完立刻想再来一局。', name: 'Kevin L.', rating: 5, img: commenterImg2 },
          { quote: '这是我玩过最好的多人 VR。城市地图设计很清楚，团队配合和得分都很有趣。', name: 'Monica H.', rating: 5, img: commenterImg1 },
        ],
      },
      'zh-Hant': {
        title: '城市捍衛者',
        subtitle: '城市捍衛者',
        tagline: '組隊守住城市最後防線',
        badge: '多人戰鬥',
        highlights: [
          '組隊進入 VR 生存戰鬥',
          '在城市地圖中進行線下多人對戰',
          '合作清除殭屍圍城挑戰',
          '強節奏、強沉浸的全感官戰鬥體驗',
        ],
        whatToExpect: [
          { icon: '🥽', label: 'VR 頭顯體驗', desc: '高刷新率設備帶來清晰戰鬥畫面' },
          { icon: '🧟', label: '殭屍圍城', desc: '面對一波波城市生存挑戰' },
          { icon: '🤝', label: '團隊合作', desc: '和同伴配合移動、瞄準和防守' },
          { icon: '🎧', label: '空間音效', desc: '透過聲音判斷威脅方向' },
        ],
        description:
          '城市被殭屍圍攻，你和隊友是最後的防線。城市捍衛者是一款全感官多人 VR 戰鬥體驗，團隊合作、快速反應和穩定瞄準都會影響最終結果。',
        longDescription:
          '你將和真實玩家組隊，在城市戰場地圖中移動、協作並完成生存挑戰。城市捍衛者適合喜歡競技和團隊互動的遊客，把線下 VR 戰鬥、電影感混亂場面和身體沉浸感結合在一起。',
        reviews: [
          { quote: '我們一組人玩得非常盡興。多人競技比單純觀看式 VR 更刺激，大家玩完立刻想再來一局。', name: 'Kevin L.', rating: 5, img: commenterImg2 },
          { quote: '這是我玩過最好的多人 VR。城市地圖設計很清楚，團隊配合和得分都很有趣。', name: 'Monica H.', rating: 5, img: commenterImg1 },
        ],
      },
    },
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
    demoVideo: beatVideoEn,
    demoVideos: { en: beatVideoEn, zh: beatVideoZh },
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
    localized: {
      'zh-Hans': {
        title: '超音节奏师',
        subtitle: '超音节奏师',
        tagline: '在全感官 VR 中跟随节奏挥砍',
        badge: '节奏动作',
        highlights: [
          '用光刃切开迎面而来的节奏方块',
          '进入明亮炫目的音乐竞技场',
          '无屏幕、全感官的音乐玩法',
          '适合朋友和家庭一起挑战分数',
        ],
        whatToExpect: [
          { icon: '🥽', label: 'VR 头显体验', desc: '宽视野设备带来清晰节奏画面' },
          { icon: '⚡', label: '节奏动作', desc: '跟随音乐节拍切中目标' },
          { icon: '🎯', label: '分数挑战', desc: '挑战精准度、连击和时机' },
          { icon: '🎵', label: '音乐关卡', desc: '灯光与声音会跟随节奏变化' },
        ],
        description:
          '超音节奏师把音乐变成一场身体参与的 VR 挑战。你将进入炫彩节奏舞台，挥砍迎面而来的目标，并在快速、明亮、无屏幕的体验中挑战连击分数。',
        longDescription:
          '每首曲目都会用发光节奏方块、动态灯光和全身动作包围玩家。它上手很快，也有足够的分数挑战空间，适合想要活力玩法但不想花太久学习规则的游客。',
        reviews: [
          { quote: '音乐和动作很快就能进入状态。我们每个人都想再玩一局，因为追分和连击很上头。', name: 'Rachel T.', rating: 5, img: commenterImg1 },
          { quote: '明亮、活跃，而且非常容易理解。感觉像运动和街机游戏结合在一起。', name: 'Brian C.', rating: 5, img: commenterImg2 },
        ],
      },
      'zh-Hant': {
        title: '超音節奏師',
        subtitle: '超音節奏師',
        tagline: '在全感官 VR 中跟隨節奏揮砍',
        badge: '節奏動作',
        highlights: [
          '用光刃切開迎面而來的節奏方塊',
          '進入明亮炫目的音樂競技場',
          '無螢幕、全感官的音樂玩法',
          '適合朋友和家庭一起挑戰分數',
        ],
        whatToExpect: [
          { icon: '🥽', label: 'VR 頭顯體驗', desc: '寬視野設備帶來清晰節奏畫面' },
          { icon: '⚡', label: '節奏動作', desc: '跟隨音樂節拍切中目標' },
          { icon: '🎯', label: '分數挑戰', desc: '挑戰精準度、連擊和時機' },
          { icon: '🎵', label: '音樂關卡', desc: '燈光與聲音會跟隨節奏變化' },
        ],
        description:
          '超音節奏師把音樂變成一場身體參與的 VR 挑戰。你將進入炫彩節奏舞台，揮砍迎面而來的目標，並在快速、明亮、無螢幕的體驗中挑戰連擊分數。',
        longDescription:
          '每首曲目都會用發光節奏方塊、動態燈光和全身動作包圍玩家。它上手很快，也有足夠的分數挑戰空間，適合想要活力玩法但不想花太久學習規則的遊客。',
        reviews: [
          { quote: '音樂和動作很快就能進入狀態。我們每個人都想再玩一局，因為追分和連擊很上頭。', name: 'Rachel T.', rating: 5, img: commenterImg1 },
          { quote: '明亮、活躍，而且非常容易理解。感覺像運動和街機遊戲結合在一起。', name: 'Brian C.', rating: 5, img: commenterImg2 },
        ],
      },
    },
  },
  {
    id: 'ocean-quest',
    category: 'arcade',
    title: 'Gulu Gulu',
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
    demoVideo: guluVideoEn,
    demoVideos: { en: guluVideoEn, zh: guluVideoZh },
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
    localized: {
      'zh-Hans': {
        title: '咕噜小机甲',
        subtitle: '击败萌怪军团',
        tagline: '无屏幕、全感官的轻松娱乐',
        badge: '家庭娱乐',
        highlights: [
          '挑战色彩鲜明的萌怪军团',
          '快速上手的 VR 竞技玩法',
          '适合家庭和朋友一起玩的团队体验',
          '明亮、轻松、无屏幕的全感官乐趣',
        ],
        whatToExpect: [
          { icon: '🥽', label: 'VR 头显体验', desc: '明亮宽视野画面，容易进入状态' },
          { icon: '🎮', label: '街机动作', desc: '规则简单，回合节奏快速' },
          { icon: '👾', label: '萌怪对战', desc: '迎战一波波可爱又热闹的敌人' },
          { icon: '🎵', label: '全感官乐趣', desc: '色彩画面和动感音效让体验更热闹' },
        ],
        description:
          '咕噜小机甲是一款明亮、快速、适合家庭的 VR 对战体验。玩家将在无屏幕、全感官的竞技场里挑战可爱的萌怪军团。',
        longDescription:
          '进入色彩丰富的关卡，快速反应，并在轻松有趣的战斗回合中和同伴一起配合。它适合想要街机能量、简单规则和热闹团队体验的游客。',
        reviews: [
          { quote: '咕噜小机甲非常适合我们一家人。画面明亮、有趣、很容易上手，成年人也觉得很刺激。', name: 'Amy W.', rating: 5, img: commenterImg1 },
          { quote: '萌怪战斗很热闹也很好笑。大家马上就知道该怎么玩，全程都在笑。', name: 'Daniel R.', rating: 5, img: commenterImg2 },
        ],
      },
      'zh-Hant': {
        title: '咕嚕小機甲',
        subtitle: '擊敗萌怪軍團',
        tagline: '無螢幕、全感官的輕鬆娛樂',
        badge: '家庭娛樂',
        highlights: [
          '挑戰色彩鮮明的萌怪軍團',
          '快速上手的 VR 競技玩法',
          '適合家庭和朋友一起玩的團隊體驗',
          '明亮、輕鬆、無螢幕的全感官樂趣',
        ],
        whatToExpect: [
          { icon: '🥽', label: 'VR 頭顯體驗', desc: '明亮寬視野畫面，容易進入狀態' },
          { icon: '🎮', label: '街機動作', desc: '規則簡單，回合節奏快速' },
          { icon: '👾', label: '萌怪對戰', desc: '迎戰一波波可愛又熱鬧的敵人' },
          { icon: '🎵', label: '全感官樂趣', desc: '色彩畫面和動感音效讓體驗更熱鬧' },
        ],
        description:
          '咕嚕小機甲是一款明亮、快速、適合家庭的 VR 對戰體驗。玩家將在無螢幕、全感官的競技場裡挑戰可愛的萌怪軍團。',
        longDescription:
          '進入色彩豐富的關卡，快速反應，並在輕鬆有趣的戰鬥回合中和同伴一起配合。它適合想要街機能量、簡單規則和熱鬧團隊體驗的遊客。',
        reviews: [
          { quote: '咕嚕小機甲非常適合我們一家人。畫面明亮、有趣、很容易上手，成年人也覺得很刺激。', name: 'Amy W.', rating: 5, img: commenterImg1 },
          { quote: '萌怪戰鬥很熱鬧也很好笑。大家馬上就知道該怎麼玩，全程都在笑。', name: 'Daniel R.', rating: 5, img: commenterImg2 },
        ],
      },
    },
  },
]

export const allExperiences = [...vrExperiences, ...arcadeGames]
