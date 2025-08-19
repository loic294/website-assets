const imageUrlToBase64 = async (url) => {
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
	const uint8Array = new Uint8Array(arrayBuffer);
	let binaryString = '';
	for (let i = 0; i < uint8Array.length; i++) {
		binaryString += String.fromCharCode(uint8Array[i]);
	}
	const base64 = btoa(binaryString);
	
	return base64;
};

function parseExifData(base64) {
	const binary = atob(base64);
	const data = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		data[i] = binary.charCodeAt(i);
	}
	
	// Check for JPEG format
	if (data[0] !== 0xFF || data[1] !== 0xD8) {
		return null;
	}
	
	// Find EXIF segment
	let offset = 2;
	while (offset < data.length - 1) {
		if (data[offset] === 0xFF && data[offset + 1] === 0xE1) {
			// Found APP1 segment (EXIF)
			const segmentLength = (data[offset + 2] << 8) | data[offset + 3];
			
			// Check for "Exif\0\0" identifier
			if (data[offset + 4] === 0x45 && data[offset + 5] === 0x78 && 
				data[offset + 6] === 0x69 && data[offset + 7] === 0x66 &&
				data[offset + 8] === 0x00 && data[offset + 9] === 0x00) {
				
				// Start parsing TIFF header (after "Exif\0\0")
				const tiffStart = offset + 10;
				const exifData = parseExifTags(data, tiffStart);
				return exifData;
			}
		}
		offset += 2;
	}
	
	return null;
}

function parseExifTags(data, tiffStart) {
	const exif = {};
	
	// Read TIFF header
	const byteOrder = String.fromCharCode(data[tiffStart], data[tiffStart + 1]);
	const littleEndian = byteOrder === 'II';
	
	// Read magic number (should be 42)
	const magic = readUint16(data, tiffStart + 2, littleEndian);
	
	// Read offset to first IFD
	const ifdOffset = readUint32(data, tiffStart + 4, littleEndian);
	
	// Parse IFD0 (main image)
	const ifd0 = parseIFD(data, tiffStart + ifdOffset, tiffStart, littleEndian);
	Object.assign(exif, ifd0);
	
	// Look for EXIF sub-IFD in IFD0 (tag 34665)
	if (ifd0.ExifOffset) {
		const exifIfd = parseIFD(data, tiffStart + ifd0.ExifOffset, tiffStart, littleEndian);
		Object.assign(exif, exifIfd);
	}
	
	return exif;
}

function parseIFD(data, ifdStart, tiffStart, littleEndian) {
	const tags = {};
	
	const numEntries = readUint16(data, ifdStart, littleEndian);
	
	for (let i = 0; i < numEntries; i++) {
		const entryOffset = ifdStart + 2 + (i * 12);
		const tag = readUint16(data, entryOffset, littleEndian);
		const type = readUint16(data, entryOffset + 2, littleEndian);
		const count = readUint32(data, entryOffset + 4, littleEndian);
		
		let value;
		if (getTypeSize(type) * count <= 4) {
			// Value fits in 4 bytes
			value = readValue(data, entryOffset + 8, type, count, littleEndian);
		} else {
			// Value is stored at offset
			const valueOffset = readUint32(data, entryOffset + 8, littleEndian);
			value = readValue(data, tiffStart + valueOffset, type, count, littleEndian);
		}
		
		const tagName = getTagName(tag);
		if (tagName) {
			tags[tagName] = value;
		}
	}
	
	return tags;
}

function readUint16(data, offset, littleEndian) {
	if (littleEndian) {
		return data[offset] | (data[offset + 1] << 8);
	} else {
		return (data[offset] << 8) | data[offset + 1];
	}
}

function readUint32(data, offset, littleEndian) {
	if (littleEndian) {
		return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24);
	} else {
		return (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
	}
}

function readValue(data, offset, type, count, littleEndian) {
	switch (type) {
		case 1: // BYTE
			return count === 1 ? data[offset] : Array.from(data.slice(offset, offset + count));
		case 2: // ASCII
			let str = '';
			for (let i = 0; i < count - 1; i++) { // -1 to exclude null terminator
				str += String.fromCharCode(data[offset + i]);
			}
			return str;
		case 3: // SHORT
			if (count === 1) {
				return readUint16(data, offset, littleEndian);
			} else {
				const values = [];
				for (let i = 0; i < count; i++) {
					values.push(readUint16(data, offset + i * 2, littleEndian));
				}
				return values;
			}
		case 4: // LONG
			return readUint32(data, offset, littleEndian);
		case 5: // RATIONAL
			const numerator = readUint32(data, offset, littleEndian);
			const denominator = readUint32(data, offset + 4, littleEndian);
			return [numerator, denominator];
		default:
			return null;
	}
}

function getTypeSize(type) {
	const sizes = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8 };
	return sizes[type] || 0;
}

function getTagName(tag) {
	const tags = {
		// Basic image info
		271: 'Make',
		272: 'Model',
		
		// Lens info
		42036: 'LensModel',
		42035: 'LensMake',
		42037: 'LensSerialNumber',
		
		// Camera settings
		33437: 'FNumber',           // Aperture
		33434: 'ExposureTime',      // Shutter speed
		37386: 'FocalLength',       // Focal length
		41989: 'FocalLengthIn35mmFilm',
		34855: 'ISOSpeedRatings',   // ISO
		
		// Alternative ISO tags
		34867: 'DateTimeOriginal',
		36867: 'DateTimeOriginal',
		
		// EXIF sub-IFD pointer
		34665: 'ExifOffset',
		
		// Additional camera data
		37385: 'Flash',
		37383: 'MeteringMode',
		37384: 'LightSource',
		37396: 'SubjectArea'
	};
	return tags[tag];
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
				
				let base64Img, exif;
				try {
					base64Img = await imageUrlToBase64(originalUrl);
					exif = parseExifData(base64Img) || {};
				} catch (error) {
					// If original fails, try formatted version
					const formattedUrl = originalUrl + "?format=750w";
					base64Img = await imageUrlToBase64(formattedUrl);
					exif = parseExifData(base64Img) || {};
				}

				const make = exif.Make;
				const model = exif.Model;
				const lens = exif.LensModel;
				const aperture = renderRational(exif.FNumber);
				const shutterspeed = renderRational(exif.ExposureTime);
				const focallength = exif.FocalLengthIn35mmFilm || renderRational(exif.FocalLength);
				const iso = exif.ISOSpeedRatings;

				console.log("Extracted values:", { make, model, lens, aperture, shutterspeed, focallength, iso });

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
					</div>
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
