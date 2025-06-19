"use strict";
/**
 * Core data models for AINodes TypeScript implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkType = exports.LinkType = void 0;
var LinkType;
(function (LinkType) {
    LinkType["WIKI"] = "wiki";
    LinkType["MARKDOWN"] = "markdown"; // [text](file.md)
})(LinkType || (exports.LinkType = LinkType = {}));
var ChunkType;
(function (ChunkType) {
    ChunkType["TITLE"] = "title";
    ChunkType["HEADING_SECTION"] = "heading";
    ChunkType["PARAGRAPH"] = "paragraph"; // Natural paragraph break
})(ChunkType || (exports.ChunkType = ChunkType = {}));
//# sourceMappingURL=types.js.map