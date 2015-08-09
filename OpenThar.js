// Global (well, persisted while viewing editor.html) variables
var gamemaps, maphead, backtils, foretils; // Editor resources meta from Dropbox
var unmaskTls, maskTls; // Image instances
var xhrGamemaps, xhrMaphead;
var levels; // Array(100) of levels

// Functions and event handlers and other exciting stuff
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
        document.getElementById("setupControl").style.display = "none";
        setupResponse("OK!", "Loading resources, please wait...");
        xhrGamemaps = new XMLHttpRequest();
        xhrGamemaps.open("GET", gamemaps.link, true);
        xhrGamemaps.responseType = "arraybuffer";
        xhrGamemaps.onload = levelResReady;
        xhrGamemaps.send(null);
        xhrMaphead = new XMLHttpRequest();
        xhrMaphead.open("GET", maphead.link, true);
        xhrMaphead.responseType = "arraybuffer";
        xhrMaphead.onload = levelResReady;
        xhrMaphead.send(null);
        unmaskTls = new Image;
        unmaskTls.onload = editorReady;
        unmaskTls.src = backtils.link;
        maskTls = new Image;
        maskTls.onload = editorReady;
        maskTls.src = foretils.link;
    }
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
function editorReady() {
    // This is called several times as resources get loaded
    if (!(unmaskTls.complete && maskTls.complete && levels !== undefined)) return;
    setupResponse("Done!", "TODO: an actual editor");
    
}