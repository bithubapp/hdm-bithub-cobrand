var stealTools = require("steal-tools");

var buildPromise = stealTools.build({
    config: __dirname + "/package.json!npm"
}, {
    bundleSteal: true,
    bundleAssets: {
        infer: true
    }
});
