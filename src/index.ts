/* eslint-disable no-console */
/* eslint @typescript-eslint/camelcase: ["error", {allow: [".*"]}] */
import * as core from '@actions/core'
import { google, appengine_v1 } from 'googleapis'
import stringify from 'json-stringify-pretty-compact'
import CONFIG from './config'

type VersionType = {
  serviceID: string
  versionID: string
  date: string
}

const divider = () => {
  return '='.repeat(100)
}

export const loggerInfo = (value: string) => {
  // Ignore logging if jest tests
  if (CONFIG.NODE_ENV !== 'test') {
    // Local logging
    if (CONFIG.NODE_ENV === 'development') console.info(value)
    // GitHub Action Logging
    else core.info(value)
  }
}

export const loggerError = (err: string) => {
  // Ignore logging if jest tests
  if (CONFIG.NODE_ENV !== 'test') {
    // Local logging
    if (CONFIG.NODE_ENV === 'development') console.error(err)
    // GitHub Action Logging
    else core.error(err)
  }
}

export const setFailed = (value: string) => {
  // Ignore if jest tests
  if (CONFIG.NODE_ENV !== 'test') {
    // Local
    if (CONFIG.NODE_ENV === 'development') console.warn(value)
    // GitHub Action
    else core.setFailed(value)
  }
}

export const asyncForEach = async (array: any, callback: any) => {
  array.forEach(async (element: any, index: number, orgArr: any) => {
    await callback(element, index, orgArr)
  })
}

export const getAppEngine = async () => {
  loggerInfo('Getting App Engine instance...')

  const client = google.auth.fromJSON(CONFIG.GCP_APPLICATION_CREDENTIALS)
  if (client instanceof google.auth.JWT)
    client.scopes =
      'https://www.googleapis.com/auth/appengine.admin https://www.googleapis.com/auth/cloud-platform'

  return google.appengine({ version: 'v1', auth: client })
}

export const getServices = async (appEngine: appengine_v1.Appengine) => {
  loggerInfo('Gettings services...')
  const response = await appEngine.apps.services.list({
    appsId: CONFIG.GCP_PROJECT,
  })
  if (!response || !response.data || !response.data.services) return []

  loggerInfo(`Found ${response.data.services.length} services`)
  return response.data.services.map((element) => {
    return String(element.id)
  })
}

export const getVersions = async (
  appEngine: appengine_v1.Appengine,
  serviceID: string
): Promise<VersionType[]> => {
  if (!serviceID || serviceID === '') return []

  loggerInfo(`SID: ${serviceID}: Getting versions...`)
  const response = await appEngine.apps.services.versions.list({
    appsId: CONFIG.GCP_PROJECT,
    servicesId: serviceID,
    fields: 'versions.id,versions.createTime',
  })
  if (!response || !response.data || !response.data.versions) return []

  loggerInfo(`SID: ${serviceID}: Found ${response.data.versions.length} versions`)
  return response.data.versions
    .map((element) => {
      const versionType: VersionType = {
        serviceID,
        versionID: String(element.id),
        date: String(element.createTime),
      }
      return versionType
    })
    .sort((a, b) => {
      return a.date > b.date ? -1 : 1
    })
}

export const skipAllocated = async (
  appEngine: appengine_v1.Appengine,
  versions: VersionType[],
  serviceID: string
) => {
  if (!versions || versions.length === 0) return []
  if (!serviceID || serviceID === '') return versions

  loggerInfo(`SID: ${serviceID}: Skipping versions with allocated traffic...`)
  const response = await appEngine.apps.services.get({
    appsId: CONFIG.GCP_PROJECT,
    servicesId: serviceID,
  })

  if (!response || !response.data || !response.data.split || !response.data.split.allocations)
    return versions

  const allocatedVersions = Object.keys(response.data.split.allocations)
  return versions.filter((element) => {
    return !allocatedVersions.includes(element.versionID)
  })
}

export const skipVersions = (versions: VersionType[], serviceID: string) => {
  if (!versions || versions.length === 0) return []

  loggerInfo(`SID: ${serviceID}: Skipping the newest ${CONFIG.SKIP_COUNT} versions...`)
  return versions.slice(CONFIG.SKIP_COUNT)
}

export const skipUnique = (versions: VersionType[], serviceID: string) => {
  if (!versions || versions.length === 0) return []

  loggerInfo(
    `SID: ${serviceID}: Skipping the newest versions for ${CONFIG.SKIP_UNIQUE_COUNT} unique dates...`
  )
  let keepCounter = 0
  let lastVersionDate: string = ''
  return versions.filter((element) => {
    if (keepCounter >= CONFIG.SKIP_UNIQUE_COUNT) return true

    const currentVersionDate = new Date(element.date).toDateString()
    if (lastVersionDate === currentVersionDate) return true

    keepCounter += 1
    lastVersionDate = currentVersionDate
    return false
  })
}

const getVersionsToRemove = async (
  appEngine: appengine_v1.Appengine,
  versions: VersionType[],
  serviceID: string
) => {
  if (!versions || versions.length === 0) return []
  if (!serviceID || serviceID === '') return []

  let removeVersions: VersionType[] = []

  if (CONFIG.SKIP_ALLOCATED === 'true')
    removeVersions = await skipAllocated(appEngine, versions, serviceID)

  removeVersions = skipVersions(removeVersions, serviceID)

  if (CONFIG.SKIP_UNIQUE === 'true') removeVersions = skipUnique(removeVersions, serviceID)

  return removeVersions
}

const removeVersions = async (
  appEngine: appengine_v1.Appengine,
  versions: VersionType[],
  serviceID: string
) => {
  loggerInfo(`SID: ${serviceID}: Number of versions to remove: ${versions.length}`)
  if (!versions || versions.length === 0) return
  loggerInfo(
    `${divider()}\nSID: ${serviceID}: \n${stringify(versions, { maxLength: 254 })}\n${divider()}`
  )
  asyncForEach(versions, async (element: VersionType) => {
    try {
      await appEngine.apps.services.versions.delete({
        appsId: CONFIG.GCP_PROJECT,
        servicesId: element.serviceID,
        versionsId: element.versionID,
      })
    } catch (err) {
      loggerError(err)
    }
  })
}

const main = async () => {
  try {
    const appEngine = await getAppEngine()

    const serviceIDs = await getServices(appEngine)
    if (!serviceIDs || serviceIDs.length === 0) setFailed('App Engine service(s) not found')

    const removedVersionsResult: {}[] = []
    await asyncForEach(serviceIDs, async (serviceID: string) => {
      const versions = await getVersions(appEngine, serviceID)

      const filteredVersions = await getVersionsToRemove(appEngine, versions, serviceID)

      if (CONFIG.DRY_RUN === 'false') await removeVersions(appEngine, filteredVersions, serviceID)
      else {
        loggerInfo(
          `${divider()}\nSID: ${serviceID}: DRY_RUN: Number of versions that would be removed: ${
            filteredVersions.length
          }\n${stringify(filteredVersions, { maxLength: 254 })}\n${divider()}`
        )
      }

      removedVersionsResult.push({ service: serviceID, versions: filteredVersions })
    })
  } catch (err) {
    loggerError(err)
    setFailed('Failed to cleanup App Engine versions')
  }
}

const run = () => {
  main()
}

run()

export default run
