# ✅ 方案A 实现检查清单 - 立即执行版

## 📋 总体计划

这个清单包含**方案A完整实现**所需的所有步骤，按执行顺序排列。

---

## 🔴 第1阶段：数据库准备 (1-2小时)

### ✅ 步骤1.1：备份数据库
- [ ] 备份 `sales_order_items` 表
- [ ] 备份 `sales_orders` 表
- 命令：
  ```sql
  -- 导出备份
  mysqldump -u root -p mes_db sales_order_items > sales_order_items_backup.sql
  mysqldump -u root -p mes_db sales_orders > sales_orders_backup.sql
  ```

### ✅ 步骤1.2：执行数据库迁移脚本
- [ ] 打开 MySQL 客户端
- [ ] 执行文件：`e:\java\MES\migration-batch-schedule-schema.sql`
  ```sql
  source e:/java/MES/migration-batch-schedule-schema.sql;
  ```
- [ ] 验证表结构：
  ```sql
  DESC sales_order_items;           -- 应显示 pending_qty, produced_qty, scheduled_qty
  DESC schedule_order_item;          -- 应存在
  DESC schedule_task;                -- 应存在
  ```

### ✅ 步骤1.3：验证数据初始化
- [ ] 检查待排程订单数量：
  ```sql
  SELECT COUNT(*) FROM sales_order_items WHERE pending_qty > 0;
  ```
- [ ] 检查数据一致性：
  ```sql
  SELECT COUNT(*) FROM sales_order_items 
  WHERE pending_qty < 0 OR (pending_qty + produced_qty) > order_qty;
  -- 应返回 0
  ```

---

## 🟠 第2阶段：后端实现 (2-3小时)

### ✅ 步骤2.1：创建 DAO 类
- [ ] 创建文件：`e:\java\MES\src\main\java\com\fine\Dao\ScheduleOrderItemDAO.java`
- [ ] 包含方法：
  - [ ] `insert()` - 插入排程记录
  - [ ] `selectById()` - 查询排程记录
  - [ ] `selectByOrderItemId()` - 查询排程历史
  - [ ] `selectByScheduleDate()` - 按日期查询
  - [ ] `selectPending()` - 查询待排程的记录
  - [ ] `updateStatus()` - 更新状态
  - [ ] `delete()` - 删除记录

### ✅ 步骤2.2：创建 Model 类
- [ ] 创建 `ScheduleOrderItem.java` - 排程记录model
- [ ] 创建 `ScheduleTask.java` - 工序任务model
- [ ] 创建 `BatchScheduleRequest.java` - 批排程请求DTO
- [ ] 创建 `ScheduleDetail.java` - 排程明细DTO

### ✅ 步骤2.3：实现 Service 类
- [ ] 修改：`ProductionScheduleServiceImpl.java`
- [ ] 添加/修改方法：
  - [ ] `batchSchedule()` - 批排程核心方法 ★
  - [ ] `getPendingOrderItems()` - 获取待排程订单
  - [ ] `getScheduleHistory()` - 查询排程历史
  - [ ] `updatePendingQty()` - 更新待排数量（关键）
  - [ ] `createScheduleTasks()` - 创建工序任务
  - [ ] `validateScheduleDetail()` - 验证排程数据

### ✅ 步骤2.4：修改 Controller
- [ ] 修改：`ProductionScheduleController.java`
- [ ] 添加/修改方法：
  - [ ] `getPendingOrderItems()` - GET /api/production/schedule/pending-orders
  - [ ] `batchSchedule()` - POST /api/production/schedule/batch-schedule ★
  - [ ] `getScheduleHistory()` - GET /api/production/schedule/schedule-history/{id}

### ✅ 步骤2.5：修改 DAO 接口（SalesOrderItemDAO）
- [ ] 添加方法：
  - [ ] `updatePendingQty()` - 更新待排数量
  - [ ] `selectPendingOrders()` - 查询待排程订单
  ```java
  @Update("UPDATE sales_order_items " +
          "SET pending_qty = pending_qty - #{scheduleQty}, " +
          "    scheduled_qty = scheduled_qty + #{scheduleQty} " +
          "WHERE id = #{orderItemId}")
  int updatePendingQty(Long orderItemId, Integer scheduleQty);
  ```

### ✅ 步骤2.6：编译后端代码
- [ ] 进入后端项目目录：`cd e:\java\MES`
- [ ] 执行编译：`mvn clean compile`
- [ ] 验证无编译错误

### ✅ 步骤2.7：单元测试（可选但推荐）
- [ ] 创建测试类：`ScheduleServiceTest.java`
- [ ] 测试用例：
  - [ ] 单次排程测试
  - [ ] 分批排程测试
  - [ ] 待排数量验证
  - [ ] 异常处理测试

---

## 🟡 第3阶段：前端实现 (1-2小时)

