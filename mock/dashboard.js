// const Mock = require('mockjs')

module.exports = [
  {
    url: '/vue-element-admin/dashboard/personal',
    type: 'get',
    response: config => {
      return {
        code: 20000,
        data: {
          username: 'admin',
          monthOrderCount: 18,
          monthSalesAmount: 235000,
          monthNewCustomers: 3,
          monthReceivables: 180000,
          todoOrders: 5,
          todoReceivables: 2,
          overdueOrders: 1,
          stockWarning: 2,
          salesTarget: 300000,
          salesFinished: 235000,
          notices: [
            { id: 1, title: '本月销售目标为30万，请及时跟进客户！' },
            { id: 2, title: '有2个产品库存低于安全线，请关注补货。' }
          ]
        }
      }
    }
  }
]