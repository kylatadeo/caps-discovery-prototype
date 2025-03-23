google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(termGPA);
google.charts.setOnLoadCallback(drawCourseGradeTrendChart);

//fetching data from json files
async function fetchJSON(file) {
  try {
      let response = await fetch(file);
      return await response.json();
  } catch (error) {
      console.error("Error fetching JSON:", error);
      return null;
  }
}

//calculating GPA per term
async function calculateGPAData() {
  try {
      const studentCourseHistory = await fetchJSON('student-course-history.json');
      const coursesData = await fetchJSON('courses.json');

      if (!studentCourseHistory || !coursesData) {
          console.error("Error: Missing required data.");
          return [];
      }

      const allCourses = Object.values(coursesData).flat(); 
      const courseMap = new Map(allCourses.map(c => [c.code, c.units]));

      let gpaData = [['Academic Term', 'GPA']]; // First row (headers) for Google Charts

      studentCourseHistory.forEach(termData => {
          let totalWeighted = 0;
          let totalUnits = 0;

          termData.courses.forEach(course => {
              const units = courseMap.get(course.code) || 0;
              if (!isNaN(course.grade) && units > 0) {
                  totalWeighted += course.grade * units;
                  totalUnits += units;
              }
          });

          if (totalUnits > 0) {
              const gpa = parseFloat((totalWeighted / totalUnits).toFixed(2));
              gpaData.push([termData.term, gpa]); // Add computed term and GPA
          }
      });

      console.log("Generated GPA Data:", gpaData); // Debugging output
      return gpaData;
  } catch (error) {
      console.error("Error processing GPA:", error);
      return [];
  }
}

//Term vs GPA chart
async function termGPA() {
  const gpaData = await calculateGPAData();
  
  if (gpaData.length <= 1) {
      console.error("No valid GPA data found.");
      return;
  }

  var data = google.visualization.arrayToDataTable(gpaData);

  var options = {
      colors: ['#8d1436'],
      hAxis: { textStyle: { fontSize: 12, color: '#333'} },
      vAxis: {
          minValue: 1, 
          maxValue: 3,
          direction: -1, 
          viewWindow: { min: 1, max: 3 }, 
          gridlines: { count: 5, color: '#ccc' }
      },
      legend: { position: 'none' },
      pointShape: 'circle',
      pointSize: 7,
      chartArea: { left: 30, top: 5, right: 10, bottom: 40, width: '90%', height: '80%' }
  };

  var chart = new google.visualization.LineChart(document.getElementById('chart1_div'));
  chart.draw(data, options);

   // Resize event listener
   window.addEventListener('resize', function() {
    chart.draw(data, options);
  });
  
   // Select the first data point by default
   var firstTerm = data.getValue(0, 0); // Get the first term value

   updateTable(firstTerm);
   updateCourseGradeTrends(firstTerm);
   updateDifficultyMatrix(firstTerm);
   document.getElementById("termLabel").textContent = `TERM ${firstTerm}`;document.getElementById("insightsLabel").textContent = `Insights on TERM ${firstTerm}`;
  

  google.visualization.events.addListener(chart, 'select', function () {
    var selection = chart.getSelection();
    if (selection.length > 0) {
        var term = data.getValue(selection[0].row, 0);
        updateTable(term);
        updateCourseGradeTrends(term);
        updateDifficultyMatrix(term);
         // Update the term label dynamically
        document.getElementById("termLabel").textContent = `TERM ${term}`;
        document.getElementById("insightsLabel").textContent = `Insights on TERM ${term}`;
        }
});
}

