# 📋 在销售订单表增加pending_qty字段 - 完整方案

## 核心思想

不使用单独的 `sales_order_items` 表来存储 pending_qty，而是直接在**销售订单表** (sales_orders) 中增加字段，简化设计。

---

## 🗂️ 数据库设计

### 原有表结构 (sales_orders)
```sql
CREATE TABLE sales_orders (
  id INT PRIMARY KEY,
  order_no VARCHAR(50) UNIQUE,
  customer VARCHAR(100),
  customer_level VARCHAR(10),
  delivery_date DATE,
  status VARCHAR(20),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### 修改后的表结构
```sql
ALTER TABLE sales_orders ADD COLUMN (
  order_qty INT DEFAULT 0,                -- 订单总数量
  pending_qty INT DEFAULT 0,              -- 待排程数量 (关键字段)
  produced_qty INT DEFAULT 0,             -- 已生产数量
  scheduled_qty INT DEFAULT 0             -- 已排程数量 (optional)
);

-- 添加约束
ALTER TABLE sales_orders 
ADD CONSTRAINT check_pending_qty CHECK (pending_qty >= 0);

ALTER TABLE sales_orders 
ADD CONSTRAINT check_produced_qty CHECK (produced_qty <= order_qty);

ALTER TABLE sales_orders 
ADD CONSTRAINT check_quantities CHECK (
  pending_qty + produced_qty <= order_qty
);
```

### 完整表结构示例
```
┌─────────────────────────────────────────────────────┐
│ sales_orders (销售订单表)                          │
├─────────────────────────────────────────────────────┤
│ id                     INT         主键            │
│ order_no              VARCHAR(50)  订单号          │
│ customer              VARCHAR(100) 客户名          │
│ customer_level        VARCHAR(10)  客户等级        │
│ material_code         VARCHAR(50)  产品料号        │
│ order_qty             INT          订单总数量 ←    │
│ pending_qty           INT          待排程数量 ←    │
│ produced_qty          INT          已生产数量 ←    │
│ delivery_date         DATE         交货日期        │
│ status                VARCHAR(20)  订单状态        │
│ created_at            TIMESTAMP    创建时间        │
│ updated_at            TIMESTAMP    更新时间        │
└─────────────────────────────────────────────────────┘
```

---

## 📊 数据初始化

### 创建订单时

```sql
-- 初始化：pending_qty = order_qty
INSERT INTO sales_orders (
  order_no, customer, order_qty, pending_qty, 
  produced_qty, delivery_date, status
) VALUES (
  'PO-001', 'ABC公司', 100, 100,  -- pending_qty初始值 = order_qty
  0, '2026-01-15', 'pending'
);

-- 结果：
-- order_qty=100, pending_qty=100, produced_qty=0
-- 表示：订单100卷，全部待排程
```

### 批排程时

```sql
-- 用户排程60卷后，更新
UPDATE sales_orders
SET 
  pending_qty = pending_qty - 60,  -- 100 - 60 = 40
  scheduled_qty = scheduled_qty + 60,  -- 0 + 60 = 60
  updated_at = NOW()
WHERE id = 1;

-- 结果：
-- order_qty=100, pending_qty=40, produced_qty=0
-- 表示：订单100卷，还有40卷待排
```

### 生产完成时

```sql
-- 报工：生产了20卷
UPDATE sales_orders
SET 
  produced_qty = produced_qty + 20,  -- 0 + 20 = 20
  updated_at = NOW()
WHERE id = 1;

-- 结果：
-- order_qty=100, pending_qty=40, produced_qty=20
-- 表示：订单100卷，还有40卷待排，已生产20卷
```

---

## 🔄 业务流程与字段更新

### 流程图

```
【订单创建】
    ↓
INSERT INTO sales_orders
  order_qty = 100
  pending_qty = 100 (自动 = order_qty)
  produced_qty = 0
    ↓
【查询待排程订单】WHERE pending_qty > 0
    ↓
显示所有 pending_qty > 0 的订单
    ↓
【用户排程60卷】
    ↓
UPDATE sales_orders
  pending_qty = 40 (100-60)
  scheduled_qty = 60 (可选)
    ↓
