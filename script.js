const questionsContainer = document.getElementById("questions-container");
const form = document.getElementById("quiz-form");
const resultsElement = document.getElementById("results");
const submitBtn = document.getElementById("submit-button");
const temarioBtn = document.getElementById("btn-temario");
let preguntas = [];
const approve = (text) => `<span style="color: green;">${text}</span>`;
const reject = (text) => `<span style="color: red;">${text}</span>`;
var preguntasErradas = 0;
var incorrectasPorTemario = {};
const temarioId = params.get("temario");
const scopeId = temarioId ? `${testType}_${temarioId}` : testType;
var incorrectAnswers = 0;

incorrectasPorTemario = loadIncorrectasPorTemario(scopeId);

function initialize() {
	temarioBtn.style.display = "content";
	updateInfoBasedOnTest();
	const savedAnswers =
		JSON.parse(localStorage.getItem(`testAnswers_${scopeId}`)) || {};

	fetch(`questionary${testType}.json`)
		.then((response) => response.json())
		.then((data) => {
			buildTemarioMenu(data.theme);
			if (temarioId) {
				const temaEspecifico = data.theme.find(
					(tema) => tema.evaluacion == temarioId
				);
				preguntas = temaEspecifico
					? temaEspecifico.preguntas.map((pregunta) => ({
							...pregunta,
							temarioCompleto: `${data.title} / ${temaEspecifico.temario}`,
							temarioTema: temaEspecifico.temario,
					  }))
					: [];
			} else {
				preguntas = data.theme.flatMap((tema) =>
					tema.preguntas.map((pregunta) => ({
						...pregunta,
						temarioCompleto: `${data.title} / ${tema.temario}`,
						temarioTema: tema.temario,
					}))
				);
			}

			const questionsOrder = loadOrGenerateQuestionsOrder(
				scopeId,
				preguntas.length
			);
			preguntas = questionsOrder.map((order) => preguntas[order]);
			loadQuestions(preguntas, savedAnswers);
		})
		.catch((error) => console.error("Error al cargar el cuestionario:", error));

	setTimeout(() => {
		document.getElementById("spinner").style.display = "none";
		document.getElementById("quiz-form").classList.remove("hidden");
	}, 400);
}

function loadOrGenerateQuestionsOrder(scopeId, totalQuestions) {
	let questionsOrder = JSON.parse(
		localStorage.getItem(`questionsOrder_${scopeId}`)
	);
	if (!questionsOrder) {
		questionsOrder = Array.from({ length: totalQuestions }, (_, i) => i);
		shuffleArray(questionsOrder);
		localStorage.setItem(
			`questionsOrder_${scopeId}`,
			JSON.stringify(questionsOrder)
		);
	}
	return questionsOrder;
}

function loadQuestions(questions, savedAnswers) {
	questionsContainer.innerHTML = ""; // Limpiar preguntas previas
	questions.forEach((question, index) => {
		const questionBlock = document.createElement("div");
		questionBlock.className = "question-block";
		const isMultiple = Array.isArray(question.respuestaCorrecta);
		const inputType = isMultiple ? "checkbox" : "radio";
		const userAnswers = savedAnswers[index] || (isMultiple ? [] : "");
		const correctAnswer = question.respuestaCorrecta;
		const optionsHtml = question.opciones
			.map((opcion) => {
				const isChecked = isMultiple
					? userAnswers.includes(opcion)
					: userAnswers == opcion;
				return `<label class="option-label">
                        <input type="${inputType}" name="question${index}" value='${opcion}' ${
					isChecked ? "checked" : ""
				} 
                            onclick="handleSelection('${opcion}', ${index}, this, ${isMultiple})">${opcion} ${
					isDev
						? opcion == question.respuestaCorrecta
							? "<strong style='color: red'>*</strong>"
							: ""
						: ""
				}</label>`;
			})
			.join("");

		const imageHtml = question.imagen ? `<div class="question-image"><img src="${question.imagen}" alt="Imagen de apoyo" style="max-width: 100%; margin-bottom: 10px;"></div>` : "";

		questionBlock.innerHTML = `<div class="question">${
			index + 1
		}. ${question.pregunta}</div>
		${imageHtml}
                                   <div class="options">${optionsHtml}</div>
                                   ${
																			isMultiple
																				? `<button type="button" class="evalaur-multiple" onclick="evaluateMultiple(${index})">Evaluar Respuesta</button>`
																				: ""
																		}
                                   <div class="feedback" id="feedback-${index}"></div>`;
		questionsContainer.appendChild(questionBlock);

		if (userAnswers.length > 0) {
			evaluateOption(userAnswers, index, isMultiple);
		}
	});
}

