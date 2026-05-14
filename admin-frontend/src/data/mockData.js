export const EVENTS = [
  { id: 1, name: 'Terracotta Warriors: Secrets of the First Emperor\'s Mausoleum' },
]

export const TICKET_TYPES_DATA = [
  { id: 1, name: 'Early Bird', event: 1, discount: null, priceType: 'fixed', price: 24.95, weekdays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], validFrom: '2025-11-17', validTo: '2025-12-19', timeStart: null, timeEnd: null, addOn: null, remarks: '早鸟-11月29-12月19', status: 'disabled' },
  { id: 2, name: 'Early Bird', event: 1, discount: null, priceType: 'fixed', price: 24.95, weekdays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], validFrom: '2026-01-02', validTo: '2026-02-28', timeStart: null, timeEnd: null, addOn: null, remarks: '早鸟-1月2日-2月28日', status: 'disabled' },
  { id: 3, name: 'Regular', event: 1, discount: { type: 'percent', value: 10, expired: true }, priceType: 'daily', price: null, weekdays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], validFrom: null, validTo: null, timeStart: null, timeEnd: null, addOn: null, remarks: '常规(1-4)', status: 'enabled' },
  { id: 4, name: 'Child (7-15)', event: 1, discount: { type: 'percent', value: 10, expired: true }, priceType: 'daily', priceAdj: -10, weekdays: ['Mon','Tue','Wed','Thu'], validFrom: null, validTo: null, timeStart: '10:00', timeEnd: '15:00', addOn: null, remarks: '儿童(1-4)', status: 'enabled' },
  { id: 5, name: 'Child (7-15)', event: 1, discount: { type: 'percent', value: 10, expired: true }, priceType: 'daily', priceAdj: -10, weekdays: ['Mon','Tue','Wed','Thu'], validFrom: null, validTo: null, timeStart: '15:00', timeEnd: '19:00', addOn: null, remarks: '儿童(1-4)', status: 'enabled' },
  { id: 6, name: 'Child (7-15)', event: 1, discount: { type: 'percent', value: 10, expired: true }, priceType: 'daily', priceAdj: -10, weekdays: ['Mon','Tue','Wed','Thu'], validFrom: null, validTo: null, timeStart: '19:00', timeEnd: '22:00', addOn: null, remarks: '儿童(1-4)', status: 'enabled' },
  { id: 7, name: 'Child (7-15)', event: 1, discount: { type: 'percent', value: 10, expired: true }, priceType: 'daily', priceAdj: -10, weekdays: ['Fri'], validFrom: null, validTo: null, timeStart: '00:00', timeEnd: '14:00', addOn: null, remarks: '儿童(5)', status: 'enabled' },
  { id: 8, name: 'Senior (65+)', event: 1, discount: null, priceType: 'daily', priceAdj: -5, weekdays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], validFrom: null, validTo: null, timeStart: null, timeEnd: null, addOn: null, remarks: '老年(1-4)', status: 'enabled' },
  { id: 9, name: 'Family Bundle (max. 2 adults)', event: 1, discount: null, priceType: 'fixed', price: 149.95, weekdays: ['Sat','Sun'], validFrom: null, validTo: null, timeStart: null, timeEnd: null, addOn: null, remarks: '家庭套餐', status: 'enabled' },
  { id: 10, name: 'Group Ticket (min. 6 people)', event: 1, discount: null, priceType: 'daily', priceAdj: -8, weekdays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], validFrom: null, validTo: null, timeStart: null, timeEnd: null, addOn: null, remarks: '团体票', status: 'enabled' },
  { id: 11, name: 'VIP', event: 1, discount: null, priceType: 'fixed', price: 79.95, weekdays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], validFrom: null, validTo: null, timeStart: null, timeEnd: null, addOn: 'VIP Lounge', remarks: 'VIP体验', status: 'enabled' },
]

