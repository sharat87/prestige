import m from "mithril"

// Icons are modified versions of Phosphor <https://phosphoricons.com/>.

interface IconAttrs {
	style?: "regular" | "bold"
}

// This is not a Mithril component, although it might look like one. It's a component generator function.
function iconComponent(svgParts: TemplateStringsArray): m.Component<IconAttrs> {
	const svg: string = svgParts.join("").trim()

	return { view }

	function view(vnode: m.Vnode<IconAttrs>): m.Children {
		return m(
			"svg",
			{
				xmlns: "http://www.w3.org/2000/svg",
				viewBox: "0 0 256 256",
				width: "1em",
				height: "1em",
				class: "icon",
				"stroke-width": vnode.attrs.style === "bold" ? 24 : 16,
			},
			m.trust(svg),
		)
	}
}

export const arrowSquareOut = iconComponent`
<g fill="none" stroke="currentColor">
	<polyline points="216 100 216 40 156 40"></polyline>
	<line x1="144" y1="112" x2="216" y2="40"></line>
	<path d="M184,144v64a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8h64"></path>
</g>
`

export const user = iconComponent`
<g fill="currentColor">
<path d="M231.93652,211.98633a120.48718,120.48718,0,0,0-67.12-54.14258,72.00007,72.00007,0,1,0-73.63294,0,120.48813,
	120.48813,0,0,0-67.11865,54.14062,7.99981,7.99981,0,0,0,6.92432,12.00635l194.023.002a7.99957,7.99957,0,0,0,
	6.92431-12.00635Z"></path>
</g>
`

export const gear = iconComponent`
<g fill="none" stroke="currentColor">
	<circle cx="128" cy="128" r="48"></circle>
	<path d="M183.7,65.1q3.8,3.5,7.2,7.2l27.3,3.9a103.2,103.2,0,0,1,10.2,24.6l-16.6,22.1s.3,6.8,0,10.2l16.6,22.1a102.2,
		102.2,0,0,1-10.2,24.6l-27.3,3.9s-4.7,4.9-7.2,7.2l-3.9,27.3a103.2,103.2,0,0,1-24.6,10.2l-22.1-16.6a57.9,57.9,0,0,
		1-10.2,0l-22.1,16.6a102.2,102.2,0,0,1-24.6-10.2l-3.9-27.3q-3.7-3.5-7.2-7.2l-27.3-3.9a103.2,103.2,0,0,
		1-10.2-24.6l16.6-22.1s-.3-6.8,0-10.2L27.6,100.8A102.2,102.2,0,0,1,37.8,76.2l27.3-3.9q3.5-3.7,
		7.2-7.2l3.9-27.3a103.2,103.2,0,0,1,24.6-10.2l22.1,16.6a57.9,57.9,0,0,1,10.2,0l22.1-16.6a102.2,102.2,0,0,1,24.6,
		10.2Z"></path>
</g>
`

export const cookie = iconComponent`
<g fill="currentColor">
	<path d="M225.94092,114.89844a15.91968,15.91968,0,0,0-13.46094-3.085,23.99389,23.99389,0,0,1-29.27832-23.14063,
	15.94771,15.94771,0,0,0-15.87354-15.875A23.99268,23.99268,0,0,1,144.187,43.51953a16.01308,16.01308,0,0,0-15.562
	-19.51367c-.21729-.001-.43018-.00195-.647-.00195A104,104,0,1,0,231.99463,127.3623v-.001A15.97461,15.97461,0,0,0,
	225.94092,114.89844ZM75.51465,99.51465a12.0001,12.0001,0,1,1,0,16.9707A12.00062,12.00062,0,0,1,75.51465,99.51465Z
	m24.9707,72.9707a12.0001,12.0001,0,1,1,0-16.9707A12.00062,12.00062,0,0,1,100.48535,172.48535Zm27.0293-40a12.0001,
	12.0001,0,1,1,16.9707,0A12.00019,12.00019,0,0,1,127.51465,132.48535Zm36.9707,48a12.0001,12.0001,0,1,1,0-16.9707
	A12.00062,12.00062,0,0,1,164.48535,180.48535Z"></path>
</g>
`

export const folderClosed = iconComponent`
<g fill="currentColor">
	<path d="M215.99512,71.99805h-84.6875l-27.3125-27.3125a15.8907,15.8907,0,0,0-11.3125-4.6875H39.99512a16.01581,
	16.01581,0,0,0-16,16V200.61523a15.404,15.404,0,0,0,15.39062,15.38282h177.5a15.13062,15.13062,0,0,0,15.10938
	-15.10938V87.99805A16.01582,16.01582,0,0,0,215.99512,71.99805Zm-176-16h52.6875l16,16H39.99512Z"></path>
</g>
`

