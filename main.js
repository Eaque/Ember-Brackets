/*jslint vars: true, plusplus: true, devel: true, eqeq: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, CodeMirror */

/** Simple extension that adds support for Emberjs developpment */
define(function (require, exports, module) {
    "use strict";
    
    // Brackets modules
    var LanguageManager = brackets.getModule("language/LanguageManager"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils");
    
    // Define a new scriptType to handle "x-handlebars" scripts
    CodeMirror.defineMIME("text/x-brackets-html", {
        "name": "htmlmixed",
        "scriptTypes": [{"matches": /\/x-handlebars/i, "mode": null}]
    });
    
    CodeMirror.overlayMode = CodeMirror.overlayParser = function (base, overlay, combine) {
        return {
            startState: function () {
                return {
                    base: CodeMirror.startState(base),
                    overlay: CodeMirror.startState(overlay),
                    basePos: 0,
                    baseCur: null,
                    overlayPos: 0,
                    overlayCur: null
                };
            },
            copyState: function (state) {
                return {
                    base: CodeMirror.copyState(base, state.base),
                    overlay: CodeMirror.copyState(overlay, state.overlay),
                    basePos: state.basePos,
                    baseCur: null,
                    overlayPos: state.overlayPos,
                    overlayCur: null
                };
            },
            
            token: function (stream, state) {
                if (stream.start == state.basePos) {
                    state.baseCur = base.token(stream, state.base);
                    state.basePos = stream.pos;
                }
                if (stream.start == state.overlayPos) {
                    stream.pos = stream.start;
                    state.overlayCur = overlay.token(stream, state.overlay);
                    state.overlayPos = stream.pos;
                }
                stream.pos = Math.min(state.basePos, state.overlayPos);
                if (stream.eol()) {
                    state.basePos = state.overlayPos = 0;
                }
                
                if (state.overlayCur == null) {
                    return state.baseCur;
                }
                
                if (state.baseCur != null && combine) {
                    return state.baseCur + " " + state.overlayCur;
                } else {
                    return state.overlayCur;
                }
            },
            
            indent: base.indent && function (state, textAfter) {
                return base.indent(state.base, textAfter);
            },
            electricChars: base.electricChars,
            
            innerMode: function (state) { return {state: state.base, mode: base}; },
            
            blankLine: function (state) {
                if (base.blankLine) {
                    base.blankLine(state.base);
                }
                if (overlay.blankLine) {
                    overlay.blankLine(state.overlay);
                }
            }
        };
    };
    
    CodeMirror.defineMode("mustache", function (config, parserConfig) {
        var inMustache = false,
            isString = false;
        
        var mustacheOverlay = {
            token: function (stream, state) {
                var ch;
                if (stream.match("{{") || inMustache) {
                    inMustache = true;
                    while ((ch = stream.next()) != null) {
                        if (ch == "}") {
                            if (stream.next() == "}") {
                                inMustache = false;
                                break;
                            }
                        } else if (stream.peek() == "\"") {
                            var ret = null;
                            if (!isString) {
                                ret = "mustache";
                            } else {
                                stream.next();
                            }
                            isString = !isString;
                            return ret;
                        }
                    }
                    stream.eat("}");
                    return "mustache";
                }
                while (stream.next() != null && !stream.match("{{", false)) {
                    //do nothing
                }
                
                return null;
            }
        };
        return CodeMirror.overlayMode(CodeMirror.getMode(config, parserConfig.backdrop || "text/x-brackets-html"), mustacheOverlay);
    });
    
    // Redefine the mode used by the html language
    LanguageManager.getLanguage("html")._loadAndSetMode("mustache");
    
    // Load the theme stylesheet
    ExtensionUtils.loadStyleSheet(module, "ember.css");
});