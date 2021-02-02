export enum LeState {
  ScanUndirectAdv,
  ConnScanUndirectAdv,
  NonConnNonScanUndirectAdv,
  HighDutyConnDirectAdv,
  LowDutyConnDirectAdv,
  ActiveScanning,
  PassiveScanning,
  Initiating,
  ConnectionMasterRole,
  ConnectionSlaveRole,
}

export const LeStateNames = [
  'Scannable Undirected Advertising State',
  'Connectable and Scannable Undirected Advertising State',
  'Non-connectable and Non-Scannable Undirected Advertising State',
  'High Duty Cycle Connectable Directed Advertising State',
  'Low Duty Cycle Connectable Directed Advertising State',
  'Active Scanning State',
  'Passive Scanning State',
  'Initiating State',
  'Connection State (Master Role)',
  'Connection State (Slave Role)'
];

export const LeAllowedStates: LeState[][] = [
  [LeState.NonConnNonScanUndirectAdv                              ], // bit0
  [LeState.ScanUndirectAdv                                        ], // bit1
  [LeState.ConnScanUndirectAdv                                    ], // bit2
  [LeState.HighDutyConnDirectAdv                                  ], // bit3
  [LeState.PassiveScanning                                        ], // bit4
  [LeState.ActiveScanning                                         ], // bit5
  [LeState.Initiating                                             ], // bit6
  [LeState.ConnectionSlaveRole                                    ], // bit7
  [LeState.NonConnNonScanUndirectAdv, LeState.PassiveScanning     ], // bit8
  [LeState.ScanUndirectAdv,           LeState.PassiveScanning     ], // bit9
  [LeState.ConnScanUndirectAdv,       LeState.PassiveScanning     ], // bit10
  [LeState.HighDutyConnDirectAdv,     LeState.PassiveScanning     ], // bit11
  [LeState.NonConnNonScanUndirectAdv, LeState.ActiveScanning      ], // bit12
  [LeState.ScanUndirectAdv,           LeState.ActiveScanning      ], // bit13
  [LeState.ConnScanUndirectAdv,       LeState.ActiveScanning      ], // bit14
  [LeState.HighDutyConnDirectAdv,     LeState.ActiveScanning      ], // bit15
  [LeState.NonConnNonScanUndirectAdv, LeState.Initiating          ], // bit16
  [LeState.ScanUndirectAdv,           LeState.Initiating          ], // bit17
  [LeState.NonConnNonScanUndirectAdv, LeState.ConnectionMasterRole], // bit18
  [LeState.ScanUndirectAdv,           LeState.ConnectionMasterRole], // bit19
  [LeState.NonConnNonScanUndirectAdv, LeState.ConnectionSlaveRole ], // bit20
  [LeState.ScanUndirectAdv,           LeState.ConnectionSlaveRole ], // bit21
  [LeState.PassiveScanning,           LeState.Initiating          ], // bit22
  [LeState.ActiveScanning,            LeState.Initiating          ], // bit23
  [LeState.PassiveScanning,           LeState.ConnectionMasterRole], // bit24
  [LeState.ActiveScanning,            LeState.ConnectionMasterRole], // bit25
  [LeState.PassiveScanning,           LeState.ConnectionSlaveRole ], // bit26
  [LeState.ActiveScanning,            LeState.ConnectionSlaveRole ], // bit27
  [LeState.Initiating,                LeState.ConnectionMasterRole], // bit28
  [LeState.LowDutyConnDirectAdv                                   ], // bit29
  [LeState.LowDutyConnDirectAdv,      LeState.PassiveScanning     ], // bit30
  [LeState.LowDutyConnDirectAdv,      LeState.ActiveScanning      ], // bit31
  [LeState.ConnScanUndirectAdv,       LeState.Initiating          ], // bit32
  [LeState.HighDutyConnDirectAdv,     LeState.Initiating          ], // bit33
  [LeState.LowDutyConnDirectAdv,      LeState.Initiating          ], // bit34
  [LeState.ConnScanUndirectAdv,       LeState.ConnectionMasterRole], // bit35
  [LeState.HighDutyConnDirectAdv,     LeState.ConnectionMasterRole], // bit36
  [LeState.LowDutyConnDirectAdv,      LeState.ConnectionMasterRole], // bit37
  [LeState.ConnScanUndirectAdv,       LeState.ConnectionSlaveRole ], // bit38
  [LeState.HighDutyConnDirectAdv,     LeState.ConnectionSlaveRole ], // bit39
  [LeState.LowDutyConnDirectAdv,      LeState.ConnectionSlaveRole ], // bit40
  [LeState.Initiating,                LeState.ConnectionSlaveRole ], // bit41
];

export class LeSupportedStates {
  public readonly states: LeState[][];

  private constructor(states: LeState[][]) {
    this.states = states;
  }

  public static fromBitmask(bitmask: bigint): LeSupportedStates{
    const states: LeState[][] = [];
    for (let b = 0n; b <= 41n; b++) {
      if ((bitmask & (1n << b)) !== 0n) {
        states.push(LeAllowedStates[Number(b)]);
      }
    }
    return new LeSupportedStates(states);
  }

  public toString(): string[][] {
    const strStates: string[][] = [];
    for (const state of this.states) {
      strStates.push(state.map((e) => LeStateNames[e]));
    }
    return strStates;
  }
}
