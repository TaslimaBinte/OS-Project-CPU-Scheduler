let processCount = 1;

// Add Process
document.getElementById("add-process").addEventListener("click", () => {
    processCount++;
    const processContainer = document.getElementById("process-container");

    const newProcess = document.createElement("div");
    newProcess.classList.add("process");
    newProcess.id = `process-${processCount}`;
    newProcess.innerHTML = `
        <label>P${processCount}</label>
        <input type="number" placeholder="Arrival Time" class="arrival-time">
        <input type="number" placeholder="Burst Time" class="burst-time">
        <input type="number" placeholder="Priority" class="priority">
    `;
    processContainer.appendChild(newProcess);
});

// Reduce Process
document.getElementById("reduce-process").addEventListener("click", () => {
    if (processCount > 1) {
        const processContainer = document.getElementById("process-container");
        processContainer.removeChild(processContainer.lastElementChild);
        processCount--;
    } else {
        alert("At least one process must exist!");
    }
});

// Reset Button
document.getElementById("reset").addEventListener("click", () => {
    document.getElementById("process-container").innerHTML = `
        <div class="process" id="process-1">
            <label>P1</label>
            <input type="number" placeholder="Arrival Time" class="arrival-time">
            <input type="number" placeholder="Burst Time" class="burst-time">
            <input type="number" placeholder="Priority" class="priority">
        </div>
    `;
    document.getElementById("tat-result").innerText = "";
    document.getElementById("wt-result").innerText = "";
    processCount = 1;
});

// Run Button - work on latest data given by user
document.getElementById("run").addEventListener("click", () => {
    const processes = [];
    const arrivalTimes = document.querySelectorAll(".arrival-time");
    const burstTimes = document.querySelectorAll(".burst-time");
    const priorities = document.querySelectorAll(".priority");

    for (let i = 0; i < processCount; i++) {
        const arrival = parseInt(arrivalTimes[i].value) || 0;
        const burst = parseInt(burstTimes[i].value) || 0;
        const priority = parseInt(priorities[i].value) || 1;

        // Check if burst time is 0
        if (arrival < 0) {
            alert(`Error: Arrival time for process P${i + 1} cannot be less than zero.`);
            return; // Stop execution
        }

        if (burst === 0) {
            alert(`Error: Burst time for process P${i + 1} cannot be zero.`);
            return; // Stop execution
        }

        processes.push({
            id: `P${i + 1}`,
            arrival,
            burst,
            priority,
        });
    }

    const timeQuantum = parseInt(document.getElementById("time-quantum").value) || 0;

    if (timeQuantum <= 0 || isNaN(timeQuantum)) {
        alert("Error: Time quantum must be a positive integer greater than zero.");
        document.getElementById("time-quantum").focus();
        return; // Stop execution
    }

    // Call scheduling algorithms call
    const results = runAlgorithms(processes, timeQuantum);

    // TO Display Results
    document.getElementById("tat-result").innerText = `Best Algorithm (TAT): ${results.bestTAT} with Avg TAT = ${results.avgTAT.toFixed(2)}`;
    document.getElementById("wt-result").innerText = `Best Algorithm (WT): ${results.bestWT} with Avg WT = ${results.avgWT.toFixed(2)}`;
});

// CPU Scheduling Algorithms (all will be called from here)
function runAlgorithms(processes, timeQuantum) {
    // copy the data so that data will not Mitch match 
    const clonedProcesses = () => JSON.parse(JSON.stringify(processes));

    const algorithms = {
        FCFS: fcfs(clonedProcesses()),
        SJF: sjf(clonedProcesses()),
        SRTF: srtf(clonedProcesses()),
        PriorityNP: priorityNonPreemptive(clonedProcesses()),
        PriorityP: priorityPreemptive(clonedProcesses()),
        RR: roundRobin(clonedProcesses(), timeQuantum),
    };

    let bestTAT = null,
        bestWT = null,
        minTAT = Infinity,
        minWT = Infinity;

    for (const [key, value] of Object.entries(algorithms)) {
        if (value.avgTAT < minTAT) {
            minTAT = value.avgTAT;
            bestTAT = key;
        }
        if (value.avgWT < minWT) {
            minWT = value.avgWT;
            bestWT = key;
        }
    }

    return {
        bestTAT,
        bestWT,
        avgTAT: minTAT,
        avgWT: minWT,
        allResults: algorithms, 
    };
}

