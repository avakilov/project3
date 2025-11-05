// main.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// 1. Load data
const data = await d3.csv("economy-and-growth.csv", d3.autoType);

// (Insert your chart logic from the version I gave earlier — buildStacked(), buildScatter(), etc.)

// --- Annotation panel ---
const ann = d3.select("body").append("div")
  .attr("class", "annotations")
  .html("<b>Annotations</b><br>• Click bubbles to highlight<br>• Brush bars to filter<br>• Hover for details<br><br><button id='exportPNG'>Export PNG</button>");

// --- Export to PNG ---
d3.select("#exportPNG").on("click", () => {
  const node = document.querySelector("main");
  import("https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/+esm").then(mod => {
    mod.toPng(node).then((dataUrl) => {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "d3_visualization.png";
      a.click();
    });
  });
});

// --- Color legend ---
function addColorBins() {
  const svg = d3.select("#scatter");
  const colorScale = d3.scaleSequential(d3.interpolateTurbo).domain([5, 40]);
  const grad = svg.append("defs").append("linearGradient").attr("id", "colorGrad");
  d3.range(0, 1.01, 0.1).forEach(t => {
    grad.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", colorScale(5 + t * (40 - 5)));
  });
  svg.append("rect")
    .attr("x", 60).attr("y", 30)
    .attr("width", 180).attr("height", 10)
    .style("fill", "url(#colorGrad)").attr("stroke", "#333");
  svg.append("text").attr("x", 60).attr("y", 24).attr("fill", "#cbd5e1").text("Gross savings (% of GDP)");
  svg.append("text").attr("x", 60).attr("y", 60).attr("fill", "#cbd5e1").text("Low");
  svg.append("text").attr("x", 220).attr("y", 60).attr("fill", "#cbd5e1").text("High");
}
addColorBins();