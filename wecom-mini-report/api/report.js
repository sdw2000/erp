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

function getMaterialIssueTemplate(data) {
  return request({
    url: '/schedule/manual/report-work/material-issue-template',
    method: 'GET',
    data
  })
}

function issueMaterial(data) {
  return request({
    url: '/schedule/manual/report-work/material-issue',
    method: 'POST',
    data
  })
}

function getMaterialIssues(data) {
  return request({
    url: '/schedule/manual/report-work/material-issues',
    method: 'GET',
    data
  })
}

function getCoatingSchedulesPage(data) {
  return request({
    url: '/schedule/manual/coating-schedules/page',
    method: 'GET',
    data
  })
}

function getRewindingSchedulesPage(data) {
  return request({
    url: '/schedule/manual/rewinding-schedules/page',
    method: 'GET',
    data
  })
}

function getSlittingSchedulesPage(data) {
  return request({
    url: '/schedule/manual/slitting-schedules/page',
    method: 'GET',
    data
  })
}

function getNextCoatingRollCode(params) {
  return request({
    url: '/schedule/manual/report-work/next-coating-roll-code',
    method: 'GET',
    data: params
  })
}

function updateReportWork(data) {
  return request({
    url: '/schedule/manual/report-work/update',
    method: 'POST',
    data
  })
}

function savePrintRecord(data) {
  return request({
    url: '/production/label-print-record/save',
    method: 'POST',
    data
  })
}

function getTapeSpecs(data) {
  return request({
    url: '/api/tape-spec/list',
    method: 'GET',
    data
  })
}

function suggestTapeSpecs(keyword) {
  return request({
    url: '/api/tape-spec/suggest',
    method: 'GET',
    data: { keyword, limit: 10 }
  })
}

module.exports = {
  reportWork,
  getReportWorkList,
  getMaterialIssueTemplate,
  issueMaterial,
  getMaterialIssues,
  getCoatingSchedulesPage,
  getRewindingSchedulesPage,
  getSlittingSchedulesPage,
  getNextCoatingRollCode,
  updateReportWork,
  savePrintRecord,
  getTapeSpecs,
  suggestTapeSpecs
}
