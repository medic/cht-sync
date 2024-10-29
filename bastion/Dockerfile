# NOSONAR for "don't run docker images as root" - because sshd requires root https://superuser.com/a/1548482 :(
# Deep link to Sonar "safe": https://sonarcloud.io/project/security_hotspots?status=SAFE&pullRequest=177&id=medic_cht-sync&tab=activity

FROM alpine:3.20

ARG HOME=/var/lib/bastion

ARG USER=bastion
ARG GROUP=bastion
ARG UID=4096
ARG GID=4096

ENV HOST_KEYS_PATH_PREFIX="/usr"
ENV HOST_KEYS_PATH="${HOST_KEYS_PATH_PREFIX}/etc/ssh"

COPY bastion /usr/sbin/bastion
COPY get_keys.sh /usr/sbin/get_keys.sh

RUN addgroup -S -g ${GID} ${GROUP} \
    && adduser -D -h ${HOME} -s /bin/false -g "${USER} service" \
           -u ${UID} -G ${GROUP} ${USER} \
    && sed -i "s/${USER}:!/${USER}:*/g" /etc/shadow \
    && set -x \
    && apk add --no-cache openssh-server curl \
    && echo -e "\nLogin Successful! \n\nHowever, interactive sessions not allowed. Use \"-N\" with ssh tunnel command instead: \n" > /etc/motd \
    && echo -e "\tssh -N -L 5432:CONTAINER-NAME-HERE:5432 bastion@127.0.0.1 -p 22222\n" >> /etc/motd \
    && chmod +x /usr/sbin/bastion \
    && chmod +x /usr/sbin/get_keys.sh \
    && mkdir -p ${HOST_KEYS_PATH} \
    && mkdir /etc/ssh/auth_principals \
    && echo "bastion" > /etc/ssh/auth_principals/bastion

ENTRYPOINT ["bastion"]