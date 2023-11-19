# nRF52840 Dongle

## 1. Introduction

This guide explains how to flash **nRF52840 Dongle** with pre-compiled HCI controller firmware.

![nRF52840 Dongle Image](./imgs/nrf52840-dongle.png)

[nRF52840 Dongle Documentation](https://www.nordicsemi.com/Products/Development-hardware/nrf52840-dongle)

**Note**: The nRF52840 Dongle can be ordered through electronics distributors like:

- [Digi-Key](https://www.digikey.com/),
- [Farnell](https://www.farnell.com/),
- [Mouser](https://www.mouser.com/),
- [RS Components](https://www.rs-online.com/).

## 2. Install nRF Connect for Desktop

Download and install the **nRF Connect for Desktop** from the following link: [NRF Connect for Desktop](https://www.nordicsemi.com/Products/Development-tools/nRF-Connect-for-Desktop/Download?lang=en#infotabs).

## 3. Install the Programmer Tool

- Start `nRF Connect for Desktop`.
- Look for and install the `Programmer` tool.

![nRF Connect for Desktop](imgs/nrf-connect.png)

## 4. Connect and program

- Open the `Programmer` tool.
- Connect the **nRF52840 dongle** to your computer.
- Click on `Select Devices` and choose the device for flashing. It should appear on the list as **Open DFU Bootloader**.

![Programmer Tool Image](imgs/nrf-select-device.png)

## 5. Add firmware file

Locate and select the firmware file from `/zephyr/hci_uart/nrf52840dongle_nrf52840.hex`.

## 6. Flash the firmware

- Click on the `Write` button.
- Patiently wait for the flashing operation to complete.

![Programmer Tool Image](imgs/nrf-flash.png)
