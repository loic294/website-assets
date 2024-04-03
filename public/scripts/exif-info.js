function getBase64Image(img) {
	var canvas = document.createElement("canvas");
	canvas.width = img.width;
	canvas.height = img.height;
	var ctx = canvas.getContext("2d");
	ctx.drawImage(img, 0, 0);
	var dataURL = canvas.toDataURL("image/png");
	return dataURL.replace(/^data:image\/?[A-z]*;base64,/);
}

const imageUrlToBase64 = async (url) => {
	const data = await fetch(url);
	const blob = await data.blob();
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(blob);
		reader.onloadend = () => {
			const base64data = reader.result;
			resolve(base64data);
		};
		reader.onerror = reject;
	});
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

async function main() {
	const galleryImagesWrapper = document.querySelectorAll(".gallery-lightbox-item-img > img");
	console.log("galleryImagesWrapper", galleryImagesWrapper);

	if (galleryImagesWrapper?.length > 0) {
		await import("http://localhost:3000/lib/piexifjs.js");

		for (const galleryImage of galleryImagesWrapper) {
			console.log("gallery image src", galleryImage.attributes["data-src"].value + "?format=100w");
			const base64Img = await imageUrlToBase64(galleryImage.attributes["data-src"].value + "?format=100w");
			// console.log('BASE 64', base64Img)
			let exif = debugExif(piexif.load(base64Img));
			console.log("EXIF", exif);

			const make = exif.Make;
			const model = exif.Model;
			const lens = exif.LensModel;
			const aperture = renderRational(exif.FNumber);
			const shutterspeed = renderRational(exif.ExposureTime);
			const focallength = exif.FocalLengthIn35mmFilm || renderRational(exif.FocalLength);
			const iso = exif.ISOSpeedRatings;

			if (make || model) {
				const newDiv = document.createElement("div");
				newDiv.className = "exif-wrapper";
				newDiv.innerHTML = `
        <div class="exif-data">
          <span class="exif-camera">© ${make || ""} ${model?.replace("Canon ", "") || ""}</span>
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

				//galleryImage.parentElement.innerHTML = '';
				galleryImage.parentElement.appendChild(newDiv);
			}
		}
	}
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
