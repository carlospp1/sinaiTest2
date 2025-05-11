const fs = require('fs');
const path = require('path');

// Función para cargar el archivo JSON de preguntas
function loadQuestions(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error al cargar el archivo ${filePath}:`, error);
        return null;
    }
}

// Función para verificar una pregunta individual
function verifyQuestion(question) {
    const errors = [];
    
    // Verificar que la pregunta tiene todos los campos requeridos
    if (!question.id) errors.push('Falta ID');
    if (!question.pregunta) errors.push('Falta pregunta');
    if (!question.opciones || !Array.isArray(question.opciones) || question.opciones.length === 0) {
        errors.push('Faltan opciones o no es un array válido');
    }
    if (!question.respuestaCorrecta) errors.push('Falta respuesta correcta');
    
    // Verificar que la respuesta correcta está en las opciones (comparación exacta)
    if (question.respuestaCorrecta && question.opciones) {
        const respuestaExacta = question.opciones.find(opcion => 
            opcion === question.respuestaCorrecta
        );
        
        if (!respuestaExacta) {
            // Si no hay coincidencia exacta, buscar coincidencias parciales para el reporte
            const coincidenciasParciales = question.opciones.filter(opcion => 
                opcion.toLowerCase().trim() === question.respuestaCorrecta.toLowerCase().trim()
            );
            
            if (coincidenciasParciales.length > 0) {
                errors.push(`La respuesta correcta no coincide exactamente. Coincidencias parciales encontradas: ${coincidenciasParciales.join(', ')}`);
            } else {
                errors.push('La respuesta correcta no está en las opciones');
            }
        }
    }
    
    return errors;
}

// Función para probar un cuestionario específico
function testQuestionary(questionaryPath) {
    console.log(`\n=== Probando cuestionario: ${path.basename(questionaryPath)} ===`);
    
    const questions = loadQuestions(questionaryPath);
    if (!questions) return null;

    const failedTests = [];
    let totalQuestions = 0;
    let passedQuestions = 0;

    // Iterar sobre cada tema y sus preguntas
    questions.theme.forEach(theme => {
        console.log(`\nProbando tema: ${theme.temario}`);
        
        theme.preguntas.forEach(question => {
            totalQuestions++;
            const errors = verifyQuestion(question);
            
            if (errors.length > 0) {
                failedTests.push({
                    id: question.id,
                    tema: theme.temario,
                    pregunta: question.pregunta,
                    respuestaCorrecta: question.respuestaCorrecta,
                    opciones: question.opciones,
                    errores: errors
                });
            } else {
                passedQuestions++;
            }
        });
    });

    return {
        questionary: path.basename(questionaryPath),
        totalQuestions,
        passedQuestions,
        failedTests
    };
}

// Función principal de test
function runTests() {
    const questionaries = [
        'questionary1.json',
        'questionary2.json',
        'questionary3.json',
        'questionary4.json',
        'questionary5.json',
        'questionary6.json'
    ];

    const results = [];
    let totalFailedTests = [];

    questionaries.forEach(questionary => {
        const questionaryPath = path.join(__dirname, questionary);
        const result = testQuestionary(questionaryPath);
        if (result) {
            results.push(result);
            totalFailedTests = totalFailedTests.concat(
                result.failedTests.map(test => ({
                    ...test,
                    questionary: result.questionary
                }))
            );
        }
    });

    // Generar reporte general
    console.log('\n=== REPORTE GENERAL DE PRUEBAS ===');
    results.forEach(result => {
        console.log(`\nCuestionario: ${result.questionary}`);
        console.log(`Total de preguntas: ${result.totalQuestions}`);
        console.log(`Preguntas correctas: ${result.passedQuestions}`);
        console.log(`Preguntas con errores: ${result.failedTests.length}`);
    });

    if (totalFailedTests.length > 0) {
        console.log('\n=== PREGUNTAS CON ERRORES ===');
        totalFailedTests.forEach(test => {
            console.log(`\nCuestionario: ${test.questionary}`);
            console.log(`ID: ${test.id}`);
            console.log(`Tema: ${test.tema}`);
            console.log(`Pregunta: ${test.pregunta}`);
            console.log(`Respuesta correcta: "${test.respuestaCorrecta}"`);
            console.log('Opciones:');
            test.opciones.forEach((opcion, index) => {
                console.log(`${index + 1}. "${opcion}"`);
            });
            console.log('Errores:');
            test.errores.forEach(error => console.log(`- ${error}`));
        });

        // Guardar log de errores
        const logPath = path.join(__dirname, 'test_errors.log');
        const logContent = JSON.stringify(totalFailedTests, null, 2);
        fs.writeFileSync(logPath, logContent);
        console.log(`\nLog de errores guardado en: ${logPath}`);
    }
}

// Ejecutar las pruebas
runTests(); 