# [1.3.0](https://github.com/medic/cht-sync/compare/v1.2.0...v1.3.0) (2024-12-06)


### Features

* make dbt thread count configurable ([#190](https://github.com/medic/cht-sync/issues/190)) ([17318c1](https://github.com/medic/cht-sync/commit/17318c1fe6cf7529127c866dba8402914dd82fac))

# [1.2.0](https://github.com/medic/cht-sync/compare/v1.1.4...v1.2.0) (2024-12-05)


### Features

* **#174:** bastion Dockerfile and compose file ([#177](https://github.com/medic/cht-sync/issues/177)) ([27d1739](https://github.com/medic/cht-sync/commit/27d1739041cf55b02a6257d4f1f65779d83b2737)), closes [#174](https://github.com/medic/cht-sync/issues/174) [#174](https://github.com/medic/cht-sync/issues/174)

## [1.1.4](https://github.com/medic/cht-sync/compare/v1.1.3...v1.1.4) (2024-10-31)


### Bug Fixes

* how we parse the DBs to be synced and suggest comma separated list instead of a space separated one ([af0b1e8](https://github.com/medic/cht-sync/commit/af0b1e8923eeab1212752b821cfa71f89b7586b6))

## [1.1.3](https://github.com/medic/cht-sync/compare/v1.1.2...v1.1.3) (2024-10-15)


### Bug Fixes

* pin python version to 3.12 ([f84e7ec](https://github.com/medic/cht-sync/commit/f84e7ec0ccef24713d92ddeb0f9c568da0ce4448))

## [1.1.2](https://github.com/medic/cht-sync/compare/v1.1.1...v1.1.2) (2024-10-14)


### Bug Fixes

* **#155:** use semantic release npm module ([#162](https://github.com/medic/cht-sync/issues/162)) ([09ed265](https://github.com/medic/cht-sync/commit/09ed265bff670d5dfab116e5611ded9e8f7cd1f6)), closes [#155](https://github.com/medic/cht-sync/issues/155)

## [1.1.1](https://github.com/medic/cht-sync/compare/v1.1.0...v1.1.1) (2024-10-14)


### Bug Fixes

* **#155:** bump version upon release ([#160](https://github.com/medic/cht-sync/issues/160)) ([85cacd0](https://github.com/medic/cht-sync/commit/85cacd0580f47e44134ffeb13a71bcdd0ccaf574)), closes [#155](https://github.com/medic/cht-sync/issues/155)

# [1.1.0](https://github.com/medic/cht-sync/compare/v1.0.2...v1.1.0) (2024-09-23)


### Features

* **#142:** adds reusable github action that creates backup of superset dashboard export ([#154](https://github.com/medic/cht-sync/issues/154)) ([b0045d4](https://github.com/medic/cht-sync/commit/b0045d4717c4f287b2111a670b7730532b18e610)), closes [#142](https://github.com/medic/cht-sync/issues/142) [#142](https://github.com/medic/cht-sync/issues/142)

## [1.0.2](https://github.com/medic/cht-sync/compare/v1.0.1...v1.0.2) (2024-09-13)


### Bug Fixes

* **#145:** adds volume mount for postgres ([a128f71](https://github.com/medic/cht-sync/commit/a128f71d9354929aa633e1ab75e3a5be814ee09c)), closes [#145](https://github.com/medic/cht-sync/issues/145)

## [1.0.1](https://github.com/medic/cht-sync/compare/v1.0.0...v1.0.1) (2024-09-13)


### Bug Fixes

* **#151:** failing build github action ([452f6f8](https://github.com/medic/cht-sync/commit/452f6f8d62ae21d8ef45804f236af4e0520b6628)), closes [#151](https://github.com/medic/cht-sync/issues/151)

# 1.0.0 (2024-09-10)


### Bug Fixes

* Change env variables according to cht pipeline updates ([#71](https://github.com/medic/cht-sync/issues/71)) ([c89aadf](https://github.com/medic/cht-sync/commit/c89aadf71c4562dcd1ef79747f4ebc7733796459))
* Fix numbering ([#50](https://github.com/medic/cht-sync/issues/50)) ([5c93300](https://github.com/medic/cht-sync/commit/5c93300d2009c37b50088e4892795b7bce88a6c2))


### Features

* **#107:** Adds multi-db watcher support ([#113](https://github.com/medic/cht-sync/issues/113)) ([279d8f2](https://github.com/medic/cht-sync/commit/279d8f25e051c9d3ff9e8b46baa7f5faaecb2290)), closes [#107](https://github.com/medic/cht-sync/issues/107) [#107](https://github.com/medic/cht-sync/issues/107)
* **#112:** drop support for multiple copies of every document ([#115](https://github.com/medic/cht-sync/issues/115)) ([b46f288](https://github.com/medic/cht-sync/commit/b46f288f5cc15b28196f938141df36520d0f4674)), closes [#112](https://github.com/medic/cht-sync/issues/112) [#118](https://github.com/medic/cht-sync/issues/118)
* **#129:** add back automatic pipeline updates ([#130](https://github.com/medic/cht-sync/issues/130)) ([fc73fd7](https://github.com/medic/cht-sync/commit/fc73fd707cd6db76b12d7b03d356709bc726db07)), closes [#129](https://github.com/medic/cht-sync/issues/129) [#129](https://github.com/medic/cht-sync/issues/129) [#129](https://github.com/medic/cht-sync/issues/129)
* **#1:** first release ([ff0fedd](https://github.com/medic/cht-sync/commit/ff0feddeb35f7b78745bd40b7d2fe20e8f99d8c7)), closes [#1](https://github.com/medic/cht-sync/issues/1)
* **#25:** custom databases ([#33](https://github.com/medic/cht-sync/issues/33)) ([cd10db0](https://github.com/medic/cht-sync/commit/cd10db07ad2a0e2879e1eddb6be47c9ba9af10b8)), closes [#25](https://github.com/medic/cht-sync/issues/25)
* **#78:** full refresh on changed objects, only incremental runs continously ([0869ee9](https://github.com/medic/cht-sync/commit/0869ee9a6d4bd7bb4ee07022a55aef09ec085ce3)), closes [#78](https://github.com/medic/cht-sync/issues/78)
* add versioning and releases ([a528aba](https://github.com/medic/cht-sync/commit/a528aba64f3040d8163f2ea5d72f3457acf5dfa0))
* bind sequence token path to host for persistence ([#88](https://github.com/medic/cht-sync/issues/88)) ([e1c3953](https://github.com/medic/cht-sync/commit/e1c39536fc445aa6f88617bf852f8f41b0fc724f))
* remove superset container and update Readme ([#64](https://github.com/medic/cht-sync/issues/64)) ([8acbc93](https://github.com/medic/cht-sync/commit/8acbc9384cbc59c1776727ced63dd603d1fd09c7))
* update logstash base image version and update default configuration files ([#61](https://github.com/medic/cht-sync/issues/61)) ([674582d](https://github.com/medic/cht-sync/commit/674582d08c0b32542b366ca0c46cc03352845ece))
* update postgres version to 16 ([8bf1e84](https://github.com/medic/cht-sync/commit/8bf1e843b8c4821d460a63cc866d02baad7498bf))