export const SLOTS_DATA = (() => {
  const slots = []
  const times = ['10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00']
  const dates = ['2026-05-13','2026-05-14','2026-05-15','2026-05-16','2026-05-19','2026-05-23','2026-05-27','2026-05-30']
  let id = 3616
  dates.forEach(date => {
    times.forEach(startTime => {
      const [h, m] = startTime.split(':').map(Number)
      const endH = h + Math.floor((m + 45) / 60)
      const endM = (m + 45) % 60
      const endTime = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`
      const inStore = date === '2026-05-13' && startTime === '11:30' ? 2
        : date === '2026-05-13' && startTime === '14:00' ? 1
        : date === '2026-05-13' && startTime === '18:30' ? 12
        : date === '2026-05-13' && startTime === '19:00' ? 2
        : 0
      const website = 0
      slots.push({ id: id++, event: 1, date, startTime, endTime, price: 37.95, totalSeats: 20, websiteSeats: website, inStoreSeats: inStore, status: 'active' })
    })
  })
  return slots
})()

export const COUPONS_DATA = [
  { id: 1, code: 'PAC-UHILL2026 (10)', source: 'manual', usedCount: 0, maxUses: null, totalAmount: 0, discountType: 'percent', discountValue: 10, minPurchase: 0, validFrom: null, validTo: null, remarks: null, status: 'active', createdAt: '2026-03-29 22:22:21' },
  { id: 2, code: 'PAC-UHILL2026 (5)', source: 'manual', usedCount: 0, maxUses: null, totalAmount: 0, discountType: 'percent', discountValue: 5, minPurchase: 0, validFrom: null, validTo: null, remarks: null, status: 'active', createdAt: '2026-03-29 22:21:52' },
  { id: 3, code: 'ANGIE10', source: 'manual', usedCount: 1, maxUses: null, totalAmount: 7.59, discountType: 'percent', discountValue: 10, minPurchase: 0, validFrom: null, validTo: null, remarks: null, status: 'active', createdAt: '2026-03-27 10:06:08' },
  { id: 4, code: 'SANQIN10', source: 'manual', usedCount: 0, maxUses: null, totalAmount: 0, discountType: 'percent', discountValue: 10, minPurchase: 0, validFrom: null, validTo: '2026-04-30', remarks: null, status: 'expired', createdAt: '2026-03-21 21:58:15' },
  { id: 5, code: 'ACOAC10', source: 'manual', usedCount: 0, maxUses: null, totalAmount: 0, discountType: 'percent', discountValue: 10, minPurchase: 0, validFrom: null, validTo: null, remarks: null, status: 'active', createdAt: '2026-03-21 12:34:19' },
  { id: 6, code: 'LELE10', source: 'manual', usedCount: 0, maxUses: null, totalAmount: 0, discountType: 'percent', discountValue: 10, minPurchase: 0, validFrom: null, validTo: null, remarks: null, status: 'active', createdAt: '2026-03-20 13:08:50' },
  { id: 7, code: 'VICTOR10', source: 'manual', usedCount: 1, maxUses: null, totalAmount: 9.39, discountType: 'percent', discountValue: 10, minPurchase: 0, validFrom: null, validTo: null, remarks: null, status: 'active', createdAt: '2026-03-19 15:10:29' },
  { id: 8, code: 'PACK10', source: 'manual', usedCount: 2, maxUses: null, totalAmount: 18.20, discountType: 'percent', discountValue: 10, minPurchase: 0, validFrom: null, validTo: '2026-04-01', remarks: null, status: 'expired', createdAt: '2026-03-19 09:15:00' },
  { id: 9, code: 'SUMMER5', source: 'marketing', usedCount: 1, maxUses: 9999, totalAmount: 5.00, discountType: 'percent', discountValue: 5, minPurchase: 0, validFrom: '2026-05-01', validTo: '2026-08-31', remarks: 'Summer promotion', status: 'active', createdAt: '2026-05-01 08:00:00' },
  { id: 10, code: 'WELCOME10', source: 'marketing', usedCount: 3, maxUses: 9999, totalAmount: 29.00, discountType: 'percent', discountValue: 10, minPurchase: 0, validFrom: '2026-01-01', validTo: null, remarks: 'New customer welcome', status: 'active', createdAt: '2026-01-01 00:00:00' },
]

export const ORDERS_DATA = [
  {
    id: '202605131648', user: { name: 'Dalton', email: 'dalton.vandernest@gmail.com', phone: null },
    emailStatus: 'not_sent', slot: { date: '2026-05-13', startTime: '14:00', endTime: '14:45' },
    ticketCount: { total: 1, completed: 1, notUsed: 0 }, amount: 43.30, couponCode: null, couponDiscount: 0,
    remarks: 'Walkin', status: 'completed', paymentMethod: 'Instore Credit',
    createdAt: '2026-05-13 14:13:56', createdBy: 'Sunnie (Admin#5)', ip: '2001:569:7b8a:4e00:cc74:64:ed93:7cd0'
  },
  {
    id: '202605131647', user: { name: 'Lily', email: null, phone: null },
    emailStatus: 'not_sent', slot: { date: '2026-05-13', startTime: '11:30', endTime: '12:15' },
    ticketCount: { total: 2, completed: 2, notUsed: 0 }, amount: 83.04, couponCode: null, couponDiscount: 0,
    remarks: 'No remarks', status: 'completed', paymentMethod: 'Instore Credit',
    createdAt: '2026-05-13 11:39:11', createdBy: 'Victor (Admin#6)', ip: '123.168.48.78'
  },
  {
    id: '202605131646', user: { name: 'TINA GUO', email: 'youme20169@gmail.com', phone: null },
    emailStatus: 'sent', slot: { date: '2026-05-13', startTime: '19:00', endTime: '19:45' },
    ticketCount: { total: 2, completed: 1, notUsed: 1 }, amount: 59.98, couponCode: null, couponDiscount: 0,
    remarks: null, status: 'paid', paymentMethod: 'EMT',
    createdAt: '2026-05-13 08:59:14', createdBy: 'franklee123 (Admin#3)', ip: '2001:569:70a4:3a00:f9f0:2072:abe4:4699'
  },
  {
    id: '202605131645', user: { name: 'TINA Guo', email: 'youme20169@gmail.com', phone: null },
    emailStatus: 'not_sent', slot: { date: '2026-05-13', startTime: '18:30', endTime: '19:15' },
    ticketCount: { total: 20, completed: 20, notUsed: 0 }, amount: 600.00, couponCode: null, couponDiscount: -107.57,
    remarks: null, status: 'completed', paymentMethod: 'EMT',
    createdAt: '2026-05-13 08:57:56', createdBy: 'franklee123 (Admin#3)', ip: '2001:569:70a4:3a00:f9f0:2072:abe4:4699'
  },
  {
    id: '202605061620', user: { name: 'AIMING XU', email: '1621483796@QQ.COM', phone: null },
    emailStatus: 'sent', slot: { date: '2026-05-14', startTime: '14:00', endTime: '14:45' },
    ticketCount: { total: 2, completed: 0, notUsed: 2 }, amount: 61.75, couponCode: 'VICTOR10', couponDiscount: -7.09,
    remarks: 'WALKIN', status: 'paid', paymentMethod: 'Instore Credit',
    createdAt: '2026-05-06 16:00:12', createdBy: 'franklee123 (Admin#3)', ip: '120.204.137.107'
  },
  {
    id: '202605051610', user: { name: 'David Chen', email: 'david.chen@gmail.com', phone: '604-123-4567' },
    emailStatus: 'sent', slot: { date: '2026-05-16', startTime: '14:30', endTime: '15:15' },
    ticketCount: { total: 4, completed: 0, notUsed: 4 }, amount: 151.80, couponCode: 'WELCOME10', couponDiscount: -15.18,
    remarks: null, status: 'paid', paymentMethod: 'EMT',
    createdAt: '2026-05-05 10:30:00', createdBy: 'Sunnie (Admin#5)', ip: '74.125.200.5'
  },
  {
    id: '202604281580', user: { name: 'Sarah Johnson', email: 'sarah.j@outlook.com', phone: null },
    emailStatus: 'sent', slot: { date: '2026-05-23', startTime: '17:00', endTime: '17:45' },
    ticketCount: { total: 2, completed: 0, notUsed: 2 }, amount: 75.90, couponCode: null, couponDiscount: 0,
    remarks: null, status: 'paid', paymentMethod: 'Online',
    createdAt: '2026-04-28 14:20:00', createdBy: 'Sunnie (Admin#5)', ip: '99.250.100.12'
  },
  {
    id: '202604201520', user: { name: 'Wei Zhang', email: 'wei.zhang88@qq.com', phone: null },
    emailStatus: 'sent', slot: { date: '2026-05-27', startTime: '11:00', endTime: '11:45' },
    ticketCount: { total: 6, completed: 0, notUsed: 6 }, amount: 197.70, couponCode: 'PACK10', couponDiscount: -19.77,
    remarks: null, status: 'paid', paymentMethod: 'Alipay',
    createdAt: '2026-04-20 09:15:00', createdBy: 'Victor (Admin#6)', ip: '203.45.78.90'
  },
  {
    id: '202604151490', user: { name: 'Mike Brown', email: null, phone: '778-555-9999' },
    emailStatus: 'not_sent', slot: { date: '2026-05-19', startTime: '20:00', endTime: '20:45' },
    ticketCount: { total: 3, completed: 0, notUsed: 3 }, amount: 113.85, couponCode: null, couponDiscount: 0,
    remarks: null, status: 'cancelled', paymentMethod: 'Instore Credit',
    createdAt: '2026-04-15 16:45:00', createdBy: 'staff_1 (Admin#4)', ip: '172.16.0.100'
  },
  {
    id: '202604101450', user: { name: 'Lisa Wang', email: 'lisa.w@hotmail.com', phone: null },
    emailStatus: 'sent', slot: { date: '2026-05-30', startTime: '18:30', endTime: '19:15' },
    ticketCount: { total: 1, completed: 0, notUsed: 1 }, amount: 37.95, couponCode: null, couponDiscount: 0,
    remarks: 'Birthday visit', status: 'refunded', paymentMethod: 'Online',
    createdAt: '2026-04-10 11:00:00', createdBy: 'Sunnie (Admin#5)', ip: '24.80.74.86'
  },
]

export const TICKETS_DATA = [
  { id: 1, code: '2605131919384', orderId: '202605131647', orderUser: 'Lily', orderEmail: null, orderPayment: 'Instore Credit', remarks: '-', ticketType: 'Regular', slotDate: '2026-05-13', slotStart: '11:30', slotEnd: '12:15', status: 'used', verifiedAt: '2026-05-13 11:39:11', createdAt: '2026-05-13 11:39:11' },
  { id: 2, code: '2605131853483', orderId: '202605131647', orderUser: 'Lily', orderEmail: null, orderPayment: 'Instore Credit', remarks: '-', ticketType: 'Senior (65+)', slotDate: '2026-05-13', slotStart: '11:30', slotEnd: '12:15', status: 'used', verifiedAt: '2026-05-13 11:39:11', createdAt: '2026-05-13 11:39:11' },
  { id: 3, code: '2605131459744', orderId: '202605131648', orderUser: 'Dalton', orderEmail: 'dalton.vandernest@gmail.com', orderPayment: 'Instore Credit', remarks: 'Walkin', ticketType: 'Regular', slotDate: '2026-05-13', slotStart: '14:00', slotEnd: '14:45', status: 'used', verifiedAt: '2026-05-13 14:13:56', createdAt: '2026-05-13 14:13:56' },
  { id: 4, code: '2605131039154', orderId: '202605131645', orderUser: 'TINA Guo', orderEmail: 'youme20169@gmail.com', orderPayment: 'EMT', remarks: 'Other', ticketType: 'Group Ticket (min. 6 people)', slotDate: '2026-05-13', slotStart: '18:30', slotEnd: '19:15', status: 'used', verifiedAt: '2026-05-13 08:57:56', createdAt: '2026-05-13 08:57:56' },
  { id: 5, code: '2605131736653', orderId: '202605131645', orderUser: 'TINA Guo', orderEmail: 'youme20169@gmail.com', orderPayment: 'EMT', remarks: 'Other', ticketType: 'Group Ticket (min. 6 people)', slotDate: '2026-05-13', slotStart: '18:30', slotEnd: '19:15', status: 'used', verifiedAt: '2026-05-13 08:57:56', createdAt: '2026-05-13 08:57:56' },
  { id: 6, code: '2605131338522', orderId: '202605131645', orderUser: 'TINA Guo', orderEmail: 'youme20169@gmail.com', orderPayment: 'EMT', remarks: 'Other', ticketType: 'Group Ticket (min. 6 people)', slotDate: '2026-05-13', slotStart: '18:30', slotEnd: '19:15', status: 'used', verifiedAt: '2026-05-13 08:57:56', createdAt: '2026-05-13 08:57:56' },
  { id: 7, code: '2605131227890', orderId: '202605131645', orderUser: 'TINA Guo', orderEmail: 'youme20169@gmail.com', orderPayment: 'EMT', remarks: 'Other', ticketType: 'Group Ticket (min. 6 people)', slotDate: '2026-05-13', slotStart: '18:30', slotEnd: '19:15', status: 'used', verifiedAt: '2026-05-13 09:00:00', createdAt: '2026-05-13 08:57:56' },
  { id: 8, code: '2605131546210', orderId: '202605131646', orderUser: 'TINA GUO', orderEmail: 'youme20169@gmail.com', orderPayment: 'EMT', remarks: null, ticketType: 'Regular', slotDate: '2026-05-13', slotStart: '19:00', slotEnd: '19:45', status: 'used', verifiedAt: '2026-05-13 09:10:00', createdAt: '2026-05-13 08:59:14' },
  { id: 9, code: '2605131689043', orderId: '202605131646', orderUser: 'TINA GUO', orderEmail: 'youme20169@gmail.com', orderPayment: 'EMT', remarks: null, ticketType: 'Child (7-15)', slotDate: '2026-05-13', slotStart: '19:00', slotEnd: '19:45', status: 'not_used', verifiedAt: null, createdAt: '2026-05-13 08:59:14' },
  { id: 10, code: '2605061820001', orderId: '202605061620', orderUser: 'AIMING XU', orderEmail: '1621483796@QQ.COM', orderPayment: 'Instore Credit', remarks: 'WALKIN', ticketType: 'Regular', slotDate: '2026-05-14', slotStart: '14:00', slotEnd: '14:45', status: 'not_used', verifiedAt: null, createdAt: '2026-05-06 16:00:12' },
  { id: 11, code: '2605061820002', orderId: '202605061620', orderUser: 'AIMING XU', orderEmail: '1621483796@QQ.COM', orderPayment: 'Instore Credit', remarks: 'WALKIN', ticketType: 'Regular', slotDate: '2026-05-14', slotStart: '14:00', slotEnd: '14:45', status: 'not_used', verifiedAt: null, createdAt: '2026-05-06 16:00:12' },
]

export const ADMINS_DATA = [
  { id: 1, username: 'spadmin', email: null, role: 'SuperAdmin', department: 'backend', position: 'admin', lastLogin: '2026-05-13 12:00:00', lastLoginRelative: '1 days ago', ip: '2001:569:5bb6:6200:a9b5:ecba:fdef:3f7a', status: 'active', canDisable: false },
  { id: 2, username: 'scanner', email: null, role: 'Operator', department: 'store', position: 'front', lastLogin: '2025-11-28 06:58:00', lastLoginRelative: '2025/11/28 06:58', ip: '2a02:26f7:bacc:4000:6000::c', status: 'active', canDisable: true },
  { id: 3, username: 'franklee123', email: '1@1.1', role: 'Director', department: 'BMW', position: 'COO', lastLogin: '2026-05-11 08:00:00', lastLoginRelative: '3 days ago', ip: '2001:569:70a4:3a00:f9f0:2072:abe4:4699', status: 'active', canDisable: true },
  { id: 4, username: 'staff_1', email: null, role: 'Director', department: 'store', position: 'Staff', lastLogin: '2026-02-07 21:58:00', lastLoginRelative: '2026/02/07 21:58', ip: '120.204.137.107', status: 'active', canDisable: true },
  { id: 5, username: 'Sunnie', email: '1021784916@qq.com', role: 'SDirector', department: 'BMW', position: 'CEO', lastLogin: '2026-05-13 23:52:00', lastLoginRelative: '2 min ago', ip: '2001:569:7b8a:4e00:cc74:64:ed93:7cd0', status: 'active', canDisable: false },
  { id: 6, username: 'Victor', email: 'victorli690113@gmail.com', role: 'Director', department: 'BMW', position: 'CEO-', lastLogin: '2026-05-13 12:00:00', lastLoginRelative: '12 hours ago', ip: '123.168.48.78', status: 'active', canDisable: true },
  { id: 7, username: 'Yvr', email: null, role: 'Front', department: null, position: null, lastLogin: null, lastLoginRelative: '-', ip: null, status: 'inactive', canDisable: true },
  { id: 8, username: 'lyang', email: null, role: 'Front', department: null, position: null, lastLogin: '2025-12-01 12:07:00', lastLoginRelative: '2025/12/01 12:07', ip: '204.48.95.247', status: 'active', canDisable: true },
  { id: 9, username: 'vliu', email: null, role: 'Front', department: null, position: null, lastLogin: '2026-04-17 11:29:00', lastLoginRelative: '2026/04/17 11:29', ip: '24.80.74.86', status: 'active', canDisable: true },
  { id: 10, username: 'flee', email: null, role: 'Front', department: null, position: null, lastLogin: '2025-12-02 13:36:00', lastLoginRelative: '2025/12/02 13:36', ip: '24.80.74.86', status: 'active', canDisable: true },
  { id: 11, username: 'davidz', email: null, role: 'Director', department: 'BMW', position: 'CMO', lastLogin: '2026-02-19 18:40:00', lastLoginRelative: '2026/02/19 18:40', ip: '2604:3d08:3679:a7a0:94ea:a16c:7266:6620', status: 'active', canDisable: true },
  { id: 12, username: 'lilyvr', email: null, role: 'Front', department: null, position: null, lastLogin: '2026-05-13 23:06:00', lastLoginRelative: '2 hours ago', ip: '24.80.74.86', status: 'active', canDisable: true },
]

export const LOGS_DATA = [
  { id: 3995, admin: 'Sunnie', actionType: 'Login', targetType: 'User', targetId: 5, actionDetails: '{"username":"Sunnie","role":"SDirector","...":"..."}', loginInfo: '2001:569:7b8a:4e00:cc74:64:ed93:7cd0', time: '2026-05-13 23:52:13' },
  { id: 3994, admin: 'lilyvr', actionType: 'Export', targetType: 'Ticket', targetId: null, actionDetails: '{"total_count":24,"filters":{"verific...":"..."}}', loginInfo: null, time: '2026-05-13 23:06:01' },
  { id: 3993, admin: 'Sunnie', actionType: 'Export', targetType: 'Order', targetId: null, actionDetails: '{"total_count":810,"filters":{"order_...":"..."}}', loginInfo: null, time: '2026-05-13 21:11:38' },
  { id: 3992, admin: 'Sunnie', actionType: 'Export', targetType: 'Order', targetId: null, actionDetails: '{"total_count":1,"filters":{"order_id...":"..."}}', loginInfo: null, time: '2026-05-13 21:11:05' },
  { id: 3991, admin: 'Sunnie', actionType: 'Export', targetType: 'Ticket', targetId: null, actionDetails: '{"total_count":2184,"filters":{"verif...":"..."}}', loginInfo: null, time: '2026-05-13 21:10:05' },
  { id: 3990, admin: 'Sunnie', actionType: 'Export', targetType: 'Ticket', targetId: null, actionDetails: '{"total_count":2,"filters":{"verifica...":"..."}}', loginInfo: null, time: '2026-05-13 21:08:55' },
  { id: 3989, admin: 'Sunnie', actionType: 'Export', targetType: 'Order', targetId: null, actionDetails: '{"total_count":1,"filters":{"order_id...":"..."}}', loginInfo: null, time: '2026-05-13 21:08:30' },
  { id: 3988, admin: 'Sunnie', actionType: 'Check In', targetType: 'Ticket', targetId: 3, actionDetails: '{"ticket_id":3,"status":"used"}', loginInfo: '2001:569:7b8a:4e00:cc74:64:ed93:7cd0', time: '2026-05-13 14:13:56' },
  { id: 3987, admin: 'Sunnie', actionType: 'Create', targetType: 'Order', targetId: null, actionDetails: '{"order_id":"202605131648","amount":43.30}', loginInfo: '2001:569:7b8a:4e00:cc74:64:ed93:7cd0', time: '2026-05-13 14:13:56' },
  { id: 3986, admin: 'Victor', actionType: 'Create', targetType: 'Order', targetId: null, actionDetails: '{"order_id":"202605131647","amount":83.04}', loginInfo: '123.168.48.78', time: '2026-05-13 11:39:11' },
  { id: 3985, admin: 'Victor', actionType: 'Check In', targetType: 'Ticket', targetId: 1, actionDetails: '{"ticket_id":1,"status":"used"}', loginInfo: '123.168.48.78', time: '2026-05-13 11:39:11' },
  { id: 3984, admin: 'Victor', actionType: 'Check In', targetType: 'Ticket', targetId: 2, actionDetails: '{"ticket_id":2,"status":"used"}', loginInfo: '123.168.48.78', time: '2026-05-13 11:39:11' },
  { id: 3983, admin: 'franklee123', actionType: 'Create', targetType: 'Order', targetId: null, actionDetails: '{"order_id":"202605131646","amount":59.98}', loginInfo: '2001:569:70a4:3a00:f9f0:2072:abe4:4699', time: '2026-05-13 08:59:14' },
  { id: 3982, admin: 'franklee123', actionType: 'Create', targetType: 'Order', targetId: null, actionDetails: '{"order_id":"202605131645","amount":600.00}', loginInfo: '2001:569:70a4:3a00:f9f0:2072:abe4:4699', time: '2026-05-13 08:57:56' },
  { id: 3981, admin: 'Sunnie', actionType: 'Login', targetType: 'User', targetId: 5, actionDetails: '{"username":"Sunnie","role":"SDirector"}', loginInfo: '2001:569:7b8a:4e00:cc74:64:ed93:7cd0', time: '2026-05-13 08:30:00' },
  { id: 3980, admin: 'Sunnie', actionType: 'Update', targetType: 'Coupon', targetId: 3, actionDetails: '{"code":"ANGIE10","action":"update"}', loginInfo: null, time: '2026-05-12 18:20:00' },
  { id: 3979, admin: 'franklee123', actionType: 'Login', targetType: 'User', targetId: 3, actionDetails: '{"username":"franklee123","role":"Director"}', loginInfo: '2001:569:70a4:3a00:f9f0:2072:abe4:4699', time: '2026-05-11 08:00:00' },
  { id: 3978, admin: 'Sunnie', actionType: 'Batch Update', targetType: 'Slot', targetId: null, actionDetails: '{"count":20,"action":"create_batch"}', loginInfo: null, time: '2026-05-10 10:00:00' },
  { id: 3977, admin: 'Sunnie', actionType: 'Create', targetType: 'Coupon', targetId: 9, actionDetails: '{"code":"SUMMER5","discount":5}', loginInfo: null, time: '2026-05-01 08:00:00' },
  { id: 3976, admin: 'Victor', actionType: 'Update', targetType: 'Ticket Type', targetId: 3, actionDetails: '{"name":"Regular","changes":{"price":"updated"}}', loginInfo: null, time: '2026-04-30 14:30:00' },
]

export const MARKETING_SETTINGS = {
  enabled: true,
  sendDelay: 45,
  couponValidity: 30,
  discountType: 'percent',
  discountValue: 5,
  minPurchase: 0,
  maxUses: 9999,
  referralEnabled: true,
  referralReward: 5,
}

export const MARKETING_RECORDS = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  recipient: `user${i + 1}@example.com`,
  couponCode: `MKT${String(i + 1).padStart(4, '0')}`,
  status: i < 2 ? 'failed' : i < 4 ? 'cancelled' : 'sent',
  sentAt: `2026-05-${String(Math.max(1, 13 - Math.floor(i / 5))).padStart(2,'0')} ${String(10 + (i % 12)).padStart(2,'0')}:${String((i * 7) % 60).padStart(2,'0')}:00`,
  couponUsed: i === 5,
  triggeredBy: `Order #${202605130000 + i * 10}`,
}))

export const DASHBOARD_STATS = {
  todayRevenue: 786.32,
  todayOrders: 4,
  todayTickets: 25,
  pendingOrders: 0,
  activeSlots: 3508,
}

export const SALES_TREND = [
  { date: '2026-05-07', revenue: 0, tickets: 0 },
  { date: '2026-05-08', revenue: 220, tickets: 7 },
  { date: '2026-05-09', revenue: 380, tickets: 11 },
  { date: '2026-05-10', revenue: 420, tickets: 12 },
  { date: '2026-05-11', revenue: 100, tickets: 3 },
  { date: '2026-05-12', revenue: 50, tickets: 2 },
  { date: '2026-05-13', revenue: 786, tickets: 25 },
]

export const POPULAR_SLOTS = [
  { slot: '2026-05-13 18:30:00', sold: 12, total: 20 },
  { slot: '2026-05-13 19:00:00', sold: 2, total: 20 },
  { slot: '2026-05-13 11:30:00', sold: 2, total: 20 },
  { slot: '2026-05-14 14:00:00', sold: 2, total: 20 },
  { slot: '2026-05-13 14:00:00', sold: 1, total: 20 },
  { slot: '2026-05-27 11:00:00', sold: 0, total: 20 },
  { slot: '2026-05-16 14:30:00', sold: 0, total: 20 },
  { slot: '2026-05-30 18:30:00', sold: 0, total: 20 },
  { slot: '2026-05-19 20:00:00', sold: 0, total: 20 },
  { slot: '2026-05-23 17:00:00', sold: 0, total: 20 },
]

export const TICKET_DISTRIBUTION = [
  { name: 'Regular', value: 28, color: '#7b2020' },
  { name: 'Group Ticket', value: 20, color: '#a83030' },
  { name: 'Child (7-15)', value: 4, color: '#c94040' },
  { name: 'Senior (65+)', value: 3, color: '#f47979' },
  { name: 'VIP', value: 1, color: '#fbd5d5' },
]
