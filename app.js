// Login page
function goToMain() {
  window.location.href = "main-dashboard.html";
}

//inserting nav and sidebar html
function loadComponent(id, file, callback) {
  fetch(file)
    .then(response => response.text())
    .then(data => {
      document.getElementById(id).innerHTML = data;
      if (callback) callback(); // Initialize events AFTER loading
    })
    .catch(error => console.error(`Error loading ${file}:`, error));
}

function initializeMenu() {
  console.log("Initializing menu...");

  const toggleButton = document.querySelector("#navbar-container #toggle-button");
  const sidebar = document.querySelector("#sidebar-container #sidebar");

  if (toggleButton && sidebar) {
    console.log("Toggle button and sidebar found.");
    
    toggleButton.addEventListener("click", () => {
      console.log("Toggle button clicked.");
      sidebar.classList.toggle("close");
    });

  } else {
    console.error("Toggle button or sidebar not found.");
  }
}

// Load navbar and sidebar
loadComponent("navbar-container", "navbar.html", initializeMenu);
loadComponent("sidebar-container", "sidebar.html", initializeMenu);

// Menu toggle and sidebar
const toggleButton = document.getElementById('toggle-button')
const sidebar = document.getElementById('sidebar')

function toggleSideBar() {
  sidebar.classList.toggle('close'); 
}

function toggleSubMenu(button) {
  button.nextElementSibling.classList.toggle('show');
  button.classList.toggle('rotate');
}

// course planning tab contents
function changeTab(index, page) {
  const tabs = document.querySelectorAll(".tab");
  const content = document.getElementById("tabContent");

  // Update active tab styling
  tabs.forEach((tab, i) => {
      tab.classList.toggle("active", i === index);
      tab.classList.toggle("inactive", i !== index);
  });

  // Load HTML content dynamically
  fetch(page)
      .then(response => response.text())
      .then(html => {
          content.innerHTML = html;

          // Reattach event listeners
          if (page === 'course-plan.html') {
            showHideCourseList();
            courseLists(0,'major');
            document.querySelectorAll(".remove-button").forEach(button => {
              button.style.display = "none"; // Hide remove buttons
            });
          }

          if (page === 'student-info.html') {
            termGPA();
            pagination();
            updateCumulativeGPA();
            updateUnitProgress();
          }

          if (page === 'spmf.html'){
            SPMF();
            updateUnitProgress();
          }
      })
      .catch(error => {
          content.innerHTML = "Error loading content.";
          console.error("Error:", error);
      });
}

// Load default tab
changeTab(0, 'student-info.html');

// Function to show and hide courseList-container
function showHideCourseList() {
  const modifyButton = document.getElementById("modify-button");
  const saveButton = document.getElementById("save-button");
  const courseListContainer = document.querySelector(".courseList-container");

  modifyButton.addEventListener("click", function () {
    courseListContainer.classList.remove("hide"); // Show course list
    modifyButton.style.display = "none"; // Hide modify button
    saveButton.disabled = false; // Enable save button

    // Select all remove buttons (including newly added ones)
    document.querySelectorAll(".remove-button").forEach(button => {
      button.style.display = "inline-block"; // Show remove buttons
    });
  });

  saveButton.addEventListener("click", function () {
    courseListContainer.classList.add("hide"); // Hide course list
    modifyButton.style.display = "block"; // Show modify button again
    saveButton.disabled = true; // Disable save button

    // Select all remove buttons (including newly added ones)
    document.querySelectorAll(".remove-button").forEach(button => {
      button.style.display = "none"; // Hide remove buttons
    });
  });
}

// Start of course planning 
let coursePlan = JSON.parse(localStorage.getItem("coursePlan")) || []; 
let courseInfo = [];