function handleSelection(selectedOption, questionIndex, element, isMultiple) {
	const inputs = document.querySelectorAll(
		`input[name="question${questionIndex}"]:checked`
	);
	const selectedOptions = Array.from(inputs).map((el) => el.value);
	const savedAnswers =
		JSON.parse(localStorage.getItem(`testAnswers_${scopeId}`)) || {};
	savedAnswers[questionIndex] = isMultiple
		? selectedOptions
		: selectedOptions[0];
	localStorage.setItem(`testAnswers_${scopeId}`, JSON.stringify(savedAnswers));

	if (!isMultiple) {
		document
			.querySelectorAll(`input[name="question${questionIndex}"]`)
			.forEach((el) => (el.checked = el === element));

		evaluateOption(selectedOptions, questionIndex, isMultiple);
	}
}

function evaluateMultiple(questionIndex) {
	event.preventDefault();
	const selectedOptions = Array.from(
		document.querySelectorAll(`input[name="question${questionIndex}"]:checked`)
	).map((el) => el.value);
	evaluateOption(selectedOptions, questionIndex, true);

	const savedAnswers =
		JSON.parse(localStorage.getItem(`testAnswers_${scopeId}`)) || {};
	savedAnswers[questionIndex] = {
		...savedAnswers[questionIndex],
		feedbackGiven: true,
	};
	localStorage.setItem(`testAnswers_${scopeId}`, JSON.stringify(savedAnswers));

	const evaluateButton = document.querySelector(
		`button[onclick="evaluateMultiple(${questionIndex})"]`
	);
	if (evaluateButton) {
		evaluateButton.style.display = "none";
	}
}

function evaluateOption(selectedOptions, questionIndex, isMultiple) {
	const feedbackElement = document.getElementById(`feedback-${questionIndex}`);
	const correctAnswer = preguntas[questionIndex].respuestaCorrecta;
	const correct = isMultiple
		? correctAnswer.every((opt) => selectedOptions.includes(opt)) &&
		  selectedOptions.every((opt) => correctAnswer.includes(opt))
		: selectedOptions == correctAnswer;

	feedbackElement.innerHTML = correct
		? approve("Correcta")
		: reject(
				`Incorrecta, la respuesta correcta era: ${
					Array.isArray(correctAnswer)
						? correctAnswer.join(", ")
						: correctAnswer
				}`
		  );
	const inputs = document.querySelectorAll(
		`input[name="question${questionIndex}"]`
	);
	inputs.forEach((input) => {
		input.disabled = true; // Consider removing this if you want users to be able to change their answers before final submission
		input.parentElement.classList.remove("correct-answer", "wrong-answer"); // Clear all first
		if (selectedOptions.includes(input.value)) {
			input.parentElement.classList.add(
				correct ? "correct-answer" : "wrong-answer"
			);
		}
	});

	if (!correct) {
		incorrectAnswers++;
		updateTemarioCount(preguntas[questionIndex].temarioTema);
		preguntasErradas++;
	}
}

function saveIncorrectasPorTemario(testType) {
	localStorage.setItem(
		`incorrectasPorTemario_${testType}`,
		JSON.stringify(incorrectasPorTemario)
	);
}

function loadIncorrectasPorTemario(scopeId) {
	const data = localStorage.getItem(`incorrectasPorTemario_${scopeId}`);
	return data ? JSON.parse(data) : {};
}

function updateTemarioCount(tema) {
	if (typeof tema !== "string") {
		console.error("Invalid tema provided:", tema);
		return;
	}
	const stats = loadIncorrectasPorTemario(scopeId);
	stats[tema] = (stats[tema] || 0) + 1;
	localStorage.setItem(
		`incorrectasPorTemario_${scopeId}`,
		JSON.stringify(stats)
	);
}

function submitForm() {
	const savedAnswers =
		JSON.parse(localStorage.getItem(`testAnswers_${scopeId}`)) || {};
	let noRespondidas = 0;

	preguntas.forEach((question, index) => {
		const userAnswers = savedAnswers[index];
		const isMultiple = Array.isArray(question.respuestaCorrecta);
		const correctAnswer = question.respuestaCorrecta;

		if (!userAnswers || userAnswers.length === 0) {
			noRespondidas++;
		} else {
			const correct = isMultiple
				? correctAnswer.every((opt) => userAnswers == opt) &&
				  userAnswers.every((opt) => correctAnswer.includes(opt))
				: userAnswers == correctAnswer;
		}
	});

	const total = preguntas.length;
	const correctAnswers =
		total > 0 ? total - incorrectAnswers - noRespondidas : 0;
	const score = total > 0 ? (correctAnswers * 100) / total : 0;

	console.log("total::: ", total, "score:: ", score);
	showResults(score, correctAnswers, total, noRespondidas);

	localStorage.removeItem(`testAnswers_${scopeId}`);
	localStorage.removeItem(`questionsOrder_${scopeId}`);
	localStorage.removeItem(`incorrectasPorTemario_${scopeId}`);
}

