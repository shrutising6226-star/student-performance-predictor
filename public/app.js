/**
 * public/app.js
 * Client-side script for the EduPredict full-stack portal.
 * Interacts with backend API endpoints and coordinates UI updates.
 */

document.addEventListener("DOMContentLoaded", () => {
  // === STATE & ENDPOINTS ===
  let authToken = localStorage.getItem("edupredict_token") || null;
  let cachedModel = null;
  let currentActiveTab = "dashboard";
  let userRole = "teacher"; // default

  // Elements: Panels
  const authPanel = document.getElementById("auth-panel");
  const appPanel = document.getElementById("app-panel");
  const loginFormBox = document.getElementById("login-form-box");
  const signupFormBox = document.getElementById("signup-form-box");

  // Elements: Auth forms
  const btnToggleSignup = document.getElementById("btn-toggle-signup");
  const btnToggleLogin = document.getElementById("btn-toggle-login");
  const btnLoginSubmit = document.getElementById("btn-login-submit");
  const btnSignupSubmit = document.getElementById("btn-signup-submit");
  const btnLogout = document.getElementById("btn-logout");

  // Auth Inputs
  const loginUsernameInp = document.getElementById("login-username");
  const loginPasswordInp = document.getElementById("login-password");
  const signupNameInp = document.getElementById("signup-name");
  const signupEmailInp = document.getElementById("signup-email");
  const signupUsernameInp = document.getElementById("signup-username");
  const signupPasswordInp = document.getElementById("signup-password");
  const signupRoleInp = document.getElementById("signup-role");

  // Header Details
  const userGreetingLbl = document.getElementById("user-greeting-lbl");
  const userRoleLbl = document.getElementById("user-role-lbl");
  const currentSectionLbl = document.getElementById("current-section-lbl");
  const currentSectionTitle = document.getElementById("current-section-title");
  const themeToggleBtn = document.getElementById("theme-toggle");
  const themeIcon = document.getElementById("theme-icon");

  // Navigation Items
  const navItems = document.querySelectorAll(".nav-item");
  const viewSections = document.querySelectorAll(".view-section");

  // Predictor Inputs & Outputs
  const studentNameInp = document.getElementById("student-name");
  const attendanceSlider = document.getElementById("attendance-slider");
  const attendanceNum = document.getElementById("attendance-num");
  const studySlider = document.getElementById("study-slider");
  const studyNum = document.getElementById("study-num");
  const sleepSlider = document.getElementById("sleep-slider");
  const sleepNum = document.getElementById("sleep-num");
  const stressSlider = document.getElementById("stress-slider");
  const stressNum = document.getElementById("stress-num");
  const prevGradeSlider = document.getElementById("prev-grade-slider");
  const prevGradeNum = document.getElementById("prev-grade-num");
  const btnSaveStudent = document.getElementById("btn-save-student");

  const gaugeFill = document.getElementById("gauge-fill");
  const predictedScoreVal = document.getElementById("predicted-score-val");
  const predictedLetterGrade = document.getElementById("predicted-letter-grade");
  const assessmentStatusBadge = document.getElementById("assessment-status-badge");
  const assessmentAdviceText = document.getElementById("assessment-advice-text");

  // Explainer outputs
  const mathStepsLbl = document.getElementById("math-calculation-steps");
  const passFailBanner = document.getElementById("pass-fail-banner");

  // What-If Labels
  const whatifStudyLbl = document.getElementById("whatif-study");
  const whatifAttendanceLbl = document.getElementById("whatif-attendance");
  const whatifStressLbl = document.getElementById("whatif-stress");

  // Directory View
  const directorySearchInput = document.getElementById("directory-search-input");
  const directoryCounterLbl = document.getElementById("directory-counter-lbl");
  const directoryTbody = document.getElementById("directory-tbody");

  // Dashboard Stats
  const dashTotalStudents = document.getElementById("dash-total-students");
  const dashAvgScore = document.getElementById("dash-avg-score");
  const dashAtRisk = document.getElementById("dash-at-risk");
  const dashRecentTbody = document.getElementById("dash-recent-tbody");
  const btnDashViewAll = document.getElementById("btn-dash-view-all");

  // ML Trainer Console
  const btnTrainModel = document.getElementById("btn-train-model");
  const modelR2Lbl = document.getElementById("model-r2");
  const modelMseLbl = document.getElementById("model-mse");
  const formulaIntercept = document.getElementById("formula-intercept");
  const trainerWeightsChart = document.getElementById("trainer-weights-chart");
  const modelStatusDot = document.getElementById("model-status-dot");
  const modelStatusLbl = document.getElementById("model-status-lbl");

  // CSV Importer Components
  const csvDropZone = document.getElementById("csv-drop-zone");
  const csvFileInput = document.getElementById("csv-file-input");
  const csvPreviewCard = document.getElementById("csv-preview-card");
  const csvPreviewTbody = document.getElementById("csv-preview-tbody");
  const btnCsvSaveAll = document.getElementById("btn-csv-save-all");
  let parsedStudentsList = [];

  // ==========================================================================
  // INITIALIZATION & SESSION CHECKS
  // ==========================================================================

  async function checkSessionOnLoad() {
    if (authToken) {
      try {
        const response = await fetch("/api/auth/me", {
          headers: { "Authorization": `Bearer ${authToken}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          loginSessionSuccess(authToken, data.user);
        } else {
          clearSession();
        }
      } catch (err) {
        console.error("Session verification failed on connection error:", err);
      }
    }
  }

  function loginSessionSuccess(token, user) {
    authToken = token;
    userRole = user.role || "teacher";
    localStorage.setItem("edupredict_token", token);
    
    // UI switches
    authPanel.classList.add("hidden");
    appPanel.classList.remove("hidden");
    
    // User profile details
    userGreetingLbl.textContent = `Hello, ${user.name}`;
    userRoleLbl.textContent = user.role === 'student' ? 'Student Account' : 'Educator Account';

    // Role-based visibility adjustments
    adjustWorkspaceForRole();
  }

  function adjustWorkspaceForRole() {
    // Select sidebar tabs elements
    const tabDashboard = document.getElementById("nav-item-dashboard");
    const tabUploader = document.getElementById("nav-item-uploader");
    const tabDirectory = document.getElementById("nav-item-directory");
    const tabTrainer = document.getElementById("nav-item-trainer");
    const tabPredictor = document.getElementById("nav-item-predictor");

    if (userRole === "student") {
      // Students see only their personal predictor panel
      tabDashboard.classList.add("hidden");
      tabUploader.classList.add("hidden");
      tabDirectory.classList.add("hidden");
      tabTrainer.classList.add("hidden");
      
      // Hide manual save button and student name box to customize uis
      btnSaveStudent.classList.add("hidden");
      studentNameInp.closest(".form-group").classList.add("hidden");
      
      // Select Predictor automatically
      tabPredictor.click();
    } else {
      // Teachers see everything
      tabDashboard.classList.remove("hidden");
      tabUploader.classList.remove("hidden");
      tabDirectory.classList.remove("hidden");
      tabTrainer.classList.remove("hidden");
      
      btnSaveStudent.classList.remove("hidden");
      studentNameInp.closest(".form-group").classList.remove("hidden");
      
      // Navigate to dashboard default
      tabDashboard.click();
    }

    // Fetch model coefficients and refresh
    fetchCachedModel();
  }

  function clearSession() {
    authToken = null;
    localStorage.removeItem("edupredict_token");
    appPanel.classList.add("hidden");
    authPanel.classList.remove("hidden");
    
    // Reset login inputs
    loginUsernameInp.value = "";
    loginPasswordInp.value = "";
  }

  // ==========================================================================
  // AUTH PANEL BUTTON HANDLERS
  // ==========================================================================

  btnToggleSignup.addEventListener("click", () => {
    loginFormBox.classList.add("hidden");
    signupFormBox.classList.remove("hidden");
  });

  btnToggleLogin.addEventListener("click", () => {
    signupFormBox.classList.add("hidden");
    loginFormBox.classList.remove("hidden");
  });

  // Login handler
  btnLoginSubmit.addEventListener("click", async () => {
    const username = loginUsernameInp.value.trim();
    const password = loginPasswordInp.value;

    if (!username || !password) {
      alert("Please fill in both username and password fields.");
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (response.ok) {
        loginSessionSuccess(data.token, data.user);
      } else {
        alert(data.error || "Authentication failed.");
      }
    } catch (err) {
      alert("Connection failed. Server might be offline.");
    }
  });

  // Register handler
  btnSignupSubmit.addEventListener("click", async () => {
    const name = signupNameInp.value.trim();
    const email = signupEmailInp.value.trim();
    const username = signupUsernameInp.value.trim();
    const password = signupPasswordInp.value;
    const role = signupRoleInp.value;

    if (!name || !email || !username || !password || !role) {
      alert("All fields are required to create an account.");
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, username, password, role })
      });

      const data = await response.json();
      if (response.ok) {
        alert("Account created successfully! Please sign in.");
        signupFormBox.classList.add("hidden");
        loginFormBox.classList.remove("hidden");
        loginUsernameInp.value = username;
      } else {
        alert(data.error || "Registration failed.");
      }
    } catch (err) {
      alert("Connection failed. Server might be offline.");
    }
  });

  // Logout handler
  btnLogout.addEventListener("click", async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
    } catch (e) {}
    clearSession();
  });

  // ==========================================================================
  // NAVIGATION & THEME SWITCHING
  // ==========================================================================

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const tabId = item.getAttribute("data-tab");
      currentActiveTab = tabId;
      
      // Update Menu Classes
      navItems.forEach(nav => nav.classList.remove("active"));
      item.classList.add("active");

      // Update Section visibility
      viewSections.forEach(section => {
        section.classList.remove("active");
        if (section.id === `${tabId}-view`) {
          section.classList.add("active");
        }
      });

      // Headers update
      switch (tabId) {
        case "dashboard":
          currentSectionLbl.textContent = "Overview";
          currentSectionTitle.textContent = "Dashboard";
          loadDashboard();
          break;
        case "predictor":
          currentSectionLbl.textContent = "Predictor";
          currentSectionTitle.textContent = userRole === 'student' ? "Personal Calculator" : "Advisor Predictor Tool";
          triggerEvaluation();
          break;
        case "uploader":
          currentSectionLbl.textContent = "CSV Importer";
          currentSectionTitle.textContent = "Bulk Upload Center";
          // Reset dropzone preview
          csvPreviewCard.classList.add("hidden");
          parsedStudentsList = [];
          break;
        case "directory":
          currentSectionLbl.textContent = "Directory";
          currentSectionTitle.textContent = "Student Profiles Directory";
          loadDirectory();
          break;
        case "trainer":
          currentSectionLbl.textContent = "Model Console";
          currentSectionTitle.textContent = "Machine Learning Center";
          loadModelConsole();
          break;
      }
    });
  });

  // Theme Toggle Button
  themeToggleBtn.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const nextTheme = currentTheme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", nextTheme);

    if (nextTheme === "light") {
      themeIcon.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22">`;
    } else {
      themeIcon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
    }
  });

  // ==========================================================================
  // REAL-TIME PREDICTOR / CALCULATOR LOGIC (CLIENT SIDE USING CACHED WEIGHTS)
  // ==========================================================================

  async function fetchCachedModel() {
    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendance: 85, studyHours: 15, sleepHours: 8, stressLevel: 4, prevGrade: 75 })
      });
      if (response.ok) {
        const data = await response.json();
        cachedModel = data.model;
        
        // Trigger prediction to draw steps
        triggerEvaluation();
        
        // Refresh dashboard to display scatter plot with correct trend line
        if (authToken && userRole === "teacher") {
          loadDashboard();
        }
      }
    } catch (e) {
      console.error("Failed to load cached model:", e);
    }
  }

  function bindPredictInput(slider, numBox) {
    slider.addEventListener("input", (e) => {
      numBox.value = e.target.value;
      triggerEvaluation();
    });
    numBox.addEventListener("input", (e) => {
      let val = parseFloat(e.target.value);
      const min = parseFloat(e.target.min);
      const max = parseFloat(e.target.max);
      
      if (isNaN(val)) val = min;
      if (val < min) val = min;
      if (val > max) val = max;

      e.target.value = val;
      slider.value = val;
      triggerEvaluation();
    });
  }

  bindPredictInput(attendanceSlider, attendanceNum);
  bindPredictInput(studySlider, studyNum);
  bindPredictInput(sleepSlider, sleepNum);
  bindPredictInput(stressSlider, stressNum);
  bindPredictInput(prevGradeSlider, prevGradeNum);

  function triggerEvaluation() {
    if (!cachedModel) return;

    const att = parseFloat(attendanceNum.value);
    const study = parseFloat(studyNum.value);
    const sleep = parseFloat(sleepNum.value);
    const stress = parseFloat(stressNum.value);
    const prev = parseFloat(prevGradeNum.value);

    // Predict locally using cached weights to ensure instant speed
    const score = localPredict(att, study, sleep, stress, prev);

    // Update gauge
    const offset = 565.48 * (1 - score / 100);
    gaugeFill.style.strokeDashoffset = offset;
    predictedScoreVal.textContent = `${score.toFixed(1)}%`;

    // Grade and risk levels
    let grade = 'F';
    let label = 'HIGH RISK';
    let assessmentClass = 'badge-fail';
    let advice = "Evaluation shows a high risk of course failure. Recommend immediate advising meeting.";

    if (score >= 90) {
      grade = 'A';
      label = 'EXCELLENT';
      assessmentClass = 'badge-pass';
      advice = "Academic performance is outstanding. Keep up the excellent work habits!";
    } else if (score >= 80) {
      grade = 'B';
      label = 'GOOD';
      assessmentClass = 'badge-pass';
      advice = "Steady progress observed. Maintaining current habits is likely to secure a high pass.";
    } else if (score >= 70) {
      grade = 'C';
      label = 'PASSING';
      assessmentClass = 'badge-pass';
      advice = "Passing mark secured. Incremental study increases will offer significant grade cushions.";
    } else if (score >= 60) {
      grade = 'D';
      label = 'BORDERLINE';
      assessmentClass = 'badge-warning';
      advice = "Borderline evaluation. Targeted support in low areas will prevent failure hazards.";
    }

    predictedLetterGrade.textContent = grade;
    assessmentStatusBadge.textContent = label;
    assessmentStatusBadge.className = `assessment-status ${assessmentClass}`;
    assessmentAdviceText.textContent = advice;

    // What-If
    const sPlus = localPredict(att, Math.min(40, study + 5), sleep, stress, prev) - score;
    const aPlus = localPredict(Math.min(100, att + 10), study, sleep, stress, prev) - score;
    const stMinus = localPredict(att, study, sleep, Math.max(1, stress - 2), prev) - score;

    whatifStudyLbl.textContent = `${sPlus >= 0 ? '+' : ''}${sPlus.toFixed(1)}%`;
    whatifAttendanceLbl.textContent = `${aPlus >= 0 ? '+' : ''}${aPlus.toFixed(1)}%`;
    whatifStressLbl.textContent = `${stMinus >= 0 ? '+' : ''}${stMinus.toFixed(1)}%`;

    // Update dynamic calculation details
    renderMathSteps(att, study, sleep, stress, prev, score);

    // Update goal optimizer output in real-time
    optimizeGoal();
  }

  function localPredict(att, study, sleep, stress, prev) {
    if (!cachedModel) return 70.0;
    let val = cachedModel.intercept;
    val += att * cachedModel.weights[0];
    val += study * cachedModel.weights[1];
    val += sleep * cachedModel.weights[2];
    val += stress * cachedModel.weights[3];
    val += prev * cachedModel.weights[4];
    return Math.max(0, Math.min(100, val));
  }

  // Visualizes step-by-step arithmetic computation
  function renderMathSteps(att, study, sleep, stress, prev, finalScore) {
    if (!cachedModel) return;

    const b0 = cachedModel.intercept;
    const w = cachedModel.weights;

    const termAtt = att * w[0];
    const termStudy = study * w[1];
    const termSleep = sleep * w[2];
    const termStress = stress * w[3];
    const termPrev = prev * w[4];
    const totalRaw = b0 + termAtt + termStudy + termSleep + termStress + termPrev;

    const stepsHtml = `
      <span>Intercept (β₀) = <strong>${b0.toFixed(3)}</strong></span>
      <span>Attendance = <strong>${w[0].toFixed(3)}</strong> × ${att}% = <strong>${termAtt >= 0 ? '+' : ''}${termAtt.toFixed(3)}</strong></span>
      <span>Study Hours = <strong>${w[1].toFixed(3)}</strong> × ${study} hrs = <strong>${termStudy >= 0 ? '+' : ''}${termStudy.toFixed(3)}</strong></span>
      <span>Sleep Hours = <strong>${w[2].toFixed(3)}</strong> × ${sleep} hrs = <strong>${termSleep >= 0 ? '+' : ''}${termSleep.toFixed(3)}</strong></span>
      <span>Stress Level = <strong>${w[3].toFixed(3)}</strong> × ${stress} = <strong>${termStress >= 0 ? '+' : ''}${termStress.toFixed(3)}</strong></span>
      <span>Midterm Grade = <strong>${w[4].toFixed(3)}</strong> × ${prev}% = <strong>${termPrev >= 0 ? '+' : ''}${termPrev.toFixed(3)}</strong></span>
      <hr style="border:0; border-top:1px solid var(--border-color); margin: 0.35rem 0;">
      <span>Summation = <strong>${totalRaw.toFixed(3)}%</strong></span>
      <span>Final Predict = <strong>${finalScore.toFixed(1)}%</strong></span>
    `;

    mathStepsLbl.innerHTML = stepsHtml;

    // Passing threshold checks
    if (finalScore >= 60.0) {
      passFailBanner.textContent = "RESULT: PASS ✅";
      passFailBanner.className = "pass-fail-banner pass";
    } else {
      passFailBanner.textContent = "RESULT: FAIL ❌";
      passFailBanner.className = "pass-fail-banner fail";
    }
  }

  // Save new student profile manually
  btnSaveStudent.addEventListener("click", async () => {
    const name = studentNameInp.value.trim();
    if (!name) {
      alert("Please enter a valid student name.");
      return;
    }

    const att = parseFloat(attendanceNum.value);
    const study = parseFloat(studyNum.value);
    const sleep = parseFloat(sleepNum.value);
    const stress = parseFloat(stressNum.value);
    const prev = parseFloat(prevGradeNum.value);

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ name, attendance: att, studyHours: study, sleepHours: sleep, stressLevel: stress, prevGrade: prev })
      });

      if (response.ok) {
        alert(`Success: Profile for ${name} saved successfully to database!`);
        studentNameInp.value = "";
        
        // Go to directory tab
        document.querySelector("[data-tab='directory']").click();
      } else {
        const err = await response.json();
        alert(err.error || "Failed to save student record.");
      }
    } catch (e) {
      alert("Connection failed.");
    }
  });

  // ==========================================================================
  // CSV FILE PARSER & BULK IMPORT
  // ==========================================================================

  csvDropZone.addEventListener("click", () => csvFileInput.click());
  
  csvDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    csvDropZone.classList.add("dragover");
  });

  csvDropZone.addEventListener("dragleave", () => {
    csvDropZone.classList.remove("dragover");
  });

  csvDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    csvDropZone.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file) handleCSVFile(file);
  });

  csvFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleCSVFile(file);
  });

  function handleCSVFile(file) {
    if (!file.name.endsWith(".csv")) {
      alert("Invalid format: Please upload a valid CSV text sheet.");
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      const text = e.target.result;
      parseCSVText(text);
    };
    reader.readAsText(file);
  }

  function parseCSVText(text) {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) {
      alert("Error: Empty file or no student rows found.");
      return;
    }

    // Split lines and trim fields, filtering out empty rows
    const rows = lines.map(l => l.split(",").map(c => c.trim())).filter(r => r.length > 1 && r[0] !== "");
    const headers = rows[0].map(h => h.toLowerCase());

    // Map columns
    const nameIdx = headers.findIndex(h => h.includes("name"));
    const attIdx = headers.findIndex(h => h.includes("attendance"));
    const studyIdx = headers.findIndex(h => h.includes("study"));
    const sleepIdx = headers.findIndex(h => h.includes("sleep"));
    const stressIdx = headers.findIndex(h => h.includes("stress"));
    const prevIdx = headers.findIndex(h => h.includes("midterm") || h.includes("prev") || h.includes("grade"));

    if (nameIdx === -1 || attIdx === -1 || studyIdx === -1 || sleepIdx === -1 || stressIdx === -1 || prevIdx === -1) {
      alert("Header mismatch: CSV columns must contain 'Name', 'Attendance', 'Study Hours', 'Sleep Hours', 'Stress Level', and 'Midterm Grade'. Check spelling.");
      return;
    }

    parsedStudentsList = [];
    const previewRows = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < headers.length) continue;

      const name = row[nameIdx];
      const attendance = parseFloat(row[attIdx]);
      const studyHours = parseFloat(row[studyIdx]);
      const sleepHours = parseFloat(row[sleepIdx]);
      const stressLevel = parseFloat(row[stressIdx]);
      const prevGrade = parseFloat(row[prevIdx]);

      if (isNaN(attendance) || isNaN(studyHours) || isNaN(sleepHours) || isNaN(stressLevel) || isNaN(prevGrade)) {
        continue; // skip malformed numbers
      }

      const score = localPredict(attendance, studyHours, sleepHours, stressLevel, prevGrade);
      const isPass = score >= 60.0;

      parsedStudentsList.push({
        name,
        attendance,
        studyHours,
        sleepHours,
        stressLevel,
        prevGrade
      });

      previewRows.push(`
        <tr>
          <td style="font-weight:600">${name}</td>
          <td>${attendance}%</td>
          <td>${studyHours} hrs</td>
          <td>${sleepHours} hrs</td>
          <td>${stressLevel}</td>
          <td>${prevGrade}%</td>
          <td style="font-weight:800; color:var(--color-primary-glow-solid)">${score.toFixed(1)}%</td>
          <td><span class="assessment-status ${isPass ? 'badge-pass' : 'badge-fail'}">${isPass ? 'PASS' : 'FAIL'}</span></td>
        </tr>
      `);
    }

    if (parsedStudentsList.length === 0) {
      alert("No valid rows parsed. Verify columns format.");
      return;
    }

    csvPreviewTbody.innerHTML = previewRows.join("");
    csvPreviewCard.classList.remove("hidden");
  }

  btnCsvSaveAll.addEventListener("click", async () => {
    if (parsedStudentsList.length === 0) return;
    btnCsvSaveAll.disabled = true;

    try {
      const response = await fetch("/api/students/bulk", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ students: parsedStudentsList })
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message || "Bulk uploader succeeded!");
        csvPreviewCard.classList.add("hidden");
        parsedStudentsList = [];
        
        // Redirect to directory
        document.querySelector("[data-tab='directory']").click();
      } else {
        alert(data.error || "Uploader error occurred.");
      }
    } catch (e) {
      alert("Connection timeout during upload request.");
    } finally {
      btnCsvSaveAll.disabled = false;
    }
  });

  // ==========================================================================
  // DASHBOARD DATA LOADER
  // ==========================================================================

  async function loadDashboard() {
    try {
      const response = await fetch("/api/students", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      
      if (!response.ok) return;
      
      const { students } = await response.json();
      
      dashTotalStudents.textContent = students.length;
      
      if (students.length === 0) {
        dashAvgScore.textContent = "0.0%";
        dashAtRisk.textContent = "0";
        dashRecentTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No student logs recorded yet. Go to Predictor tab to start.</td></tr>`;
        renderScatterPlot([]);
        renderInterventions([]);
        return;
      }

      const totalScore = students.reduce((sum, s) => sum + s.finalGrade, 0);
      dashAvgScore.textContent = `${(totalScore / students.length).toFixed(1)}%`;

      const atRiskCount = students.filter(s => s.finalGrade < 70).length;
      dashAtRisk.textContent = atRiskCount;

      const sorted = [...students].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
      
      const rows = sorted.map(s => {
        let riskText = "Low Risk";
        let riskClass = "assessment-status badge-pass";
        
        if (s.finalGrade < 60) {
          riskText = "High Risk";
          riskClass = "assessment-status badge-fail";
        } else if (s.finalGrade < 75) {
          riskText = "Medium Risk";
          riskClass = "assessment-status badge-warning";
        }

        return `
          <tr>
            <td style="font-weight:600">${s.name}</td>
            <td>${s.attendance}%</td>
            <td>${s.studyHours}h/wk</td>
            <td>${s.prevGrade}%</td>
            <td style="font-weight:700">${s.finalGrade}%</td>
            <td><span class="${riskClass}">${riskText}</span></td>
          </tr>
        `;
      }).join("");

      dashRecentTbody.innerHTML = rows;

      // Render advanced data analytics & outreach panels
      renderScatterPlot(students);
      renderInterventions(students);

    } catch (e) {
      console.error("Dashboard statistics loading failed:", e);
    }
  }

  btnDashViewAll.addEventListener("click", () => {
    document.querySelector("[data-tab='directory']").click();
  });

  // ==========================================================================
  // DIRECTORY DATA LOADER
  // ==========================================================================

  let directoryStudents = [];

  async function loadDirectory() {
    try {
      const response = await fetch("/api/students", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (!response.ok) return;

      const data = await response.json();
      directoryStudents = data.students;
      
      renderDirectoryTable(directoryStudents);
    } catch (e) {
      console.error("Failed to load directory:", e);
    }
  }

  function renderDirectoryTable(list) {
    directoryCounterLbl.textContent = `Showing ${list.length} student${list.length === 1 ? '' : 's'}`;
    
    if (list.length === 0) {
      directoryTbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No matching student records found.</td></tr>`;
      return;
    }

    const html = list.map(s => {
      const isPass = s.finalGrade >= 60.0;
      return `
        <tr id="dir-row-${s.id}">
          <td style="font-weight:600">${s.name}</td>
          <td>${s.attendance}%</td>
          <td>${s.studyHours} hrs</td>
          <td>${s.sleepHours} hrs</td>
          <td>${s.stressLevel} / 10</td>
          <td>${s.prevGrade}%</td>
          <td style="font-weight:800; color:var(--color-primary-glow-solid)">${s.finalGrade}%</td>
          <td style="text-align:center">
            <button class="delete-dir-btn" data-id="${s.id}" style="background:transparent; border:none; color:var(--color-danger); cursor:pointer;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </td>
        </tr>
      `;
    }).join("");

    directoryTbody.innerHTML = html;

    // Delete buttons handlers
    document.querySelectorAll(".delete-dir-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        deleteStudent(id);
      });
    });
  }

  async function deleteStudent(id) {
    if (!confirm("Are you sure you want to delete this student record?")) return;
    try {
      const response = await fetch(`/api/students/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.ok) {
        directoryStudents = directoryStudents.filter(s => s.id !== id);
        renderDirectoryTable(directoryStudents);
        loadDashboard(); // Refresh stats
      }
    } catch (e) {
      alert("Failed to delete record.");
    }
  }

  directorySearchInput.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = directoryStudents.filter(s => s.name.toLowerCase().includes(q));
    renderDirectoryTable(filtered);
  });

  // ==========================================================================
  // ML MODEL CONSOLE / TRAINER
  // ==========================================================================

  function loadModelConsole() {
    if (!cachedModel) return;
    
    modelR2Lbl.textContent = cachedModel.r2.toFixed(3);
    modelMseLbl.textContent = cachedModel.mse.toFixed(2);
    formulaIntercept.textContent = cachedModel.intercept.toFixed(2);

    // Render weight graph
    const labels = [
      { name: "Attendance Rate", idx: 0 },
      { name: "Study Hours/Wk", idx: 1 },
      { name: "Sleep Hours/Nt", idx: 2 },
      { name: "Stress Level", idx: 3 },
      { name: "Midterm Grade", idx: 4 }
    ];

    const maxWeight = Math.max(...cachedModel.weights.map(Math.abs), 0.1);

    const html = labels.map(l => {
      const w = cachedModel.weights[l.idx];
      const percent = Math.min(100, (Math.abs(w) / maxWeight) * 100);
      const isNegative = w < 0;
      
      return `
        <div class="weight-row">
          <div class="weight-labels">
            <span>${l.name}</span>
            <span style="font-weight:700; color:${isNegative ? 'var(--color-danger)' : 'var(--color-success)'}">
              ${w >= 0 ? '+' : ''}${w.toFixed(3)}
            </span>
          </div>
          <div class="weight-bar-bg">
            <div class="weight-bar-fill ${isNegative ? 'negative' : ''}" style="width:${percent}%"></div>
          </div>
        </div>
      `;
    }).join("");

    trainerWeightsChart.innerHTML = html;
  }

  // Retrain model
  btnTrainModel.addEventListener("click", async () => {
    btnTrainModel.disabled = true;
    modelStatusDot.className = "pulse-dot animating";
    modelStatusLbl.textContent = "Fitting OLS regression...";

    try {
      const response = await fetch("/api/train", {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
      });

      const data = await response.json();
      
      if (response.ok) {
        cachedModel = data.model;
        loadModelConsole();
        loadDashboard(); // Refresh scatter plot trend line
        alert("Success: OLS regression coefficients successfully updated based on your student directory records!");
      } else {
        alert(data.error || "Training failed.");
      }
    } catch (e) {
      alert("Failed to connect to trainer.");
    } finally {
      btnTrainModel.disabled = false;
      modelStatusDot.className = "pulse-dot";
      modelStatusLbl.textContent = "Active Mode";
    }
  });

  // ==========================================================================
  // ADVANCED ANALYTICS & INTERVENTIONS (V3 ADDITIONS)
  // ==========================================================================

  // Scatter plot tooltip helper variables
  let scatterTooltip = document.getElementById("scatter-tooltip");
  if (!scatterTooltip) {
    scatterTooltip = document.createElement("div");
    scatterTooltip.id = "scatter-tooltip";
    scatterTooltip.style.position = "absolute";
    scatterTooltip.style.pointerEvents = "none";
    scatterTooltip.style.padding = "0.5rem 0.75rem";
    scatterTooltip.style.backgroundColor = "var(--bg-card)";
    scatterTooltip.style.border = "1px solid var(--border-color)";
    scatterTooltip.style.borderRadius = "8px";
    scatterTooltip.style.boxShadow = "var(--shadow-md)";
    scatterTooltip.style.fontSize = "0.75rem";
    scatterTooltip.style.fontFamily = "var(--font-body)";
    scatterTooltip.style.color = "var(--text-primary)";
    scatterTooltip.style.zIndex = "1000";
    scatterTooltip.style.opacity = "0";
    scatterTooltip.style.transition = "opacity 0.15s ease";
    document.body.appendChild(scatterTooltip);
  }

  function showTooltip(event, name, studyHours, grade) {
    scatterTooltip.innerHTML = `
      <strong style="color:var(--color-primary-glow-solid)">${name}</strong><br>
      Study Time: ${studyHours} hrs/wk<br>
      Predicted: <strong>${grade.toFixed(1)}%</strong>
    `;
    scatterTooltip.style.left = `${event.pageX + 10}px`;
    scatterTooltip.style.top = `${event.pageY - 40}px`;
    scatterTooltip.style.opacity = "1";
  }

  function hideTooltip() {
    scatterTooltip.style.opacity = "0";
  }

  // Draw class scatter plot with dynamic trend slope
  function renderScatterPlot(students) {
    const svg = document.getElementById("dash-scatter-plot");
    if (!svg) return;

    svg.innerHTML = "";

    const width = 500;
    const height = 230;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 35;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const getX = (studyHours) => paddingLeft + (Math.min(40, Math.max(0, studyHours)) / 40) * chartWidth;
    const getY = (grade) => paddingTop + chartHeight - (Math.min(100, Math.max(0, grade)) / 100) * chartHeight;

    // Draw horizontal grid lines (Y-axis grades: 0 to 100)
    for (let g = 0; g <= 100; g += 20) {
      const yVal = getY(g);
      
      const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      gridLine.setAttribute("x1", paddingLeft);
      gridLine.setAttribute("y1", yVal);
      gridLine.setAttribute("x2", width - paddingRight);
      gridLine.setAttribute("y2", yVal);
      gridLine.setAttribute("stroke", "var(--border-color)");
      gridLine.setAttribute("stroke-dasharray", "3,3");
      gridLine.setAttribute("stroke-width", "1");
      svg.appendChild(gridLine);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", paddingLeft - 8);
      text.setAttribute("y", yVal + 4);
      text.setAttribute("text-anchor", "end");
      text.setAttribute("fill", "var(--text-muted)");
      text.setAttribute("font-size", "10px");
      text.setAttribute("font-family", "var(--font-body)");
      text.textContent = `${g}%`;
      svg.appendChild(text);
    }

    // Draw vertical grid lines (X-axis hours: 0 to 40)
    for (let sh = 0; sh <= 40; sh += 10) {
      const xVal = getX(sh);
      
      const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      gridLine.setAttribute("x1", xVal);
      gridLine.setAttribute("y1", paddingTop);
      gridLine.setAttribute("x2", xVal);
      gridLine.setAttribute("y2", paddingTop + chartHeight);
      gridLine.setAttribute("stroke", "var(--border-color)");
      gridLine.setAttribute("stroke-dasharray", "3,3");
      gridLine.setAttribute("stroke-width", "1");
      svg.appendChild(gridLine);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", xVal);
      text.setAttribute("y", paddingTop + chartHeight + 15);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "var(--text-muted)");
      text.setAttribute("font-size", "10px");
      text.setAttribute("font-family", "var(--font-body)");
      text.textContent = `${sh}h`;
      svg.appendChild(text);
    }

    // Draw coordinate axes lines
    const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
    xAxis.setAttribute("x1", paddingLeft);
    xAxis.setAttribute("y1", paddingTop + chartHeight);
    xAxis.setAttribute("x2", width - paddingRight);
    xAxis.setAttribute("y2", paddingTop + chartHeight);
    xAxis.setAttribute("stroke", "var(--text-muted)");
    xAxis.setAttribute("stroke-width", "1.5");
    svg.appendChild(xAxis);

    const yAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
    yAxis.setAttribute("x1", paddingLeft);
    yAxis.setAttribute("y1", paddingTop);
    yAxis.setAttribute("x2", paddingLeft);
    yAxis.setAttribute("y2", paddingTop + chartHeight);
    yAxis.setAttribute("stroke", "var(--text-muted)");
    yAxis.setAttribute("stroke-width", "1.5");
    svg.appendChild(yAxis);

    // Overlay best-fit slope regression line
    if (cachedModel && cachedModel.weights && cachedModel.weights.length > 0) {
      let avgAtt = 85;
      let avgSleep = 8;
      let avgStress = 4;
      let avgMidterm = 75;

      if (students.length > 0) {
        avgAtt = students.reduce((sum, s) => sum + s.attendance, 0) / students.length;
        avgSleep = students.reduce((sum, s) => sum + s.sleepHours, 0) / students.length;
        avgStress = students.reduce((sum, s) => sum + s.stressLevel, 0) / students.length;
        avgMidterm = students.reduce((sum, s) => sum + s.prevGrade, 0) / students.length;
      }

      const predictWithStudy = (study) => {
        let val = cachedModel.intercept;
        val += avgAtt * cachedModel.weights[0];
        val += study * cachedModel.weights[1];
        val += avgSleep * cachedModel.weights[2];
        val += avgStress * cachedModel.weights[3];
        val += avgMidterm * cachedModel.weights[4];
        return Math.max(0, Math.min(100, val));
      };

      const trendLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      trendLine.setAttribute("x1", getX(0));
      trendLine.setAttribute("y1", getY(predictWithStudy(0)));
      trendLine.setAttribute("x2", getX(40));
      trendLine.setAttribute("y2", getY(predictWithStudy(40)));
      trendLine.setAttribute("stroke", "var(--color-secondary)");
      trendLine.setAttribute("stroke-width", "3");
      trendLine.setAttribute("stroke-linecap", "round");
      trendLine.setAttribute("opacity", "0.85");
      svg.appendChild(trendLine);
    }

    // Render students dots
    students.forEach(s => {
      const cx = getX(s.studyHours);
      const cy = getY(s.finalGrade);

      const isPass = s.finalGrade >= 60.0;
      const isWarning = s.finalGrade >= 60.0 && s.finalGrade < 75.0;
      let dotColor = "var(--color-success)";
      if (!isPass) dotColor = "var(--color-danger)";
      else if (isWarning) dotColor = "var(--color-warning)";

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", cx);
      circle.setAttribute("cy", cy);
      circle.setAttribute("r", "6");
      circle.setAttribute("fill", dotColor);
      circle.setAttribute("stroke", "var(--bg-card)");
      circle.setAttribute("stroke-width", "1.5");
      circle.style.transition = "transform 0.2s, r 0.2s";
      circle.style.cursor = "pointer";

      circle.addEventListener("mouseenter", (e) => {
        circle.setAttribute("r", "9");
        showTooltip(e, s.name, s.studyHours, s.finalGrade);
      });

      circle.addEventListener("mouseleave", () => {
        circle.setAttribute("r", "6");
        hideTooltip();
      });

      svg.appendChild(circle);
    });
  }

  // Intervention list alerts rendering
  function renderInterventions(students) {
    const listContainer = document.getElementById("dash-intervention-list");
    if (!listContainer) return;

    listContainer.innerHTML = "";

    const criticalStudents = students.filter(s => s.finalGrade < 60);

    if (criticalStudents.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align:center; padding:1.25rem 0; color:var(--text-muted); font-size:0.8rem;">
          No intervention alerts. All student progress is passing.
        </div>
      `;
      return;
    }

    criticalStudents.forEach(s => {
      const item = document.createElement("div");
      item.style.display = "flex";
      item.style.justifyContent = "space-between";
      item.style.alignItems = "center";
      item.style.padding = "0.5rem 0.75rem";
      item.style.backgroundColor = "var(--bg-card)";
      item.style.border = "1px solid var(--border-color)";
      item.style.borderRadius = "8px";
      item.style.fontSize = "0.8rem";

      item.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:0.15rem;">
          <strong style="color:var(--text-primary)">${s.name}</strong>
          <span style="color:var(--text-muted); font-size:0.7rem;">Expected: <strong style="color:var(--color-danger);">${s.finalGrade.toFixed(1)}%</strong> | Attendance: ${s.attendance}%</span>
        </div>
        <button class="btn btn-secondary btn-sm outreach-btn" data-id="${s.id}" style="padding:0.25rem 0.5rem; display:inline-flex; gap:0.25rem; align-items:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Outreach
        </button>
      `;

      item.querySelector(".outreach-btn").addEventListener("click", () => {
        openOutreachModal(s);
      });

      listContainer.appendChild(item);
    });
  }

  // Opens communication popups for academic counselors
  function openOutreachModal(student) {
    const emailModal = document.getElementById("email-modal");
    const emailTo = document.getElementById("email-to-input");
    const emailSubject = document.getElementById("email-subject-input");
    const emailBody = document.getElementById("email-body-text");
    const btnMailto = document.getElementById("btn-send-mailto");

    if (!emailModal) return;

    const recipient = `${student.name.toLowerCase().replace(/[^a-z0-9]/g, "")}@academy.edu`;
    const subject = `Academic Support Advisory: EduPredict Intervention Plan`;
    const bodyText = `Dear ${student.name},

I am writing to share your current performance outlook in our course. According to our EduPredict analytics dashboard, your projected final grade is estimated at ${student.finalGrade.toFixed(1)}%, which is below the passing threshold.

Here is a summary of your current learning metrics:
- Attendance Rate: ${student.attendance}%
- Weekly Study Time: ${student.studyHours} hours
- Midterm Grade: ${student.prevGrade}%

To support your academic success, we recommend developing a study plan targeting at least ${Math.max(12, student.studyHours + 6)} hours per week. Additionally, we encourage you to schedule a brief check-in during office hours this week so we can review key concepts together.

Let's work together to help you succeed in this course!

Best regards,
Professor / Advisor`;

    emailTo.value = recipient;
    emailSubject.value = subject;
    emailBody.value = bodyText;

    const mailtoHref = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    btnMailto.setAttribute("href", mailtoHref);

    emailModal.classList.remove("hidden");
    emailModal.style.display = "flex";
  }

  // Goal optimization linear algebra calculator
  function optimizeGoal() {
    const resultDiv = document.getElementById("goal-optimizer-result");
    const targetGradeInput = document.getElementById("target-grade-input");
    if (!resultDiv || !targetGradeInput || !cachedModel) return;

    const targetGrade = parseFloat(targetGradeInput.value);
    if (isNaN(targetGrade) || targetGrade < 0 || targetGrade > 100) {
      resultDiv.innerHTML = `<span style="color:var(--color-danger)">Please enter a valid target grade between 0% and 100%.</span>`;
      return;
    }

    const att = parseFloat(attendanceNum.value);
    const sleep = parseFloat(sleepNum.value);
    const stress = parseFloat(stressNum.value);
    const prev = parseFloat(prevGradeNum.value);

    const b0 = cachedModel.intercept;
    const w = cachedModel.weights;

    // Beta coefficient for study hours is weights[1]
    const betaStudy = w[1];

    if (Math.abs(betaStudy) < 1e-5) {
      resultDiv.innerHTML = `<span style="color:var(--color-warning)">Goal simulation unavailable: Study hours impact is close to zero.</span>`;
      return;
    }

    const sumOthers = b0 + att * w[0] + sleep * w[2] + stress * w[3] + prev * w[4];
    const reqStudy = (targetGrade - sumOthers) / betaStudy;

    if (reqStudy < 0) {
      const gradeAtZeroStudy = sumOthers;
      resultDiv.innerHTML = `
        <span style="color:var(--color-success); font-weight:600">Goal Met easily!</span><br>
        Based on other factors, your predicted grade is <strong>${Math.min(100, gradeAtZeroStudy).toFixed(1)}%</strong> even with <strong>0 hours</strong> of study/week.
      `;
    } else if (reqStudy > 40) {
      resultDiv.innerHTML = `
        <span style="color:var(--color-danger); font-weight:600">Warning: Target Unreachable by study alone!</span><br>
        To achieve ${targetGrade.toFixed(1)}%, you need to study <strong>${reqStudy.toFixed(1)} hours/week</strong>, which exceeds healthy limits.
        Please improve other factors: increase attendance or reduce stress.
      `;
    } else {
      resultDiv.innerHTML = `
        To achieve a target grade of <strong>${targetGrade.toFixed(1)}%</strong>, you need to study at least <strong>${reqStudy.toFixed(1)} hours/week</strong>, keeping other metrics constant.
      `;
    }
  }

  // Setup email modal listeners
  const btnCloseEmailModal = document.getElementById("btn-close-email-modal");
  if (btnCloseEmailModal) {
    btnCloseEmailModal.addEventListener("click", () => {
      const emailModal = document.getElementById("email-modal");
      emailModal.classList.add("hidden");
      emailModal.style.display = "none";
    });
  }

  const btnCopyEmail = document.getElementById("btn-copy-email");
  if (btnCopyEmail) {
    btnCopyEmail.addEventListener("click", () => {
      const emailBody = document.getElementById("email-body-text");
      emailBody.select();
      emailBody.setSelectionRange(0, 99999);
      navigator.clipboard.writeText(emailBody.value).then(() => {
        const originalText = btnCopyEmail.textContent;
        btnCopyEmail.textContent = "Copied! ✓";
        btnCopyEmail.style.backgroundColor = "var(--color-success)";
        btnCopyEmail.style.color = "white";
        setTimeout(() => {
          btnCopyEmail.textContent = originalText;
          btnCopyEmail.style.backgroundColor = "";
          btnCopyEmail.style.color = "";
        }, 1500);
      }).catch(err => {
        alert("Failed to copy text automatically. Please select and copy manually.");
      });
    });
  }

  const btnOptimizeGoal = document.getElementById("btn-optimize-goal");
  if (btnOptimizeGoal) {
    btnOptimizeGoal.addEventListener("click", () => {
      optimizeGoal();
    });
  }

  // Start checking session
  checkSessionOnLoad();
});