### ✅ 步骤3.1：修改 API 调用
- [ ] 修改文件：`e:\vue\ERP\src\api\schedule.js`
- [ ] 添加/修改方法：
  - [ ] `getPendingOrderItems()` - 获取待排程订单 ★ 新增
  - [ ] `autoSchedule()` - 修改为调用新端点
  - [ ] `getScheduleHistory()` - 查询排程历史 ★ 新增

### ✅ 步骤3.2：验证前端代码（已完成）
- [ ] 检查 `loadPendingOrders()` 方法 ✓
  ```javascript
  // 已正确初始化 schedule_qty = pending_qty
  this.pendingOrders.forEach(order => {
    if (!order.schedule_qty) {
      order.schedule_qty = order.pending_qty
    }
  })
  ```

- [ ] 检查 `validateScheduleQty()` 方法 ✓
  ```javascript
  // 已正确验证不超过待排数量
  if (row.schedule_qty > row.pending_qty) {
    row.schedule_qty = row.pending_qty
  }
  ```

- [ ] 检查 `batchSchedule()` 方法 ✓
  ```javascript
  // 已改进：收集 schedule_qty 参数
  const scheduleDetails = validOrders.map(o => ({
    order_item_id: o.order_item_id,
    schedule_qty: o.schedule_qty
  }))
  ```

### ✅ 步骤3.3：编译前端代码
- [ ] 进入前端项目：`cd e:\vue\ERP`
- [ ] 执行编译：`npm run build`
- [ ] 验证无编译错误

### ✅ 步骤3.4：启动开发服务器（测试）
- [ ] 执行：`npm run dev` 或 `npm run serve`
- [ ] 浏览器打开：`http://localhost:8080`
- [ ] 导航到"待排程订单"tab

---

## 🟢 第4阶段：集成测试 (1-2小时)

### ✅ 步骤4.1：启动后端服务
- [ ] 编译后端：`mvn clean package`
- [ ] 启动服务器（通常是Spring Boot应用）
- [ ] 验证后端运行正常（检查日志）

### ✅ 步骤4.2：功能测试 - 单次排程
**场景**：订单100卷，排程60卷

前端操作：
- [ ] 打开"待排程订单"tab
- [ ] 看到订单：order_qty=100, pending_qty=100
- [ ] 修改"本次排程"为60
- [ ] 点击"批量排程"按钮
- [ ] 确认对话框出现

后端验证：
- [ ] 检查 `schedule_order_item` 表，应新增1条记录
  ```sql
  SELECT * FROM schedule_order_item 
  WHERE order_item_id = ? 
  ORDER BY created_time DESC LIMIT 1;
  ```

- [ ] 检查 `sales_order_items` 表，pending_qty 应变为 40
  ```sql
  SELECT id, order_qty, pending_qty, produced_qty, scheduled_qty
  FROM sales_order_items WHERE id = ?;
  -- 应显示: pending_qty=40, scheduled_qty=60
  ```

前端验证：
- [ ] 排程成功提示出现
- [ ] 表格刷新，pending_qty 显示为 40

### ✅ 步骤4.3：功能测试 - 分批排程
**场景**：同一订单多次排程 (60 + 30 + 10 = 100)

第1次排程：
- [ ] 再次排程30卷
- [ ] 验证 pending_qty: 40 → 10
- [ ] 验证 `schedule_order_item` 新增记录

第2次排程：
- [ ] 再次排程10卷
- [ ] 验证 pending_qty: 10 → 0
- [ ] 订单应该从待排程列表消失

排程历史验证：
- [ ] 查询 `schedule_order_item`：
  ```sql
  SELECT * FROM schedule_order_item 
  WHERE order_item_id = ? 
  ORDER BY created_time;
  -- 应显示3条记录：60, 30, 10
  ```

### ✅ 步骤4.4：功能测试 - 多订单排程
**场景**：同时排程3个不同的订单

前端操作：
- [ ] 在表格中勾选3个订单
- [ ] 修改各自的排程数量
- [ ] 点击"批量排程"

后端验证：
- [ ] 3个订单的 pending_qty 都应该减少
- [ ] 3条 `schedule_order_item` 记录应该被创建
- [ ] 6条 `schedule_task` 记录应该被创建（涂布+复卷各3条）

### ✅ 步骤4.5：异常测试 - 验证错误处理
**场景1：排程数量超过待排数量**
- [ ] 待排数量为40，尝试排程50卷
- [ ] 前端应验证不通过（max 限制）或后端返回错误
- [ ] 验证 pending_qty 没有被更新

**场景2：未选中任何订单**
- [ ] 不选任何订单，点击"批量排程"
- [ ] 应显示提示："请先选择订单"

**场景3：排程数量为0**
- [ ] 选中订单但排程数量为0
- [ ] 应被过滤掉或显示提示

### ✅ 步骤4.6：性能测试
- [ ] 加载待排程订单列表（100+条）- 应在2秒内完成
- [ ] 批排程100个订单 - 应在5秒内完成
- [ ] 查询排程历史 - 应在1秒内完成

---

## 🔵 第5阶段：生产部署 (1小时)

### ✅ 步骤5.1：数据备份
- [ ] 完整数据库备份
- [ ] 关键表备份：
  - sales_orders
  - sales_order_items
  - schedule_order_item
  - schedule_task

