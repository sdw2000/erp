import defaultSettings from '@/settings'

const title = defaultSettings.title || '方恩电子管理系统'

export default function getPageTitle(pageTitle) {
  return `${title}`
}
