import * as migration_20260624_180706 from './20260624_180706';

export const migrations = [
  {
    up: migration_20260624_180706.up,
    down: migration_20260624_180706.down,
    name: '20260624_180706'
  },
];
