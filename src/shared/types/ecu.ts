export interface EcuScaling {
  offset: number;
  factor: number;
}

export interface EcuMapDimensions {
  rows: number;
  cols: number;
}

export interface EcuMap {
  id: string;
  name: string;
  address: number;
  data: number[][];
  dimensions: EcuMapDimensions;
  units?: string;
  scaling?: EcuScaling;
  xAxis?: number[];
  yAxis?: number[];
  values?: number[][];
}

export interface EcuTable {
  id: string;
  name: string;
  address: number;
  data: number[];
  length: number;
  units?: string;
  scaling?: EcuScaling;
}

export interface ParsedEcuData {
  maps: EcuMap[];
  tables: EcuTable[];
  metadata: {
    version: string;
    identifier: string;
    timestamp?: Date;
  };
}

export interface LoadedFirmwareData {
  raw: Uint8Array;
  size: number;
  checksum?: string;
  parsed?: ParsedEcuData;
}

export interface PersistedFirmwareSummary {
  fileName: string;
  size: number;
  checksum?: string;
  loadedAt: string;
}