【查询待排程订单】
    ↓
pending_qty 显示为40（不是100）
    ↓
【用户继续排程30卷】
    ↓
UPDATE sales_orders
  pending_qty = 10 (40-30)
  scheduled_qty = 90 (可选)
    ↓
【报工20卷完成】
    ↓
UPDATE sales_orders
  produced_qty = 20 (0+20)
    ↓
【最终状态】
  order_qty=100, pending_qty=10, produced_qty=20
```

---

## 💻 SQL语句集合

### 1. 初始化表（添加字段）

```sql
-- 如果表中没有这些字段，添加
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS (
  order_qty INT DEFAULT 0 COMMENT '订单总数量',
  pending_qty INT DEFAULT 0 COMMENT '待排程数量（关键）',
  produced_qty INT DEFAULT 0 COMMENT '已生产数量',
  scheduled_qty INT DEFAULT 0 COMMENT '已排程数量'
);

-- 添加数据一致性约束
ALTER TABLE sales_orders 
ADD CONSTRAINT check_pending_qty CHECK (pending_qty >= 0);

ALTER TABLE sales_orders 
ADD CONSTRAINT check_produced_qty CHECK (produced_qty <= order_qty);

ALTER TABLE sales_orders 
ADD CONSTRAINT check_qty_sum CHECK (
  pending_qty + produced_qty <= order_qty
);

-- 创建索引，加快查询
CREATE INDEX idx_pending_qty ON sales_orders(pending_qty) 
WHERE pending_qty > 0;

CREATE INDEX idx_customer_pending ON sales_orders(customer_id, pending_qty)
WHERE pending_qty > 0;
```

### 2. 查询待排程订单

```sql
-- 查询还有待排程数量的订单
SELECT 
  id,
  order_no,
  customer,
  customer_level,
  material_code,
  order_qty,
  pending_qty,          -- ← 还能排多少
  produced_qty,
  delivery_date,
  status
FROM sales_orders
WHERE pending_qty > 0   -- ← 只显示还有待排的
  AND status = 'pending'
ORDER BY 
  customer_level DESC,   -- VIP优先
  delivery_date ASC;     -- 交期优先
```

### 3. 排程后更新

```sql
-- 排程时更新（最关键的SQL）
UPDATE sales_orders
SET 
  pending_qty = pending_qty - ?,      -- ? = 本次排程数量
  scheduled_qty = scheduled_qty + ?,  -- 可选：记录总排程数
  updated_at = NOW()
WHERE id = ?
  AND pending_qty >= ?;               -- 验证：不能超过待排

-- 检查更新是否成功
-- 如果 affected_rows = 0，表示验证失败
```

### 4. 报工时更新

```sql
-- 生产完成后更新
UPDATE sales_orders
SET 
  produced_qty = produced_qty + ?,
  updated_at = NOW()
WHERE id = ?;
```

### 5. 订单完成

```sql
-- 检查订单是否完成（optional）
UPDATE sales_orders
SET 
  status = 'completed',
  updated_at = NOW()
WHERE id = ?
  AND pending_qty = 0
  AND produced_qty = order_qty;
```

### 6. 数据一致性检查

```sql
-- 定期检查数据一致性
SELECT 
  order_no,
  order_qty,
  pending_qty,
  produced_qty,
  (pending_qty + produced_qty) AS total,
  CASE 
    WHEN (pending_qty + produced_qty) > order_qty 
      THEN '❌ ERROR: 待排+已生 > 订单数'
    WHEN (pending_qty + produced_qty) = order_qty 
      THEN '✓ OK'
    ELSE '⚠ 未完全排程或生产'
  END AS status
