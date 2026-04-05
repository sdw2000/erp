const request = require('../utils/request')

function reportWork(data) {
  return request({
    url: '/schedule/manual/report-work',
    method: 'POST',
    data
  })
}

function getReportWorkList(data) {
  return request({
    url: '/schedule/manual/report-work/list',
    method: 'GET',
    data
  })
}

module.exports = {
  reportWork,
  getReportWorkList
}
