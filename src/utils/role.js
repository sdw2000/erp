/**
 * 角色规范化工具：全项目统一角色别名与比较规则
 */

export function normalizeRole(role) {
  const raw = String(role || '').trim()
  const lower = raw.toLowerCase()
  if (!lower) return ''

  // 研发角色别名
  if (lower === 'r&d' || lower === 'rd' || lower === 'research' || raw === '研发' || raw === '研发部') {
    return 'rd'
  }

  // 品质角色别名
  if (lower === 'quality' || raw === '品质' || raw === '质检' || raw === '品质部' || raw === '质量') {
    return 'quality'
  }

  // 生产角色别名
  if (lower === 'production' || raw === '生产' || raw === '生产部' || raw === '车间') {
    return 'production'
  }

  // 管理员角色别名
  if (lower === 'admin' || raw === '管理员' || raw === '系统管理员') {
    return 'admin'
  }

  // 涂布角色
  if (lower === 'coating' || raw === '涂布' || raw === '涂布班' || raw === '涂布组') {
    return 'coating'
  }

  // 包装/复卷角色
  if (lower === 'packing' || lower === 'packaging' || raw === '包装' || raw === '复卷' || raw === '分切') {
    return 'packing'
  }

  return lower
}

export function normalizeRoles(roles) {
  return Array.from(new Set((roles || []).map(role => normalizeRole(role)).filter(Boolean)))
}

export function hasAnyRole(userRoles, requiredRoles) {
  const normalizedUserRoles = normalizeRoles(userRoles)
  const normalizedRequiredRoles = Array.isArray(requiredRoles)
    ? normalizeRoles(requiredRoles)
    : [normalizeRole(requiredRoles)].filter(Boolean)

  if (!normalizedRequiredRoles.length) return false
  return normalizedRequiredRoles.some(role => normalizedUserRoles.includes(role))
}
