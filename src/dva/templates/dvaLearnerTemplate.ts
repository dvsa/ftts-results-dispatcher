// Column start positions are off by one compared to the DVA spec, as fixed-width-parser uses a 0-indexed setup
import { ParseConfigInput } from 'fixed-width-parser';

export const dvaLearnerHeaderTemplate: ParseConfigInput[] = [
  {
    type: 'string',
    name: 'constant',
    start: 0,
    width: 9,
    padPosition: 'end',
  },
  {
    type: 'int',
    name: 'fileSequence',
    start: 9,
    width: 6,
    padPosition: 'start',
  },
  {
    type: 'int',
    name: 'numberOfRecords',
    start: 15,
    width: 6,
    padPosition: 'start',
  },
];

export const dvaLearnerRecordTemplate: ParseConfigInput[] = [
  {
    type: 'string',
    name: 'startChar',
    start: 0,
    width: 1,
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
    name: 'firstInitial',
    start: 17,
    width: 1,
  },
  {
    type: 'string',
    name: 'title',
    start: 18,
    width: 12,
    padPosition: 'end',
  },
  {
    type: 'string',
    name: 'surname',
    start: 30,
    width: 43,
    padPosition: 'end',
  },
  {
    type: 'string',
    name: 'testCode',
    start: 73,
    width: 2,
    padPosition: 'end',
  },
  {
    type: 'string',
    name: 'testDate',
    start: 75,
    width: 8,
    padPosition: 'end',
  },
  {
    type: 'string',
    name: 'certificateNumber',
    start: 83,
    width: 9,
    padPosition: 'start',
  },
  {
    type: 'string',
    name: 'testResult',
    start: 92,
    width: 1,
  },
];
