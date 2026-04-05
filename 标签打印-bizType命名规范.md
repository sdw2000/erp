# 标签打印 `bizType` 命名规范（建议稿）

## 1. 定义
`bizType` = 打印业务场景标识（规则匹配键）。

用途：
- 标识“当前在打哪一种标签”；
- 与 `customerCode` 一起匹配 `templateKey`；
- 参与规则优先级：客户+业务 > 客户默认(`DEFAULT`) > 全局业务。

---

## 2. 命名规则
统一采用：

`<工序/领域>_<对象>_LABEL`

要求：
1. 全大写；
2. 下划线分词；
3. 只用英文和下划线；
4. 后缀固定 `LABEL`；
5. 不要混用同义词（如 `OUTER` 和 `OUTSIDE` 只能选一个）。

---

## 3. 推荐标准值（当前项目）

### 3.1 分切
- `SLITTING_INNER_LABEL`（分切内标签）
- `SLITTING_OUTER_LABEL`（分切外标签）
- `SLITTING_CORE_LABEL`（分切卷芯标签）
- `SLITTING_PALLET_LABEL`（分切栈板标签）

### 3.2 涂布（按需启用）
- `COATING_INNER_LABEL`
- `COATING_OUTER_LABEL`
- `COATING_PALLET_LABEL`

### 3.3 复卷（按需启用）
- `REWINDING_INNER_LABEL`
- `REWINDING_OUTER_LABEL`
- `REWINDING_PALLET_LABEL`

### 3.4 客户默认（特殊值）
- `DEFAULT`（不是业务标签，仅用于“客户默认模板”）

---

## 4. 不推荐写法（反例）
- `slitting_inner_label`（小写）
- `SLITTING-INNER-LABEL`（连字符）
- `SLITTING_LABEL_INNER`（语序不统一）
- `SLITTING_OUTSIDE_LABEL`（与 `OUTER` 混用）
- `SLITTING`（信息不足）

---

## 5. CSV 导入建议
建议表头：
- `bizType`
- `customerCode`
- `templateKey`
- `sceneName`

说明：
- `bizType` + `templateKey` 必填；
- `customerCode` 为空 = 全局规则；
- `bizType=DEFAULT` + `customerCode` 有值 = 客户默认模板。

---

## 6. 变更控制建议
1. 新增 `bizType` 先在本规范登记；
2. 确认页面/后端枚举和导入模板同步；
3. 生产导入前先在测试环境导入并验证；
4. 禁止同义新值并存（避免规则分叉）。

---

## 7. 快速检查清单
- [ ] 是否全大写+下划线
- [ ] 是否以 `LABEL` 结尾
- [ ] 是否已避免同义词冲突
- [ ] 是否已配置对应 `templateKey`
- [ ] 是否已完成客户差异化验证
