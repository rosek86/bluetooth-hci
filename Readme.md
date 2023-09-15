# n-ble - Bluetooth 5 Host Library Documentation

This library is written in TypeScript and implements the Bluetooth 5 host. 

## Getting Started

The most straightforward method to test this library is by utilizing the **nRF52840 dongle**. Simply use the pre-compiled firmware located at `/zephyr/hci_uart/zephyr.hex`.

## Alternative Setup Options

While the nRF52840 dongle offers an easy-to-use solution, there are other alternatives. However, keep in mind that these methods may depend on your operating system and might need additional development for full compatibility.

1. **Linux HCI Interface**: This interface allows the use of the Linux Host Controller Interface for Bluetooth.
2. **Standard Bluetooth USB Subsystem**: This provides a common interface for Bluetooth USB devices.
3. **HCI Controller via UART**: This method requires either a direct UART connection or using a third-party UART to USB adapter.

## Run example

Simple LE Bluetooth scanner

```
npx ts-node examples/le-scanner.ts
```

## Further Reading

Getting Started Guid [GettingStarted.md](docs/GettingStarted.md).

To build and flash the firmware, detailed steps are provided in [ZephyrHciController.md](docs/ZephyrHciController.md).
