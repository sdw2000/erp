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

module.exports = {
  reportWork,
  getReportWorkList,
  getMaterialIssueTemplate,
  issueMaterial,
  getMaterialIssues,
  getCoatingSchedulesPage,
  getRewindingSchedulesPage,
  getSlittingSchedulesPage
}
