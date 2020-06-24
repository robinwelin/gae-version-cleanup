import { appengine_v1 } from 'googleapis';
declare type VersionType = {
    serviceID: string;
    versionID: string;
    date: string;
};
export declare const loggerInfo: (value: string) => void;
export declare const asyncForEach: (array: any, callback: any) => Promise<void>;
export declare const getAppEngine: () => Promise<appengine_v1.Appengine>;
export declare const getServices: (appEngine: appengine_v1.Appengine) => Promise<string[]>;
export declare const getVersions: (appEngine: appengine_v1.Appengine, serviceID: string) => Promise<VersionType[]>;
export declare const skipAllocated: (appEngine: appengine_v1.Appengine, versions: VersionType[], serviceID: string) => Promise<VersionType[]>;
export declare const skipVersions: (versions: VersionType[], serviceID: string) => VersionType[];
export declare const skipUnique: (versions: VersionType[], serviceID: string) => VersionType[];
declare const run: () => void;
export default run;
