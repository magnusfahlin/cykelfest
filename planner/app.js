// app.js

const LOCAL_STORAGE_KEY = 'cycling-dinner-planner';
const OUTPUT_STORAGE_KEY = 'cycling-dinner-planner-output';

function saveFormData() {
    console.log('Saving form data...');
    const hostingCouples = Array.from(document.querySelectorAll('#hosting-couples .couple-row')).map(row => ({
        name: row.querySelector('.couple-name').value,
        forbiddenCourses: Array.from(row.querySelectorAll('.forbidden-course:checked')).map(cb => cb.value),
    }));

    const nonHostingCouples = Array.from(document.querySelectorAll('#nonhosting-couples .couple-row')).map(row => ({
        name: row.querySelector('.couple-name').value,
    }));

    const forbiddenPairs = Array.from(document.querySelectorAll('.forbidden-row')).map(row => [
        row.querySelector('.forbidden-a').value,
        row.querySelector('.forbidden-b').value
    ]);

    const data = { hostingCouples, nonHostingCouples, forbiddenPairs };
    console.log('Data to save:', data);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
}

function loadFormData() {
    console.log('Loading form data...');
    const data = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');

    if (data.hostingCouples) {
        data.hostingCouples.forEach(c => addCoupleRow('hosting-couples', c.name, c.forbiddenCourses));
    } else {
        addCoupleRow('hosting-couples');
    }

    if (data.nonHostingCouples) {
        data.nonHostingCouples.forEach(c => addCoupleRow('nonhosting-couples', c.name));
    } else {
        addCoupleRow('nonhosting-couples');
    }

    if (data.forbiddenPairs) {
        data.forbiddenPairs.forEach(pair => addForbiddenPairRow(pair[0], pair[1]));
    }

    loadOutputData();
}

function loadOutputData() {
    const savedOutput = localStorage.getItem(OUTPUT_STORAGE_KEY);
    if (savedOutput) {
        console.log('Restoring previous output from localStorage...');
        window.renderOutput(savedOutput);
    }
}

function addCoupleRow(containerId, name = '', forbiddenCourses = []) {
    console.log(`Adding couple row to ${containerId} with name: ${name}`);
    const container = document.getElementById(containerId);
    const row = document.createElement('div');
    row.className = 'couple-row flex flex-wrap gap-2 items-center mb-2';
    row.innerHTML = `
    <input type="text" class="couple-name border border-gray-300 rounded px-2 py-1" placeholder="Couple Name" value="${name}" />
    ${containerId === 'hosting-couples' ? `
      <span class="text-sm text-gray-600 ml-2">Forbidden Courses:</span>
      <label class="inline-flex items-center"><input type="checkbox" class="forbidden-course ml-2" value="starter" ${forbiddenCourses.includes('starter') ? 'checked' : ''}/> Starter</label>
      <label class="inline-flex items-center"><input type="checkbox" class="forbidden-course ml-2" value="main" ${forbiddenCourses.includes('main') ? 'checked' : ''}/> Main</label>
      <label class="inline-flex items-center"><input type="checkbox" class="forbidden-course ml-2" value="dessert" ${forbiddenCourses.includes('dessert') ? 'checked' : ''}/> Dessert</label>
    ` : ''}
    <button type="button" class="remove-couple bg-red-500 text-white px-2 py-1 rounded ml-2">X</button>
  `;

    row.querySelector('.remove-couple').addEventListener('click', () => {
        container.removeChild(row);
        saveFormData();
    });

    container.appendChild(row);
}

function addForbiddenPairRow(a = '', b = '') {
    const container = document.getElementById('forbidden-pairs');
    const row = document.createElement('div');
    row.className = 'forbidden-row flex items-center gap-2';
    row.innerHTML = `
        <select class="forbidden-a border px-2 py-1 rounded"></select>
        <span>✕</span>
        <select class="forbidden-b border px-2 py-1 rounded"></select>
        <button class="remove-forbidden bg-gray-300 px-2 py-1 rounded">X</button>
    `;
    container.appendChild(row);
    row.querySelector('.remove-forbidden').addEventListener('click', () => {
        row.remove();
        saveFormData();
    });
    updateCoupleDropdowns();
    row.querySelector('.forbidden-a').value = a;
    row.querySelector('.forbidden-b').value = b;
}

function updateCoupleDropdowns() {
    const allNames = Array.from(document.querySelectorAll('.couple-name')).map(input => input.value);
    document.querySelectorAll('.forbidden-row').forEach(row => {
        const selectA = row.querySelector('.forbidden-a');
        const selectB = row.querySelector('.forbidden-b');
        [selectA, selectB].forEach(select => {
            const current = select.value;
            select.innerHTML = '';
            allNames.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                select.appendChild(opt);
            });
            select.value = current;
        });
    });
}

document.getElementById('add-hosting').addEventListener('click', () => addCoupleRow('hosting-couples'));
document.getElementById('add-nonhosting').addEventListener('click', () => addCoupleRow('nonhosting-couples'));
document.getElementById('save').addEventListener('click', saveFormData);
document.getElementById('generate').addEventListener('click', async () => {
    console.log('Generate button clicked.');
    saveFormData();
    if (typeof window.generatePlan === 'function') {
        const data = localStorage.getItem(LOCAL_STORAGE_KEY);
        console.log('Calling generatePlan with data:', data);
        window.generatePlan(data);
    } else {
        console.error('generatePlan function not found. Ensure WASM module is loaded.');
    }
});
document.getElementById('add-forbidden').addEventListener('click', () => {
    addForbiddenPairRow();
});

window.renderOutput = function (resultJSON) {
    console.log('✅ Result from WASM:', resultJSON);
    localStorage.setItem(OUTPUT_STORAGE_KEY, resultJSON);

    const result = JSON.parse(resultJSON);
    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML = '';

    if (result.results && result.results.length > 0) {
        result.results.forEach((planResult, idx) => {
            const block = document.createElement('div');
            block.className = 'mb-6 p-4 bg-white rounded shadow';

            let planHtml = '';
            for (const course of ['starter', 'main', 'dessert']) {
                if (planResult.Plan[course]) {
                    planHtml += `<h4 class="font-semibold mt-4 capitalize">${course}</h4>`;
                    planResult.Plan[course].forEach(group => {
                        const guests = group.Guests.map(g => g.Name).join(', ');
                        planHtml += `<div class="pl-4">Host: <strong>${group.Host.Name}</strong>; Guests: ${guests}</div>`;
                    });
                }
            }

            block.innerHTML = `
                <h3 class="font-bold text-xl mb-2">Plan #${idx + 1} (Score: ${planResult.Score})</h3>
                <div class="text-sm text-gray-700 mb-2">${planResult.Details.join('<br>')}</div>
                ${planHtml}
            `;

            outputDiv.appendChild(block);
        });
    } else {
        outputDiv.textContent = 'No valid plans generated.';
    }
};

(async function loadWasm() {
    if (typeof Go === 'undefined') {
        console.error('Go runtime (wasm_exec.js) not loaded.');
        return;
    }

    const go = new Go();
    try {
        console.log('Loading WASM...');
        const response = await fetch('planner.wasm');
        const wasm = await WebAssembly.instantiateStreaming(response, go.importObject);
        await go.run(wasm.instance);
        console.log('✅ WASM module initialized and generatePlan exported.');
    } catch (e) {
        console.error('❌ Failed to load WASM module:', e);
    }
})();

window.addEventListener('DOMContentLoaded', loadFormData);
console.log('App.js loaded.');
