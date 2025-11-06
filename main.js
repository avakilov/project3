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
const state = {
  year: years[1] || 2019,
  usePPP: false
};

// ============= STACKED BAR CHART ==================

let updateStacked = () => {};

function buildStacked() {
  const svg = d3.select("#stacked");
  svg.selectAll("*").remove();

  const W = svg.node().clientWidth,
    H = svg.node().clientHeight;
  const margin = { top: 40, right: 20, bottom: 60, left: 60 };
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

  // --- Updated Spectral Color Palette ---
  const spectral = d3.scaleSequential()
    .domain([0, 1])
    .interpolator(d3.interpolateSpectral);

  const color = d3.scaleOrdinal()
    .domain(["sDom", "sGross"])
    .range([spectral(0.15), spectral(0.85)]);

  const x = d3.scaleBand()
    .domain(byYear.map(d => d[0]))
    .range([0, innerW])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, d3.max(byYear, ([, v]) => (v.sDom + v.sGross))])
    .nice()
    .range([innerH, 0]);

  // --- Gridlines ---
  g.append("g")
    .attr("class", "grid")
    .call(
      d3.axisLeft(y)
        .tickSize(-innerW)
        .tickFormat("")
    )
    .attr("stroke-opacity", 0.05);

  const xAxis = g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickValues(x.domain().filter((d, i) => !(i % 5))))
    .attr("color", "#888");

  const yAxis = g.append("g")
    .call(d3.axisLeft(y).tickFormat(d => d + "%"))
    .attr("color", "#888");

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
    .attr("stroke", "#000")
    .attr("stroke-opacity", 0.2)
    .append("title")
    .text(d => `${d.data.year}: ${d.key === "sDom" ? "Domestic" : "Gross"} = ${(d.y1 - d.y0).toFixed(1)}%`);

  // --- Highlight selected year ---
  updateStacked = (year) => {
    const focus = byYear.find(([y]) => y === year);
    if (!focus) return;
    const dom = focus[1].sDom || 0, gross = focus[1].sGross || 0;
    const total = dom + gross;
    y.domain([0, Math.max(40, total)]);
    yAxis.transition().duration(400).call(d3.axisLeft(y).tickFormat(d => d + "%"));
  };
}

// ============= INITIALIZE ==================
buildStacked();
updateStacked(state.year);
