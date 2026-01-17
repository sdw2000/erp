// ============================================================
// 前端 API 修改 - 批排程功能 (方案A)
// 文件: src/api/schedule.js
// ============================================================

import request from '@/utils/request'

// ===== 排程列表相关 API =====

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
export function deleteSchedule(id) {
  return request({
    url: `/api/production/schedule/${id}`,
    method: 'delete'
  })
}

/**
 * 确认排程
 */
export function confirmSchedule(id) {
  return request({
    url: `/api/production/schedule/${id}/confirm`,
    method: 'post'
  })
}

// ===== 待排程订单相关 API （新增）=====

/**
 * 获取待排程订单 ★ 新接口
 * 
 * 返回格式:
 * {
 *   code: 200,
 *   data: {
 *     list: [
 *       {
 *         id: 1,
 *         order_item_id: 1,
 *         order_no: "PO-001",
 *         customer: "ABC公司",
 *         material_code: "TAPE-001",
 *         order_qty: 100,
 *         pending_qty: 40,    ← 待排数量
 *         produced_qty: 60,
 *         delivery_date: "2026-01-15",
 *         schedule_qty: 0     ← 初始化为0，前端会设置为pending_qty
 *       },
 *       ...
 *     ],
 *     total: 50
 *   }
 * }
 */
export function getPendingOrderItems(params) {
  return request({
    url: '/api/production/schedule/pending-orders',
    method: 'get',
    params: {
      pageNum: params.pageNum || 1,
      pageSize: params.pageSize || 20,
      customerLevel: params.customerLevel,
      materialCode: params.materialCode
    }
  })
}

// ===== 批排程相关 API （修改）=====

/**
 * 批量排程 ★ 修改版本（原名 autoSchedule）
 * 
 * 请求格式:
 * {
 *   scheduleDate: "2026-01-10",
 *   scheduleType: "order",
 *   details: [
 *     { order_item_id: 1, schedule_qty: 60 },   ← 用户输入的排程数量
 *     { order_item_id: 2, schedule_qty: 50 }
 *   ],
 *   operator: "admin"
 * }
 * 
 * 响应格式:
 * {
 *   code: 200,
 *   data: {
 *     success: true,
 *     scheduleCount: 2,
 *     totalQty: 110,
 *     message: "成功排程 2 个订单，共 110 卷"
 *   }
 * }
 */
export function autoSchedule(data) {
  // ★ 修改端点从 /auto 改为 /batch-schedule
  return request({
    url: '/api/production/schedule/batch-schedule',
    method: 'post',
    data: {
      scheduleDate: data.scheduleDate,
      scheduleType: data.scheduleType || 'order',
      details: data.details,  // ★ 新参数：包含order_item_id和schedule_qty的数组
      operator: data.operator || 'admin'
    }
  })
}

// ===== 排程历史相关 API （新增）=====

/**
 * 获取订单的排程历史
 * 
 * 返回格式:
 * {
 *   code: 200,
 *   data: [
 *     {
 *       id: 1,
 *       order_item_id: 1,
 *       schedule_qty: 60,
 *       schedule_date: "2026-01-10",
 *       status: "completed",
 *       created_by: "admin",
 *       created_time: "2026-01-10 10:30:00"
 *     },
 *     {
 *       id: 2,
 *       order_item_id: 1,
 *       schedule_qty: 30,
 *       schedule_date: "2026-01-11",
 *       status: "completed",
 *       created_by: "admin",
 *       created_time: "2026-01-11 08:00:00"
 *     }
 *   ]
 * }
 */
export function getScheduleHistory(orderItemId) {
  return request({
    url: `/api/production/schedule/schedule-history/${orderItemId}`,
    method: 'get'
  })
}

// ===== 生产看板相关 API =====

/**
 * 获取生产进度看板数据
 */
export function getProgressBoard(date) {
  return request({
    url: '/api/production/schedule/progress-board',
    method: 'get',
    params: { date }
  })
}

/**
 * 获取设备状态看板
 */
export function getEquipmentBoard(date) {
  return request({
    url: '/api/production/schedule/equipment-board',
    method: 'get',
    params: { date }
  })
}

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

/**
 * 质检相关
 */
export function getInspectionList(params) {
  return request({
    url: '/api/production/inspection/list',
    method: 'get',
    params
  })
}

/**
 * 审批相关
 */
export function submitScheduleApproval(id) {
  return request({
    url: `/api/production/schedule/${id}/submit-approval`,
    method: 'post'
  })
}

export function approveSchedule(id) {
  return request({
    url: `/api/production/schedule/${id}/approve`,
    method: 'post'
  })
}

