declare type ConfigType = {
    NODE_ENV: string;
    GCP_PROJECT: string;
    GCP_APPLICATION_CREDENTIALS: any;
    DRY_RUN: string;
    SKIP_ALLOCATED: string;
    SKIP_COUNT: number;
    SKIP_UNIQUE: string;
    SKIP_UNIQUE_COUNT: number;
};
declare const CONFIG: ConfigType;
export default CONFIG;
