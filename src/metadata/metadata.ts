export interface BasicTarsMetadata {
  sequenceNumber: number;
  dailySequenceNumber: string;
  created: Date;
}

export interface TarsMetadata extends BasicTarsMetadata {
  fileName: string;
  checksum: string;
  numberOfRows: number;
}

export interface DvaMetadata {
  sequenceNumber: number;
}