// ============================================================
// 前端 Vue 组件修改指南
// 文件: src/views/production/schedule.vue
// ============================================================

/*
修改指南：

1. 【methods 中的 loadPendingOrders】- 已正确实现 ✓
   
   已有代码：
   ```javascript
   async loadPendingOrders() {
     this.pendingLoading = true
     try {
       const res = await getPendingOrderItems(this.pendingParams)
       if (res.code === 200) {
         this.pendingOrders = res.data.list || []
         this.pendingTotal = res.data.total || 0
         // ★ 初始化 schedule_qty = pending_qty
         this.pendingOrders.forEach(order => {
           if (!order.schedule_qty) {
             order.schedule_qty = order.pending_qty
           }
         })
       }
     } catch (error) {
       console.error('加载待排程订单失败:', error)
     } finally {
       this.pendingLoading = false
     }
   }
   ```
   
   状态：✓ 已完成

---

2. 【methods 中的 validateScheduleQty】- 已正确实现 ✓
   
   已有代码：
   ```javascript
   validateScheduleQty(row) {
     // 不能超过待排数量
     if (row.schedule_qty > row.pending_qty) {
       this.$message.warning(`最多只能排${row.pending_qty}卷`)
       row.schedule_qty = row.pending_qty
     }
     // 不能为负数
     if (row.schedule_qty < 0) {
       row.schedule_qty = 0
     }
   }
   ```
   
   状态：✓ 已完成

---

3. 【methods 中的 batchSchedule】- 已改进 ✓
   
   已有代码（改进版）：
   ```javascript
   batchSchedule() {
     // 检查是否有选中的订单，以及排程数量是否大于0
     const validOrders = this.selectedOrders.filter(o => o.schedule_qty > 0)
     if (validOrders.length === 0) {
       this.$message.warning('请选择订单并设置排程数量（>0）')
       return
     }
     
     // 显示确认对话框
     const totalQty = validOrders.reduce((sum, o) => sum + o.schedule_qty, 0)
     this.$confirm(
       `确认排程 ${validOrders.length} 个订单，总计 ${totalQty} 卷？`,
       '批量排程',
       {
         type: 'warning',
         confirmButtonText: '确定',
         cancelButtonText: '取消'
       }
     )
       .then(async () => {
         this.scheduling = true
         try {
           // ★ 关键：准备排程数据，使用 schedule_qty
           const scheduleDetails = validOrders.map(o => ({
             order_item_id: o.order_item_id,
             schedule_qty: o.schedule_qty
           }))
           
           const res = await autoSchedule({
             scheduleDate: this.formatDate(new Date()),
             scheduleType: 'order',
             details: scheduleDetails,  // ★ 新参数
             operator: 'admin'
           })
           
           if (res.code === 200) {
             this.$message.success(
               `排程成功！已排程 ${validOrders.length} 个订单`
             )
             this.selectedOrders = []
             this.loadScheduleList()
             this.loadPendingOrders()  // ★ 重新加载待排程订单
           } else {
             this.$message.error(res.message || '排程失败')
           }
         } catch (error) {
           this.$message.error('排程失败: ' + error.message)
         } finally {
           this.scheduling = false
         }
       })
       .catch(() => {})
   }
   ```
   
   状态：✓ 已完成

---

4. 【可选增强：排程历史展示】

   如需显示排程历史，在表格中添加展开行：
   
   ```vue
   <!-- 表格行 -->
   <el-table-column type="expand" width="50">
     <template slot-scope="{ row }">
       <div style="padding: 10px 20px">
         <h5 style="margin-bottom: 10px">排程历史</h5>
         <el-table 
           :data="getScheduleHistory(row.id)"
           border 
           size="small"
           style="width: 100%"
         >
           <el-table-column prop="schedule_qty" label="排程数量" width="80" />
           <el-table-column prop="schedule_date" label="排程日期" width="100" />
           <el-table-column prop="status" label="状态" width="80">
             <template slot-scope="scope">
               <el-tag :type="getStatusType(scope.row.status)" size="small">
                 {{ scope.row.status }}
               </el-tag>
             </template>
           </el-table-column>
           <el-table-column prop="created_by" label="操作人" width="80" />
         </el-table>
       </div>
     </template>
   </el-table-column>
   
   <!-- methods 中添加 -->
   getScheduleHistory(orderItemId) {
     // 调用API获取历史
     getScheduleHistory(orderItemId).then(res => {
       if (res.code === 200) {
         return res.data
       }
     })
     return []
   }
   ```

---

总结：
✓ 前端已基本完成方案A的实现
✓ 需要后端配合修改API端点和参数
✓ 需要执行数据库迁移脚本
*/
