import HttpSession from "./HttpSession"
import m from "mithril"
import CodeMirror from "codemirror"
import { BlockType, parse } from "./Parser"
import BracesSVG from "remixicon/icons/Development/braces-line.svg"
import CookieJar from "./CookieJar"
import { proxyUrl } from "./Env"
import { currentProviders, currentSheet, currentSheetName, Provider, saveSheet, Sheet, Source } from "./Persistence"
import Stream from "mithril/stream"
import debounce from "lodash/debounce"

// TODO: Show a few quickstart templates to choose from instead of the same default content for every new sheet.
//   Like in MS Office apps.
const DEFAULT_EDITOR_CONTENT = `GET http://httpbin.org/get?name=haha

###

POST http://httpbin.org/post
Content-Type: application/x-www-form-urlencoded

username=sherlock&password=elementary
`

export default class Workspace {
	codeMirror: null | CodeMirror.Editor
	private _content: string
	private _lines: null | string[]
	private prevExecuteBookmark: null | CodeMirror.TextMarker
	session: HttpSession
	private flashQueue: any[]
	private widgetMarks: CodeMirror.TextMarker[]
	currentSheet: null | Sheet
	currentSheetQualifiedPath: Stream<string>
	private _disableAutoSave: boolean
	isChangesSaved: boolean

	constructor() {
		this.codeMirror = null
		this._content = ""
		this._lines = null
		this.prevExecuteBookmark = null
		this.session = new HttpSession(proxyUrl())
		this.flashQueue = []
		this.widgetMarks = []
		this.currentSheet = null
		this.currentSheetQualifiedPath = Stream()
		this._disableAutoSave = false
		this.isChangesSaved = true

		Stream.lift<[string, Provider<Source>[]], void>((qualifiedPath: string) => {
			this.loadSheet(qualifiedPath)
				.catch((e) => {
					console.error("Error in loadSheet", e)
				})
		}, this.currentSheetQualifiedPath, currentProviders)

		this.runAgain = this.runAgain.bind(this)
		this.doExecute = this.doExecute.bind(this)
		this.onNewClicked = this.onNewClicked.bind(this)
		this.onPrettifyClicked = this.onPrettifyClicked.bind(this)
		this.saveChanges = debounce(this.saveChanges.bind(this), 1000, { trailing: true })

		currentSheet.map((value) => {
			this.currentSheet = value

			if (this.currentSheet != null) {
				if (!this.currentSheet.body) {
					this.currentSheet.body = DEFAULT_EDITOR_CONTENT
				}

				if (this.currentSheet.cookieJar) {
					this.session.cookieJar.overwrite(this.currentSheet.cookieJar)
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
			gutters: ["prestige"],
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
			console.debug("Saving since codeMirror fired changes event.", this._disableAutoSave)
			this._lines = null
			if (!this._disableAutoSave) {
				this.isChangesSaved = false
				this.saveChanges()
			}
			this.updateEditorDisplay()
			m.redraw()
		})
	}

	saveChanges(): void {
		if (this.currentSheet == null) {
			console.error("Can't save missing sheet. Something's wrong.")
			return
		}

		this.currentSheet.body = this.getContent()

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
				const el = document.createElement("span")
				el.classList.add("icon", "add-widget", "cm-tag", "ml2", "pointer", "underline")
				el.innerHTML = "+new"
				el.title = "Insert new request here."
				el.dataset.lineNum = block.start.toString()
				el.addEventListener("click", this.onNewClicked)
				this.widgetMarks.push(this.codeMirror.setBookmark(
					{ line: block.start, ch: startLine.length },
					{ widget: el, insertLeft: true },
				))

			} else if (block.type === BlockType.JAVASCRIPT) {
				for (let i = block.start; i <= block.end + 1; ++i) {
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
					el.classList.add("icon", "washed-blue", "bg-dark-blue", "pointer")
					el.innerHTML = BracesSVG.content
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
			"###\n\nGET http://httpbin.org/get?name=sherlock\n\n",
			{ line: lineNum, ch: 0 },
		)
		this.codeMirror?.setCursor(lineNum + 2, 0)
		this.codeMirror?.focus()
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

	get cookieJar(): CookieJar {
		return this.session.cookieJar
	}

	doExecute(): void {
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

		this.session.runTop(lines, cursorLine)
			.finally(() => {
				console.debug("Saving since cookies might've changed after a request execution.")
				m.redraw()
				if (this.currentSheet == null) {
					console.error("Can't save missing sheet. Something's wrong.")
					return
				}
				return saveSheet(this.currentSheetQualifiedPath(), this.currentSheet)
			})
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
}
