import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

import heroImg from './user_media/cover.jpg'
import galleryImg1 from './user_media/gallery1.png'
import galleryImg2 from './user_media/gallery2.png'
import galleryImg3 from './user_media/gallery3.png'
import galleryImg4 from './user_media/gallery4.png'
import galleryImg5 from './user_media/gallery5.png'
import galleryImg6 from './user_media/gallery6.png'
import galleryImg7 from './user_media/gallery7.png'
import galleryImg8 from './user_media/gallery8.png'
import introVideo from './user_media/Intro_video.mp4'
import commentFeatureImg from './user_media/comment2.png'
import commenterImg2 from './user_media/comment_p1.jpg'
import commenterImg3 from './user_media/comment_p2.jpg'
import mapInstructionPdf from './user_media/MAP--WE ARE VR.pdf'
import logoWhite from './user_media/logo_white.png'

// Fix Leaflet's broken default marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const VENUE_COORDS = [49.1754267, -123.1324168]
const GOOGLE_MAPS_URL =
  'https://www.google.com/maps/place/Terracotta+Warriors+VR--We+Are+VR/@49.1754267,-123.1349917,1220m/data=!3m2!1e3!4b1!4m6!3m5!1s0x5486751de09f7601:0x2cc78f091846bb35!8m2!3d49.1754267!4d-123.1324168!16s%2Fg%2F11y0s7b4zn?entry=ttu&g_ep=EgoyMDI2MDUxMS4wIKXMDSoASAFQAw%3D%3D'

const USERS_KEY = 'ticket_king_local_users'
const SESSION_KEY = 'ticket_king_local_session'
const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

const languages = [
  { code: 'en', label: 'English' },
  { code: 'zh-Hans', label: '简体中文' },
  { code: 'zh-Hant', label: '繁體中文' },
]

