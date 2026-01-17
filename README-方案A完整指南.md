# 📚 批排程功能（方案A）- 完整文档目录

> 2026年1月10日 | 方案A独立排程关联表 | 完整实现版

---

## 🎯 文档快速导航

### 1️⃣ 如果你想快速了解设计
📄 **排程关联表设计方案对比.md**
- 方案A vs 方案B的对比
- 为什么选择方案A
- 核心表设计
- 业务流程图

### 2️⃣ 如果你想快速理解原理
📄 **方案A实现总结.md** ← 👈 **从这里开始**
- 核心架构一览
- 关键设计点
- 数据流示例
- 快速参考表

### 3️⃣ 如果你想快速上手实现
📄 **方案A实现检查清单.md**
- 5个实现阶段
- 每个步骤的检查清单（✅标记）
- 集成测试用例
- 常见问题排查

### 4️⃣ 如果你想看完整的实现细节
📄 **方案A完整实现计划.md**
- 第1步：数据库设计（详细SQL）
- 第2步：后端接口实现（完整代码）
- 第3步：前端实现（修改指南）
- 第4步：集成测试（测试场景）

---

## 💾 代码和脚本

### 数据库脚本
📄 **migration-batch-schedule-schema.sql**
- ALTER TABLE 添加字段
- CREATE TABLE 创建新表
- 数据初始化
- 验证SQL
- 回滚脚本
```bash
执行：mysql -u root -p mes_db < migration-batch-schedule-schema.sql
```

### 后端代码
📄 **backend-implementation-batch-schedule.java**
包含：
- ScheduleOrderItem.java (Model)
- ScheduleOrderItemDAO.java (DAO)
- ProductionScheduleServiceImpl.java (Service核心)
- BatchScheduleRequest.java (DTO)
- ProductionScheduleController.java (Controller)

关键方法：
```java
// 核心方法
batchSchedule()              // 批排程
updatePendingQty()           // 更新待排数量
getPendingOrderItems()       // 获取待排订单
getScheduleHistory()         // 查询排程历史
```

### 前端代码
📄 **frontend-api-and-changes.js**
修改内容：
- src/api/schedule.js
- getPendingOrderItems() - 新API
- autoSchedule() - 修改为新端点
- getScheduleHistory() - 新API

前端已完成的功能：
- ✅ 表格"本次排程"列（可编辑）
- ✅ validateScheduleQty() 验证
- ✅ batchSchedule() 提交排程

---

## 📖 按角色选择文档

### 👤 产品/需求分析
推荐阅读：
1. 排程关联表设计方案对比.md
2. 方案A实现总结.md

### 👨‍💻 后端开发
推荐阅读：
1. 方案A完整实现计划.md (第2步)
2. backend-implementation-batch-schedule.java
3. migration-batch-schedule-schema.sql

### 🎨 前端开发
推荐阅读：
1. 方案A完整实现计划.md (第3步)
2. frontend-api-and-changes.js

### 🧪 QA测试
推荐阅读：
1. 方案A实现检查清单.md (第4阶段)
2. 方案A完整实现计划.md (第4步)

### 🚀 运维/部署
推荐阅读：
1. 方案A实现检查清单.md (第5阶段)
2. migration-batch-schedule-schema.sql

---

## 🔄 核心业务流程（30秒版）

```
订单100卷，用户排程60卷 →

前端：
  用户看到 pending_qty=100
  设置 schedule_qty=60
  点击"批量排程"

后端：
  1️⃣ 验证: 60 ≤ 100 ✓
  2️⃣ 插入: schedule_order_item (60卷)
  3️⃣ 更新: pending_qty = 100 - 60 = 40
  4️⃣ 创建: 工序任务 (涂布+复卷)

结果：
  ✅ pending_qty 显示为 40
  ✅ 排程历史中有一条记录(60卷)
  ✅ 后续可继续排程剩余40卷
```

---

## 📊 完整表结构一览

### 核心字段添加到 sales_order_items

| 字段 | 类型 | 说明 | 初值 | 更新规则 |
|-----|------|------|------|---------|
| order_qty | INT | 订单数量 | 订单创建时 | 不变 |
| **pending_qty** | INT | **待排数量** | order_qty | -= schedule_qty |
| produced_qty | INT | 已生产数量 | 0 | 报工时+=实际 |
| scheduled_qty | INT | 已排程数量 | 0 | += schedule_qty |

### 新增表：schedule_order_item (排程关联表)

| 字段 | 说明 |
|-----|------|
| id | 主键 |
| order_item_id | 关联订单明细 |
| **schedule_qty** | **本次排程数量** |
| schedule_date | 排程日期 |
| status | 状态 |
| created_time | 创建时间 |

### 新增表：schedule_task (工序任务表)

| 字段 | 说明 |
|-----|------|
| id | 主键 |
| schedule_item_id | 关联排程记录 |
| task_type | 工序类型（涂布/复卷等） |
| quantity | 数量 |
| status | 状态 |

---

## ✅ 关键验证点

### 数据库层面
```sql
-- 待排数量必须≥0
CHECK (pending_qty >= 0)

-- 已用总量不超过订单量
CHECK (pending_qty + produced_qty <= order_qty)

-- 快速查询待排订单
CREATE INDEX idx_pending_qty ON sales_order_items(pending_qty)
WHERE pending_qty > 0;
```