//cumulative GPA
async function updateCumulativeGPA() {
    try {
        const studentCourseHistory = await fetchJSON('student-course-history.json');
        const coursesData = await fetchJSON('courses.json');

        if (!studentCourseHistory || !coursesData) {
            console.error("Error: Missing required data.");
            return;
        }

        const allCourses = Object.values(coursesData).flat(); 
        const courseMap = new Map(allCourses.map(c => [c.code, c.units]));

        let cumulativeWeighted = 0;
        let cumulativeUnits = 0;

        studentCourseHistory.forEach(termData => {
            termData.courses.forEach(course => {
                const grade = parseFloat(course.grade);
                const units = parseFloat(courseMap.get(course.code));

                // Include only courses with numeric grades and numeric units
                if (!isNaN(grade) && !isNaN(units) && units > 0) {
                    cumulativeWeighted += grade * units;
                    cumulativeUnits += units;
                }
            });
        });

        const cumulativeGPA = cumulativeUnits > 0 ? parseFloat((cumulativeWeighted / cumulativeUnits).toFixed(2)) : null;

        if (cumulativeGPA !== null) {
            // Insert GPA into the <p> element
            document.getElementById("cumulative-gpa").textContent = `${cumulativeGPA}`;
        }
    } catch (error) {
        console.error("Error processing Cumulative GPA:", error);
    }
}

// Call function after the page loads
document.addEventListener("DOMContentLoaded", updateCumulativeGPA);

//Remarks table
let currentPage = 1;
const rowsPerPage = 5;
let currentCourses = [];

async function updateTable(selectedTerm) {
    const studentCourseHistory = await fetchJSON('student-course-history.json');
    if (!studentCourseHistory) return;

    const termData = studentCourseHistory.find(term => term.term === selectedTerm);
    if (!termData) {
        console.error("No data found for term:", selectedTerm);
        return;
    }

    const performanceLevels = [
        { min: 1, max: 1.49, level: "Outstanding" },
        { min: 1.5, max: 1.99, level: "Above Average" },
        { min: 2, max: 2.49, level: "Competent" },
        { min: 2.5, max: 2.99, level: "Acceptable" },
        { min: 3, max: 3, level: "Minimum Competence" },
        { min: 4, max: 4, level: "At Risk" },
        { min: 5, max: 5, level: "Failed" }
    ];

    function getPerformanceLevel(grade) {
        if (grade === "INC") return "Pending Completion";
        if (grade === "DRP") return "Withdrew";
        const numericGrade = parseFloat(grade);
        if (!isNaN(numericGrade)) {
            const level = performanceLevels.find(pl => numericGrade >= pl.min && numericGrade <= pl.max);
            return level ? level.level : "Unknown";
        }
        return "Unknown";
    }

    currentCourses = termData.courses.map(course => ({
        code: course.code,
        grade: course.grade,
        performance: getPerformanceLevel(course.grade)
    }));

    currentPage = 1; // Reset to first page when updating
    updateTableDisplay();
}

function updateTableDisplay() {
    let tableBody = document.getElementById("gradeRemarks");
    tableBody.innerHTML = ""; 

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedCourses = currentCourses.slice(start, end);

    paginatedCourses.forEach(course => {
        let row = `<tr>
            <td>${course.code}</td>
            <td>${course.grade}</td>
            <td>${course.performance}</td>
        </tr>`;
        tableBody.innerHTML += row;
    });

    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = end >= currentCourses.length;
    document.getElementById('pageInfo').textContent = `Page ${currentPage}`;
}

// Event Listeners for Pagination
function pagination() 
    {document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updateTableDisplay();
        }
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
        if (currentPage * rowsPerPage < currentCourses.length) {
            currentPage++;
            updateTableDisplay();
        }
    });
}

// Function to update course grade trends dynamically
async function updateCourseGradeTrends(selectedTerm) {
  const studentCourseHistory = await fetchJSON('student-course-history.json');
  const coursesData = await fetchJSON('courses.json');

  if (!studentCourseHistory || !coursesData) {
      console.error("Error: Missing required data.");
      return;
  }

  // Find the selected term's course data
  const termData = studentCourseHistory.find(term => term.term === selectedTerm);
  if (!termData) {
      console.error("No data found for term:", selectedTerm);
      return;
  }

  // Flatten course categories and create a map for easy lookup
  const allCourses = Object.values(coursesData).flat(); 
  const courseMap = new Map(allCourses.map(course => [course.code, course]));

  // Prepare data array for Google Charts
  let chartData = [['Course', 'Grades', 'Historical Grades']];

  termData.courses.forEach(course => {
      const matchedCourse = courseMap.get(course.code);
      if (matchedCourse) {
          chartData.push([
              course.code, 
              parseFloat(course.grade) || 0,  // Current term grade
              parseFloat(matchedCourse.historicalgrade) || 0  // Historical grade
          ]);
      }
  });

  drawCourseGradeTrendChart(chartData);
}

