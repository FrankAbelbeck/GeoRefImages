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

/** callback: check lastError */
browser.contextMenus.create(
	{
		id: "georefimages-image-context",
		title: "Geo-reference image",
		contexts: ["image"],
		documentUrlPatterns: ["<all_urls>"]
	},
    () => void browser.runtime.lastError,
);

browser.contextMenus.onClicked.addListener(async (info, tab) => {
	let arrError = new Array();
	switch (info.menuItemId) {
		case "georefimages-image-context":
			// fetch src URL of right-clicked image and get blob
			var blob = await fetch(info.srcUrl)
				.then( (fileImage) => fileImage.blob() )
				.catch( (error) => { arrError.push("fetching image failed: " + error); return null; });
			
			if (!blob) break;
			
			// get sha256 sum of blob, use as key in storage; later on, pass checksum to tab as query
			var strChecksum = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())
				.then( (arrHash) => Array.from(new Uint8Array(arrHash)).map( (chrByte) => chrByte.toString(16).padStart(2,"0")).join("") )
				.catch( (error) => { arrError.push("calculating SHA256 failed: " + error); return null; });
			
			if (!strChecksum) break;
			
			// push blob to storage
			await browser.storage.local.set({ [strChecksum]: blob })
				.catch( (error) => { arrError.push("Error writing local storage: " + error); });
			
			if (arrError.length == 0) {
				browser.tabs.create({
					active: true,
					url: "html/editor.html?imgid=" + strChecksum
				}).catch( (error) => { arrError.push("Error opening editor tab: " + error); });
			}
			break;
	}
	
	// finally: alert if an error occured
	if (arrError.length > 0) {
		try {
			await browser.scripting.executeScript({
				target: { tabId: tab.id },
				func: () => { alert( "Failed to process image. The following error" + ((arrError.length != 1) ? "s" : "") + " occured:\n\n" + arrError.join("\n\n")); }
			})
		} catch (error) {
			console.error("failed to execute background alert: " + error);
		}
	}
});
