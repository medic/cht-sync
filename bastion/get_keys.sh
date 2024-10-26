#!/bin/sh

# todo 1 - get this to check github to see if $1 is in medic org and if they have an ssh key, fail if not
# todo 2 - write this in node per Medic's requirements?
echo $1 >> /tmp/logins
echo ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKlJwZnBVjIpPgUu2GF34cPwUIFXapstbch8XfLn3rfR
