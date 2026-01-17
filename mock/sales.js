// mock/sales.js

// In-memory data for dev-time mock CRUD
let orders = [
  {
    orderNo: 'SO-20251201-001',
    customer: '广州胶带有限公司',
    totalAmount: 12500,
    totalArea: 500,
    orderDate: '2025-12-01',
    deliveryDate: '2025-12-10',
    items: [
      { materialCode: 'MT-001', materialName: '聚丙烯胶带', length: 1000, width: 50, thickness: 0.08, rolls: 10, sqm: 250, unitPrice: 50, remark: '' },
      { materialCode: 'MT-002', materialName: '双面胶带', length: 500, width: 30, thickness: 0.05, rolls: 20, sqm: 250, unitPrice: 25, remark: '特快' }
    ]
  },
  {
    orderNo: 'SO-20251202-002',
    customer: '深圳封箱厂',
    totalAmount: 8000,
    totalArea: 300,
    orderDate: '2025-12-02',
    deliveryDate: '2025-12-08',
    items: [
      { materialCode: 'MT-003', materialName: 'PVC胶带', length: 1200, width: 60, thickness: 0.1, rolls: 8, sqm: 300, unitPrice: 26.67, remark: '' }
    ]
  }
]

let quotes = [
  { quoteNo: 'Q-20251201-001', customer: '广州胶带有限公司', validUntil: '2025-12-31', totalAmount: 15000 },
  { quoteNo: 'Q-20251205-002', customer: '东莞包装厂', validUntil: '2026-01-15', totalAmount: 9000 }
]

let samples = [
  { sampleNo: 'S-20251201-001', customer: '广州胶带有限公司', sendDate: '2025-12-01', status: '已送达', remark: '' }
]

function genOrderNo() {
  const d = new Date()
  return 'SO-' + d.getFullYear() + ('' + (d.getMonth() + 1)).padStart(2, '0') + ('' + d.getDate()).padStart(2, '0') + '-' + Math.floor(Math.random() * 900 + 100)
}
function genQuoteNo() {
  const d = new Date()
  return 'Q-' + d.getFullYear() + ('' + (d.getMonth() + 1)).padStart(2, '0') + ('' + d.getDate()).padStart(2, '0') + '-' + Math.floor(Math.random() * 900 + 100)
}
function genSampleNo() {
  const d = new Date()
  return 'S-' + d.getFullYear() + ('' + (d.getMonth() + 1)).padStart(2, '0') + ('' + d.getDate()).padStart(2, '0') + '-' + Math.floor(Math.random() * 900 + 100)
}

module.exports = [
  // Orders - list
  {
    url: '/api/sales/orders',
    type: 'get',
    response: () => {
      return { code: 200, data: orders }
    }
  },
  // Orders - create
  {
    url: '/api/sales/orders',
    type: 'post',
    response: config => {
      const body = config.body || {}
      const newOrder = Object.assign({}, body)
      if (!newOrder.orderNo) newOrder.orderNo = genOrderNo()
      orders.unshift(newOrder)
      return { code: 200, data: newOrder }
    }
  },
  // Orders - update
  {
    url: '/api/sales/orders',
    type: 'put',
    response: config => {
      const body = config.body || {}
      const idx = orders.findIndex(o => o.orderNo === body.orderNo)
      if (idx === -1) {
        return { code: 404, message: 'order not found' }
      }
      orders[idx] = Object.assign({}, orders[idx], body)
      return { code: 200, data: orders[idx] }
    }
  },
  // Orders - delete
  {
    url: '/api/sales/orders',
    type: 'delete',
    response: config => {
      const body = config.body || {}
      const orderNo = body.orderNo || (config.query && config.query.orderNo)
      const idx = orders.findIndex(o => o.orderNo === orderNo)
      if (idx === -1) {
        return { code: 404, message: 'order not found' }
      }
      orders.splice(idx, 1)
      return { code: 200, data: 'deleted' }
    }
  },

  // Quotes - list
  {
    url: '/api/sales/quotes',
    type: 'get',
    response: () => ({ code: 200, data: quotes })
  },
  // Quotes - create
  {
    url: '/api/sales/quotes',
    type: 'post',
    response: config => {
      const body = config.body || {}
      const newQuote = Object.assign({}, body)
      if (!newQuote.quoteNo) newQuote.quoteNo = genQuoteNo()
      quotes.unshift(newQuote)
      return { code: 200, data: newQuote }
    }
  },
  // Quotes - update
  {
    url: '/api/sales/quotes',
    type: 'put',
    response: config => {
      const body = config.body || {}
      const idx = quotes.findIndex(q => q.quoteNo === body.quoteNo)
      if (idx === -1) {
        return { code: 404, message: 'quote not found' }
      }
      quotes[idx] = Object.assign({}, quotes[idx], body)
      return { code: 200, data: quotes[idx] }
    }
  },
  // Quotes - delete
  {
    url: '/api/sales/quotes',
    type: 'delete',
    response: config => {
      const body = config.body || {}
      const quoteNo = body.quoteNo || (config.query && config.query.quoteNo)
      const idx = quotes.findIndex(q => q.quoteNo === quoteNo)
      if (idx === -1) {
        return { code: 404, message: 'quote not found' }
      }      quotes.splice(idx, 1)
      return { code: 200, data: 'deleted' }
    }
  }

  // ============================================
  // Samples 相关路由已注释，使用真实后端 API
  // ============================================
  // 送样管理现在使用后端 http://localhost:8090/api/sales/samples
  // 客户管理使用后端 http://localhost:8090/api/sales/customers
]
