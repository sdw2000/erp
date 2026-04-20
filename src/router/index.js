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
    meta: { title: '销售管理', icon: 'shopping', roles: ['sales', 'admin', 'finance'] },
    children: [
      {
        path: 'orders',
        component: () => import('@/views/sales/orders'),
        name: 'SalesOrders',
        meta: { title: '销售订单', icon: 'list', roles: ['sales', 'admin', 'finance'] }
      },
      {
        path: 'returns',
        component: () => import('@/views/sales/returns'),
        name: 'SalesReturns',
        meta: { title: '销售退货', icon: 'el-icon-refresh-left', roles: ['sales', 'admin', 'finance'] }
      },
      {
        path: 'reconciliation',
        component: () => import('@/views/sales/reconciliation'),
        name: 'SalesReconciliation',
        meta: { title: '销售对账', icon: 'el-icon-document', roles: ['sales', 'admin', 'finance'] }
      },
      {
        path: 'quotations',
        component: () => import('@/views/sales/quotations'),
        name: 'SalesQuotations',
        meta: { title: '报价管理', icon: 'clipboard', roles: ['sales', 'admin', 'finance'] }
      },
      {
        path: 'samples',
        component: () => import('@/views/sales/samples'),
        name: 'SalesSamples',
        meta: { title: '样品记录', icon: 'table', roles: ['sales', 'admin', 'finance'] }
      },
      {
        path: 'customers',
        component: () => import('@/views/sales/customers'),
        name: 'SalesCustomers',
        meta: { title: '客户管理', icon: 'user', roles: ['sales', 'admin', 'finance'] }
      },
      {
        path: 'delivery',
        component: () => import('@/views/sales/delivery'),
        name: 'SalesDelivery',
        meta: { title: '发货通知', icon: 'guide', roles: ['sales', 'warehouse', 'admin'] }
      },
      {
        path: 'logistics-companies',
        component: () => import('@/views/sales/logisticsCompanies'),
        name: 'LogisticsCompanies',
        meta: { title: '物流公司', icon: 'el-icon-truck', roles: ['sales', 'warehouse', 'admin'] }
      },
      {
        path: 'customer-priority',
        component: () => import('@/views/sales/customerPriority'),
        name: 'CustomerPriority',
        meta: { title: '客户优先级', icon: 'star', roles: ['sales', 'production', 'admin'] }
      },
      {
        path: 'customer-material-mapping',
        component: () => import('@/views/sales/customerMaterialMapping'),
        name: 'CustomerMaterialMapping',
        meta: { title: '客户物料映射', icon: 'el-icon-connection', roles: ['sales', 'admin', 'finance'] }
      }
    ]
  },
  {
    path: '/finance',
    component: Layout,
    name: 'Finance',
    meta: { title: '财务管理', icon: 'el-icon-money', roles: ['finance', 'admin'] },
    children: [
      {
        path: 'sales-reconciliation',
        component: () => import('@/views/sales/reconciliation'),
        name: 'FinanceSalesReconciliation',
        meta: { title: '销售对账', icon: 'el-icon-document-checked', roles: ['finance', 'admin'] }
      },
      {
        path: 'cost-accounting',
        component: () => import('@/views/finance/costAccounting'),
        name: 'FinanceCostAccounting',
        meta: { title: '成本核算', icon: 'el-icon-data-analysis', roles: ['finance', 'admin'] }
      },
      {
        path: 'basic-config',
        component: () => import('@/views/finance/basicConfig'),
        name: 'FinanceBasicConfig',
        meta: { title: '基本信息配置', icon: 'el-icon-setting', roles: ['finance', 'admin'] }
      },
      {
        path: 'salary-accounting',
        component: () => import('@/views/finance/salaryAccounting'),
        name: 'FinanceSalaryAccounting',
        meta: { title: '工资核算', icon: 'el-icon-s-custom', roles: ['finance', 'admin'] }
      },
      {
        path: 'bank-ledger',
        component: () => import('@/views/finance/bankLedger'),
        name: 'FinanceBankLedger',
        meta: { title: '银行账目流水', icon: 'el-icon-bank-card', roles: ['finance', 'admin'] }
      }
    ]
  },
  {
    path: '/purchase',
    component: Layout,
    name: 'Purchase',
    meta: { title: '采购管理', icon: 'el-icon-s-goods', roles: ['admin', 'purchase'] },
    children: [
      {
        path: 'orders',
        component: () => import('@/views/purchase/orders'),
        name: 'PurchaseOrders',
        meta: { title: '采购订单', icon: 'list', roles: ['admin', 'purchase'] }
      },
      {
        path: 'suppliers',
        component: () => import('@/views/purchase/suppliers'),
        name: 'PurchaseSuppliers',
        meta: { title: '供应商管理', icon: 'user', roles: ['admin', 'purchase'] }
      },
      {
        path: 'supplier-priority',
        component: () => import('@/views/purchase/supplierPriority'),
        name: 'PurchaseSupplierPriority',
        meta: { title: '供应商优先级', icon: 'star', roles: ['admin', 'purchase'] }
      },
      {
        path: 'quotations',
        component: () => import('@/views/purchase/quotations'),
        name: 'PurchaseQuotations',
        meta: { title: '采购报价', icon: 'clipboard', roles: ['admin', 'purchase'] }
      },
      {
        path: 'samples',
        component: () => import('@/views/purchase/samples'),
        name: 'PurchaseSamples',
        meta: { title: '送样记录', icon: 'guide', roles: ['admin', 'purchase'] }
      },
      {
        path: 'receipts',
        component: () => import('@/views/purchase/receipts'),
        name: 'PurchaseReceipts',
        meta: { title: '收货通知', icon: 'el-icon-s-claim', roles: ['admin', 'purchase'] }
      }
    ]
  },
  {
    path: '/stock',
    component: Layout,
    name: 'Stock',
    redirect: '/stock/raw-material-hub',
    meta: { title: '库存管理', icon: 'component', roles: ['warehouse', 'admin', 'sales', 'production', 'finance', 'quality'] },
    children: [
      {
        path: 'raw-material-hub',
        component: () => import('@/views/stock/raw-material-hub'),
        name: 'RawMaterialHub',
        meta: { title: '原材料总仓', icon: 'el-icon-box', roles: ['warehouse', 'admin', 'production', 'finance', 'quality'] }
      },
      {
        path: 'index',
        component: () => import('@/views/stock/index'),
        name: 'StockList',
        meta: { title: '库存查询', icon: 'table', roles: ['warehouse', 'admin', 'sales', 'production', 'finance', 'quality'] }
      },
      {
        path: 'inbound',
        component: () => import('@/views/stock/inbound'),
        name: 'InboundRequest',
        meta: { title: '入库申请', icon: 'edit', roles: ['warehouse', 'admin', 'production'] }
      },
      {
        path: 'return-inbound-review',
        component: () => import('@/views/stock/return-inbound-review'),
        name: 'ReturnInboundReview',
        meta: { title: '退货入库审核', icon: 'el-icon-refresh-left', roles: ['warehouse', 'admin'] }
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
        path: 'unified-flow',
        component: () => import('@/views/stock/unified-flow'),
        name: 'UnifiedStockFlow',
        meta: { title: '统一库存流水', icon: 'el-icon-data-analysis', roles: ['warehouse', 'admin', 'finance', 'production'] }
      },
      {
        path: 'film-stock',
        component: () => import('@/views/stock/film-stock'),
        name: 'FilmStock',
        meta: { title: '薄膜仓库', icon: 'el-icon-files', roles: ['admin'] }
      },
      {
        path: 'chemical-stock',
        component: () => import('@/views/stock/chemical-stock'),
        name: 'ChemicalStock',
        meta: { title: '化工仓库', icon: 'el-icon-goods', roles: ['admin'] }
      },
      {
        path: 'chemical-requisition',
        component: () => import('@/views/stock/chemical-requisition'),
        name: 'ChemicalRequisition',
        meta: { title: '化工请购', icon: 'el-icon-document-checked', roles: ['admin'] }
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
        meta: { title: '配胶标准', icon: 'documentation', roles: ['rd', 'admin', 'production'] }
      },
      {
        path: 'raw-material',
        component: () => import('@/views/rd/rawMaterial'),
        name: 'TapeRawMaterial',
        meta: { title: '原材料表', icon: 'table', roles: ['rd', 'admin'] }
      },
      {
        path: 'carton-spec',
        component: () => import('@/views/rd/cartonSpec'),
        name: 'CartonSpec',
        meta: { title: '全局纸箱规格维护', icon: 'el-icon-box', roles: ['rd', 'admin'] }
      }
    ]
  },
  {
    path: '/production',
    component: Layout,
    name: 'Production',
    redirect: '/production/manual-schedule',
    meta: { title: '计划管理', icon: 'tree-table', roles: ['production', 'admin', 'plan', 'scheduler'] },
    children: [
      // {
      //   path: 'order-material-lock',
      //   component: () => import('@/views/production/orderPreprocessing'),
      //   name: 'OrderPreprocessing',
      //   meta: { title: '计划列表', icon: 'document-copy', roles: ['production', 'admin'] }
      // },
      // {
      //   path: 'pending-coating-pool',
      //   component: () => import('@/views/production/pendingCoatingPool'),
      //   name: 'PendingCoatingPool',
      //   meta: { title: '待排程池', icon: 'time', roles: ['production', 'admin'] }
      // },
      // {
      //   path: 'schedule-task',
      //   component: () => import('@/views/production/scheduleTask'),
      //   name: 'ScheduleTask',
      //   meta: { title: '单表排程', icon: 'document', roles: ['production', 'admin'] }
      // },
      {
        path: 'manual-schedule',
        component: () => import('@/views/production/manualSchedule'),
        name: 'ManualSchedule',
        meta: { title: '手动排程', icon: 'edit', roles: ['production', 'admin', 'plan', 'scheduler'] }
      },
      {
        path: 'personnel-schedule',
        component: () => import('@/views/production/personnelSchedule'),
        name: 'PersonnelSchedule',
        meta: { title: '设备人员排单', icon: 'peoples', roles: ['production', 'admin', 'plan', 'scheduler'] }
      },
      // {
      //   path: 'coating-schedule-board',
      //   component: () => import('@/views/production/coatingScheduleBoard'),
      //   name: 'CoatingScheduleBoard',
      //   meta: { title: '排程看板', icon: 'dashboard', roles: ['production', 'admin'] }
      // },
      // {
      //   path: 'schedule-plan-board',
      //   component: () => import('@/views/production/schedulePlanBoard'),
      //   name: 'SchedulePlanBoard',
      //   meta: { title: '日排程看板', icon: 'calendar', roles: ['production', 'admin'] }
      // },
      {
        path: 'basic-info',
        component: () => import('@/components/ParentView'),
        name: 'BasicInfo',
        redirect: '/production/basic-info/equipment',
        meta: { title: '基础信息', icon: 'component', roles: ['production', 'admin', 'plan'] },
        children: [
          {
            path: 'equipment',
            component: () => import('@/views/production/equipment'),
            name: 'EquipmentManagement',
            meta: { title: '设备管理', icon: 'component', roles: ['production', 'admin', 'plan'] }
          },
          {
            path: 'equipment-schedule-config',
            component: () => import('@/views/production/equipmentScheduleConfig'),
            name: 'EquipmentScheduleConfig',
            meta: { title: '设备排程状态', icon: 'calendar', roles: ['production', 'admin', 'plan'] }
          },
          {
            path: 'equipment-daily-planning',
            component: () => import('@/views/production/equipmentDailyPlanning'),
            name: 'EquipmentDailyPlanning',
            meta: { title: '设备日历排班', icon: 'date', roles: ['production', 'admin', 'plan'] }
          },
          {
            path: 'urgent-preempt-config',
            component: () => import('@/views/production/urgentPreemptConfig'),
            name: 'UrgentPreemptConfig',
            meta: { title: '急单抢占参数', icon: 'setting', roles: ['production', 'admin', 'plan'] }
          },
          {
            path: 'staff',
            redirect: '/administration/personnel',
            name: 'ProductionStaffRedirect',
            hidden: true,
            meta: { title: '人员管理', icon: 'peoples', roles: ['production', 'admin', 'plan'] }
          },
          {
            path: 'coating-process-params',
            component: () => import('@/views/production/coatingProcessParams'),
            name: 'CoatingProcessParams',
            meta: { title: '涂布工艺参数', icon: 'edit', roles: ['production', 'admin', 'plan'] }
          },
          {
            path: 'process-params',
            redirect: '/production/basic-info/coating-process-params',
            hidden: true,
            meta: { title: '工艺参数(旧版已下线)', roles: ['production', 'admin', 'plan'] }
          },
          {
            path: 'rewinding-process-params',
            component: () => import('@/views/production/rewindingProcessParams'),
            name: 'RewindingProcessParams',
            meta: { title: '复卷工艺参数', icon: 'edit', roles: ['production', 'admin', 'plan'] }
          },
          {
            path: 'slitting-process-params',
            component: () => import('@/views/production/slittingProcessParams'),
            name: 'SlittingProcessParams',
            meta: { title: '分切工艺参数', icon: 'edit', roles: ['production', 'admin', 'plan'] }
          },
          {
            path: 'safety-stock',
            component: () => import('@/views/production/safetyStock'),
            name: 'SafetyStock',
            meta: { title: '安全库存', icon: 'chart', roles: ['production', 'admin', 'warehouse', 'plan'] }
          },
          {
            path: 'print-config',
            redirect: '/basic-data/print-config',
            name: 'ProductionPrintConfigRedirect',
            hidden: true,
            meta: { title: '打印配置', icon: 'el-icon-printer', roles: ['production', 'admin', 'plan'] }
          }
        ]
      }
      // ,{
      //   path: 'cost-tracking',
      //   component: () => import('@/views/production/costTracking'),
      //   name: 'CostTracking',
      //   meta: { title: '成本追溯', icon: 'money', roles: ['production', 'admin', 'finance'] }
      // }
    ]
  },
  {
    path: '/basic-data',
    component: Layout,
    name: 'BasicData',
    redirect: '/basic-data/company-config',
    meta: { title: '基本资料', icon: 'documentation', roles: ['production', 'admin'] },
    children: [
      {
        path: 'company-config',
        component: () => import('@/views/production/companyConfig'),
        name: 'CompanyConfig',
        meta: { title: '公司信息配置', icon: 'el-icon-office-building', roles: ['production', 'admin'] }
      },
      {
        path: 'print-config',
        component: () => import('@/views/production/printConfig'),
        name: 'PrintConfig',
        meta: { title: '打印配置', icon: 'el-icon-printer', roles: ['production', 'admin'] }
      },
      {
        path: 'label-qr-rule-config',
        component: () => import('@/views/production/labelQrRuleConfig'),
        name: 'LabelQrRuleConfig',
        meta: { title: '二维码规则管理', icon: 'el-icon-document', roles: ['production', 'admin'] }
      }
    ]
  },
  {
    path: '/administration',
    component: Layout,
    name: 'Administration',
    redirect: '/administration/personnel',
    meta: { title: '行政模块', icon: 'el-icon-office-building', roles: ['production', 'admin'] },
    children: [
      {
        path: 'personnel',
        component: () => import('@/views/production/staff'),
        name: 'AdministrationPersonnel',
        meta: { title: '人员管理', icon: 'peoples', roles: ['production', 'admin'] }
      },
      {
        path: 'leave-management',
        component: () => import('@/views/production/staff'),
        name: 'AdministrationLeaveManagement',
        meta: { title: '请假管理', icon: 'el-icon-date', roles: ['production', 'admin'] }
      },
      {
        path: 'overtime-management',
        component: () => import('@/views/production/staff'),
        name: 'AdministrationOvertimeManagement',
        meta: { title: '加班管理', icon: 'el-icon-time', roles: ['production', 'admin'] }
      }
    ]
  },
  {
    path: '/production-management',
    component: Layout,
    name: 'ProductionManagementRoot',
    redirect: '/production-management/coating-home',
    meta: { title: '生产管理', icon: 'el-icon-s-operation', roles: ['production', 'admin', 'packaging', 'packing', 'coating'] },
    children: [
      {
        path: 'coating-home',
        component: () => import('@/views/production/coatingHome'),
        name: 'ProductionManagementCoatingHome',
        meta: { title: '涂布首页', icon: 'dashboard', roles: ['production', 'admin', 'coating'] }
      },
      {
        path: 'coating',
        component: () => import('@/views/production/coatingTasks'),
        name: 'ProductionManagementCoating',
        meta: { title: '涂布任务', icon: 'list', roles: ['production', 'admin', 'coating'] }
      },
      {
        path: 'rewinding',
        component: () => import('@/views/production/rewindingTasks'),
        name: 'ProductionManagementRewinding',
        meta: { title: '复卷任务', icon: 'list', roles: ['production', 'admin', 'packaging', 'packing'] }
      },
      {
        path: 'slitting',
        component: () => import('@/views/production/slittingTasks'),
        name: 'ProductionManagementSlitting',
        meta: { title: '分切任务', icon: 'list', roles: ['production', 'admin', 'packaging', 'packing'] }
      },
      {
        path: 'material-history',
        component: () => import('@/views/production/materialIssueHistory'),
        name: 'ProductionMaterialHistory',
        meta: { title: '锁定/领退料追溯', icon: 'el-icon-document', roles: ['production', 'admin'] }
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
        meta: { title: '来料检验', icon: 'el-icon-truck', roles: ['quality', 'admin', 'production'] }
      },
      {
        path: 'process',
        component: () => import('@/views/quality/process'),
        name: 'ProcessInspection',
        meta: { title: '过程检验', icon: 'el-icon-setting', roles: ['quality', 'admin', 'production'] }
      },
      {
        path: 'outbound',
        component: () => import('@/views/quality/outbound'),
        name: 'OutboundInspection',
        meta: { title: '出货检验', icon: 'el-icon-sell', roles: ['quality', 'admin', 'production'] }
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
