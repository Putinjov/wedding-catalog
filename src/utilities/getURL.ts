import canUseDOM from './canUseDOM'
import { getServerSideOrigin } from '@/config/site-url'

export const getServerSideURL = () => {
  return getServerSideOrigin()
}

export const getClientSideURL = () => {
  if (canUseDOM) {
    const protocol = window.location.protocol
    const domain = window.location.hostname
    const port = window.location.port

    return `${protocol}//${domain}${port ? `:${port}` : ''}`
  }

  return getServerSideOrigin()
}
