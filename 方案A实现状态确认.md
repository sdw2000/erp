# ✅ 方案A实现状态确认

## 当前状态：前端已完成

### 1. 待排程订单表格 - 已正确实现

#### 表格列配置

```
序号 | 订单号 | 客户 | 客户等级 | 料号 | 产品名称 | 颜色 | 厚度 | 宽度 | 长度 | 订单数量 | 待排数量 | 本次排程数 | 交货日期
```

#### 关键列说明

| 列名 | 类型 | 说明 |
|------|------|------|
| **待排数量** | el-tag | 显示 `pending_qty`，>0为黄色，=0为绿色，**无箭头** ✅ |
| **本次排程数** | el-input(number) | 普通输入框，用户输入数字，**无加减号** ✅ |

**代码位置**：`src/views/production/schedule.vue` 第115-145行

```vue
<!-- 待排数量列 -->
<el-table-column prop="pending_qty" label="待排数量" width="100" align="center">
  <template slot-scope="{ row }">
    <el-tag :type="row.pending_qty > 0 ? 'warning' : 'success'" size="medium">
      {{ row.pending_qty }}
    </el-tag>
  </template>
</el-table-column>

<!-- 本次排程数列 -->
<el-table-column label="本次排程数" width="130" align="center">
  <template slot-scope="{ row }">
    <el-input
      v-model.number="row.schedule_qty"
      type="number"
      size="small"
      placeholder="0"
      style="width: 90px; text-align: center; font-weight: bold; font-size: 14px"
      @input="validateScheduleQty(row)"
      @blur="validateScheduleQty(row)"
    />
  </template>
</el-table-column>
```

---

### 2. 分页查询 - 已正确修复

#### 问题说明
当用户改变分页大小（pageSize）时，应该重置回第1页，否则会出现分页错误。

#### 修复方案
在 `handlePendingSizeChange` 方法中添加重置逻辑：

**代码位置**：`src/views/production/schedule.vue` 第1228-1235行

```javascript
handlePendingSizeChange(size) {
  this.pendingParams.pageSize = size
  this.pendingParams.pageNum = 1  // ← 重置到第1页
  this.loadPendingOrders()
}

handlePendingPageChange(page) {
  this.pendingParams.pageNum = page
  this.loadPendingOrders()
}
```

#### 效果
- ✅ 改变分页大小时自动回到第1页
- ✅ 点击页码时正常翻页
- ✅ 搜索时重置分页

---

### 3. 数据初始化 - 已正确实现

#### loadPendingOrders 方法

**代码位置**：`src/views/production/schedule.vue` 第1181-1200行

```javascript
async loadPendingOrders() {
  this.pendingLoading = true
  try {
    const res = await getPendingOrderItems(this.pendingParams)
    // 初始化 schedule_qty = pending_qty
    this.pendingOrders = res.data.list.map(order => ({
      ...order,
      schedule_qty: order.pending_qty  // ← 默认等于待排数量
    }))
    this.pendingTotal = res.data.total
  } catch (error) {
    this.$message.error('加载待排程订单失败')
  } finally {
    this.pendingLoading = false
  }
}
```

---

### 4. 数据验证 - 已正确实现

#### validateScheduleQty 方法

**代码位置**：`src/views/production/schedule.vue` 第1203-1210行

```javascript
validateScheduleQty(row) {
  // 验证不超过待排数量
  if (row.schedule_qty > row.pending_qty) {
    this.$message.warning(`最多只能排${row.pending_qty}卷`)
    row.schedule_qty = row.pending_qty
  }
  // 验证不为负数
  if (row.schedule_qty < 0) {
    row.schedule_qty = 0
  }
}
```

---

### 5. 批排程提交 - 已正确实现

#### batchSchedule 方法

**代码位置**：`src/views/production/schedule.vue` 第1212-1250行

