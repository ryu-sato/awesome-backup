import { readFileSync, createWriteStream } from 'fs';
import { basename } from 'path';
import {
  S3Client, S3ClientConfig,
  GetObjectCommand, GetObjectCommandInput,
  PutObjectCommand, PutObjectCommandInput,
  CopyObjectCommand, CopyObjectCommandInput,
  DeleteObjectCommand, DeleteObjectCommandInput,
  ListObjectsCommand, ListObjectsCommandInput,
} from '@aws-sdk/client-s3';
import * as internal from 'stream';
import {
  IStorageServiceClient,
  listS3FilesOptions,
  S3URI,
  S3StorageServiceClientConfig,
} from '../interfaces/storage-service-client';
import { configExistS3 } from './s3-config';

/**
 * Parse S3's URI(start with "s3:")
 * If it is not S3's URL, return null.
 */
function _parseFilePath(path: string): S3URI | null {
  /* S3 URI */
  if (path.startsWith('s3:')) {
    // https://regex101.com/r/vDGuGY/1
    const regexS3Uri = /^s3:\/\/([^/]+)\/?(.*)$/;
    try {
      const match = path.match(regexS3Uri);
      if (!match) return null;
      const [, bucket, key] = match;
      return { bucket, key };
    }
    catch (e: any) {
      return null;
    }
  }
  return null;
}

/**
 * Client to manipulate S3 buckets
 */
export class S3StorageServiceClient implements IStorageServiceClient {

  name: string;

  client: S3Client;

  constructor(config: S3StorageServiceClientConfig) {
    let s3ClientConfig: S3ClientConfig = {};
    if (!configExistS3()) {
      if (config.awsRegion == null || config.awsAccessKeyId == null || config.awsSecretAccessKey == null) {
        throw new Error('If the configuration file does not exist, '
                          + 'you will need to set "--aws-region", "--aws-access-key-id", and "--aws-secret-access-key".');
      }
      s3ClientConfig = {
        region: config.awsRegion,
        credentials: {
          accessKeyId: config.awsAccessKeyId,
          secretAccessKey: config.awsSecretAccessKey,
        },
      };
    }
    if (config.awsEndpointUrl != null) {
      s3ClientConfig.endpoint = config.awsEndpointUrl;
    }

    this.name = 'S3';
    this.client = new S3Client(s3ClientConfig);
  }