FROM sales_orders
WHERE updated_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY updated_at DESC;
```

---

## 🎯 字段说明

| 字段 | 含义 | 初值 | 更新时机 | 完成值 |
|------|------|------|---------|--------|
| `order_qty` | 订单原始数量 | 订单创建时 | 不变 | 参考值 |
| `pending_qty` | **待排程数量** | = order_qty | **每次排程后** | = 0 |
| `produced_qty` | 已生产数量 | = 0 | **生产报工时** | = order_qty |
| `scheduled_qty` | 已排程总数（可选） | = 0 | 排程时 | = order_qty |

---

## 📝 前端实现

### 1. 表格显示

```vue
<!-- 待排程订单表格 -->
<el-table :data="pendingOrders" border stripe>
  <!-- 订单基本信息 -->
  <el-table-column prop="order_no" label="订单号" width="140" />
  <el-table-column prop="customer" label="客户" width="150" />
  <el-table-column prop="material_code" label="产品料号" width="130" />
  
  <!-- 关键数量字段 -->
  <el-table-column prop="order_qty" label="订单数量" width="100" align="right" />
  <el-table-column prop="pending_qty" label="待排数量" width="120">
    <template slot-scope="{ row }">
      <span style="color: #e6a23c; font-weight: bold">
        {{ row.pending_qty }}
      </span>
    </template>
  </el-table-column>
  
  <!-- 本次排程 -->
  <el-table-column prop="schedule_qty" label="本次排程" width="120">
    <template slot-scope="{ row }">
      <el-input-number
        v-model="row.schedule_qty"
        :min="0"
        :max="row.pending_qty"
        size="small"
        @change="validateScheduleQty(row)"
      />
    </template>
  </el-table-column>
  
  <!-- 交货日期 -->
  <el-table-column prop="delivery_date" label="交货日期" width="110" />
</el-table>
```

### 2. 数据加载

```javascript
// 加载待排程订单
async loadPendingOrders() {
  try {
    const res = await request.get('/api/sales/orders/pending', {
      params: this.pendingParams
    })
    // 后端已返回 pending_qty > 0 的订单
    this.pendingOrders = res.data.list.map(order => ({
      ...order,
      schedule_qty: order.pending_qty // 默认 = 待排数量
    }))
    this.pendingTotal = res.data.total
  } catch (error) {
    this.$message.error('加载待排程订单失败')
  }
}
```

### 3. 验证和提交

```javascript
// 验证排程数量
validateScheduleQty(row) {
  if (row.schedule_qty > row.pending_qty) {
    this.$message.warning(`最多只能排${row.pending_qty}卷`)
    row.schedule_qty = row.pending_qty
  }
  if (row.schedule_qty < 0) {
    row.schedule_qty = 0
  }
}

