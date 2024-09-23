# superset-backup Shared GitHub action


The `superset-backup` is a parameterised reusable GitHub action that exports dashboard config from a Superset instance and saves it as a zip file in the repository that uses the action.

This action uses the Superset API to authenticate and export dashboard config.
Backups are saved in `/superset/backups` folder, as zip files named based on the date and time when the backups ware generated. eg. `/superset/backups/20240918082215.zip`. 
The format of the export is controlled by Superset and no additional transformation is done within this action. 

Requires the following variables: 
- `gh_token`: GitHub token that has access to push to the main branch of the repository.
- `superset_link`: Http link to the superset instance. Eg: https://superset.app.com
- `superset_user`: Superset username that has access to the superset API
- `superset_password`: Password of the Superset user

## Example GitHub Step

```
name: Example GitHub Workflow yml

on: ['push']

jobs:
  deployment:
    runs-on: ubuntu-latest
    steps:
      - name: Make backup
        uses: 'medic/cht-sync/.github/actions/superset-backup@main'
        with:
          gh_token: ${{ secrets.GH_TOKEN }}
          superset_link: ${{ secrets.SUPERSET_LINK }}
          superset_user: ${{ secrets.SUPERSET_USER }}
          superset_password: ${{ secrets.SUPERSET_PASSWORD }}
```