```javascript
async batchSchedule() {
  if (this.selectedOrders.length === 0) {
    this.$message.warning('请先选择要排程的订单')
    return
  }

  // 验证所有选中的订单都有排程数量
  for (const order of this.selectedOrders) {
    if (!order.schedule_qty || order.schedule_qty <= 0) {
      this.$message.warning(`订单 ${order.order_no} 未填写排程数量`)
      return
    }
  }

  // 收集排程数据
  const scheduleDetails = this.selectedOrders.map(order => ({
    order_item_id: order.id,
    schedule_qty: order.schedule_qty  // ← 用户输入的值
  }))

  try {
    this.scheduling = true
    const res = await autoSchedule({
      scheduleDate: this.autoScheduleForm.scheduleDate,
      scheduleType: this.autoScheduleForm.scheduleType,
      details: scheduleDetails  // ← 关键参数
    })
    this.$message.success('排程成功')
    this.autoScheduleVisible = false
    this.loadPendingOrders()  // ← 刷新表格
  } catch (error) {
    this.$message.error('排程失败: ' + error.message)
  } finally {
    this.scheduling = false
  }
}
```

---

## ✅ 前端检查清单

- [x] 待排数量列使用 `el-tag` 显示，无箭头
- [x] 本次排程数列使用 `el-input` 输入框，无加减号
- [x] 分页大小改变时自动回到第1页
- [x] 数据初始化时 `schedule_qty = pending_qty`
- [x] 排程数量验证：不超过待排数量、不为负数
- [x] 批排程提交收集正确的数据结构
- [x] 排程成功后自动刷新表格
- [x] 文件无编译错误 ✅

---

## 🚀 后续步骤（后端实现）

### 1. 数据库迁移
- [ ] 在 `sales_order_items` 表添加 `pending_qty` 字段（如未存在）
- [ ] 执行初始化脚本：`pending_qty = order_qty`
- [ ] 在 `schedule_order_item` 表添加必要的字段和索引

### 2. 后端API修改
- [ ] 修改排程API接口 `/api/production/schedule/auto`
- [ ] 接受新的参数格式：`details[]` 数组
- [ ] 实现事务处理
- [ ] 验证 `schedule_qty ≤ pending_qty`
- [ ] 更新 `sales_order_items.pending_qty`
- [ ] 创建 `schedule_order_item` 记录
- [ ] 创建工序任务

### 3. API接口规范
```javascript
POST /api/production/schedule/auto
请求体：
{
  scheduleDate: "2026-01-10",
  scheduleType: "order",
  details: [
    { order_item_id: 1, schedule_qty: 60 },
    { order_item_id: 2, schedule_qty: 50 }
  ]
}

响应：
{
  code: 200,
  msg: "排程成功",
  data: {
    scheduleCount: 2,
    totalQty: 110
  }
}
```

---

## 📋 表格显示效果预览

```
待排程订单表格

订单号     | 客户名    | 料号        | 订单数量 | 待排数量 | 本次排程数 | 交货日期
-----------|----------|-----------|---------|---------|---------|----------
PO-001     | ABC公司   | TAPE-001  | 100     | [40]    | [40]    | 2026-01-15
PO-002     | XYZ公司   | TAPE-002  | 85      | [85]    | [85]    | 2026-01-20
PO-003     | 123公司   | TAPE-001  | 536     | [53]    | [53]    | 2026-01-12

注：
- [40] = 黄色tag，表示还有待排
- [40] = 普通输入框，用户可编辑
- 用户改变输入框的值后自动验证
```

---

## 💡 关键改进点

| 改进 | 效果 |
|------|------|
| **去掉加减号** | 表格更清洁，数据更清晰 |
| **分页修复** | 避免分页逻辑错误，提升用户体验 |
| **颜色标记** | 待排数量一目了然（黄色=未排，绿色=已排满） |
| **实时验证** | 用户输入时立即验证，防止错误提交 |

---

## 📚 相关文档

- `方案A完整实现计划.md` - 详细的实现步骤
- `排程关联表设计方案对比.md` - 数据库设计对比
- `未排程数量快速指南.md` - 快速参考指南
- `批排程完整实现方案.md` - 前后端完整代码示例

---

## ✨ 完成度

```
前端实现：████████████████████ 100% ✅
后端实现：░░░░░░░░░░░░░░░░░░░░   0% (待开始)
数据库：  ░░░░░░░░░░░░░░░░░░░░   0% (待开始)
```

前端已完全就绪，可以继续进行后端实现。
