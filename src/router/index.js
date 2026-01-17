import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

/* Layout */
import Layout from '@/layout'

export const constantRoutes = [
  {
    path: '/login',
    component: () => import('@/views/login/index'),
    hidden: true
  },
  {
    path: '/404',
    component: () => import('@/views/error-page/404'),
    hidden: true
  },
  {
    path: '/401',
    component: () => import('@/views/error-page/401'),
    hidden: true
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        component: () => import('@/views/dashboard/index'),
        name: 'Dashboard',
        meta: { title: '首页', icon: 'dashboard', affix: true }
      }
    ]
  },
  {
    path: '/profile',
    component: Layout,
    redirect: '/profile/index',
    hidden: true,
    children: [
      {
        path: 'index',
        component: () => import('@/views/profile/index'),
        name: 'Profile',
        meta: { title: '个人中心', icon: 'user', noCache: true }
      }
    ]
  }
]

export const asyncRoutes = [
  {
    path: '/permission',
    component: Layout,
    children: [
      {
        path: 'index',
        component: () => import('@/views/permission/index'),
        name: 'PermissionManagement',
        meta: { title: '权限管理', icon: 'lock', roles: ['admin'] }
      }
    ]
  },
  {
    path: '/sales',
    component: Layout,
    name: 'Sales',
    meta: { title: '销售管理', icon: 'shopping', roles: ['sales', 'admin'] },
    children: [
      {
        path: 'orders',
        component: () => import('@/views/sales/orders'),
        name: 'SalesOrders',
        meta: { title: '销售订单', icon: 'list', roles: ['sales', 'admin'] }
      },
      {
        path: 'quotations',
        component: () => import('@/views/sales/quotations'),
        name: 'SalesQuotations',
        meta: { title: '报价管理', icon: 'clipboard', roles: ['sales', 'admin'] }
      },
      {
        path: 'samples',
        component: () => import('@/views/sales/samples'),
        name: 'SalesSamples',
        meta: { title: '样品记录', icon: 'table', roles: ['sales', 'admin'] }
      },
      {
        path: 'customers',
        component: () => import('@/views/sales/customers'),
        name: 'SalesCustomers',
        meta: { title: '客户管理', icon: 'user', roles: ['sales', 'admin'] }
      },
      {
        path: 'delivery',
        component: () => import('@/views/sales/delivery'),
        name: 'SalesDelivery',
        meta: { title: '发货通知', icon: 'guide', roles: ['sales', 'warehouse', 'admin'] }
      },
      {
        path: 'customer-priority',
        component: () => import('@/views/sales/customerPriority'),
        name: 'CustomerPriority',
        meta: { title: '客户优先级', icon: 'star', roles: ['sales', 'production', 'admin'] }
      }
    ]
  },
  {
    path: '/stock',
    component: Layout,
    name: 'Stock',
    meta: { title: '库存管理', icon: 'component', roles: ['warehouse', 'admin', 'sales', 'production'] },
    children: [
      {
        path: 'index',
        component: () => import('@/views/stock/index'),
        name: 'StockList',
        meta: { title: '库存查询', icon: 'table', roles: ['warehouse', 'admin', 'sales', 'production'] }
      },
      {
        path: 'inbound',
        component: () => import('@/views/stock/inbound'),
        name: 'InboundRequest',
        meta: { title: '入库申请', icon: 'edit', roles: ['warehouse', 'admin', 'production'] }
      },
      {
        path: 'outbound',
        component: () => import('@/views/stock/outbound'),
        name: 'OutboundRequest',
        meta: { title: '出库申请', icon: 'excel', roles: ['warehouse', 'admin', 'sales'] }
      },
      {
        path: 'log',
        component: () => import('@/views/stock/log'),
        name: 'StockLog',
        meta: { title: '库存流水', icon: 'documentation', roles: ['warehouse', 'admin'] }
      },
      {
        path: 'film-stock',
        component: () => import('@/views/stock/film-stock'),
        name: 'FilmStock',
        meta: { title: '薄膜仓库', icon: 'el-icon-files', roles: ['warehouse', 'admin', 'production'] }
      },
      {
        path: 'chemical-stock',
        component: () => import('@/views/stock/chemical-stock'),
        name: 'ChemicalStock',
        meta: { title: '化工仓库', icon: 'el-icon-goods', roles: ['warehouse', 'admin', 'production'] }
      }
    ]
  },
  {
    path: '/rd',
    component: Layout,
    name: 'RD',
    meta: { title: '研发管理', icon: 'skill', roles: ['rd', 'admin'] },
    children: [
      {
        path: 'spec',
        component: () => import('@/views/rd/index'),
        name: 'TapeSpec',
        meta: { title: '料号规格维护', icon: 'form', roles: ['rd', 'admin', 'production', 'sales'] }
      },
      {
        path: 'formula',
        component: () => import('@/views/rd/formula'),
        name: 'TapeFormula',
        meta: { title: '配胶标准单', icon: 'documentation', roles: ['rd', 'admin', 'production'] }
      }
    ]
  },
  {
    path: '/production',
    component: Layout,
    name: 'Production',
    meta: { title: '计划管理', icon: 'tree-table', roles: ['production', 'admin'] },
    children: [
      {
        path: 'equipment',
        component: () => import('@/views/production/equipment'),
        name: 'EquipmentManagement',
        meta: { title: '设备管理', icon: 'component', roles: ['production', 'admin'] }
      },
      {
        path: 'staff',
        component: () => import('@/views/production/staff'),
        name: 'StaffManagement',
        meta: { title: '人员管理', icon: 'peoples', roles: ['production', 'admin'] }
      },
      {
        path: 'process-params',
        component: () => import('@/views/production/processParams'),
        name: 'ProcessParams',
        meta: { title: '工艺参数', icon: 'edit', roles: ['production', 'admin'] }
      },
      {
        path: 'safety-stock',
        component: () => import('@/views/production/safetyStock'),
        name: 'SafetyStock',
        meta: { title: '安全库存', icon: 'chart', roles: ['production', 'admin', 'warehouse'] }
      },
      {
        path: 'order-material-lock',
        component: () => import('@/views/production/orderMaterialLock'),
        name: 'OrderMaterialLock',
        meta: { title: '物料锁定', icon: 'lock', roles: ['production', 'admin'] }
      },
      {
        path: 'pending-coating-pool',
        component: () => import('@/views/production/pendingCoatingPool'),
        name: 'PendingCoatingPool',
        meta: { title: '待涂布池', icon: 'time', roles: ['production', 'admin'] }
      },
      {
        path: 'coating-schedule-board',
        component: () => import('@/views/production/coatingScheduleBoard'),
        name: 'CoatingScheduleBoard',
        meta: { title: '涂布排程看板', icon: 'dashboard', roles: ['production', 'admin'] }
      },
      {
        path: 'cost-tracking',
        component: () => import('@/views/production/costTracking'),
        name: 'CostTracking',
        meta: { title: '成本追溯', icon: 'money', roles: ['production', 'admin', 'finance'] }
      }
    ]
  },
  {
    path: '/quality',
    component: Layout,
    name: 'Quality',
    meta: { title: '质检管理', icon: 'check', roles: ['quality', 'admin', 'production'] },
    children: [
      {
        path: 'inspection',
        component: () => import('@/views/quality/inspection'),
        name: 'InspectionManagement',
        meta: { title: '质检管理', icon: 'list', roles: ['quality', 'admin', 'production'] }
      }
    ]
  },
  { path: '*', redirect: '/404', hidden: true }
]

const createRouter = () => new Router({
  scrollBehavior: () => ({ y: 0 }),
  routes: constantRoutes
})

const router = createRouter()

export function resetRouter() {
  const newRouter = createRouter()
  router.matcher = newRouter.matcher // reset router
  router.matcher = newRouter.matcher // reset router
}

export default router
