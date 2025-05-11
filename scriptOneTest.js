const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");

prevButton.style.visibility = "hidden";
nextButton.style.visibility = "hidden";

const questionsContainer = document.getElementById("questions-container");
const form = document.getElementById("quiz-form");
const resultsElement = document.getElementById("results");
const submitBtn = document.getElementById("submit-button");

const approve = (text) => `<span style="color: green;">${text}</span>`;
const reject = (text) => `<span style="color: red;">${text}</span>`;

const temarioBtn = document.getElementById("btn-temario");
const storageKey = "testAnswers_all";

let isFormSubmitted = false;
function initialize() {
	temarioBtn.style.display = "none";

	updateInfoBasedOnTest();

	// Intenta recuperar el estado guardado, incluyendo preguntas y respuestas.
	const savedState = JSON.parse(localStorage.getItem(storageKey)) || {
		questions: [],
		answers: {},
	};

	if (
		Object.keys(savedState.answers).length > 0 &&
		savedState.questions.length > 0
	) {
		loadQuestions(savedState.questions, savedState.answers);
	} else {
		Promise.all(
			questionaryFiles.map((file) =>
				fetch(file)
					.then((response) => response.json())
					.then((data) => {
						const allQuestionsFromJSON = data.theme.flatMap((tema) =>
							tema.preguntas.map((pregunta) => ({
								...pregunta,
								temarioCompleto: `${data.title} / ${tema.temario}`,
								temarioTema: tema.temario,
							}))
						);
						return seleccionarPreguntasAleatorias(
							allQuestionsFromJSON,
							questionsForTest
						);
					})
					.catch((error) => {
						console.error(`Error loading file ${file}:`, error);
						return []; // Return an empty array to keep the structure
					})
			)
		)
			.then((allQuestions) => {
				// Concatenar todas las preguntas seleccionadas de cada archivo JSON.
				const selectedQuestions = [].concat(...allQuestions);
				savedState.questions = selectedQuestions;
				localStorage.setItem(storageKey, JSON.stringify(savedState));
				loadQuestions(selectedQuestions, savedState.answers);
			})
			.catch((error) =>
				console.error("Error loading the questionaries:", error)
			);
	}

	form.addEventListener("submit", function (event) {
		event.preventDefault();
		if (isFormSubmitted) return;
		isFormSubmitted = true;

		evaluateAll();
	});

	setTimeout(() => {
		document.getElementById("spinner").style.display = "none"; // Oculta el spinner
		document.getElementById("quiz-form").classList.remove("hidden"); // Muestra el formulario
	}, 200);
}

function seleccionarPreguntasAleatorias(preguntas, cantidad) {
	const filteredQuestions = preguntas.filter(
		(pregunta) => !Array.isArray(pregunta.respuestaCorrecta)
	);
	if (filteredQuestions.length < cantidad) {
		console.error("Not enough questions to select from.");
		return filteredQuestions; // Return as many as possible if not enough
	}

	let preguntasAleatorias = [];
	while (preguntasAleatorias.length < cantidad) {
		let indiceAleatorio = Math.floor(Math.random() * filteredQuestions.length);
		if (
			!preguntasAleatorias
				.map((q) => q.id)
				.includes(filteredQuestions[indiceAleatorio].id)
		) {
			preguntasAleatorias.push(filteredQuestions[indiceAleatorio]);
		}
	}
	return preguntasAleatorias;
}

function loadQuestions(questions, savedAnswers) {
	questions.forEach((question, index) => {
		const questionBlock = document.createElement("div");
		questionBlock.className = "question-block";
		const imageHtml = question.imagen ? `<div class="question-image"><img src="${question.imagen}" alt="Imagen de apoyo" style="max-width: 100%; margin-bottom: 10px;"></div>` : "";
		questionBlock.innerHTML = `
            ${imageHtml}
            <div class="question">${index + 1}. ${question.pregunta}</div>
            <div class="options">
                ${question?.opciones
										.map((opcion) => {
											const isSelected =
												savedAnswers[`question${index}`] === opcion;
											return `
                        <label class="option-label ${
												isSelected ? "selected" : ""
											}">
                            <input type="radio" name="question${index}" value="${opcion}" ${
											isSelected ? "checked" : ""
										} onclick="selectOption(event, '${opcion}', ${index}, this)">
                            ${opcion} ${
											isDev
												? opcion == question.respuestaCorrecta
													? "<strong style='color: red'>*</strong>"
													: ""
												: ""
										}
                        </label>`;
										})
										.join("")}
            </div>
            <div class="feedback" id="feedback-${index}"></div>
        `;
		questionsContainer.appendChild(questionBlock);
	});
}

