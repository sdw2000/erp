# 🚀 方案A 完整实现计划 - 批排程功能

## 📋 实现概览

这是方案A（**独立排程关联表**）的完整实现计划。

### 核心表结构
```
sales_orders (订单头)
├─ id, order_no, customer, order_qty
│
└─→ sales_order_items (订单明细) ★ 关键
    ├─ id, order_id, material_code
    ├─ order_qty          订单数量（原始）
    ├─ pending_qty ← ★    待排数量（关键字段）
    ├─ produced_qty       已生产数量
    └─ status
    
    └─→ schedule_order_item (排程关联表) ★ 新增
        ├─ id, order_item_id
        ├─ schedule_date     排程日期
        ├─ schedule_qty ← ★  本次排程数量
        └─ status
        
        └─→ schedule_task (工序任务)
            ├─ schedule_item_id
            ├─ task_type (涂布、复卷等)
            └─ quantity
```

---

## 📍 实现步骤

### 第1步：数据库变更 ✅

#### 1.1 检查/添加字段

```sql
-- 在 sales_order_items 表中添加字段（如不存在）
ALTER TABLE sales_order_items ADD COLUMN (
  pending_qty INT DEFAULT 0 COMMENT '待排数量',
  produced_qty INT DEFAULT 0 COMMENT '已生产数量',
  scheduled_qty INT DEFAULT 0 COMMENT '已排程数量'
);

-- 添加检查约束
ALTER TABLE sales_order_items ADD CONSTRAINT check_pending_qty CHECK (pending_qty >= 0);
ALTER TABLE sales_order_items ADD CONSTRAINT check_quantities 
  CHECK (pending_qty + produced_qty <= order_qty);

-- 创建索引以提高查询性能
CREATE INDEX idx_sales_order_items_pending_qty 
  ON sales_order_items(pending_qty) 
  WHERE pending_qty > 0;
```

#### 1.2 创建排程关联表

```sql
-- 【新表】排程订单明细表 - 记录每一次排程操作
CREATE TABLE schedule_order_item (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  
  -- 关键字段
  order_item_id BIGINT NOT NULL COMMENT '关联sales_order_items.id',
  schedule_qty INT NOT NULL COMMENT '本次排程数量',
  
  -- 排程信息
  schedule_date DATE NOT NULL COMMENT '排程日期',
  schedule_no VARCHAR(50) COMMENT '排程单号',
  
  -- 状态
  status VARCHAR(20) DEFAULT 'pending' COMMENT '排程状态：pending/confirmed/producing/completed/cancelled',
  
  -- 审计字段
  created_by VARCHAR(50) COMMENT '创建人',
  created_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_by VARCHAR(50) COMMENT '修改人',
  updated_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- 约束
  FOREIGN KEY (order_item_id) REFERENCES sales_order_items(id),
  KEY idx_order_item_id (order_item_id),
  KEY idx_schedule_date (schedule_date),
  KEY idx_status (status)
) COMMENT = '排程订单明细表';

-- 【新表】排程任务表 - 各工序任务
CREATE TABLE schedule_task (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  
  schedule_item_id BIGINT NOT NULL COMMENT '关联schedule_order_item.id',
  task_type VARCHAR(20) NOT NULL COMMENT '工序类型：coating/rewinding/slitting/stripping',
  
  quantity INT COMMENT '数量',
  plan_duration INT COMMENT '计划时长(分钟)',
  
  status VARCHAR(20) DEFAULT 'pending' COMMENT '状态',
  
  created_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (schedule_item_id) REFERENCES schedule_order_item(id),
  KEY idx_schedule_item_id (schedule_item_id)
) COMMENT = '排程任务表';
```

#### 1.3 初始化现有订单的 pending_qty

```sql
-- 查询现有订单：初始化 pending_qty = order_qty - produced_qty
UPDATE sales_order_items soi
SET pending_qty = order_qty - COALESCE(produced_qty, 0)
WHERE pending_qty = 0;

-- 验证初始化结果
SELECT 
  id, 
  order_qty, 
  pending_qty, 
  produced_qty,
  pending_qty + produced_qty as total
FROM sales_order_items 
WHERE pending_qty = 0 OR pending_qty < 0 
LIMIT 10;
```

---

### 第2步：后端接口实现

#### 2.1 获取待排程订单 API

