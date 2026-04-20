import { asyncRoutes, constantRoutes } from '@/router'

function isCoatingRestrictedUser(roles) {
  const normalizedRoles = (roles || []).map(role => String(role || '').trim().toLowerCase()).filter(Boolean)
  return normalizedRoles.includes('coating') && !normalizedRoles.includes('admin')
}

/**
 * Use meta.role to determine if the current user has permission
 * @param roles
 * @param route
 */
function hasPermission(roles, route) {
  // normalize roles
  roles = (roles || []).map(role => String(role || '').trim().toLowerCase()).filter(Boolean)
  // super admin bypasses all permission checks
  if (roles.includes('admin')) {
    return true
  }
  if (route.meta && route.meta.roles) {
    const routeRoles = route.meta.roles.map(role => String(role || '').trim().toLowerCase()).filter(Boolean)
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
      const minimalConstantRoutes = (constantRoutes || []).filter(route => route.hidden)
      state.routes = minimalConstantRoutes.concat(routes)
      return
    }

    state.routes = constantRoutes.concat(routes)
  }
}

const actions = {
  generateRoutes({ commit }, roles) {
    return new Promise(resolve => {
      let accessedRoutes
      const normalizedRoles = (roles || []).map(role => String(role || '').trim().toLowerCase()).filter(Boolean)
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
