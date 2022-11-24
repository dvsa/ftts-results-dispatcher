// Column start positions are off by one compared to the DVA spec, as fixed-width-parser uses a 0-indexed setup
import { ParseConfigInput } from 'fixed-width-parser';

export const dvaInstructorHeaderTemplate: ParseConfigInput[] = [
  {
    type: 'string',
    name: 'constant',
    start: 0,
    width: 10,
    padPosition: 'end',
  },
  {
    type: 'int',
    name: 'fileSequence',
    start: 10,
    width: 6,
    padPosition: 'start',
  },
  {
    type: 'string',
    name: 'fileDate',
    start: 16,
    width: 8,
    padPosition: 'start',
  },
  {
    type: 'string',
    name: 'numberOfRecords',
    start: 22,
    width: 6,
    padPosition: 'start',
  },
];

export const dvaInstructorRecordTemplate: ParseConfigInput[] = [
  {
    type: 'string',
    name: 'startChar',
    start: 0,
    width: 1,
    padPosition: 'end',
  },
  {
    type: 'string',
    name: 'driverNumber',
    start: 1,
    width: 16,
    padPosition: 'end',
  },
  {
    type: 'string',
    name: 'paymentReceiptNumber',
    start: 17,
    width: 16,
    padPosition: 'start',
  },
  {
    type: 'string',
    name: 'surname',
    start: 33,
    width: 43,
    padPosition: 'end',
  },
  {
    type: 'string',
    name: 'addressLine1',
    start: 76,
    width: 30,
    padPosition: 'end',
  },
  {
    type: 'string',
    name: 'addressLine2',
    start: 106,
    width: 30,
    padPosition: 'end',
  },
  {
    type: 'string',
    name: 'addressLine3',
    start: 136,
    width: 30,
    padPosition: 'end',
  },
  {
    type: 'string',
    name: 'addressLine4',
    start: 166,
    width: 30,
    padPosition: 'end',
  },
  {
    type: 'string',
    name: 'addressLine5',
    start: 196,
    width: 30,
    padPosition: 'end',
  },
  {
    type: 'string',
    name: 'postCode',
    start: 226,
    width: 10,
    padPosition: 'end',
  },
  {
    type: 'string',
    name: 'testDate',
    start: 236,
    width: 8,
    padPosition: 'start',
  },
  {
    type: 'string',
    name: 'testResult',
    start: 244,
    width: 1,
    padPosition: 'end',
  },
  {
    type: 'string',
    name: 'bandScore1',
    start: 245,
    width: 3,
    padPosition: 'start',
  },
  {
    type: 'string',
    name: 'bandScore2',
    start: 248,
    width: 3,
    padPosition: 'start',
  },
  {
    type: 'string',
    name: 'bandScore3',
    start: 251,
    width: 3,
    padPosition: 'start',
  },
  {
    type: 'string',
    name: 'bandScore4',
    start: 254,
    width: 3,
    padPosition: 'start',
  },
  {
    type: 'string',
    name: 'overallScore',
    start: 257,
    width: 3,
    padPosition: 'start',
  },
  {
    type: 'string',
    name: 'hptScore',
    start: 260,
    width: 3,
    padPosition: 'start',
  },
];
