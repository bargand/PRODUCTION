document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const analyzeBtn = document.getElementById("analyze-btn");
  const dataInput = document.getElementById("data-input");
  const designBtns = document.querySelectorAll(".design-btn");
  const exampleBtns = document.querySelectorAll(".example-btn");
  const designRequirements = document.getElementById("design-requirements");
  const errorMessage = document.getElementById("error-message");

  // Output elements
  const dataInfoSection = document.getElementById("data-info");
  const descriptiveStats = document.getElementById("descriptive-stats");
  const anovaResults = document.getElementById("anova-results");
  const postHocResults = document.getElementById("post-hoc-results");
  const exportSection = document.getElementById("export-section");
  const chartsContainer = document.getElementById("charts-container");
  const designTypeOutput = document.getElementById("design-type-output");
  const genotypeCount = document.getElementById("genotype-count");
  const replicationCount = document.getElementById("replication-count");
  const totalObservations = document.getElementById("total-observations");
  const statsTableBody = document.querySelector("#stats-table tbody");
  const anovaTableBody = document.querySelector("#anova-table tbody");
  const postHocTableBody = document.querySelector("#posthoc-table tbody");
  const exportCsvBtn = document.getElementById("export-csv");
  const exportJsonBtn = document.getElementById("export-json");

  // Chart elements
  const meansChartCtx = document.getElementById("meansChart").getContext("2d");
  const significanceChartCtx = document
    .getElementById("significanceChart")
    .getContext("2d");
  const variabilityChartCtx = document
    .getElementById("variabilityChart")
    .getContext("2d");
  const effectSizeChartCtx = document
    .getElementById("effectSizeChart")
    .getContext("2d");

  // Chart instances
  let meansChart, significanceChart, variabilityChart, effectSizeChart;

  // Current design type (default: CRD)
  let currentDesign = "CRD";
  let currentResult = null;
  let currentData = null;
  let postHocComparisons = null;

  // Example data sets
  const examples = {
    CRD: `12.5 13.2 14.1
11.8 12.4 13.0
14.2 14.8 15.3
13.5 13.9 14.5`,

    RBD: `10.2 10.5 10.8 11.1
12.3 12.6 12.9 13.2
11.8 12.1 12.4 12.7
13.5 13.8 14.1 14.4`,

    LSD: `10.2 11.5 12.1
11.8 12.3 10.5
12.4 10.8 11.2`,
  };

  // Set up design type buttons
  designBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      designBtns.forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      currentDesign = this.dataset.design;
      updateDesignRequirements();
    });
  });

  // Set up example buttons
  exampleBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      const exampleType = this.dataset.example;
      dataInput.value = examples[exampleType];
    });
  });

  function updateDesignRequirements() {
    if (currentDesign === "LSD") {
      designRequirements.textContent =
        "For LSD: Must have equal genotypes and replications (square design).";
    } else {
      designRequirements.textContent = `For ${currentDesign}: Each treatment must have equal replications.`;
    }
  }

  // Analyze button click handler
  analyzeBtn.addEventListener("click", function () {
    // Reset UI
    dataInfoSection.classList.add("hidden");
    descriptiveStats.classList.add("hidden");
    anovaResults.classList.add("hidden");
    postHocResults.classList.add("hidden");
    exportSection.classList.add("hidden");
    chartsContainer.classList.add("hidden");
    errorMessage.classList.add("hidden");

    // Show loading state
    const originalText = analyzeBtn.innerHTML;
    analyzeBtn.innerHTML = `<span class="loading"></span>Analyzing...`;
    analyzeBtn.disabled = true;

    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      try {
        const rawData = dataInput.value.trim();
        if (!rawData) throw new Error("Please enter data to analyze");

        currentData = parseData(rawData);
        const result = performANOVA(currentData, currentDesign);

        currentResult = result; // Store for export

        displayDataInfo(result);
        displayDescriptiveStats(currentData, result);
        displayANOVATable(result);
        displayCharts(currentData, result);

        // Only show post-hoc if genotype effect is significant
        if (result.pValueGenotype < 0.05) {
          performPostHocTest(currentData, result);
        }

        exportSection.classList.remove("hidden");
      } catch (error) {
        showError(error.message);
      } finally {
        analyzeBtn.innerHTML = originalText;
        analyzeBtn.disabled = false;
      }
    }, 100);
  });

  function parseData(rawData) {
    const lines = rawData.split("\n").filter((line) => line.trim() !== "");
    if (lines.length === 0) throw new Error("No data entered");

    return lines.map((line) => {
      // Split by spaces, commas, or tabs and filter out empty values
      const values = line
        .split(/[\s,]+/)
        .filter((val) => val !== "" && !isNaN(val));
      if (values.length === 0) throw new Error("Empty row detected");

      return values.map((val) => {
        const num = parseFloat(val);
        if (isNaN(num)) throw new Error(`Invalid number: "${val}"`);
        return num;
      });
    });
  }

  function performANOVA(data, design) {
    const genotypes = data.length;
    if (genotypes < 2) throw new Error("At least 2 genotypes required");

    const replications = data[0].length;
    if (!data.every((row) => row.length === replications)) {
      throw new Error(
        "All genotypes must have the same number of replications"
      );
    }

    if (design === "LSD" && genotypes !== replications) {
      throw new Error(
        "Latin Square Design requires equal genotypes and replications (square design)"
      );
    }

    const totalObservations = genotypes * replications;
    let grandTotal = 0;
    let sumOfSquares = 0;

    // Calculate grand total and sum of squares
    data.forEach((row) =>
      row.forEach((value) => {
        grandTotal += value;
        sumOfSquares += value * value;
      })
    );
    const grandMean = grandTotal / totalObservations;

    // Calculate correction factor
    const CF = (grandTotal * grandTotal) / totalObservations;

    // Total SS
    const SST = sumOfSquares - CF;

    // Genotype calculations
    const genotypeTotals = data.map((row) =>
      row.reduce((sum, val) => sum + val, 0)
    );
    const genotypeMeans = genotypeTotals.map((total) => total / replications);
    const genotypeSS = genotypeTotals.reduce(
      (sum, total) => sum + (total * total) / replications,
      0
    );
    const SSG = genotypeSS - CF;

    // Replication calculations
    const replicationTotals = [];
    for (let i = 0; i < replications; i++) {
      let repTotal = 0;
      data.forEach((row) => (repTotal += row[i]));
      replicationTotals.push(repTotal);
    }
    const replicationMeans = replicationTotals.map(
      (total) => total / genotypes
    );
    const replicationSS = replicationTotals.reduce(
      (sum, total) => sum + (total * total) / genotypes,
      0
    );
    let SSR = replicationSS - CF; // Changed to let to allow reassignment for LSD

    // Design-specific calculations
    let SSE,
      dfGenotype,
      dfReplication,
      dfError,
      SSC = 0;

    if (design === "CRD") {
      // Completely Randomized Design
      SSE = SST - SSG;
      dfGenotype = genotypes - 1;
      dfReplication = 0; // Not used in CRD
      dfError = totalObservations - genotypes;
    } else if (design === "RBD") {
      // Randomized Block Design
      SSE = SST - SSG - SSR;
      dfGenotype = genotypes - 1;
      dfReplication = replications - 1;
      dfError = (genotypes - 1) * (replications - 1);
    } else if (design === "LSD") {
      // Latin Square Design
      const n = genotypes;

      // Calculate column SS
      const columnTotals = [];
      for (let j = 0; j < n; j++) {
        let colTotal = 0;
        for (let i = 0; i < n; i++) {
          colTotal += data[i][j];
        }
        columnTotals.push(colTotal);
      }
      const columnSS = columnTotals.reduce(
        (sum, total) => sum + (total * total) / n,
        0
      );
      SSC = columnSS - CF;

      // For LSD, combine row and column SS
      const combinedRowColumnSS = SSR + SSC;
      SSE = SST - SSG - combinedRowColumnSS;

      dfGenotype = n - 1;
      dfReplication = 2 * (n - 1); // Combined rows + columns
      dfError = (n - 1) * (n - 2);

      // Update SSR to be the combined value
      SSR = combinedRowColumnSS;
    }

    // Calculate mean squares with validation
    const MSG = dfGenotype > 0 ? SSG / dfGenotype : 0;
    const MSR = design !== "CRD" && dfReplication > 0 ? SSR / dfReplication : 0;
    const MSE = dfError > 0 ? SSE / dfError : 0;

    // Calculate F-values with validation
    const FGenotype = MSE > 0 && dfGenotype > 0 ? MSG / MSE : 0;
    const FReplication =
      design !== "CRD" && MSE > 0 && dfReplication > 0 ? MSR / MSE : 0;

    // Calculate p-values using our F-distribution implementation
    const pValueGenotype =
      dfGenotype > 0 && dfError > 0
        ? calculatePValue(FGenotype, dfGenotype, dfError)
        : 1;
    const pValueReplication =
      design !== "CRD" && dfReplication > 0 && dfError > 0
        ? calculatePValue(FReplication, dfReplication, dfError)
        : 1;

    // Calculate coefficient of variation
    const CV = (Math.sqrt(MSE) / grandMean) * 100;

    return {
      design: design,
      genotypes: genotypes,
      replications: replications,
      totalObservations: totalObservations,
      grandMean: grandMean,
      genotypeMeans: genotypeMeans,
      SST: SST,
      SSG: SSG,
      SSR: SSR,
      SSE: SSE,
      dfTotal: totalObservations - 1,
      dfGenotype: dfGenotype,
      dfReplication: design === "CRD" ? 0 : dfReplication,
      dfError: dfError,
      MSG: MSG,
      MSR: MSR,
      MSE: MSE,
      FGenotype: FGenotype,
      FReplication: FReplication,
      pValueGenotype: pValueGenotype,
      pValueReplication: pValueReplication,
      CV: CV,
      genotypeTotals: genotypeTotals,
      replicationTotals: replicationTotals,
    };
  }

  // F-distribution p-value calculation
  function calculatePValue(F, df1, df2) {
    if (F <= 0 || df1 <= 0 || df2 <= 0 || !isFinite(F)) return 1;

    // Implementation using regularized incomplete beta function
    try {
      const x = df2 / (df2 + df1 * F);
      return incompleteBeta(x, df2 / 2, df1 / 2);
    } catch (e) {
      console.error("P-value calculation error:", e);
      return 1;
    }
  }

  // Incomplete beta function implementation
  function incompleteBeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    if (a <= 0 || b <= 0) return 1;

    // Use continued fraction approximation when x < (a+1)/(a+b+2)
    if (x < (a + 1) / (a + b + 2)) {
      return (
        ((Math.pow(x, a) * Math.pow(1 - x, b)) / (a * beta(a, b))) *
        continuedFraction(x, a, b)
      );
    } else {
      // Use symmetry property I_x(a,b) = 1 - I_{1-x}(b,a)
      return 1 - incompleteBeta(1 - x, b, a);
    }
  }

  // Continued fraction approximation for incomplete beta
  function continuedFraction(x, a, b) {
    const maxIterations = 100;
    const epsilon = 1e-10;

    let result = 1;
    let c = 1;
    let d = 1 - ((a + b) * x) / (a + 1);

    if (Math.abs(d) < epsilon) d = epsilon;
    d = 1 / d;
    let h = d;

    for (let i = 1; i <= maxIterations; i++) {
      const m = i / 2;
      let numerator;

      if (i % 2 === 0) {
        numerator = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
      } else {
        numerator =
          -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
      }

      d = 1 + numerator * d;
      if (Math.abs(d) < epsilon) d = epsilon;
      d = 1 / d;

      c = 1 + numerator / c;
      if (Math.abs(c) < epsilon) c = epsilon;

      const delta = c * d;
      h *= delta;

      if (Math.abs(delta - 1) < epsilon) break;
    }

    return h;
  }

  // Beta function using gamma functions
  function beta(a, b) {
    return Math.exp(logGamma(a) + logGamma(b) - logGamma(a + b));
  }

  // Natural log of gamma function using Lanczos approximation
  function logGamma(z) {
    // Lanczos coefficients
    const g = 7;
    const p = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];

    // Reflection formula
    if (z < 0.5) {
      return (
        Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z)
      );
    }

    z -= 1;
    let x = p[0];
    for (let i = 1; i < p.length; i++) {
      x += p[i] / (z + i);
    }
    const t = z + g + 0.5;

    return (
      0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
    );
  }

  function performPostHocTest(data, result) {
    const { genotypes, genotypeMeans, MSE, replications } = result;

    // Calculate standard error
    const SE = Math.sqrt(MSE / replications);
    const qCritical = getTukeyCriticalValue(genotypes, result.dfError);
    const HSD = qCritical * SE;

    // Generate all pairwise comparisons
    postHocComparisons = [];

    for (let i = 0; i < genotypes - 1; i++) {
      for (let j = i + 1; j < genotypes; j++) {
        const diff = genotypeMeans[i] - genotypeMeans[j];
        const qValue = Math.abs(diff) / SE;
        const pValue = 1 - tukeyCDF(qValue, genotypes, result.dfError);

        postHocComparisons.push({
          comparison: `T${i + 1} vs T${j + 1}`,
          difference: diff,
          stdError: SE,
          qValue: qValue,
          pValue: pValue,
          significant: Math.abs(diff) > HSD,
        });
      }
    }

    // Sort by absolute difference (largest first)
    postHocComparisons.sort(
      (a, b) => Math.abs(b.difference) - Math.abs(a.difference)
    );

    // Display results
    displayPostHocResults(postHocComparisons);

    // Update effect size chart
    updateEffectSizeChart();
  }

  // Tukey's HSD critical value approximation
  function getTukeyCriticalValue(k, df) {
    // Approximation from Table Lookup
    const table = {
      2: { 0.05: 2.77, 0.01: 3.64, 0.001: 4.9 },
      3: { 0.05: 3.31, 0.01: 4.12, 0.001: 5.3 },
      4: { 0.05: 3.63, 0.01: 4.4, 0.001: 5.6 },
      5: { 0.05: 3.86, 0.01: 4.6, 0.001: 5.8 },
      6: { 0.05: 4.03, 0.01: 4.76, 0.001: 5.99 },
      7: { 0.05: 4.17, 0.01: 4.88, 0.001: 6.1 },
      8: { 0.05: 4.29, 0.01: 5.0, 0.001: 6.3 },
      9: { 0.05: 4.39, 0.01: 5.1, 0.001: 6.4 },
      10: { 0.05: 4.47, 0.01: 5.18, 0.001: 6.5 },
    };

    // Use infinity for df > 30 (approximation)
    const dfKey = df >= 30 ? Infinity : df;

    // Linear interpolation for k values not in table
    if (k > 10) {
      // Approximation for large k
      const z = 3.24 + 0.23 * Math.log(k);
      return z;
    }

    return table[k]?.[0.05] || 4.0; // Default fallback
  }

  // Tukey's CDF approximation
  function tukeyCDF(q, k, df) {
    // Simple approximation using studentized range distribution
    if (df === Infinity) {
      // Normal approximation
      return Math.pow(
        1 -
          math.erfc(q / Math.sqrt(2)) +
          (k - 1) * Math.pow(math.erfc(q / Math.sqrt(2)), k - 1),
        k
      );
    } else {
      // Simple approximation
      return 1 - Math.pow(1 - studentTCDF(q, df), k);
    }
  }

  // Student's t CDF approximation
  function studentTCDF(t, df) {
    if (df <= 0) return 0.5;

    const x = df / (df + t * t);
    const ibeta = incompleteBeta(x, df / 2, 0.5);

    if (t < 0) {
      return 0.5 * ibeta;
    } else {
      return 1 - 0.5 * ibeta;
    }
  }

  function displayDataInfo(result) {
    designTypeOutput.textContent = result.design;
    genotypeCount.textContent = result.genotypes;
    replicationCount.textContent = result.replications;
    totalObservations.textContent = result.totalObservations;
    dataInfoSection.classList.remove("hidden");
  }

  function displayDescriptiveStats(data, result) {
    statsTableBody.innerHTML = "";

    data.forEach((row, i) => {
      const mean = result.genotypeMeans[i];
      const squaredDiffs = row.map((val) => Math.pow(val - mean, 2));
      const variance = math.sum(squaredDiffs) / (row.length - 1);
      const stdDev = Math.sqrt(variance);
      const min = Math.min(...row);
      const max = Math.max(...row);
      const range = max - min;

      const rowEl = document.createElement("tr");

      rowEl.appendChild(createTableCell(`T${i + 1}`));
      rowEl.appendChild(createTableCell(mean.toFixed(4)));
      rowEl.appendChild(createTableCell(stdDev.toFixed(4)));
      rowEl.appendChild(createTableCell(min.toFixed(2)));
      rowEl.appendChild(createTableCell(max.toFixed(2)));
      rowEl.appendChild(createTableCell(range.toFixed(2)));

      statsTableBody.appendChild(rowEl);
    });

    // Add grand mean row
    const grandRow = document.createElement("tr");
    grandRow.style.fontWeight = "bold";

    grandRow.appendChild(createTableCell("Grand Mean"));
    grandRow.appendChild(createTableCell(result.grandMean.toFixed(4)));
    grandRow.appendChild(createTableCell(""));
    grandRow.appendChild(createTableCell(""));
    grandRow.appendChild(createTableCell(""));
    grandRow.appendChild(createTableCell(""));

    statsTableBody.appendChild(grandRow);

    descriptiveStats.classList.remove("hidden");
  }

  function displayANOVATable(result) {
    anovaTableBody.innerHTML = "";

    // Genotype row (always present)
    addANOVATableRow(
      "Genotype",
      result.dfGenotype,
      result.SSG,
      result.MSG,
      result.FGenotype,
      result.pValueGenotype
    );

    // Replication/Block row (present for RBD and LSD)
    if (result.design !== "CRD") {
      const label = result.design === "LSD" ? "Row+Column" : "Replication";
      addANOVATableRow(
        label,
        result.dfReplication,
        result.SSR,
        result.MSR,
        result.FReplication,
        result.pValueReplication
      );
    }

    // Error row (always present)
    addANOVATableRow(
      "Error",
      result.dfError,
      result.SSE,
      result.MSE,
      null,
      null
    );

    // Total row (always present)
    addANOVATableRow("Total", result.dfTotal, result.SST, null, null, null);

    // Add CV row
    const cvRow = document.createElement("tr");
    cvRow.style.fontWeight = "bold";

    const cvCell = document.createElement("td");
    cvCell.colSpan = 7;
    cvCell.textContent = `Coefficient of Variation (CV): ${result.CV.toFixed(
      2
    )}%`;
    cvRow.appendChild(cvCell);

    anovaTableBody.appendChild(cvRow);

    anovaResults.classList.remove("hidden");
  }

  function displayPostHocResults(comparisons) {
    postHocTableBody.innerHTML = "";

    comparisons.forEach((comp) => {
      const row = document.createElement("tr");

      row.appendChild(createTableCell(comp.comparison));
      row.appendChild(createTableCell(comp.difference.toFixed(4)));
      row.appendChild(createTableCell(comp.stdError.toFixed(4)));
      row.appendChild(createTableCell(comp.qValue.toFixed(4)));

      // p-value
      const pCell = document.createElement("td");
      pCell.textContent =
        comp.pValue < 0.0001 ? "<0.0001" : comp.pValue.toFixed(6);
      row.appendChild(pCell);

      // Significance
      const sigCell = document.createElement("td");
      const sigClass = getSignificanceClass(comp.pValue);
      const sigText = getSignificanceStars(comp.pValue);
      sigCell.innerHTML = `<span class="significance ${sigClass}">${sigText}</span>`;
      row.appendChild(sigCell);

      if (comp.significant) {
        row.style.backgroundColor = "rgba(46, 204, 113, 0.1)";
      }

      postHocTableBody.appendChild(row);
    });

    postHocResults.classList.remove("hidden");
  }

  function displayCharts(data, result) {
    // Destroy previous charts if they exist
    if (meansChart) meansChart.destroy();
    if (significanceChart) significanceChart.destroy();
    if (variabilityChart) variabilityChart.destroy();
    if (effectSizeChart) effectSizeChart.destroy();

    // Prepare data for charts
    const treatmentLabels = result.genotypeMeans.map(
      (_, i) => `Treatment ${i + 1}`
    );
    const treatmentMeans = result.genotypeMeans;
    const treatmentStdDevs = result.genotypeMeans.map((mean, i) => {
      const squaredDiffs = data[i].map((val) => Math.pow(val - mean, 2));
      return Math.sqrt(math.sum(squaredDiffs) / (data[i].length - 1));
    });

    // 1. Treatment Means Comparison Chart
    meansChart = new Chart(meansChartCtx, {
      type: "bar",
      data: {
        labels: treatmentLabels,
        datasets: [
          {
            label: "Mean Value",
            data: treatmentMeans,
            backgroundColor: "rgba(54, 162, 235, 0.7)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: "Mean Value",
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: "Comparison of Treatment Means",
          },
        },
      },
    });

    // 2. ANOVA Significance Chart
    const sigData = [
      result.pValueGenotype,
      result.design !== "CRD" ? result.pValueReplication : null,
    ].filter((val) => val !== null);

    const sigLabels = [
      "Treatment Effect",
      result.design === "LSD" ? "Row+Column Effect" : "Block Effect",
    ].filter((_, i) => sigData[i] !== undefined);

    significanceChart = new Chart(significanceChartCtx, {
      type: "bar",
      data: {
        labels: sigLabels,
        datasets: [
          {
            label: "p-value",
            data: sigData,
            backgroundColor: sigData.map((p) =>
              p < 0.05 ? "rgba(255, 99, 132, 0.7)" : "rgba(75, 192, 192, 0.7)"
            ),
            borderColor: sigData.map((p) =>
              p < 0.05 ? "rgba(255, 99, 132, 1)" : "rgba(75, 192, 192, 1)"
            ),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 1,
            title: {
              display: true,
              text: "p-value",
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: "ANOVA Significance Levels",
          },
          annotation: {
            annotations: {
              line1: {
                type: "line",
                yMin: 0.05,
                yMax: 0.05,
                borderColor: "rgb(255, 0, 0)",
                borderWidth: 2,
                borderDash: [6, 6],
                label: {
                  content: "Significance Threshold (0.05)",
                  enabled: true,
                  position: "right",
                },
              },
            },
          },
        },
      },
    });

    // 3. Treatment Variability Chart
    variabilityChart = new Chart(variabilityChartCtx, {
      type: "line",
      data: {
        labels: treatmentLabels,
        datasets: [
          {
            label: "Mean ± SD",
            data: treatmentMeans,
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
          },
          {
            label: "Standard Deviation",
            data: treatmentStdDevs,
            backgroundColor: "rgba(255, 159, 64, 0.2)",
            borderColor: "rgba(255, 159, 64, 1)",
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: "Value",
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: "Treatment Means and Variability",
          },
        },
      },
    });

    // 4. Effect Size Chart (will be updated if post-hoc is performed)
    effectSizeChart = new Chart(effectSizeChartCtx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Mean Difference",
            data: [],
            backgroundColor: [],
            borderColor: [],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        scales: {
          x: {
            beginAtZero: false,
            title: {
              display: true,
              text: "Mean Difference",
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: "Top Treatment Comparisons",
          },
        },
      },
    });

    // Show charts container
    chartsContainer.classList.remove("hidden");
  }

  function updateEffectSizeChart() {
    if (!postHocComparisons || postHocComparisons.length === 0) return;

    const comparisons = postHocComparisons
      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
      .slice(0, 10); // Show top 10 comparisons

    effectSizeChart.data.labels = comparisons.map((c) => c.comparison);
    effectSizeChart.data.datasets[0].data = comparisons.map(
      (c) => c.difference
    );
    effectSizeChart.data.datasets[0].backgroundColor = comparisons.map((c) =>
      c.significant ? "rgba(255, 99, 132, 0.7)" : "rgba(54, 162, 235, 0.7)"
    );
    effectSizeChart.data.datasets[0].borderColor = comparisons.map((c) =>
      c.significant ? "rgba(255, 99, 132, 1)" : "rgba(54, 162, 235, 1)"
    );
    effectSizeChart.update();
  }

  function addANOVATableRow(source, df, SS, MS, F, pValue) {
    const row = document.createElement("tr");

    // Source
    row.appendChild(createTableCell(source));

    // Degrees of Freedom
    row.appendChild(createTableCell(df.toFixed(df % 1 === 0 ? 0 : 2)));

    // Sum of Squares
    row.appendChild(createTableCell(SS.toFixed(4)));

    // Mean Square
    row.appendChild(createTableCell(MS ? MS.toFixed(4) : ""));

    // F-value
    row.appendChild(createTableCell(F ? F.toFixed(4) : ""));

    // p-value
    const pCell = document.createElement("td");
    if (pValue) {
      pCell.textContent = pValue < 0.0001 ? "<0.0001" : pValue.toFixed(6);
    }
    row.appendChild(pCell);

    // Significance
    const sigCell = document.createElement("td");
    if (pValue) {
      const sigClass = getSignificanceClass(pValue);
      const sigText = getSignificanceStars(pValue);
      sigCell.innerHTML = `<span class="significance ${sigClass}">${sigText}</span>`;
    }
    row.appendChild(sigCell);

    anovaTableBody.appendChild(row);
  }

  function createTableCell(content) {
    const cell = document.createElement("td");
    cell.textContent = content;
    return cell;
  }

  function getSignificanceStars(pValue) {
    if (!pValue) return "";
    if (pValue < 0.001) return "***";
    if (pValue < 0.01) return "**";
    if (pValue < 0.05) return "*";
    return "ns";
  }

  function getSignificanceClass(pValue) {
    if (!pValue) return "";
    if (pValue < 0.001) return "sig-0";
    if (pValue < 0.01) return "sig-1";
    if (pValue < 0.05) return "sig-2";
    return "";
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");

    // Scroll to error message
    errorMessage.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Export functionality
  exportCsvBtn.addEventListener("click", function () {
    if (!currentResult) return;

    // Prepare CSV data
    let csvData = "ANOVA Results\n\n";

    // Experimental design info
    csvData += "Experimental Design Information\n";
    csvData += `Design Type,${currentResult.design}\n`;
    csvData += `Genotypes,${currentResult.genotypes}\n`;
    csvData += `Replications,${currentResult.replications}\n`;
    csvData += `Total Observations,${currentResult.totalObservations}\n\n`;

    // ANOVA table
    csvData += "ANOVA Table\n";
    csvData += "Source,df,SS,MS,F-value,p-value,Sig.\n";

    // Genotype row
    csvData += `Genotype,${
      currentResult.dfGenotype
    },${currentResult.SSG.toFixed(4)},${currentResult.MSG.toFixed(
      4
    )},${currentResult.FGenotype.toFixed(4)},${
      currentResult.pValueGenotype < 0.0001
        ? "<0.0001"
        : currentResult.pValueGenotype.toFixed(6)
    },${getSignificanceStars(currentResult.pValueGenotype)}\n`;

    // Replication row if present
    if (currentResult.design !== "CRD") {
      const label =
        currentResult.design === "LSD" ? "Row+Column" : "Replication";
      csvData += `${label},${
        currentResult.dfReplication
      },${currentResult.SSR.toFixed(4)},${currentResult.MSR.toFixed(
        4
      )},${currentResult.FReplication.toFixed(4)},${
        currentResult.pValueReplication < 0.0001
          ? "<0.0001"
          : currentResult.pValueReplication.toFixed(6)
      },${getSignificanceStars(currentResult.pValueReplication)}\n`;
    }

    // Error and Total rows
    csvData += `Error,${currentResult.dfError},${currentResult.SSE.toFixed(
      4
    )},${currentResult.MSE.toFixed(4)},,,\n`;
    csvData += `Total,${currentResult.dfTotal},${currentResult.SST.toFixed(
      4
    )},,,\n\n`;
    csvData += `Coefficient of Variation (CV),${currentResult.CV.toFixed(
      2
    )}%\n`;

    // Create download link
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `anova_results_${currentResult.design}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  exportJsonBtn.addEventListener("click", function () {
    if (!currentResult) return;

    // Clone the result to avoid modifying the original
    const resultToExport = JSON.parse(JSON.stringify(currentResult));

    // Format numbers for better readability
    Object.keys(resultToExport).forEach((key) => {
      if (typeof resultToExport[key] === "number") {
        resultToExport[key] = parseFloat(resultToExport[key].toFixed(6));
      }
    });

    // Convert to JSON string with pretty printing
    const jsonData = JSON.stringify(resultToExport, null, 2);

    // Create download link
    const blob = new Blob([jsonData], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `anova_results_${currentResult.design}.json`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // Initialize
  updateDesignRequirements();
});
