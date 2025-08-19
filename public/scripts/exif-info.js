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
		console.log('Data URL for verification:', dataUrl.substring(0, 50) + '...');
		
		return base64;
	} catch (error) {
		console.log('Fetch failed:', error);
		throw error;
	}
};

function parseExifData(base64) {
	try {
		const binary = atob(base64);
		const data = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			data[i] = binary.charCodeAt(i);
		}
		
		// Check for JPEG format
		if (data[0] !== 0xFF || data[1] !== 0xD8) {
			console.log('Not a valid JPEG file');
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
					
					console.log('Found EXIF segment at offset:', offset);
					console.log('Segment length:', segmentLength);
					
					// Start parsing TIFF header (after "Exif\0\0")
					const tiffStart = offset + 10;
					const exifData = parseExifTags(data, tiffStart);
					return exifData;
				}
			}
			offset += 2;
		}
		
		console.log('No EXIF data found');
		return null;
	} catch (error) {
		console.log('Error parsing EXIF:', error);
		return null;
	}
}

function parseExifTags(data, tiffStart) {
	const exif = {};
	
	try {
		// Read TIFF header
		const byteOrder = String.fromCharCode(data[tiffStart], data[tiffStart + 1]);
		const littleEndian = byteOrder === 'II';
		console.log('Byte order:', byteOrder, 'Little endian:', littleEndian);
		
		// Read magic number (should be 42)
		const magic = readUint16(data, tiffStart + 2, littleEndian);
		console.log('Magic number:', magic);
		
		// Read offset to first IFD
		const ifdOffset = readUint32(data, tiffStart + 4, littleEndian);
		console.log('IFD offset:', ifdOffset);
		
		// Parse IFD0 (main image)
		const ifd0 = parseIFD(data, tiffStart + ifdOffset, tiffStart, littleEndian);
		Object.assign(exif, ifd0);
		
		console.log('Parsed EXIF tags:', Object.keys(exif));
		return exif;
	} catch (error) {
		console.log('Error parsing TIFF data:', error);
		return {};
	}
}

function parseIFD(data, ifdStart, tiffStart, littleEndian) {
	const tags = {};
	
	try {
		const numEntries = readUint16(data, ifdStart, littleEndian);
		console.log('Number of IFD entries:', numEntries);
		
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
				console.log(`Tag ${tag} (${tagName}):`, value);
			}
		}
	} catch (error) {
		console.log('Error parsing IFD:', error);
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
		271: 'Make',
		272: 'Model',
		42036: 'LensModel',
		33437: 'FNumber',
		33434: 'ExposureTime',
		37386: 'FocalLength',
		41989: 'FocalLengthIn35mmFilm',
		34855: 'ISOSpeedRatings'
	};
	return tags[tag];
}

function hasExifData(base64) {
	try {
		// Convert base64 to binary for inspection
		const binary = atob(base64);
		
		// Check for JPEG format (starts with FF D8)
		if (binary.charCodeAt(0) !== 0xFF || binary.charCodeAt(1) !== 0xD8) {
			console.log('Not a valid JPEG file');
			return false;
		}
		
		// Look for EXIF marker (FF E1 followed by "Exif")
		// EXIF data starts with FF E1 XX XX "Exif" 00 00
		for (let i = 2; i < binary.length - 6; i++) {
			if (binary.charCodeAt(i) === 0xFF && binary.charCodeAt(i + 1) === 0xE1) {
				// Check if followed by "Exif"
				const exifMarker = binary.substr(i + 4, 4);
				if (exifMarker === 'Exif') {
					console.log('EXIF data found at position:', i);
					return true;
				}
			}
		}
		
		console.log('No EXIF data found in image');
		return false;
	} catch (error) {
		console.log('Error checking for EXIF data:', error);
		return false;
	}
}

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
					
					// Check if the image has EXIF data before trying to parse it
					const hasExif = hasExifData(base64Img);
					console.log('Has EXIF data:', hasExif);
					
					if (hasExif) {
						console.log('=== USING CUSTOM EXIF PARSER ===');
						exif = parseExifData(base64Img) || {};
						console.log('Custom parser result:', exif);
						console.log('EXIF keys found:', Object.keys(exif));
					} else {
						console.log('No EXIF data found, skipping parsing');
						exif = {};
					}
				} catch (error) {
					console.log('Original failed, trying formatted version:', error);
					const formattedUrl = originalUrl + "?format=750w";
					console.log('Trying formatted URL:', formattedUrl);
					base64Img = await imageUrlToBase64(formattedUrl);
					console.log('Formatted base64 prefix:', base64Img.substring(0, 50));
					
					// Check if the formatted image has EXIF data
					const hasExif = hasExifData(base64Img);
					console.log('Formatted image has EXIF data:', hasExif);
					
					if (hasExif) {
						console.log('=== USING CUSTOM EXIF PARSER (FORMATTED) ===');
						exif = parseExifData(base64Img) || {};
						console.log('Custom parser result:', exif);
						console.log('EXIF keys found:', Object.keys(exif));
					} else {
						console.log('No EXIF data found in formatted image, skipping parsing');
						exif = {};
					}
				}

				const make = exif.Make;
				const model = exif.Model;
				const lens = exif.LensModel;
				const aperture = renderRational(exif.FNumber);
				const shutterspeed = renderRational(exif.ExposureTime);
				const focallength = exif.FocalLengthIn35mmFilm || renderRational(exif.FocalLength);
				const iso = exif.ISOSpeedRatings;

				console.log('=== EXTRACTED VALUES ===');
				console.log('Make:', make);
				console.log('Model:', model);
				console.log('Lens:', lens);
				console.log('Aperture (FNumber):', exif.FNumber, '-> rendered:', aperture);
				console.log('Shutter Speed (ExposureTime):', exif.ExposureTime, '-> rendered:', shutterspeed);
				console.log('Focal Length (35mm):', exif.FocalLengthIn35mmFilm);
				console.log('Focal Length:', exif.FocalLength, '-> rendered focal length:', focallength);
				console.log('ISO:', iso);

				console.log("Image", imageName, exif, make, model, lens, aperture, shutterspeed, focallength, iso);

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