const translations = {
  en: {
    introduce: 'Introduce', gallery: 'Gallery', ticket: 'Ticket', faq: 'FAQ', contactLocation: 'Contact & Location',
    buyTicket: 'BUY TICKET', loginSignup: 'Login / Sign up', login: 'Log in', signup: 'Sign up', logout: 'Logout',
    mainPage: 'Main page', secureCheckout: 'Secure checkout', reserveVisit: 'Reserve your visit',
    date: 'Date', time: 'Time', tickets: 'Tickets', contact: 'Contact', payment: 'Payment',
    selectedDate: 'Selected date', selectedTime: 'Selected time', chooseDate: 'Choose a date', chooseTime: 'Choose a time',
    current: 'Current', edit: 'Edit', next: 'Next', back: 'Back', skip: 'Skip',
    selectDate: 'Select Date', selectTime: 'Select Time', selectTickets: 'Select Tickets', contactDetails: 'Contact Details',
    timeHint: 'Choose a start time; each event lasts about 45 minutes.',
    totalAmount: 'Total Amount', firstName: 'First name', lastName: 'Last name', email: 'Email', phoneOptional: 'Phone (optional)',
    firstNamePlaceholder: 'Your first name', lastNamePlaceholder: 'Your last name', emailPlaceholder: 'name@example.com', phonePlaceholder: 'e.g. (778) 123-4567',
    ticketsSent: 'Your tickets will be sent to this email.', optIn: 'I agree to receive updates and special offers.',
    policyCopy: 'By continuing you agree to the Privacy Policy and Terms and Conditions.', continuePayment: 'Continue to Payment',
    firstNameError: 'Enter a valid first name using letters, spaces, hyphens, or apostrophes.',
    lastNameError: 'Enter a valid last name using letters, spaces, hyphens, or apostrophes.',
    emailError: 'Enter a valid email address, such as name@example.com.',
    phoneError: 'Enter a valid phone number with 10 to 15 digits, or leave it blank.',
    familyError: 'Family bundle requires at least 3 people.', groupError: 'Group ticket requires at least 6 people.',
    orderSummary: 'Order Summary', duration: 'Duration approx. 45 minutes', subtotal: 'Subtotal', feesTaxes: 'Fees & taxes', totalDue: 'Total due',
    warningNonRefund: '⚠️ Tickets are non-refundable and valid only on the event date.', couponCode: 'Coupon code', apply: 'Apply',
    contactDetailsLower: 'Contact details', creditCard: 'Credit Card', processingPayment: 'processing payment...', completeWithin: 'Complete payment within',
    secureReservation: 'to secure your reservation.', expired: 'Your reservation hold expired. Please start over to pick a new date and time.',
    startOver: 'Start over', paymentQrTitle: 'Scan QR Code to Pay', qrScan: 'Please use {method} app to scan the QR code',
    qrWarning: '⚠️ Please do not close this window during payment', cancelPayment: 'Cancel Payment',
    cancelConfirm: 'Are you sure you want to cancel the payment?', unableCheckout: 'Unable to start checkout. Please try again.',
    vipEyebrow: 'Upgrade your visit', vipTitle: 'VIP Experience', vipPrice: '+$20.00 / guest', exclusiveTour: 'Exclusive Tour',
    priorityEntry: 'Priority Entry', souvenir: 'Souvenir', vipAddon: 'VIP add-on', vipDesc: 'Choose how many guests receive VIP benefits.',
    confirmUpgrade: 'Confirm Upgrade', heroKicker: 'A groundbreaking location-based VR experience',
    heroTitle: "Terracotta Warriors: Secrets Of The First Emperor's Mausoleum",
    introTitle: 'Introduction',
    introP1: '"Terracotta Warriors: Secrets of the First Emperor\'s Mausoleum" is a groundbreaking location-based VR experience created by Xi\'an Hongwen, in collaboration with VIVE Arts and Wevr. For the first time, this immersive production is officially licensed by the Emperor Qin Shi Huang\'s Mausoleum Site Museum.',
    introP2: 'The project brings together world-class creative and technical teams to deliver an authentic, interactive journey that stays true to the latest archaeological discoveries. Audiences travel back to the Great Qin and embark on an unforgettable adventure into the heart of the mausoleum.',
    galleryEyebrow: "Secrets of the First Emperor's Mausoleum", reserveSpot: 'Reserve Your Spot', faqEyebrow: 'Have a question in mind?', faqTitle: 'Read Our FAQs',
    reviewsViews: '100k+ Views', reviewsSatisfied: '99% Satisfied', reviewsLocations: '5+ Show Location',
    newsEyebrow: 'Informing Minds, Inspiring Stories', newsTitle: 'News & Media', readMore: 'Read More ›',
    footerSubscribe: 'Subscribe to Our newsletter', emailHere: 'Your email here', signUpCaps: 'SIGN UP',
    footerThanks: 'Thanks, your email has been saved for this preview.', footerEmailInvalid: 'Please enter a valid email address.',
    reachLocation: 'Reach Our Location', viewMap: 'View On Map', detailedLocation: 'Click here for detailed location instruction',
    openingHours: 'Opening Hours', contactUs: 'Contact Us', sundayThursday: 'Sunday to Thursday', fridaySaturday: 'Friday and Saturday',
    nearNorth: 'Near North entrance (Alderbridge Way)', venueLine: 'We Are VR in Lansdowne Centre',
    authEyebrow: 'Ticket King Account', authTitle: 'Sign in to manage your bookings.', authCopy: 'Accounts are stored locally for the frontend preview. Email verification can be enabled later.',
    welcomeBack: 'Welcome back', createAccount: 'Create account', fullName: 'Full name', emailAddress: 'Email address',
    username: 'Username', usernameEmail: 'Username or email', password: 'Password', passwordPlaceholder: 'Enter your password',
    usernameHelper: '3–24 lowercase letters, numbers, or underscores.', usernameEmailHelper: 'You can use your username or email.', passwordHelper: 'At least 8 characters.',
    fullNameRequired: 'Please enter your full name.', usernameRules: 'Username: 3–24 lowercase letters, numbers, or underscores.',
    passwordMin: 'Password must be at least 8 characters.', usernameTaken: 'That username is already taken.',
    emailTaken: 'That email is already registered.', loginIncorrect: 'Username or password is incorrect.',
    couponFirst: 'Enter a coupon code first.', couponUnavailable: 'Code "{code}" is not available for this preview checkout.',
    hi: 'Hi,', unavailable: 'unavailable', dateTbd: 'Date TBD',
    ticketTypeRegular: 'Regular', ticketTypeChild: 'Child (7-15)', ticketTypeSenior: 'Senior (65+)',
    ticketTypeFamily: 'Family Bundle (max. 2 adults)', ticketTypeGroup: 'Group Ticket (min. 6 people)',
    regularDesc: '$37.95/each', childDesc: '$27.95/each', seniorDesc: '$34.95/each', familyDesc: '$31.95/each', groupDesc: '$33.95/each',
    childInfo: 'Children under 7 years old are not permitted. Children aged 7 to 14 years must be accompanied by an adult.',
    familyInfo: 'Ticket for min. 3 people, max. 2 adults.', groupInfo: 'Ticket for min. 6 people.',
    pricingRegularDesc: 'Standard entry for one person', pricingChildDesc: 'Must be accompanied by an adult',
    pricingSeniorDesc: 'Ticket for seniors 65+', pricingFamilyDesc: 'Ticket for min. 3 people, max. 2 adults', pricingGroupDesc: 'Ticket for min. 6 people',
    startsFrom: 'Starts from {price}/each',
    faq1Q: 'If I wear glasses, can I still attend?', faq1A: 'Yes — our VR headset is designed so that you can usually wear your corrective or reading glasses inside the device comfortably.',
    faq2Q: 'Can children attend?', faq2A: 'Children aged 7–15 are welcome with a child ticket and must be accompanied by a paying adult at all times during the experience.',
    faq3Q: 'Can I buy tickets on-site?', faq3A: 'We recommend booking online in advance to secure your preferred time slot, as sessions have limited capacity. Limited walk-in availability may exist.',
    faq4Q: 'Can I refund or exchange my ticket?', faq4A: 'Tickets are non-refundable. Date and time exchanges are available up to 24 hours before your scheduled session, subject to availability.',
    faq5Q: 'What if I miss my scheduled time slot?', faq5A: 'Please arrive at least 10 minutes before your session. Late arrivals may not be accommodated, and tickets cannot be transferred for missed time slots.',
    faq6Q: 'Can I pay by credit card, WeChat, or Alipay?', faq6A: 'Yes, we accept Visa, Mastercard, WeChat Pay, and Alipay at checkout.',
    review1: 'I felt like I was really standing among the Terracotta Warriors. The level of detail and atmosphere were incredible — both educational and breathtaking. Truly one of the best VR experiences I’ve ever tried!',
    review2: 'The experience transported me straight into ancient China. It’s amazing how real everything felt, from the sounds to the lighting. Perfect blend of history and technology — highly recommended!',
    news1Title: 'Take A Virtual Tour Of Historic Terracotta Warriors In Richmond',
    news1Body: 'Visitors to a virtual reality historical tour in Richmond can walk through corridors made of stone and brick in the underground palace of the Qin Dynasty to see the world-renowned Terracotta Warriors.',
    news2Title: '"Terracotta Warriors: Secrets Of The First Emperor’s Mausoleum" Wins First Prize At The 2025 China Virtual Reality Innovation Competition',
    news2Body: '"Terracotta Warriors: Secrets of the First Emperor’s Mausoleum" won First Prize at the 2025 China Virtual Reality Innovation Competition, showcasing the latest XR achievements in cultural and technological innovation.',
  },
  'zh-Hans': {
    introduce: '项目介绍', gallery: '图库', ticket: '门票', faq: '常见问题', contactLocation: '联系与位置',
    buyTicket: '购买门票', loginSignup: '登录 / 注册', login: '登录', signup: '注册', logout: '退出',
    mainPage: '返回主页', secureCheckout: '安全结账', reserveVisit: '预订参观',
    date: '日期', time: '时间', tickets: '门票', contact: '联系人', payment: '付款',
    selectedDate: '已选日期', selectedTime: '已选时间', chooseDate: '选择日期', chooseTime: '选择时间',
    current: '当前', edit: '编辑', next: '下一步', back: '返回', skip: '跳过',
    selectDate: '选择日期', selectTime: '选择时间', selectTickets: '选择门票', contactDetails: '联系信息',
    timeHint: '请选择开始时间；每场体验约 45 分钟。',
    totalAmount: '总金额', firstName: '名字', lastName: '姓氏', email: '邮箱', phoneOptional: '电话（选填）',
    firstNamePlaceholder: '请输入名字', lastNamePlaceholder: '请输入姓氏', emailPlaceholder: 'name@example.com', phonePlaceholder: '例如：(778) 123-4567',
    ticketsSent: '门票将发送到此邮箱。', optIn: '我同意接收活动更新和特别优惠。',
    policyCopy: '继续即表示您同意隐私政策和条款条件。', continuePayment: '继续付款',
    firstNameError: '请输入有效名字，可包含字母、空格、连字符或撇号。',
    lastNameError: '请输入有效姓氏，可包含字母、空格、连字符或撇号。',
    emailError: '请输入有效邮箱地址，例如 name@example.com。',
    phoneError: '请输入 10 到 15 位数字的有效电话号码，或留空。',
    familyError: '家庭套票至少需要 3 人。', groupError: '团体票至少需要 6 人。',
    orderSummary: '订单摘要', duration: '体验时长约 45 分钟', subtotal: '小计', feesTaxes: '手续费和税费', totalDue: '应付总额',
    warningNonRefund: '⚠️ 门票不可退款，仅限所选日期使用。', couponCode: '优惠码', apply: '使用',
    contactDetailsLower: '联系信息', creditCard: '信用卡', processingPayment: '正在处理付款...', completeWithin: '请在',
    secureReservation: '内完成付款以保留预订。', expired: '您的预留时间已过期。请重新开始并选择新的日期和时间。',
    startOver: '重新开始', paymentQrTitle: '扫描二维码付款', qrScan: '请使用 {method} 扫描二维码',
    qrWarning: '⚠️ 付款期间请勿关闭此窗口', cancelPayment: '取消付款',
    cancelConfirm: '确定要取消付款吗？', unableCheckout: '无法开始付款，请重试。',
    vipEyebrow: '升级您的体验', vipTitle: 'VIP 体验', vipPrice: '+$20.00 / 位', exclusiveTour: '专属导览',
    priorityEntry: '优先入场', souvenir: '纪念品', vipAddon: 'VIP 加购', vipDesc: '请选择需要 VIP 权益的人数。',
    confirmUpgrade: '确认升级', heroKicker: '突破性的线下 VR 沉浸体验',
    heroTitle: '兵马俑：秦始皇陵的秘密',
    introTitle: '项目介绍',
    introP1: '《兵马俑：秦始皇陵的秘密》是一项突破性的线下 VR 沉浸体验，由西安弘文联合 VIVE Arts 与 Wevr 打造，并首次获得秦始皇帝陵博物院官方授权。',
    introP2: '项目结合国际创意与技术团队，根据最新考古成果打造真实、互动的沉浸旅程。观众将穿越回大秦，进入皇陵深处展开难忘探索。',
    galleryEyebrow: '秦始皇陵的秘密', reserveSpot: '预留您的席位', faqEyebrow: '还有疑问？', faqTitle: '查看常见问题',
    reviewsViews: '100k+ 浏览', reviewsSatisfied: '99% 满意', reviewsLocations: '5+ 展出地点',
    newsEyebrow: '媒体报道与故事', newsTitle: '新闻与媒体', readMore: '阅读更多 ›',
    footerSubscribe: '订阅我们的资讯', emailHere: '请输入邮箱', signUpCaps: '订阅',
    footerThanks: '谢谢，您的邮箱已保存到本次预览。', footerEmailInvalid: '请输入有效邮箱地址。',
    reachLocation: '到达位置', viewMap: '查看地图', detailedLocation: '点击查看详细位置指引',
    openingHours: '营业时间', contactUs: '联系我们', sundayThursday: '周日至周四', fridaySaturday: '周五和周六',
    nearNorth: '靠近 Alderbridge Way 北入口', venueLine: 'Lansdowne Centre 内 WE ARE VR',
    authEyebrow: 'Ticket King 账户', authTitle: '登录以管理您的预订。', authCopy: '当前为前端预览，账户会保存在本地；邮箱验证可后续启用。',
    welcomeBack: '欢迎回来', createAccount: '创建账户', fullName: '姓名', emailAddress: '邮箱地址',
    username: '用户名', usernameEmail: '用户名或邮箱', password: '密码', passwordPlaceholder: '请输入密码',
    usernameHelper: '3–24 位小写字母、数字或下划线。', usernameEmailHelper: '可使用用户名或邮箱登录。', passwordHelper: '至少 8 个字符。',
    fullNameRequired: '请输入您的姓名。', usernameRules: '用户名需为 3–24 位小写字母、数字或下划线。',
    passwordMin: '密码至少需要 8 个字符。', usernameTaken: '该用户名已被使用。',
    emailTaken: '该邮箱已注册。', loginIncorrect: '用户名或密码不正确。',
    couponFirst: '请先输入优惠码。', couponUnavailable: '优惠码“{code}”不适用于当前预览结账。',
    hi: '你好，', unavailable: '不可用', dateTbd: '日期待定',
    ticketTypeRegular: '普通票', ticketTypeChild: '儿童票（7–15 岁）', ticketTypeSenior: '长者票（65+）',
    ticketTypeFamily: '家庭套票（最多 2 位成人）', ticketTypeGroup: '团体票（至少 6 人）',
    regularDesc: '$37.95/张', childDesc: '$27.95/张', seniorDesc: '$34.95/张', familyDesc: '$31.95/张', groupDesc: '$33.95/张',
    childInfo: '7 岁以下儿童不可入场。7 至 14 岁儿童必须由成人陪同。',
    familyInfo: '至少 3 人起订，最多 2 位成人。', groupInfo: '团体票至少 6 人起订。',
    pricingRegularDesc: '单人标准入场', pricingChildDesc: '须由成人陪同',
    pricingSeniorDesc: '适用于 65 岁及以上长者', pricingFamilyDesc: '至少 3 人，最多 2 位成人', pricingGroupDesc: '至少 6 人起订',
    startsFrom: '{price}/张起',
    faq1Q: '戴眼镜可以参加吗？', faq1A: '可以。我们的 VR 头显通常可容纳近视或阅读眼镜，佩戴舒适。',
    faq2Q: '儿童可以参加吗？', faq2A: '7–15 岁儿童可购买儿童票参加，并须全程由购票成人陪同。',
    faq3Q: '可以现场买票吗？', faq3A: '建议提前在线预订以锁定理想场次。每场容量有限，现场票视剩余名额而定。',
    faq4Q: '门票可以退款或改期吗？', faq4A: '门票不可退款。如需更改日期或时间，请至少在预约场次前 24 小时申请，并以余位为准。',
    faq5Q: '错过预约时间怎么办？', faq5A: '请至少提前 10 分钟到场。迟到可能无法安排入场，错过场次的门票不可转用。',
    faq6Q: '可以用信用卡、微信或支付宝付款吗？', faq6A: '可以。结账支持 Visa、Mastercard、微信支付和支付宝。',
    review1: '仿佛真的站在兵马俑之间。细节和氛围都非常震撼，既有知识性又充满沉浸感，是我体验过最棒的 VR 项目之一！',
    review2: '这次体验让我瞬间回到古代中国。声音、灯光和场景都非常真实，历史与科技结合得恰到好处，强烈推荐！',
    news1Title: '在 Richmond 沉浸式探访历史兵马俑',
    news1Body: '游客可以通过虚拟现实历史体验，走入秦代地下宫殿的石砖廊道，近距离观看世界闻名的兵马俑。',
    news2Title: '《兵马俑：秦始皇陵的秘密》获 2025 中国虚拟现实创新大赛一等奖',
    news2Body: '《兵马俑：秦始皇陵的秘密》在 2025 中国虚拟现实创新大赛中获得一等奖，展现文化与科技融合的最新 XR 成果。',
  },
  'zh-Hant': {
    introduce: '項目介紹', gallery: '圖庫', ticket: '門票', faq: '常見問題', contactLocation: '聯絡與位置',
    buyTicket: '購買門票', loginSignup: '登入 / 註冊', login: '登入', signup: '註冊', logout: '登出',
    mainPage: '返回主頁', secureCheckout: '安全結帳', reserveVisit: '預訂參觀',
    date: '日期', time: '時間', tickets: '門票', contact: '聯絡人', payment: '付款',
    selectedDate: '已選日期', selectedTime: '已選時間', chooseDate: '選擇日期', chooseTime: '選擇時間',
    current: '目前', edit: '編輯', next: '下一步', back: '返回', skip: '略過',
    selectDate: '選擇日期', selectTime: '選擇時間', selectTickets: '選擇門票', contactDetails: '聯絡資訊',
    timeHint: '請選擇開始時間；每場體驗約 45 分鐘。',
    totalAmount: '總金額', firstName: '名字', lastName: '姓氏', email: '電郵', phoneOptional: '電話（選填）',
    firstNamePlaceholder: '請輸入名字', lastNamePlaceholder: '請輸入姓氏', emailPlaceholder: 'name@example.com', phonePlaceholder: '例如：(778) 123-4567',
    ticketsSent: '門票將發送到此電郵。', optIn: '我同意接收活動更新和特別優惠。',
    policyCopy: '繼續即表示您同意私隱政策和條款條件。', continuePayment: '繼續付款',
    firstNameError: '請輸入有效名字，可包含字母、空格、連字號或撇號。',
    lastNameError: '請輸入有效姓氏，可包含字母、空格、連字號或撇號。',
    emailError: '請輸入有效電郵地址，例如 name@example.com。',
    phoneError: '請輸入 10 到 15 位數字的有效電話號碼，或留空。',
    familyError: '家庭套票至少需要 3 人。', groupError: '團體票至少需要 6 人。',
    orderSummary: '訂單摘要', duration: '體驗時長約 45 分鐘', subtotal: '小計', feesTaxes: '手續費和稅費', totalDue: '應付總額',
    warningNonRefund: '⚠️ 門票不可退款，僅限所選日期使用。', couponCode: '優惠碼', apply: '使用',
    contactDetailsLower: '聯絡資訊', creditCard: '信用卡', processingPayment: '正在處理付款...', completeWithin: '請在',
    secureReservation: '內完成付款以保留預訂。', expired: '您的預留時間已過期。請重新開始並選擇新的日期和時間。',
    startOver: '重新開始', paymentQrTitle: '掃描二維碼付款', qrScan: '請使用 {method} 掃描二維碼',
    qrWarning: '⚠️ 付款期間請勿關閉此視窗', cancelPayment: '取消付款',
    cancelConfirm: '確定要取消付款嗎？', unableCheckout: '無法開始付款，請重試。',
    vipEyebrow: '升級您的體驗', vipTitle: 'VIP 體驗', vipPrice: '+$20.00 / 位', exclusiveTour: '專屬導覽',
    priorityEntry: '優先入場', souvenir: '紀念品', vipAddon: 'VIP 加購', vipDesc: '請選擇需要 VIP 權益的人數。',
    confirmUpgrade: '確認升級', heroKicker: '突破性的線下 VR 沉浸體驗',
    heroTitle: '兵馬俑：秦始皇陵的秘密',
    introTitle: '項目介紹',
    introP1: '《兵馬俑：秦始皇陵的秘密》是一項突破性的線下 VR 沉浸體驗，由西安弘文聯合 VIVE Arts 與 Wevr 打造，並首次獲得秦始皇帝陵博物院官方授權。',
    introP2: '項目結合國際創意與技術團隊，根據最新考古成果打造真實、互動的沉浸旅程。觀眾將穿越回大秦，進入皇陵深處展開難忘探索。',
    galleryEyebrow: '秦始皇陵的秘密', reserveSpot: '預留您的席位', faqEyebrow: '還有疑問？', faqTitle: '查看常見問題',
    reviewsViews: '100k+ 瀏覽', reviewsSatisfied: '99% 滿意', reviewsLocations: '5+ 展出地點',
    newsEyebrow: '媒體報導與故事', newsTitle: '新聞與媒體', readMore: '閱讀更多 ›',
    footerSubscribe: '訂閱我們的資訊', emailHere: '請輸入電郵', signUpCaps: '訂閱',
    footerThanks: '謝謝，您的電郵已保存到本次預覽。', footerEmailInvalid: '請輸入有效電郵地址。',
    reachLocation: '到達位置', viewMap: '查看地圖', detailedLocation: '點擊查看詳細位置指引',
    openingHours: '營業時間', contactUs: '聯絡我們', sundayThursday: '週日至週四', fridaySaturday: '週五和週六',
    nearNorth: '靠近 Alderbridge Way 北入口', venueLine: 'Lansdowne Centre 內 WE ARE VR',
    authEyebrow: 'Ticket King 帳戶', authTitle: '登入以管理您的預訂。', authCopy: '目前為前端預覽，帳戶會保存在本地；電郵驗證可後續啟用。',
    welcomeBack: '歡迎回來', createAccount: '建立帳戶', fullName: '姓名', emailAddress: '電郵地址',
    username: '使用者名稱', usernameEmail: '使用者名稱或電郵', password: '密碼', passwordPlaceholder: '請輸入密碼',
    usernameHelper: '3–24 位小寫字母、數字或底線。', usernameEmailHelper: '可使用使用者名稱或電郵登入。', passwordHelper: '至少 8 個字元。',
    fullNameRequired: '請輸入您的姓名。', usernameRules: '使用者名稱需為 3–24 位小寫字母、數字或底線。',
    passwordMin: '密碼至少需要 8 個字元。', usernameTaken: '該使用者名稱已被使用。',
    emailTaken: '該電郵已註冊。', loginIncorrect: '使用者名稱或密碼不正確。',
    couponFirst: '請先輸入優惠碼。', couponUnavailable: '優惠碼「{code}」不適用於目前預覽結帳。',
    hi: '你好，', unavailable: '不可用', dateTbd: '日期待定',
    ticketTypeRegular: '普通票', ticketTypeChild: '兒童票（7–15 歲）', ticketTypeSenior: '長者票（65+）',
    ticketTypeFamily: '家庭套票（最多 2 位成人）', ticketTypeGroup: '團體票（至少 6 人）',
    regularDesc: '$37.95/張', childDesc: '$27.95/張', seniorDesc: '$34.95/張', familyDesc: '$31.95/張', groupDesc: '$33.95/張',
    childInfo: '7 歲以下兒童不可入場。7 至 14 歲兒童必須由成人陪同。',
    familyInfo: '至少 3 人起訂，最多 2 位成人。', groupInfo: '團體票至少 6 人起訂。',
    pricingRegularDesc: '單人標準入場', pricingChildDesc: '須由成人陪同',
    pricingSeniorDesc: '適用於 65 歲及以上長者', pricingFamilyDesc: '至少 3 人，最多 2 位成人', pricingGroupDesc: '至少 6 人起訂',
    startsFrom: '{price}/張起',
    faq1Q: '戴眼鏡可以參加嗎？', faq1A: '可以。我們的 VR 頭戴裝置通常可容納近視或閱讀眼鏡，佩戴舒適。',
    faq2Q: '兒童可以參加嗎？', faq2A: '7–15 歲兒童可購買兒童票參加，並須全程由購票成人陪同。',
    faq3Q: '可以現場買票嗎？', faq3A: '建議提前線上預訂以鎖定理想場次。每場容量有限，現場票視剩餘名額而定。',
    faq4Q: '門票可以退款或改期嗎？', faq4A: '門票不可退款。如需更改日期或時間，請至少在預約場次前 24 小時申請，並以餘位為準。',
    faq5Q: '錯過預約時間怎麼辦？', faq5A: '請至少提前 10 分鐘到場。遲到可能無法安排入場，錯過場次的門票不可轉用。',
    faq6Q: '可以用信用卡、微信或支付寶付款嗎？', faq6A: '可以。結帳支援 Visa、Mastercard、微信支付和支付寶。',
    review1: '彷彿真的站在兵馬俑之間。細節和氛圍都非常震撼，既有知識性又充滿沉浸感，是我體驗過最棒的 VR 項目之一！',
    review2: '這次體驗讓我瞬間回到古代中國。聲音、燈光和場景都非常真實，歷史與科技結合得恰到好處，強烈推薦！',
    news1Title: '在 Richmond 沉浸式探訪歷史兵馬俑',
    news1Body: '遊客可以透過虛擬實境歷史體驗，走入秦代地下宮殿的石磚廊道，近距離觀看世界聞名的兵馬俑。',
    news2Title: '《兵馬俑：秦始皇陵的秘密》獲 2025 中國虛擬實境創新大賽一等獎',
    news2Body: '《兵馬俑：秦始皇陵的秘密》在 2025 中國虛擬實境創新大賽中獲得一等獎，展現文化與科技融合的最新 XR 成果。',
  },
}