### ✅ 步骤5.2：灰度发布（可选）
- [ ] 先在测试环境验证
- [ ] 再在预发布环境验证
- [ ] 最后在生产环境部署

### ✅ 步骤5.3：后端部署
- [ ] 打包后端：`mvn clean package -DskipTests`
- [ ] 上传到服务器
- [ ] 重启后端服务
- [ ] 检查日志，确认启动无错误

### ✅ 步骤5.4：前端部署
- [ ] 编译前端：`npm run build`
- [ ] 上传打包好的 dist 文件到服务器
- [ ] 配置 nginx（如使用）
- [ ] 重启服务

### ✅ 步骤5.5：冒烟测试（生产环境）
- [ ] 打开生产环境URL
- [ ] 执行一次完整的排程流程
- [ ] 验证数据库中的数据更新正确
- [ ] 验证后台日志无错误

---

## 📊 验证检查表

### SQL 查询验证

```sql
-- 验证1：待排程订单数量
SELECT COUNT(*) as pending_count
FROM sales_order_items 
WHERE pending_qty > 0;

-- 验证2：排程记录数量
SELECT COUNT(*) as schedule_count
FROM schedule_order_item;

-- 验证3：工序任务数量
SELECT COUNT(*) as task_count
FROM schedule_task;

-- 验证4：数据一致性
SELECT 
  soi.id,
  soi.order_qty,
  soi.pending_qty,
  soi.produced_qty,
  soi.scheduled_qty,
  (soi.pending_qty + soi.produced_qty + soi.scheduled_qty) as total_qty
FROM sales_order_items soi
WHERE (soi.pending_qty + soi.produced_qty) > soi.order_qty
LIMIT 10;
-- 应返回空结果

-- 验证5：排程历史
SELECT 
  soi.id,
  soi.material_code,
  COUNT(soi_sch.id) as schedule_count,
  SUM(soi_sch.schedule_qty) as total_scheduled_qty
FROM sales_order_items soi
LEFT JOIN schedule_order_item soi_sch ON soi.id = soi_sch.order_item_id
WHERE soi.pending_qty > 0
GROUP BY soi.id
LIMIT 10;
```

### 前端界面检查

- [ ] 待排程订单表格显示 pending_qty 列
- [ ] 本次排程列可编辑且有数字输入限制
- [ ] 排程数量不能超过待排数量（el-input-number 的 max 属性）
- [ ] 批量排程按钮在选中订单时可用
- [ ] 排程成功后表格自动刷新
- [ ] pending_qty 显示已更新

---

## ⚠️ 常见问题排查

| 问题 | 原因 | 解决方案 |
|------|------|--------|
| pending_qty 为 NULL | 字段添加失败 | 检查SQL执行结果，重新执行迁移脚本 |
| 排程失败 "待排数量不足" | 前端没有获取最新数据 | 排程前调用 `loadPendingOrders()` 刷新 |
| schedule_order_item 表空 | 后端没有插入数据 | 检查 `batchSchedule()` 方法是否被调用 |
| 前端报 API 404 错误 | 后端接口路由不正确 | 检查 Controller 中的 @RequestMapping 路径 |
| 并发错误 | 多用户同时排程 | 确保使用 @Transactional 保证事务一致性 |

---

## 📞 支持信息

### 文档参考
- `方案A完整实现计划.md` - 详细实现指南
- `排程关联表设计方案对比.md` - 设计决策依据
- `未排程数量快速指南.md` - 快速参考
- `migration-batch-schedule-schema.sql` - 数据库脚本
- `backend-implementation-batch-schedule.java` - 后端代码
- `frontend-api-and-changes.js` - 前端代码

### 执行时间估算
| 阶段 | 预计时间 | 关键路径 |
|------|---------|--------|
| 1. 数据库 | 1-2小时 | ★ 必须 |
| 2. 后端 | 2-3小时 | ★ 必须 |
| 3. 前端 | 1-2小时 | ★ 必须 |
| 4. 测试 | 1-2小时 | ★ 必须 |
| 5. 部署 | 1小时 | 生产环境 |
| **总计** | **6-10小时** | |

---

## 🚀 快速启动命令

```bash
# 1. 数据库迁移
mysql -u root -p mes_db < migration-batch-schedule-schema.sql

# 2. 后端编译
cd e:\java\MES
mvn clean compile

# 3. 前端编译
cd e:\vue\ERP
npm install
npm run build

# 4. 后端启动（Spring Boot）
java -jar target/mes-app.jar

# 5. 前端启动（开发）
npm run serve
```

---

## ✨ 完成标志

当所有步骤都打✅时，方案A实现完成！

```
✓ 数据库迁移成功
✓ 后端编译无错误
✓ 前端编译无错误
✓ 单次排程测试通过
✓ 分批排程测试通过
✓ 多订单排程测试通过
✓ 异常处理正确
✓ 生产环境部署成功
→ 🎉 方案A实现完成！
```