// Function to draw the Course Grade Trend Chart
function drawCourseGradeTrendChart(chartData) {
  var data = google.visualization.arrayToDataTable(chartData);

  var options = {
    title: '',
    chartArea: { width: '80%', height: '70%' },
    legend: { position: 'bottom' },
    hAxis: { 
      textStyle: { fontSize: 12 }, 
    },
    vAxis: { 
      minValue: 1, 
      maxValue: 3, 
      direction: -1,
      viewWindow: { min: 1, max: 3 }, 
      gridlines: { count: 5, color: '#ccc' },
      minorGridlines: { count: 1, color: '#eee' },
      ticks: [1.0, 1.5, 2.0, 2.5, 3.0]
    },
    series: {
      0: { color: '#00563f', pointShape: 'circle', pointSize: 7}, // Solid green line
      1: { color: '#8d1436', lineDashStyle: [10, 5], pointShape: 'star',  pointSize: 7} // Dashed maroon line
    },
    chartArea: { left: 30, top: 20, right: 10, bottom: 40, width: '90%', height: '80%' }
  };

  var chart = new google.visualization.LineChart(document.getElementById('chart3_div'));
  chart.draw(data, options);

   // Resize event listener
   window.addEventListener('resize', function() {
    chart.draw(data, options);
  });
}

// Define difficulty color mapping based on the conditions
function getDifficultyColor(value) {
  if (value === 0) return "#d1d5db";
  if (value < 0.1) return "#2a7570";
  if (value < 0.3) return "#93b0bf";
  if (value < 0.5) return "#d8c9de";
  if (value < 0.7) return "#b67496";
  if (value < 0.9) return "#a44868";
  return "#8d1436"; // Value == 1
}

async function updateDifficultyMatrix(selectedTerm) {
  const studentCourseHistory = await fetchJSON('student-course-history.json');
  const coursesData = await fetchJSON('courses.json');

  if (!studentCourseHistory || !coursesData) {
      console.error("Error: Missing required data.");
      return;
  }

  // 🔹 Find the selected term's courses
  const termData = studentCourseHistory.find(term => term.term === selectedTerm);
  if (!termData) {
      console.error("No data found for term:", selectedTerm);
      return;
  }

  console.log("Selected Term:", selectedTerm);

  const difficultyIndex = [
      { label: "Very Easy", value: 0.1 },
      { label: "Easy", value: 0.3 },
      { label: "Moderate", value: 0.5 },
      { label: "Difficult", value: 0.7 },
      { label: "Very Difficult", value: 0.9 }
  ];

  function getDifficultyIndex(difficulty) {
      if (difficulty) {
          const index = difficultyIndex.find(di => difficulty === di.label);
          return index ? index.value : 0; // Return 0 if difficulty is unknown
      }
      return 0;
  }

  console.log("Courses in Selected Term:", termData.courses);

  // Flatten course categories and create a map for easy lookup
  const allCourses = Object.values(coursesData).flat();
  const courseMap = new Map(allCourses.map(course => [course.code, course]));

  console.log("Course Map (Flattened):", courseMap); // ✅ Debugging: Ensure all courses are mapped

  // 🔹 Extract course codes & difficulty index from student history
  const courses = termData.courses.map(course => {
      const courseDetails = courseMap.get(course.code);
      const difficultyLabel = courseDetails ? courseDetails.difficulty : null;
      return {
          code: course.code,
          difficulty: difficultyLabel,
          difficultyIndex: getDifficultyIndex(difficultyLabel)
      };
  });

  console.log("Mapped Courses for Matrix:", courses); // ✅ Debugging: Check if difficulties are correctly assigned

  // 🔹 Generate matrix table
  generateMatrixTable(courses, selectedTerm);
}

