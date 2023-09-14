# n-ble

This is an attempt to implement Bluetooth 5 host in Typescript. This application requires Bluetooth 5 compatible HCI controller device. I use nRF52840 dongle flashed with Zephyr HCI controller firmware. Steps to build and flash the firmware are described in docs/ZephyrHciController.md.

## Node

Requires node.js 16+

## Linux note

On Linux it is require to remove btusb module `sudo rmmod btusb`.
