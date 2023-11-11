# bluetooth-hci

NOTE: This is the initial version of the library, with basic functionalities such as advertising and scanning operational. It is possible to establish a connection, but further development is required to bring this library to a production-ready level.

The library implements a Bluetooth 5 HCI host, focusing mainly on Bluetooth Low Energy (LE).

## Getting started

The most straightforward method to test this library is by utilizing the **nRF52840 Dongle**. Simply load the pre-compiled firmware located at `/zephyr/hci_uart/zephyr.hex`. A detailed description explaining how to prepare the nRF52840 Dongle can be found [here](docs/GettingStarted.md).

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
    const adapter = new HciAdapter(await createHciSerial());
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

Additional examples are available in the 'examples' directory.

## Alternative setup options

While the nRF52840 dongle provides an easy-to-use solution, other alternatives are available. However, keep in mind that these methods may vary depending on your operating system and might require additional development to ensure full compatibility.

1. **Linux HCI Interface**: This interface enables the use of the Linux Host Controller Interface (HCI) for Bluetooth connectivity.
2. **Standard Bluetooth USB Subsystem**: This offers a universal interface for Bluetooth USB devices.
3. **HCI Controller via UART**: This method necessitates either a direct UART (Universal Asynchronous Receiver-Transmitter) connection or the use of a third-party UART-to-USB adapter.

## Run example

Simple LE Bluetooth scanner:

```
npx ts-node examples/le-scanner.ts
```

## Further reading

- Getting Started Guide [GettingStarted.md](docs/GettingStarted.md)
- Advertising and scanning using Coded PHY [CodedPHY.md](docs/CodedPHY.md)
- Build HCI firmware [ZephyrHciController.md](docs/ZephyrHciController.md).
