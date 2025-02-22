const questionaryFiles = [
    'questionary1.json',
    'questionary2.json',
    'questionary3.json',
    'questionary4.json',
    'questionary5.json',
    'questionary6.json',
]
const questionsForTest = 10
const params2 = new URLSearchParams(window.location.search)
const testType2 = params2.get('test')

const isDev =
    window.location.hostname == 'localhost' ||
    window.location.hostname == '127.0.0.1'

var celebrationSound = new Howl({
    src: [
        'https://assets.mixkit.co/sfx/preview/mixkit-audience-light-applause-478.mp3',
    ],
    autoplay: false,
    loop: false,
    volume: 0.3,
    onend: function () {
        console.log('Finished playing applause sound!')
    },
})

if (
    !testType2 ||
    testType2 > 7 ||
    testType2 <= 0 ||
    (isNaN(+testType2) && testType2 != 'all' && testType2 != 'results')
) {
    window.location.href = window.location.href.split('?')[0] + '?test=all'
}

function startFireworks() {
    const container = document.querySelector('.fireworks')
    const fireworks = new Fireworks.default(container)
    fireworks.start()
    celebrationSound.play()
    setTimeout(function () {
        fireworks.stop()
        celebrationSound.stop()
    }, 10000)
}

function updateInfoBasedOnTest() {
    const params = new URLSearchParams(window.location.search)
    const testType = params.get('test')
    const temarioId = params.get('temario')
    const infoContainer = document.getElementById('info-container')
    let infoHtml = ''

    if (testType == 'all') {
        infoHtml = `<h2>Test Farmacia</h2>
        <p>Este examen consta de un conjunto seleccionado de ${questionsForTest} preguntas, elegidas al azar entre todos los tests, dando un total de ${
            questionaryFiles.length * questionsForTest
        }${
            questionaryFiles.length < 7
                ? ` (Actualmente solo ${
                      questionaryFiles.length * questionsForTest
                  })`
                : `.`
        }</p>
        <p>Tu puntuación se desvelará solo al finalizar el examen completo. Además, todas tus respuestas se guardarán durante la sesión actual.</p> 
        <p> Ten en cuenta que una vez seleccionada una respuesta, solo podrás cambiar a un nuevo conjunto aleatorio de preguntas si reinicias el test o envías tus respuestas.</p>
        <p><strong>¡Te deseamos mucha suerte!</strong></p>
      `
        infoContainer.innerHTML = infoHtml
    } else {
        fetch(`questionary${testType}.json`)
            .then((response) => response.json())
            .then((data) => {
                if (temarioId) {
                    const temaEspecifico = data.theme.find(
                        (theme) => theme.evaluacion == temarioId
                    )
                    if (temaEspecifico) {
                        infoHtml = `<h2>${data.title} - ${temaEspecifico.temario}</h2>
                            <p>Estás practicando el tema: <strong>${temaEspecifico.temario}</strong>.</p>
                            <p>Por favor, selecciona la mejor respuesta para cada una de las preguntas presentadas. Al finalizar el test, podrás ver tu puntuación y las respuestas correctas.</p>
                        `
                    } else {
                        infoHtml = `<h2>${data.title}</h2>
                            <p>Este tema específico no está disponible. Revisa la selección de temas o practica con el examen general.</p>
                        `
                    }
                } else {
                    infoHtml = `<h2>Practicar ${data.title}</h2>
                        <p>Estás viendo todas las preguntas disponibles para el tema <strong>${data.title}</strong>. Por favor, selecciona la mejor respuesta para cada pregunta. Tu puntuación se desvelará al finalizar el examen completo.</p>
                    `
                }
                infoContainer.innerHTML =
                    infoHtml +
                    `<p> Ten en cuenta que una vez seleccionada una respuesta, solo podrás cambiar a un nuevo conjunto aleatorio de preguntas si reinicias el test o envías tus respuestas.</p><p><strong>¡Te deseamos mucha suerte!</strong></p>`
            })
            .catch((error) => {
                console.error('Error al cargar el cuestionario:', error)
                infoContainer.innerHTML =
                    '<p>Error al cargar el cuestionario. Por favor, intenta de nuevo más tarde.</p>'
            })
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const menuNav = document.querySelector('#menu-principal ul.menu-nav')
    const promises = questionaryFiles.map(function (file, index) {
        return fetch(file)
            .then((response) => response.json())
            .then((data) => {
                return { index, title: data.title }
            })
            .catch((error) => {
                console.error('Error cargando ' + file, error)
                return { index, title: 'Test ' + (index + 1) }
            })
    })

    Promise.all(promises).then((results) => {
        results.sort((a, b) => a.index - b.index)
        results.forEach((item) => {
            const li = document.createElement('li')
            li.className = 'menu-nav__item'
            const a = document.createElement('a')
            a.href = 'index.html?test=' + (item.index + 1)
            a.className = 'menu-nav__link'
            a.textContent = 'Practica ' + item.title
            li.appendChild(a)
            menuNav.appendChild(li)
        })
    })
})

document.getElementById('reset-button').addEventListener('click', function () {
    const params = new URLSearchParams(window.location.search)
    const testType = params.get('test')
    const temarioId = params.get('temario')
    const questionaryId =
        testType && testType <= 7 && testType >= 1 ? testType : 'all'
    localStorage.removeItem(`questionsOrder_${questionaryId}`)
    localStorage.removeItem(`incorrectasPorTemario_${questionaryId}`)
    if (temarioId) {
        testToRemove = `testAnswers_${testType}_${temarioId}`
        questionToRemove = `questionsOrder_${testType}_${temarioId}`
        incorrectsToRemoveTemario = `incorrectasPorTemario_${questionaryId}_${temarioId}`
    } else {
        testToRemove = `testAnswers_${testType}`
        questionToRemove = `questionsOrder_${testType}`
        incorrectsToRemoveTemario = `incorrectasPorTemario_${questionaryId}_${temarioId}`
    }
    localStorage.removeItem(testToRemove)
    localStorage.removeItem(questionToRemove)
    localStorage.removeItem(incorrectsToRemoveTemario)
    window.location.reload()
    window.scrollTo({ top: 0, behavior: 'smooth' })
})

updateInfoBasedOnTest()

function scrollBottom() {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
}

function scrollToResults() {
    const infoContainer = document.getElementById('info-container')
    if (infoContainer) {
        const startTop = infoContainer.offsetTop
        const endTop = startTop + infoContainer.offsetHeight
        window.scrollTo({
            top: endTop - 20,
            behavior: 'smooth',
        })
    }
}