function generateMatrixTable(courses, term) {
  const table = document.getElementById("difficultyMatrix");
  table.innerHTML = ""; // Clear previous table

  // 🔹 Table Header Row
  let headerRow = "<tr><th></th>";
  courses.forEach(course => {
      headerRow += `<th>${course.code}</th>`;
  });
  headerRow += "</tr>";
  table.innerHTML += headerRow;

  // Generate Matrix Rows (Lower Triangle Only)
  courses.forEach((courseA, i) => {
      let row = `<tr><th>${courseA.code}</th>`;
      courses.forEach((courseB, j) => {
          let cellContent = "";
          if (j <= i) { // Fill only the lower triangular part (including diagonal)
              let diffValue;
              if (i === j) {
                  diffValue = 0; // Set diagonal values to 1 (self-comparison)
              } else {
                  let diffA = courseA.difficultyIndex || 0;
                  let diffB = courseB.difficultyIndex || 0;
                  diffValue = diffA + diffB;
                  if (diffValue > 1) diffValue = 1; // Cap at 1
              }
              let cellColor = getDifficultyColor(diffValue);
              cellContent = `<td style="background-color:${cellColor}">${diffValue.toFixed(1)}</td>`;
          } else {
              cellContent = `<td></td>`; // Leave upper triangle empty
          }
          row += cellContent;
      });
      row += "</tr>";
      table.innerHTML += row;
  });
}

async function updateUnitProgress() {
    try {
        const studentCourseHistory = await fetchJSON('student-course-history.json');
        const coursesData = await fetchJSON('courses.json');

        if (!studentCourseHistory || !coursesData) {
            console.error("Error: Missing required data.");
            return;
        }

        console.log("Loaded studentCourseHistory:", studentCourseHistory);
        console.log("Loaded coursesData:", coursesData);

        // Convert courses into a map for easy lookup
        const allCourses = Object.values(coursesData).flat();
        const courseMap = new Map(allCourses.map(c => [c.code, parseFloat(c.units)])); // Ensure units are numbers

        let completedUnits = 0;
        let inProgressUnits = 0;
        const totalUnitsRequired = 160;

        studentCourseHistory.forEach(termData => {
            termData.courses.forEach(course => {
                const units = courseMap.get(course.code);
                if (!isNaN(units)) {
                    if (course.grade === null || course.grade === '') {
                        inProgressUnits += units; // Ongoing courses
                    } else if (!isNaN(parseFloat(course.grade))) {
                        completedUnits += units; // Completed courses
                    }
                }
            });
        });

        const notStartedUnits = totalUnitsRequired - (completedUnits + inProgressUnits);

        // Calculate percentages
        const percentCompleted = ((completedUnits / totalUnitsRequired) * 100).toFixed(1);
        const percentInProgress = ((inProgressUnits / totalUnitsRequired) * 100).toFixed(1);
        const percentNotStarted = ((notStartedUnits / totalUnitsRequired) * 100).toFixed(1);

        let classification = "Freshman";
        if (percentCompleted > 75) {
            classification = percentCompleted === 100 ? "Graduating" : "Senior";
        } else if (percentCompleted > 50) {
            classification = "Junior";
        } else if (percentCompleted > 25) {
            classification = "Sophomore";
        }

        let enrollmentStatus = inProgressUnits > 0 ? "Enrolled" : "Not Enrolled";

        // Debugging
        console.log("Computed Units:", { completedUnits, inProgressUnits, notStartedUnits });
        console.log("Computed Percentages:", { percentCompleted, percentInProgress, percentNotStarted });

        // Ensure elements exist before updating
        if (document.getElementById("units-completed")) {
            document.getElementById("units-completed").textContent = 
                `(${completedUnits} units taken out of ${totalUnitsRequired} units)`;
        }
        if (document.getElementById("units-in-progress")) {
            document.getElementById("units-in-progress").textContent = `${inProgressUnits} units on going`;
        }
        if (document.getElementById("units-not-started")) {
            document.getElementById("units-not-started").textContent = `${notStartedUnits} units to be taken`;
        }
        if (document.getElementById("percent-completed")) {
            document.getElementById("percent-completed").textContent = `${percentCompleted}%`;
        }
        if (document.getElementById("percent-completed1")) {
            document.getElementById("percent-completed1").textContent = `${percentCompleted}%`;
        }
        if (document.getElementById("percent-in-progress")) {
            document.getElementById("percent-in-progress").textContent = `${percentInProgress}%`;
        }
        if (document.getElementById("percent-not-started")) {
            document.getElementById("percent-not-started").textContent = `${percentNotStarted}%`;
        }
        if (document.getElementById("classification")) {
            document.getElementById("classification").textContent = classification;
        }
        if (document.getElementById("enrollment-status")) {
            document.getElementById("enrollment-status").textContent = enrollmentStatus;
        }

        // Update progress bar widths
        if (document.querySelector(".progress-fill")) {
            document.querySelector(".progress-fill").style.width = `${percentCompleted}%`;
        }
        if (document.querySelector(".progress-ongoing")) {
            document.querySelector(".progress-ongoing").style.width = `${percentInProgress}%`;
        }
        if (document.querySelector(".progress-remaining")) {
            document.querySelector(".progress-remaining").style.width = `${percentNotStarted}%`;
        }

        console.log("Progress bar updated!");
    } catch (error) {
        console.error("Error updating unit progress:", error);
    }
}

