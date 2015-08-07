// Global (well, persisted while viewing editor.html) variables
var gamemaps, maphead, backtils, foretils; // Editor resources

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
}
function setupEasy() {
    resetResources();
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
        cancel: function() {},
        linkType: "direct",
        multiselect: true
    }
    Dropbox.choose(options);
}