import m from "mithril"

// Icons are modified versions of Phosphor <https://phosphoricons.com/>.

const IconSVG = {
	view(vnode: m.VnodeDOM): m.Children {
		return m("svg.icon", { width: "1rem", height: "1rem", viewBox: "0 0 24 24" }, vnode.children)
	},
}

export const externalLink = {
	view: (): m.Children => m(IconSVG, [
		m("path", { d: "M 9 9 l -6 0 l 0 12 l 12 0 l 0 -6 ", fill: "none", stroke: "currentColor", "stroke-width": 2 }),
		m("path", { d: "M 9 15 l 9 -9", fill: "none", stroke: "currentColor", "stroke-width": 2 }),
		m("path", { d: "M 12 3 l 9 0 l 0 9 Z", fill: "currentColor", stroke: "none" }),
	]),
}

export const user = {
	view(): m.Children {
		return m.trust(
			`
<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="icon">
	<path d="M231.93652,211.98633a120.48718,120.48718,0,0,0-67.12-54.14258,72.00007,72.00007,0,1,0-73.63294,0,120.48813,
	120.48813,0,0,0-67.11865,54.14062,7.99981,7.99981,0,0,0,6.92432,12.00635l194.023.002a7.99957,7.99957,0,0,0,
	6.92431-12.00635Z"></path>
</svg>
			`)
	},
}

export const wrench = {
	view(): m.Children {
		return m.trust(
			`
<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="icon">
	<path d="M210.91162,146.91211a72.37653,72.37653,0,0,1-79.84424,15.03613L79.0249,222.2002q-.19116.22119-.39746.42773
	a32.00021,32.00021,0,0,1-45.25537-45.25488c.1377-.1377.28076-.27051.42773-.39844l60.25293-52.043a72.02489,72.02489,
	0,0,1,94.06153-95.23437A8.004,8.004,0,0,1,190.648,42.72461L151.71387,81.6582l3.77148,18.85645,18.856,3.77148,
	38.93457-38.93457a8.00429,8.00429,0,0,1,13.02685,2.53418A71.72729,71.72729,0,0,1,210.91162,146.91211Z"></path>
</svg>
		`)
	},
}

export const cookie = {
	view(): m.Children {
		return m.trust(
			`
<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="icon">
	<path d="M225.94092,114.89844a15.91968,15.91968,0,0,0-13.46094-3.085,23.99389,23.99389,0,0,1-29.27832-23.14063,
	15.94771,15.94771,0,0,0-15.87354-15.875A23.99268,23.99268,0,0,1,144.187,43.51953a16.01308,16.01308,0,0,0-15.562
	-19.51367c-.21729-.001-.43018-.00195-.647-.00195A104,104,0,1,0,231.99463,127.3623v-.001A15.97461,15.97461,0,0,0,
	225.94092,114.89844ZM75.51465,99.51465a12.0001,12.0001,0,1,1,0,16.9707A12.00062,12.00062,0,0,1,75.51465,99.51465Z
	m24.9707,72.9707a12.0001,12.0001,0,1,1,0-16.9707A12.00062,12.00062,0,0,1,100.48535,172.48535Zm27.0293-40a12.0001,
	12.0001,0,1,1,16.9707,0A12.00019,12.00019,0,0,1,127.51465,132.48535Zm36.9707,48a12.0001,12.0001,0,1,1,0-16.9707
	A12.00062,12.00062,0,0,1,164.48535,180.48535Z"></path>
</svg>
		`)
	},
}

export const folderClosed = {
	view(): m.Children {
		return m.trust(
			`
<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="icon">
	<path d="M215.99512,71.99805h-84.6875l-27.3125-27.3125a15.8907,15.8907,0,0,0-11.3125-4.6875H39.99512a16.01581,
	16.01581,0,0,0-16,16V200.61523a15.404,15.404,0,0,0,15.39062,15.38282h177.5a15.13062,15.13062,0,0,0,15.10938
	-15.10938V87.99805A16.01582,16.01582,0,0,0,215.99512,71.99805Zm-176-16h52.6875l16,16H39.99512Z"></path>
</svg>
		`)
	},
}