**文件**：`ProductionScheduleController.java`

```java
/**
 * 获取待排程订单（pending_qty > 0）
 */
@GetMapping("/pending-orders")
public ResponseResult<Map<String, Object>> getPendingOrderItems(
        @RequestParam(defaultValue = "1") Integer pageNum,
        @RequestParam(defaultValue = "20") Integer pageSize,
        @RequestParam(required = false) String customerLevel,
        @RequestParam(required = false) String materialCode) {
    
    Map<String, Object> params = new HashMap<>();
    params.put("pageNum", pageNum);
    params.put("pageSize", pageSize);
    params.put("customerLevel", customerLevel);
    params.put("materialCode", materialCode);
    
    List<SalesOrderItem> list = scheduleService.getPendingOrderItems(params);
    PageInfo<SalesOrderItem> pageInfo = new PageInfo<>(list);
    
    Map<String, Object> result = new HashMap<>();
    result.put("list", list);
    result.put("total", pageInfo.getTotal());
    
    return ResponseResult.success(result);
}
```

**SQL**：`ScheduleService.java`

```java
public List<SalesOrderItem> getPendingOrderItems(Map<String, Object> params) {
    // SQL: 只查询 pending_qty > 0 的订单
    // SELECT * FROM sales_order_items soi
    // JOIN sales_orders so ON soi.order_id = so.id
    // WHERE soi.pending_qty > 0
    // ORDER BY so.customer_level DESC, so.delivery_date ASC
}
```

#### 2.2 批排程 API（核心接口）

**文件**：`ProductionScheduleController.java`

```java
/**
 * 批量排程 - 方案A
 * 
 * 请求体：
 * {
 *   "scheduleDate": "2026-01-10",
 *   "scheduleType": "order",
 *   "details": [
 *     { "order_item_id": 1, "schedule_qty": 60 },
 *     { "order_item_id": 2, "schedule_qty": 50 }
 *   ],
 *   "operator": "admin"
 * }
 */
@PostMapping("/batch-schedule")
public ResponseResult<Map<String, Object>> batchSchedule(
        @RequestBody BatchScheduleRequest request) {
    
    try {
        // 调用服务处理排程
        Map<String, Object> result = scheduleService.batchSchedule(request);
        return ResponseResult.success(result);
    } catch (Exception e) {
        return ResponseResult.error("批排程失败: " + e.getMessage());
    }
}
```

#### 2.3 批排程服务实现（关键）

**文件**：`ProductionScheduleService.java`

