import { isPromise } from "./utils";
import { buildQueryString } from "mithril";
import interpolate from "./interpolate";
import { Context } from "./Context";

export interface RequestDetails {
	method: string;
	url: string;
	headers: any;
	body: string;
}

export async function extractRequest(lines: string[], runLineNum: number, context: Context)
	: Promise<null | RequestDetails> {

	const structure = computeStructure(lines);

	let isInScript = false;
	const scriptLines: string[] = [];
	let startLine = 0;
	let pageContentStarted = false;

	for (let lNum = 0; lNum < runLineNum; ++lNum) {
		const line = lines[lNum];
		if (line === "### javascript") {
			isInScript = true;

		} else if (line.startsWith("###")) {
			isInScript = false;
			startLine = lNum + 1;
			pageContentStarted = false;
			const fn = new Function(scriptLines.join("\n"));
			scriptLines.splice(0, scriptLines.length);
			// The following may be used in the script, so ensure they exist, and are marked as used for the sanity
			// Of IDE and TypeScript.
			if (!context.run || !context.on || !context.off) {
				console.error("Not all of the required context interface functions are available.");
			}
			const returnValue = fn.call(context);
			if (isPromise(returnValue)) {
				await returnValue;
			}

		} else if (isInScript) {
			scriptLines.push(line);

		} else if (!pageContentStarted && (line.startsWith("#") || line === "")) {
			startLine = lNum + 1;

		} else if (!pageContentStarted) {
			pageContentStarted = true;

		}
	}

	if (isInScript) {
		alert("Script block started above, not ended above.");
		return null;
	}

	const bodyLines: string[] = [];
	const details = {
		method: "GET",
		url: "",
		body: "",
		headers: new Headers(),
	};

	let isInBody = false;
	const headerLines: string[] = [];
	let headersStarted = false;
	const queryParams: string[] = [];

	while (lines[startLine] === "") {
		++startLine;
	}

	for (let lNum = startLine; lNum < lines.length; ++lNum) {
		const lineText: string = lines[lNum];
		if (lineText.startsWith("###")) {
			break;
		}

		if (isInBody) {
			bodyLines.push(lineText);

		} else if (lineText === "") {
			isInBody = true;

		} else if (!lineText.startsWith("#")) {
			if (!headersStarted && lineText.match(/^\s/)) {
				queryParams.push(lineText.replace(/^\s+/, ""));
			} else {
				headersStarted = true;
				headerLines.push(lineText);
			}

		}
	}

	// Const renderedLines = Mustache.render(headerLines.join("\n"), context.data).split("\n");
	const renderedLines = interpolate(headerLines.join("\n"), context).split("\n");
	const [method, ...urlParts] = renderedLines[0].split(/\s+/);
	details.method = method.toUpperCase();
	details.url = urlParts.join(" ");
	for (const rLine of renderedLines.slice(1)) {
		const [name, ...valueParts] = rLine.split(/:\s*/);
		if (name === "") {
			throw new Error("Header name cannot be blank.");
		}
		details.headers.append(name, valueParts.join(":"));
	}

	if (queryParams.length > 0) {
		const paramsObject = {};
		for (const param of queryParams) {
			const parts = param.split("=");
			paramsObject[parts[0]] = parts.length > 1 ? parts.slice(1).join("=") : "";
		}
		details.url += (details.url.includes("?") ? "&" : "?") + buildQueryString(paramsObject);
	}

	if (bodyLines.length > 0) {
		if (bodyLines[0].startsWith("=")) {
			// Replace that `=` with `return` and we assume what followed that `=` is a single JS expression.
			const code = "return " + bodyLines[0].substr(1) + "\n" + bodyLines.slice(1).join("\n");
			const body = new Function(code).call(context);
			if (typeof body === "string") {
				details.body = body;
			} else {
				details.body = JSON.stringify(body);
			}

		} else {
			details.body = bodyLines.join("\n");

		}

		details.body = details.body.trim();
	}

	return details;
}

export enum BlockType {
	PAGE,
	PREAMBLE,
	PREAMBLE_ENDED,
	BODY,
}

export interface Block {
	start: number;
	end: number;
	type: BlockType;
}

export function computeStructure(input: string[] | string): Block[] {
	const lines: string[] = typeof input === "string" ? input.split("\n") : input;

	const structure: Block[] = [];

	let type: BlockType = BlockType.PAGE;
	let pageStart = 0;
	let typeStart: number | null = null;
	let lastNonBlank = -1;

	for (const [index, line] of lines.entries()) {
		const hasText = line.trim() !== "";

		if (line.startsWith("###")) {
			if (typeStart != null) {
				structure.push({ start: typeStart, end: lastNonBlank, type });
				typeStart = null;
			}
			type = BlockType.PAGE;
			if (lastNonBlank >= 0) {
				structure.push({ start: pageStart, end: lastNonBlank, type });
			}
			pageStart = index;

		} else if (line.startsWith("#") && type !== BlockType.BODY) {
			// This is a comment line. Just ignore.

		} else if (!hasText) {
			if (type === BlockType.PREAMBLE) {
				structure.push({ start: typeStart as number, end: lastNonBlank, type });
				typeStart = null;
				type = BlockType.PREAMBLE_ENDED;
			}

		} else if (hasText) {
			if (type === BlockType.PAGE) {
				type = BlockType.PREAMBLE;  // Preamble is the URL+Headers part of an HTTP request.
				typeStart = index;
			} else if (type === BlockType.PREAMBLE_ENDED) {
				type = BlockType.BODY;
				typeStart = index;
			}

		}

		if (hasText) {
			lastNonBlank = index;
		}
	}

	if (typeStart != null) {
		structure.push({ start: typeStart, end: lastNonBlank, type });
	}

	return structure;
}
