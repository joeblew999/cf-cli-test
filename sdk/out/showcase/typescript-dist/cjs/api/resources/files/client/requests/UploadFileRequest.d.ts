import type * as core from "../../../../../core/index.js";
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