```java
@Transactional
public Map<String, Object> batchSchedule(BatchScheduleRequest request) {
    List<ScheduleDetail> details = request.getDetails();
    String scheduleDate = request.getScheduleDate();
    String operator = request.getOperator();
    
    // ===== 第1步：验证 =====
    for (ScheduleDetail detail : details) {
        // 获取订单明细
        SalesOrderItem orderItem = salesOrderItemDAO.selectById(detail.getOrderItemId());
        if (orderItem == null) {
            throw new RuntimeException("订单明细不存在: " + detail.getOrderItemId());
        }
        
        // 验证排程数量不超过待排数量
        if (detail.getScheduleQty() > orderItem.getPendingQty()) {
            throw new RuntimeException(
              String.format("订单 %s 排程数量 %d 超过待排数量 %d",
                orderItem.getMaterialCode(),
                detail.getScheduleQty(),
                orderItem.getPendingQty())
            );
        }
        
        // 验证排程数量 > 0
        if (detail.getScheduleQty() <= 0) {
            throw new RuntimeException("排程数量必须大于0");
        }
    }
    
    // ===== 第2步：创建排程关联记录 =====
    List<ScheduleOrderItem> scheduleItems = new ArrayList<>();
    for (ScheduleDetail detail : details) {
        ScheduleOrderItem scheduleItem = new ScheduleOrderItem();
        scheduleItem.setOrderItemId(detail.getOrderItemId());
        scheduleItem.setScheduleQty(detail.getScheduleQty());
        scheduleItem.setScheduleDate(LocalDate.parse(scheduleDate));
        scheduleItem.setStatus("pending");
        scheduleItem.setCreatedBy(operator);
        
        scheduleOrderItemDAO.insert(scheduleItem);
        scheduleItems.add(scheduleItem);
    }
    
    // ===== 第3步：更新待排数量 =====
    for (ScheduleDetail detail : details) {
        // 关键SQL：UPDATE sales_order_items SET pending_qty = pending_qty - ?
        salesOrderItemDAO.updatePendingQty(
            detail.getOrderItemId(),
            detail.getScheduleQty()
        );
    }
    
    // ===== 第4步：创建工序任务 =====
    for (ScheduleOrderItem scheduleItem : scheduleItems) {
        // 为每条排程记录创建涂布、复卷等任务
        createScheduleTasks(scheduleItem);
    }
    
    // ===== 返回结果 =====
    Map<String, Object> result = new HashMap<>();
    result.put("scheduleCount", details.size());
    result.put("totalQty", details.stream()
      .mapToInt(ScheduleDetail::getScheduleQty)
      .sum());
    result.put("scheduleItems", scheduleItems);
    
    return result;
}

/**
 * 更新待排数量 - 关键SQL
 */
public void updatePendingQty(Long orderItemId, Integer decrementQty) {
    // SQL: UPDATE sales_order_items 
    //      SET pending_qty = pending_qty - ?
    //      WHERE id = ?
    
    // 验证更新后 pending_qty >= 0
    SalesOrderItem item = selectById(orderItemId);
    if (item.getPendingQty() - decrementQty < 0) {
        throw new RuntimeException("待排数量不足");
    }
}

/**
 * 为排程记录创建工序任务
 */
private void createScheduleTasks(ScheduleOrderItem scheduleItem) {
    // 获取订单明细
    SalesOrderItem orderItem = salesOrderItemDAO.selectById(
        scheduleItem.getOrderItemId()
    );
    
    // 根据产品类型创建不同的工序任务
    // 例如：
    // 1. 涂布任务
    ScheduleTask coatingTask = new ScheduleTask();
    coatingTask.setScheduleItemId(scheduleItem.getId());
    coatingTask.setTaskType("coating");
    coatingTask.setQuantity(scheduleItem.getScheduleQty());
    coatingTask.setStatus("pending");
    scheduleTaskDAO.insert(coatingTask);
    
    // 2. 复卷任务
    ScheduleTask rewindingTask = new ScheduleTask();
    rewindingTask.setScheduleItemId(scheduleItem.getId());
    rewindingTask.setTaskType("rewinding");
    rewindingTask.setQuantity(scheduleItem.getScheduleQty());
    rewindingTask.setStatus("pending");
    scheduleTaskDAO.insert(rewindingTask);
}
```

#### 2.4 查询排程历史

```java
/**
 * 查询特定订单明细的排程历史
 */
@GetMapping("/schedule-history/{orderItemId}")
public ResponseResult<List<ScheduleOrderItem>> getScheduleHistory(
        @PathVariable Long orderItemId) {
    
    List<ScheduleOrderItem> history = 
        scheduleOrderItemDAO.selectByOrderItemId(orderItemId);
    return ResponseResult.success(history);
}
```

---

### 第3步：前端实现

#### 3.1 已完成的功能 ✅

前端表格已包含：
- ✅ "待排数量"列（显示 pending_qty）
- ✅ "本次排程"列（可编辑的 el-input-number）
- ✅ validateScheduleQty() 方法
- ✅ batchSchedule() 方法（已改进）

#### 3.2 需要更新的地方

**文件**：`src/api/schedule.js`

```javascript
// 新增API调用
export function getPendingOrderItems(params) {
  return request({
    url: '/api/production/schedule/pending-orders',
    method: 'get',
    params
  })
}

// 修改批排程API
export function autoSchedule(data) {
  return request({
    url: '/api/production/schedule/batch-schedule',  // 新端点
    method: 'post',
    data
  })
}

// 查询排程历史
export function getScheduleHistory(orderItemId) {
  return request({
    url: `/api/production/schedule/schedule-history/${orderItemId}`,
    method: 'get'
  })
}
```

#### 3.3 可选增强：排程历史展示

在表格中添加"排程历史"列（可展开），点击展开显示该订单曾经排过的所有批次：

```vue
<!-- 排程历史展示 -->
<el-table-column type="expand" width="50">
  <template slot-scope="{ row }">
    <div style="padding: 10px 20px">
      <h5>排程历史</h5>
      <el-table 
        :data="row.scheduleHistory" 
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
```

