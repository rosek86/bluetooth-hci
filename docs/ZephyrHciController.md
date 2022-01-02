## Create HCI Controller using Zephyr OS

### Instruction for nRF52840 dongle

1. Install nRF Connect SDK.

    it can be installed using `nRF Connect for Desktop`, link to documentation: https://developer.nordicsemi.com/nRF_Connect_SDK/doc/latest/nrf/index.htmls

2. Create sample application using zephyr/samples/bluetooth/hci_usb example.
3. Enable extended advertisements and coded phy:

    ```
    CONFIG_BT_LL_SW_SPLIT=n
    CONFIG_BT_CTLR_PHY_CODED=y
    CONFIG_BT_EXT_ADV=y
    ```
4. Select nrf52840dongle_nrf52840 build configuration.
4. Build HCI Controller.
5. Flash zephyr.hex firmware using `nRF Connect for Desktop`.

### Instruction for nRF52840 Development Kit

It is possible to use the same instruction as for dongle (above) but can use hci_uart example and communicate over serial port directly.
