import { createHciSerial } from "../src";
import { Hci, H4 } from "../src";

(async () => {
  const port = await createHciSerial();
  await port.open();

  const hci = new Hci({
    send: (packetType, data) => {
      port.write(Buffer.from([packetType, ...data]));
    },
  });

  const h4 = new H4();

  port.on("data", (data) => {
    let result = h4.parse(data);
    do {
      if (result) {
        hci.onData(result.type, Buffer.from(result.packet));
        result = h4.parse(Buffer.alloc(0));
      }
    } while (result);
  });

  const commands = await hci.readLocalSupportedCommands();
  console.log(commands);

  port.close();
})();
