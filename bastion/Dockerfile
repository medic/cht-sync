# NOSONAR - because sshd requires root https://superuser.com/a/1548482 :(
# todo - NOSONAR doesn't work on a different line than the offending line. need to figure out: "If this image is
# already explicitly set to launch with a non-privileged user, you can add it to the safe images list rule
# property of your SonarQube instance, without the tag."
# https://sonarcloud.io/project/security_hotspots?id=medic_cht-sync&pullRequest=177&issueStatuses=OPEN%2CCONFIRMED&sinceLeakPeriod=true&tab=how_to_fix

FROM alpine:3.20

ARG HOME=/var/lib/bastion

ARG USER=bastion
ARG GROUP=bastion
ARG UID=4096
ARG GID=4096

ENV HOST_KEYS_PATH_PREFIX="/usr"
ENV HOST_KEYS_PATH="${HOST_KEYS_PATH_PREFIX}/etc/ssh"

COPY bastion /usr/sbin/bastion

RUN addgroup -S -g ${GID} ${GROUP} \
    && adduser -D -h ${HOME} -s /bin/ash -g "${USER} service" \
           -u ${UID} -G ${GROUP} ${USER} \
    && sed -i "s/${USER}:!/${USER}:*/g" /etc/shadow \
    && set -x \
    && apk add --no-cache openssh-server \
    && echo "Welcome to Bastion!" > /etc/motd \
    && chmod +x /usr/sbin/bastion \
    && mkdir -p ${HOST_KEYS_PATH} \
    && mkdir /etc/ssh/auth_principals \
    && echo "bastion" > /etc/ssh/auth_principals/bastion

ENTRYPOINT ["bastion"]