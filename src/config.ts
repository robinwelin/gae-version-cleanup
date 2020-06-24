import * as core from '@actions/core'

type ConfigType = {
  NODE_ENV: string
  GCP_PROJECT: string // GCP PROJECT ID
  GCP_APPLICATION_CREDENTIALS: any // GCP SERVICE ACCOUNT JSON KEY FILE
  DRY_RUN: string // EXECUTE WITHOUT DELETING VERSIONS
  SKIP_ALLOCATED: string // SKIP VERSIONS WITH TRAFFIC ALLOCATION
  SKIP_COUNT: number // SKIP THE NEWEST NUMBER OF VERSIONS
  SKIP_UNIQUE: string // SKIP THE NEWEST VERSION EACH UNIQUE DATE
  SKIP_UNIQUE_COUNT: number // SKIP THE NEWEST VERSION FOR THE NUMBER OF UNIQUE DATES
}

const GCP_APP_CRED_BASE64 = core.getInput('GCP_APPLICATION_CREDENTIALS', { required: true })
const CONFIG: ConfigType = {
  GCP_PROJECT: core.getInput('GCP_PROJECT', { required: true }) || '',
  GCP_APPLICATION_CREDENTIALS: GCP_APP_CRED_BASE64
    ? JSON.parse(Buffer.from(GCP_APP_CRED_BASE64, 'base64').toString('ascii'))
    : '',
  NODE_ENV: core.getInput('NODE_ENV'),
  DRY_RUN: core.getInput('DRY_RUN'),
  SKIP_ALLOCATED: core.getInput('SKIP_ALLOCATED'),
  SKIP_COUNT: Number(core.getInput('SKIP_COUNT')),
  SKIP_UNIQUE: core.getInput('SKIP_UNIQUE'),
  SKIP_UNIQUE_COUNT: Number(core.getInput('SKIP_UNIQUE_COUNT')),
}

export default CONFIG
