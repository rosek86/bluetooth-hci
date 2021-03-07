const messages = [
  'ExchangeMtu',
  'FindInformation',
  'FindByTypeValue',
  'ReadByType',
  'Read',
  'ReadBlob',
  'ReadMultiple',
  'ReadByGroupType',
  'Write',
  'PrepareWrite',
  'ExecuteWrite',
  'ReadMultipleVariable',
];

function genRequest(Name) {
  const name = Name.charAt(0).toLowerCase() + Name.slice(1);
  return `
    public async ${name}Req(req: Att${Name}ReqMsg): Promise<Att${Name}RspMsg> {
      const waitAttRsp = this.waitAttEvent<Att${Name}RspMsg>(
        '${Name}Rsp', AttOpcode.${Name}Req
      );
      await this.writeAtt(Att${Name}Req.serialize(req));
      return await waitAttRsp;
    }`;
}

function genRequests() {
  for (const msg of messages) {
    console.log(genRequest(msg));
  }
}

function genResponse(Name) {
  const name = Name.charAt(0).toLowerCase() + Name.slice(1);
  return `
    public async ${name}Rsp(rsp: Att${Name}RspMsg): Promise<void> {
      await this.writeAtt(Att${Name}Rsp.serialize(rsp));
    }`;
}

function genResponses() {
  for (const msg of messages) {
    console.log(genResponse(msg));
  }
}

function genImports() {
  const genImport = (name) => {
    return `      Att${name}Req, Att${name}ReqMsg, Att${name}Rsp, Att${name}RspMsg,\n`;
  };
  let imports = '\n      AttErrorRsp, AttErrorRspMsg,\n';
  for (const msg of messages) {
    imports += genImport(msg);
  }
  console.log(`
    import {${imports}    } from './AttSerDes';`
  );
}

function genSerDes(name) {
  return `
    export interface Att${name}ReqMsg {
    }

    export class Att${name}Req {
      static serialize(data: Att${name}ReqMsg): Buffer {
        return Buffer.allocUnsafe(0);
      }

      static deserialize(buffer: Buffer): Att${name}ReqMsg|null {
        return null;
      }
    }

    export interface Att${name}RspMsg {
    }

    export class Att${name}Rsp {
      static serialize(data: Att${name}RspMsg): Buffer {
        return Buffer.allocUnsafe(0);
      }

      static deserialize(buffer: Buffer): Att${name}RspMsg|null {
        return null;
      }
    }`;
}

function genSerDeses() {
  for (const msg of messages) {
    console.log(genSerDes(msg));
  }
}

function genEventCase(name) {
  return `
  case AttOpcode.${name}Req: {
    const result = Att${name}Req.deserialize(data);
    if (!result) {
      return debug('Cannot parse ${name}Req');
    }
    debug(\`${name}Req: \${result}\`);

    this.emit('${name}Req', result);
    break;
  }
  case AttOpcode.${name}Rsp: {
    const result = Att${name}Rsp.deserialize(data);
    if (!result) {
      return debug('Cannot parse ${name}Rsp');
    }
    debug(\`${name}Rsp: \${result}\`);

    this.emit('${name}Rsp', result);
    break;
  }`;
}

function genEventCases() {
  for (const msg of messages) {
    console.log(genEventCase(msg));
  }
}

genRequests();
genResponses();
genImports();
genSerDeses();
genEventCases();
