# gae-version-cleanup

This action helps you to clean up old versions in [Google App Engine](https://cloud.google.com/appengine/).

## Usage

```yaml
- uses: robinwelin/gae-version-cleanup@master
  with:
    GCP_PROJECT: ${{secrets.GCP_PROJECT}}
    GCP_APPLICATION_CREDENTIALS: ${{secrets.GCP_APPLICATION_CREDENTIALS}}
    DRY_RUN: false
    SKIP_ALLOCATED: true
    SKIP_COUNT: 5
    SKIP_UNIQUE: false
    SKIP_UNIQUE_COUNT: 10
```

### Secrets

`GCP_PROJECT` - (Required) ID of the Google Cloud project

`GCP_APPLICATION_CREDENTIALS` - (Required) The service account key which will be used for authentication (with permission to App Engine). This key should be [created](https://cloud.google.com/iam/docs/creating-managing-service-account-keys), encoded as a [Base64](https://en.wikipedia.org/wiki/Base64) string (eg. `cat my-key.json | base64` on macOS), and stored as a [secret](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/creating-and-using-encrypted-secrets)

### Inputs

`DRY_RUN` - (Optional) Runs the action and outputs all info, but do not deletes any versions. Defaults to `false`, allowed values: `true`, `false`

`SKIP_ALLOCATED` - (Optional) Skip versions with traffic allocation. Defaults to `true`, allowed values: `true`, `false`

`SKIP_COUNT` - (Optional) Skip the newest number of versions. Defaults to `5`

`SKIP_UNIQUE` - (Optional) Skip the newest version each unique date. Defaults to `false`, allowed values: `true`, `false`

`SKIP_UNIQUE_COUNT` - (Optional) Skip the newest version for the number of unqie dates. Defaults to `10`

## Full example

```yaml
name: Google App Engine Version Cleanup
on:
  push:
    branches:
      - master
jobs:
  deploy:
    name: 'GAE Version Cleanup'
    runs-on: [ubuntu-latest]
    steps:
      - uses: robinwelin/gae-version-cleanup@master
        with:
          GCP_PROJECT: ${{secrets.GCP_PROJECT}}
          GCP_APPLICATION_CREDENTIALS: ${{secrets.GCP_APPLICATION_CREDENTIALS}}
          SKIP_UNIQUE: true
          SKIP_UNIQUE_COUNT: 20
```

## Full example multiple GCP projects with same service account

```yaml
name: Google App Engine Version Cleanup
on:
  push:
    branches:
      - master
jobs:
  deploy:
    name: 'GAE Version Cleanup'
    runs-on: [ubuntu-latest]
    strategy:
      matrix:
        GCP_PROJECTS: [project_1, project_2, project_3]
    steps:
      - name: Running cleanup for ${{ matrix.GCP_PROJECTS }}
        uses: robinwelin/gae-version-cleanup@master
        with:
          GCP_PROJECT: ${{ matrix.GCP_PROJECTS }}
          GCP_APPLICATION_CREDENTIALS: ${{secrets.GCP_SERVICE_ACCOUNT}}
          SKIP_UNIQUE: true
          SKIP_UNIQUE_COUNT: 20

## Licence

[MIT License](https://github.com/robinwelin/gae-version-cleanup/blob/master/LICENSE)