export const info = iconComponent`
<g fill="currentColor">
	<path d="M128.00146,23.99963a104,104,0,1,0,104,104A104.11791,104.11791,0,0,0,128.00146,23.99963ZM126.002,72
	a12,12,0,1,1-12,12A12,12,0,0,1,126.002,72Zm9.99951,111.99963h-8a8.0004,8.0004,0,0,1-8-8v-48a8,8,0,1,1,0-16h8
	a8.00039,8.00039,0,0,1,8,8v48a8,8,0,0,1,0,16Z"></path>
</g>
`

export const files = iconComponent`
<g fill="none" stroke="currentColor">
	<path d="M168,224H56a8,8,0,0,1-8-8V72a8,8,0,0,1,8-8l80,0,40,40V216A8,8,0,0,1,168,224Z"></path>
	<path d="M80,64V40a8,8,0,0,1,8-8l80,0,40,40V184a8,8,0,0,1-8,8H176"></path>
	<line x1="88" y1="152" x2="136" y2="152"></line>
	<line x1="88" y1="184" x2="136" y2="184"></line>
</g>
`

export const github = iconComponent`
<g fill="none" stroke="currentColor">
	<path d="M84,240a24,24,0,0,0,24-24V168"></path>
	<path d="M172,240a24,24,0,0,1-24-24V168"></path>
	<path d="M152,168h16a24,24,0,0,1,24,24v8a24,24,0,0,0,24,24"></path>
	<path d="M104,168H88a24,24,0,0,0-24,24v8a24,24,0,0,1-24,24"></path>
	<path d="M111.825,63.99934A51.9599,51.9599,0,0,0,68,40a51.90058,51.90058,0,0,0-3.48841,44.7036A49.25789,49.25789,0,
		0,0,56,112v8a48,48,0,0,0,48,48h48a48,48,0,0,0,48-48v-8a49.25769,49.25769,0,0,0-8.5116-27.29639A51.90061,
		51.90061,0,0,0,188,40a51.95992,51.95992,0,0,0-43.82535,23.99983Z" fill="currentColor"></path>
</g>
`

export const question = iconComponent`
<g fill="currentColor">
	<path d="M128.00146,23.99963a104,104,0,1,0,104,104A104.11791,104.11791,0,0,0,128.00146,23.99963ZM128.002,192a12,12,
	0,1,1,12-12A12,12,0,0,1,128.002,192Zm7.99951-48.891v.89551a8,8,0,1,1-16,0v-8a8.0004,8.0004,0,0,1,8-8,20,20,0,1,
	0-20-20,8,8,0,0,1-16,0,36,36,0,1,1,44,35.10449Z"></path>
</g>
`

export const key = iconComponent`
<g fill="none" stroke="currentColor">
	<path d="M93.2,122.8A70.3,70.3,0,0,1,88,96a72,72,0,1,1,72,72,70.3,70.3,0,0,1-26.8-5.2h0L120,
		176H96v24H72v24H32V184l61.2-61.2Z"></path>
	<circle cx="180" cy="76" r="16"></circle>
</g>
`

export const scroll = iconComponent`
<g fill="none" stroke="currentColor">
	<path d="M200,176V64a23.9,23.9,0,0,0-24-24H40"></path>
	<line x1="104" y1="104" x2="168" y2="104"></line>
	<line x1="104" y1="136" x2="168" y2="136"></line>
	<path d="M22.1,80A24,24,0,1,1,64,64V192a24,24,0,1,0,41.9-16h112A24,24,0,0,1,200,216H88"></path>
</g>
`

export const check = iconComponent`
<polyline points="216 72 104 184 48 128" fill="none" stroke="currentColor"></polyline>
`

export const floppyDisk = iconComponent`
<g fill="none" stroke="currentColor">
	<path d="M216,91.3V208a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8H164.7a7.9,7.9,0,0,1,5.6,2.3l43.4,43.4A7.9,
		7.9,0,0,1,216,91.3Z"></path>
	<path d="M80,216V152a8,8,0,0,1,8-8h80a8,8,0,0,1,8,8v64"></path>
	<line x1="152" y1="72" x2="96" y2="72"></line>
</g>
`

export const spinner = iconComponent`
<path d="M168,40.7a96,96,0,1,1-80,0" fill="none" stroke="currentColor" class="spin"></path>
`
