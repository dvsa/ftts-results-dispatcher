export interface BasicMetadata {
  sequenceNumber: number;
  dailySequenceNumber: string;
  created: Date;
}

export interface Metadata extends BasicMetadata {
  fileName: string;
  checksum: string;
  numberOfRows: number;
}
