import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// ============= LOAD & SETUP ==================

const file = "economy-and-growth.csv";

const cols = {
  name: "Country Name",
  code: "Country Code",
  year: "Year",
  s_dom: "average_value_Gross domestic savings (% of GDP)",
  s_gross: "average_value_Gross savings (% of GDP)",
  gdp_usd: "average_value_GDP (current US$)",
  gdp_pc_usd: "average_value_GDP per capita (current US$)",
  gdp_pc_ppp: "average_value_GDP per capita, PPP (constant 2017 international $)",
  gdp_growth: "average_value_GDP growth (annual %)"
};

// Load data
const raw = await d3.csv(file, d3.autoType);
console.log("Loaded:", raw.length, "rows");

const data = raw.map(d => ({
  name: d[cols.name],
  code: d[cols.code],
  year: +d[cols.year],
  sDom: +d[cols.s_dom],
  sGross: +d[cols.s_gross],
  gdp: +d[cols.gdp_usd],
  gdpPc: +d[cols.gdp_pc_usd],
  gdpPcPPP: +d[cols.gdp_pc_ppp],
  growth: +d[cols.gdp_growth],
  pop: (d[cols.gdp_usd] && d[cols.gdp_pc_usd])
    ? (+d[cols.gdp_usd] / +d[cols.gdp_pc_usd])
    : NaN
}));

const years = d3.extent(data, d => d.year);
const state = { year: years[1] || 2019, usePPP: false };

// ============= STACKED BAR CHART ==================

let updateStacked = () => {};

function buildStacked() {
  const svg = d3.select("#stacked");
  svg.selectAll("*").remove();

  const W = svg.node().clientWidth,
    H = svg.node().clientHeight;
  const margin = { top: 30, right: 20, bottom: 50, left: 60 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Group by year
  const byYear = d3.rollups(
    data,
    v => ({
      sDom: d3.mean(v, d => d.sDom),
      sGross: d3.mean(v, d => d.sGross)
    }),
    d => d.year
  ).sort((a, b) => a[0] - b[0]);

  const stack = d3.stack().keys(["sDom", "sGross"]);
  const color = d3.scaleOrdinal()
    .domain(["sDom", "sGross"])
    .range(["#60a5fa", "#f59e0b"]);

  const x = d3.scaleBand()
    .domain(byYear.map(d => d[0]))
    .range([0, innerW])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, d3.max(byYear, ([, v]) => (v.sDom + v.sGross))])
    .nice()
    .range([innerH, 0]);

  const xAxis = g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickValues(x.domain().filter((d, i) => !(i % 5))))
    .attr("color", "#bbb");

  const yAxis = g.append("g")
    .call(d3.axisLeft(y).tickFormat(d => d + "%"))
    .attr("color", "#bbb");

  const yearData = byYear.map(([year, vals]) => ({ year, ...vals }));
  const stackedData = stack(yearData);

  const layer = g.selectAll(".layer")
    .data(stackedData)
    .join("g")
    .attr("fill", d => color(d.key));

  layer.selectAll("rect")
    .data(d => d.map(v => ({ key: d.key, data: v.data, y0: v[0], y1: v[1] })))
    .join("rect")
    .attr("x", d => x(d.data.year))
    .attr("y", d => y(d.y1))
    .attr("height", d => y(d.y0) - y(d.y1))
    .attr("width", x.bandwidth())
    .append("title")
    .text(d => `${d.data.year}: ${d.key === "sDom" ? "Domestic" : "Gross"} = ${(d.y1 - d.y0).toFixed(1)}%`);

  // Highlight current year
  updateStacked = (year) => {
    const highlight = g.selectAll(".highlightRect").data([year]);
    highlight.join("rect")
      .attr("class", "highlightRect")
      .attr("x", x(year))
      .attr("width", x.bandwidth())
      .attr("y", 0)
      .attr("height", innerH)
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-width", 2);
  };
}

// ============= SCATTER PLOT ==================

let updateScatter = () => {};

