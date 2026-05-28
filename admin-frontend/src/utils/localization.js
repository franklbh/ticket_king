const CATALOG_NAME_ALIASES = {
  'terracotta warriors': 'terracotta',
  'terracotta army vr': 'terracotta',
  "terracotta warriors: secrets of the first emperor's mausoleum": 'terracotta',
  'pandas world': 'panda',
  "panda's world": 'panda',
  'panda world': 'panda',
  'back to jurassic': 'dino',
  'back to the jurassic': 'dino',
  hero: 'hero',
  'game a': 'hero',
  'hyperbeat slash': 'beat',
  'game b': 'beat',
  'gulu gulu': 'gulu',
  gulugulu: 'gulu',
  'gulu-gulu': 'gulu',
  'game c': 'gulu',
  'games: hero, hyperbeat slash, gulugulu': 'games',
  'games: hero, hyperbeat slash, gulu gulu': 'games',
}

const CATALOG_NAMES = {
  en: {
    terracotta: 'Terracotta Warriors',
    panda: "Panda's World",
    dino: 'Back to the Jurassic',
    hero: 'Hero',
    beat: 'HyperBeat Slash',
    gulu: 'Gulu Gulu',
    games: 'Games: Hero, HyperBeat Slash, Gulu Gulu',
  },
  'zh-Hans': {
    terracotta: '兵马俑',
    panda: '熊猫的世界',
    dino: '重返侏罗纪',
    hero: '城市捍卫者',
    beat: '超音节奏师',
    gulu: '咕噜小机甲',
    games: '游戏：城市捍卫者、超音节奏师、咕噜小机甲',
  },
  'zh-Hant': {
    terracotta: '兵馬俑',
    panda: '熊貓的世界',
    dino: '重返侏羅紀',
    hero: '城市捍衛者',
    beat: '超音節奏師',
    gulu: '咕嚕小機甲',
    games: '遊戲：城市捍衛者、超音節奏師、咕嚕小機甲',
  },
}

function normalizeCatalogName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, ' ')
}

export function catalogKeyFromName(value) {
  const normalized = normalizeCatalogName(value)
  if (!normalized) return null
  return CATALOG_NAME_ALIASES[normalized] || null
}

export function localizeCatalogName(value, lang = 'en') {
  const key = catalogKeyFromName(value)
  if (!key) return value
  return (CATALOG_NAMES[lang] || CATALOG_NAMES.en)[key] || CATALOG_NAMES.en[key] || value
}

export function localizeEvent(event, lang = 'en') {
  if (!event) return event
  return { ...event, name: localizeCatalogName(event.name, lang) }
}

export function localizeTicketTypeName(value, lang = 'en') {
  const normalized = normalizeCatalogName(value).replace(/\s+/g, '')
  const maps = {
    en: {
      adult: 'Adult',
      child: 'Child (7-15)',
      'child(7-15)': 'Child (7-15)',
      'child/youth(7-15)': 'Child/Youth (7-15)',
      senior: 'Senior (65+)',
      'senior(65+)': 'Senior (65+)',
      group: 'Group (6+ people)',
      'group(6+people)': 'Group (6+ people)',
      family: 'Family (2 adults + 1 child)',
      'family(2adults+1child)': 'Family (2 adults + 1 child)',
    },
    'zh-Hans': {
      adult: '成人票',
      child: '儿童票（7-15岁）',
      'child(7-15)': '儿童票（7-15岁）',
      'child/youth(7-15)': '儿童/青少年票（7-15岁）',
      senior: '长者票（65+）',
      'senior(65+)': '长者票（65+）',
      group: '团体票（6人以上）',
      'group(6+people)': '团体票（6人以上）',
      family: '家庭票（2大1小）',
      'family(2adults+1child)': '家庭票（2大1小）',
    },
    'zh-Hant': {
      adult: '成人票',
      child: '兒童票（7-15歲）',
      'child(7-15)': '兒童票（7-15歲）',
      'child/youth(7-15)': '兒童/青少年票（7-15歲）',
      senior: '長者票（65+）',
      'senior(65+)': '長者票（65+）',
      group: '團體票（6人以上）',
      'group(6+people)': '團體票（6人以上）',
      family: '家庭票（2大1小）',
      'family(2adults+1child)': '家庭票（2大1小）',
    },
  }
  return (maps[lang] || maps.en)[normalized] || value
}
