const go = new Go();

async function loadWasm() {
  const result = await WebAssembly.instantiateStreaming(fetch("planner.wasm"), go.importObject);
  await go.run(result.instance);
}

document.getElementById("generate-btn").addEventListener("click", () => {
  if (typeof generatePlan === 'function') {
    const output = generatePlan();
    document.getElementById("output").textContent = output;
  } else {
    alert("WASM module not yet initialized.");
  }
});

loadWasm();