window.selectOption = function (event, selectedOption, questionIndex, element) {
	if (isFormSubmitted) {
		event.preventDefault();
		return false; // Evita la acción si el formulario ya se ha enviado.
	}

	const savedState = JSON.parse(localStorage.getItem(storageKey)) || {
		questions: [],
		answers: {},
	};
	savedState.answers[`question${questionIndex}`] = selectedOption;
	localStorage.setItem(storageKey, JSON.stringify(savedState));

	// Actualizar la selección visual
	const optionLabels = document
		.querySelectorAll(`[name="question${questionIndex}"]`)
		.forEach((input) => {
			input.parentElement.classList.remove("selected");
		});
	element.parentElement.classList.add("selected");
};

function evaluateAll() {
	const savedState = JSON.parse(localStorage.getItem(storageKey));
	if (!savedState) {
		console.error("No saved state to evaluate");
		return;
	}

	let correctAnswersCount = 0;
	let incorrectasPorTemario = {};

	// Ahora, iteramos sobre las preguntas guardadas
	savedState.questions.forEach((question, index) => {
		const selectedOption = savedState.answers[`question${index}`];
		const questionBlock = document.querySelector(
			`.question-block:nth-child(${index + 1})`
		);
		const feedbackElement = questionBlock.querySelector(".feedback");
		const optionLabels = questionBlock.querySelectorAll(".option-label");

		// Aplicamos la clase según si la respuesta es correcta o no
		optionLabels.forEach((label) => {
			const input = label.querySelector("input");
			if (input.value == selectedOption) {
				label.classList.remove("selected");
				if (selectedOption == question.respuestaCorrecta) {
					correctAnswersCount++;
					feedbackElement.innerHTML = approve("Correcta");
					label.classList.add("correct-answer");
				} else {
					feedbackElement.innerHTML = reject(
						`Incorrecta, la respuesta correcta era: ${question.respuestaCorrecta}`
					);
					label.classList.add("wrong-answer");
					incorrectasPorTemario[question.temarioCompleto] =
						(incorrectasPorTemario[question.temarioCompleto] || 0) + 1;
				}
			}
		});
	});

	showResults(
		correctAnswersCount,
		savedState.questions.length,
		incorrectasPorTemario
	);
	localStorage.removeItem(storageKey); // Limpiamos el estado guardado una vez evaluado.
}

function showResults(correctas, total, porTemario) {
	let score = correctas / total;
	let detallesPorTemario = Object.entries(porTemario)
		.map(([tema, count]) => `<strong>${tema}: </strong>${count} incorrectas`)
		.join("<br>");
	let scopeId = "all";
	const resultsKey = `results_${scopeId}`;
	const isApproved = score >= 0.6;

	// Creamos el objeto de resultado para este examen
	const examResult = {
		test: "resultsKey",
		aprobados: isApproved ? 1 : 0,
		reprobados: isApproved ? 0 : 1,
	};
	// Leemos los datos antiguos o iniciamos un array nuevo si no existe
	const results = JSON.parse(localStorage.getItem("results")) || {};
	// Si el scopeId ya existe en el array, actualizamos los valores
	if (results[`results_${scopeId}`]) {
		results[`results_${scopeId}`].aprobados += examResult.aprobados;
		results[`results_${scopeId}`].reprobados += examResult.reprobados;
	} else {
		// Si es la primera vez, inicializamos este objeto en el array
		results[`results_${scopeId}`] = examResult;
	}
	let feedBackTest = isApproved
		? approve("¡Has aprobado!")
		: reject("No has aprobado.");

	localStorage.setItem("results", JSON.stringify(results));

	resultsElement.innerHTML = `
        <h2>Resultados</h2>
        Has acertado ${correctas} de ${total} preguntas.<br>
        Tu puntuación es ${(score * 100).toFixed(0)}.<br>
        ${feedBackTest}
        ${
					detallesPorTemario
						? `<h3>Detalles por temario</h3>${detallesPorTemario}`
						: ""
				}
    `;
	resultsElement.style.display = "block";
	submitBtn.style.display = "none";
	scrollToResults();

	// Iniciar fuegos artificiales si se aprueba
	if (isApproved) {
		startFireworks();
	}
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initialize);
} else {
	// Si el DOM ya está cargado, inicializar directamente
	initialize();
}
