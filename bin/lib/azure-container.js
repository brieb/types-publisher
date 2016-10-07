"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const azure_storage_1 = require("azure-storage");
const fs = require("fs");
const https = require("https");
const common_1 = require("./common");
const secrets_1 = require("./secrets");
const util_1 = require("./util");
const name = common_1.settings.azureContainer;
class BlobWriter {
    constructor(service) {
        this.service = service;
    }
    static create() {
        return __awaiter(this, void 0, void 0, function* () {
            return new BlobWriter(azure_storage_1.createBlobService(common_1.settings.azureStorageAccount, yield secrets_1.getSecret(secrets_1.Secret.AZURE_STORAGE_ACCESS_KEY)));
        });
    }
    setCorsProperties() {
        const properties = {
            Cors: {
                CorsRule: [
                    {
                        AllowedOrigins: ["*"],
                        AllowedMethods: ["GET"],
                        AllowedHeaders: [],
                        ExposedHeaders: [],
                        MaxAgeInSeconds: 60 * 60 * 24 // 1 day
                    }
                ]
            }
        };
        return promisifyErrorOrResponse(cb => this.service.setServiceProperties(properties, cb));
    }
    ensureCreated(options) {
        return promisifyErrorOrResult(cb => this.service.createContainerIfNotExists(name, options, cb)).then(() => { });
    }
    createBlobFromFile(blobName, fileName) {
        return this.createBlobFromStream(blobName, fs.createReadStream(fileName));
    }
    createBlobFromText(blobName, text) {
        return this.createBlobFromStream(blobName, util_1.streamOfString(text));
    }
    listBlobs(prefix) {
        return __awaiter(this, void 0, void 0, function* () {
            const once = (token) => promisifyErrorOrResult(cb => this.service.listBlobsSegmentedWithPrefix(name, prefix, token, cb));
            const out = [];
            let token = undefined;
            do {
                const { entries, continuationToken } = yield once(token);
                out.push(...entries);
                token = continuationToken;
            } while (token);
            return out;
        });
    }
    deleteBlob(blobName) {
        return promisifyErrorOrResponse(cb => this.service.deleteBlob(name, blobName, cb));
    }
    createBlobFromStream(blobName, stream) {
        const options = {
            contentSettings: {
                contentEncoding: "GZIP",
                contentType: "application/json; charset=utf-8"
            }
        };
        return streamDone(util_1.gzip(stream).pipe(this.service.createWriteStreamToBlockBlob(name, blobName, options)));
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BlobWriter;
function streamDone(stream) {
    return new Promise((resolve, reject) => {
        stream.on("error", reject).on("finish", resolve);
    });
}
function readBlob(blobName) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const url = urlOfBlob(blobName);
            const req = https.get(url, res => {
                switch (res.statusCode) {
                    case 200:
                        if (res.headers["content-encoding"] !== "GZIP") {
                            reject(new Error(`${url} is not gzipped`));
                        }
                        else {
                            resolve(util_1.stringOfStream(util_1.unGzip(res)));
                        }
                        break;
                    default:
                        reject(new Error(`Can't get ${url}: ${res.statusCode} error`));
                }
            });
            req.on("error", reject);
        });
    });
}
exports.readBlob = readBlob;
function readJsonBlob(blobName) {
    return __awaiter(this, void 0, void 0, function* () {
        return util_1.parseJson(yield readBlob(blobName));
    });
}
exports.readJsonBlob = readJsonBlob;
function urlOfBlob(blobName) {
    return `https://${name}.blob.core.windows.net/${name}/${blobName}`;
}
exports.urlOfBlob = urlOfBlob;
function promisifyErrorOrResult(callsBack) {
    return new Promise((resolve, reject) => {
        callsBack((err, result) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(result);
            }
        });
    });
}
function promisifyErrorOrResponse(callsBack) {
    return new Promise((resolve, reject) => {
        callsBack(err => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
//# sourceMappingURL=azure-container.js.map