// @ts-nocheck
import { asyncForEach, getAppEngine, getServices, getVersions, skipAllocated } from '../index'
import { google } from 'googleapis'
import { mocked } from 'ts-jest/utils'
// import CONFIG from '../config'

jest.mock('../config', () => ({
  __esModule: true,
  default: {
    NODE_ENV: 'development',
    GCP_PROJECT: 'TEST_PROJECT_ID',
    GCP_APPLICATION_CREDENTIALS: 'TEST-CREDENTIALS',
    DRY_RUN: 'false',
    SKIP_ALLOCATED: 'true',
    SKIP_COUNT: 5,
    SKIP_UNIQUE: 'false',
    SKIP_UNIQUE_COUNT: 10,
  },
}))

jest.mock('@actions/core', () => {
  return {
    __esModule: true,
    default: {
      setFailed: () => jest.fn(),
    },
  }
})
jest.mock('googleapis')
const mockedGoogle = mocked(google)

let mockAppEngine
beforeEach(() => {
  jest.resetAllMocks()
  mockAppEngine = {
    apps: {
      services: {
        get: jest.fn(),
        list: jest.fn(),
        versions: {
          list: jest.fn(),
          delete: jest.fn(),
        },
      },
    },
  }
  mockedGoogle.auth.fromJSON = jest.fn().mockReturnValue('mockClient')
  mockedGoogle.appengine = jest.fn().mockReturnValue(mockAppEngine)
})

// describe('when asyncForEach is called with array length 2', () => {
//   it('should call callback 2 times', async () => {
//     const callback = jest.fn()
//     const array = ['First', 'Second']
//     await asyncForEach(array, callback)
//     expect(callback).toHaveBeenCalledTimes(2)
//     expect(callback.mock.calls[0][0]).toBe('First')
//     expect(callback.mock.calls[0][1]).toBe(0)
//     expect(callback.mock.calls[0][2]).toBe(array)
//     expect(callback.mock.calls[1][0]).toBe('Second')
//     expect(callback.mock.calls[1][1]).toBe(1)
//     expect(callback.mock.calls[1][2]).toBe(array)
//   })
// })
// describe('when asyncForEach is called with array length 0', () => {
//   it('should not call callback', async () => {
//     const callback = jest.fn()
//     await asyncForEach([], callback)
//     expect(callback).toHaveBeenCalledTimes(0)
//   })
// })

describe('when getAppEngine is called', () => {
  it('should call GoogleAuth with expected keyFile and scopes', async () => {
    await getAppEngine()
    expect(mockedGoogle.auth.fromJSON).toHaveBeenCalledTimes(1)
    expect(mockedGoogle.auth.fromJSON).toHaveBeenCalledWith('TEST-CREDENTIALS')
  })
  it('should call google.appengine 1 time with expected version and auth client', async () => {
    await getAppEngine()
    expect(mockedGoogle.appengine).toHaveBeenCalledTimes(1)
    expect(mockedGoogle.appengine).toHaveBeenCalledWith({ version: 'v1', auth: 'mockClient' })
  })
  it('should return an appengine object', async () => {
    const result = await getAppEngine()
    expect(result).toBe(mockAppEngine)
  })
})

describe('when getServices is called', () => {
  it('should call appengine services list 1 time with expected appsId', async () => {
    await getServices(mockAppEngine)
    expect(mockAppEngine.apps.services.list).toHaveBeenCalledTimes(1)
    expect(mockAppEngine.apps.services.list).toHaveBeenCalledWith({
      appsId: 'TEST_PROJECT_ID',
    })
  })
  it('should return empty array if no services are found', async () => {
    mockAppEngine.apps.services.list.mockReturnValue({
      data: {
        services: [],
      },
    })
    const result = await getServices(mockAppEngine)
    expect(result).toStrictEqual([])
  })
  it('should return array with IDs when services are found', async () => {
    mockAppEngine.apps.services.list.mockReturnValue({
      data: {
        services: [{ id: 'default' }, { id: 'api' }],
      },
    })
    const result = await getServices(mockAppEngine)
    expect(result).toStrictEqual(['default', 'api'])
  })
})

