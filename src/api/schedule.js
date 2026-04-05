import request from '@/utils/request'

// ========== 排程主表接口 ==========

/**
 * 获取排程列表
 */
export function getScheduleList(params) {
  return request({
    url: '/api/production/schedule/list',
    method: 'get',
    params
  })
}

/**
 * 获取排程详情
 */
export function getScheduleById(id) {
  return request({
    url: `/api/production/schedule/${id}`,
    method: 'get'
  })
}

/**
 * 创建排程
 */
export function createSchedule(data) {
  return request({
    url: '/api/production/schedule',
    method: 'post',
    data
  })
}

/**
 * 更新排程
 */
export function updateSchedule(id, data) {
  return request({
    url: `/api/production/schedule/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除排程
 */
export function deleteSchedule(id, operator = 'admin') {
  return request({
    url: `/api/production/schedule/${id}`,
    method: 'delete',
    params: { operator }
  })
}

/**
 * 确认排程
 */
export function confirmSchedule(id, operator = 'admin') {
  return request({
    url: `/api/production/schedule/${id}/confirm`,
    method: 'post',
    params: { operator }
  })
}

/**
 * 取消排程
 */
export function cancelSchedule(id, operator = 'admin') {
  return request({
    url: `/api/production/schedule/${id}/cancel`,
    method: 'post',
    params: { operator }
  })
}

/**
 * 智能排程
 */
export function autoSchedule(data) {
  return request({
    url: '/api/production/schedule/auto',
    method: 'post',
    data
  })
}

/**
 * 获取待排程订单明细
 */
export function getPendingOrderItems(params) {
  return request({
    url: '/api/production/schedule/pending-orders',
    method: 'get',
    params
  })
}

/**
 * 获取排程统计
 */
export function getScheduleStatistics() {
  return request({
    url: '/api/production/schedule/statistics',
    method: 'get'
  })
}

// ========== 涂布任务接口 ==========

/**
 * 获取涂布任务列表
 */
export function getCoatingTasks(params) {
  return request({
    url: '/api/production/schedule/coating/list',
    method: 'get',
    params
  })
}

/**
 * 添加涂布任务
 */
export function addCoatingTask(data) {
  return request({
    url: '/api/production/schedule/coating',
    method: 'post',
    data
  })
}

/**
 * 更新涂布任务
 */
export function updateCoatingTask(id, data) {
  return request({
    url: `/api/production/schedule/coating/${id}`,
    method: 'put',
    data
  })
}

/**
 * 开始涂布任务
 */
export function startCoatingTask(id, operator = 'admin') {
  return request({
    url: `/api/production/schedule/coating/${id}/start`,
    method: 'post',
    params: { operator }
  })
}

/**
 * 完成涂布任务
 */
export function completeCoatingTask(id, outputBatchNo, operator = 'admin') {
  return request({
    url: `/api/production/schedule/coating/${id}/complete`,
    method: 'post',
    params: { outputBatchNo, operator }
  })
}

// ========== 复卷任务接口 ==========

/**
 * 获取复卷任务列表
 */
export function getRewindingTasks(params) {
  return request({
    url: '/api/production/schedule/rewinding/list',
    method: 'get',
    params
  })
}

/**
 * 添加复卷任务
 */
export function addRewindingTask(data) {
  return request({
    url: '/api/production/schedule/rewinding',
    method: 'post',
    data
  })
}

// 更新复卷任务设备
export function updateRewindingEquipment(data) {
  return request({
    url: '/api/production/schedule/rewinding/equipment',
    method: 'post',
    data
  })
}

// 调整复卷任务时间
export function adjustRewindingTaskTime(taskId, data) {
  return request({
    url: `/api/production/schedule/rewinding/adjust-time/${taskId}`,
    method: 'post',
    data
  })
}

// ========== 分切任务接口 ==========

/**
 * 获取分切任务列表
 */
export function getSlittingTasks(params) {
  return request({
    url: '/api/production/schedule/slitting/list',
    method: 'get',
    params
  })
}

/**
 * 添加分切任务
 */
export function addSlittingTask(data) {
  return request({
    url: '/api/production/schedule/slitting',
    method: 'post',
    data
  })
}

// ========== 分条任务接口 ==========

/**
 * 获取分条任务列表
 */
export function getStrippingTasks(params) {
  return request({
    url: '/api/production/schedule/stripping/list',
    method: 'get',
    params
  })
}

/**
 * 添加分条任务
 */
export function addStrippingTask(data) {
  return request({
    url: '/api/production/schedule/stripping',
    method: 'post',
    data
  })
}

// ========== 生产报工接口 ==========

/**
 * 获取报工记录列表
 */
export function getReportList(params) {
  return request({
    url: '/api/production/schedule/report/list',
    method: 'get',
    params
  })
}

/**
 * 提交报工
 */
export function submitReport(data) {
  return request({
    url: '/api/production/schedule/report',
    method: 'post',
    data
  })
}

/**
 * 获取今日产量
 */
export function getTodayOutput() {
  return request({
    url: '/api/production/schedule/report/today-output',
    method: 'get'
  })
}

/**
 * 获取当班当月/当年生产报工总平米数
 */
export function getShiftProductionSummary(params) {
  return request({
    url: '/api/production/schedule/report/shift-summary',
    method: 'get',
    params
  })
}

// ========== 生产看板接口 ==========

/**
 * 获取设备看板数据
 */
export function getEquipmentBoard(planDate) {
  return request({
    url: '/api/production/schedule/board/equipment',
    method: 'get',
    params: { planDate }
  })
}

/**
 * 获取进度看板数据
 */
export function getProgressBoard(planDate) {
  return request({
    url: '/api/production/schedule/board/progress',
    method: 'get',
    params: { planDate }
  })
}

// ========== 印刷任务接口 ==========

/**
 * 获取印刷任务列表
 */
export function getPrintingTasks(params) {
  return request({
    url: '/api/production/schedule/printing/list',
    method: 'get',
    params
  })
}

/**
 * 添加印刷任务
 */
export function addPrintingTask(data) {
  return request({
    url: '/api/production/schedule/printing',
    method: 'post',
    data
  })
}

/**
 * 更新印刷任务
 */
export function updatePrintingTask(id, data) {
  return request({
    url: `/api/production/schedule/printing/${id}`,
    method: 'put',
    data
  })
}

/**
 * 开始印刷任务
 */
export function startPrintingTask(id, operator = 'admin') {
  return request({
    url: `/api/production/schedule/printing/${id}/start`,
    method: 'post',
    params: { operator }
  })
}

/**
 * 完成印刷任务
 */
export function completePrintingTask(id, outputBatchNo, operator = 'admin') {
  return request({
    url: `/api/production/schedule/printing/${id}/complete`,
    method: 'post',
    params: { outputBatchNo, operator }
  })
}

// ========== 质检接口 ==========

/**
 * 获取质检记录列表
 */
export function getInspectionList(params) {
  return request({
    url: '/api/production/schedule/inspection/list',
    method: 'get',
    params
  })
}

/**
 * 添加质检记录
 */
export function addInspection(data) {
  return request({
    url: '/api/production/schedule/inspection',
    method: 'post',
    data
  })
}

/**
 * 更新质检记录
 */
export function updateInspection(id, data) {
  return request({
    url: `/api/production/schedule/inspection/${id}`,
    method: 'put',
    data
  })
}

// ========== 紧急插单接口 ==========

/**
 * 获取紧急插单列表
 */
export function getUrgentOrderList(params) {
  return request({
    url: '/api/production/schedule/urgent/list',
    method: 'get',
    params
  })
}

/**
 * 申请紧急插单
 */
export function applyUrgentOrder(data) {
  return request({
    url: '/api/production/schedule/urgent/apply',
    method: 'post',
    data
  })
}

/**
 * 审批紧急插单
 */
export function approveUrgentOrder(id, approved, remark, operator = 'admin') {
  return request({
    url: `/api/production/schedule/urgent/${id}/approve`,
    method: 'post',
    params: { approved, remark, operator }
  })
}

// ========== 排程审批接口 ==========

/**
 * 提交排程审批
 */
export function submitScheduleApproval(id, operator = 'admin') {
  return request({
    url: `/api/production/schedule/${id}/submit-approval`,
    method: 'post',
    params: { operator }
  })
}

/**
 * 审批排程
 */
export function approveSchedule(id, approved, remark, operator = 'admin') {
  return request({
    url: `/api/production/schedule/${id}/approve`,
    method: 'post',
    params: { approved, remark, operator }
  })
}

/**
 * 获取排程审批日志
 */
export function getApprovalLogs(scheduleId) {
  return request({
    url: `/api/production/schedule/${scheduleId}/approval-logs`,
    method: 'get'
  })
}

// ========== 甘特图数据接口 ==========

/**
 * 获取甘特图数据
 */
export function getGanttData(params) {
  return request({
    url: '/api/production/schedule/gantt',
    method: 'get',
    params
  })
}
