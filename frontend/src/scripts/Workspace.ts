import HttpSession from "./HttpSession"
import type { AnyResult } from "./HttpSession"
import m from "mithril"
import CodeMirror from "./codemirror"
import { BlockType, parse } from "./Parser"
import CookieJar from "./CookieJar"
import { proxyUrl } from "./Env"
import { currentProviders, currentSheet, currentSheetName, Provider, saveSheet, Sheet, Source } from "./Persistence"
import Stream from "mithril/stream"
import throttle from "lodash/throttle"
import FileBucket from "./FileBucket"
import type { RequestDetails } from "./Parser"
import { extractRequest } from "./Parser"
import { Context, makeContext } from "./Context"

const DEFAULT_EDITOR_CONTENT = `# Welcome to Prestige! Your newest developer tool!
# Just enter the HTTP requests you want to make and hit Ctrl+Enter (or Cmd+Enter) to execute.
# Like this one right here:

GET http://httpbun.com/get?name=haha

###

# Lines starting with a single '#' like this are comments.
# Learn more about the syntax at ${window.location.origin}/docs/guides/syntax/.
# Let's make a POST request!

POST http://httpbun.com/post
Content-Type: application/x-www-form-urlencoded

username=sherlock&password=elementary

###

# Custom headers, easy as popcorn.
# Learn more at ${window.location.origin}/docs/guides/syntax/#header-section.

GET http://httpbun.com/headers
X-Custom1: custom header value one
X-Custom2: custom header value two

### javascript

// This is a Javascript block, so comments start with '//'.
// The following will be available for templating in requests *after* this Javascript block.
// Learn more at ${window.location.origin}/docs/guides/javascript-blocks/.
this.data.postUrl = "post"

###

# Let's use templates to make the same POST request as before!
# Learn more at: ${window.location.origin}/docs/guides/templating/.
POST http://httpbun.com/dollar{postUrl}
Content-Type: application/x-www-form-urlencoded

username=sherlock&password=elementary
`.replace(/\bdollar\{/g, "${")

export default class Workspace {
	codeMirror: null | CodeMirror.Editor
	private _content: string
	private _lines: null | string[]
	private prevExecuteBookmark: null | CodeMirror.TextMarker
	session: HttpSession
	defaultProxy: null | string
	fileBucket: FileBucket
	private flashQueue: any[]
	private widgetMarks: CodeMirror.TextMarker[]
	currentSheet: null | Sheet
	currentSheetQualifiedPath: Stream<string>
	private _disableAutoSave: boolean
	isChangesSaved: boolean
	exportingRequest: null | RequestDetails

	constructor() {
		this.codeMirror = null
		this._content = ""
		this._lines = null
		this.prevExecuteBookmark = null
		this.fileBucket = new FileBucket()
		this.session = new HttpSession()
		this.defaultProxy = proxyUrl()
		this.flashQueue = []
		this.widgetMarks = []
		this.currentSheet = null
		this.currentSheetQualifiedPath = Stream()
		this._disableAutoSave = false
		this.isChangesSaved = true
		this.exportingRequest = null

		Stream.lift<[string, Provider<Source>[]], void>((qualifiedPath: string) => {
			this.loadSheet(qualifiedPath)
				.catch((e) => {
					console.error("Error in loadSheet", e)
				})
		}, this.currentSheetQualifiedPath, currentProviders)

		this.runAgain = this.runAgain.bind(this)
		this.doExecute = this.doExecute.bind(this)
		this.onNewClicked = this.onNewClicked.bind(this)
		this.onDuplicateClicked = this.onDuplicateClicked.bind(this)
		this.onExportClicked = this.onExportClicked.bind(this)
		this.onPrettifyClicked = this.onPrettifyClicked.bind(this)
		this.saveChanges = throttle(this.saveChanges.bind(this), 3000, { trailing: true })

		currentSheet.map((value) => {
			this.currentSheet = value
			console.log("should now have this.cookieJar", this.cookieJar)

			if (this.currentSheet != null) {
				if (!this.currentSheet.body) {
					this.currentSheet.body = DEFAULT_EDITOR_CONTENT
				}

				this.setContent(this.currentSheet.body)
			}

			m.redraw()
		})
	}

	async loadSheet(sheetPath: string): Promise<void> {
		currentSheetName(sheetPath)
	}

	initCodeMirror(element: HTMLElement): void {
		if (this.codeMirror != null) {
			return
		}

		// These two mappings are used for back/forward in macOS. Let the browser handle them.
		delete (CodeMirror as any).keyMap.macDefault["Cmd-["]
		delete (CodeMirror as any).keyMap.macDefault["Cmd-]"]

		console.log("Initializing CodeMirror for Workspace.")
		this.codeMirror = CodeMirror(element, {
			mode: "prestige",
			lineNumbers: true,
			matchBrackets: {},
			autofocus: true,
			autoCloseBrackets: true,
			styleActiveLine: true,
			scrollPastEnd: true,
			gutters: ["prestige", "CodeMirror-lint-markers"],
			lint: true,
			value: this.getContent(),
			extraKeys: {
				"Ctrl-Enter": this.doExecute,
				"Cmd-Enter": this.doExecute,
				"Cmd-F": "findPersistent",
				"Cmd-/": "toggleComment",
				"Shift-Tab": "indentLess",
			},
		})

		this.updateEditorDisplay()

		this.codeMirror.on("changes", () => {
			this._lines = null
			if (!this._disableAutoSave) {
				this.isChangesSaved = false
			}
			this.saveChanges()
			m.redraw()
		})
	}

	saveChanges(): void {
		this.updateEditorDisplay()

		if (this._disableAutoSave) {
			return
		}

		if (this.currentSheet == null) {
			console.error("Can't save missing sheet. Something's wrong.")
			return
		}

		this.currentSheet.body = this.getContent()

		console.log("saving this.currentSheet", this.currentSheet)
		saveSheet(this.currentSheetQualifiedPath(), this.currentSheet)
			.then(() => {
				this.isChangesSaved = true
				m.redraw()
			})
			.catch(error => {
				console.error("Error saving", error)
			})
	}

	getContent(): string {
		return this.codeMirror ? this.codeMirror.getValue() : this._content
	}

	setContent(content: string): void {
		this._lines = null
		if (this.codeMirror == null) {
			this._content = content
		} else {
			this._disableAutoSave = true
			this.codeMirror.setValue(content)
			this._disableAutoSave = false
		}
		(this.saveChanges as any).flush()
	}

	get lines(): string[] {
		if (this._lines == null) {
			this._lines = this.getContent().split("\n")
		}

		return this._lines
	}

	/**
	 * Update gutter, widgets, highlights etc. of the CodeMirror editor. Usually called when the contents of the editor
	 * change.
	 */
	updateEditorDisplay(): void {
		if (this.codeMirror == null) {
			return
		}

		console.log("Updating editor display in workspace.")
		this.codeMirror.clearGutter("prestige")

		const lines: string[] = this.lines
		const structure2 = parse(lines)

		for (const mark of this.widgetMarks.splice(0, this.widgetMarks.length)) {
			mark.clear()
		}

		for (const i of lines.keys()) {
			this.codeMirror.removeLineClass(i, "background", "line-javascript")
		}

		for (const block of structure2) {
			const startLine: string = lines[block.start]

			if (block.type === BlockType.PAGE_BREAK) {
				const buttonClasses = [
					"ml2", "pointer", "silver", "hover-black", "hover-bg-near-white", "br4", "pv1", "ph2", "underline",
					"f7", "sans-serif",
				]

				const el = document.createElement("span")
				el.classList.add(...buttonClasses)
				el.innerHTML = "+new"
				el.title = "Insert new request here."
				el.dataset.lineNum = block.start.toString()
				el.addEventListener("click", this.onNewClicked)
				this.widgetMarks.push(this.codeMirror.setBookmark(
					{ line: block.start, ch: startLine.length },
					{ widget: el, insertLeft: true },
				))

				const duplicateBtn = document.createElement("span")
				duplicateBtn.classList.add(...buttonClasses)
				duplicateBtn.innerHTML = "&divide;duplicate"
				duplicateBtn.title = "Duplicate below request."
				duplicateBtn.dataset.lineNum = block.start.toString()
				duplicateBtn.addEventListener("click", this.onDuplicateClicked)
				this.widgetMarks.push(this.codeMirror.setBookmark(
					{ line: block.start, ch: startLine.length },
					{ widget: duplicateBtn, insertLeft: true },
				))

				const exportBtn = document.createElement("span")
				exportBtn.classList.add(...buttonClasses)
				exportBtn.innerHTML = "export&hellip;"
				exportBtn.title = "Export below request in cURL format."
				exportBtn.dataset.lineNum = block.start.toString()
				exportBtn.addEventListener("click", this.onExportClicked)
				this.widgetMarks.push(this.codeMirror.setBookmark(
					{ line: block.start, ch: startLine.length },
					{ widget: exportBtn, insertLeft: true },
				))

			} else if (block.type === BlockType.JAVASCRIPT) {
				for (let i = block.start - 1; i <= block.end; ++i) {
					this.codeMirror.addLineClass(i, "background", "line-javascript")
				}

			} else if (block.type === BlockType.HTTP_REQUEST && block.payload != null) {
				const pageContent = lines.slice(block.payload.start, block.payload.end + 1).join("\n")
				let pretty: null | string = null

				try {
					pretty = JSON.stringify(JSON.parse(pageContent), null, 2)
				} catch (e) {
					// If the JSON is invalid, we can't prettify it.
				}

				if (pretty != null && pageContent !== pretty) {
					const el = document.createElement("span")
					el.classList.add("icon")
					el.innerText = "{}"
					el.title = "Prettify JSON body."
					el.dataset.start = block.payload.start.toString()
					el.dataset.end = block.payload.end.toString()
					el.dataset.pretty = pretty
					el.addEventListener("click", this.onPrettifyClicked)
					this.codeMirror.setGutterMarker(block.payload.start, "prestige", el)
				}

			}

		}
	}

	onNewClicked(event: MouseEvent): void {
		const lineNum = parseInt((event.currentTarget as HTMLElement).dataset.lineNum || "0", 10)
		this.codeMirror?.replaceRange(
			"###\n\nGET http://httpbun.com/get?name=sherlock\n\n",
			{ line: lineNum, ch: 0 },
		)
		this.codeMirror?.setCursor(lineNum + 2, 0)
		this.codeMirror?.focus()
	}

	onDuplicateClicked(event: MouseEvent): void {
		const lineNum: number = parseInt((event.currentTarget as HTMLElement).dataset.lineNum || "0", 10)
		const newLines: string[] = [this.lines[lineNum]]
		for (const line of this.lines.slice(lineNum + 1)) {
			if (line.startsWith("###")) {
				newLines.push("")
				break
			}
			newLines.push(line)
		}
		this.codeMirror?.replaceRange(
			newLines.join("\n"),
			{ line: lineNum, ch: 0 },
		)
		this.codeMirror?.setCursor(lineNum + newLines.length + 1, 0)
		this.codeMirror?.focus()
	}

	async onExportClicked(event: MouseEvent): Promise<void> {
		const lineNum = parseInt((event.currentTarget as HTMLElement).dataset.lineNum || "0", 10)
		const context = makeContext(this, this.cookieJar, this.fileBucket)
		this.exportingRequest = await this.buildRequestAtLine(lineNum + 1, context)
		m.redraw()
	}

	onPrettifyClicked(event: MouseEvent): void {
		if (!(event.currentTarget instanceof HTMLElement)) {
			throw new Error("Event without a target.")
		}

		if (typeof event.currentTarget.dataset.start !== "string"
			|| typeof event.currentTarget.dataset.end !== "string") {
			throw new Error("Start/End not available on prettify button.")
		}

		this.codeMirror?.replaceRange(
			event.currentTarget.dataset.pretty + "\n",
			{ line: parseInt(event.currentTarget.dataset.start, 10), ch: 0 },
			{ line: 1 + parseInt(event.currentTarget.dataset.end, 10), ch: 0 },
		)
	}

	get cookieJar(): CookieJar | null {
		return this.currentSheet?.cookieJar ?? null
	}

	buildRequestAtLine(lineNum: number, context: Context): Promise<RequestDetails> {
		if (this.codeMirror == null) {
			return Promise.reject()
		}

		if (this.codeMirror.somethingSelected()) {
			alert("Working from a selection is not supported yet.")
			return Promise.reject()
		}

		const lines = this.lines

		this.prevExecuteBookmark?.clear()
		this.prevExecuteBookmark = this.codeMirror.getDoc().setBookmark(this.codeMirror.getCursor())

		let startLine = lineNum
		while (startLine >= 0 && !lines[startLine].startsWith("###")) {
			--startLine
		}

		let endLine = lineNum
		while (endLine < lines.length && !lines[endLine].startsWith("###")) {
			++endLine
		}

		this.flashQueue.push({ start: startLine, end: endLine + 1 })

		return this.extractRequest(lines, lineNum, context)
	}

	doExecute(): void {
		if (this.session.isLoading) {
			alert("There's a request currently pending. Please wait for it to finish.")
			return
		}

		if (this.codeMirror == null) {
			return
		}

		if (this.codeMirror.somethingSelected()) {
			alert("Running a selection is not supported yet.")
			return
		}

		const lines = this.lines
		const cursorLine = this.codeMirror.getCursor().line

		this.prevExecuteBookmark?.clear()
		this.prevExecuteBookmark = this.codeMirror.getDoc().setBookmark(this.codeMirror.getCursor())

		let startLine = cursorLine
		while (startLine >= 0 && !lines[startLine].startsWith("###")) {
			--startLine
		}

		let endLine = cursorLine
		while (endLine < lines.length && !lines[endLine].startsWith("###")) {
			++endLine
		}

		this.flashQueue.push({ start: startLine, end: endLine + 1 })

		this.runTop(lines, cursorLine)
			.finally(() => {
				console.debug("Saving since cookies might've changed after a request execution.")
				m.redraw()
				if (this.currentSheet == null) {
					console.error("Can't save missing sheet. Something's wrong.")
					return
				}
				return this.saveCurrentSheet()
			})
	}

	async saveCurrentSheet(): Promise<void> {
		if (this.currentSheet != null) {
			return saveSheet(this.currentSheetQualifiedPath(), this.currentSheet)
		} else {
			return Promise.reject()
		}
	}

	async runTop(lines: string | string[], runLineNum: string | number, silent = false): Promise<AnyResult> {
		const startTime = Date.now()
		this.session.pushLoading()
		let request: null | RequestDetails = null

		const context = makeContext(this, this.cookieJar, this.fileBucket)
		let result: null | AnyResult = null

		try {
			request = await this.extractRequest(lines, runLineNum, context)
			if (!silent) {
				await context.emit("BeforeExecute", { request })
			}

			result = await this.execute(request, context)

			if (result != null && result.ok && result.cookies) {
				result.cookieChanges = this.cookieJar?.overwrite(result.cookies as any)
			}

		} catch (error: unknown) {
			if (error instanceof Error) {
				result = { ok: false, error, request }
			} else {
				throw error
			}

		} finally {
			if (result != null) {
				result.timeTaken = Date.now() - startTime
			}

			this.session.popLoading()

		}

		this.session.result = result
		return result
	}

	async extractRequest(
		lines: string | string[],
		runLineNum: string | number,
		context: Context,
	): Promise<RequestDetails> {

		if (typeof lines === "string") {
			lines = lines.split("\n")
		}

		if (typeof runLineNum === "string") {
			runLineNum = parseInt(runLineNum, 10)
		}

		return await extractRequest(lines, runLineNum, context)
	}

	async execute(request: RequestDetails, context: null | Context): Promise<AnyResult> {
		if (request.method === "") {
			throw new Error("Method cannot be empty!")
		}

		if (request.url === "") {
			throw new Error("URL cannot be empty!")
		}

		let proxy
		if (context != null && context.getProxyUrl != null) {
			proxy = context.getProxyUrl(request)
			if (proxy === "@super") {
				proxy = this.getProxyUrl(request)
			} else if (proxy === "@default") {
				proxy = this.defaultProxy
			}
		} else {
			proxy = this.getProxyUrl(request)
		}
		console.log("Using proxy", proxy)

		// TODO: Let the timeout be set by the user.
		const timeout = 5 * 60  // Seconds.

		if (proxy == null || proxy === "") {
			return this.session.executeDirect(request)

		} else {
			return this.session.executeWithProxy(request, { timeout, proxy }, this.cookieJar)

		}
	}

	runAgain(): void {
		if (this.codeMirror == null || this.prevExecuteBookmark == null) {
			return
		}

		this.codeMirror.setCursor(this.prevExecuteBookmark.find() as any)
		this.doExecute()
	}

	doFlashes(): void {
		if (this.codeMirror == null) {
			return
		}

		const doc = this.codeMirror.getDoc() as any

		while (this.flashQueue.length > 0) {
			const { start, end } = this.flashQueue.shift()

			for (let i = start; i < end; ++i) {
				doc.addLineClass(i, "line", "flash")
			}

			requestAnimationFrame(() => {
				for (let i = start; i < end; ++i) {
					doc.removeLineClass(i, "line", "flash")
				}
			})
		}
	}

	getProxyUrl({ url }: RequestDetails): null | string {
		console.log("this.defaultProxy", this.defaultProxy)
		if (this.defaultProxy == null || this.defaultProxy === "") {
			return null
		}

		const isLocalProxy = isLocalUrl(this.defaultProxy)
			|| (isLocalUrl(location.toString()) && !this.defaultProxy.includes("://"))

		return isLocalProxy
			? this.defaultProxy
			: isLocalUrl(url)
				? null
				: this.defaultProxy
	}

	async deleteCookie(domain: string, path: string, name: string): Promise<void> {
		if (this.cookieJar != null) {
			this.cookieJar.delete(domain, path, name)
			return this.saveCurrentSheet()
		} else {
			return Promise.resolve()
		}
	}

}

function isLocalUrl(url: string): boolean {
	return url.includes("://localhost") || url.includes("://127.0.0.1")
}