const dateGrid = [
  { day: 1, disabled: true }, { day: 2, disabled: true }, { day: 3, disabled: true },
  { day: 4, disabled: true }, { day: 5, disabled: true }, { day: 6, disabled: true },
  { day: 7, disabled: true },
  { day: 8, price: 37.95, level: 'normal' }, { day: 9, price: 37.95, level: 'normal' },
  { day: 10, price: 37.95, level: 'normal' }, { day: 11, price: 37.95, level: 'normal' },
  { day: 12, price: 37.95, level: 'normal' }, { day: 13, price: 45.95, level: 'peak' },
  { day: 14, price: 45.95, level: 'peak' }, { day: 15, price: 37.95, level: 'normal' },
  { day: 16, price: 37.95, level: 'normal' }, { day: 17, price: 37.95, level: 'normal' },
  { day: 18, price: 37.95, level: 'normal' }, { day: 19, price: 37.95, level: 'normal' },
  { day: 20, price: 45.95, level: 'peak' }, { day: 21, price: 45.95, level: 'peak' },
  { day: 22, price: 37.95, level: 'normal' }, { day: 23, price: 37.95, level: 'normal' },
  { day: 24, price: 37.95, level: 'normal' }, { day: 25, disabled: true },
  { day: 26, price: 45.95, level: 'peak' }, { day: 27, price: 45.95, level: 'peak' },
  { day: 28, price: 45.95, level: 'peak' }, { day: 29, price: 37.95, level: 'normal' },
  { day: 30, price: 37.95, level: 'normal' }, { day: 31, price: 37.95, level: 'normal' },
]

const timeSlots = [
  { time: '10:00 AM', price: 37.95 }, { time: '10:30 AM', price: 37.95 },
  { time: '11:00 AM', price: 37.95 }, { time: '11:30 AM', price: 37.95 },
  { time: '12:00 PM', price: 37.95 }, { time: '12:30 PM', price: 37.95 },
  { time: '1:00 PM', price: 37.95 }, { time: '1:30 PM', price: 37.95 },
  { time: '2:00 PM', price: 37.95 }, { time: '2:30 PM', price: 37.95 },
  { time: '3:00 PM', price: 43.95 }, { time: '3:30 PM', price: 43.95 },
  { time: '4:00 PM', price: 43.95 }, { time: '4:30 PM', price: 43.95 },
  { time: '5:00 PM', price: 43.95 },
]

const ticketTypes = [
  { id: 'regular', label: 'Regular', description: '$37.95/each', price: 37.95 },
  { id: 'child', label: 'Child (7-15)', description: '$27.95/each', price: 27.95, info: 'Children under 7 years old are not permitted. Children aged 7 to 14 years must be accompanied by an adult.' },
  { id: 'senior', label: 'Senior (65+)', description: '$34.95/each', price: 34.95 },
  { id: 'family', label: 'Family Bundle (max. 2 adults)', description: '$31.95/each', price: 31.95, info: 'Ticket for min. 3 people, max. 2 adults.' },
  { id: 'group', label: 'Group Ticket (min. 6 people)', description: '$33.95/each', price: 33.95, info: 'Ticket for min. 6 people.' },
]

