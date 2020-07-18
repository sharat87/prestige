if (localStorage.getItem("noAnalytics") !== "1") {
	const e = document.createElement("script");
	e.async = true;
	e.dataset.goatcounter = "https://prestigemad.goatcounter.com/count";
	e.src = "https://gc.zgo.at/count.js";
	document.body.appendChild(e);
}
