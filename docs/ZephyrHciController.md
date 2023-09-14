## Create HCI Controller using Zephyr OS

The following was tested using nRF Connect SDK v2.4.2

### Instruction for nRF52840 dongle

1. Install nRF Connect SDK.

    it can be installed using `nRF Connect for Desktop`, link to documentation: https://developer.nordicsemi.com/nRF_Connect_SDK/doc/latest/nrf/index.htmls

2. Create sample application using zephyr/samples/bluetooth/hci_usb example.
3. Add following lines to prj.conf in order to support extended bluetooth features:

    ```
    CONFIG_BT_LL_SW_SPLIT=n
    CONFIG_BT_LL_SOFTDEVICE=y

    CONFIG_BT_EXT_ADV=y
    CONFIG_BT_EXT_ADV_MAX_ADV_SET=2
    CONFIG_BT_EXT_ADV_LEGACY_SUPPORT=y

    CONFIG_BT_PER_ADV=y
    CONFIG_BT_MAX_CONN=2
    CONFIG_BT_BUF_ACL_TX_SIZE=251
    CONFIG_BT_BUF_ACL_TX_COUNT=10
    CONFIG_BT_BUF_ACL_RX_SIZE=251
    CONFIG_BT_BUF_ACL_RX_COUNT=10
    CONFIG_BT_BUF_EVT_RX_SIZE=255
    CONFIG_BT_BUF_EVT_RX_COUNT=10
    CONFIG_BT_BUF_CMD_TX_SIZE=255
    CONFIG_BT_BUF_CMD_TX_COUNT=10

    CONFIG_BT_CTLR_DF=y
    CONFIG_BT_CTLR_PHY_CODED=y
    CONFIG_BT_CTLR_SDC_LLPM=y
    CONFIG_BT_CTLR_SDC_SCAN_BUFFER_COUNT=10
    CONFIG_BT_CTLR_SDC_TX_PACKET_COUNT=3
    CONFIG_BT_CTLR_SDC_RX_PACKET_COUNT=3
    CONFIG_BT_CTLR_SDC_PERIODIC_SYNC_BUFFER_COUNT=2
    CONFIG_BT_CTLR_DATA_LENGTH_MAX=251
    CONFIG_BT_CTLR_TX_PWR_DYNAMIC_CONTROL=y
    CONFIG_BT_CTLR_TX_PWR_PLUS_8=y
    ```
4. Select nrf52840dongle_nrf52840 build configuration.
4. Build HCI Controller.
5. Flash zephyr.hex firmware using `nRF Connect for Desktop`.

### Instruction for nRF52840 Development Kit

It is possible to use the same instruction as for dongle (above) but can use hci_uart example and communicate over serial port directly.