  exists(url: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.listFiles(url)
        .then((lists) => {
          resolve(lists.length > 0);
        })
        .catch((e) => {
          reject(e);
        });
    });
  }

  /**
   * List objects specified by S3's URI
   *
   * If the URI is not a folder, only objects with an exact match will be returned.
   * You can get an prefix matched object name by setting the "exactMatch" option to false.
   *
   * If the URI is a folder, it returns a list of objects under the folder. (URL must end with a slash)
   * You can remove a folder from the list by setting the "includeFolderInList" option to false.
   *
   * The returned list will be the absolute path from the bucket.
   * (If the url is "s3://bucket-name/directory", it will look like ["/directory/object-name1", "/directory/object-name2"])
   * You can get only object name by setting the "absolutePath" option to false.
   * (If the url is "s3://bucket-name/directory", it will look like ["object-name1", "object-name2"])
   */
  listFiles(url: string, optionsRequired?: listS3FilesOptions): Promise<string[]> {
    const parseResult = _parseFilePath(url);
    if (parseResult == null) return Promise.reject(new Error(`URI ${url} is not correct S3's`));

    const defaultOption: listS3FilesOptions = {
      includeFolderInList: false,
      absolutePath: true,
      exactMatch: true,
    };
    const options = optionsRequired ? { ...defaultOption, ...optionsRequired } : defaultOption;
    const s3Uri = parseResult as S3URI;
    const params: ListObjectsCommandInput = {
      Bucket: s3Uri.bucket,
      Prefix: s3Uri.key,
    };
    const command = new ListObjectsCommand(params);
    return new Promise((resolve, reject) => {
      this.client.send(command)
        .then((response) => {
          if (response == null) return reject(new Error('ListObjectsCommand return null or Contents is null'));

          let files = response.Contents?.map((content: any) => content.Key) || [];
          if (url.endsWith('/') && !options.includeFolderInList) {
            const excludeFolderFilter = (filePath: string) => filePath !== s3Uri.key;
            files = files.filter(excludeFolderFilter);
          }
          if (!url.endsWith('/') && options.exactMatch) {
            const exactMatchFilter = (filePath: string) => filePath === s3Uri.key;
            files = files.filter(exactMatchFilter);
          }
          if (!options.absolutePath) {
            const relativePathChanger = (filePath: string) => basename(filePath);
            files = files.map(relativePathChanger);
          }
          resolve(files);
        })
        .catch((e: any) => {
          reject(e);
        });
    });
  }

  /**
   * Delete an object specified by S3's URI
   *
   * The function will not fail even if the object to be deleted does not exist.
   * Also, when removing a directory, the URL must end with a slash. (ex. 's3://bucket-name/directory/')
   */
  deleteFile(url: string): Promise<void> {
    const parseResult = _parseFilePath(url);
    if (parseResult == null) return Promise.reject(new Error(`URI ${url} is not correct S3's`));

    const s3Uri = parseResult as S3URI;
    const params: DeleteObjectCommandInput = {
      Bucket: s3Uri.bucket,
      Key: s3Uri.key,
    };
    const command = new DeleteObjectCommand(params);
    return new Promise((resolve, reject) => {
      this.client.send(command)
        .then(() => {
          resolve();
        })
        .catch((e: any) => {
          reject(e);
        });
    });
  }

  /**
   * Copy a single file
   *
   * The file to be copied can also seamlessly handle objects on S3.
   * If the copy source is a local file and the copy destination is the URI of S3, the file is uploaded to S3.
   * If the source and destination are S3 URIs, the S3 object will be copied directly.
   */
  copyFile(copySource: string, copyDestination: string): Promise<void> {
    const parseSourceResult = _parseFilePath(copySource);
    const parseDestinationResult = _parseFilePath(copyDestination);

    /* Upload local file to S3 */
    if (parseSourceResult == null && parseDestinationResult != null) {
      const destinationS3Uri = parseDestinationResult as S3URI;
      return this.uploadFile(copySource, destinationS3Uri);
    }
    /* Download S3 object and save as local file */
    if (parseSourceResult != null && parseDestinationResult == null) {
      const sourceS3Uri = parseSourceResult as S3URI;
      return this.downloadFile(sourceS3Uri, copyDestination);
    }
    /* Copy S3 object and save as another S3 object */
    if (parseSourceResult != null && parseDestinationResult != null) {
      const sourceS3Uri = parseSourceResult as S3URI;
      const destinationS3Uri = parseDestinationResult as S3URI;
      return this.copyFileOnRemote(sourceS3Uri, destinationS3Uri);
    }

    return Promise.reject(new Error('At least the copy source or destination must be an S3 endpoint.'));
  }

  uploadFile(sourceFilePath: string, destinationS3Uri: S3URI): Promise<void> {
    const params: PutObjectCommandInput = {
      Bucket: destinationS3Uri.bucket,
      Key: (destinationS3Uri.key === '' || destinationS3Uri.key.endsWith('/'))
        ? (destinationS3Uri.key + basename(sourceFilePath))
        : destinationS3Uri.key,
      Body: readFileSync(sourceFilePath),
    };
    const command = new PutObjectCommand(params);
    return new Promise((resolve, reject) => {
      this.client.send(command)
        .then((response) => {
          resolve();
        })
        .catch((e: any) => {
          reject(e);
        });
    });
  }

  downloadFile(sourceS3Uri: S3URI, destinationFilePath: string): Promise<void> {
    const params: GetObjectCommandInput = {
      Bucket: sourceS3Uri.bucket,
      Key: sourceS3Uri.key,
    };
    const command = new GetObjectCommand(params);
    return new Promise((resolve, reject) => {
      this.client.send(command)
        .then((response) => {
          if (response == null) return reject(new Error('GetObjectCommand return null'));

          internal.promises.pipeline(response.Body as internal.Readable, createWriteStream(destinationFilePath))
            .then(() => {
              resolve();
            })
            .catch((e: any) => {
              reject(e);
            });
        })
        .catch((e: any) => {
          reject(e);
        });
    });
  }

  copyFileOnRemote(sourceS3Uri: S3URI, destinationS3Uri: S3URI): Promise<void> {
    const params: CopyObjectCommandInput = {
      CopySource: [sourceS3Uri.bucket, sourceS3Uri.key].join('/'),
      Bucket: destinationS3Uri.bucket,
      Key: destinationS3Uri.key,
    };
    const command = new CopyObjectCommand(params);
    return new Promise((resolve, reject) => {
      this.client.send(command)
        .then(() => {
          resolve();
        })
        .catch((e: any) => {
          reject(e);
        });
    });
  }

}

export default S3StorageServiceClient;
