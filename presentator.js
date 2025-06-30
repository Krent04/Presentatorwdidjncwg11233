let presentatorSlides = [];
let currentSlideIndex = 0;
let juryData = [];
let televoteData = {};
let scoreTotaal = {};
let ALL_SCHOOLS = [
  "ATKA", "Antwerpen", "Arnhem", "Brussel", "Den Bosch",
  "Filmacademie", "Gent", "Leuven", "Maastricht",
  "Rotterdam", "Tilburg", "Utrecht"
];

// Laad data en start
fetch("punten.json")
  .then(r => r.json())
  .then(data => {
    juryData = data.jury;
    televoteData = data.televote;
    setupPresentatorSlides(juryData, televoteData);
    showPresentatorSlide(0);
  });

// ---- SLIDES BOUWEN ----
function setupPresentatorSlides(juryData, televoteData) {
  presentatorSlides = [];
  scoreTotaal = {};
  let totaalJury = juryData.length;
  const halfJuryIndex = Math.floor(totaalJury / 2) - 1;
  let schoolVolgorde = [...ALL_SCHOOLS];

  // --- Per vakjury ---
  juryData.forEach((jury, idx) => {
    // 1. Slide: Wie is de volgende jury?
    presentatorSlides.push(createNextJurySlide(jury, idx));

    // 2. Slide: Alle punten van deze jury
    presentatorSlides.push(createJuryPointsSlide(jury, idx));

    // Update score na deze jury
    Object.entries(jury.punten).forEach(([school, p]) => {
      scoreTotaal[school] = (scoreTotaal[school] || 0) + (p || 0);
    });
    // Tussenstand na de helft van de jury's
    if (idx === halfJuryIndex) {
      presentatorSlides.push(createTussenstandSlide(scoreTotaal, "Tussenstand na de helft van de jury’s"));
    }
  });

  // --- Tussenstand voor televotes (na alle jury’s) ---
  presentatorSlides.push(createTussenstandSlide(scoreTotaal, "Tussenstand vóór de televotes"));

  // --- Televotes ---
  // Bereken volgorde: wie krijgt als eerste televotepunten (laagste score eerst, zoals ESF)
  let huidigeScore = {...scoreTotaal};
  let puntenNieuw = {};
  let huidigeVolgorde = Object.keys(huidigeScore)
    .map(school => ({
      school,
      totaal: huidigeScore[school] || 0
    }))
    .sort((a, b) => b.totaal - a.totaal)
    .map(entry => entry.school);

  const televoteVolgorde = Object.keys(huidigeScore)
    .map(school => ({
      school,
      juryTotaal: huidigeScore[school] || 0
    }))
    .sort((a, b) => a.juryTotaal - b.juryTotaal)
    .map(entry => entry.school);

  televoteVolgorde.forEach((school, idx) => {
    // 1. Slide: Huidige punten + wat heeft deze school nodig voor 1e plek?
    presentatorSlides.push(createTelevoteVoorSlide(school, huidigeScore, televoteData, huidigeVolgorde));

    // 2. Slide: Nieuwe punten na deze televote (score geüpdatet)
    let punten = televoteData[school] || 0;
    huidigeScore[school] = (huidigeScore[school] || 0) + punten;
    huidigeVolgorde = Object.keys(huidigeScore)
      .map(school => ({school, totaal: huidigeScore[school]}))
      .sort((a, b) => b.totaal - a.totaal)
      .map(e => e.school);

    presentatorSlides.push(createTussenstandSlide(huidigeScore, `Nieuwe stand na televote voor ${school}`));
  });

  // --- Eindstand ---
  presentatorSlides.push(createTussenstandSlide(huidigeScore, "Eindstand"));
}

// ---- SLIDE BUILDERS ----

function createNextJurySlide(jury, idx) {
  const slide = document.createElement("div");
  slide.className = "presentator-slide next-jury";
  slide.innerHTML = `
    <h2>Volgende vakjury: <span style="color:#1976d2">${jury.school}</span></h2>
    ${jury.presentator ? `
      <div>
        <b>Spreker:</b> ${jury.presentator.naam}<br>
        <em>${jury.presentator.bio || ''}</em><br>
        ${jury.presentator.foto ? `<img src="${jury.presentator.foto}" height="100">` : ''}
      </div>
    ` : '<em>Geen spreker-informatie bekend</em>'}
    <hr>
    <div style="opacity:0.6">Klik door om de punten van deze jury te tonen.</div>
  `;
  return slide;
}

