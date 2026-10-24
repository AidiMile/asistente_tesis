document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("generationForm");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const texto = document.getElementById("queryText").value;
        const temperature = document.getElementById("temperature").value;
        const top_p = document.getElementById("topP").value;
        const max_length = document.getElementById("maxLength").value;
        const btnGenerar = document.getElementById("btnGenerar");
        const resultadoDiv = document.getElementById("resultadoGenerado");

        // Cambiar estado del botón
        btnGenerar.disabled = true;
        btnGenerar.innerText = "Generando respuesta con IA...";
        resultadoDiv.innerHTML = `<span class="text-muted">Procesando consulta y evaluando modismo ecuatoriano...</span>`;

        try {
            const response = await fetch('/api/generar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ texto, temperature, top_p, max_length })
            });

            const data = await response.json();

            if (response.ok) {
                resultadoDiv.innerText = data.texto_generado;
                document.getElementById("metricBleu").innerText = data.metricas.bleu;
                document.getElementById("metricRouge").innerText = data.metricas.rouge;
                document.getElementById("metricBert").innerText = data.metricas.bertscore;
            } else {
                resultadoDiv.innerText = `Error: ${data.error || 'No se pudo procesar la solicitud.'}`;
            }
        } catch (error) {
            resultadoDiv.innerText = `Error de conexión: ${error.message}`;
        } finally {
            btnGenerar.disabled = false;
            btnGenerar.innerText = "Generar Texto con IA";
        }
    });
});