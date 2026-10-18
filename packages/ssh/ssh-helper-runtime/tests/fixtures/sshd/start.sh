#!/bin/sh
set -eu
ssh-keygen -q -t ed25519 -N '' -f /etc/ssh/ssh_host_ed25519_key
install -d -m 700 -o alego -g alego /home/alego/.ssh
install -m 600 -o alego -g alego /fixture-key.pub /home/alego/.ssh/authorized_keys
install -d -m 700 -o alego -g alego /home/alego/workspace
exec /usr/sbin/sshd -D -e -f /etc/ssh/sshd_config
