const request = require('../utils/request')

/**
 * 领料到现场 (单次)
 */
function receiveToFloor(data) {
  return request({
    url: '/api/workshop/receive',
    method: 'POST',
    data
  })
}

/**
 * 批量领料到现场
 */
function batchReceiveToFloor(data) {
  return request({
    url: '/api/workshop/batch-receive',
    method: 'POST',
    data
  })
}

/**
 * 车间退料入库 (单次)
 */
function returnToWarehouse(data) {
  return request({
    url: '/api/workshop/return',
    method: 'POST',
    data
  })
}

/**
 * 批量车间退料入库
 */
function batchReturnToWarehouse(data) {
  return request({
    url: '/api/workshop/batch-return',
    method: 'POST',
    data
  })
}

/**
 * 获取车间流水
 */
function getUsageRecords(params) {
  return request({
    url: '/api/workshop/usage-records',
    method: 'GET',
    data: params
  })
}

module.exports = {
  receiveToFloor,
  batchReceiveToFloor,
  returnToWarehouse,
  batchReturnToWarehouse,
  getUsageRecords
}