---

### 第4步：集成测试

#### 4.1 测试场景

```javascript
// 场景1：单次排程
{
  "scheduleDate": "2026-01-10",
  "details": [
    { "order_item_id": 1, "schedule_qty": 60 }
  ]
}
// 预期：pending_qty: 100→40, schedule_order_item表新增1条记录

// 场景2：分批排程
// 第一次排程
{ "order_item_id": 1, "schedule_qty": 60 } → pending_qty: 100→40
// 第二次排程
{ "order_item_id": 1, "schedule_qty": 30 } → pending_qty: 40→10
// 第三次排程
{ "order_item_id": 1, "schedule_qty": 10 } → pending_qty: 10→0 ✓
// 预期：schedule_order_item表新增3条记录，分别为60/30/10

// 场景3：多订单排程
{
  "details": [
    { "order_item_id": 1, "schedule_qty": 60 },
    { "order_item_id": 2, "schedule_qty": 50 },
    { "order_item_id": 3, "schedule_qty": 40 }
  ]
}
// 预期：3个订单各减少对应数量，创建3条排程记录
```

#### 4.2 验证SQL

```sql
-- 验证1：查看待排程订单（pending_qty > 0）
SELECT id, order_qty, pending_qty, produced_qty 
FROM sales_order_items 
WHERE pending_qty > 0;

-- 验证2：查看排程历史
SELECT soi.id, soi.order_qty, soi.pending_qty,
       soi_schedule.id as schedule_id, soi_schedule.schedule_qty, soi_schedule.schedule_date
FROM sales_order_items soi
LEFT JOIN schedule_order_item soi_schedule ON soi.id = soi_schedule.order_item_id
WHERE soi.id = 1
ORDER BY soi_schedule.schedule_date;

-- 验证3：统计已排程总数
SELECT order_item_id, SUM(schedule_qty) as total_scheduled_qty
FROM schedule_order_item
WHERE order_item_id = 1
GROUP BY order_item_id;

-- 验证4：检查数据一致性
SELECT id, order_qty, 
       (pending_qty + produced_qty) as used_qty,
       CASE WHEN pending_qty + produced_qty <= order_qty THEN '✓' ELSE '✗' END as valid
FROM sales_order_items;
```

---

## 🎯 关键设计要点

| 设计点 | 说明 | 代码位置 |
|------|------|--------|
| **pending_qty 初始化** | = order_qty | 订单创建或迁移时 |
| **pending_qty 递减** | 每次排程后 -= schedule_qty | updatePendingQty() |
| **排程记录保存** | INSERT schedule_order_item | batchSchedule() |
| **分批排程** | 多条schedule_order_item记录 | 支持多次INSERT |
| **验证逻辑** | schedule_qty ≤ pending_qty | batchSchedule() 第1步 |
| **事务处理** | @Transactional 保证一致性 | batchSchedule() |
| **工序任务** | 为每条排程创建任务 | createScheduleTasks() |

---

## ✅ 检查清单

### 后端实现
- [ ] 添加 pending_qty、produced_qty、scheduled_qty 字段
- [ ] 创建 schedule_order_item 表
- [ ] 创建 schedule_task 表
- [ ] 实现 getPendingOrderItems() API
- [ ] 实现 batchSchedule() API（核心）
- [ ] 实现 updatePendingQty() 方法
- [ ] 实现 createScheduleTasks() 方法
- [ ] 添加 @Transactional 保证事务一致性
- [ ] 编写单元测试

### 前端实现
- [ ] 调用 getPendingOrderItems() 加载待排程订单
- [ ] 初始化 schedule_qty = pending_qty
- [ ] 验证 validateScheduleQty()（已完成 ✓）
- [ ] 调用 batchSchedule() 提交排程（已完成 ✓）
- [ ] 排程后刷新表格显示最新的 pending_qty
- [ ] （可选）显示排程历史

### 数据库初始化
- [ ] 执行SQL添加字段
- [ ] 执行SQL创建新表
- [ ] 执行初始化脚本计算 pending_qty
- [ ] 验证数据一致性

---

## 📚 相关文档
- `排程关联表设计方案对比.md` - 方案对比
- `未排程数量快速指南.md` - 快速参考
- `批排程完整实现方案.md` - 实现细节