function createJuryPointsSlide(jury, idx) {
  const slide = document.createElement("div");
  slide.className = "presentator-slide jury-points";
  slide.innerHTML = `
    <h2>Punten van ${jury.school}</h2>
    <ul>
      ${Object.entries(jury.punten)
        .sort((a, b) => b[1] - a[1])
        .map(([school, punten]) =>
          `<li><b>${school}</b>: <span style="color:#388e3c;font-weight:bold">${punten}</span></li>`
        ).join('')}
    </ul>
    <hr>
    <div style="opacity:0.6">Klik door voor de volgende jury.</div>
  `;
  return slide;
}

function createTussenstandSlide(scores, titel = "Tussenstand") {
  // Maak gesorteerde lijst met rangnummers
  const sorted = Object.keys(scores)
    .map(school => ({
      school,
      totaal: scores[school] || 0
    }))
    .sort((a, b) => b.totaal - a.totaal)
    .map((entry, i) =>
      `<tr>
         <td style="text-align:right;padding-right:0.6em;"><b>${(i+1).toString().padStart(2,'0')}</b></td>
         <td><b>${entry.school}</b></td>
         <td style="text-align:right"><b>${entry.totaal}</b></td>
       </tr>`
    ).join('');
  const slide = document.createElement("div");
  slide.className = "presentator-slide tussenstand";
  slide.innerHTML = `
    <h2>${titel}</h2>
    <table style="font-size:1.2em">${sorted}</table>
    <hr>
    <div style="opacity:0.6">Klik door voor de volgende stap.</div>
  `;
  return slide;
}

function createTelevoteVoorSlide(school, scores, televoteData, huidigeVolgorde) {
  const currentScore = scores[school] || 0;
  const maxScore = Math.max(...Object.values(scores));
  const koploper = Object.entries(scores).find(([k, v]) => v === maxScore)?.[0];
  const puntenNodig = (koploper !== school) ? (maxScore - currentScore + 1) : 0;
  const kanNogWinnen = (currentScore + televoteData[school]) > maxScore;
  let uitleg = "";
  if (koploper === school) {
    uitleg = `<b>${school}</b> is nu koploper!`;
  } else if (puntenNodig > televoteData[school]) {
    uitleg = `<span style="color:#b71c1c"><b>${school}</b> kan niet meer winnen (maximaal ${televoteData[school]} te verdienen, minimaal ${puntenNodig} nodig).</span>`;
  } else {
    uitleg = `<b>${school}</b> heeft nog ${puntenNodig} punt${puntenNodig===1?'':'en'} nodig om koploper ${koploper} te passeren.`;
  }
  const slide = document.createElement("div");
  slide.className = "presentator-slide televote-voor";
  slide.innerHTML = `
    <h2>Televote voor <b>${school}</b></h2>
    <b>Huidige punten:</b> ${currentScore}<br>
    <b>Te ontvangen televote:</b> <span style="color:#1565c0;font-weight:bold">${televoteData[school]}</span><br>
    <b>Koploper:</b> ${koploper} (${maxScore} punten)<br>
    <b>${uitleg}</b>
    <hr>
    <div style="opacity:0.6">Klik door voor de nieuwe stand na deze televote.</div>
  `;
  return slide;
}

// ---- SLIDESHOW LOGICA ----

function showPresentatorSlide(index) {
  const slideshow = document.getElementById("presentator-slideshow");
  currentSlideIndex = Math.max(0, Math.min(index, presentatorSlides.length - 1));
  slideshow.innerHTML = '';
  slideshow.appendChild(presentatorSlides[currentSlideIndex]);
}
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowRight") {
    showPresentatorSlide(currentSlideIndex + 1);
  } else if (e.code === "ArrowLeft") {
    showPresentatorSlide(currentSlideIndex - 1);
  }
});