const ticketPricing = [
  { label: 'Regular', desc: 'Standard entry for one person', price: 'Starts from $37.95/each' },
  { label: 'Child (7-15)', desc: 'Must be accompanied by an adult', price: 'Starts from $27.95/each' },
  { label: 'Senior (65+)', desc: 'Ticket for seniors 65+', price: 'Starts from $34.95/each' },
  { label: 'Family Bundle', desc: 'Ticket for min. 3 people, max. 2 adults', price: 'Starts from $31.95/each' },
  { label: 'Group Ticket', desc: 'Ticket for min. 6 people', price: 'Starts from $33.95/each' },
]

const faqItems = [
  { q: 'If I wear glasses, can I still attend?', a: 'Yes — our VR headset is designed so that you can usually wear your corrective or reading glasses inside the device comfortably.' },
  { q: 'Can children attend?', a: 'Children aged 7–15 are welcome with a child ticket and must be accompanied by a paying adult at all times during the experience.' },
  { q: 'Can I buy tickets on-site?', a: 'We recommend booking online in advance to secure your preferred time slot, as sessions have limited capacity. Limited walk-in availability may exist.' },
  { q: 'Can I refund or exchange my ticket?', a: 'Tickets are non-refundable. Date and time exchanges are available up to 24 hours before your scheduled session, subject to availability.' },
  { q: 'What if I miss my scheduled time slot?', a: 'Please arrive at least 10 minutes before your session. Late arrivals may not be accommodated, and tickets cannot be transferred for missed time slots.' },
  { q: 'Can I pay by credit card, WeChat, or Alipay?', a: 'Yes, we accept Visa, Mastercard, WeChat Pay, Alipay, and Apple Pay at checkout.' },
]

const galleryImages = [galleryImg1, galleryImg2, galleryImg3, galleryImg4, galleryImg5, galleryImg6, galleryImg7, galleryImg8]

const testimonials = [
  { quote: 'I felt like I was really standing among the Terracotta Warriors. The level of detail and atmosphere were incredible — both educational and breathtaking. Truly one of the best VR experiences I\'ve ever tried!', name: 'Emily', rating: 5, img: commenterImg2 },
  { quote: 'The experience transported me straight into ancient China. It\'s amazing how real everything felt, from the sounds to the lighting. Perfect blend of history and technology — highly recommended!', name: 'Michael', rating: 5, img: commenterImg3 },
]

const newsItems = [
  { title: 'Take A Virtual Tour Of Historic Terracotta Warriors In Richmond', body: 'Visitors to a virtual reality historical tour in Richmond can "walk" through corridors made of stone and brick in the underground palace of the Qin Dynasty to see the world-renowned Terracotta Warriors.', link: 'https://www.richmond-news.com/local-news/virtual-reality-tour-historic-terracotta-warriors-richmond-bc-11506120' },
  { title: '"Terracotta Warriors: Secrets Of The First Emperor\'s Mausoleum" Wins First Prize At The 2025 \'Yuanmeng Shanhai\' Second China Virtual Reality Innovation Competition', body: '"Terracotta Warriors: Secrets of the First Emperor\'s Mausoleum" won First Prize at the 2025 \'Yuanmeng Shanhai\' China Virtual Reality Innovation Competition, showcasing China\'s latest XR achievements in cultural and technological innovation.', link: 'https://mp.weixin.qq.com/s/hRm4bngXABJ7W3fWNAcjDg' },
]

const qrPlaceholder = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect width="320" height="320" fill="#fff"/><rect x="16" y="16" width="80" height="80" fill="#0b0b0b"/><rect x="224" y="16" width="80" height="80" fill="#0b0b0b"/><rect x="16" y="224" width="80" height="80" fill="#0b0b0b"/><rect x="96" y="96" width="128" height="128" fill="#0b0b0b"/><rect x="128" y="128" width="64" height="64" fill="#fff"/></svg>`)

const loadUsers = () => { try { return JSON.parse(localStorage.getItem(USERS_KEY)) || [] } catch { return [] } }
const saveUsers = (users) => { localStorage.setItem(USERS_KEY, JSON.stringify(users)) }
const readSession = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null } }
const normalize = (value) => value.trim().toLowerCase()
const monthLabel = (date) => date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
const fullDateLabel = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const isSameMonth = (date, year, month) => date.getFullYear() === year && date.getMonth() === month
const normalizePhone = (value) => value.replace(/[^\d]/g, '')
const isReasonableName = (value) => {
  const trimmed = value.trim()
  return /^[\p{L}][\p{L}' -]{1,49}$/u.test(trimmed) && !/[' -]{2,}/.test(trimmed)
}
const isReasonablePhone = (value) => {
  if (!value.trim()) return true
  const digits = normalizePhone(value)
  return digits.length >= 10 && digits.length <= 15 && !/^(\d)\1+$/.test(digits)
}

const isStrictEmail = (email) => {
  const value = email.trim()
  if (!emailPattern.test(value)) return false
  const [local, domain] = value.split('@')
  if (!local || !domain) return false
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false
  return domain.split('.').every((part) => part && !part.startsWith('-') && !part.endsWith('-'))
}

const hashPassword = async (password) => {
  const data = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

const badge = (type) => (type === 'peak' ? 'peak' : type === 'normal' ? 'normal' : 'muted')
const currency = (val) => `$${val.toFixed(2)}`

// Rust-colored custom Leaflet marker
const rustIcon = new L.DivIcon({
  html: `<div style="width:18px;height:24px;position:relative"><div style="width:18px;height:18px;background:#7d2c21;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div></div>`,
  iconSize: [18, 24],
  iconAnchor: [9, 24],
  popupAnchor: [0, -26],
  className: '',
})

// ── Brand Logo ───────────────────────────────────────────────────────────
function BrandLogo({ height = 40 }) {
  return (
    <img src={logoWhite} alt="WE ARE VR" style={{ height, width: 'auto', display: 'block' }} />
  )
}

// ── Map Modal ────────────────────────────────────────────────────────────
function MapModal({ onClose }) {
  const markerRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => markerRef.current?.openPopup(), 120)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="map-modal-overlay" onClick={onClose}>
      <div className="map-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="map-modal-close" onClick={onClose} type="button" aria-label="Close map">✕</button>
        <MapContainer center={VENUE_COORDS} zoom={16} style={{ width: '100%', height: '100%' }} zoomControl={true}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          <Marker position={VENUE_COORDS} icon={rustIcon} ref={markerRef}>
            <Popup closeButton={true} autoPan={true}>
              <div className="map-popup">
                <div className="map-popup-title">WE ARE VR</div>
                <a href={GOOGLE_MAPS_URL} target="_blank" rel="noreferrer" className="map-popup-addr">
                  Unit 210<br />5300 Number 3 Rd,<br />Richmond, BC
                </a>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  )
}

