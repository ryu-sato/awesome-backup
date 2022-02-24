#!/usr/bin/env node
/**
 * An executable file that prune backuped files in a storage service.
 * Execute with --help to see usage instructions.
 */
import { PruneCommand } from '@awesome-backup/core';
import { PACKAGE_VERSION } from '@/postgresql/config/version';

const pruneCommand = new PruneCommand();

pruneCommand
  .version(PACKAGE_VERSION)
  .setPruneArgument()
  .addPruneOptions()
  .setPruneAction();

pruneCommand.parse(process.argv); // execute prune command
