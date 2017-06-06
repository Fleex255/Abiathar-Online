// Global (well, persisted while viewing editor.html) variables
var gamemaps, maphead, backtils, foretils; // Editor resources meta from Dropbox
var unmaskTls, maskTls, nybbles; // Image instances
var xhrGamemaps, xhrMaphead; // XMLHttpRequest instances for map resources
var levels; // Array(100) of levels
var lastLevelId, lastTileset, levelId, tryShowLevelId; // Level ID if >= 0, or negative tileset ID, or -4 for blank
var tileCache = new Array(3); // Cached tiles, carved from tilesets
var tileCounts = new Array(3); // Number of tiles in each tileset
var planeStates, selTiles; // Arrays for plane states (active, locked, hidden) and selected tiles
var selTileIdSpans, selTileImgs, planeStateSpans; // Arrays for control elements of each plane
var canvas; // The main canvas, cached as a variable to minimize DOM queries
var scrollPositions = new Object; // Map of level/tileset IDs to scroll positions
var idEntryPlane; // Plane where tile ID is being entered
var planeNames = ["Background", "Foreground", "Infoplane"]; // Display names of planes

// Functions and event handlers and other exciting stuff
function startup() {
    // Load resources from the query string, if supplied
    function getParameterByName(name) {
        var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
        return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
    } // https://stackoverflow.com/a/5158301/2825369
    var gamemapsLink = getParameterByName('gamemaps');
    var mapheadLink = getParameterByName('maphead');
    var backtilLink = getParameterByName('backtli');
    var foretilLink = getParameterByName('foretli');
    if (gamemapsLink && mapheadLink && backtilLink && foretilLink) {
        startLoading(gamemapsLink, mapheadLink, backtilLink, foretilLink);
        var showLevel = getParameterByName('level');
        if (showLevel) { tryShowLevelId = showLevel; }
    }
}
function setupResponse(title, message) {
    var messageSpan = document.getElementById("msg");
    messageSpan.innerText = message;
    var bigText = document.getElementById("title");
    bigText.innerText = title;
}
function resetResources() {
    gamemaps = undefined;
    maphead = undefined;
    backtils = undefined;
    foretils = undefined;
    document.getElementById("resGamemaps").innerText = "";
    document.getElementById("resMaphead").innerText = "";
    document.getElementById("resBacktils").innerText = "";
    document.getElementById("resForetils").innerText = "";
    document.getElementById("goEasy").style.display = "inline";
    document.getElementById("goHard").style.display = "inline";
    document.getElementById("goFinal").style.display = "none";
}
function setShowPickLinks(show) {
    var display = show ? "inline" : "none";
    document.getElementById("pickGamemaps").style.display = display;
    document.getElementById("pickMaphead").style.display = display;
    document.getElementById("pickBacktils").style.display = display;
    document.getElementById("pickForetils").style.display = display;
}
function setupEasy() {
    resetResources();
    setShowPickLinks(false);
    document.getElementById("resTable").style.display = "none";
    var options = {
        success: function(files) {
            if (files.length == 4) {
                files.forEach(function(item, index, array) {
                    var filename = item.name;
                    var extension = filename.split(".")[1].toUpperCase(); // There will be problems if people select files without extensions
                    var filetitle = filename.split(".")[0].toUpperCase();
                    if (gamemaps === undefined && extension != "BMP" && (filetitle.substr(filetitle.length - 4) == "MAPS" || filetitle == "MAPTEMP")) {
                        gamemaps = item;
                    } else if (maphead === undefined && extension != "BMP") {
                        maphead = item;
                    } else if (backtils === undefined && extension == "BMP" && (filetitle.indexOf("UNMASKED") > -1 || filetitle.substr(filetitle.length - 4, 4) == "0000")) {
                        backtils = item;
                    } else if (foretils === undefined && extension == "BMP" && (filetitle.indexOf("-MASKED") > -1 || filetitle.substr(filetitle.length - 4, 4) == "0001")) {
                        foretils = item;
                    }
                });
                if (gamemaps !== undefined && maphead !== undefined && backtils !== undefined && foretils !== undefined) {
                    document.getElementById("goEasy").style.display = "none";
                    document.getElementById("goFinal").style.display = "inline";
                    document.getElementById("resTable").style.display = "table";
                    document.getElementById("resGamemaps").innerText = gamemaps.name;
                    document.getElementById("resMaphead").innerText = maphead.name;
                    document.getElementById("resBacktils").innerText = backtils.name;
                    document.getElementById("resForetils").innerText = foretils.name;
                    setupResponse("Look alright?", "Make sure your resources were identified correctly, then press Launch Editor. If they aren't all right, you'll need to choose one at a time.");
                } else {
                    setupResponse("Oops", "The type of one or more of your resource files couldn't be determined. Try renaming them, or use the other option to select one file at a time.")
                }
            } else {
                setupResponse("Oops", "You need to select all four files (main maps file, map header, background tileset, and foreground tileset). Try again, or use the other option to select one file at once.");
            }
        },
        cancel: function() {
            resetResources();
        },
        linkType: "direct",
        multiselect: true
    }
    setupResponse("Choosing files", "A Dropbox window should have opened so you can choose your files. If nothing happened, you might have an overzealous pop-up blocker.")
    Dropbox.choose(options);
}
function setupHard() {
    resetResources();
    setShowPickLinks(true);
    document.getElementById("resTable").style.display = "table";
    document.getElementById("goHard").style.display = "none";
    document.getElementById("goFinal").style.display = "inline";
    setupResponse("Choose your files", "Click Pick next to each resource type to browse your Dropbox for that resource, then click Launch Editor when finished.");
}
function pickGamemaps() {
    pickResource("resGamemaps", function(res) { gamemaps = res; });
}
function pickMaphead() {
    pickResource("resMaphead", function(res) { maphead = res; });
}
function pickBacktils() {
    pickResource("resBacktils", function(res) { backtils = res; });
}
function pickForetils() {
    pickResource("resForetils", function(res) { foretils = res; });
}
function pickResource(divName, recvMeta) {
    Dropbox.choose({
        success: function(files) {
            recvMeta(files[0]);
            document.getElementById(divName).innerText = files[0].name;
        },
        cancel: function() { },
        linkType: "direct",
        multiselect: false
    });
}
function confirmSetup() {
    if (gamemaps !== undefined && maphead !== undefined && backtils !== undefined && foretils !== undefined) {
        startLoading(gamemaps.link, maphead.link, backtils.link, foretils.link);
    }
}
function startLoading(gamemapsLink, mapheadLink, backtilLink, foretilLink) {
    document.getElementById("setupControl").style.display = "none";
    setupResponse("OK!", "Loading resources, please wait...");
    xhrGamemaps = new XMLHttpRequest();
    xhrGamemaps.open("GET", gamemapsLink, true);
    xhrGamemaps.responseType = "arraybuffer";
    xhrGamemaps.onload = levelResReady;
    xhrGamemaps.send(null);
    xhrMaphead = new XMLHttpRequest();
    xhrMaphead.open("GET", mapheadLink, true);
    xhrMaphead.responseType = "arraybuffer";
    xhrMaphead.onload = levelResReady;
    xhrMaphead.send(null);
    unmaskTls = new Image;
    unmaskTls.onload = editorReady;
    unmaskTls.crossOrigin = "Anonymous"; // CORS
    unmaskTls.src = backtilLink;
    maskTls = new Image;
    maskTls.onload = editorReady;
    maskTls.crossOrigin = "Anonymous";
    maskTls.src = foretilLink;
    nybbles = new Image;
    nybbles.onload = editorReady;
    nybbles.src = "nybbles.png";
}
function readNumber(arr, offset, byteLen) { // Read a little-endian number from a byte array
    var res = 0;
    for (var i = 0; i < byteLen; i++) {
        res += (arr[offset + i] << (8 * i));
    }
    return res;
}
function writeNumber(arr, offset, val, byteLen) { // Write a little-endian number to a byte array
    for (var i = 0; i < byteLen; i++) {
        arr[offset + i] = (val & 0xFF); // Get the bottom byte only
        val = val >> 8;
    }
}
function levelResReady(event) {
    // This is called twice as gamemaps and maphead are loaded
    if (!(xhrGamemaps.response && xhrMaphead.response)) return;
    var aHead = new Uint8Array(xhrMaphead.response);
    var aMaps = new Uint8Array(xhrGamemaps.response);
    var rlew = aHead[0] + (aHead[1] << 8); // The magic word, usually $ABCD ($CD $AB because little-endian)
    var offsets = new Array(100);
    for (var i = 0; i < 100; i++) { // Load the offsets from maphead
        offsets[i] = readNumber(aHead, 2 + (i * 4), 4);
    }
    levels = new Array(100);
    for (var i = 0; i < 100; i++) {
        if (offsets[i] == 0) continue;
        var level = new Object;
        level.planes = new Array(3);
        var planeLoc = new Array(3);
        var planeLen = new Array(3);
        for (var j = 0; j < 3; j++) { // Load plane offsets
            planeLoc[j] = readNumber(aMaps, offsets[i] + (j * 4), 4);
        }
        for (var j = 0; j < 3; j++) { // Load plane lengths
            planeLen[j] = readNumber(aMaps, offsets[i] + 12 + (j * 2), 2);
        }
        level.width = readNumber(aMaps, offsets[i] + 18, 2);
        level.height = readNumber(aMaps, offsets[i] + 20, 2);
        level.name = "";
        for (var j = 0; j < 16; j++) { // Load level name
            var charCode = aMaps[offsets[i] + 22 + j];
            if (charCode == 0) break;
            level.name += String.fromCharCode(charCode);
        }
        for (var j = 0; j < 3; j++) { // Load level data
            var halfcompLen = readNumber(aMaps, planeLoc[j], 2);
            var halfcomp = new Uint16Array(halfcompLen / 2); // RLEW-compressed data, extracted from the main Carmack compression
            var compPos = planeLoc[j] + 2;
            var hcPos = 0;
            while (compPos < planeLoc[j] + planeLen[j]) { // Carmack decompressor
                var bLow = aMaps[compPos];
                var bHigh = aMaps[compPos + 1];
                if (bHigh == 0xA7) { // Near pointer
                    var shiftBack = aMaps[compPos + 2];
                    if (bLow == 0) { // Escape code
                        halfcomp[hcPos] = (bHigh << 8) + shiftBack;
                        hcPos++;
                    } else {
                        var startPos = hcPos - shiftBack;
                        for (var k = 0; k < bLow; k++) {
                            halfcomp[hcPos] = halfcomp[startPos + k];
                            hcPos++;
                        }
                    }
                    compPos += 3;
                } else if (bHigh == 0xA8) { // Far pointer
                    if (bLow == 0) { // Escape code
                        halfcomp[hcPos] = (bHigh << 8) + aMaps[compPos + 2];
                        hcPos++;
                        compPos += 3;
                    } else {
                        var startPos = readNumber(aMaps, compPos + 2, 2);
                        for (var k = 0; k < bLow; k++) {
                            halfcomp[hcPos] = halfcomp[startPos + k];
                            hcPos++;
                        }
                        compPos += 4;
                    }
                } else { // Literal
                    halfcomp[hcPos] = (bHigh << 8) + bLow;
                    hcPos++;
                    compPos += 2;
                }
            }
            var decompLen = halfcomp[0];
            var decomp = new Uint16Array(decompLen / 2);
            hcPos = 1;
            var outPos = 0;
            while (outPos < decompLen / 2) { // RLEW decompressor
                var curWord = halfcomp[hcPos];
                if (curWord == rlew) {
                    var runLen = halfcomp[hcPos + 1];
                    var runVal = halfcomp[hcPos + 2];
                    for (var k = 0; k < runLen; k++) {
                        decomp[outPos] = runVal;
                        outPos++;
                    }
                    hcPos += 3;
                } else { // Literal
                    decomp[outPos] = curWord;
                    outPos++;
                    hcPos++;
                }
            }
            outPos = 0;
            level.planes[j] = new Array(level.width);
            for (var x = 0; x < level.width; x++) { // Prep the jagged array
                // Access tiles with level.planes[plane][x][y]
                level.planes[j][x] = new Array(level.height);
            }
            for (var y = 0; y < level.height; y++) { // Load tiles
                for (var x = 0; x < level.width; x++) {
                    level.planes[j][x][y] = decomp[outPos];
                    outPos++;
                }
            }
        }
        levels[i] = level;
    }
    editorReady();
}
function revertSaveButton(msg) {
    document.getElementById("saveButton").style.display = "inline";
    document.getElementById("savingButton").style.display = "none";
    document.getElementById("saveProgress").innerText = msg;
}
function saveLevels() {
    var aHead = new Uint8Array(402);
    var aMaps = new Array();
    var writeString = function(arr, text, offset, padLen) {
        for (var i = 0; i < text.length; i++) {
            arr[offset + i] = text.charCodeAt(i);
        }
        if (text.length < padLen) {
            for (var i = 0; i < (padLen - text.length) ; i++) {
                arr[offset + text.length + i] = 0;
            }
        }
    }
    writeString(aMaps, "OpenThar", 0, 8);
    var mapsPos = 8;
    writeNumber(aHead, 0, 0xABCD, 2);
    for (var i = 0; i < 100; i++) {
        var level = levels[i];
        if (level === undefined) continue;
        var planeLoc = new Array(3);
        var planeLen = new Array(3);
        for (var plane = 0; plane < 3; plane++) {
            var uncomp = new Uint16Array(level.width * level.height);
            var ucPos = 0;
            for (var y = 0; y < level.height; y++) { // Write the raw tile data
                for (var x = 0; x < level.width; x++) {
                    uncomp[ucPos] = level.planes[plane][x][y];
                    ucPos++;
                }
            }
            var rlewComp = new Array();
            rlewComp[0] = uncomp.length * 2;
            var rlPos = 1;
            var curWord, runLen;
            ucPos = 0;
            while (ucPos < uncomp.length) { // RLEW compression
                curWord = uncomp[ucPos];
                runLen = 1;
                ucPos++;
                while (ucPos < uncomp.length && uncomp[ucPos] == curWord) { // Get a run
                    ucPos++;
                    runLen++;
                }
                if (runLen > 2 || curWord == 0xABCD) { // Worth compressing
                    rlewComp[rlPos] = 0xABCD;
                    rlewComp[rlPos + 1] = runLen;
                    rlewComp[rlPos + 2] = curWord;
                    rlPos += 3;
                } else {
                    ucPos -= (runLen - 1); // Go back the extra value
                    rlewComp[rlPos] = curWord;
                    rlPos++;
                }
            }
            rlPos = 0;
            writeNumber(aMaps, mapsPos, rlewComp.length * 2, 2);
            var origMapsPos = mapsPos;
            mapsPos += 2;
            while (rlPos < rlewComp.length) { // Copy to GAMEMAPS with trivial Carmack compression
                var word = rlewComp[rlPos];
                var hiByte = (word >> 8);
                if (hiByte == 0xA7 || hiByte == 0xA8) {
                    aMaps[mapsPos] = 0;
                    aMaps[mapsPos + 1] = hiByte;
                    aMaps[mapsPos + 2] = (word & 0xFF);
                    mapsPos += 3;
                } else {
                    aMaps[mapsPos] = (word & 0xFF);
                    aMaps[mapsPos + 1] = hiByte;
                    mapsPos += 2;
                }
                rlPos++;
            }
            planeLen[plane] = mapsPos - origMapsPos;
            planeLoc[plane] = origMapsPos;
        }
        writeNumber(aHead, 2 + (i * 4), mapsPos, 4); // Write the main header pointer
        for (var j = 0; j < 3; j++) {
            writeNumber(aMaps, mapsPos + (j * 4), planeLoc[j], 4);
            writeNumber(aMaps, mapsPos + 12 + (j * 2), planeLen[j], 2);
        }
        writeNumber(aMaps, mapsPos + 18, level.width, 2);
        writeNumber(aMaps, mapsPos + 20, level.height, 2);
        writeString(aMaps, level.name, mapsPos + 22, 16);
        writeString(aMaps, "Thar", mapsPos + 38, 4);
        writeString(aMaps, "", mapsPos + 42, 8); // A bit of extra padding in case the Base64 round-trip causes problems
        mapsPos += 42;
    }
    document.getElementById("saveButton").style.display = "none";
    document.getElementById("savingButton").style.display = "inline";
    var mapheadUrl = "data:application/octet-stream;base64," + encodeURIComponent(btoa(String.fromCharCode.apply(null, aHead))); // Encoding for the equal signs at the end
    var gamemapsUrl = "data:application/octet-stream;base64," + encodeURIComponent(btoa(String.fromCharCode.apply(null, aMaps)));
    var saveOptions = {
        files: [
            { "url": gamemapsUrl, "filename": gamemaps.name },
            { "url": mapheadUrl, "filename": maphead.name }
        ],
        success: function() {
            var datetime = new Date();
            revertSaveButton("Saved at " + datetime.getHours() + ":" + (datetime.getMinutes() < 10 ? ("0" + datetime.getMinutes()) : datetime.getMinutes()));
        },
        cancel: function() {
            revertSaveButton("Saving canceled");
        },
        error: function(msg) {
            revertSaveButton("Saving failed!");
        }
    }
    document.getElementById("saveProgress").innerText = "Waiting for Dropbox...";
    Dropbox.save(saveOptions);
}
function editorReady() {
    // This is called several times as resources get loaded
    if (!(unmaskTls.complete && maskTls.complete && nybbles.complete && levels !== undefined)) return;
    document.getElementById("setup").style.display = "none";
    document.getElementById("editControl").style.display = "block";
    document.body.className = ""; // Remove decorative gradients
    if (!isNaN(tryShowLevelId) && (tryShowLevelId in levels)) {
        levelId = parseInt(tryShowLevelId);
    } else {
        levelId = 0;
    }
    lastTileset = -1;
    // Generate the plane control elements
    selTileIdSpans = new Array(3);
    selTileImgs = new Array(3);
    planeStateSpans = new Array(3);
    var editBarDiv = document.getElementById("editbarcontent");
    var editHudDiv = document.getElementById("edithud");
    function createStateSetterFunction(planeId, stateId) {
        return function() { setPlaneState(planeId, stateId); }
    }
    function createTileIdEntryFunction(planeId) {
        return function() { setupIdEntry(planeId); }
    }
    for (var i = 0; i < 3; i++) {
        var planeDiv = document.createElement("div");
        editBarDiv.insertBefore(planeDiv, editHudDiv);
        function insertBr(parent) { parent.appendChild(document.createElement("br")); }
        planeDiv.className = "planeinfo";
        var tilesetLink = document.createElement("a");
        planeDiv.appendChild(tilesetLink);
        tilesetLink.href = "javascript:;";
        tilesetLink.onclick = createLevelLinkClickHandler(-(i + 1));
        tilesetLink.innerText = planeNames[i];
        insertBr(planeDiv);
        var planeStatusDiv = document.createElement("div");
        planeDiv.appendChild(planeStatusDiv);
        planeStatusDiv.className = "planeinforow";
        var planeStateSpan = document.createElement("span");
        planeStateSpans[i] = planeStateSpan;
        planeStatusDiv.appendChild(planeStateSpan);
        var selTileSpan = document.createElement("span");
        selTileSpan.className = "seltileid";
        selTileIdSpans[i] = selTileSpan;
        planeStatusDiv.appendChild(selTileSpan);
        insertBr(planeDiv);
        var selImage = document.createElement("img");
        selImage.width = 64;
        selImage.height = 64;
        selImage.className = "seltileimage";
        selImage.onclick = createTileIdEntryFunction(i);
        selTileImgs[i] = selImage;
        planeDiv.appendChild(selImage);
        var stateCtlDiv = document.createElement("div");
        planeDiv.appendChild(stateCtlDiv);
        stateCtlDiv.className = "planectl";
        for (var state = 0; state < 3; state++) {
            var ctlLink = document.createElement("a");
            stateCtlDiv.appendChild(ctlLink);
            ctlLink.href = "javascript:;";
            ctlLink.onclick = createStateSetterFunction(i, state);
            ctlLink.innerText = ["Edit", "View", "Hide"][state];
            if (state < 2) insertBr(stateCtlDiv);
        }
    }
    // Set up other data and even handlers
    selTiles = [0, 0, 0];
    planeStates = [0, 0, 0];
    for (var i = 0; i < 3; i++) { // Prepare tile caches
        tileCache[i] = new Object();
        setSelTile(i, 0);
        setPlaneState(i, 0);
    }
    tileCounts[0] = (unmaskTls.height / ((unmaskTls.width == 288) ? 16 : 17)) * 18; // Detect number of background tiles
    tileCounts[1] = (maskTls.height / ((maskTls.width == 306) ? 17 : 16)) * 18; // Number of foreground tiles
    tileCounts[2] = 252; // 14 infoplane rows should be enough for anybody
    document.addEventListener("keydown", keyHandler, true);
    canvas = document.getElementById("mainView");
    canvas.addEventListener("mousemove", canvasMovementHandler, true);
    canvas.addEventListener("mouseup", canvasMouseUpHandler, true);
    canvas.addEventListener("contextmenu", function(event) { event.preventDefault(); }, true); // Stop the right-click menu
    updateLevelsList();
    moveToExtantLevel(levelId);
    renderLevel();
}
function gotoLevel(id) {
    scrollPositions[levelId] = { x: document.body.scrollLeft, y: document.body.scrollTop };
    levelId = id;
    var name;
    if (id >= 0) { // It's a real level
        lastLevelId = id;
        name = levels[id].name + " (Level " + id + ")";
    } else if (id > -4) {
        lastTileset = id;
        switch (-id) {
            case 1:
                name = "Background tileset";
                break;
            case 2:
                name = "Foreground tileset";
                break;
            case 3:
                name = "Infoplane tileset";
                break;
        }
    } else {
        name = "Nothing";
    }
    document.getElementById("curLevel").innerText = name;
    document.getElementById("backToLevel").style.display = (id >= 0 || id == -4) ? "none" : "inline";
}
function gotoLevelRerender(id) {
    gotoLevel(id);
    renderLevel();
    var curLevelLastScroll = scrollPositions[id];
    if (curLevelLastScroll) {
        document.body.scrollLeft = curLevelLastScroll.x;
        document.body.scrollTop = curLevelLastScroll.y;
    } else {
        document.body.scrollLeft = 0;
        document.body.scrollTop = 0;
    }
}
function moveToExtantLevel(startingFrom) {
    for (var i = startingFrom; i < 100; i++) { // Try to move to the next level
        if (levels[i] !== undefined) {
            gotoLevelRerender(i);
            return;
        }
    }
    for (var i = startingFrom; i >= 0; i--) { // Try to move to a previous level
        if (levels[i] !== undefined) {
            gotoLevelRerender(i);
            return;
        }
    }
    gotoLevelRerender(-4); // There are no levels
}
function gotoRealLevel() {
    moveToExtantLevel(lastLevelId);
}
function showLevelsList() {
    onlyShow("levelsList");
}
function createLevelLinkClickHandler(id) {
    // Closures and loops don't work well together
    // JavaScript has no block scope, only function scope
    return function () {
        gotoLevelRerender(id);
    }
}
function updateLevelsList() {
    var listDiv = document.getElementById("levelList");
    listDiv.innerHTML = "";
    for (var i = 0; i < 100; i++) {
        if (levels[i] !== undefined) {
            var num = document.createElement("span");
            num.innerText = i.toString() + ": ";
            listDiv.appendChild(num);
            var link = document.createElement("a");
            link.href = "javascript:;";
            link.onclick = createLevelLinkClickHandler(i);
            link.innerText = levels[i].name;
            listDiv.appendChild(link);
            listDiv.appendChild(document.createElement("br"));
        }
    }
}
function carveTile(plane, id) { // Carve a tile out of the tile sheets
    var tempCanvas = document.createElement("canvas");
    tempCanvas.width = 16;
    tempCanvas.height = 16;
    var tempCtx = tempCanvas.getContext("2d");
    var x, y;
    if (plane == 0) { // Background
        if (unmaskTls.width == 288) { // Ungrouted
            y = Math.floor(id / 18) * 16;
            x = (id % 18) * 16;
        } else { // Grouted
            y = 1 + Math.floor(id / 18) * 17;
            x = (id % 18) * 17;
        }
        tempCtx.drawImage(unmaskTls, x, y, 16, 16, 0, 0, 16, 16);
    } else if (plane == 1 || id < 252) { // Foreground, or infoplane icon (14 rows)
        var modkeenMask = false;
        switch (maskTls.width) {
            case 576: // ModKeen (same dimensions as KG no-grout)
                modkeenMask = true;
            case 288: // KeenGraph, no grouting
                y = Math.floor(id / 18) * 16;
                x = (id % 18) * 16;
                break;
            case 306: // KeenGraph, grouted
                y = 1 + Math.floor(id / 18) * 17;
                x = (id % 18) * 17;
                break;
        }
        tempCtx.drawImage(maskTls, x, y, 16, 16, 0, 0, 16, 16);
        var tileDataWrap = tempCtx.getImageData(0, 0, 16, 16);
        var tileData = tileDataWrap.data;
        var pos = 0;
        if (modkeenMask) {
            var maskCanvas = document.createElement("canvas");
            maskCanvas.width = 16;
            maskCanvas.height = 16;
            var maskCtx = maskCanvas.getContext("2d");
            maskCtx.drawImage(maskTls, x + 288, y, 16, 16, 0, 0, 16, 16);
            var maskData = maskCtx.getImageData(0, 0, 16, 16).data;
            for (var y = 0; y < 16; y++) {
                for (var x = 0; x < 16; x++) {
                    if (maskData[pos] != 0) tileData[pos + 3] = 0; // Clear pixel if mask isn't black
                    pos += 4;
                }
            }
        } else {
            for (var y = 0; y < 16; y++) {
                for (var x = 0; x < 16; x++) {
                    if (tileData[pos] == 204 && tileData[pos + 1] == 255 && tileData[pos + 2] == 204) tileData[pos + 3] = 0; // Clear the KeenGraph transparency color
                    pos += 4;
                }
            }
        }
        tempCtx.putImageData(tileDataWrap, 0, 0);
    } else { // Hex composite
        for (var i = 0; i < 4; i++) {
            var nybble = (id >> ((3 - i) * 4)) & 0xF; // Get the i'th digit of the hex value
            tempCtx.drawImage(nybbles, nybble * 8, 0, 8, 8, (i & 1 > 0) ? 8 : 0, (i > 1) ? 8 : 0, 8, 8);
        }
    }
    return tempCanvas;
}
function getCachedTile(plane, id) { // Return a cached tile or carve it out
    if (tileCache[plane][id]) return tileCache[plane][id];
    var tile = carveTile(plane, id);
    tileCache[plane][id] = tile;
    return tile;
}
function renderLevel() {
    onlyShow(canvas.id);
    var ctx = canvas.getContext("2d");
    if (levelId == -4) { // Nothingness (no level, no tileset)
        canvas.style.display = "none";
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else if (levelId >= 0) { // A level
        var level = levels[levelId];
        canvas.width = level.width * 16;
        canvas.height = level.height * 16;
        for (var plane = 0; plane < 3; plane++) {
            if (planeStates[plane] == 2) continue; // Plane is hidden
            for (var y = 0; y < level.height; y++) {
                for (var x = 0; x < level.width; x++) {
                    var tileId = level.planes[plane][x][y];
                    if (plane > 0 && tileId == 0) continue; // Never render foreground tile 0
                    ctx.drawImage(getCachedTile(plane, tileId), x * 16, y * 16);
                }
            }
        }
    } else { // A tileset
        var planeId = (-levelId) - 1;
        canvas.width = 18 * 16;
        canvas.height = (tileCounts[planeId] / 18) * 16;
        for (var i = 0; i < tileCounts[planeId]; i++) {
            if (planeId > 0 && i == 0) continue; // Fore tile 0 is always blank
            ctx.drawImage(getCachedTile(planeId, i), (i % 18) * 16, Math.floor(i / 18) * 16);
        }
    }
}
function updateTileImageInLevel(x, y) {
    var ctx = canvas.getContext("2d");
    ctx.clearRect(x * 16, y * 16, 16, 16); // In case background is hidden
    for (var i = 0; i < 3; i++) {
        if (planeStates[i] == 2) continue;
        var tileId = levels[levelId].planes[i][x][y];
        if (i > 0 && tileId == 0) continue;
        ctx.drawImage(getCachedTile(i, tileId), x * 16, y * 16);
    }
}
function setPlaneState(plane, state) {
    var oldState = planeStates[plane];
    planeStates[plane] = state;
    planeStateSpans[plane].innerText = ["Editable", "Visible", "Hidden"][state];
    if ((oldState == 2) != (state == 2)) renderLevel(); // Only re-render if the hidden-ness changed
}
function setSelTile(plane, id) {
    selTiles[plane] = id;
    var hexTileId = id.toString(16);
    selTileIdSpans[plane].innerText = ("0000" + hexTileId).substr(hexTileId.length, 4).toUpperCase();
    selTileImgs[plane].src = getCachedTile(plane, id).toDataURL();
}
function keyHandler(event) {
    var handled = true;
    var togglePlaneState = function(plane, fullHide) {
        if (levelId < 0 && levelId != -4) { // Goto a tileset if using a tileset
            gotoLevelRerender(-(plane + 1));
            return;
        }
        if (fullHide) {
            setPlaneState(plane, (planeStates[plane] == 2) ? 0 : 2);
        } else {
            setPlaneState(plane, (planeStates[plane] == 0) ? 1 : 0);
        }
    }
    if (canvas.style.display !== "none") {
        // Only control plane state if showing the level
        switch (event.keyCode) {
            case 49: // 1
                togglePlaneState(0, false); break;
            case 50: // 2
                togglePlaneState(1, false); break;
            case 51: // 3
                togglePlaneState(2, false); break;
            case 52: // 4
                togglePlaneState(0, true); break;
            case 53: // 5
                togglePlaneState(1, true); break;
            case 54: // 6
                togglePlaneState(2, true); break;
            case 55: // 7
                gotoLevelRerender(-1); break;
            case 56: // 8
                gotoLevelRerender(-2); break;
            case 57: // 9
                gotoLevelRerender(-3); break;
            default:
                handled = false;
        }
        if (handled) {
            event.preventDefault();
            return;
        }
    }
    handled = true;
    switch (event.keyCode) {
        case 32: // Space
            if (levelId < 0) {
                gotoRealLevel();
            } else {
                gotoLevelRerender(lastTileset);
            }
            break;
        case 27: // Esc
            gotoRealLevel(); break;
        case 192: // ~
            showLevelsList(); break;
        case 33: // PageUp
            for (var i = levelId - 1; i >= 0; i--) {
                if (levels[i] !== undefined) {
                    gotoLevelRerender(i);
                    break;
                }
            }
            break;
        case 34: // PageDown
            for (var i = levelId + 1; i < 100; i++) {
                if (levels[i] !== undefined) {
                    gotoLevelRerender(i);
                    break;
                }
            }
            break;
        default:
            handled = false;
    }
    if (handled) event.preventDefault();
}
function mouseHappened(clientX, clientY, button) {
    // Button: 0 for none/other, 1 for left, 2 for right
    var x = Math.floor((clientX + document.body.scrollLeft + document.documentElement.scrollLeft - Math.floor(canvas.offsetLeft)) / 16);
    var y = Math.floor((clientY + document.body.scrollTop + document.documentElement.scrollTop - Math.floor(canvas.offsetTop) + 1) / 16);
    if (levelId >= 0) {
        if (button == 1) {
            for (var i = 0; i < 3; i++) {
                if (planeStates[i] == 0) levels[levelId].planes[i][x][y] = selTiles[i];
            }
            updateTileImageInLevel(x, y);
        } else if (button == 2) {
            for (var i = 0; i < 3; i++) {
                if (planeStates[i] == 0) setSelTile(i, levels[levelId].planes[i][x][y]);
            }
        }
    } else if (levelId > -4) {
        if (button > 0) {
            var tileId = (y * 18) + x;
            setSelTile(-(levelId + 1), tileId);
        }
    }
}
function canvasMovementHandler(event) {
    var buttonId;
    if ((event.buttons & 1) > 0) {
        buttonId = 1;
    } else if ((event.buttons & 2) > 0) {
        buttonId = 2;
    } else {
        buttonId = 0;
    }
    mouseHappened(event.clientX, event.clientY, buttonId);
}
function canvasMouseUpHandler(event) {
    // Mouse up events seem to have different values for "buttons" than movement events
    // Isn't JavaScript great?
    var buttonId;
    if (event.button == 0) {
        buttonId = 1;
    } else if (event.button == 2) {
        buttonId = 2;
    } else {
        return;
    }
    mouseHappened(event.clientX, event.clientY, buttonId);
}
function onlyShow(element) {
    // Hide all editor elements except the one with the ID specified
    var editAreaContentDiv = document.getElementById("editareacontent");
    for (var i = 0; i < editAreaContentDiv.children.length; i++) {
        var child = editAreaContentDiv.children[i];
        child.style.display = (child.id === element ? "block" : "none");
    }
}
function setupIdEntry(plane) {
    document.getElementById("idEntryPlane").innerText = planeNames[plane];
    idEntryPlane = plane;
    updateTileIdEntryBox(selTiles[plane]);
    onlyShow("idEntry");
    document.getElementById("newtileId").focus();
}
function isTileIdEntryHex() {
   return document.getElementById("checkNewIdIsHex").checked;
}
function updateTileIdEntryBox(tileId) {
    document.getElementById("newtileId").value = tileId.toString(isTileIdEntryHex() ? 16 : 10);
}
function getEnteredTileIdAssumingBase(isHex) {
    return parseInt(document.getElementById("newtileId").value, isHex ? 16 : 10);
}
function getEnteredTileId() {
    return getEnteredTileIdAssumingBase(isTileIdEntryHex());
}
function toggleIdEntryHex() {
    updateTileIdEntryBox(getEnteredTileIdAssumingBase(!isTileIdEntryHex()));
    document.getElementById("newtileId").pattern = (isTileIdEntryHex() ? "[a-fA-F\d]*" : "\d*");
}
function completeTileIdEntry() {
    var tileId = getEnteredTileId();
    if (tileId >= 0 && tileId < 0x10000) {
        setSelTile(idEntryPlane, tileId);
        onlyShow(canvas.id);
    }
}