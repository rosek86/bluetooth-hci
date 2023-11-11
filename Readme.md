# bluetooth-hci

NOTE: This is very initial version, do not try it unless you'd like to help with library development.

This library is written in TypeScript and implements the Bluetooth 5 host.

## Getting Started

The most straightforward method to test this library is by utilizing the **nRF52840 dongle**. Simply use the pre-compiled firmware located at `/zephyr/hci_uart/zephyr.hex`.

```
npm install bluetooth-hci
```

## Simple scanning example

```ts
import { createHciSerial } from 'bluetooth-hci/lib/utils/SerialHciDevice';
import { HciAdapter } from 'bluetooth-hci/lib/utils/HciAdapter';
import { AdvData } from 'bluetooth-hci/lib/gap/AdvData';

import {
  LeOwnAddressType,
  LeScanningFilterPolicy,
  LeScanType,
  LeScanFilterDuplicates
} from 'bluetooth-hci/lib/hci/HciLeController';

(async () => {
  try {
    const adapter = new HciAdapter(await createHciSerial(0, {}));
    await adapter.open();

    await adapter.defaultAdapterSetup();

    await adapter.Hci.leSetExtendedScanParameters({
      ownAddressType: LeOwnAddressType.RandomDeviceAddress,
      scanningFilterPolicy: LeScanningFilterPolicy.All,
      scanningPhy: {
        Phy1M: {
          intervalMs: 100,
          windowMs: 100,
          type: LeScanType.Active,
        },
      },
    });
    await adapter.Hci.leSetExtendedScanEnable({
      enable: true,
      filterDuplicates: LeScanFilterDuplicates.Disabled,
    });

    adapter.Hci.on('LeExtendedAdvertisingReport', (report) => {
      console.log(report, AdvData.parse(report.data ?? Buffer.alloc(0)));
    });
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  }
})();
```

Additional examples can be found in examples directory

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

- Getting Started Guide [GettingStarted.md](docs/GettingStarted.md)
- Advertising and scanning using Coded PHY [CodedPHY.md](docs/CodedPHY.md)
- Build HCI firmware [ZephyrHciController.md](docs/ZephyrHciController.md).
