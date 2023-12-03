# Advertising and scanning using Coded PHY

To run this example it is necessary to have two nRF52840 dongles connected to your PC.

Open two terminals and run:

```sh
npm run build
node lib/examples/CodedPHY/advertising.js --device-id 0
```

```sh
node lib/examples/CodedPHY/scanning.js --device-id 1
```

![Coded PHY example](./imgs/coded-phy.png)
