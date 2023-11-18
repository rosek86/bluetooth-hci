#!/bin/bash
set -e

npm run release

# Copy hex files to dist
mkdir -p dist/hex
cp zephyr/hci_uart/nrf52840dongle_nrf52840.hex dist/hex
cp zephyr/hci_uart/nrf52840dk_nrf52840.hex dist/hex

npm publish
