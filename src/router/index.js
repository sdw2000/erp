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
    path: '/purchase',
    component: Layout,
    name: 'Purchase',
    meta: { title: '采购管理', icon: 'el-icon-s-goods', roles: ['admin'] },
    children: [
      {
        path: 'orders',
        component: () => import('@/views/purchase/orders'),
        name: 'PurchaseOrders',
        meta: { title: '采购订单', icon: 'list', roles: ['admin'] }
      },
      {
        path: 'suppliers',
        component: () => import('@/views/purchase/suppliers'),
        name: 'PurchaseSuppliers',
        meta: { title: '供应商管理', icon: 'user', roles: ['admin'] }
      },
      {
        path: 'supplier-priority',
        component: () => import('@/views/purchase/supplierPriority'),
        name: 'PurchaseSupplierPriority',
        meta: { title: '供应商优先级', icon: 'star', roles: ['admin'] }
      },
      {
        path: 'quotations',
        component: () => import('@/views/purchase/quotations'),
        name: 'PurchaseQuotations',
        meta: { title: '采购报价', icon: 'clipboard', roles: ['admin'] }
      },
      {
        path: 'samples',
        component: () => import('@/views/purchase/samples'),
        name: 'PurchaseSamples',
        meta: { title: '送样记录', icon: 'guide', roles: ['admin'] }
      },
      {
        path: 'receipts',
        component: () => import('@/views/purchase/receipts'),
        name: 'PurchaseReceipts',
        meta: { title: '收货通知', icon: 'el-icon-s-claim', roles: ['admin'] }
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
      },
      {
        path: 'tape-safety-stock',
        component: () => import('@/views/production/safetyStock'),
        name: 'TapeSafetyStock',
        meta: { title: '胶带安全库存', icon: 'chart', roles: ['warehouse', 'admin', 'production'] }
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
        path: 'order-material-lock',
        component: () => import('@/views/production/orderPreprocessing'),
        name: 'OrderPreprocessing',
        meta: { title: '计划列表', icon: 'document-copy', roles: ['production', 'admin'] }
      },
      {
        path: 'pending-coating-pool',
        component: () => import('@/views/production/pendingCoatingPool'),
        name: 'PendingCoatingPool',
        meta: { title: '待排程池', icon: 'time', roles: ['production', 'admin'] }
      },
      {
        path: 'schedule-task',
        component: () => import('@/views/production/scheduleTask'),
        name: 'ScheduleTask',
        meta: { title: '单表排程', icon: 'document', roles: ['production', 'admin'] }
      },
      {
        path: 'manual-schedule',
        component: () => import('@/views/production/manualSchedule'),
        name: 'ManualSchedule',
        meta: { title: '手动排程', icon: 'edit', roles: ['production', 'admin'] }
      },
      {
        path: 'coating-schedule-board',
        component: () => import('@/views/production/coatingScheduleBoard'),
        name: 'CoatingScheduleBoard',
        meta: { title: '排程看板', icon: 'dashboard', roles: ['production', 'admin'] }
      },
      {
        path: 'basic-info',
        component: () => import('@/components/ParentView'),
        name: 'BasicInfo',
        redirect: '/production/basic-info/equipment',
        meta: { title: '基础信息', icon: 'setting', roles: ['production', 'admin'] },
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
          }
        ]
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
    path: '/production-management',
    component: Layout,
    name: 'ProductionManagementRoot',
    redirect: '/production-management/coating',
    meta: { title: '生产管理', icon: 'el-icon-s-operation', roles: ['production', 'admin'] },
    children: [
      {
        path: 'coating',
        component: () => import('@/views/production/coatingTasks'),
        name: 'ProductionManagementCoating',
        meta: { title: '涂布任务', icon: 'list', roles: ['production', 'admin'] }
      },
      {
        path: 'rewinding',
        component: () => import('@/views/production/rewindingTasks'),
        name: 'ProductionManagementRewinding',
        meta: { title: '复卷任务', icon: 'list', roles: ['production', 'admin'] }
      },
      {
        path: 'slitting',
        component: () => import('@/views/production/slittingTasks'),
        name: 'ProductionManagementSlitting',
        meta: { title: '分切任务', icon: 'list', roles: ['production', 'admin'] }
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
        path: 'incoming',
        component: () => import('@/views/quality/incoming'),
        name: 'IncomingInspection',
        meta: { title: '来料检测', icon: 'el-icon-truck', roles: ['quality', 'admin', 'production'] }
      },
      {
        path: 'process',
        component: () => import('@/views/quality/process'),
        name: 'ProcessInspection',
        meta: { title: '过程检测', icon: 'el-icon-setting', roles: ['quality', 'admin', 'production'] }
      },
      {
        path: 'outbound',
        component: () => import('@/views/quality/outbound'),
        name: 'OutboundInspection',
        meta: { title: '出货检测', icon: 'el-icon-sell', roles: ['quality', 'admin', 'production'] }
      },
      {
        path: 'report',
        component: () => import('@/views/quality/report'),
        name: 'QualityReport',
        meta: { title: '报表统计', icon: 'el-icon-data-analysis', roles: ['quality', 'admin', 'production'] }
      },
      {
        path: 'inspection',
        component: () => import('@/views/quality/inspection'),
        name: 'InspectionManagementLegacy',
        meta: { title: '质检管理(旧)', icon: 'list', roles: ['quality', 'admin', 'production'] },
        hidden: true
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
