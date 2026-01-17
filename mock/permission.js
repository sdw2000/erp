// mock/permission.js
module.exports = [
  {
    url: '/api/permission/users',
    type: 'get',
    response: () => {
      return {
        code: 200,
        data: [
          {
            username: 'zhangsan',
            password: '123456',
            roles: ['admin', 'sales'],
            department: '管理部',
            permissions: ['订单管理', '库存管理', '客户管理', '财务管理', '报表分析']
          },
          {
            username: 'lisi',
            password: '123456',
            roles: ['sales'],
            department: '销售部',
            permissions: ['订单管理', '客户管理', '报表分析']
          },
          {
            username: 'wangwu',
            password: '123456',
            roles: ['warehouse'],
            department: '仓库部',
            permissions: ['库存管理', '订单管理']
          },
          {
            username: 'zhaoliu',
            password: '123456',
            roles: ['finance'],
            department: '财务部',
            permissions: ['财务管理', '报表分析']
          }
        ]
      }
    }
  }
]