// FCFS Algorithm
function fcfs(processes) {
    const sorted = [...processes].sort((a, b) => a.arrival - b.arrival);
    let time = 0,
        totalTAT = 0,
        totalWT = 0;

    const ganttChart = [];
    const finishTimes = [];

    for (const process of sorted) {
        if (time < process.arrival) {
            time = process.arrival; 
        }
        ganttChart.push({ id: process.id, start: time, duration: process.burst });
        time += process.burst;

        const tat = time - process.arrival;
        const wt = tat - process.burst;

        totalTAT += tat;
        totalWT += wt;

        finishTimes.push(time);
    }

    return {
        avgTAT: totalTAT / processes.length,
        avgWT: totalWT / processes.length,
        finishTimes,
        ganttChart,
    };
}

// SJF Algorithm
function sjf(processes) {
    const sorted = [...processes].sort((a, b) => a.arrival - b.arrival || a.burst - b.burst);
    let time = 0,
        totalTAT = 0,
        totalWT = 0;

    const ganttChart = [];
    const isCompleted = new Array(processes.length).fill(false);

    for (let completed = 0; completed < processes.length; ) {
        let next = -1;
        for (let i = 0; i < processes.length; i++) {
            if (!isCompleted[i] && processes[i].arrival <= time) {
                if (next === -1 || processes[i].burst < processes[next].burst) {
                    next = i;
                }
            }
        }

        if (next === -1) {
            time++;
            continue;
        }

        ganttChart.push({ id: processes[next].id, start: time, duration: processes[next].burst });
        time += processes[next].burst;

        const tat = time - processes[next].arrival;
        const wt = tat - processes[next].burst;

        totalTAT += tat;
        totalWT += wt;

        isCompleted[next] = true;
        completed++;
    }

    return {
        avgTAT: totalTAT / processes.length,
        avgWT: totalWT / processes.length,
        ganttChart,
    };
}

// SRTF Algorithm
function srtf(processes) {
    const sorted = [...processes].sort((a, b) => a.arrival - b.arrival);
    let time = 0,
        completed = 0,
        totalTAT = 0,
        totalWT = 0;

    const remainingBurst = processes.map((p) => p.burst);
    const isCompleted = new Array(processes.length).fill(false);

    const ganttChart = [];

    while (completed < processes.length) {
        let shortest = -1;

        for (let i = 0; i < processes.length; i++) {
            if (
                processes[i].arrival <= time &&
                !isCompleted[i] &&
                (shortest === -1 || remainingBurst[i] < remainingBurst[shortest])
            ) {
                shortest = i;
            }
        }

        if (shortest === -1) {
            time++;
            continue;
        }

        ganttChart.push({ id: processes[shortest].id, start: time, duration: 1 });
        remainingBurst[shortest]--;
        time++;

        if (remainingBurst[shortest] === 0) {
            const tat = time - processes[shortest].arrival;
            const wt = tat - processes[shortest].burst;

            totalTAT += tat;
            totalWT += wt;

            isCompleted[shortest] = true;
            completed++;
        }
    }

    return {
        avgTAT: totalTAT / processes.length,
        avgWT: totalWT / processes.length,
        ganttChart,
    };
}
// Priority NonPreemptive
function priorityNonPreemptive(processes) {
    const sorted = [...processes].sort((a, b) => a.arrival - b.arrival || a.priority - b.priority);
    let time = 0,
        totalTAT = 0,
        totalWT = 0;

    const ganttChart = [];
    const isCompleted = new Array(processes.length).fill(false);

    for (let completed = 0; completed < processes.length; ) {
        let highest = -1;
        for (let i = 0; i < processes.length; i++) {
            if (!isCompleted[i] && processes[i].arrival <= time) {
                if (highest === -1 || processes[i].priority < processes[highest].priority) {
                    highest = i;
                }
            }
        }

        if (highest === -1) {
            time++;
            continue;
        }

        ganttChart.push({ id: processes[highest].id, start: time, duration: processes[highest].burst });
        time += processes[highest].burst;

        const tat = time - processes[highest].arrival;
        const wt = tat - processes[highest].burst;

        totalTAT += tat;
        totalWT += wt;

        isCompleted[highest] = true;
        completed++;
    }

    return {
        avgTAT: totalTAT / processes.length,
        avgWT: totalWT / processes.length,
        ganttChart,
    };
}