export const info = {
	view(): m.Children {
		return m.trust(
			`
<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="icon">
	<path d="M128.00146,23.99963a104,104,0,1,0,104,104A104.11791,104.11791,0,0,0,128.00146,23.99963ZM126.002,72
	a12,12,0,1,1-12,12A12,12,0,0,1,126.002,72Zm9.99951,111.99963h-8a8.0004,8.0004,0,0,1-8-8v-48a8,8,0,1,1,0-16h8
	a8.00039,8.00039,0,0,1,8,8v48a8,8,0,0,1,0,16Z"></path>
</svg>
		`)
	},
}

export const files = {
	view(): m.Children {
		return m.trust(
			`
<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256" class="icon">
	<path d="M168,224H56a8,8,0,0,1-8-8V72a8,8,0,0,1,8-8l80,0,40,40V216A8,8,0,0,1,168,224Z" fill="none"
		stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></path>
	<path d="M80,64V40a8,8,0,0,1,8-8l80,0,40,40V184a8,8,0,0,1-8,8H176" fill="none" stroke="currentColor"
		stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></path>
	<line x1="88" y1="152" x2="136" y2="152" fill="none" stroke="currentColor" stroke-linecap="round"
		stroke-linejoin="round" stroke-width="16"></line>
	<line x1="88" y1="184" x2="136" y2="184" fill="none" stroke="currentColor" stroke-linecap="round"
		stroke-linejoin="round" stroke-width="16"></line>
</svg>
		`)
	},
}

export const github = {
	view(): m.Children {
		return m.trust(
			`
<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256" fill="currentColor" class="icon">
	<path d="M84,240a24,24,0,0,0,24-24V168" fill="none" stroke="currentColor" stroke-linecap="round"
		stroke-linejoin="round" stroke-width="16"></path>
	<path d="M172,240a24,24,0,0,1-24-24V168" fill="none" stroke="currentColor" stroke-linecap="round"
		stroke-linejoin="round" stroke-width="16"></path>
	<path d="M152,168h16a24,24,0,0,1,24,24v8a24,24,0,0,0,24,24" fill="none" stroke="currentColor" stroke-linecap="round"
		stroke-linejoin="round" stroke-width="16"></path>
	<path d="M104,168H88a24,24,0,0,0-24,24v8a24,24,0,0,1-24,24" fill="none" stroke="#000000" stroke-linecap="round"
		stroke-linejoin="round" stroke-width="16"></path>
	<path d="M111.825,63.99934A51.9599,51.9599,0,0,0,68,40a51.90058,51.90058,0,0,0-3.48841,44.7036A49.25789,49.25789,0,
		0,0,56,112v8a48,48,0,0,0,48,48h48a48,48,0,0,0,48-48v-8a49.25769,49.25769,0,0,0-8.5116-27.29639A51.90061,
		51.90061,0,0,0,188,40a51.95992,51.95992,0,0,0-43.82535,23.99983Z" stroke="currentColor"
		stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></path>
</svg>
		`)
	},
}

export const question = {
	view(): m.Children {
		return m.trust(
			`
<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="icon">
	<path d="M128.00146,23.99963a104,104,0,1,0,104,104A104.11791,104.11791,0,0,0,128.00146,23.99963ZM128.002,192a12,12,
	0,1,1,12-12A12,12,0,0,1,128.002,192Zm7.99951-48.891v.89551a8,8,0,1,1-16,0v-8a8.0004,8.0004,0,0,1,8-8,20,20,0,1,
	0-20-20,8,8,0,0,1-16,0,36,36,0,1,1,44,35.10449Z"></path>
</svg>
		`)
	},
}
