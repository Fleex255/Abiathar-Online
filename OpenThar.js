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
    Dropbox.choose({
        success: function(files) {
            gamemaps = files[0];
            document.getElementById("resGamemaps").innerText = gamemaps.name;
        },
        cancel: function() {},
        linkType: "direct",
        multiselect: false
    });
}
function pickMaphead() {
    Dropbox.choose({
        success: function(files) {
            maphead = files[0];
            document.getElementById("resMaphead").innerText = maphead.name;
        },
        cancel: function() {},
        linkType: "direct",
        multiselect: false
    });
}
function pickBacktils() {
    Dropbox.choose({
        success: function(files) {
            backtils = files[0];
            document.getElementById("resBacktils").innerText = backtils.name;
        },
        cancel: function() {},
        linkType: "direct",
        multiselect: false
    });
}
function pickForetils() {
    Dropbox.choose({
        success: function (files) {
            foretils = files[0];
            document.getElementById("resForetils").innerText = foretils.name;
        },
        cancel: function() {},
        linkType: "direct",
        multiselect: false
    });
}
function confirmSetup() {
    if (gamemaps !== undefined && maphead !== undefined && backtils !== undefined && foretils !== undefined) {
        // TODO: Actual editor setup and canvas stuff
    }
}