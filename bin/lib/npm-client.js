"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const assert = require("assert");
const fstream_1 = require("fstream");
const RegClient = require("npm-registry-client");
const path = require("path");
const tar_1 = require("tar");
const url = require("url");
const common_1 = require("./common");
const secrets_1 = require("./secrets");
const util_1 = require("./util");
const registry = common_1.settings.npmRegistry;
assert(registry.endsWith("/"));
function packageUrl(packageName) {
    return url.resolve(registry, packageName);
}
class NpmClient {
    constructor(client, auth) {
        this.client = client;
        this.auth = auth;
    }
    static create() {
        return __awaiter(this, void 0, void 0, function* () {
            const token = yield secrets_1.getSecret(secrets_1.Secret.NPM_TOKEN);
            return new this(new RegClient({}), { token });
        });
    }
    publish(publishedDirectory, packageJson, dry) {
        return __awaiter(this, void 0, void 0, function* () {
            const readme = yield util_1.readFile(path.join(publishedDirectory, "README.md"));
            return new Promise((resolve, reject) => {
                const body = createTgz(publishedDirectory, reject);
                const metadata = Object.assign({ readme }, packageJson);
                const params = {
                    access: "public",
                    auth: this.auth,
                    metadata,
                    body
                };
                if (dry) {
                    resolve();
                }
                else {
                    this.client.publish(registry, params, err => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve();
                        }
                    });
                }
            });
        });
    }
    tag(packageName, version, tag) {
        const params = {
            version,
            tag,
            auth: this.auth
        };
        return promisifyVoid(cb => this.client.tag(packageUrl(packageName), params, cb));
    }
    deprecate(packageName, version, message) {
        const params = {
            message,
            version,
            auth: this.auth,
        };
        return promisifyVoid(cb => this.client.deprecate(packageUrl(packageName), params, cb));
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NpmClient;
// To output this for testing: Export it and:
// `require("./bin/lib/npm-client").createTgz("./output/foo", err => { throw err }).pipe(fs.createWriteStream("foo.tgz"))`
function createTgz(dir, onError) {
    return util_1.gzip(createTar(dir, onError));
}
function createTar(dir, onError) {
    const packer = tar_1.Pack({ noProprietary: true })
        .on("error", onError);
    return fstream_1.Reader({ path: dir, type: "Directory" })
        .on("error", onError)
        .pipe(packer);
}
function promisifyVoid(callsBack) {
    return new Promise((resolve, reject) => {
        callsBack(error => {
            if (error) {
                reject(error);
            }
            else {
                resolve();
            }
        });
    });
}
//# sourceMappingURL=npm-client.js.map