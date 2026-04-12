import axios from 'axios'
import { MessageBox, Message } from 'element-ui'
import store from '@/store'
import { getToken } from '@/utils/auth'

function resolveBaseURL() {
  const envBase = process.env.VUE_APP_BASE_API
  if (process.env.NODE_ENV === 'development') {
    return ''
  }
  return envBase
}

// create an axios instance
const service = axios.create({
  baseURL: resolveBaseURL(), // url = base url + request url
  // withCredentials: true, // send cookies when cross-domain requests
  timeout: 60000 // request timeout
})

const SPACE_REGEXP = /[\s\u00A0\u3000]+/g
const CODE_FIELD_NAMES = new Set(['materialCode', 'customerCode'])

function removeAllSpaces(text) {
  if (text === null || text === undefined) return text
  return String(text).replace(SPACE_REGEXP, '')
}

function sanitizeCodeFields(payload) {
  if (payload === null || payload === undefined) return payload
  if (Array.isArray(payload)) {
    return payload.map(item => sanitizeCodeFields(item))
  }
  if (typeof FormData !== 'undefined' && payload instanceof FormData) {
    return payload
  }
  if (typeof payload !== 'object') {
    return payload
  }

  Object.keys(payload).forEach(key => {
    const value = payload[key]
    if (CODE_FIELD_NAMES.has(key) && typeof value === 'string') {
      payload[key] = removeAllSpaces(value)
      return
    }
    if (value && typeof value === 'object') {
      sanitizeCodeFields(value)
    }
  })
  return payload
}

function shouldSilenceBusinessError(config, serverMsg) {
  const url = String((config && config.url) || '')
  const msg = String(serverMsg || '')
  // 涂布机台可用性预估：未输入料号属于编辑过程中的中间态，不弹全局错误
  if (url.includes('/schedule/manual/coating-availability') && /手工涂布排程请先输入料号|请先输入料号/.test(msg)) {
    return true
  }
  return false
}

// request interceptor
service.interceptors.request.use(
  config => {
    // do something before request is sent
    if (process.env.NODE_ENV === 'development') {
      const rawUrl = String(config.url || '')
      const isAbsolute = /^https?:\/\//i.test(rawUrl)
      if (!isAbsolute && rawUrl.startsWith('/') && !rawUrl.startsWith('/api-proxy/')) {
        config.url = `/api-proxy${rawUrl}`
      }
    }

    if (store.getters.token) {
      // let each request carry token
      // ['X-Token'] is a custom headers key
      // please modify it according to the actual situation
      const tk = getToken()
      config.headers['X-Token'] = tk
      config.headers['token'] = tk
    }

    if (config && config.params) {
      sanitizeCodeFields(config.params)
    }
    if (config && config.data) {
      sanitizeCodeFields(config.data)
    }
    return config
  },
  error => {
    // do something with request error
    console.log(error) // for debug
    return Promise.reject(error)
  }
)

// response interceptor
service.interceptors.response.use(
  /**
   * If you want to get http information such as headers or status
   * Please return  response => response
  */

  /**
   * Determine the request status by custom code
   * Here is just an example
   * You can also judge the status by HTTP Status Code
   */
  response => {
    // 如果是blob类型响应（文件下载），直接返回data
    if (response.config.responseType === 'blob') {
      return response.data
    }

    const res = response.data

    // 兼容后端字段 msg/message
    const serverMsg = res.message || res.msg

    // if the custom code is not 20000 or 200, it is judged as an error.
    if (res.code !== 20000 && res.code !== 200) {
      const silent = shouldSilenceBusinessError(response.config, serverMsg)
      if (!silent) {
        Message({
          message: serverMsg || 'Error',
          type: 'error',
          duration: 5 * 1000
        })
      }

      // 50008: Illegal token; 50012: Other clients logged in; 50014: Token expired;
      if (res.code === 50008 || res.code === 50012 || res.code === 50014) {
        // to re-login
        MessageBox.confirm('You have been logged out, you can cancel to stay on this page, or log in again', 'Confirm logout', {
          confirmButtonText: 'Re-Login',
          cancelButtonText: 'Cancel',
          type: 'warning'
        }).then(() => {
          store.dispatch('user/resetToken').then(() => {
            location.reload()
          })
        })
      }
      // create Error and attach full response so callers can inspect server data
      const err = new Error(serverMsg || 'Error')
      err.response = response
      return Promise.reject(err)
    } else {
      return res
    }
  },
  error => {
    console.log('err' + error) // for debug
    let message = error.message
    const silent = shouldSilenceBusinessError(error && error.config, message)
    if (error.response) {
      // Server returned an error response
      const { status, data } = error.response
      if (data && (data.message || data.msg)) {
        message = data.message || data.msg
      } else if (status === 500) {
        message = '服务器内部错误'
      } else if (status === 404) {
        message = '接口不存在'
      } else if (status === 401) {
        message = '未授权，请重新登录'
      } else if (status === 403) {
        message = '没有权限'
      }
    } else if (error.message.includes('Network Error')) {
      message = '网络错误，请检查后端服务是否启动'
    } else if (error.message.includes('timeout')) {
      message = '请求超时'
    }
    if (!silent) {
      Message({
        message: message,
        type: 'error',
        duration: 5 * 1000
      })
    }
    return Promise.reject(error)
  }
)

export default service