// Priority Preemptive
function priorityPreemptive(processes) {
    const sorted = [...processes].sort((a, b) => a.arrival - b.arrival);
    let time = 0,
        completed = 0,
        totalTAT = 0,
        totalWT = 0;

    const remainingBurst = processes.map((p) => p.burst);
    const finishTimes = new Array(processes.length).fill(-1);
    const isCompleted = new Array(processes.length).fill(false);

    const ganttChart = [];

    while (completed < processes.length) {
        let highest = -1;

        for (let i = 0; i < processes.length; i++) {
            if (processes[i].arrival <= time && remainingBurst[i] > 0 && !isCompleted[i]) {
                if (highest === -1 || processes[i].priority < processes[highest].priority) {
                    highest = i;
                }
            }
        }

        if (highest === -1) {
            time++;
            continue;
        }

        ganttChart.push({ id: processes[highest].id, start: time, duration: 1 });
        remainingBurst[highest]--;
        time++;

        if (remainingBurst[highest] === 0) {
            isCompleted[highest] = true;
            completed++;

            const tat = time - processes[highest].arrival;
            const wt = tat - processes[highest].burst;

            totalTAT += tat;
            totalWT += wt;

            finishTimes[highest] = time;
        }
    }

    return {
        avgTAT: totalTAT / processes.length,
        avgWT: totalWT / processes.length,
        finishTimes: finishTimes,
        ganttChart,
    };
}

// Round Robin Algorithm 
function roundRobin(processes, timeQuantum) {
    if (!Array.isArray(processes) || processes.length === 0) {
        throw new Error("Invalid input: processes must be a non-empty array");
    }

    if (timeQuantum <= 0) {
        throw new Error("Invalid input: timeQuantum must be a positive number");
    }

    const n = processes.length;
    const remainingBurst = processes.map((p) => p.burst);
    const completionTime = Array(n).fill(0);
    const tatArray = Array(n).fill(0);
    const wtArray = Array(n).fill(0);

    let time = 0,
        completed = 0;
    const queue = [];
    const ganttChart = [];

    const sortedProcesses = [...processes].sort((a, b) => a.arrival - b.arrival);
    let i = 0;

    while (i < n && sortedProcesses[i].arrival <= time) {
        queue.push(sortedProcesses[i]);
        i++;
    }

    while (completed < n) {
        if (queue.length === 0) {
            time = sortedProcesses[i].arrival;
            while (i < n && sortedProcesses[i].arrival <= time) {
                queue.push(sortedProcesses[i]);
                i++;
            }
            continue;
        }

        const current = queue.shift();
        const idx = processes.findIndex((p) => p.id === current.id);

        if (remainingBurst[idx] > timeQuantum) {
            ganttChart.push({ id: processes[idx].id, start: time, duration: timeQuantum });
            time += timeQuantum;
            remainingBurst[idx] -= timeQuantum;

            while (i < n && sortedProcesses[i].arrival <= time) {
                queue.push(sortedProcesses[i]);
                i++;
            }

            queue.push(current);
        } else {
            ganttChart.push({ id: processes[idx].id, start: time, duration: remainingBurst[idx] });
            time += remainingBurst[idx];
            completionTime[idx] = time;
            remainingBurst[idx] = 0;
            completed++;

            const tat = time - processes[idx].arrival;
            const wt = tat - processes[idx].burst;
            tatArray[idx] = tat;
            wtArray[idx] = wt;

            while (i < n && sortedProcesses[i].arrival <= time) {
                queue.push(sortedProcesses[i]);
                i++;
            }
        }
    }

    const totalTAT = tatArray.reduce((sum, val) => sum + val, 0);
    const totalWT = wtArray.reduce((sum, val) => sum + val, 0);

    return {
        avgTAT: totalTAT / n,
        avgWT: totalWT / n,
        tatArray,
        wtArray,
        completionTime,
        ganttChart,
    };
}

