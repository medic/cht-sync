#!/bin/sh

# todo 1 - get this to check github to see if $1 is in medic org and if they have an ssh key, fail if not
# todo 2 - write this in node per Medic's requirements?
curl -qs https://github.com/mrjones-plip.keys
curl -qs https://github.com/dianabarsan.keys