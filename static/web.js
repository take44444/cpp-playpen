(function () {
    "use strict";

    function optionalLocalStorageGetItem(key) {
        try {
            return localStorage.getItem(key);
        } catch(e) {
            return null;
        }
    }

    function optionalLocalStorageSetItem(key, value) {
        try {
            window.localStorage.setItem(key, value);
        } catch(e) {
            // ignore
        }
    }

    function build_themes(themelist) {
        // Load all ace themes, sorted by their proper name.
        var themes = themelist.themes;
        themes.sort(function (a, b) {
            if (a.caption < b.caption) {
                return -1;
            } else if (a.caption > b.caption) {
                return 1;
            }
            return 0;
        });

        var themeopt,
            themefrag = document.createDocumentFragment();
        for (var i=0; i < themes.length; i++) {
            themeopt = document.createElement("option");
            themeopt.setAttribute("val", themes[i].theme);
            themeopt.textContent = themes[i].caption;
            themefrag.appendChild(themeopt);
        }
        document.getElementById("themes").appendChild(themefrag);
    }

    function send(path, data, callback, button, message, result) {
        button.disabled = true;

        set_result(result, "<p class=message>" + message);

        var request = new XMLHttpRequest();
        request.open("POST", "/" + path, true);
        request.setRequestHeader("Content-Type", "application/json");
        request.onreadystatechange = function() {
            button.disabled = false;
            if (request.readyState == 4) {
                var json;

                try {
                    json = JSON.parse(request.response);
                } catch (e) {
                    console.log("JSON.parse(): " + e);
                }

                if (request.status == 200) {
                    callback(json);
                } else if (request.status === 0) {
                    set_result(result, "<p class=error>Connection failure" +
                        "<p class=error-explanation>Are you connected to the Internet?");
                } else {
                    set_result(result, "<p class=error>Something went wrong" +
                        "<p class=error-explanation>The HTTP request produced a response with status code " + request.status + ".");
                }
            }
        };
        request.timeout = 10000;
        request.ontimeout = function() {
            set_result(result, "<p class=error>Connection timed out" +
                "<p class=error-explanation>Are you connected to the Internet?");
        };
        request.send(JSON.stringify(data));
    }

    function evaluate(result, code, button) {
        send("evaluate.json", {code: code},
            function(object) {
                var samp, pre;
                set_result(result);
                if (object.gpp) {
                    samp = document.createElement("samp");
                    samp.innerHTML = object.gpp;
                    pre = document.createElement("pre");
                    pre.className = "gpp-output " + (("program" in object) ? "gpp-warnings" : "gpp-errors");
                    pre.appendChild(samp);
                    result.appendChild(pre);
                }

                var div = document.createElement("p");
                div.className = "message";
                if ("program" in object) {
                    samp = document.createElement("samp");
                    samp.className = "output";
                    samp.innerHTML = object.program;
                    pre = document.createElement("pre");
                    pre.appendChild(samp);
                    result.appendChild(pre);
                    if (test) {
                        div = null;
                    } else {
                        div.textContent = "Program ended.";
                    }
                } else {
                    div.textContent = "Compilation failed.";
                }
                if (div) {
                    result.appendChild(div);
                }
        }, button, "Running…", result);
    }

    function httpRequest(method, url, data, expect, on_success, on_fail) {
        var req = new XMLHttpRequest();

        req.open(method, url, true);
        req.onreadystatechange = function() {
            if (req.readyState == XMLHttpRequest.DONE) {
                if (req.status == expect) {
                    if (on_success) {
                        on_success(req.responseText);
                    }
                } else {
                    if (on_fail) {
                        on_fail(req.status, req.responseText);
                    }
                }
            }
        };

        if (method === "GET") {
            req.send();
        } else if (method === "POST") {
            req.send(data);
        }
    }

    function repaintResult() {
        // Sadly the fun letter-spacing animation can leave artefacts in at
        // least Firefox, so we want to manually trigger a repaint. It doesn’t
        // matter whether it’s relative or static for now, so we’ll flip that.
        result.parentNode.style.visibility = "hidden";
        var _ = result.parentNode.offsetHeight;  // This empty assignment is intentional
        result.parentNode.style.visibility = "";
    }

    function share(result, code, button) {
        var playurl = location.href + "?code=" + encodeURIComponent(code);
        if (playurl.length > 5000) {
            set_result(result, "<p class=error>Sorry, your code is too long to share this way." +
                "<p class=error-explanation>At present, sharing produces a link containing the" +
                " code in the URL, and the URL shortener used doesn’t accept URLs longer than" +
                " <strong>5000</strong> characters. Your code results in a link that is <strong>" +
                playurl.length + "</strong> characters long. Try shortening your code.");
            return;
        }

        var url = "https://is.gd/create.php?format=json&url=" + encodeURIComponent(playurl);

        button.disabled = true;

        set_result(result, "<p>Shared link: ");
        var link = document.createElement("a");
        link.href = link.textContent = playurl;
        link.className = "shortening-link";
        result.firstChild.appendChild(link);


        var repainter = setInterval(repaintResult, 50);
        httpRequest("GET", url, null, 200,
                    function(response) {
                        clearInterval(repainter);
                        button.disabled = false;

                        var link = result.firstChild.firstElementChild;
                        link.className = "";
                        link.href = link.textContent = JSON.parse(response).shorturl;

                        repaintResult();
                    },
                    function(status, response) {
                        clearInterval(repainter);
                        button.disabled = false;

                        if (request.status === 0) {
                            set_result(result, "<p class=error>Connection failure" +
                                "<p class=error-explanation>Are you connected to the Internet?");
                        } else {
                            set_result(result, "<p class=error>Something went wrong" +
                                "<p class=error-explanation>The HTTP request produced a response with status code " + status + ".");
                        }

                        repaintResult();
                    }
        );
    }

    function getQueryParameters() {
        var a = window.location.search.substr(1).split('&');
        if (a === "") return {};
        var b = {};
        for (var i = 0; i < a.length; i++) {
            var p = a[i].split('=');
            if (p.length != 2) continue;
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
        }
        return b;
    }

    function clear_result(result) {
        result.innerHTML = "";
        result.parentNode.setAttribute("data-empty", "");
        set_result.editor.resize();
    }

    function set_result(result, contents) {
        result.parentNode.removeAttribute("data-empty");
        if (contents === undefined) {
            result.textContent = "";
        } else if (typeof contents == "string") {
            result.innerHTML = contents;
        } else {
            result.textContent = "";
            result.appendChild(contents);
        }
        set_result.editor.resize();
    }

    function set_keyboard(editor, mode) {
        if (mode == "Emacs") {
            editor.setKeyboardHandler("ace/keyboard/emacs");
        } else if (mode == "Vim") {
            editor.setKeyboardHandler("ace/keyboard/vim");
            if (!set_keyboard.vim_set_up) {
                ace.config.loadModule("ace/keyboard/vim", function(m) {
                    var Vim = ace.require("ace/keyboard/vim").CodeMirror.Vim;
                    Vim.defineEx("write", "w", function(cm, input) {
                        cm.ace.execCommand("evaluate");
                    });
                });
            }
            set_keyboard.vim_set_up = true;
        } else {
            editor.setKeyboardHandler(null);
        }
    }

    function set_theme(editor, themelist, theme) {
        var themes = document.getElementById("themes");
        var themepath = null,
            i = 0,
            themelen = themelist.themes.length,
            selected = themes.options[themes.selectedIndex];
        if (selected.textContent === theme) {
            themepath = selected.getAttribute("val");
        } else {
            for (i; i < themelen; i++) {
                if (themelist.themes[i].caption == theme) {
                    themes.selectedIndex = i;
                    themepath = themelist.themes[i].theme;
                    break;
                }
            }
        }
        if (themepath !== null) {
            editor.setTheme(themepath);
            optionalLocalStorageSetItem("theme", theme);
        }
    }

    var evaluateButton;
    var shareButton;
    var configureEditorButton;
    var result;
    var clearResultButton;
    var keyboard;
    var themes;
    var editor;
    var session;
    var themelist;
    var theme;
    var mode;
    var query;

    var COLOR_CODES = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];

    // A simple function to decode ANSI escape codes into HTML.
    // This is very basic, with lots of very obvious omissions and holes;
    // it’s designed purely to cope with rustc output.
    //
    // TERM=xterm rustc uses these:
    //
    // - bug/fatal/error = red
    // - warning = yellow
    // - note = green
    // - help = cyan
    // - error code = magenta
    // - bold
    function ansi2html(text) {
        return text.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\x1b\[1m\x1b\[3([0-7])m([^\x1b]*)(?:\x1b\(B)?\x1b\[0?m/g, function(original, colorCode, text) {
                return '<span class=ansi-' + COLOR_CODES[+colorCode] + '><strong>' + text + '</strong></span>';
            }).replace(/\x1b\[3([0-7])m([^\x1b]*)(?:\x1b\(B)?\x1b\[0?m/g, function(original, colorCode, text) {
                return '<span class=ansi-' + COLOR_CODES[+colorCode] + '>' + text + '</span>';
            }).replace(/\x1b\[1m([^\x1b]*)(?:\x1b\(B)?\x1b\[0?m/g, function(original, text) {
                return "<strong>" + text + "</strong>";
            }).replace(/(?:\x1b\(B)?\x1b\[0?m/g, '');
    }

    addEventListener("DOMContentLoaded", function() {
        evaluateButton = document.getElementById("evaluate");
        shareButton = document.getElementById("share");
        configureEditorButton = document.getElementById("configure-editor");
        result = document.getElementById("result").firstChild;
        clearResultButton = document.getElementById("clear-result");
        keyboard = document.getElementById("keyboard");
        themes = document.getElementById("themes");
        editor = ace.edit("editor");
        set_result.editor = editor;
        editor.$blockScrolling = Infinity;
        editor.setAnimatedScroll(true);
        session = editor.getSession();
        themelist = ace.require("ace/ext/themelist");

        editor.focus();

        build_themes(themelist);

        editor.renderer.on('themeChange', function(e) {
            var path = e.theme;
            ace.config.loadModule(['theme', e.theme], function(t) {
                document.getElementById("result").className = t.cssClass + (t.isDark ? " ace_dark" : "");
            });
        });

        theme = optionalLocalStorageGetItem("theme");
        if (theme === null) {
            set_theme(editor, themelist, "GitHub");
        } else {
            set_theme(editor, themelist, theme);
        }

        session.setMode("ace/mode/c_cpp"); // https://ace.c9.io/build/kitchen-sink.html

        mode = optionalLocalStorageGetItem("keyboard");
        if (mode !== null) {
            set_keyboard(editor, mode);
            keyboard.value = mode;
        }

        query = getQueryParameters();
        if ("code" in query) {
            session.setValue(query.code);
        } else {
            var code = optionalLocalStorageGetItem("code");
            if (code !== null) {
                session.setValue(code);
            }
        }

        addEventListener("resize", function() {
            editor.resize();
        });

        //This helps re-focus editor after a Run or any other action that caused
        //editor to lose focus. Just press Enter or Esc key to focus editor.
        //Without this, you'd most likely have to LMB somewhere in the editor
        //area which would change the location of its cursor to where you clicked.
        addEventListener("keyup", function(e) {
            if ((document.body == document.activeElement) && //needed to avoid when editor has focus already
                (13 == e.keyCode || 27 == e.keyCode)) { //Enter or Escape keys
                editor.focus();
            }
        });

        session.on("change", function() {
            var code = session.getValue();
            optionalLocalStorageSetItem("code", code);
        });

        keyboard.onkeyup = keyboard.onchange = function() {
            var mode = keyboard.options[keyboard.selectedIndex].value;
            optionalLocalStorageSetItem("keyboard", mode);
            set_keyboard(editor, mode);
        };

        evaluateButton.onclick = function() {
            evaluate(result, session.getValue(), evaluateButton);
            editor.focus();
        };

        editor.commands.addCommand({
            name: "evaluate",
            exec: evaluateButton.onclick,
            bindKey: {win: "Ctrl-Enter", mac: "Ctrl-Enter"}
        });

        // We’re all pretty much agreed that such an obscure command as transposing
        // letters hogging Ctrl-T, normally “open new tab”, is a bad thing.
        var transposeletters = editor.commands.commands.transposeletters;
        editor.commands.removeCommand("transposeletters");
        delete transposeletters.bindKey;
        editor.commands.addCommand(transposeletters);

        shareButton.onclick = function() {
            share(result, session.getValue(), shareButton);
        };

        configureEditorButton.onclick = function() {
            var dropdown = configureEditorButton.nextElementSibling;
            dropdown.style.display = dropdown.style.display ? "" : "block";
        };

        clearResultButton.onclick = function() {
            clear_result(result);
        };

        themes.onkeyup = themes.onchange = function () {
            set_theme(editor, themelist, themes.options[themes.selectedIndex].text);
        };

    }, false);
}());


// called via javascript:fn events from formatCompilerOutput
var old_range;

function editorGet() {
    return window.ace.edit("editor");
}

function editGo(r1,c1) {
    var e = editorGet();
    old_range = undefined;
    e.focus();
    e.selection.clearSelection();
    e.scrollToLine(r1-1, true, true);
    e.selection.moveCursorTo(r1-1, c1-1, false);
}

function editRestore() {
    if (old_range) {
        var e = editorGet();
        e.selection.setSelectionRange(old_range, false);
        var mid = (e.getFirstVisibleRow() + e.getLastVisibleRow()) / 2;
        var intmid = Math.round(mid);
        var extra = (intmid - mid)*2 + 2;
        var up = e.getFirstVisibleRow() - old_range.start.row + extra;
        var down = old_range.end.row - e.getLastVisibleRow() + extra;
        if (up > 0) {
            e.scrollToLine(mid - up, true, true);
        } else if (down > 0) {
            e.scrollToLine(mid + down, true, true);
        } // else visible enough
    }
}

function editShowRegion(r1,c1, r2,c2) {
    var e = editorGet();
    var es = e.selection;
    old_range = es.getRange();
    es.clearSelection();
    e.scrollToLine(Math.round((r1 + r2) / 2), true, true);
    es.setSelectionAnchor(r1-1, c1-1);
    es.selectTo(r2-1, c2-1);
}

function editShowLine(r1) {
    var e = editorGet();
    var es = e.selection;
    old_range = es.getRange();
    es.clearSelection();
    e.scrollToLine(r1, true, true);
    es.moveCursorTo(r1-1, 0);
    es.moveCursorLineEnd();
    es.selectTo(r1-1, 0);
}

function editShowPoint(r1,c1) {
    var e = editorGet();
    var es = e.selection;
    old_range = es.getRange();
    es.clearSelection();
    e.scrollToLine(r1, true, true);
    es.moveCursorTo(r1-1, 0);
    es.moveCursorLineEnd();
    es.selectTo(r1-1, c1-1);
}