document.getElementById("show").addEventListener("click", () => {
    // 
    const processes = [];
    const arrivalTimes = document.querySelectorAll(".arrival-time");
    const burstTimes = document.querySelectorAll(".burst-time");
    const priorities = document.querySelectorAll(".priority");

    for (let i = 0; i < processCount; i++) {
        const arrival = parseInt(arrivalTimes[i].value) || 0;
        const burst = parseInt(burstTimes[i].value) || 0;
        const priority = parseInt(priorities[i].value) || 1;

        // Check if burst time is 0

        if (arrival < 0) {
            alert(`Error: Arrival time for process P${i + 1} cannot be less than zero.`);
            return; // Stop execution
        }
        if (burst === 0) {
            alert(`Error: Burst time for process P${i + 1} cannot be zero.`);
            return; // Stop execution
        }

        processes.push({
            id: `P${i + 1}`,
            arrival,
            burst,
            priority,
        });
    }

    const timeQuantum = parseInt(document.getElementById("time-quantum").value) || 0;

    if (timeQuantum <= 0 || isNaN(timeQuantum)) {
        alert("Error: Time quantum must be a positive integer greater than zero.");
        document.getElementById("time-quantum").focus();
        return; // Stop execution
    }

    const results = {
        FCFS: fcfs(processes),
        SJF: sjf(processes),
        SRTF: srtf(processes),
        PriorityNP: priorityNonPreemptive(processes),
        PriorityP: priorityPreemptive(processes),
        RR: roundRobin(processes, timeQuantum),
    };

    // make the result table with the updated values 
    const tableBody = document.querySelector("#results-table tbody");
    tableBody.innerHTML = ""; // Clear previous results

    for (const [algorithm, data] of Object.entries(results)) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${algorithm}</td>
            <td>${data.avgTAT.toFixed(2)}</td>
            <td>${data.avgWT.toFixed(2)}</td>
            <td><button class="gantt-btn" data-algorithm="${algorithm}">GC >></button></td>
        `;
        tableBody.appendChild(row);
    }

    // event listeners for Gantt Chart buttons to show gantt chart
    document.querySelectorAll(".gantt-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
            const algorithm = event.target.getAttribute("data-algorithm");
            const selectedAlgorithm = results[algorithm];
            displayGanttChart(selectedAlgorithm.ganttChart, algorithm);
        });
    });

    // Show the modal with the results
    const modal = document.getElementById("results-modal");
    modal.style.display = "flex";
});

// to display the Gantt chart( function of gantt chart)
function displayGanttChart(ganttChart, algorithm) {
    const ganttModal = document.createElement("div");
    ganttModal.classList.add("modal");
    ganttModal.style.display = "flex";

    // gantt chart start and end time
    let chartContent = '';
    ganttChart.forEach((task) => {
        const end = task.start + task.duration; // Calculate the end time
        chartContent += `
            <div class="gantt-task" style="width: ${task.duration * 10}px;" title="${task.id} (${task.start}-${end})">
                ${task.id} (${task.start}-${end})
            </div>
        `;
    });

    ganttModal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Gantt Chart for ${algorithm}</h2>
            <div class="gantt-chart-container" style="display: flex; gap: 5px;">
                ${chartContent}
            </div>
        </div>
    `;

    document.body.appendChild(ganttModal);

    // Close the modal
    ganttModal.querySelector(".close").addEventListener("click", () => {
        ganttModal.remove();
    });
}

// Close the modal when the close button is clicked
document.getElementById("close-modal").addEventListener("click", () => {
    document.getElementById("results-modal").style.display = "none";
});

// Close the modal when clicking outside the modal content
window.addEventListener("click", (event) => {
    const modal = document.getElementById("results-modal");
    if (event.target === modal) {
        modal.style.display = "none";
    }
});