form.addEventListener("submit", function (event) {
	event.preventDefault();
	submitForm();
	resultsElement.style.display = "block";
	submitBtn.style.display = "none";
});

function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}

function showResults(score, correctAnswers, total, noRespondidas) {
	const savedAnswers =
		JSON.parse(localStorage.getItem(`testAnswers_${scopeId}`)) || {};
	const detallesPorTemario = Object.entries(loadIncorrectasPorTemario(scopeId))
		.map(
			([temario, count]) => `<strong>${temario}:</strong> ${count} incorrectas`
		)
		.join("<br>");

	// Leemos los datos antiguos o iniciamos un objeto nuevo si no existe

	const isApproved = score >= 60;
	// Creamos el objeto de resultado para este examen
	const examResult = {
		test: scopeId,
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
        Has acertado ${correctAnswers} de ${total} preguntas.<br>
        Tu puntuación es ${score.toFixed(0)}.<br>
        ${feedBackTest}
        <br><br>
        Preguntas sin responder: ${noRespondidas}.<br>
        ${
					noRespondidas > 0
						? `Preguntas no respondidas: <ul>${preguntas
								.filter((_, i) => !savedAnswers[i])
								.map((q) => `<li>${q.pregunta}</li>`)
								.join("")}</ul>`
						: ""
				}
    `;

	scrollToResults();
	// Iniciar fuegos artificiales si se aprueba
	if (isApproved) {
		startFireworks();
	}
}

function buildTemarioMenu(themes) {
	const temarioNav = document.getElementById("temario-nav");
	const prevButton = document.getElementById("prev-button");
	const nextButton = document.getElementById("next-button");
	const params = new URLSearchParams(window.location.search);
	const currentTemario = parseInt(params.get("temario"));
	const testType = params.get("test");

	temarioNav.innerHTML = ""; // Limpiar el menú existente

	// Crear y añadir la opción 'General' al menú
	const generalListItem = document.createElement("li");
	generalListItem.className = "menu-nav__item";
	const generalLink = document.createElement("a");
	generalLink.href = `?test=${testType}`;
	generalLink.className = "menu-nav__link";
	generalLink.textContent = "General";
	generalListItem.appendChild(generalLink);
	temarioNav.appendChild(generalListItem);

	themes.forEach((theme, index) => {
		const listItem = document.createElement("li");
		listItem.className = "menu-nav__item";
		const link = document.createElement("a");
		link.href = `?test=${testType}&temario=${theme.evaluacion}`;
		link.className = "menu-nav__link";
		link.textContent = theme.temario;
		listItem.appendChild(link);
		temarioNav.appendChild(listItem);
	});

	// Control de visibilidad para botones de navegación
	if (currentTemario) {
		prevButton.style.visibility = currentTemario > 1 ? "visible" : "visible"; // Siempre visible mientras haya un temario
		nextButton.style.visibility =
			currentTemario < themes.length ? "visible" : "hidden";
		prevButton.onclick = () => {
			if (currentTemario > 1) {
				window.location.href = `?test=${testType}&temario=${
					currentTemario - 1
				}`;
			} else {
				window.location.href = `?test=${testType}`; // Volver a General si estamos en el primer temario
			}
		};
	} else {
		prevButton.style.visibility = "hidden"; // No hay 'anterior' en General
		nextButton.style.visibility = "visible"; // Siempre visible desde General si hay al menos un temario
		nextButton.onclick = () => {
			window.location.href = `?test=${testType}&temario=1`; // Ir al primer temario desde General
		};
	}

	nextButton.onclick = () => {
		if (currentTemario && currentTemario < themes.length) {
			window.location.href = `?test=${testType}&temario=${currentTemario + 1}`;
		} else if (!currentTemario && themes.length > 0) {
			// Caso inicial sin temario
			window.location.href = `?test=${testType}&temario=1`;
		}
	};
}

function toggleMenu() {
	const menu = document.getElementById("main-menu");
	menu.classList.toggle("hidden");
}

function toggleTemarioMenu() {
	const temarioMenu = document.getElementById("temario-menu");
	const menu = document.getElementById("menu-principal");
	temarioMenu.classList.toggle("open");
	menu.classList.remove("open");
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initialize);
} else {
	initialize();
}
