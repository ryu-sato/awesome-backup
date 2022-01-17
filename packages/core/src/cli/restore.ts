import { format } from 'date-fns';
import { basename, join } from 'path';
import { expand } from '../utils/tar';
import { IProvider } from '../interfaces/provider';

const tmp = require('tmp');

/* Restore command option types */
export declare interface IRestoreCLIOption {
  awsRegion: string
  awsAccessKeyId: string,
  awsSecretAccessKey: string,
  gcpProjectId: string,
  gcpClientEmail: string,
  gcpPrivateKey: string,
  gcpServiceAccountKeyJsonPath: string,
}

export class AbstractRestoreCLI {

  provider: IProvider;

  constructor(provider: IProvider) {
    this.provider = provider;
  }

  convertOption(option: IRestoreCLIOption): Record<string, string|number|boolean|string[]|number[]> {
    throw new Error('Method not implemented.');
  }

  async restore(sourcePath: string, pgrestoreRequiredOptions?: Record<string, string|number|boolean|string[]|number[]>): Promise<string[]> {
    throw new Error('Method not implemented.');
  }

  async main(targetBucketUrl: URL, options: IRestoreCLIOption): Promise<void> {
    tmp.setGracefulCleanup();
    const tmpdir = tmp.dirSync({ unsafeCleanup: true });

    console.log(`=== ${basename(__filename)} started at ${format(Date.now(), 'yyyy/MM/dd HH:mm:ss')} ===`);
    const target = join(tmpdir.name, basename(targetBucketUrl.pathname));

    await this.provider.copyFile(targetBucketUrl.toString(), target);
    console.log(`expands ${target}...`);
    const { expandedPath } = await expand(target);
    const toolOption = this.convertOption(options);
    const [stdout, stderr] = await this.restore(expandedPath, toolOption);
    if (stdout) {
      console.log(stdout);
    }
    if (stderr) {
      console.warn(stderr);
    }
  }

}
