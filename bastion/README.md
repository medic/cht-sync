This project hard forked from [docker-bastion](https://github.com/binlab/docker-bastion/tree/master) at version [1.2.0](https://github.com/binlab/docker-bastion/releases/tag/v1.2.0)

Per MIT license, copyright of this `bastion` sub-directory is Mark/binlab/mark.binlab@gmail.com and MIT license file perists.

Sample SSH tunnel:

```shell
ssh -N -L 5432:cht-sync-postgres-1:5432 bastion@127.0.0.1 -p 22222
```