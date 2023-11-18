## Create HCI Controller using Zephyr OS

The following was tested using nRF Connect SDK v2.5.0

### Instruction for nRF52840 dongle

The easiest way to use this library is by using nRF52840 dongle with pre-compiled firmware /zephyr/hci_uart/nrf52840dongle_nrf52840.hex. To flash the firmware use nRF Connect for Desktop.

#### Compile hci_uart firmware

1. Install nRF Connect SDK.

    it can be installed using `nRF Connect for Desktop`, link to documentation: https://developer.nordicsemi.com/nRF_Connect_SDK/doc/latest/nrf/index.htmls

2. Create sample application using zephyr/samples/bluetooth/hci_uart example.
3. Add boards/nrf52840dongle_nrf52840.overlay file and select cdc_acm_uart as bluetooth interface:
    ```
    / {
        chosen {
            zephyr,bt-c2h-uart = &cdc_acm_uart;
            /delete-property/ zephyr,console;
            /delete-property/ zephyr,bt-mon-uart;
            /delete-property/ zephyr,uart-mcumgr;
            /delete-property/ zephyr,shell-uart;
        };
    };

    &cdc_acm_uart {
        hw-flow-control;
    };
    ```
4. Check if boards/nrf52840dongle_nrf52840.conf file contains the following lines:
    ```
    CONFIG_USB_DEVICE_STACK=y
    CONFIG_USB_DEVICE_PRODUCT="Zephyr HCI UART"
    CONFIG_USB_CDC_ACM=y
    CONFIG_USB_DEVICE_INITIALIZE_AT_BOOT=n
    ```
5. Update prj.conf in order to support extended bluetooth features:
    ```
    CONFIG_CONSOLE=n
    CONFIG_STDOUT_CONSOLE=n
    CONFIG_UART_CONSOLE=n
    CONFIG_GPIO=y
    CONFIG_SERIAL=y
    CONFIG_UART_INTERRUPT_DRIVEN=y
    CONFIG_SYSTEM_WORKQUEUE_STACK_SIZE=512

    CONFIG_BT=y
    CONFIG_BT_HCI_RAW=y
    CONFIG_BT_HCI_RAW_H4=y
    CONFIG_BT_HCI_RAW_H4_ENABLE=y
    CONFIG_BT_TINYCRYPT_ECC=n
    CONFIG_BT_DATA_LEN_UPDATE=y

    CONFIG_BT_LL_SW_SPLIT=n
    CONFIG_BT_LL_SOFTDEVICE=y

    CONFIG_BT_EXT_ADV=y
    CONFIG_BT_EXT_ADV_MAX_ADV_SET=2
    CONFIG_BT_EXT_ADV_LEGACY_SUPPORT=y

    CONFIG_BT_PER_ADV=y
    CONFIG_BT_MAX_CONN=16
    CONFIG_BT_BUF_ACL_TX_SIZE=251
    CONFIG_BT_BUF_ACL_TX_COUNT=200
    CONFIG_BT_BUF_ACL_RX_SIZE=255
    CONFIG_BT_BUF_ACL_RX_COUNT=64
    CONFIG_BT_BUF_EVT_RX_SIZE=255
    CONFIG_BT_BUF_EVT_RX_COUNT=200
    CONFIG_BT_BUF_EVT_DISCARDABLE_SIZE=255
    CONFIG_BT_BUF_CMD_TX_SIZE=255
    CONFIG_BT_BUF_CMD_TX_COUNT=64

    CONFIG_BT_CTLR=y
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
    CONFIG_BT_CTLR_DTM_HCI=n
    CONFIG_BT_CTLR_ASSERT_HANDLER=y
    CONFIG_BT_CTLR_CRYPTO=y
    CONFIG_BT_CTLR_LE_ENC=y
    CONFIG_BT_CTLR_PRIVACY=y
    CONFIG_BT_CTLR_FILTER_ACCEPT_LIST=y

    CONFIG_USE_SEGGER_RTT=n
    CONFIG_RTT_CONSOLE=n
    CONFIG_LOG=n

    ```
4. Select nrf52840dongle_nrf52840 build configuration.
4. Build HCI Controller.
5. Flash nrf52840dongle_nrf52840.hex firmware using `nRF Connect for Desktop`.

### Instruction for nRF52840 Development Kit

It is possible to use the same instruction as for dongle (above) but can use hci_uart example and communicate over serial port directly.
