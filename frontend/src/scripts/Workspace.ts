import HttpSession from "_/HttpSession"
import type { AnyResult } from "_/HttpSession"
import m from "mithril"
import CodeMirror from "_/codemirror"
import { BlockType, parse } from "_/Parser"
import CookieJar from "_/CookieJar"
import { proxyUrl } from "_/Env"
import {
	currentProviders,
	currentSheet,
	currentSheetName,
	Provider,
	saveSheetAuto,
	saveSheetManual,
	Sheet,
	Source,
	SaveState,
} from "_/Persistence"
import Stream from "mithril/stream"
import throttle from "lodash/throttle"
import FileBucket from "_/FileBucket"
import type { RequestDetails } from "_/Parser"
import { extractRequest } from "_/Parser"
import Context from "_/Context"
import { ping } from "_/pings"
import ExportPane from "_/ExportPane"
import ModalManager from "_/ModalManager"

// Duplicated in backend/gist/views.py
const DEFAULT_EDITOR_CONTENT = `# Welcome to Prestige! Your newest developer tool!
# Just enter the HTTP requests you want to make and hit Ctrl+Enter (or Cmd+Enter) to execute.
# Like this one right here:

GET https://httpbun.com/get?name=haha

###

# Lines starting with a single '#' like this are comments.
# Learn more about the syntax at ${window.location.origin}/docs/guides/syntax/.
# Let's make a POST request!

POST https://httpbun.com/post
Content-Type: application/x-www-form-urlencoded

username=sherlock&password=elementary

###

# Custom headers, easy as popcorn.
# Learn more at ${window.location.origin}/docs/guides/syntax/#header-section.

GET https://httpbun.com/headers
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
POST https://httpbun.com/dollar{postUrl}
Content-Type: application/x-www-form-urlencoded

username=sherlock&password=elementary

###

# We can define a Javascript function to be called when this request finishes execution.
POST https://httpbun.com/post

one=1&two=2

@onFinish(response) {
	alert("Request finished!")
}
`.replace(/\bdollar\{/g, "${")

export default class Workspace {
	codeMirror: null | CodeMirror.Editor
	private _content: string
	private _lines: null | string[]
	private prevExecuteBookmark: null | CodeMirror.TextMarker
	session: HttpSession
	defaultProxy: null | string
	fileBucket: FileBucket
	private flashQueue: { start: number, end: number }[]
	private widgetMarks: CodeMirror.TextMarker[]
	currentSheet: null | Sheet
	currentSheetQualifiedPath: Stream<string>
	private _disableAutoSave: boolean
	cookieJar: null | CookieJar

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
		this.saveSheetAuto = throttle(this.saveSheetAuto.bind(this), 3000, { trailing: true })
		this.cookieJar = null

		currentSheet.map((value) => {
			this.currentSheet = value instanceof Sheet ? value : null

			if (this.currentSheet != null) {
				if (!this.currentSheet.body) {
					this.currentSheet.body = DEFAULT_EDITOR_CONTENT
				}

				this.setContent(this.currentSheet.body)

				this.cookieJar = CookieJar.loadOrCreate(this.currentSheetQualifiedPath())

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

		// Buffer space after the last line in the editor. We are using a constant value here, instead of the
		// `scrollpastend` addon of CodeMirror, because that addon doesn't work right with Prestige on Safari.
		;(this.codeMirror as any).display.lineSpace.parentNode.style.paddingBottom = "96px"

		this.updateEditorDisplay()

		this.codeMirror.on("changes", () => {
			m.redraw()  // Need this on every change, to update any unsaved/saved indicator.
			this.updateEditorDisplay()  // TODO: This needs to be faster, or be run less often, not on every keystroke.
			if (this._disableAutoSave) {
				return
			}
			this._lines = null
			if (this.currentSheet != null) {
				console.log("set isSaved to false")
				this.currentSheet.saveState = SaveState.unsaved
			}
			this.saveSheetAuto()
		})
	}

	saveSheetAuto(): void {
		if (this._disableAutoSave) {
			return
		}

		if (this.currentSheet == null) {
			console.error("Can't auto-save missing sheet. Something's wrong.")
			return
		}

		this.currentSheet.body = this.getContent()
		saveSheetAuto(this.currentSheetQualifiedPath(), this.currentSheet).finally(m.redraw)
	}

	saveSheetManual(): void {
		if (this.currentSheet == null) {
			console.error("Can't manual-save missing sheet. Something's wrong.")
			return
		}

		this.currentSheet.body = this.getContent()
		saveSheetManual(this.currentSheetQualifiedPath(), this.currentSheet).finally(m.redraw)
	}

	get saveState(): SaveState {
		return this.currentSheet?.saveState ?? SaveState.unchanged
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
		(this.saveSheetAuto as any).flush()
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
		ping("new", "New request button clicked")
		const lineNum = parseInt((event.currentTarget as HTMLElement).dataset.lineNum || "0", 10)
		this.codeMirror?.replaceRange(
			"###\n\nGET https://httpbun.com/get?name=sherlock\n\n",
			{ line: lineNum, ch: 0 },
		)
		this.codeMirror?.setCursor(lineNum + 2, 0)
		this.codeMirror?.focus()
	}

	onDuplicateClicked(event: MouseEvent): void {
		ping("duplicate", "Duplicate request clicked")
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
		ping("export", "Export request clicked")
		const lineNum = parseInt((event.currentTarget as HTMLElement).dataset.lineNum || "0", 10)
		const context = new Context(this, this.cookieJar, this.fileBucket)
		const exportingRequest = await this.buildRequestAtLine(lineNum + 1, context)
		ModalManager.show(() => m(ExportPane, { request: exportingRequest, cookieJar: this.cookieJar }))
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

		ping("execute", "Execute request")
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
			.catch((error) => console.error("Error in runTop", error))
			.finally(m.redraw)
	}

	async runTop(lines: string | string[], runLineNum: string | number, silent = false): Promise<AnyResult> {
		const startTime = Date.now()
		this.session.pushLoading()
		let request: null | RequestDetails = null

		const context = new Context(this, this.cookieJar, this.fileBucket)
		let result: null | AnyResult = null

		try {
			request = await this.extractRequest(lines, runLineNum, context)
			if (!silent) {
				await context.emit("BeforeExecute", { request })
			}

			result = await this.execute(request, context)

			await context.emit("finish", result)

			if (result != null && result.ok && result.cookies) {
				result.cookieChanges = this.cookieJar?.overwrite(result.cookies)
			}

		} catch (error: unknown) {
			if (error instanceof Error) {
				console.log("Error extracting and executing request", error)
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

		} else if (this.isProxyApproved(proxy)) {
			return this.session.executeWithProxy(request, { timeout, proxy }, this.cookieJar)

		} else {
			throw new Error("Proxy '" + proxy + "' not approved. Request not executed.")

		}

	}

	isProxyApproved(proxy: string): boolean {
		let isApproved = false

		if (proxy === this.defaultProxy) {
			isApproved = true

		} else {
			const proxies = localStorage.getItem("approvedProxies")
			if (proxies != null) {
				let proxiesArray: string[]
				try {
					proxiesArray = JSON.parse(proxies)
					isApproved = proxiesArray.includes(proxy)
				} catch (err: unknown) {
					console.warn("Couldn't parse approved proxies, when checking.", err)
				}
			}

		}

		if (!isApproved) {
			isApproved = confirm("This request is about to be proxied to '" + proxy + "'. Do you trust this?")
			const proxiesStr = localStorage.getItem("approvedProxies")
			let proxies: string[]
			if (proxiesStr == null) {
				proxies = []
			} else {
				try {
					proxies = JSON.parse(proxiesStr)
					if (!Array.isArray(proxies)) {
						console.warn("Unexpected type for approved proxies, resetting.")
						proxies = []
					}
				} catch (err: unknown) {
					console.warn("Couldn't parse approved proxies, when updating.", err)
					proxies = []
				}
			}
			if (isApproved) {
				proxies.push(proxy)
			} else if (proxies.includes(proxy)) {
				proxies.splice(proxies.indexOf(proxy), 1)
			}
			localStorage.setItem("approvedProxies", JSON.stringify(proxies))
		}

		return isApproved
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

		let item
		while ((item = this.flashQueue.shift()) != null) {
			const { start, end } = item

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
			|| (isLocalUrl(window.location.toString()) && !this.defaultProxy.includes("://"))

		return isLocalProxy
			? this.defaultProxy
			: isLocalUrl(url)
				? null
				: this.defaultProxy
	}

	async deleteCookie(domain: string, path: string, name: string): Promise<void> {
		if (this.cookieJar != null) {
			this.cookieJar.delete(domain, path, name)
		}
	}

}

function isLocalUrl(url: string): boolean {
	return url.includes("://localhost") || url.includes("://127.0.0.1")
}
