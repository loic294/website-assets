var DEV_SCRIPT_ID = "dev-script";
var DEV_MODE_ENABLED = "IS_DEV";

var isDevMode = localStorage.getItem(DEV_MODE_ENABLED) === "true";

var contentUrl = isDevMode ? "http://localhost:3000" : "https://assets.loicbellemarealford.ca";

if (isDevMode && !document.getElementById(DEV_SCRIPT_ID)) {
	console.log("DEV MODE IS ENABLE");
	console.log("Loading dev script");
	const devScript = document.createElement("script");
	devScript.id = DEV_SCRIPT_ID;
	devScript.src = "http://localhost:3000/script.js";
	devScript.defer = "defer";
	document.body.appendChild(devScript);
}

if (!window.enableDevMode) {
	window.enableDevMode = function () {
		localStorage.setItem(DEV_MODE_ENABLED, true);
		window.location.reload();
	};
}

if (!window.disableDevMode) {
	window.disableDevMode = function () {
		localStorage.setItem(DEV_MODE_ENABLED, false);
		window.location.reload();
	};
}

async function loadScripts() {
	await import(contentUrl + "/scripts/newsletter.js");
	
	if (window.location.pathname.includes('/my-gear')) {
		await import(contentUrl + "/scripts/my-gear.js");
	}

	await import(contentUrl + "/scripts/exif-info.js");
}

loadScripts();