// 批量排程
async batchSchedule() {
  if (this.selectedOrders.length === 0) {
    this.$message.warning('请选择要排程的订单')
    return
  }

  // 收集排程数据
  const scheduleDetails = this.selectedOrders.map(order => ({
    order_id: order.id,
    schedule_qty: order.schedule_qty
  }))

  try {
    const res = await request.post('/api/production/schedule/batch', {
      scheduleDate: this.autoScheduleForm.scheduleDate,
      details: scheduleDetails
    })

    if (res.code === 0) {
      this.$message.success('排程成功！')
      // 重新加载待排程订单
      // pending_qty 会自动更新
      await this.loadPendingOrders()
      this.selectedOrders = []
    }
  } catch (error) {
    this.$message.error('排程失败: ' + error.message)
  }
}
```

---

## 🔌 后端实现

### 1. 排程API

```javascript
// POST /api/production/schedule/batch
async function batchSchedule(request) {
  const { scheduleDate, details } = request.body
  
  try {
    // 开始事务
    await transaction.begin()
    
    for (const detail of details) {
      const { order_id, schedule_qty } = detail
      
      // 1. 查询订单
      const order = await salesOrdersDAO.getById(order_id)
      
      // 2. 验证
      if (schedule_qty > order.pending_qty) {
        throw new Error(`排程数量不能超过待排数量${order.pending_qty}`)
      }
      
      if (schedule_qty <= 0) {
        throw new Error('排程数量必须大于0')
      }
      
      // 3. 创建排程
      const schedule = await productionScheduleDAO.insert({
        order_id: order_id,
        schedule_date: scheduleDate,
        schedule_qty: schedule_qty,
        status: 'pending'
      })
      
      // 4. 更新订单的pending_qty ← 关键步骤
      await salesOrdersDAO.update(order_id, {
        pending_qty: order.pending_qty - schedule_qty,
        updated_at: new Date()
      })
      
      // 5. 创建工序任务
      await createProcessTasks(order_id, schedule_qty)
    }
    
    // 提交事务
    await transaction.commit()
    
    return { code: 0, message: '排程成功' }
  } catch (error) {
    await transaction.rollback()
    return { code: 1, message: error.message }
  }
}
```

### 2. 查询待排程订单API

```javascript
// GET /api/sales/orders/pending
async function getPendingOrders(request) {
  const { pageNum = 1, pageSize = 20 } = request.query
  
  const offset = (pageNum - 1) * pageSize
  
  const list = await salesOrdersDAO.query(`
    SELECT 
      id,
      order_no,
      customer,
      customer_level,
      material_code,
      order_qty,
      pending_qty,
      produced_qty,
      delivery_date,
      status
    FROM sales_orders
    WHERE pending_qty > 0
      AND status = 'pending'
    ORDER BY customer_level DESC, delivery_date ASC
    LIMIT ? OFFSET ?
  `, [pageSize, offset])
  
  const total = await salesOrdersDAO.count(
    'WHERE pending_qty > 0 AND status = "pending"'
  )
  
  return { 
    code: 0, 
    data: { list, total }
  }
}
```

---

## ✅ 实现检查清单

### 数据库
- [ ] 添加 `order_qty` 字段
- [ ] 添加 `pending_qty` 字段（关键）
- [ ] 添加 `produced_qty` 字段
- [ ] 添加 `scheduled_qty` 字段（可选）
- [ ] 添加约束条件
- [ ] 创建索引：`idx_pending_qty`

### 前端
- [ ] 表格显示 `pending_qty`
- [ ] 表格添加 `schedule_qty` 列（可编辑）
- [ ] 验证方法 `validateScheduleQty()`
- [ ] 数据收集和提交
- [ ] 排程后重新加载列表

### 后端
- [ ] 修改排程API接收 `details` 数组
- [ ] 验证 `schedule_qty ≤ pending_qty`
- [ ] **更新 `sales_orders.pending_qty`**
- [ ] 创建排程记录
- [ ] 创建工序任务
- [ ] 事务处理

---

## 🎯 核心优势

| 优势 | 说明 |
|------|------|
| **简化设计** | 直接在订单表添加字段，不需要额外的关联表 |
| **性能好** | 减少表关联，查询更快 |
| **直观** | 字段名清晰：pending_qty 就是"还能排多少" |
| **易于维护** | 所有信息集中在一个表，更新逻辑简单 |
| **实时同步** | 排程后立即更新，前端重新加载时自动显示新值 |

---

## ⚠️ 注意事项

```
【关键的更新时机】
1. 排程时：pending_qty -= schedule_qty
2. 报工时：produced_qty += output_qty
3. 取消排程时：pending_qty += cancelled_qty（恢复）

【数据一致性检查】
pending_qty + produced_qty ≤ order_qty
如果违反了这个约束，表示有数据错误

【索引优化】
CREATE INDEX idx_pending_qty ON sales_orders(pending_qty)
加快 WHERE pending_qty > 0 的查询
```

---

## 📊 完整例子

```
【订单创建】
INSERT INTO sales_orders (..., order_qty=100, pending_qty=100, produced_qty=0)

【排程60卷】
UPDATE sales_orders SET pending_qty=40 WHERE id=1
查询结果：order_qty=100, pending_qty=40, produced_qty=0

【排程30卷】
UPDATE sales_orders SET pending_qty=10 WHERE id=1
查询结果：order_qty=100, pending_qty=10, produced_qty=0

【生产20卷】
UPDATE sales_orders SET produced_qty=20 WHERE id=1
查询结果：order_qty=100, pending_qty=10, produced_qty=20

【生产50卷】
UPDATE sales_orders SET produced_qty=70 WHERE id=1
查询结果：order_qty=100, pending_qty=10, produced_qty=70

【最后排程10卷】
UPDATE sales_orders SET pending_qty=0 WHERE id=1
查询结果：order_qty=100, pending_qty=0, produced_qty=70

【完成生产】
UPDATE sales_orders SET produced_qty=100 WHERE id=1
最终：order_qty=100, pending_qty=0, produced_qty=100 ✓
```