// ── Nav Menu Overlay ─────────────────────────────────────────────────────
function NavMenu({ onClose, onBuyTicket, onNavigateToSection, t }) {
  const scrollTo = (id) => {
    onClose()
    if (onNavigateToSection) {
      onNavigateToSection(id)
      return
    }
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  return (
    <div className="nav-menu-overlay">
      <button className="nav-menu-close" onClick={onClose} type="button" aria-label="Close menu">✕</button>
      <div className="nav-menu-inner">
        <div className="nav-menu-brand">WE ARE VR</div>
        <nav className="nav-menu-links">
          <button className="nav-menu-item" onClick={() => scrollTo('intro')} type="button">{t('introduce')}</button>
          <button className="nav-menu-item" onClick={() => scrollTo('gallery')} type="button">{t('gallery')}</button>
          <button className="nav-menu-item" onClick={() => scrollTo('tickets')} type="button">{t('ticket')}</button>
          <button className="nav-menu-item" onClick={() => scrollTo('faq')} type="button">{t('faq')}</button>
          <button className="nav-menu-item" onClick={() => scrollTo('contact')} type="button">{t('contactLocation')}</button>
        </nav>
        <button
          className="nav-menu-buy-btn"
          onClick={() => { onClose(); onBuyTicket() }}
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="7" width="22" height="10" rx="2"/><path d="M17 7V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2"/><path d="M17 17v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2"/></svg>
          {t('buyTicket')}
        </button>
        <div className="nav-menu-socials">
          <a href="https://www.facebook.com/people/We-Are-VR/61582764116105/#" target="_blank" rel="noreferrer" className="nav-social" aria-label="Facebook"><i className="fab fa-facebook-f" /></a>
          <a href="https://www.instagram.com/we.are.vr.show" target="_blank" rel="noreferrer" className="nav-social" aria-label="Instagram"><i className="fab fa-instagram" /></a>
          <a href="https://www.xiaohongshu.com/user/profile/64c1c5cf000000001403454a" target="_blank" rel="noreferrer" className="nav-social nav-social-text" aria-label="Xiaohongshu">小红书</a>
          <a href="https://www.tiktok.com/@we.are.vr3" target="_blank" rel="noreferrer" className="nav-social" aria-label="TikTok"><i className="fab fa-tiktok" /></a>
          <a href="mailto:info@vrvr.show" className="nav-social" aria-label="Email"><i className="far fa-envelope" /></a>
          <a href="tel:+17788054699" className="nav-social" aria-label="Phone"><i className="fas fa-phone-alt" /></a>
        </div>
      </div>
    </div>
  )
}

// ── Main App ─────────────────────────────────────────────────────────────
function App() {
  const [selectedLang, setSelectedLang] = useState(languages[0])
  const [langOpen, setLangOpen] = useState(false)
  const [view, setView] = useState('main')
  const [authMode, setAuthMode] = useState('login')
  const [users, setUsers] = useState(() => loadUsers())
  const [session, setSession] = useState(() => readSession())
  const [authMessage, setAuthMessage] = useState('')
  const [authForm, setAuthForm] = useState({ name: '', email: '', username: '', password: '' })
  const [showBooking, setShowBooking] = useState(false)
  const [step, setStep] = useState('date')
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(2025, 11, 1))
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [counts, setCounts] = useState(() => ticketTypes.reduce((acc, t) => ({ ...acc, [t.id]: 0 }), {}))
  const [vipQty, setVipQty] = useState(0)
  const [vipModal, setVipModal] = useState(false)
  const [contact, setContact] = useState({ first: '', last: '', email: '', phone: '', optIn: false })
  const [contactTouched, setContactTouched] = useState({})
  const [timeLeft, setTimeLeft] = useState(300)
  const [showQr, setShowQr] = useState(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [showBackTop, setShowBackTop] = useState(false)
  const [stripeLoading, setStripeLoading] = useState(false)
  const [faqOpen, setFaqOpen] = useState(0)
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterMessage, setNewsletterMessage] = useState('')
  const [showMapModal, setShowMapModal] = useState(false)
  const [showNavMenu, setShowNavMenu] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponMessage, setCouponMessage] = useState('')
  const bookingRef = useRef(null)
  const t = (key, params = {}) => {
    const template = translations[selectedLang.code]?.[key] ?? translations.en[key] ?? key
    return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), template)
  }
  const ticketCopyKeys = {
    regular: ['ticketTypeRegular', 'regularDesc'],
    child: ['ticketTypeChild', 'childDesc', 'childInfo'],
    senior: ['ticketTypeSenior', 'seniorDesc'],
    family: ['ticketTypeFamily', 'familyDesc', 'familyInfo'],
    group: ['ticketTypeGroup', 'groupDesc', 'groupInfo'],
  }
  const localizedTicketTypes = ticketTypes.map((ticket) => ({
    ...ticket,
    label: t(ticketCopyKeys[ticket.id][0]),
    description: t(ticketCopyKeys[ticket.id][1]),
    info: ticketCopyKeys[ticket.id][2] ? t(ticketCopyKeys[ticket.id][2]) : undefined,
  }))
  const localizedTicketPricing = [
    { label: t('ticketTypeRegular'), desc: t('pricingRegularDesc'), price: t('startsFrom', { price: '$37.95' }) },
    { label: t('ticketTypeChild'), desc: t('pricingChildDesc'), price: t('startsFrom', { price: '$27.95' }) },
    { label: t('ticketTypeSenior'), desc: t('pricingSeniorDesc'), price: t('startsFrom', { price: '$34.95' }) },
    { label: selectedLang.code === 'en' ? 'Family Bundle' : t('ticketTypeFamily'), desc: t('pricingFamilyDesc'), price: t('startsFrom', { price: '$31.95' }) },
    { label: selectedLang.code === 'en' ? 'Group Ticket' : t('ticketTypeGroup'), desc: t('pricingGroupDesc'), price: t('startsFrom', { price: '$33.95' }) },
  ]
  const localizedFaqItems = [1, 2, 3, 4, 5, 6].map((idx) => ({ q: t(`faq${idx}Q`), a: t(`faq${idx}A`) }))
  const localizedTestimonials = testimonials.map((item, idx) => ({ ...item, quote: t(`review${idx + 1}`) }))
  const localizedNewsItems = newsItems.map((item, idx) => ({ ...item, title: t(`news${idx + 1}Title`), body: t(`news${idx + 1}Body`) }))
  const dateLocale = selectedLang.code === 'zh-Hans' ? 'zh-CN' : selectedLang.code === 'zh-Hant' ? 'zh-TW' : 'en-US'
  const monthDisplay = (date) => date.toLocaleDateString(dateLocale, { month: 'short', year: 'numeric' })
  const fullDateDisplay = (date) => date.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })
  const weekdayLabels = selectedLang.code === 'en'
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : selectedLang.code === 'zh-Hans'
      ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      : ['週日', '週一', '週二', '週三', '週四', '週五', '週六']

  const currentUser = useMemo(() => {
    if (!session) return null
    return users.find((u) => u.id === session.userId) || null
  }, [session, users])

  const totals = useMemo(() => {
    const ticketTotal = ticketTypes.reduce((sum, t) => sum + counts[t.id] * t.price, 0)
    const vipTotal = vipQty * 20
    const subtotal = ticketTotal + vipTotal
    const fees = subtotal > 0 ? Math.max(2.5, subtotal * 0.139) : 0
    return { ticketTotal, vipTotal, subtotal, fees, grand: subtotal + fees }
  }, [counts, vipQty])

  const contactErrors = useMemo(() => {
    const errors = {}
    if (!isReasonableName(contact.first)) errors.first = t('firstNameError')
    if (!isReasonableName(contact.last)) errors.last = t('lastNameError')
    if (!isStrictEmail(contact.email)) errors.email = t('emailError')
    if (!isReasonablePhone(contact.phone)) errors.phone = t('phoneError')
    return errors
  }, [contact, selectedLang.code])

  const visibleDateGrid = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const leadingBlanks = new Date(year, month, 1).getDay()
    const specialDates = year === 2025 && month === 11 ? new Map(dateGrid.map((item) => [item.day, item])) : null
    const dates = Array.from({ length: daysInMonth }, (_, idx) => {
      const day = idx + 1
      const date = new Date(year, month, day)
      const special = specialDates?.get(day)
      const isWeekend = date.getDay() === 0 || date.getDay() === 6
      const price = special?.price ?? (isWeekend ? 45.95 : 37.95)
      const disabled = special?.disabled ?? false
      return {
        day,
        date,
        key: `${year}-${month}-${day}`,
        disabled,
        price: disabled ? undefined : price,
        level: disabled ? undefined : (special?.level ?? (isWeekend ? 'peak' : 'normal')),
      }
    })

    return [
      ...Array.from({ length: leadingBlanks }, (_, idx) => ({ key: `blank-${year}-${month}-${idx}`, blank: true })),
      ...dates,
    ]
  }, [calendarMonth])

  useEffect(() => {
    if (step !== 'payment') return undefined
    setTimeLeft(300)
    const timer = setInterval(() => setTimeLeft((t) => (t <= 1 ? 0 : t - 1)), 1000)
    return () => clearInterval(timer)
  }, [step])

  useEffect(() => {
    const onScroll = () => {
      const top = document.documentElement.scrollTop || document.body.scrollTop
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight
      setScrollProgress(height > 0 ? (top / height) * 100 : 0)
      setShowBackTop(top > 300)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const revealTargets = document.querySelectorAll([
      '.intro-section',
      '.section-heading',
      '.gallery-card',
      '.ticket-pricing-row',
      '.faq-item',
      '.reviews-top',
      '.review-photo-cell',
      '.review-card',
      '.news-item',
      '.panel',
      '.header-card',
    ].join(','))

    if (!revealTargets.length) return undefined

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      revealTargets.forEach((el) => el.classList.add('is-visible'))
      return undefined
    }

    revealTargets.forEach((el, idx) => {
      el.classList.add('motion-reveal')
      el.style.setProperty('--reveal-delay', `${Math.min((idx % 8) * 55, 330)}ms`)
    })

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 })

    revealTargets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [view, showBooking])

  const resetAuthForm = () => { setAuthForm({ name: '', email: '', username: '', password: '' }); setAuthMessage('') }

  const openAuth = (mode) => {
    setAuthMode(mode); resetAuthForm(); setShowBooking(false); setView('auth')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const createSession = (user) => {
    const s = { userId: user.id, username: user.username, createdAt: new Date().toISOString() }
    localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    setSession(s); setView('main')
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    const name = authForm.name.trim(), username = normalize(authForm.username)
    const email = normalize(authForm.email), password = authForm.password
    if (name.length < 2) { setAuthMessage(t('fullNameRequired')); return }
    if (!/^[a-z0-9_]{3,24}$/.test(username)) { setAuthMessage(t('usernameRules')); return }
    if (!isStrictEmail(email)) { setAuthMessage(t('emailError')); return }
    if (password.length < 8) { setAuthMessage(t('passwordMin')); return }
    if (users.some((u) => u.username === username)) { setAuthMessage(t('usernameTaken')); return }
    if (users.some((u) => u.email === email)) { setAuthMessage(t('emailTaken')); return }
    const user = { id: crypto.randomUUID(), name, username, email, passwordHash: await hashPassword(password), emailVerified: false, role: 'Operator', createdAt: new Date().toISOString() }
    const next = [...users, user]; saveUsers(next); setUsers(next); createSession(user)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    const ue = normalize(authForm.username), ph = await hashPassword(authForm.password)
    const user = users.find((u) => u.username === ue || u.email === ue)
    if (!user || user.passwordHash !== ph) { setAuthMessage(t('loginIncorrect')); return }
    createSession(user)
  }

  const logout = () => { localStorage.removeItem(SESSION_KEY); setSession(null); setView('main') }

  const revealBooking = () => {
    setView('main'); setShowBooking(true); setStep('date')
    if (!selectedDate) setCalendarMonth(new Date(2025, 11, 1))
    requestAnimationFrame(() => bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const backToMain = () => { setShowBooking(false); setView('main'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const restartBooking = () => {
    setStep('date')
    setSelectedDate(null)
    setSelectedTime(null)
    setVipQty(0)
    setTimeLeft(300)
    setCalendarMonth(new Date(2025, 11, 1))
  }

  const changeCount = (id, delta) => setCounts((p) => ({ ...p, [id]: Math.max(0, p[id] + delta) }))
  const changeCalendarMonth = (delta) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  }
  const markContactTouched = (field) => setContactTouched((prev) => ({ ...prev, [field]: true }))
  const updateContact = (field, value) => {
    setContact((prev) => ({ ...prev, [field]: value }))
  }
  const applyCoupon = () => {
    const code = couponCode.trim()
    setCouponMessage(code ? t('couponUnavailable', { code }) : t('couponFirst'))
  }
  const cancelQrPayment = () => {
    if (window.confirm(t('cancelConfirm'))) {
      setShowQr(null)
    }
  }
  const submitNewsletter = () => {
    setNewsletterMessage(isStrictEmail(newsletterEmail) ? t('footerThanks') : t('footerEmailInvalid'))
  }
  const navigateToMainSection = (id) => {
    setView('main')
    setShowBooking(false)
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  const canProceedDate = Boolean(selectedDate)
  const canProceedTime = Boolean(selectedTime)
  const ticketErrors = {
    family: counts.family > 0 && counts.family < 3 ? t('familyError') : '',
    group: counts.group > 0 && counts.group < 6 ? t('groupError') : '',
  }
  const hasTicketErrors = Object.values(ticketErrors).some(Boolean)
  const canProceedTickets = totals.subtotal > 0 && !hasTicketErrors
  const canProceedContact = Object.keys(contactErrors).length === 0
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const seconds = String(timeLeft % 60).padStart(2, '0')
  const paymentExpired = step === 'payment' && timeLeft === 0
  const bookingSteps = [
    { id: 'date', label: t('date') },
    { id: 'time', label: t('time') },
    { id: 'tickets', label: t('tickets') },
    { id: 'contact', label: t('contact') },
    { id: 'payment', label: t('payment') },
  ]
  const currentStepIndex = bookingSteps.findIndex((item) => item.id === step)

  const startStripeCheckout = async () => {
    if (paymentExpired) return
    try {
      setStripeLoading(true)
      const apiBase = import.meta.env.VITE_API_BASE || ''
      const res = await fetch(`${apiBase}/api/checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: Math.max(1, counts.regular || 1), showName: 'Terracotta Warriors VR', date: selectedDate ? fullDateDisplay(selectedDate.date) : 'TBD', time: selectedTime?.time || 'TBD' }),
      })
      if (!res.ok) throw new Error('Checkout failed')
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (err) {
      console.error(err); alert(t('unableCheckout'))
    } finally { setStripeLoading(false) }
  }

  const renderLangSelect = () => (
    <div className="lang">
      <button className="lang-toggle" onClick={() => setLangOpen((v) => !v)} aria-expanded={langOpen} type="button">
        <span className="lang-icon"><span className="lang-a">A</span><span className="lang-translate">文</span></span>
        <span className="lang-down">▾</span>
      </button>
      {langOpen && (
        <div className="lang-menu">
          {languages.map((l) => (
            <button className={`lang-option ${l.code === selectedLang.code ? 'active' : ''}`} onClick={() => { setSelectedLang(l); setLangOpen(false) }} key={l.code} type="button">
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const headerCards = (
    <div className="header-cards">
      <div className={`header-card ${step === 'date' ? 'active' : ''} ${selectedDate ? 'complete' : ''}`}>
        <div className="header-icon">📅</div>
        <div className="header-meta">
          <div className="meta-label">{t('selectedDate')}</div>
          <div className="meta-value">{selectedDate ? fullDateDisplay(selectedDate.date) : t('chooseDate')}</div>
        </div>
        <button className="header-modify" onClick={() => setStep('date')} disabled={step === 'date'} type="button">
          {step === 'date' ? t('current') : t('edit')}
        </button>
      </div>
      <div className={`header-card ${step === 'time' ? 'active' : ''} ${selectedTime ? 'complete' : ''}`}>
        <div className="header-icon">🕐</div>
        <div className="header-meta">
          <div className="meta-label">{t('selectedTime')}</div>
          <div className="meta-value">{selectedTime ? selectedTime.time : t('chooseTime')}</div>
        </div>
        <button className="header-modify" onClick={() => setStep('time')} disabled={!selectedDate || step === 'time'} type="button">
          {step === 'time' ? t('current') : t('edit')}
        </button>
      </div>
    </div>
  )

  const renderDate = () => (
    <div className="panel">
      <div className="panel-title"><div className="title-accent" /><h3>{t('selectDate')}</h3></div>
      <div className="month-bar">
        <button className="nav-arrow" onClick={() => changeCalendarMonth(-1)} type="button" aria-label="Previous month">{'<'}</button>
        <div className="month-label">{monthDisplay(calendarMonth)}</div>
        <button className="nav-arrow" onClick={() => changeCalendarMonth(1)} type="button" aria-label="Next month">{'>'}</button>
      </div>
      <div className="calendar">
        {weekdayLabels.map((d) => <div className="dow" key={d}>{d}</div>)}
        {visibleDateGrid.map((d) => (
          d.blank ? (
            <span key={d.key} className="day day-blank" aria-hidden="true" />
          ) : (
            <button
              key={d.key}
              className={`day ${d.disabled ? 'disabled' : ''} ${selectedDate?.key === d.key ? 'selected' : ''} ${badge(d.level)}`}
              disabled={d.disabled}
              onClick={() => setSelectedDate(d)}
              type="button"
              aria-pressed={selectedDate?.key === d.key}
              aria-label={d.price ? `${fullDateDisplay(d.date)}, ${currency(d.price)}` : `${fullDateDisplay(d.date)} ${t('unavailable')}`}
            >
              <span className="day-number">{d.day}</span>
              <span className="day-price">{d.price ? currency(d.price) : '-'}</span>
            </button>
          )
        ))}
      </div>
      <div className="actions"><button className="primary" disabled={!canProceedDate} onClick={() => setStep('time')} type="button">{t('next')}</button></div>
    </div>
  )

  const renderTime = () => (
    <div className="panel">
      <div className="panel-title"><div className="title-accent" /><h3>{t('selectTime')}</h3></div>
      <div className="time-hint">{t('timeHint')}</div>
      <div className="slot-grid">
        {timeSlots.map((slot) => (
          <button key={slot.time} className={`slot ${selectedTime?.time === slot.time ? 'selected' : ''} ${slot.price > 40 ? 'peak' : ''}`} onClick={() => setSelectedTime(slot)} type="button">
            <span className="slot-time">{slot.time}</span>
            <span className="slot-price">{currency(slot.price)}</span>
          </button>
        ))}
      </div>
      <div className="actions">
        <button className="secondary" onClick={() => setStep('date')} type="button">{t('back')}</button>
        <button className="primary" disabled={!canProceedTime} onClick={() => setStep('tickets')} type="button">{t('next')}</button>
      </div>
    </div>
  )

  const renderTickets = () => (
    <div className="panel">
      <div className="panel-title"><div className="title-accent" /><h3>{t('selectTickets')}</h3></div>
      <div className="ticket-list">
        {localizedTicketTypes.map((ticket) => (
          <div key={ticket.id} className={`ticket-row ${ticketErrors[ticket.id] ? 'ticket-row-error' : ''}`}>
            <div className="ticket-info">
              <div className="ticket-title-row">
                <div className="ticket-title">{ticket.label}</div>
                {ticket.info && (
                  <span className="ticket-info-popover">
                    <button className="ticket-info-badge" type="button" aria-label={`${ticket.label} information`}>i</button>
                    <span className="ticket-info-tooltip" role="tooltip">{ticket.info}</span>
                  </span>
                )}
              </div>
              <div className="ticket-desc">{ticket.description}</div>
              {ticketErrors[ticket.id] && <div className="ticket-error">{ticketErrors[ticket.id]}</div>}
            </div>
            <div className="ticket-actions">
              <div className="counter">
                <button onClick={() => changeCount(ticket.id, -1)} disabled={counts[ticket.id] === 0} type="button">-</button>
                <div className="counter-value">{counts[ticket.id]}</div>
                <button onClick={() => changeCount(ticket.id, 1)} type="button">+</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="summary-row"><div>{t('totalAmount')}</div><div className="summary-val">{currency(totals.ticketTotal)}</div></div>
      <div className="actions">
        <button className="secondary" onClick={() => setStep('time')} type="button">{t('back')}</button>
        <button className="primary" disabled={!canProceedTickets} onClick={() => setVipModal(true)} type="button">{t('next')}</button>
      </div>
    </div>
  )

  const renderContact = () => (
    <div className="panel">
      <div className="panel-title"><div className="title-accent" /><h3>{t('contactDetails')}</h3></div>
      <div className="form-grid">
        <label className={contactTouched.first && contactErrors.first ? 'field-invalid' : ''}>
          <span>{t('firstName')}</span>
          <input type="text" placeholder={t('firstNamePlaceholder')} value={contact.first} onBlur={() => markContactTouched('first')} onChange={(e) => updateContact('first', e.target.value)} autoComplete="given-name" />
          {contactTouched.first && contactErrors.first && <small className="field-error">{contactErrors.first}</small>}
        </label>
        <label className={contactTouched.last && contactErrors.last ? 'field-invalid' : ''}>
          <span>{t('lastName')}</span>
          <input type="text" placeholder={t('lastNamePlaceholder')} value={contact.last} onBlur={() => markContactTouched('last')} onChange={(e) => updateContact('last', e.target.value)} autoComplete="family-name" />
          {contactTouched.last && contactErrors.last && <small className="field-error">{contactErrors.last}</small>}
        </label>
        <label className={contactTouched.email && contactErrors.email ? 'field-invalid' : ''}>
          <span>{t('email')}</span>
          <input type="email" placeholder={t('emailPlaceholder')} value={contact.email} onBlur={() => markContactTouched('email')} onChange={(e) => updateContact('email', e.target.value)} autoComplete="email" />
          {contactTouched.email && contactErrors.email ? <small className="field-error">{contactErrors.email}</small> : <small>{t('ticketsSent')}</small>}
        </label>
        <label className={contactTouched.phone && contactErrors.phone ? 'field-invalid' : ''}>
          <span>{t('phoneOptional')}</span>
          <input type="tel" placeholder={t('phonePlaceholder')} value={contact.phone} onBlur={() => markContactTouched('phone')} onChange={(e) => updateContact('phone', e.target.value)} autoComplete="tel" />
          {contactTouched.phone && contactErrors.phone && <small className="field-error">{contactErrors.phone}</small>}
        </label>
        <label className="checkbox"><input type="checkbox" checked={contact.optIn} onChange={(e) => setContact({ ...contact, optIn: e.target.checked })} /><span>{t('optIn')}</span></label>
      </div>
      <p className="policy-copy">{t('policyCopy')}</p>
      <div className="actions">
        <button className="secondary" onClick={() => setStep('tickets')} type="button">{t('back')}</button>
        <button className="primary" disabled={!canProceedContact} onClick={() => setStep('payment')} type="button">{t('continuePayment')}</button>
      </div>
    </div>
  )

  const renderPayment = () => (
    <div className="panel payment-panel">
      {paymentExpired ? (
        <div className="payment-expired-card">
          <div className="payment-expired-message"><span aria-hidden="true">⚠️</span><p>{t('expired')}</p></div>
          <button className="payment-start-over" onClick={restartBooking} type="button">{t('startOver')}</button>
        </div>
      ) : (
        <>
          <div className="timer-banner">{t('completeWithin')} <strong>{minutes}:{seconds}</strong> {t('secureReservation')}</div>
          <div className="panel-title"><div className="title-accent" /><h3>{t('orderSummary')}</h3></div>
          <div className="order-block">
            <div className="order-date"><div className="order-label">{selectedDate ? fullDateDisplay(selectedDate.date) : t('dateTbd')} · {selectedTime?.time}</div><div className="order-sub">{t('duration')}</div></div>
            <div className="line-items">
              {ticketTypes.map((t) => counts[t.id] > 0 && (
                <div key={t.id} className="line"><div><div className="line-label">{localizedTicketTypes.find((item) => item.id === t.id)?.label ?? t.label}</div><div className="line-price">{currency(t.price)}</div></div><div className="line-qty">×{counts[t.id]}</div></div>
              ))}
              {vipQty > 0 && <div className="line"><div><div className="line-label">{t('vipTitle')}</div><div className="line-price">{t('vipPrice')}</div></div><div className="line-qty">×{vipQty}</div></div>}
            </div>
            <div className="totals">
              <div className="totals-row"><span>{t('subtotal')}</span><span>{currency(totals.subtotal)}</span></div>
              <div className="totals-row"><span>{t('feesTaxes')}</span><span>{currency(totals.fees)}</span></div>
              <div className="totals-row due"><span>{t('totalDue')}</span><span>{currency(totals.grand)}</span></div>
            </div>
            <div className="warning">{t('warningNonRefund')}</div>
          </div>
          <div className="coupon-row">
            <input type="text" placeholder={t('couponCode')} value={couponCode} onChange={(e) => { setCouponCode(e.target.value); setCouponMessage('') }} />
            <button className="coupon-btn" onClick={applyCoupon} type="button">{t('apply')}</button>
          </div>
          {couponMessage && <div className="coupon-message">{couponMessage}</div>}
          <div className="contact-summary">
            <div className="contact-head"><div>{t('contactDetailsLower')}</div><button className="link-btn" onClick={() => setStep('contact')} type="button">{t('edit')}</button></div>
            <div className="contact-cols">
              <div><div className="label">{t('firstName')}</div><div className="value">{contact.first || '—'}</div></div>
              <div><div className="label">{t('lastName')}</div><div className="value">{contact.last || '—'}</div></div>
              <div><div className="label">{t('email')}</div><div className="value">{contact.email || '—'}</div></div>
              <div><div className="label">{t('phoneOptional')}</div><div className="value">{contact.phone || '—'}</div></div>
            </div>
          </div>
          <div className="pay-options">
            <button className="pay-btn stripe" onClick={startStripeCheckout} disabled={stripeLoading || paymentExpired} type="button">
              <span className="pay-icon stripe-word">stripe</span>
              <span>{stripeLoading ? t('processingPayment') : t('creditCard')}</span>
            </button>
            <button className="pay-btn wechat" onClick={() => setShowQr('wechat')} disabled={paymentExpired} type="button">
              <span className="pay-icon wechat-icon" aria-hidden="true">
                <svg viewBox="0 0 32 32"><path d="M13.2 7.2C6.9 7.2 2 11.1 2 16.1c0 2.8 1.6 5.2 4 6.8l-.8 3 3.5-1.7c1.3.5 2.8.8 4.5.8.8 0 1.6-.1 2.4-.2-.4-1-.6-2-.6-3.1 0-4.4 4.2-8 9.6-8.5-1.5-3.5-5.9-6-11.4-6z"/><path d="M25 15.1c-4.2 0-7.6 2.8-7.6 6.3s3.4 6.3 7.6 6.3c1 0 2-.2 2.9-.5l2.5 1.2-.6-2.1c1.4-1.1 2.2-2.8 2.2-4.8 0-3.6-3.4-6.4-7-6.4z"/></svg>
              </span>
              <span>WeChat Pay</span>
            </button>
            <button className="pay-btn alipay" onClick={() => setShowQr('alipay')} disabled={paymentExpired} type="button">
              <span className="pay-icon alipay-icon" aria-hidden="true">支</span>
              <span>Alipay</span>
            </button>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className={`page lang-${selectedLang.code}`}>
      <div className="progress-bar" style={{ width: `${scrollProgress}%` }} />

      {/* ── Topbar (booking flow only) ── */}
      {showBooking && view !== 'auth' && (
        <header className="topbar">
          <button className="booking-top-main" onClick={backToMain} type="button" aria-label="Return to main page">
            <span className="booking-close-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </span>
            <span>{t('mainPage')}</span>
          </button>
          <div className="top-actions">
            {currentUser ? (
              <><span className="auth-welcome">{t('hi')} {currentUser.name}</span><button className="ghost-btn" onClick={logout} type="button">{t('logout')}</button></>
            ) : (
              <button className="ghost-btn" onClick={() => openAuth('login')} type="button">{t('loginSignup')}</button>
            )}
            {renderLangSelect()}
            <button className="menu-dots-btn" onClick={() => setShowNavMenu(true)} type="button" aria-label="Navigation menu">
              <span /><span /><span /><span /><span /><span /><span /><span /><span />
            </button>
          </div>
        </header>
      )}

      {/* ── Auth ── */}
      {view === 'auth' && (
        <div className="auth-page">
          <button className="auth-close-btn" onClick={() => setView('main')} type="button" aria-label="Close account screen">
            <span aria-hidden="true">×</span>
          </button>
          <div className="auth-inner">
            <section className="auth-left">
              <p className="auth-eyebrow">{t('authEyebrow')}</p>
              <h2>{t('authTitle')}</h2>
              <p>{t('authCopy')}</p>
            </section>
            <section className="auth-card">
              <div className="auth-tabs">
                <button className={`auth-tab ${authMode === 'login' ? 'active' : ''}`} onClick={() => { setAuthMode('login'); resetAuthForm() }} type="button">{t('login')}</button>
                <button className={`auth-tab ${authMode === 'signup' ? 'active' : ''}`} onClick={() => { setAuthMode('signup'); resetAuthForm() }} type="button">{t('signup')}</button>
              </div>
              <h3>{authMode === 'login' ? t('welcomeBack') : t('createAccount')}</h3>
              <form className="auth-form" onSubmit={authMode === 'login' ? handleLogin : handleSignup}>
                {authMode === 'signup' && (
                  <>
                    <AuthField label={t('fullName')} value={authForm.name} onChange={(v) => setAuthForm({ ...authForm, name: v })} placeholder="Jane Smith" autoComplete="name" />
                    <AuthField label={t('emailAddress')} value={authForm.email} onChange={(v) => setAuthForm({ ...authForm, email: v })} placeholder="name@example.com" type="email" autoComplete="email" />
                  </>
                )}
                <AuthField label={authMode === 'login' ? t('usernameEmail') : t('username')} value={authForm.username} onChange={(v) => setAuthForm({ ...authForm, username: v })} placeholder={authMode === 'login' ? 'username or email' : 'jane_smith'} autoComplete="username" helper={authMode === 'signup' ? t('usernameHelper') : t('usernameEmailHelper')} />
                <AuthField label={t('password')} value={authForm.password} onChange={(v) => setAuthForm({ ...authForm, password: v })} placeholder={t('passwordPlaceholder')} type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} helper={authMode === 'signup' ? t('passwordHelper') : undefined} />
                {authMessage && <div className="auth-error">{authMessage}</div>}
                <button className="auth-submit" type="submit">{authMode === 'login' ? t('login') : t('signup')}</button>
              </form>
            </section>
          </div>
        </div>
      )}

      {/* ── Main ── */}
      {view !== 'auth' && (
        <>
          {!showBooking && (
            <div className="marketing">

              {/* Hero */}
              <section className="hero-rich" style={{ backgroundImage: `url(${heroImg})` }}>
                {/* Floating header overlaid on hero */}
                <div className="hero-header">
                  <button className="brand-button" onClick={() => { setView('main'); setShowBooking(false) }} type="button">
                    <BrandLogo height={68} />
                  </button>
                  <div className="top-actions">
                    {currentUser ? (
                      <><span className="auth-welcome">{t('hi')} {currentUser.name}</span><button className="ghost-btn" onClick={logout} type="button">{t('logout')}</button></>
                    ) : (
                      <button className="ghost-btn" onClick={() => openAuth('login')} type="button">{t('loginSignup')}</button>
                    )}
                    {renderLangSelect()}
                    <button className="menu-dots-btn" onClick={() => setShowNavMenu(true)} type="button" aria-label="Navigation menu">
                      <span /><span /><span /><span /><span /><span /><span /><span /><span />
                    </button>
                  </div>
                </div>
                <div className="hero-overlay" />
                <div className="hero-inner">
                  <p className="hero-kicker">{t('heroKicker')}</p>
                  <h1>{t('heroTitle')}</h1>
                  <div className="hero-btns">
                    <button className="hero-buy-btn" onClick={revealBooking} type="button">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="7" width="22" height="10" rx="2"/><path d="M17 7V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2"/><path d="M17 17v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2"/></svg>
                      {t('buyTicket')}
                    </button>
                  </div>
                  <div className="hero-meta-row">
                    <div className="hero-pill">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      <div><div><strong>{t('sundayThursday')}</strong> ··· 10AM – 9PM</div><div><strong>{t('fridaySaturday')}</strong> ··· 10AM – 10PM</div></div>
                    </div>
                    <div className="hero-pill">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                      <div><div><strong>{t('venueLine')}</strong></div><div>{t('nearNorth')}</div></div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Introduction */}
              <section className="intro-section" id="intro">
                <div className="intro-media">
                  <video controls poster={galleryImg1} className="intro-video"><source src={introVideo} type="video/mp4" /></video>
                </div>
                <div className="intro-text">
                  <h2>{t('introTitle')}</h2>
                  <p>{t('introP1')}</p>
                  <p>{t('introP2')}</p>
                </div>
              </section>

              {/* Gallery */}
              <section className="gallery-section" id="gallery">
                <div className="section-heading">
                  <div className="section-eyebrow">{t('galleryEyebrow')}</div>
                  <h2>{t('gallery')}</h2>
                </div>
                <div className="gallery-grid">
                  {galleryImages.map((src, idx) => (
                    <div key={idx} className="gallery-card" style={{ backgroundImage: `url(${src})` }} />
                  ))}
                </div>
              </section>

              {/* Tickets */}
              <section className="tickets-section" id="tickets">
                <div className="section-heading light">
                  <div className="section-eyebrow">{t('reserveSpot')}</div>
                  <h2>{t('tickets')}</h2>
                </div>
                <div className="ticket-pricing-list">
                  {localizedTicketPricing.map((priceItem) => (
                    <div key={priceItem.label} className="ticket-pricing-row">
                      <div className="ticket-pricing-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="7" width="22" height="10" rx="2"/><path d="M17 7V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2"/><path d="M17 17v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2"/></svg>
                      </div>
                      <div className="ticket-pricing-info">
                        <div className="ticket-pricing-name">{priceItem.label}</div>
                        <div className="ticket-pricing-desc">{priceItem.desc}</div>
                      </div>
                      <div className="ticket-pricing-price">{priceItem.price}</div>
                      <button className="ticket-section-buy-btn" onClick={revealBooking} type="button">{t('buyTicket')}</button>
                    </div>
                  ))}
                </div>
              </section>

              {/* FAQ */}
              <section className="faq-section" id="faq">
                <div className="section-heading light">
                  <div className="section-eyebrow">{t('faqEyebrow')}</div>
                  <h2>{t('faqTitle')}</h2>
                </div>
                <div className="faq-list">
                  {localizedFaqItems.map((item, idx) => (
                    <div key={idx} className={`faq-item ${faqOpen === idx ? 'open' : ''}`}>
                      <button className="faq-q" onClick={() => setFaqOpen(faqOpen === idx ? null : idx)} type="button">
                        <span className="faq-toggle">{faqOpen === idx ? '−' : '+'}</span>
                        {item.q}
                      </button>
                      {faqOpen === idx && <div className="faq-a">{item.a}</div>}
                    </div>
                  ))}
                </div>
              </section>

              {/* Reviews */}
              <section className="reviews-section">
                <div className="reviews-top">
                  <div className="quote-badge">&ldquo;</div>
                  <div className="review-stats-row">
                    <span className="stat-badge">{t('reviewsViews')}</span>
                    <span className="stat-badge">{t('reviewsSatisfied')}</span>
                    <span className="stat-badge">{t('reviewsLocations')}</span>
                  </div>
                </div>
                <div className="reviews-grid">
                  <div className="review-photo-cell" style={{ backgroundImage: `url(${commentFeatureImg})` }} />
                  <div className="review-card rust-card">
                    <p className="review-quote">&ldquo;{localizedTestimonials[0].quote}&rdquo;</p>
                    <div className="reviewer">
                      <img src={localizedTestimonials[0].img} alt={localizedTestimonials[0].name} className="reviewer-img" />
                      <div><div className="reviewer-name">{localizedTestimonials[0].name}</div><div className="reviewer-stars">{'★'.repeat(localizedTestimonials[0].rating)} {localizedTestimonials[0].rating} / 5</div></div>
                    </div>
                  </div>
                  <div className="review-card dark-card">
                    <p className="review-quote">&ldquo;{localizedTestimonials[1].quote}&rdquo;</p>
                    <div className="reviewer">
                      <img src={localizedTestimonials[1].img} alt={localizedTestimonials[1].name} className="reviewer-img" />
                      <div><div className="reviewer-name">{localizedTestimonials[1].name}</div><div className="reviewer-stars">{'★'.repeat(localizedTestimonials[1].rating)} {localizedTestimonials[1].rating} / 5</div></div>
                    </div>
                  </div>
                  <div className="review-photo-cell" style={{ backgroundImage: `url(${commentFeatureImg})` }} />
                </div>
              </section>

              {/* News */}
              <section className="news-section">
                <div className="section-heading">
                  <div className="section-eyebrow">{t('newsEyebrow')}</div>
                  <h2>{t('newsTitle')}</h2>
                </div>
                <div className="news-list">
                  {localizedNewsItems.map((n) => (
                    <div key={n.title} className="news-item">
                      <a href={n.link} target="_blank" rel="noreferrer" className="news-title-link"><h4>{n.title}</h4></a>
                      <p>{n.body}</p>
                      <a href={n.link} target="_blank" rel="noreferrer" className="news-read-more">{t('readMore')}</a>
                    </div>
                  ))}
                </div>
              </section>

              {/* Footer */}
              <footer className="site-footer" id="contact">
                <div className="footer-inner">
                  <div className="footer-col footer-brand-col">
                    <div className="footer-logo-group">
                      <BrandLogo height={68} />
                    </div>
                    <div className="footer-socials">
                      <a href="https://www.facebook.com/people/We-Are-VR/61582764116105/#" target="_blank" rel="noreferrer" className="social-link" aria-label="Facebook" data-label="Facebook"><i className="fab fa-facebook-f" /></a>
                      <a href="https://www.instagram.com/we.are.vr.show" target="_blank" rel="noreferrer" className="social-link" aria-label="Instagram" data-label="Instagram"><i className="fab fa-instagram" /></a>
                      <a href="https://www.xiaohongshu.com/user/profile/64c1c5cf000000001403454a" target="_blank" rel="noreferrer" className="social-link social-link-text" aria-label="Xiaohongshu" data-label="Xiaohongshu">小红书</a>
                      <a href="https://www.tiktok.com/@we.are.vr3" target="_blank" rel="noreferrer" className="social-link" aria-label="TikTok" data-label="TikTok"><i className="fab fa-tiktok" /></a>
                      <a href="mailto:info@vrvr.show" className="social-link" aria-label="Email" data-label="Email"><i className="far fa-envelope" /></a>
                    </div>
                    <div className="footer-newsletter">
                      <div className="footer-newsletter-label">{t('footerSubscribe')}</div>
                      <div className="footer-newsletter-row">
                        <input type="email" placeholder={t('emailHere')} value={newsletterEmail} onChange={(e) => { setNewsletterEmail(e.target.value); setNewsletterMessage('') }} className="footer-email-input" />
                        <button className="footer-signup-btn" onClick={submitNewsletter} type="button">{t('signUpCaps')}</button>
                      </div>
                      {newsletterMessage && <div className="footer-newsletter-message">{newsletterMessage}</div>}
                    </div>
                  </div>

                  <div className="footer-col">
                    <h4 className="footer-col-title">{t('reachLocation')}</h4>
                    <div className="footer-location-name">Lansdowne Centre</div>
                    <a href={GOOGLE_MAPS_URL} target="_blank" rel="noreferrer" className="footer-location-addr-link">
                      Unit 210-5300 Number 3 Rd, Richmond, BC
                    </a>
                    <button className="footer-map-link" onClick={() => setShowMapModal(true)} type="button">{t('viewMap')}</button>
                    <button className="footer-map-link highlight" onClick={() => window.open(mapInstructionPdf, '_blank')} type="button">
                      {t('detailedLocation')}
                    </button>
                  </div>

                  <div className="footer-col">
                    <h4 className="footer-col-title">{t('openingHours')}</h4>
                    <div className="footer-hours-row"><span className="footer-hours-day">{t('sundayThursday')} ···</span><span className="footer-hours-time">10AM – 9PM</span></div>
                    <div className="footer-hours-row"><span className="footer-hours-day">{t('fridaySaturday')} ···</span><span className="footer-hours-time">10AM – 10PM</span></div>
                    <h4 className="footer-col-title" style={{ marginTop: '28px' }}>{t('contactUs')}</h4>
                    <div className="footer-contact-row">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      info@vrvr.show
                    </div>
                    <div className="footer-contact-row">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.36a16 16 0 0 0 6.13 6.13l.951-.951a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      (778) 805-4699
                    </div>
                  </div>
                </div>
                <div className="footer-copy">© {new Date().getFullYear()} We Are VR · Lansdowne Centre, Richmond BC</div>
              </footer>
            </div>
          )}

          {/* Booking flow */}
          {showBooking && (
            <div className="content" ref={bookingRef} id="booking">
              <div className="booking-hero">
                <div>
                  <p className="booking-eyebrow">{t('secureCheckout')}</p>
                  <h2>{t('reserveVisit')}</h2>
                </div>
                <div className="booking-stepper" aria-label="Booking progress">
                  {bookingSteps.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`booking-step ${idx === currentStepIndex ? 'active' : ''} ${idx < currentStepIndex ? 'done' : ''}`}
                    >
                      <span className="booking-step-dot">{idx + 1}</span>
                      <span className="booking-step-label">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {headerCards}
              {step === 'date' && renderDate()}
              {step === 'time' && renderTime()}
              {step === 'tickets' && renderTickets()}
              {step === 'contact' && renderContact()}
              {step === 'payment' && renderPayment()}
            </div>
          )}
        </>
      )}

      {/* ── Modals ── */}
      {vipModal && (
        <div className="overlay" onClick={() => setVipModal(false)}>
          <div className="vip-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vip-card">
              <div className="vip-card-glow" />
              <div className="vip-head">
                <div className="vip-icon">♛</div>
                <div>
                  <div className="vip-eyebrow">{t('vipEyebrow')}</div>
                  <div className="vip-title">{t('vipTitle')}</div>
                  <div className="vip-price">{t('vipPrice')}</div>
                </div>
              </div>
              <div className="vip-benefits">
                <div className="vip-benefit">
                  <span className="vip-check">✓</span>
                  <strong>{t('exclusiveTour')}</strong>
                </div>
                <div className="vip-benefit">
                  <span className="vip-check">✓</span>
                  <strong>{t('priorityEntry')}</strong>
                </div>
                <div className="vip-benefit">
                  <span className="vip-check">✓</span>
                  <strong>{t('souvenir')}</strong>
                </div>
              </div>
            </div>
            <div className="vip-quantity-row">
              <div className="ticket-info"><div className="ticket-title">{t('vipAddon')}</div><div className="ticket-desc">{t('vipDesc')}</div></div>
              <div className="ticket-actions">
                <div className="counter">
                  <button onClick={() => setVipQty((v) => Math.max(0, v - 1))} type="button">-</button>
                  <div className="counter-value">{vipQty}</div>
                  <button onClick={() => setVipQty((v) => v + 1)} type="button">+</button>
                </div>
              </div>
            </div>
            <div className="actions stacked">
              <button className="secondary" onClick={() => { setVipModal(false); setStep('contact') }} type="button">{t('skip')}</button>
              <button className="primary" onClick={() => { setVipModal(false); setStep('contact') }} type="button">{t('confirmUpgrade')}</button>
            </div>
          </div>
        </div>
      )}

      {showQr && (
        <div className="overlay qr-overlay">
          <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
            <h4>{t('paymentQrTitle')}</h4>
            <p className="qr-subtitle">{t('qrScan', { method: showQr === 'wechat' ? 'WeChat' : 'Alipay' })}</p>
            <div className="qr-warning">{t('qrWarning')}</div>
            <div className="qr-code-frame">
              <img src={qrPlaceholder} alt={`${showQr === 'wechat' ? 'WeChat Pay' : 'Alipay'} QR code`} />
            </div>
            <button className="qr-cancel-btn" onClick={cancelQrPayment} type="button">{t('cancelPayment')}</button>
          </div>
        </div>
      )}

      {showMapModal && <MapModal onClose={() => setShowMapModal(false)} />}
      {showNavMenu && <NavMenu onClose={() => setShowNavMenu(false)} onBuyTicket={revealBooking} onNavigateToSection={navigateToMainSection} t={t} />}

      {view === 'main' && !showBooking && (
        <div className="floating-cta">
          <button className="cta-pill" onClick={revealBooking} type="button">{t('buyTicket')}</button>
        </div>
      )}

      {showBackTop && (
        <button className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top" type="button">↑</button>
      )}
    </div>
  )
}

function AuthField({ helper, label, onChange, type = 'text', value, ...props }) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      <input className="auth-input" onChange={(e) => onChange(e.target.value)} type={type} value={value} {...props} />
      {helper && <span className="auth-helper">{helper}</span>}
    </label>
  )
}

export default App
