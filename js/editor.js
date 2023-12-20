/* This file is part of the GeoRefImages Firefox extension.

    GeoRefImages is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    GeoRefImages is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with GeoRefImages.  If not, see <http://www.gnu.org/licenses/>.
*/

async function Initialise() {
	let urlSelf = new URLSearchParams(window.location.search);
	let strId = urlSelf.get("imgid");
	
	let nodeSvg = document.getElementById("svgCanvas");
	let nodeSvgImage = document.getElementById("svgImage");
	let nodeGrpMask = document.getElementById("grpMask");
	let nodePathGuideH = document.getElementById("pathGuideH");
	let nodePathGuideV = document.getElementById("pathGuideV");
	let nodeUseCursorH = document.getElementById("useCursorH");
	let nodeUseCursorV = document.getElementById("useCursorV");
	
	let nodeMaskCrop = document.getElementById("maskCrop");
	let nodeRectMaskCrop = document.getElementById("rectMaskCrop");
	
	let image = new Image();
	image.addEventListener("load", () => {
		nodeSvgImage.setAttribute("href",image.src);
		nodeSvg.setAttribute("viewBox","0 0 " + image.width + " " + image.height);
		nodeSvg.setAttribute("width",image.width);
		nodeSvg.setAttribute("height",image.height);
		nodeSvgImage.setAttribute("display","inline");
		nodePathGuideH.setAttribute("d","M 0,0 h " + image.width);
		nodePathGuideV.setAttribute("d","M 0,0 v " + image.height);
		nodeRectMaskCrop.setAttribute("x",0);
		nodeRectMaskCrop.setAttribute("y",0);
		nodeRectMaskCrop.setAttribute("width",image.width);
		nodeRectMaskCrop.setAttribute("height",image.height);
		nodeSvg.dispatchEvent(new Event("stateUpdated"));
	});
	
	let blob = await browser.storage.local.get(strId)
		.then( (dctEntry) => dctEntry[strId] )
		.catch( (error) => { alert("error fetching image blob from local storage: " + error); return null; });
	
	if (blob) {
		
		// there is an image to display: continue, construct and wire GUI
		
		const reader = new FileReader();
		reader.addEventListener("load", () => { image.src = reader.result; });
		await reader.readAsDataURL(blob);
		
		let arrPoint = new Array();
		
		function convertStringToDegrees(strCoord) {
			let fltCoord = null;
			if (strCoord) {
				let lstCoord = strCoord.match(/([+-]?\d+\.?\d*)°?(?:\s*(\d+\.?\d*)\')?(?:\s*(\d+\.?\d*)\")?/);
				if (lstCoord && lstCoord[1]) {
					fltCoord = parseFloat(lstCoord[1]);
					if (lstCoord[2]) {
						fltCoord = fltCoord + parseFloat(lstCoord[2])/60;
					}
					if (lstCoord[3]) {
						fltCoord = fltCoord + parseFloat(lstCoord[3])/3600;
					}
				}
			}
			return fltCoord;
		}
		
		function updateRectangle(nodeRect,x0,y0,x1,y1) {
			nodeRect.setAttribute("x",      Math.min(x0,x1) );
			nodeRect.setAttribute("y",      Math.min(y0,y1) );
			nodeRect.setAttribute("width",  Math.abs(x1-x0) );
			nodeRect.setAttribute("height", Math.abs(y1-y0) );
		}
		
		function onPointerMove(event) {
			if (arrPoint.length == 3) {
				// first point of region of interest was selected: draw crop mask rectangle
				updateRectangle(nodeRectMaskCrop,
					arrPoint[2].x,
					arrPoint[2].y,
					event.offsetX,
					event.offsetY
				);
				
			} else if (arrPoint.length > 3 && arrPoint.length % 2) {
				// first point of mask area was selected: draw mask rectangle
				nodeRect = nodeGrpMask.lastChild;
				if (nodeRect) {
					updateRectangle(nodeRect,
						arrPoint[arrPoint.length-1].x,
						arrPoint[arrPoint.length-1].y,
						event.offsetX,
						event.offsetY
					);
				}
			}
			nodeUseCursorH.setAttribute("y",event.offsetY);
			nodeUseCursorV.setAttribute("x",event.offsetX);
		}
		
		nodeSvg.onpointermove = onPointerMove;
		nodeSvg.onpointerenter = (event) => {
			nodeUseCursorV.setAttribute("display","inline");
			nodeUseCursorH.setAttribute("display","inline");
			onPointerMove(event);
		};
		nodeSvg.onpointerleave = (event) => {
			nodeUseCursorV.setAttribute("display","none");
			nodeUseCursorH.setAttribute("display","none");
		};
		nodeSvg.addEventListener("stateUpdated", (event) => {
			if (!(event.detail == undefined)) {
				arrPoint.push(event.detail);
			}
			if (arrPoint.length < 2) {
				// less than two points defined: ask for lat/lon
				alert("Please select a point for which you know longitude and latitude.");
				nodeSvg.onpointerup = (event) => {
					if (event.button == 0) {
						let fltLon = null;
						let fltLat = null;
						while (!fltLon) {
							fltLon = convertStringToDegrees(prompt("Longitude (9° 15' or 9.25; negative if westward):"));
							if (!fltLon) {
								alert("Invalid number format, please try again.");
							}
						}
						while (!fltLat) {
							fltLat = convertStringToDegrees(prompt("Latitude (52° 37' 30\" or 52.625; negative if southward):"));
							if (!fltLat) {
								alert("Invalid number format, please try again.");
							}
						}
						nodeSvg.dispatchEvent(new CustomEvent("stateUpdated", { detail: {x: event.offsetX, y: event.offsetY, lat: fltLat, lon: fltLon } }));
					}
				};
				
			} else if (arrPoint.length == 2) {
				// exactly two points defined: next step, ask for region of interest
				nodeSvg.onpointerup = (event) => {
					if (event.button == 0) {
						nodeSvg.dispatchEvent(new CustomEvent("stateUpdated", { detail: {x: event.offsetX, y: event.offsetY} }));
					}
				};
				if (!confirm("If you want to define a region of interest, click 'Ok'. If you choose 'Cancel', the entire image is used.")) {
					// user wants the entire image: add "0 0 width height" to arrPoint
					arrPoint.push({x:0,y:0});
					arrPoint.push({x:image.width-1,y:image.height-1});
					nodeSvg.dispatchEvent(new Event("stateUpdated"));
				}
				
			} else if (arrPoint.length == 3) {
				// three points defined -> first corner of crop mask rectangle defined, update SVG
				nodeRectMaskCrop.setAttribute("x",event.detail.x);
				nodeRectMaskCrop.setAttribute("y",event.detail.y);
				
			} else if (arrPoint.length > 3) {
				// more than three points defined: both lat/lon and crop rectagle corners defined,
				// head to next step and ask for mask areas
				if (arrPoint.length % 2 == 0) {
					// even number of points defined: two lat/lon points, crop rectangle points and zero or more mask areas
					// => ask user if them want to continue
					if (!confirm("If you want to add masked areas, click 'Ok'. If you choose 'Cancel', no masking will be applied.")) {
						// nearly done: calculate bounding lat/lon rect,
						//              ask for a unique name,
						//              generate filename,
						//              export SVG to PNG and let the download manager care for the rest
						
						// disable custom pointer events
						nodeSvg.onpointerup = (event) => {};
						nodeSvg.onpointermove = (event) => {};
						nodeSvg.onpointerenter = (event) => {};
						nodeSvg.onpointerleave = (event) => {};
						
						// insert a loader div
						let nodeMain = document.querySelector("main");
						let nodeSpinner = document.createElement("div");
						nodeSpinner.classList.add("spinner");
						nodeMain.insertBefore(nodeSpinner,nodeMain.firstChild);
						
						// bounding coordinate rectangle calculation: based on flat earth approximation,
						// i.e. linear extrapolation from the first two items in arrPoint
						// y = m*x + b
						// m = (y2-y1)/(x2-x1)
						// b = y - m*x
						let fltMLon = (arrPoint[0].lon - arrPoint[1].lon) / (arrPoint[0].x - arrPoint[1].x + 1);
						let fltMLat = (arrPoint[0].lat - arrPoint[1].lat) / (arrPoint[0].y - arrPoint[1].y + 1);
						let fltBLon = arrPoint[0].lon - fltMLon * arrPoint[0].x
						let fltBLat = arrPoint[0].lat - fltMLat * arrPoint[0].y
						
						let fltLon0 = fltMLon * Math.min(arrPoint[2].x,arrPoint[3].x) + fltBLon;
						let fltLat0 = fltMLat * Math.min(arrPoint[2].y,arrPoint[3].y) + fltBLat;
						
						let fltLon1 = fltMLon * Math.max(arrPoint[2].x,arrPoint[3].x) + fltBLon;
						let fltLat1 = fltMLat * Math.max(arrPoint[2].y,arrPoint[3].y) + fltBLat;
						
						let strName = prompt("Please provide a unique name for this image:");
						let strFilename = strName + "-geo_" + fltLon0 + "_" + fltLat0 + "_" + fltLon1 + "_" + fltLat1 + ".png";
						
						// create style element for the SVG element and insert as first child
						let nodeStyle = document.createElement("style");
						nodeStyle.type = "text/css";
						/*
						let styleSheet = document.styleSheets[1];
						let styleRules = new Array();
						for (let cssRule of styleSheet.cssRules) {
							styleRules.push(cssRule.cssText);
						}
						nodeStyle.appendChild(document.createTextNode(styleRules.join(" ")));
						*/
						nodeStyle.appendChild(document.createTextNode("#rectMaskCrop { fill: #ffffff; } #maskCrop rec:first-child, #grpMask rect { fill: #000000; }"));
						nodeSvg.insertBefore(nodeStyle,nodeSvg.firstChild);
						
						// hide guide lines
						nodeSvg.querySelectorAll("use").forEach( (node) => { node.setAttribute("display","none"); });
						
						// update viewBox to match crop mask
						let intWidth  = Math.abs(arrPoint[3].x - arrPoint[2].x) + 1;
						let intHeight = Math.abs(arrPoint[3].y - arrPoint[2].y) + 1;
						nodeSvg.setAttribute("viewBox",Math.min(arrPoint[2].x,arrPoint[3].x) + " " + Math.min(arrPoint[2].y,arrPoint[3].y) + " " + intWidth + " " + intHeight);
						nodeSvg.setAttribute("width",intWidth);
						nodeSvg.setAttribute("height",intHeight);
						
						// serialise SVG and create a blob from it
						let dataSvg = (new XMLSerializer()).serializeToString(nodeSvg);
						let blobSvg = new Blob([dataSvg], { type: 'image/svg+xml;charset=utf-8' });
						
						// create URL from blob and assign as src of an image element
						let urlBlobSvg = URL.createObjectURL(blobSvg);
						let imgSvg = new Image();
						imgSvg.addEventListener("load", async () => {
							// create a canvas element and draw svg image blob to it
							let canvas = document.createElement("canvas");
							let context = canvas.getContext("2d");
							canvas.width = intWidth;
							canvas.height = intHeight;
							context.drawImage(imgSvg,0,0,intWidth,intHeight);
							URL.revokeObjectURL(urlBlobSvg);
							
							// export canvas as data url to synthetic anchor element
							let nodeAnchor = document.createElement('a');
							nodeAnchor.download = strFilename;
							nodeAnchor.href = canvas.toDataURL();
							nodeAnchor.innerHTML = "Download Image File";
							
							// replace heading with synthetic anchor element
							// and click it; remove spinner
							nodeMain.insertBefore(nodeAnchor,nodeMain.firstChild);
							document.querySelector("main h4").remove();
							nodeSpinner.remove();
							nodeAnchor.click();
							
							// clear file-specific storage
							await browser.storage.local.remove(strId).catch( (error) => { alert("error removing image blob from local storage: " + error); });
						});
						imgSvg.src = urlBlobSvg;
					}
				} else {
					// uneven number of points defined -> first corner of new mask area defined, update SVG
					// create new mask rectangle and append to mask group
					nodeRect = document.createElementNS("http://www.w3.org/2000/svg","rect");
					nodeRect.setAttribute("x",event.detail.x);
					nodeRect.setAttribute("y",event.detail.y);
					nodeRect.setAttribute("width",0);
					nodeRect.setAttribute("height",0);
					nodeGrpMask.appendChild(nodeRect);
				}
			}
		});
	}
}


/**
 * script entry point
 */
if (document.readyState === "loading") {
	// document is still loading, add a listener for initialisation
	window.addEventListener("DOMContentLoaded",Initialise);
} else {
	// document already loaded, DOMContentLoaded won't fire, so initialise explicitly
	Initialise();
}
