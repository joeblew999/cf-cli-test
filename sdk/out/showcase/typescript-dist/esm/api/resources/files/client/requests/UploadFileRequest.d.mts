import type * as core from "../../../../../core/index.mjs";
/**
 * @example
 *     {
 *         file: fs.createReadStream("/path/to/your/file")
 *     }
 */
export interface UploadFileRequest {
    file: core.file.Uploadable;
    note?: string;
}
