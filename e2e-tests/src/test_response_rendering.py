import textwrap


def test_svg_text(log, browser):
	browser.set_editor_content("GET " + browser.httpbun_base + "/image/svg\n")
	browser.editor_run()

	status_el = browser.wait_for(".t-response-status")
	browser.shot()

	assert status_el.text == "200 Ok"

	browser.find(".t-result-tab-text").click()
	browser.shot()

	assert browser.find(".t-response-body pre").text == textwrap.dedent("""\
	  1<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" height="100%" viewBox="0 0 100 100">
	  2
	  3  <title>SVG Logo</title>
	  4
	  5  <a xlink:href="http://www.w3.org/Graphics/SVG/" target="_parent"
	  6     xlink:title="W3C SVG Working Group home page">
	  7
	  8    <rect
	  9        id="background"
	 10        fill="#FF9900"
	 11        width="100"
	 12        height="100"
	 13        rx="4"
	 14        ry="4"/>
	 15
	 16    <rect
	 17        id="top-left"
	 18        fill="#FFB13B"
	 19        width="50"
	 20        height="50"
	 21        rx="4"
	 22        ry="4"/>
	 23
	 24    <rect
	 25        id="bottom-right"
	 26        x="50"
	 27        y="50"
	 28        fill="#DE8500"
	 29        width="50"
	 30        height="50"
	 31        rx="4"
	 32        ry="4"/>
	 33
	 34    <g id="circles" fill="#FF9900">
	 35        <circle
	 36            id="n"
	 37            cx="50"
	 38            cy="18.4"
	 39            r="18.4"/>
	 40
	 41        <circle
	 42            id="ne"
	 43            cx="72.4"
	 44            cy="27.6"
	 45            r="18.4"/>
	 46
	 47        <circle
	 48            id="e"
	 49            cx="81.6"
	 50            cy="50"
	 51            r="18.4"/>
	 52
	 53        <circle
	 54            id="se"
	 55            cx="72.4"
	 56            cy="72.4"
	 57            r="18.4"/>
	 58
	 59        <circle
	 60            id="s"
	 61            cx="50"
	 62            cy="81.6"
	 63            r="18.4"/>
	 64
	 65        <circle
	 66            id="sw"
	 67            cx="27.6"
	 68            cy="72.4"
	 69            r="18.4"/>
	 70
	 71        <circle
	 72            id="w"
	 73            cx="18.4"
	 74            cy="50"
	 75            r="18.4"/>
	 76
	 77        <circle
	 78            id="nw"
	 79            cx="27.6"
	 80            cy="27.6"
	 81            r="18.4"/>
	 82    </g>
	 83
	 84    <g id="stars">
	 85        <path
	 86            id="black-star"
	 87            d="M  63.086, 18.385
	 88               c  0.000, -7.227  -5.859,-13.086 -13.100,-13.086
	 89               c -7.235,  0.000 -13.096,  5.859 -13.096, 13.086
	 90               c -5.100, -5.110 -13.395, -5.110 -18.497,  0.000
	 91               c -5.119,  5.120  -5.119, 13.408   0.000, 18.524
	 92               c -7.234,  0.000 -13.103,  5.859 -13.103, 13.085
	 93               c  0.000,  7.230   5.870, 13.098  13.103, 13.098
	 94               c -5.119,  5.110  -5.119, 13.395   0.000, 18.515
	 95               c  5.102,  5.104  13.397,  5.104  18.497,  0.000
	 96               c  0.000,  7.228   5.860, 13.083  13.096, 13.083
	 97               c  7.240,  0.000  13.100, -5.855  13.100,-13.083
	 98               c  5.118,  5.104  13.416,  5.104  18.513,  0.000
	 99               c  5.101, -5.120   5.101,-13.410   0.000,-18.515
	100               c  7.216,  0.000  13.081, -5.869  13.081,-13.098
	101               c  0.000, -7.227  -5.865,-13.085 -13.081,-13.085
	102               c  5.101, -5.119   5.101,-13.406   0.000,-18.524
	103               C 76.502, 13.275  68.206, 13.275  63.086, 18.385 z"/>
	104
	105        <path
	106            id="white-star"
	107            fill="#FFFFFF"
	108            d="M 55.003, 23.405
	109               v 14.488
	110               L 65.260, 27.640
	111               c  0.000, -1.812  0.691,-3.618   2.066, -5.005
	112               c  2.780, -2.771  7.275,-2.771  10.024,  0.000
	113               c  2.771,  2.766  2.771, 7.255   0.000, 10.027
	114               c -1.377,  1.375 -3.195, 2.072  -5.015,  2.072
	115               L 62.101, 44.982
	116               H 76.590
	117               c  1.290, -1.280  3.054,-2.076   5.011, -2.076
	118               c  3.900,  0.000  7.078, 3.179   7.078,  7.087
	119               c  0.000,  3.906 -3.178, 7.088  -7.078,  7.088
	120               c -1.957,  0.000 -3.721,-0.798  -5.011, -2.072
	121               H 62.100
	122               l 10.229, 10.244
	123               c  1.824,  0.000  3.642, 0.694   5.015,  2.086
	124               c  2.774,  2.759  2.774, 7.250   0.000, 10.010
	125               c -2.750,  2.774 -7.239, 2.774 -10.025,  0.000
	126               c -1.372, -1.372 -2.064,-3.192  -2.064, -5.003
	127               L 55.000, 62.094
	128               v 14.499
	129               c  1.271,  1.276  2.084, 3.054   2.084,  5.013
	130               c  0.000,  3.906 -3.177, 7.077  -7.098,  7.077
	131               c -3.919,  0.000 -7.094,-3.167  -7.094, -7.077
	132               c  0.000, -1.959  0.811,-3.732   2.081, -5.013
	133               V 62.094
	134               L 34.738, 72.346
	135               c  0.000,  1.812 -0.705, 3.627  -2.084,  5.003
	136               c -2.769,  2.772 -7.251, 2.772 -10.024,  0.000
	137               c -2.775, -2.764 -2.775,-7.253   0.000,-10.012
	138               c  1.377, -1.390  3.214,-2.086   5.012, -2.086
	139               l 10.257,-10.242
	140               H 23.414
	141               c -1.289,  1.276 -3.072, 2.072  -5.015,  2.072
	142               c -3.917,  0.000 -7.096,-3.180  -7.096, -7.088
	143               s  3.177, -7.087  7.096,-7.087
	144               c  1.940,  0.000  3.725, 0.796   5.015,  2.076
	145               h 14.488
	146               L 27.646, 34.736
	147               c -1.797,  0.000 -3.632,-0.697  -5.012, -2.071
	148               c -2.775, -2.772 -2.775,-7.260   0.000,-10.027
	149               c  2.773, -2.771  7.256,-2.771  10.027,  0.000
	150               c  1.375,  1.386  2.083, 3.195   2.083,  5.005
	151               l 10.235, 10.252
	152               V 23.407
	153               c -1.270, -1.287 -2.082,-3.053  -2.082, -5.023
	154               c  0.000, -3.908  3.175,-7.079   7.096, -7.079
	155               c  3.919,  0.000  7.097, 3.168   7.097,  7.079
	156               C 57.088, 20.356 56.274,22.119  55.003, 23.405 z"/>
	157    </g>
	158
	159    <g id="svg-textbox">
	160        <path
	161            id="text-backdrop"
	162            fill="black"
	163            d="M  5.30,50.00
	164               H 94.68
	165               V 90.00
	166               Q 94.68,95.00 89.68,95.00
	167               H 10.30
	168               Q  5.30,95.00  5.30,90.00 Z"/>
	169
	170        <path """ + """
	171            id="shine"
	172            fill="#3F3F3F"
	173            d="M  14.657,54.211
	174               h  71.394
	175               c   2.908, 0.000   5.312, 2.385   5.312, 5.315
	176               v  17.910
	177               c -27.584,-3.403 -54.926,-8.125 -82.011,-7.683
	178               V  59.526
	179               C   9.353,56.596  11.743,54.211  14.657,54.211
	180               L  14.657,54.211 z"/>
	181
	182        <g id="svg-text">
	183            <title>SVG</title>
	184            <path
	185                id="S"
	186                fill="#FFFFFF"
	187                stroke="#000000"
	188                stroke-width="0.5035"
	189                d="M 18.312,72.927
	190                   c -2.103,-2.107  -3.407, -5.028  -3.407, -8.253
	191                   c  0.000,-6.445   5.223,-11.672  11.666,-11.672
	192                   c  6.446, 0.000  11.667,  5.225  11.667, 11.672
	193                   h -6.832
	194                   c  0.000,-2.674  -2.168, -4.837  -4.835, -4.837
	195                   c -2.663, 0.000  -4.838,  2.163  -4.838,  4.837
	196                   c  0.000, 1.338   0.549,  2.536   1.415,  3.420
	197                   l  0.000, 0.000
	198                   c  0.883, 0.874   2.101,  1.405   3.423,  1.405
	199                   v  0.012
	200                   c  3.232, 0.000   6.145,  1.309   8.243,  3.416
	201                   l  0.000, 0.000
	202                   c  2.118, 2.111   3.424,  5.034   3.424,  8.248
	203                   c  0.000, 6.454  -5.221, 11.680 -11.667, 11.680
	204                   c -6.442, 0.000 -11.666, -5.222 -11.666,-11.680
	205                   h  6.828
	206                   c  0.000, 2.679   2.175,  4.835   4.838,  4.835
	207                   c  2.667, 0.000   4.835, -2.156   4.835, -4.835
	208                   c  0.000,-1.329  -0.545, -2.527  -1.429, -3.407
	209                   l  0.000, 0.000
	210                   c -0.864,-0.880  -2.082, -1.418  -3.406, -1.418
	211                   l  0.000, 0.000
	212                   C 23.341,76.350  20.429, 75.036  18.312, 72.927
	213                   L 18.312,72.927
	214                   L 18.312,72.927 z"/>
	215            <polygon
	216                id="V"
	217                fill="#FFFFFF"
	218                stroke="#000000"
	219                stroke-width="0.5035"
	220                points="61.588,53.005
	221                        53.344,92.854
	222                        46.494,92.854
	223                        38.236,53.005
	224                        45.082,53.005
	225                        49.920,76.342
	226                        54.755,53.005"/>
	227
	228         <path """ + """
	229            id="G"
	230            fill="#FFFFFF"
	231            stroke="#000000"
	232            stroke-width="0.5035"
	233            d="M 73.255,69.513
	234               h 11.683
	235               v 11.664
	236               l  0.000, 0.000
	237               c  0.000, 6.452  -5.226,11.678 -11.669, 11.678
	238               c -6.441, 0.000 -11.666,-5.226 -11.666,-11.678
	239               l  0.000, 0.000
	240               V 64.676
	241               h -0.017
	242               C 61.586,58.229  66.827,53.000  73.253, 53.000
	243               c  6.459, 0.000  11.683, 5.225  11.683, 11.676
	244               h -6.849
	245               c  0.000,-2.674  -2.152,-4.837  -4.834, -4.837
	246               c -2.647, 0.000  -4.820, 2.163  -4.820,  4.837
	247               v 16.501
	248               l  0.000, 0.000
	249               c  0.000, 2.675   2.173, 4.837   4.820,  4.837
	250               c  2.682, 0.000   4.834,-2.162   4.834, -4.827
	251               v -0.012
	252               v -4.827
	253               h -4.834
	254               L 73.255,69.513
	255               L 73.255,69.513 z"/>
	256        </g>
	257    </g>
	258  </a>
	259</svg>
	260""")
