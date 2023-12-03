# Getting started with bluetooth-hci library

Follow this guide to set up and start using the `bluetooth-hci` library.

## 1. Board setup

Currently, the best device to serve as an HCI controller is the **nRF52840 Dongle**. It is relatively inexpensive, has a sufficient RAM footprint, and is compact in size. The **nRF52840 DK** is also a good candidate, but it is significantly more expensive. I also provide precompiled firmware for the **nRF5340 DK**; however, its network core has only 64 kB of RAM, which has limited its functionality.

- [nRF52840 Dongle](nRF52840dongle.md)
- [nRF52840 DK](nRF52840dk.md)
- [nRF5340 DK](nRF5340dk.md)

## 2. Install dependencies and build

Run the following commands:

```sh
npm ci
npm run build
```

## 3. Run the example

Execute the example with:

```sh
node lib/examples/le-scanner.js
```

With these steps, you're now set up and running with the `bluetooth-hci` library!