describe('when getVersions is called', () => {
  it('should return empty array if serviceID is not set', async () => {
    const result = await getVersions(mockAppEngine, '')
    expect(result).toStrictEqual([])
  })
  it('should call appengine services versions list 1 time with expected appsId, servicesId and fields', async () => {
    await getVersions(mockAppEngine, 'TEST-SERVICE-ID')
    expect(mockAppEngine.apps.services.versions.list).toHaveBeenCalledTimes(1)
    expect(mockAppEngine.apps.services.versions.list).toHaveBeenCalledWith({
      appsId: 'TEST_PROJECT_ID',
      servicesId: 'TEST-SERVICE-ID',
      fields: 'versions.id,versions.createTime',
    })
  })
  it('should return empty array when no versions are found', async () => {
    mockAppEngine.apps.services.list.mockReturnValue({
      data: {
        versions: [],
      },
    })
    const result = await getVersions(mockAppEngine, 'TEST-SERVICE-ID')
    expect(result).toStrictEqual([])
  })
  it('should return array with sorted objects when versions are found', async () => {
    mockAppEngine.apps.services.versions.list.mockReturnValue({
      data: {
        versions: [
          { id: 'VERSION-1', createTime: 'CREATE-TIME-1-OLDEST' },
          { id: 'VERSION-2', createTime: 'CREATE-TIME-2-LATEST' },
        ],
      },
    })
    const result = await getVersions(mockAppEngine, 'TEST-SERVICE-ID')
    expect(result).toStrictEqual([
      { serviceID: 'TEST-SERVICE-ID', versionID: 'VERSION-2', date: 'CREATE-TIME-2-LATEST' },
      { serviceID: 'TEST-SERVICE-ID', versionID: 'VERSION-1', date: 'CREATE-TIME-1-OLDEST' },
    ])
  })
})

describe('when skipAllocated is called', () => {
  const versions = [
    { serviceID: 'TEST-SERVICE-ID', versionID: 'VERSION-2', date: 'CREATE-TIME-2-LATEST' },
    { serviceID: 'TEST-SERVICE-ID', versionID: 'VERSION-1', date: 'CREATE-TIME-1-OLDEST' },
  ]
  it('should return empty array if versions is empty', async () => {
    const result = await skipAllocated(mockAppEngine, [], '')
    expect(result).toStrictEqual([])
  })
  it('should return versions as is if serviceID is not set', async () => {
    const result = await skipAllocated(mockAppEngine, versions, '')
    expect(result).toStrictEqual(versions)
  })
  it('should call appengine services get 1 time with expected appsId and servicesId', async () => {
    await skipAllocated(mockAppEngine, versions, 'TEST-SERVICE-ID')
    expect(mockAppEngine.apps.services.get).toHaveBeenCalledTimes(1)
    expect(mockAppEngine.apps.services.get).toHaveBeenCalledWith({
      appsId: 'TEST_PROJECT_ID',
      servicesId: 'TEST-SERVICE-ID',
    })
  })
  it('should return versions as is when no versions with allocated traffic are found', async () => {
    mockAppEngine.apps.services.get.mockReturnValue({
      data: {
        split: {
          allocations: [],
        },
      },
    })
    const result = await skipAllocated(mockAppEngine, versions, 'TEST-SERVICE-ID')
    expect(result).toStrictEqual(versions)
  })
  // it('should return only versions with no allocated traffic', async () => {
  //   mockAppEngine.apps.services.get.mockReturnValue({
  //     data: {
  //       split: {
  //         allocations: [{ 'VERSION-2': 'HAS TRAFFIC' }],
  //       },
  //     },
  //   })
  //   const result = await skipAllocated(mockAppEngine, versions2, 'TEST-SERVICE-ID')
  //   expect(result).toStrictEqual([
  //     { serviceID: 'TEST-SERVICE-ID', versionID: 'VERSION-1', date: 'CREATE-TIME-1-OLDEST' },
  //   ])
  // })
  // it('should return array with sorted objects when versions are found', async () => {
  //   mockAppEngine.apps.services.versions.list.mockReturnValue({
  //     data: {
  //       versions: [
  //         { id: 'VERSION-1', createTime: 'CREATE-TIME-1-OLDEST' },
  //         { id: 'VERSION-2', createTime: 'CREATE-TIME-2-LATEST' },
  //       ],
  //     },
  //   })
  //   const result = await getVersions(mockAppEngine, 'TEST-SERVICE-ID')
  //   expect(result).toStrictEqual([
  //     { serviceID: 'TEST-SERVICE-ID', versionID: 'VERSION-2', date: 'CREATE-TIME-2-LATEST' },
  //     { serviceID: 'TEST-SERVICE-ID', versionID: 'VERSION-1', date: 'CREATE-TIME-1-OLDEST' },
  //   ])
  // })
})