// Loading data to the course list, adding courses into the course plan
function courseLists(index, category) {
  const tabs = document.querySelectorAll(".tab1");

  // Update active state
  tabs.forEach((tab, i) => {
      if (i === index) {
          tab.classList.add("active1");
          tab.classList.remove("inactive1");
      } else {
          tab.classList.add("inactive1");
          tab.classList.remove("active1");
      }
  });

  let courseInfoHTML = document.querySelector('.course-list');
  let coursePlanHTML = document.querySelector('.course-plan');
  let totalUnitsText = document.querySelector('.total-units');
  let totalUnits = 0;

  // Check if alert has been shown in this session
  let alertShown = sessionStorage.getItem("alertShown") === "true"; 

  //  Function to Add Course data to Course List
  const addDataToHTML = () => {
    courseInfoHTML.innerHTML = '';
    if (courseInfo.length > 0) {
      courseInfo.forEach(course => {
        let newCourse = document.createElement('tr');
        newCourse.classList.add('course-info');
        newCourse.dataset.code = course.code;
        newCourse.innerHTML = `
          <td>${course.code}</td>
          <td>${course.title}</td>
          <td>${course.units}</td>
          <td class="difficulty">${course.difficulty}</td>
          <td class="performance">${course.performance}</td>
          <td>
            <button class="view-button bg-green button txt-white">View Info</button>
            <button class="add-button bg-blue button txt-white">Add</button>
          </td>`;
        courseInfoHTML.appendChild(newCourse);
      });
    }
  }

  // Event Listener for Add Button
  courseInfoHTML.addEventListener('click', (event) => {
    courseInput.value = ""; 
    isFiltered = false;
    filterButton.innerHTML = `<span class="material-symbols-outlined">
            filter_alt</span>
          <span class="txt-14 txt-semibold">Apply Filter</span>`; 
    
    let positionClick = event.target;
    if (positionClick.classList.contains('add-button')) {
      let row = positionClick.closest('tr');
      if (row) {
        let course_code = row.dataset.code;
        addToCoursePlan(course_code);
      }
    }
  });

  // Function to Add Course to Course Plan
  const addToCoursePlan = (course_code) => {
    let courseIndex = courseInfo.findIndex(course => course.code === course_code);
    
    if (courseIndex >= 0) {
        let selectedCourse = courseInfo[courseIndex];
        let courseUnits = !isNaN(selectedCourse.units) ? Number(selectedCourse.units) : 0;

        // Check if adding the course will exceed 21 units
        if (totalUnits + courseUnits > 21) {
          if (!alertShown) {
          alert("Adding this course will exceed the maximum allowed number of units.");      
          sessionStorage.setItem("alertShown", "true");    
          }
        return; // Prevent adding the course
        }

        if (!coursePlan.some(course => course.course_code === course_code)) {
            coursePlan.push(selectedCourse);

            if (!isNaN(selectedCourse.units)) {
              totalUnits += Number(selectedCourse.units);  
            }
            updateTotalUnits();

            localStorage.setItem("coursePlan", JSON.stringify(coursePlan)); // Save to localStorage

            // Remove from course list
            courseInfo.splice(courseIndex, 1);
            localStorage.setItem("courseList", JSON.stringify(courseInfo));
            updateCourseListHTML();
            addCourseToHTML();
        }
    }
  }

  // Updating course list when course is added to the Course plan
  const updateCourseListHTML = () => {
    courseInfoHTML.innerHTML = ''; // Clear the UI

    if (courseInfo.length > 0) {
        courseInfo.forEach(course => {
            let newCourse = document.createElement('tr');
            newCourse.classList.add('course-info');
            newCourse.dataset.code = course.code;
            newCourse.innerHTML = `
                <td>${course.code}</td>
                <td>${course.title}</td>
                <td>${course.units}</td>
                <td class="difficulty">${course.difficulty}</td>
                <td class="performance">${course.performance}</td>
                <td>
                    <button class="view-button bg-green button txt-white">View Info</button>
                    <button class="add-button bg-blue button txt-white" data-code="${course.code}">Add</button>
                </td>`;
            courseInfoHTML.appendChild(newCourse);
        });
    }
  };
  
  // Function to Display Course Plan in HTML
  const addCourseToHTML = () => {
    coursePlanHTML.innerHTML = '';

    if (coursePlan.length > 0) {
      coursePlan.forEach(plan => {
        let newPlan = document.createElement('tr');
        newPlan.classList.add('course-info');
        newPlan.dataset.code = plan.code; // Use plan.code directly

        newPlan.innerHTML = `
          <td>${plan.code}</td>
          <td>${plan.title}</td>
          <td>${plan.units}</td>
          <td class="difficulty">${plan.difficulty}</td>
          <td class="performance">${plan.performance}</td>
          <td>
            <button class="view-button bg-green button txt-white">View Info</button>
            <button class="remove-button bg-red button txt-white">Remove</button>
          </td>`; 

        coursePlanHTML.appendChild(newPlan);
      });
    }
  }

  // Event Delegation for Remove Buttons
  coursePlanHTML.addEventListener("click", (event) => {
    let positionRemove = event.target;
    if (positionRemove.classList.contains("remove-button")) {
      let row = positionRemove.closest('tr');
      if (row) {
        let course_code = row.dataset.code;
      removeFromCoursePlan(course_code);
      }
    }
  });

  // Remove course in course plan
  const removeFromCoursePlan = (course_code) => {
    let courseIndex = coursePlan.findIndex(course => course.code === course_code);

      if (courseIndex >= 0) {
        let removedCourse = coursePlan.splice(courseIndex, 1)[0]; // Remove from course plan
        if (!isNaN(removedCourse.units)) {
          totalUnits -= Number(removedCourse.units);  
        }
        updateTotalUnits();
        localStorage.setItem("coursePlan", JSON.stringify(coursePlan)); // Update localStorage

        // Restore the course to courseInfo (available courses)
        courseInfo.push(removedCourse);
        localStorage.setItem("courseList", JSON.stringify(courseInfo));

        // Update UI
        updateCourseListHTML();
        addCourseToHTML();
      }
  }

  // calculates total units
  const updateTotalUnits = () => {
    totalUnitsText.textContent = totalUnits;
    if (totalUnits < 21) {
        sessionStorage.setItem("alertShown", "false");
    }
  }

  const recalculateTotalUnits = () => {
    totalUnits = coursePlan.reduce((sum, course) => {
        return sum + (!isNaN(course.units) ? Number(course.units) : 0);
    }, 0);
    updateTotalUnits(); 
  }
  
  // Load Courses from JSON
  const initApp = (category) => {
    fetch('courses.json')
    .then(response => response.json())
    .then(data => {
        let freshCourseInfo = data[category]; // Load specific category data
        
        // Filter out courses already in coursePlan to avoid duplication
        courseInfo = freshCourseInfo.filter(course => 
            !coursePlan.some(plan => plan.code === course.code)
        ); 

        localStorage.setItem("courseList", JSON.stringify(courseInfo)); // Save to localStorage
        recalculateTotalUnits();
        addDataToHTML();
    })
    .catch(error => {
        console.error("Error fetching course data:", error);
    });

    addCourseToHTML();
  } 
  initApp(category);

  //filter
  // Select elements
  const filterButton = document.getElementById("filter");
  const courseInput = document.getElementById("course-input");

  // Track filter state
  let isFiltered = false;

  // Function to filter courses
  const filterCourses = () => {
      let searchCode = courseInput.value.trim().toUpperCase(); // Get input & normalize
      let courseRows = document.querySelectorAll(".course-list .course-info"); // Get course rows
      let found = false;

      courseRows.forEach(row => {
        let courseCode = row.dataset.code.toUpperCase();
        if (courseCode.includes(searchCode)) {
            row.style.display = ""; // Show matching courses
            found = true;
        } else {
            row.style.display = "none"; // Hide non-matching courses
        }
      });

      if (!found) {
          courseInfoHTML.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Try searching in other categories.</td></tr>`;
      }

      // Change button to "Reset Filter"
      filterButton.innerHTML = `<span class="material-symbols-outlined">
            filter_alt</span>
          <span class="txt-14 txt-semibold">Reset Filter</span>`;
      isFiltered = true;
  };

  // Function to reset filter
  const resetFilter = () => {
      let courseRows = document.querySelectorAll(".course-list .course-info");
      courseRows.forEach(row => {
          row.style.display = ""; // Show all courses
      });

      // Restore original course list
      updateCourseListHTML();

           // Reset button text
      filterButton.innerHTML = `<span class="material-symbols-outlined">
            filter_alt</span>
          <span class="txt-14 txt-semibold">Apply Filter</span>`;
      isFiltered = false;
  };

  // Add event listener to filter button
  filterButton.addEventListener("click", () => {
      if (isFiltered) {
          resetFilter();
      } else {
          filterCourses();
      }
  });
  
  // Reset filter state when changing tabs
  isFiltered = false;
  filterButton.innerHTML = `<span class="material-symbols-outlined">
            filter_alt</span>
          <span class="txt-14 txt-semibold">Apply Filter</span>`; 
}