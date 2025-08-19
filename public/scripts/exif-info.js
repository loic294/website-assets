function getBase64Image(img) {
	var canvas = document.createElement("canvas");
	canvas.width = img.width;
	canvas.height = img.height;
	var ctx = canvas.getContext("2d");
	ctx.drawImage(img, 0, 0);
	var dataURL = canvas.toDataURL("image/jpeg", 0.9);
	return dataURL.replace(/^data:image\/?[A-z]*;base64,/);
}

const imageUrlToBase64 = async (url) => {
	try {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Accept': 'image/jpeg,image/jpg,image/*,*/*'
			},
			mode: 'cors'
		});
		
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		
		const arrayBuffer = await response.arrayBuffer();
		console.log('ArrayBuffer length:', arrayBuffer.byteLength);
		
		// Create blob and object URL for verification
		const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
		const objectUrl = URL.createObjectURL(blob);
		console.log('Object URL for verification:', objectUrl);
		
		// Convert ArrayBuffer to base64 using a more reliable method
		const uint8Array = new Uint8Array(arrayBuffer);
		let binaryString = '';
		for (let i = 0; i < uint8Array.length; i++) {
			binaryString += String.fromCharCode(uint8Array[i]);
		}
		const base64 = btoa(binaryString);
		
		console.log('Base64 length:', base64.length);
		console.log('First 20 chars of base64:', base64.substring(0, 20));
		
		// Verify it's a valid JPEG by checking the header
		const jpegHeader = base64.substring(0, 8);
		console.log('JPEG header (should start with /9j/):', jpegHeader);
		
		// Also create a data URL for comparison
		const dataUrl = `data:image/jpeg;base64,${base64}`;
		console.log('Data URL for verification:', dataUrl.substring(0, 100) + '...');
		
		return base64;
	} catch (error) {
		console.log('Fetch failed:', error);
		throw error;
	}
};

function debugExif(exif) {
	let exifData = {};
	for (const ifd in exif) {
		if (ifd == "thumbnail") {
			const thumbnailData = exif[ifd] === null ? "null" : exif[ifd];
		} else {
			for (const tag in exif[ifd]) {
				exifData[piexif.TAGS[ifd][tag]["name"]] = exif[ifd][tag];
			}
		}
	}

	return exifData;
}

function renderValue(key, value, prefix, suffix) {
	return value
		? `<div class="exif-info">
    <div class="exif-info-key">${key}</div>
    <div class="exif-info-value">${prefix || ""}${value}${suffix || ""}</div>
  </div>`
		: "";
}

function renderRational(value) {
	if (!value) return null;

	const fraction = value[0] / value[1];

	if (fraction < 1) {
		return `${value[0]}/${value[1]}`;
	}

	return Math.round((value[0] / value[1]) * 100) / 100;
}

const cache = new Set();

async function addExifInfo() {
	const galleryImagesWrapper = document.querySelectorAll(".gallery-lightbox-item-img > img, .sqs-lightbox-slideshow .thumb-image");

	if (galleryImagesWrapper?.length > 0) {
		await import("./lib/piexifjs.js");

		console.log("FOUND GALLERY ON PAGE. Extracting photos exif data.");

		for (const galleryImage of galleryImagesWrapper) {
			if (cache.has(galleryImage)) {
				continue;
			}

			try {
				const imageName = galleryImage.attributes["alt"].value;
				const id = imageName.replace(/\./g, "-");

				// Try original image first (more likely to have EXIF)
				const originalUrl = galleryImage.attributes["data-src"].value;
				console.log('Trying original URL:', originalUrl);
				
				let base64Img, exif;
				try {
					base64Img = await imageUrlToBase64(originalUrl);
					console.log('Original base64 prefix:', base64Img.substring(0, 50));
					exif = debugExif(piexif.load(base64Img));
				} catch (error) {
					console.log('Original failed, trying formatted version:', error);
					const formattedUrl = originalUrl + "?format=300w";
					console.log('Trying formatted URL:', formattedUrl);
					base64Img = await imageUrlToBase64(formattedUrl);
					console.log('Formatted base64 prefix:', base64Img.substring(0, 50));
					exif = debugExif(piexif.load(base64Img));
				}

				const make = exif.Make;
				const model = exif.Model;
				const lens = exif.LensModel;
				const aperture = renderRational(exif.FNumber);
				const shutterspeed = renderRational(exif.ExposureTime);
				const focallength = exif.FocalLengthIn35mmFilm || renderRational(exif.FocalLength);
				const iso = exif.ISOSpeedRatings;

				console.log("Image", imageName, imageUrl, exif, make, model, lens, aperture, shutterspeed, focallength, iso);

				if (make || model) {
					const newDiv = document.createElement("div");
					newDiv.className = "exif-wrapper";
					newDiv.innerHTML = `
					<div class="exif-data">
						<span class="exif-camera"><img src="${contentUrl}/icons/info.svg" /> ${make || ""} ${model?.replace("Canon ", "") || ""}</span>
					</div>
					<div class="exif-details-wrapper">
						<div class="exif-details">
							${renderValue("Lens", lens)}
							${renderValue("Focal Length", focallength, "", " mm")}
							${renderValue("Aperture", aperture, "f/ ")}
							${renderValue("Shutter Speed", shutterspeed, "", " s")}
							${renderValue("ISO", iso)}
						</div>
					<div>
				`;

					galleryImage.parentElement.appendChild(newDiv);
					cache.set(galleryImage);
				}
			} catch (e) {
				console.error("Error extracting Exif data", e);
			}
		}

		return true;
	}

	return false;
}

async function main() {
	const result = await addExifInfo();

	if (!result) {
		setTimeout(() => {
			addExifInfo();
		}, 2000);
	}

	const config = { attributes: false, childList: true, subtree: false };
	const callback = (mutationList) => {
		for (const mutation of mutationList) {
			if (mutation.type === "childList") {
				addExifInfo();
			}
		}
	};
	const observer = new MutationObserver(callback);
	observer.observe(document.body, config);
}

main();
