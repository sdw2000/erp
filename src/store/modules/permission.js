import { asyncRoutes, constantRoutes } from '@/router'
import { normalizeRoles } from '@/utils/role'

function isCoatingRestrictedUser(roles) {
  const normalizedRoles = normalizeRoles(roles)
  // Only treat user as "coating-restricted" when their sole role is `coating` (non-admin).
  // This avoids incorrectly restricting users who have multiple roles (e.g. both `coating` and `packing`).
  if (normalizedRoles.includes('admin')) return false
  return normalizedRoles.length === 1 && normalizedRoles[0] === 'coating'
}

/**
 * Use meta.role to determine if the current user has permission
 * @param roles
 * @param route
 */
function hasPermission(roles, route) {
  roles = normalizeRoles(roles)
  // super admin bypasses all permission checks
  if (roles.includes('admin')) {
    return true
  }
  if (route.meta && route.meta.roles) {
    const routeRoles = normalizeRoles(route.meta.roles)
    return roles.some(role => routeRoles.includes(role))
  } else {
    return true
  }
}

/**
 * Filter asynchronous routing tables by recursion
 * @param routes asyncRoutes
 * @param roles
 */
export function filterAsyncRoutes(routes, roles) {
  const res = []

  routes.forEach(route => {
    const tmp = { ...route }
    if (hasPermission(roles, tmp)) {
      if (tmp.children) {
        tmp.children = filterAsyncRoutes(tmp.children, roles)
      }
      res.push(tmp)
    }
  })

  return res
}

const state = {
  routes: [],
  addRoutes: []
}

const mutations = {
  SET_ROUTES: (state, payload) => {
    const routes = payload && payload.routes ? payload.routes : []
    const coatingRestricted = !!(payload && payload.coatingRestricted)
    state.addRoutes = routes

    if (coatingRestricted) {
      // 保留 hidden 路由（login/404/401）和首页 Dashboard
      const coatingConstantRoutes = (constantRoutes || []).filter(route => route.hidden || route.path === '/')
      state.routes = coatingConstantRoutes.concat(routes)
      return
    }

    state.routes = constantRoutes.concat(routes)
  }
}

const actions = {
  generateRoutes({ commit }, roles) {
    return new Promise(resolve => {
      let accessedRoutes
      const normalizedRoles = normalizeRoles(roles)
      const coatingRestricted = isCoatingRestrictedUser(normalizedRoles)

      if (normalizedRoles.includes('admin')) {
        accessedRoutes = asyncRoutes || []
      } else if (coatingRestricted) {
        accessedRoutes = filterAsyncRoutes(asyncRoutes, ['coating'])
      } else {
        accessedRoutes = filterAsyncRoutes(asyncRoutes, normalizedRoles)
      }

      commit('SET_ROUTES', {
        routes: accessedRoutes,
        coatingRestricted
      })
      resolve(accessedRoutes)
    })
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