function buildScatter() {
  const svg = d3.select("#scatter");
  svg.selectAll("*").remove();

  const W = svg.node().clientWidth,
    H = svg.node().clientHeight;
  const margin = { top: 40, right: 20, bottom: 60, left: 70 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const tooltip = makeTooltip();

  const x = d3.scaleLog().range([0, innerW]);
  const y = d3.scaleLinear().range([innerH, 0]);
  const r = d3.scaleSqrt().range([3, 25]);
  const c = d3.scaleSequential(d3.interpolateTurbo);

  const xAxis = g.append("g").attr("transform", `translate(0,${innerH})`).attr("color", "#bbb");
  const yAxis = g.append("g").attr("color", "#bbb");

  function render() {
    const yr = state.year;
    const rows = data.filter(d => d.year === yr);

    const usePPP = state.usePPP;
    const xVal = d => (usePPP ? d.gdpPcPPP : d.gdpPc);
    const yVal = d => d.growth;
    const rVal = d => d.pop;
    const colorVal = d => d.sGross;

    const valid = rows.filter(d => isFinite(xVal(d)) && isFinite(yVal(d)) && xVal(d) > 100);

    if (!valid.length) return;

    // Spread scatter points better
    x.domain([1000, d3.max(valid, xVal)]).nice();
    y.domain(d3.extent(valid, yVal)).nice();
    r.domain(d3.extent(valid, rVal));
    c.domain(d3.extent(valid, colorVal));

    xAxis.transition().duration(400).call(d3.axisBottom(x).ticks(6, "~s"));
    yAxis.transition().duration(400).call(d3.axisLeft(y).ticks(6));

    const dots = g.selectAll("circle").data(valid, d => d.code);

    dots.join(
      enter => enter
        .append("circle")
        .attr("cx", d => x(xVal(d)))
        .attr("cy", d => y(yVal(d)))
        .attr("r", d => r(rVal(d)))
        .attr("fill", d => c(colorVal(d)))
        .attr("fill-opacity", 0.8)
        .on("mousemove", (ev, d) => {
          tooltip.show(ev, `<b>${d.name}</b> (${d.year})<br>
          GDP per capita: ${d3.format(",")(xVal(d))}<br>
          Growth: ${d3.format(".1f")(d.growth)}%<br>
          Gross savings: ${d3.format(".1f")(d.sGross)}%`);
        })
        .on("mouseleave", () => tooltip.hide()),
      update => update
        .transition().duration(400)
        .attr("cx", d => x(xVal(d)))
        .attr("cy", d => y(yVal(d)))
        .attr("r", d => r(rVal(d)))
        .attr("fill", d => c(colorVal(d))),
      exit => exit.remove()
    );
  }

  updateScatter = render;
  render();

  addColorLegend(svg);
}

// ============= TOOLTIP & LEGEND ==================

function makeTooltip() {
  let div = d3.select(".tooltip");
  if (div.empty()) {
    div = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);
  }
  return {
    show(ev, html) {
      div.style("opacity", 1).html(html)
        .style("left", ev.clientX + 12 + "px")
        .style("top", ev.clientY + 12 + "px");
    },
    hide() {
      div.style("opacity", 0);
    }
  };
}

function addColorLegend(svg) {
  const colorScale = d3.scaleSequential(d3.interpolateTurbo).domain([5, 40]);
  const grad = svg.append("defs").append("linearGradient").attr("id", "colorGrad");
  d3.range(0, 1.01, 0.1).forEach(t => {
    grad.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", colorScale(5 + t * (40 - 5)));
  });
  svg.append("rect")
    .attr("x", 80).attr("y", 25)
    .attr("width", 180).attr("height", 10)
    .style("fill", "url(#colorGrad)");
  svg.append("text").attr("x", 80).attr("y", 20).attr("fill", "#ccc").text("Gross savings (% of GDP)");
  svg.append("text").attr("x", 80).attr("y", 50).attr("fill", "#ccc").text("Low");
  svg.append("text").attr("x", 240).attr("y", 50).attr("fill", "#ccc").text("High");
}

// ============= INITIALIZE EVERYTHING =============

buildStacked();
buildScatter();

d3.select("#yearRange").on("input", e => {
  state.year = +e.target.value;
  d3.select("#yearLabel").text(state.year);
  updateStacked(state.year);
  updateScatter();
});

d3.select("#pppToggle").on("change", e => {
  state.usePPP = e.target.checked;
  updateScatter();
});