// Run when page loads
document.addEventListener("DOMContentLoaded", updateUnitProgress);

async function SPMF() {
    try {
        // Fetch student course history
        const historyResponse = await fetch('student-course-history.json');
        const historyData = await historyResponse.json();

        // Fetch course details
        const coursesResponse = await fetch('courses.json');
        const coursesData = await coursesResponse.json();

        // Flatten courses.json for easier lookup
        let courseMap = {};
        Object.values(coursesData).forEach(category => {
            category.forEach(course => {
                courseMap[course.code] = course.units; // Store units by course code
            });
        });

        const container = document.getElementById("courseContainer");
        container.innerHTML = ""; // Clear previous content

        historyData.forEach(termData => {
            const column = document.createElement("div");
            column.classList.add("column");

            // Add term title
            const termTitle = document.createElement("div");
            termTitle.classList.add("term-title");
            termTitle.textContent = termData.term;
            column.appendChild(termTitle);

            let totalUnits = 0; // Initialize unit counter

            // Create a wrapper for courses
            const courseWrapper = document.createElement("div");
            courseWrapper.classList.add("course-wrapper");

            // Add courses
            termData.courses.forEach(course => {
                const courseBox = document.createElement("div");
                courseBox.classList.add("course-box");
                courseBox.textContent = course.code; // Display course code

                // Assign class based on grade
                if ("grade" in course) {
                    if (course.grade === "") {
                        courseBox.classList.add("yellow"); // Blank grade
                    } else {
                        courseBox.classList.add("green"); // Has a grade
                    }
                } else {
                    courseBox.classList.add("light-gray"); // No grade field
                }

                // Add course units if found and is a valid number
                let units = courseMap[course.code];
                if (!isNaN(units) && units !== "" && units !== null) {
                    totalUnits += Number(units);
                }

                courseWrapper.appendChild(courseBox);
            });

            column.appendChild(courseWrapper);

            // Add total units box (placed after courses)
            const totalUnitsBox = document.createElement("div");
            totalUnitsBox.classList.add("total-units");
            totalUnitsBox.textContent = `${totalUnits} units`;
            column.appendChild(totalUnitsBox);

            container.appendChild(column);
        });

    } catch (error) {
        console.error("Error fetching course data:", error);
    }
}

// Fetch and display course data when page loads
document.addEventListener("DOMContentLoaded", SPMF);