### 业务逻辑层面
```java
// 排程数量验证 ★ 关键
if (scheduleQty > pendingQty) {
  throw new RuntimeException("排程数量超过待排数量");
}

// 事务保证一致性
@Transactional(rollbackFor = Exception.class)
```

### 前端层面
```javascript
// 输入限制
el-input-number :max="row.pending_qty"

// 方法验证
validateScheduleQty(row) {
  if (row.schedule_qty > row.pending_qty) {
    row.schedule_qty = row.pending_qty
  }
}
```

---

## 🚀 快速开始（3步）

### 第1步：数据库（5分钟）
```bash
mysql -u root -p mes_db < migration-batch-schedule-schema.sql
```

### 第2步：后端（2小时）
1. 复制代码创建 DAO、Model、Service、Controller
2. 编译：`mvn clean compile`

### 第3步：前端（30分钟）
1. 修改 src/api/schedule.js
2. 测试：`npm run serve`

**预计总耗时：4-6小时**（不含测试）

---

## 📋 每日检查清单

### Day 1: 设计和计划
- [ ] 阅读《排程关联表设计方案对比.md》
- [ ] 理解方案A的核心思想
- [ ] 评估实现工作量

### Day 2: 后端开发
- [ ] 执行数据库迁移脚本
- [ ] 创建 DAO 和 Model
- [ ] 实现 Service 方法（特别是batchSchedule）
- [ ] 添加 Controller 接口
- [ ] 编译测试

### Day 3: 前端开发
- [ ] 修改 API 调用（src/api/schedule.js）
- [ ] 验证前端表格功能
- [ ] 本地测试排程流程

### Day 4: 集成测试
- [ ] 单次排程测试
- [ ] 分批排程测试
- [ ] 多订单排程测试
- [ ] 异常处理测试

### Day 5: 生产部署
- [ ] 数据备份
- [ ] 部署后端
- [ ] 部署前端
- [ ] 冒烟测试

---

## 🎯 成功标志

当出现以下结果时，方案A实现成功：

✅ pending_qty 正确显示订单的待排数量  
✅ 排程后 pending_qty 自动递减  
✅ 可以分批对同一订单多次排程  
✅ schedule_order_item 表记录每次排程  
✅ schedule_task 表创建工序任务  
✅ 排程历史可追踪和查询  
✅ 数据一致性得到保证  

---

## 🆘 常见问题速查

| 问题 | 答案 | 文档 |
|------|------|------|
| pending_qty 是什么？ | 待排数量，初值=order_qty | 方案A实现总结 |
| 为什么要用schedule_order_item表？ | 支持分批排程和历史追踪 | 设计方案对比 |
| schedule_qty和pending_qty区别？ | 前者是本次排程，后者是还能排多少 | 方案A完整计划 |
| 如何处理并发排程？ | 使用@Transactional保证事务一致性 | 后端代码 |
| 前端怎么修改API？ | 修改src/api/schedule.js | 前端代码指南 |

---

## 📞 技术支持

遇到问题？按优先级查看：

1. **快速查看** → 方案A实现总结.md
2. **了解细节** → 方案A完整实现计划.md  
3. **逐步执行** → 方案A实现检查清单.md
4. **复制代码** → backend-implementation-batch-schedule.java
5. **数据库问题** → migration-batch-schedule-schema.sql

---

## 📊 文档统计

| 文档 | 行数 | 用途 |
|------|------|------|
| 排程关联表设计方案对比.md | 300+ | 设计决策 |
| 方案A完整实现计划.md | 500+ | 实现指南 |
| 方案A实现检查清单.md | 400+ | 执行清单 |
| 方案A实现总结.md | 300+ | 快速参考 |
| migration-batch-schedule-schema.sql | 200+ | 数据库 |
| backend-implementation-batch-schedule.java | 600+ | 后端代码 |
| frontend-api-and-changes.js | 300+ | 前端代码 |

**总计：2600+ 行完整文档和代码** ✨

---

## 🎓 学习路径

### 初学者（30分钟）
1. 阅读《方案A实现总结.md》的"核心架构"章节
2. 浏览《排程关联表设计方案对比.md》的表对比
3. 看一遍《数据流示例》

### 开发者（2小时）
1. 详细阅读《方案A完整实现计划.md》
2. 研究代码（backend-implementation-batch-schedule.java）
3. 跟进检查清单的前4个步骤

### 实施者（全程）
1. 按《方案A实现检查清单.md》逐步执行
2. 参考相应文档解决问题
3. 运行集成测试验证结果

---

## 🎉 结语

您现在拥有**企业级的批排程解决方案**！

这套方案：
- ✅ 完全支持分批排程
- ✅ 排程历史完全可追踪
- ✅ 生产级的数据一致性保证
- ✅ 符合MES系统的设计规范
- ✅ 便于后续扩展和优化

**现在就开始实现吧！** 🚀

---

*最后更新：2026-01-10*  
*版本：方案A v1.0*  
*状态：✅ 完整实现文档已准备就绪*
