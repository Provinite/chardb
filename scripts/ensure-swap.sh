#!/usr/bin/env bash
set -euo pipefail

# Create a swapfile on the dev/staging docker host. Idempotent - safe to re-run.
#
# The t4g.micro host has ~910 MB usable RAM and no swap at all: Amazon Linux
# 2023's zram-generator only creates zram swap on systems with <= 800 MB, so
# this instance falls in a gap and gets none ("zram0: system has too much
# memory (910MB), limit is 800MB, ignoring").
#
# With no swap, memory pressure does not degrade gracefully - the kernel
# livelocks, the ENA transmit path stops, and the instance becomes unreachable
# while still reporting as "running". Swap converts that failure mode into a
# slowdown. It also gives the `prisma migrate deploy` entrypoint somewhere to
# spill during deploys.
#
# Run on the instance:
#   ./scripts/ssh-dev.sh 'bash -s' < scripts/ensure-swap.sh

SWAPFILE="/swapfile"
SWAP_SIZE_MB=2048
SWAPPINESS=10

if [[ $EUID -ne 0 ]]; then
  echo "Re-running with sudo..."
  exec sudo -E bash "$0" "$@"
fi

if swapon --show=NAME --noheadings | grep -qx "$SWAPFILE"; then
  echo "Swap already active on ${SWAPFILE}:"
  swapon --show
  exit 0
fi

if [[ ! -f "$SWAPFILE" ]]; then
  echo "Creating ${SWAP_SIZE_MB}MB swapfile at ${SWAPFILE}..."
  # dd rather than fallocate: the root filesystem is XFS, and swapon rejects
  # files with unwritten extents ("skipping - it appears to have holes").
  dd if=/dev/zero of="$SWAPFILE" bs=1M count="$SWAP_SIZE_MB" status=progress
fi

chmod 600 "$SWAPFILE"

if ! blkid -p "$SWAPFILE" 2>/dev/null | grep -q swap; then
  echo "Formatting swap area..."
  mkswap "$SWAPFILE"
fi

echo "Enabling swap..."
swapon "$SWAPFILE"

if ! grep -qs "^${SWAPFILE}[[:space:]]" /etc/fstab; then
  echo "Persisting to /etc/fstab..."
  printf '%s none swap sw 0 0\n' "$SWAPFILE" >>/etc/fstab
fi

# Prefer RAM; use swap only under genuine pressure. This is a safety net, not
# a capacity extension.
echo "vm.swappiness = ${SWAPPINESS}" >/etc/sysctl.d/99-swappiness.conf
sysctl -q -w "vm.swappiness=${SWAPPINESS}"

echo
echo "Done."
free -m
swapon --show
