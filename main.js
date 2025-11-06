import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Load the dataset
const file = "economy-and-growth.csv";

d3.csv(file, d3.autoType).then(data => {
  // Choose a single year (you can later make this dynamic)
  const year = 2022;
  const filtered = data.filter(d => +d.Year === year);

  // Prepare numeric columns
  filtered.forEach(d => {
    d.domestic = +d["average_value_Gross domestic savings (% of GDP)"] || 0;
    d.gross = +d["average_value_Gross savings (% of GDP)"] || 0;
  });

  // Sort by total descending
  filtered.sort((a, b) => (b.domestic + b.gross) - (a.domestic + a.gross));

  // Chart dimensions
  const margin = { top: 80, right: 30, bottom: 130, left: 70 };
  const width = 960 - margin.left - margin.right;
  const height = 600 - margin.top - margin.bottom;

  // Create SVG
  const svg = d3.select("body")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Stack setup
  const stack = d3.stack().keys(["domestic", "gross"]);
  const stackedData = stack(filtered);

  // Scales
  const x = d3.scaleBand()
    .domain(filtered.map(d => d["Country Name"]))
    .range([0, width])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, d3.max(filtered, d => d.domestic + d.gross)])
    .nice()
    .range([height, 0]);

  const color = d3.scaleOrdinal()
    .domain(["domestic", "gross"])
    .range(["#60a5fa", "#f59e0b"]);

  // Gridlines
  svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).tickSize(-width).tickFormat(""))
    .attr("stroke-opacity", 0.1);

  // Bars
  svg.selectAll(".layer")
    .data(stackedData)
    .join("g")
    .attr("fill", d => color(d.key))
    .selectAll("rect")
    .data(d => d)
    .join("rect")
    .attr("x", d => x(d.data["Country Name"]))
    .attr("y", d => y(d[1]))
    .attr("height", d => y(d[0]) - y(d[1]))
    .attr("width", x.bandwidth())
    .append("title")
    .text(d =>
      `${d.data["Country Name"]}
Domestic: ${d3.format(".1f")(d.data.domestic)}%
Gross: ${d3.format(".1f")(d.data.gross)}%`
    );

  // Axes
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x)
      .tickValues(x.domain().filter((d, i) => !(i % 5)))
    )
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end")
    .attr("dx", "-0.6em")
    .attr("dy", "0.1em");

  svg.append("g").call(d3.axisLeft(y).tickFormat(d => d + "%"));

  // Title and subtitle
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .attr("class", "chart-title")
    .text("Stacked Bar Chart — Savings by Country (2022)");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -18)
    .attr("text-anchor", "middle")
    .attr("class", "chart-subtitle")
    .text("Gross vs. Domestic savings (% of GDP) from World Bank data");

  // Legend
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - 250}, -40)`);

  const keys = color.domain();

  legend.selectAll("rect")
    .data(keys)
    .join("rect")
    .attr("x", (d, i) => i * 120)
    .attr("width", 20)
    .attr("height", 20)
    .attr("fill", color);

  legend.selectAll("text")
    .data(keys)
    .join("text")
    .attr("x", (d, i) => i * 120 + 28)
    .attr("y", 15)
    .attr("fill", "#333")
    .style("font-size", "13px")
    .text(d => d.charAt(0).toUpperCase() + d.slice(1) + " savings");
});
