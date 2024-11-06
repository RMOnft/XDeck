// This script generates Firefox version of the extension and packs Chrome and Firefox versions to zip files.

const fsp = require('fs').promises;
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

async function copyDir(src, dest) {
    const entries = await fsp.readdir(src, { withFileTypes: true });
    await fsp.mkdir(dest);
    for (let entry of entries) {
        if(entry.name === '.git' || entry.name === '.github' || entry.name === '_metadata' || entry.name === 'node_modules') continue;
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
        } else {
            await fsp.copyFile(srcPath, destPath);
        }
    }
}

if(fs.existsSync('../XDeckTempChrome')) {
    fs.rmSync('../XDeckTempChrome', { recursive: true });
}
if(fs.existsSync('../XDeckFirefox')) {
    fs.rmSync('../XDeckFirefox', { recursive: true });
}

console.log("Copying...");
copyDir('./', '../XDeckFirefox').then(async () => {
    await copyDir('./', '../XDeckTempChrome');
    console.log("Copied!");
    console.log("Patching...");

    let manifest = JSON.parse(await fsp.readFile('../XDeckTempChrome/manifest.json', 'utf8'));
    manifest.browser_specific_settings = {
        gecko: {
            id: "xdeck@dimden.dev",
            strict_min_version: "90.0"
        }
    };
    manifest.manifest_version = 2;
    manifest.host_permissions.push("https://tweetdeck.dimden.dev/*", "https://raw.githubusercontent.com/*");
    delete manifest.declarative_net_request;
    manifest.permissions.push("webRequest", "webRequestBlocking", ...manifest.host_permissions);
    delete manifest.host_permissions;
    for(let content_script of manifest.content_scripts) {
        if(content_script.world === "MAIN") {
            delete content_script.world;
        }
        content_script.js = content_script.js.filter(js => js !== "src/destroyer.js");
    }
    manifest.background = {
        scripts: ["src/background.js"],
    }
    manifest.web_accessible_resources = manifest.web_accessible_resources[0].resources;

    fs.unlinkSync('../XDeckFirefox/pack.js');
    fs.unlinkSync('../XDeckTempChrome/pack.js');
    fs.unlinkSync('../XDeckFirefox/README.md');
    fs.unlinkSync('../XDeckTempChrome/README.md');
    fs.unlinkSync('../XDeckFirefox/package.json');
    fs.unlinkSync('../XDeckTempChrome/package.json');
    fs.unlinkSync('../XDeckFirefox/package-lock.json');
    fs.unlinkSync('../XDeckTempChrome/package-lock.json');
    fs.unlinkSync('../XDeckFirefox/.gitignore');
    fs.unlinkSync('../XDeckTempChrome/.gitignore');
    fs.writeFileSync('../XDeckFirefox/manifest.json', JSON.stringify(manifest, null, 2));

    console.log("Patched!");

    console.log("Zipping Firefox version...");
    try {
        const zip = new AdmZip();
        const outputDir = "../XDeckFirefox.zip";
        zip.addLocalFolder("../XDeckFirefox");
        zip.writeZip(outputDir);
    } catch (e) {
        console.log(`Something went wrong ${e}`);
    }
    console.log("Zipping Chrome version...");
    try {
        const zip = new AdmZip();
        const outputDir = "../XDeckChrome.zip";
        zip.addLocalFolder("../XDeckTempChrome");
        zip.writeZip(outputDir);
    } catch (e) {
        console.log(`Something went wrong ${e}`);
    }
    console.log("Zipped!");
    console.log("Deleting temporary folders...");
    fs.rmSync('../XDeckTempChrome', { recursive: true });
    fs.rmSync('../XDeckFirefox', { recursive: true });
    console.log("Deleted!");
});