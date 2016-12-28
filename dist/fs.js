/*[global-shim-start]*/
(function(exports, global, doEval){ // jshint ignore:line
	var origDefine = global.define;

	var get = function(name){
		var parts = name.split("."),
			cur = global,
			i;
		for(i = 0 ; i < parts.length; i++){
			if(!cur) {
				break;
			}
			cur = cur[parts[i]];
		}
		return cur;
	};
	var set = function(name, val){
		var parts = name.split("."),
			cur = global,
			i, part, next;
		for(i = 0; i < parts.length - 1; i++) {
			part = parts[i];
			next = cur[part];
			if(!next) {
				next = cur[part] = {};
			}
			cur = next;
		}
		part = parts[parts.length - 1];
		cur[part] = val;
	};
	var useDefault = function(mod){
		if(!mod || !mod.__esModule) return false;
		var esProps = { __esModule: true, "default": true };
		for(var p in mod) {
			if(!esProps[p]) return false;
		}
		return true;
	};
	var modules = (global.define && global.define.modules) ||
		(global._define && global._define.modules) || {};
	var ourDefine = global.define = function(moduleName, deps, callback){
		var module;
		if(typeof deps === "function") {
			callback = deps;
			deps = [];
		}
		var args = [],
			i;
		for(i =0; i < deps.length; i++) {
			args.push( exports[deps[i]] ? get(exports[deps[i]]) : ( modules[deps[i]] || get(deps[i]) )  );
		}
		// CJS has no dependencies but 3 callback arguments
		if(!deps.length && callback.length) {
			module = { exports: {} };
			var require = function(name) {
				return exports[name] ? get(exports[name]) : modules[name];
			};
			args.push(require, module.exports, module);
		}
		// Babel uses the exports and module object.
		else if(!args[0] && deps[0] === "exports") {
			module = { exports: {} };
			args[0] = module.exports;
			if(deps[1] === "module") {
				args[1] = module;
			}
		} else if(!args[0] && deps[0] === "module") {
			args[0] = { id: moduleName };
		}

		global.define = origDefine;
		var result = callback ? callback.apply(null, args) : undefined;
		global.define = ourDefine;

		// Favor CJS module.exports over the return value
		result = module && module.exports ? module.exports : result;
		modules[moduleName] = result;

		// Set global exports
		var globalExport = exports[moduleName];
		if(globalExport && !get(globalExport)) {
			if(useDefault(result)) {
				result = result["default"];
			}
			set(globalExport, result);
		}
	};
	global.define.orig = origDefine;
	global.define.modules = modules;
	global.define.amd = true;
	ourDefine("@loader", [], function(){
		// shim for @@global-helpers
		var noop = function(){};
		return {
			get: function(){
				return { prepareGlobal: noop, retrieveGlobal: noop };
			},
			global: global,
			__exec: function(__load){
				doEval(__load.source, global);
			}
		};
	});
}
)({},window,function(__$source__, __$global__) { // jshint ignore:line
	eval("(function() { " + __$source__ + " \n }).call(__$global__);");
}
)
/*path@1.0.0#index*/
define('path/index', function (require, exports, module) {
    exports.basename = function (path) {
        return path.split('/').pop();
    };
    exports.dirname = function (path) {
        return path.split('/').slice(0, -1).join('/') || '.';
    };
    exports.extname = function (path) {
        var base = exports.basename(path);
        if (!~base.indexOf('.'))
            return '';
        var ext = base.split('.').pop();
        return '.' + ext;
    };
});
/*fs-web@1.0.1#directory_entry*/
define('fs-web/directory_entry', [
    'exports',
    'path/index'
], function (exports, _path) {
    'use strict';
    Object.defineProperty(exports, '__esModule', { value: true });
    exports.default = undefined;
    var _path2 = _interopRequireDefault(_path);
    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
    }
    function DirectoryEntry(fullPath, type) {
        this.path = fullPath;
        this.name = _path2.default.basename(fullPath);
        this.dir = _path2.default.dirname(fullPath);
        this.type = type;
    }
    exports.default = DirectoryEntry;
});
/*fs-web@1.0.1#core*/
define('fs-web/core', [
    'exports',
    'path/index',
    'fs-web/directory_entry'
], function (exports, _path, _directory_entry) {
    'use strict';
    Object.defineProperty(exports, '__esModule', { value: true });
    exports.readFile = readFile;
    exports.readString = readString;
    exports.writeFile = writeFile;
    exports.removeFile = removeFile;
    exports.readdir = readdir;
    exports.mkdir = mkdir;
    exports.rmdir = rmdir;
    var _path2 = _interopRequireDefault(_path);
    var _directory_entry2 = _interopRequireDefault(_directory_entry);
    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
    }
    function ab2str(buf) {
        return String.fromCharCode.apply(null, new Uint16Array(buf));
    }
    function str2ab(str) {
        var buf = new ArrayBuffer(str.length * 2);
        var bufView = new Uint16Array(buf);
        for (var i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;
    }
    var DB_NAME = window.location.host + '_filesystem', OS_NAME = 'files', DIR_IDX = 'dir';
    function init(callback) {
        var req = window.indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = function (e) {
            var db = e.target.result;
            var objectStore = db.createObjectStore(OS_NAME, { keyPath: 'path' });
            objectStore.createIndex(DIR_IDX, 'dir', { unique: false });
        };
        req.onsuccess = function (e) {
            callback(e.target.result);
        };
    }
    function initOS(type, callback) {
        init(function (db) {
            var trans = db.transaction([OS_NAME], type), os = trans.objectStore(OS_NAME);
            callback(os);
        });
    }
    var readFrom = function readFrom(fileName) {
        return new Promise(function (resolve, reject) {
            initOS('readonly', function (os) {
                var req = os.get(fileName);
                req.onerror = reject;
                req.onsuccess = function (e) {
                    var res = e.target.result;
                    if (res && res.data) {
                        resolve(res.data);
                    } else {
                        reject('File not found');
                    }
                };
            });
        });
    };
    function readFile(fileName) {
        return readFrom(fileName).then(function (data) {
            if (!(data instanceof ArrayBuffer)) {
                data = str2ab(data.toString());
            }
            return data;
        });
    }
    function readString(fileName) {
        return readFrom(fileName).then(function (data) {
            if (data instanceof ArrayBuffer) {
                data = ab2str(data);
            }
            return data;
        });
    }
    ;
    function writeFile(fileName, data) {
        return new Promise(function (resolve, reject) {
            initOS('readwrite', function (os) {
                var req = os.put({
                    'path': fileName,
                    'dir': _path2.default.dirname(fileName),
                    'type': 'file',
                    'data': data
                });
                req.onerror = reject;
                req.onsuccess = function (e) {
                    resolve();
                };
            });
        });
    }
    ;
    function removeFile(fileName) {
        return new Promise(function (resolve) {
            initOS('readwrite', function (os) {
                var req = os.delete(fileName);
                req.onerror = req.onsuccess = function (e) {
                    resolve();
                };
            });
        });
    }
    ;
    function withTrailingSlash(path) {
        var directoryWithTrailingSlash = path[path.length - 1] === '/' ? path : path + '/';
        return directoryWithTrailingSlash;
    }
    function readdir(directoryName) {
        return new Promise(function (resolve, reject) {
            initOS('readonly', function (os) {
                var dir = _path2.default.dirname(withTrailingSlash(directoryName));
                var idx = os.index(DIR_IDX);
                var range = IDBKeyRange.only(dir);
                var req = idx.openCursor(range);
                req.onerror = function (e) {
                    reject(e);
                };
                var results = [];
                req.onsuccess = function (e) {
                    var cursor = e.target.result;
                    if (cursor) {
                        var value = cursor.value;
                        var entry = new _directory_entry2.default(value.path, value.type);
                        results.push(entry);
                        cursor.continue();
                    } else {
                        resolve(results);
                    }
                };
            });
        });
    }
    ;
    function mkdir(fullPath) {
        return new Promise(function (resolve, reject) {
            initOS('readwrite', function (os) {
                var dir = withTrailingSlash(_path2.default);
                var req = os.put({
                    'path': fullPath,
                    'dir': _path2.default.dirname(dir),
                    'type': 'directory'
                });
                req.onerror = reject;
                req.onsuccess = function (e) {
                    resolve();
                };
            });
        });
    }
    ;
    function rmdir(fullPath) {
        return readdir(fullPath).then(function removeFiles(files) {
            if (!files || !files.length) {
                return removeFile(fullPath);
            }
            var file = files.shift(), func = file.type === 'directory' ? rmdir : removeFile;
            return func(file.name).then(function () {
                return removeFiles(files);
            });
        });
    }
    ;
});
/*fs-web@1.0.1#fs*/
define('fs-web/fs', [
    'exports',
    'fs-web/core',
    'fs-web/directory_entry'
], function (exports, _core, _directory_entry) {
    'use strict';
    Object.defineProperty(exports, '__esModule', { value: true });
    exports.DirectoryEntry = undefined;
    Object.keys(_core).forEach(function (key) {
        if (key === 'default' || key === '__esModule')
            return;
        Object.defineProperty(exports, key, {
            enumerable: true,
            get: function () {
                return _core[key];
            }
        });
    });
    var _directory_entry2 = _interopRequireDefault(_directory_entry);
    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
    }
    _directory_entry2.default.prototype.readFile = function (callback) {
        if (this.type !== 'file') {
            throw new TypeError('Not a file.');
        }
        return (0, _core.readFile)(this.path, callback);
    };
    exports.DirectoryEntry = _directory_entry2.default;
});
/*fs-web@1.0.1#global*/
define('fs-web/global', ['fs-web/fs'], function (_fsWeb) {
    'use strict';
    var fs = _interopRequireWildcard(_fsWeb);
    function _interopRequireWildcard(obj) {
        if (obj && obj.__esModule) {
            return obj;
        } else {
            var newObj = {};
            if (obj != null) {
                for (var key in obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, key))
                        newObj[key] = obj[key];
                }
            }
            newObj.default = obj;
            return newObj;
        }
    }
    window.fsWeb = fs;
});
/*[global-shim-end]*/
(function(){ // jshint ignore:line
	window._define = window.define;
	window.define = window.define.orig;
}
)();